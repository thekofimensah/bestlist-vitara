import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useLists = (userId) => {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);

  // Helper function to apply custom ordering from localStorage
  const applyCustomOrder = (allLists) => {
    if (!userId || !allLists || allLists.length === 0) return allLists;
    
    try {
      const savedOrder = localStorage.getItem(`listOrder_${userId}`);
      if (!savedOrder) return allLists;
      
      const orderIds = JSON.parse(savedOrder);
      console.log(`[useLists] Applying custom order:`, orderIds);
      
      // Sort lists according to saved order, with unordered lists at the end
      const orderedLists = [];
      const unorderedLists = [];
      
      // First, add lists in the saved order
      orderIds.forEach(id => {
        const list = allLists.find(l => l.id === id);
        if (list) orderedLists.push(list);
      });
      
      // Then add any lists not in the saved order
      allLists.forEach(list => {
        if (!orderIds.includes(list.id)) {
          unorderedLists.push(list);
        }
      });
      
      return [...orderedLists, ...unorderedLists];
    } catch (error) {
      console.error('[useLists] Error applying custom order:', error);
      return allLists;
    }
  };

  useEffect(() => {
    if (userId) {
      fetchLists(false);
    } else {
      // When userId is null (user signed out), reset state
      setLists([]);
      setLoading(false);
    }
  }, [userId]);



  const fetchLists = async (background = false) => {
    if (!userId) return;
    if (!background) setLoading(true);
    const start = Date.now();
    console.log('[useLists] Fetching lists from Supabase...');
    try {
      let { data: listsData, error: listsError } = await supabase
        .from('lists')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      const afterLists = Date.now();
      console.log(`[useLists] Lists fetched in ${afterLists - start}ms:`, listsData);

      if (listsError) throw listsError;

      // No automatic default list creation - users will create their first list manually

      if (listsData && listsData.length > 0) {
        // Only fetch items for the first 4 lists for CameraView (speed up initial load)
        const listsToFetch = listsData.slice(0, 4);
        const listsWithItems = await Promise.all(
          listsToFetch.map(async (list) => {
            const { data: itemsData, error: itemsError } = await supabase
              .from('items')
              .select('*')
              .eq('list_id', list.id)
              .order('created_at', { ascending: false });
            if (itemsError) throw itemsError;
            const items = itemsData?.filter(item => !item.is_stay_away) || [];
            const stayAways = itemsData?.filter(item => item.is_stay_away) || [];
            return {
              ...list,
              items,
              stayAways
            };
          })
        );
        // For the rest, just return the list meta (could lazy-load items if needed)
        const rest = listsData.slice(4).map(list => ({ ...list, items: [], stayAways: [] }));
        
        // Combine all lists and apply custom order
        const allLists = [...listsWithItems, ...rest];
        const orderedLists = applyCustomOrder(allLists);
        setLists(orderedLists);
        
        const afterItems = Date.now();
        console.log(`[useLists] Items for first 4 lists fetched in ${afterItems - afterLists}ms`);
      }
    } catch (error) {
      console.error('[useLists] Error fetching lists:', JSON.stringify({
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error
      }, null, 2));
    } finally {
      if (!background) setLoading(false);
      console.log('[useLists] Finished loading lists');
    }
  };

  const addItemToList = async (listIds, item, isStayAway = false) => {
    if (!userId) return;

    // Generate temporary ID for optimistic update
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Optimistic update - immediately show in UI
    const optimisticItem = {
      ...item,
      id: tempId,
      image_url: item.url || item.image,
      created_at: new Date().toISOString(),
      is_stay_away: isStayAway,
      _isOptimistic: true // Flag for styling/handling
    };

    // Immediately update local state for instant UI feedback
    setLists(prev => prev.map(list => {
      if (listIds.includes(list.id)) {
        return {
          ...list,
          items: isStayAway ? list.items : [...list.items, optimisticItem],
          stayAways: isStayAway ? [...list.stayAways, optimisticItem] : list.stayAways
        };
      }
      return list;
    }));

    // Background database operations
    try {
      const insertPromises = listIds.map(async (listId) => {
        const { data, error } = await supabase
          .from('items')
          .insert([{
            list_id: listId,
            name: item.name,
            type: item.type,
            species: item.species,
            certainty: item.certainty,
            image_url: item.url || item.image,
            rating: item.rating,
            notes: item.notes,
            location: item.location,
            is_stay_away: isStayAway,
            created_at: new Date().toISOString()
          }])
          .select()
          .single();

        if (error) throw error;
        return { listId, data };
      });

      // Wait for all inserts to complete
      const results = await Promise.all(insertPromises);
      
      // Replace optimistic items with real data
      setLists(prev => prev.map(list => {
        const result = results.find(r => r.listId === list.id);
        if (result) {
          const realItem = {
            ...item,
            id: result.data.id,
            image_url: item.url || item.image,
            created_at: result.data.created_at,
            is_stay_away: isStayAway
            // Remove _isOptimistic flag
          };
          
          return {
            ...list,
            items: isStayAway 
              ? list.items 
              : list.items.map(i => i.id === tempId ? realItem : i),
            stayAways: isStayAway 
              ? list.stayAways.map(i => i.id === tempId ? realItem : i)
              : list.stayAways
          };
        }
        return list;
      }));
      
    } catch (error) {
      console.error('Error adding item:', JSON.stringify({
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error
      }, null, 2));
      
      // Rollback optimistic update on error
      setLists(prev => prev.map(list => {
        if (listIds.includes(list.id)) {
          return {
            ...list,
            items: list.items.filter(i => i.id !== tempId),
            stayAways: list.stayAways.filter(i => i.id !== tempId)
          };
        }
        return list;
      }));
      
    }
  };

  const updateItemInList = async (listIds, updatedItem, isStayAway = false) => {
    if (!userId) return;

    try {
      // Update in Supabase
      const { data, error } = await supabase
        .from('items')
        .update({
          name: updatedItem.name,
          type: updatedItem.type,
          species: updatedItem.species,
          certainty: updatedItem.certainty,
          tags: updatedItem.tags,
          image_url: updatedItem.image_url || updatedItem.image,
          rating: updatedItem.rating,
          notes: updatedItem.notes,
          location: updatedItem.location,
          is_stay_away: isStayAway,
          list_id: Array.isArray(listIds) && listIds.length > 0 ? listIds[0] : undefined,
        })
        .eq('id', updatedItem.id)
        .select()
        .single();

      if (error) throw error;

      // Optimistically update local state
      setLists(prevLists =>
        prevLists.map(list => {
          // Remove the item from all lists
          let newItems = list.items.filter(item => item.id !== updatedItem.id);
          let newStayAways = list.stayAways.filter(item => item.id !== updatedItem.id);

          // If this is the new list, add the updated item
          if (list.id === (Array.isArray(listIds) && listIds.length > 0 ? listIds[0] : list.id)) {
            const newItem = {
              ...updatedItem,
              id: updatedItem.id,
              image_url: updatedItem.image_url || updatedItem.image,
              is_stay_away: isStayAway,
            };
            if (isStayAway) {
              newStayAways = [...newStayAways, newItem];
            } else {
              newItems = [...newItems, newItem];
            }
          }

          return {
            ...list,
            items: newItems,
            stayAways: newStayAways,
          };
        })
      );
    } catch (error) {
      console.error('Error updating item:', JSON.stringify({
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error
      }, null, 2));
      throw error;
    }
  };

  const createList = async (name, color) => {
    console.log('🔧 createList called with:', JSON.stringify({ name, color, userId }));
    
    if (!userId) {
      console.error('❌ No userId provided to createList');
      return null;
    }

    try {
      console.log('🔧 Attempting to create list in Supabase...');
      const { data, error } = await supabase
        .from('lists')
        .insert([{
          user_id: userId,
          name: name,
          color: color
        }])
        .select()
        .single();

      console.log('🔧 Supabase response:', JSON.stringify({ data, error }, null, 2));

      if (error) {
        console.error('❌ Supabase error:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('✅ List created successfully:', JSON.stringify(data, null, 2));

      // Add to local state with empty items and stayAways
      const newList = {
        ...data,
        items: [],
        stayAways: []
      };

      setLists(prev => applyCustomOrder([newList, ...prev]));
      console.log('✅ List added to local state');
      return newList;
    } catch (error) {
      console.error('❌ Error creating list:', JSON.stringify({
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error
      }, null, 2));
      throw error;
    }
  };

  const reorderLists = async (newOrderedLists) => {
    console.log('🔧 reorderLists called with:', newOrderedLists.map(l => ({ id: l.id, name: l.name })));
    
    if (!userId) {
      console.error('❌ No userId provided to reorderLists');
      return;
    }

    try {
      // Update local state immediately for responsive UI
      setLists(newOrderedLists);
      
      // Store custom order in localStorage
      const listOrder = newOrderedLists.map(list => list.id);
      localStorage.setItem(`listOrder_${userId}`, JSON.stringify(listOrder));
      console.log('✅ Lists reordered successfully in localStorage');
      
    } catch (error) {
      console.error('❌ Error reordering lists:', error);
      // Revert local state on error
      refreshLists(true);
      throw error;
    }
  };

  const refreshLists = (background = true) => {
    if (userId) {
      fetchLists(background);
    }
  };

  return {
    lists,
    loading,
    addItemToList,
    updateItemInList,
    refreshLists,
    createList,
    reorderLists
  };
};
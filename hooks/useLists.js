import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const DEFAULT_LISTS = [
  {
    name: 'Best Gelato',
    color: '#FF6B9D',
    items: [],
    stayAways: []
  },
  {
    name: 'Amazing Fish',
    color: '#4ECDC4',
    items: [],
    stayAways: []
  },
  {
    name: 'Perfect Milk', 
    color: '#FFE66D',
    items: [],
    stayAways: []
  }
];

export const useLists = (userId) => {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchLists();
    }
  }, [userId]);

  const createDefaultLists = async () => {
    try {
      const { data, error } = await supabase
        .from('lists')
        .insert(
          DEFAULT_LISTS.map(list => ({
            user_id: userId,
            name: list.name,
            color: list.color
          }))
        )
        .select();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating default lists:', error);
      return [];
    }
  };

  const fetchLists = async () => {
    if (!userId) return;
    setLoading(true);
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

      // Create default lists if none exist
      if (!listsData || listsData.length === 0) {
        const defaultLists = await createDefaultLists();
        if (defaultLists.length > 0) {
          listsData = defaultLists;
        }
      }

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
        setLists([...listsWithItems, ...rest]);
        const afterItems = Date.now();
        console.log(`[useLists] Items for first 4 lists fetched in ${afterItems - afterLists}ms`);
      }
    } catch (error) {
      console.error('[useLists] Error fetching lists:', error);
    } finally {
      setLoading(false);
      console.log('[useLists] Finished loading lists');
    }
  };

  const addItemToList = async (listIds, item, isStayAway = false) => {
    if (!userId) return;

    try {
      for (const listId of listIds) {
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

        setLists(prev => prev.map(list => {
          if (list.id === listId) {
            const newItem = {
              ...item,
              id: data.id,
              image_url: item.url || item.image
            };
            return {
              ...list,
              items: isStayAway ? list.items : [...list.items, newItem],
              stayAways: isStayAway ? [...list.stayAways, newItem] : list.stayAways
            };
          }
          return list;
        }));
      }
    } catch (error) {
      console.error('Error adding item:', error);
      throw error;
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
      console.error('Error updating item:', error);
      throw error;
    }
  };

  const refreshLists = () => {
    if (userId) {
      fetchLists();
    }
  };

  return {
    lists,
    loading,
    addItemToList,
    updateItemInList,
    refreshLists
  };
};
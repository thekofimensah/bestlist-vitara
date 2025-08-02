import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { useAchievements } from './useAchievements';

export const useLists = () => {
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useAuth();
  
  // Safely get checkAchievements function
  const achievements = useAchievements();
  const checkAchievements = achievements?.checkAchievements || (() => {});

  const fetchLists = async (userId) => {
    if (!userId) return;
    
    console.log('🔍 [useLists] Starting fetch with direct API calls...');
    const startTime = Date.now();
    
    try {
      // Use direct fetch instead of Supabase client
      const supabaseUrl = 'https://jdadigamrbeenkxdkwer.supabase.co';
      const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkYWRpZ2FtcmJlZW5reGRrd2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3OTYxNjIsImV4cCI6MjA2NDM3MjE2Mn0.PTTe16qs1Pamu6SSWjLBfMtlWDkgCeBxCZzhMGgv5mI';
      
      // Step 1: Get lists
      console.log('🔍 [useLists] Step 1: Fetching lists...');
      const listsResponse = await fetch(`${supabaseUrl}/rest/v1/lists?select=*&user_id=eq.${userId}&order=created_at.desc`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!listsResponse.ok) {
        throw new Error(`Lists fetch failed: ${listsResponse.status}`);
      }
      
      const listsData = await listsResponse.json();
      console.log('🔍 [useLists] Lists found:', listsData?.length || 0);
      
      if (!listsData || listsData.length === 0) {
        setLists([]);
        setLoading(false);
        return;
      }
      
      // Step 2: Get all items for all lists
      console.log('🔍 [useLists] Step 2: Fetching items...');
      const listIds = listsData.map(l => l.id);
      const itemsResponse = await fetch(`${supabaseUrl}/rest/v1/items?select=*&list_id=in.(${listIds.join(',')})`, {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!itemsResponse.ok) {
        throw new Error(`Items fetch failed: ${itemsResponse.status}`);
      }
      
      const itemsData = await itemsResponse.json();
      console.log('🔍 [useLists] Items found:', itemsData?.length || 0);
      
      // Step 3: Group items by list_id in memory
      console.log('🔍 [useLists] Step 3: Grouping items...');
      const itemsByListId = {};
      
      for (const item of itemsData) {
        const listId = item.list_id;
        if (!itemsByListId[listId]) {
          itemsByListId[listId] = [];
        }
        itemsByListId[listId].push(item);
      }
      
      // Step 4: Build lists with their items
      console.log('🔍 [useLists] Step 4: Building lists with items...');
      const listsWithItems = listsData.map(listItem => {
        const listItems = itemsByListId[listItem.id] || [];
        
        // Sort in memory
        const sortedItems = listItems.sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        );
        
        // Separate items and stay-aways
        const optimizedItems = sortedItems.filter(item => !item.is_stay_away);
        const optimizedStayAways = sortedItems.filter(item => item.is_stay_away);
        
        return {
          ...listItem,
          items: optimizedItems,
          stayAways: optimizedStayAways
        };
      });
      
      const endTime = Date.now();
      console.log('🔍 [useLists] Fetch completed in:', endTime - startTime, 'ms');
      console.log('🔍 [useLists] Final lists count:', listsWithItems.length);
      
      setLists(listsWithItems);
      setError(null);
      
    } catch (err) {
      console.error('🔍 [useLists] Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      console.log('🔍 [useLists] useEffect triggered with userId:', user.id);
      fetchLists(user.id);
    } else {
      console.log('🔍 [useLists] No user, setting empty lists');
      setLists([]);
      setLoading(false);
    }
  }, [user?.id]);

  const addItemToList = async (listId, itemData) => {
    try {
      console.log('🔍 [useLists] Adding item to list:', listId);
      
      // Use direct fetch for insert
      const supabaseUrl = 'https://jdadigamrbeenkxdkwer.supabase.co';
      const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkYWRpZ2FtcmJlZW5reGRrd2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3OTYxNjIsImV4cCI6MjA2NDM3MjE2Mn0.PTTe16qs1Pamu6SSWjLBfMtlWDkgCeBxCZzhMGgv5mI';
      
      const response = await fetch(`${supabaseUrl}/rest/v1/items`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          ...itemData,
          list_id: listId,
          user_id: user.id
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to add item: ${response.status}`);
      }
      
      const newItem = await response.json();
      console.log('🔍 [useLists] Item added successfully:', newItem);
      
      // Update local state
      setLists(prevLists => 
        prevLists.map(list => 
          list.id === listId 
            ? {
                ...list,
                items: [newItem, ...list.items]
              }
            : list
        )
      );
      
      // Check achievements
      const context = {
        item: newItem,
        listId,
        userId: user.id
      };
      
      checkAchievements('item_saved', context);
      checkAchievements('photo_taken', context);
      
      return { success: true, item: newItem, achievements: [] };
      
    } catch (error) {
      console.error('🔍 [useLists] Error adding item:', error);
      return { success: false, error: error.message };
    }
  };

  const updateItem = async (itemId, updates) => {
    try {
      console.log('🔍 [useLists] Updating item:', itemId);
      
      // Use direct fetch for update
      const supabaseUrl = 'https://jdadigamrbeenkxdkwer.supabase.co';
      const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkYWRpZ2FtcmJlZW5reGRrd2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3OTYxNjIsImV4cCI6MjA2NDM3MjE2Mn0.PTTe16qs1Pamu6SSWjLBfMtlWDkgCeBxCZzhMGgv5mI';
      
      const response = await fetch(`${supabaseUrl}/rest/v1/items?id=eq.${itemId}`, {
        method: 'PATCH',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(updates)
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update item: ${response.status}`);
      }
      
      const updatedItem = await response.json();
      console.log('🔍 [useLists] Item updated successfully:', updatedItem);
      
      // Update local state
      setLists(prevLists => 
        prevLists.map(list => ({
          ...list,
          items: list.items.map(item => 
            item.id === itemId ? { ...item, ...updates } : item
          ),
          stayAways: list.stayAways.map(item => 
            item.id === itemId ? { ...item, ...updates } : item
          )
        }))
      );
      
      return { success: true, item: updatedItem };
      
    } catch (error) {
      console.error('🔍 [useLists] Error updating item:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteItem = async (itemId) => {
    try {
      console.log('🔍 [useLists] Deleting item:', itemId);
      
      // Use direct fetch for delete
      const supabaseUrl = 'https://jdadigamrbeenkxdkwer.supabase.co';
      const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkYWRpZ2FtcmJlZW5reGRrd2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3OTYxNjIsImV4cCI6MjA2NDM3MjE2Mn0.PTTe16qs1Pamu6SSWjLBfMtlWDkgCeBxCZzhMGgv5mI';
      
      const response = await fetch(`${supabaseUrl}/rest/v1/items?id=eq.${itemId}`, {
        method: 'DELETE',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete item: ${response.status}`);
      }
      
      console.log('🔍 [useLists] Item deleted successfully');
      
      // Update local state
      setLists(prevLists => 
        prevLists.map(list => ({
          ...list,
          items: list.items.filter(item => item.id !== itemId),
          stayAways: list.stayAways.filter(item => item.id !== itemId)
        }))
      );
      
      return { success: true };
      
    } catch (error) {
      console.error('🔍 [useLists] Error deleting item:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    lists,
    loading,
    error,
    addItemToList,
    updateItem,
    deleteItem,
    refresh: () => user?.id && fetchLists(user.id)
  };
};
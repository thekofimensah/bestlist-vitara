// Offline Queue System for Bestlist Vitara
// Handles queueing operations when offline and syncing when online

import { Preferences } from '@capacitor/preferences';
import { supabase } from './supabase';
import { clearOfflinePostsForUser } from '../hooks/useOptimizedFeed';

const QUEUE_KEY = 'offline_queue_v1';
const QUEUE_STATUS_KEY = 'offline_queue_status_v1';

// Queue item types
const QUEUE_TYPES = {
  CREATE_ITEM: 'create_item',
  UPDATE_ITEM: 'update_item',
  DELETE_ITEM: 'delete_item',
  CREATE_POST: 'create_post',
  UPDATE_PROFILE: 'update_profile',
  CREATE_LIST: 'create_list'
};

let offlineQueue = [];
let queueLoaded = false;
let isSyncing = false;

// Load queue from persistent storage
const loadQueue = async () => {
  if (queueLoaded) return offlineQueue;
  
  try {
    const { value } = await Preferences.get({ key: QUEUE_KEY });
    offlineQueue = value ? JSON.parse(value) : [];
    queueLoaded = true;
    console.log('📥 [OfflineQueue] Loaded queue with', offlineQueue.length, 'items');
    return offlineQueue;
  } catch (error) {
    console.error('❌ [OfflineQueue] Failed to load queue:', error);
    offlineQueue = [];
    queueLoaded = true;
    return offlineQueue;
  }
};

// Save queue to persistent storage
const saveQueue = async () => {
  try {
    await Preferences.set({ 
      key: QUEUE_KEY, 
      value: JSON.stringify(offlineQueue) 
    });
    console.log('💾 [OfflineQueue] Saved queue with', offlineQueue.length, 'items');
  } catch (error) {
    console.error('❌ [OfflineQueue] Failed to save queue:', error);
  }
};

// Add operation to queue
export const addToOfflineQueue = async (operation) => {
  await loadQueue();
  
  const queueItem = {
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type: operation.type,
    data: operation.data,
    timestamp: Date.now(),
    retryCount: 0,
    maxRetries: 3
  };
  
  offlineQueue.push(queueItem);
  await saveQueue();
  
  console.log('📤 [OfflineQueue] Added item to queue:', queueItem.type, queueItem.id);
  
  // Try to sync immediately if online
  if (navigator.onLine) {
    setTimeout(() => syncQueue(), 1000);
  }
  
  return queueItem.id;
};

// Remove operation from queue
const removeFromQueue = async (itemId) => {
  await loadQueue();
  const initialLength = offlineQueue.length;
  offlineQueue = offlineQueue.filter(item => item.id !== itemId);
  
  if (offlineQueue.length !== initialLength) {
    await saveQueue();
    console.log('🗑️ [OfflineQueue] Removed item from queue:', itemId);
  }
};

// Execute a single queue item
const executeQueueItem = async (item) => {
  console.log('⚡ [OfflineQueue] Executing:', item.type, item.id);
  
  try {
    switch (item.type) {
      case QUEUE_TYPES.CREATE_ITEM:
        return await executeCreateItem(item.data);
        
      case QUEUE_TYPES.UPDATE_ITEM:
        return await executeUpdateItem(item.data);
        
      case QUEUE_TYPES.DELETE_ITEM:
        return await executeDeleteItem(item.data);
        
      case QUEUE_TYPES.CREATE_POST:
        return await executeCreatePost(item.data);
        
      case QUEUE_TYPES.UPDATE_PROFILE:
        return await executeUpdateProfile(item.data);
        
      case QUEUE_TYPES.CREATE_LIST:
        return await executeCreateList(item.data);
        
      default:
        throw new Error(`Unknown queue type: ${item.type}`);
    }
  } catch (error) {
    console.error(`❌ [OfflineQueue] Failed to execute ${item.type}:`, error);
    throw error;
  }
};

// Execute individual operations
const executeCreateItem = async (data) => {
  // Handle the data structure that comes from App.jsx queueCreateItem calls
  // Data format: { selectedListIds, itemData, isStayAway }
  const { selectedListIds, itemData, isStayAway } = data;
  
  if (!selectedListIds || !Array.isArray(selectedListIds) || selectedListIds.length === 0) {
    throw new Error('Invalid selectedListIds for create item');
  }
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  
  // Create the item first
  const { data: result, error } = await supabase
    .from('items')
    .insert({
      ...itemData,
      is_stay_away: isStayAway,
      list_id: selectedListIds[0] // Use the first list ID as the primary
    })
    .select()
    .single();
  
  if (error) throw error;
  
  // Create a post for the item (for profile "recent photos")
  try {
    const { error: postError } = await supabase
      .from('posts')
      .insert({
        user_id: user.id,
        item_id: result.id,
        list_id: selectedListIds[0],
        is_public: itemData.is_public !== false, // Default to public unless explicitly private
        location: itemData.place_name || null
      });
    
    if (postError) {
      console.warn('⚠️ [OfflineQueue] Failed to create post for offline item (non-fatal):', postError);
      // Don't throw - the item was created successfully
    } else {
      console.log('✅ [OfflineQueue] Created post for offline item:', result.id);
      
      // Note: We'll clean up offline posts after all syncing is complete
    }
  } catch (postErr) {
    console.warn('⚠️ [OfflineQueue] Post creation error (non-fatal):', postErr);
  }
  
  // If there are multiple list IDs, create relationships for the additional ones
  if (selectedListIds.length > 1) {
    const listItemRelationships = selectedListIds.slice(1).map(listId => ({
      list_id: listId,
      item_id: result.id
    }));
    
    const { error: relationError } = await supabase
      .from('list_items')
      .insert(listItemRelationships);
    
    if (relationError) {
      console.warn('Failed to create additional list relationships:', relationError);
      // Don't throw here - the item was created successfully
    }
  }
  
  return result;
};

const executeUpdateItem = async (data) => {
  // Handle direct item update (data is the item object itself)
  const itemId = data.id;
  if (!itemId) {
    throw new Error('Missing item id for update');
  }
  
  // Extract the updatable fields from the item
  const updates = {
    name: data.name || data.user_product_name || data.productName,
    image_url: data.image_url || data.image,
    rating: data.rating,
    notes: data.notes || '',
    is_stay_away: data.is_stay_away || false,
    
    // AI Metadata
    ai_product_name: data.ai_product_name,
    ai_brand: data.ai_brand,
    ai_category: data.ai_category,
    ai_subcategory: data.ai_subcategory,
    ai_confidence: data.ai_confidence,
    ai_description: data.ai_description,
    ai_price: data.ai_price,
    ai_allergens: data.ai_allergens,
    ai_tags: data.ai_tags,
    ai_quality_breakdown: data.ai_quality_breakdown,
    
    // Location data
    place_name: data.place_name,
    address: data.address,
    latitude: data.latitude,
    longitude: data.longitude,
    
    // Achievement data
    is_first_in_world: data.is_first_in_world || false,
    first_in_world_achievement_id: data.first_in_world_achievement_id
  };
  
  // Remove undefined values
  Object.keys(updates).forEach(key => {
    if (updates[key] === undefined) {
      delete updates[key];
    }
  });
  
  const { data: result, error } = await supabase
    .from('items')
    .update(updates)
    .eq('id', itemId)
    .select()
    .single();
  
  if (error) throw error;
  return result;
};

const executeDeleteItem = async (data) => {
  const { itemId } = data;
  const { error } = await supabase
    .from('items')
    .delete()
    .eq('id', itemId);
  
  if (error) throw error;
  return { success: true };
};

const executeCreatePost = async (data) => {
  const { data: result, error } = await supabase
    .from('posts')
    .insert(data)
    .select()
    .single();
  
  if (error) throw error;
  return result;
};

const executeUpdateProfile = async (data) => {
  const { userId, updates } = data;
  const { data: result, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return result;
};

const executeCreateList = async (data) => {
  // Handle the data structure that comes from offline list creation
  // Data format: { userId, name, color }
  const { userId, name, color } = data;
  
  if (!userId) {
    throw new Error('User ID is required for list creation');
  }
  
  if (!name || !name.trim()) {
    throw new Error('List name is required');
  }
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('User not authenticated');
  
  // Create the list
  const { data: result, error } = await supabase
    .from('lists')
    .insert({
      user_id: userId,
      name: name.trim(),
      color: color || '#1F6D5A'
    })
    .select()
    .single();
  
  if (error) throw error;
  
  console.log('✅ [OfflineQueue] List created successfully:', result.id, result.name);
  return result;
};

// Sync entire queue
export const syncQueue = async () => {
  if (isSyncing) {
    console.log('⏳ [OfflineQueue] Sync already in progress, skipping');
    return { success: 0, failed: 0, totalItems: 0, alreadyInProgress: true };
  }
  
  if (!navigator.onLine) {
    console.log('📡 [OfflineQueue] Offline, skipping sync');
    return { success: 0, failed: 0, totalItems: 0, offline: true };
  }
  
  try {
    await loadQueue();
    
    if (offlineQueue.length === 0) {
      console.log('✅ [OfflineQueue] Queue empty, nothing to sync');
      return { success: 0, failed: 0, totalItems: 0, empty: true };
    }
    
    isSyncing = true;
    console.log('🔄 [OfflineQueue] Starting sync of', offlineQueue.length, 'items');
    console.log('📋 [OfflineQueue] Queue items:', offlineQueue.map(item => ({ type: item.type, id: item.id, retryCount: item.retryCount })));
    
    const results = {
      success: 0,
      failed: 0,
      totalItems: offlineQueue.length
    };
    
    // Process items sequentially to avoid overwhelming the server
    for (const item of [...offlineQueue]) {
      try {
        await executeQueueItem(item);
        await removeFromQueue(item.id);
        results.success++;
        console.log('✅ [OfflineQueue] Synced:', item.type, item.id);
        
      } catch (error) {
        console.error('❌ [OfflineQueue] Failed to sync:', item.type, item.id, error);
        
        // Increment retry count
        item.retryCount = (item.retryCount || 0) + 1;
        
        // Remove if max retries exceeded
        if (item.retryCount >= item.maxRetries) {
          console.warn('⚠️ [OfflineQueue] Max retries exceeded, removing:', item.id);
          await removeFromQueue(item.id);
          results.failed++;
        } else {
          console.log(`🔄 [OfflineQueue] Will retry (${item.retryCount}/${item.maxRetries}):`, item.id);
          // Update the item in queue with new retry count
          const queueIndex = offlineQueue.findIndex(q => q.id === item.id);
          if (queueIndex !== -1) {
            offlineQueue[queueIndex] = item;
            await saveQueue();
          }
        }
      }
      
      // Small delay between operations to be gentle on the server
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    console.log('🎉 [OfflineQueue] Sync completed:', results);
    console.log('📊 [OfflineQueue] Final queue length:', offlineQueue.length);
    
    // Clean up offline posts cache if we successfully synced any items
    if (results.success > 0) {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          clearOfflinePostsForUser(user.id);
          console.log('🧹 [OfflineQueue] Cleared offline posts cache after successful sync');
          
          // Trigger profile refresh to show clean data
          try {
            window.dispatchEvent(new CustomEvent('profile:refresh-needed', { detail: { userId: user.id } }));
          } catch (_) {}
          
          // Trigger lists refresh to remove offline indicators
          try {
            window.dispatchEvent(new CustomEvent('lists:refresh-needed', { detail: { userId: user.id } }));
          } catch (_) {}
        }
      } catch (cleanupErr) {
        console.warn('⚠️ [OfflineQueue] Failed to cleanup offline posts (non-fatal):', cleanupErr);
      }
    }
    
    // Save updated queue state
    try {
      await Preferences.set({ 
        key: QUEUE_STATUS_KEY, 
        value: JSON.stringify({
          lastSync: Date.now(),
          results
        })
      });
      console.log('💾 [OfflineQueue] Sync status saved');
    } catch (error) {
      console.error('❌ [OfflineQueue] Failed to save sync status:', error);
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ [OfflineQueue] Critical sync error:', error);
    return { success: 0, failed: 0, totalItems: 0, error: error.message };
  } finally {
    // Always reset syncing flag, even if something went wrong
    isSyncing = false;
  }
};

// Get queue status
export const getQueueStatus = async () => {
  await loadQueue();
  
  try {
    const { value } = await Preferences.get({ key: QUEUE_STATUS_KEY });
    const status = value ? JSON.parse(value) : null;
    
    return {
      pendingItems: offlineQueue.length,
      isOnline: navigator.onLine,
      isSyncing,
      lastSync: status?.lastSync || null,
      lastResults: status?.results || null
    };
  } catch (error) {
    return {
      pendingItems: offlineQueue.length,
      isOnline: navigator.onLine,
      isSyncing,
      lastSync: null,
      lastResults: null
    };
  }
};

// Clear queue (for testing/debugging)
export const clearQueue = async () => {
  offlineQueue = [];
  await saveQueue();
  console.log('🧹 [OfflineQueue] Queue cleared');
};

// Auto-sync when coming online
let onlineListener = null;

export const enableAutoSync = () => {
  if (onlineListener) return;
  
  onlineListener = () => {
    console.log('📡 [OfflineQueue] Network restored, starting auto-sync...');
    setTimeout(() => syncQueue(), 2000); // Small delay to ensure stable connection
  };
  
  window.addEventListener('online', onlineListener);
  console.log('🔄 [OfflineQueue] Auto-sync enabled');
};

export const disableAutoSync = () => {
  if (onlineListener) {
    window.removeEventListener('online', onlineListener);
    onlineListener = null;
    console.log('⏹️ [OfflineQueue] Auto-sync disabled');
  }
};

// Export queue types for use in other modules
export { QUEUE_TYPES };

// Initialize auto-sync by default
if (typeof window !== 'undefined') {
  enableAutoSync();
}

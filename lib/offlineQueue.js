// Offline Queue System for Bestlist Vitara
// Handles queueing operations when offline and syncing when online

import { Preferences } from '@capacitor/preferences';
import { supabase } from './supabase';

const QUEUE_KEY = 'offline_queue_v1';
const QUEUE_STATUS_KEY = 'offline_queue_status_v1';

// Queue item types
const QUEUE_TYPES = {
  CREATE_ITEM: 'create_item',
  UPDATE_ITEM: 'update_item',
  DELETE_ITEM: 'delete_item',
  CREATE_POST: 'create_post',
  UPDATE_PROFILE: 'update_profile'
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
  const { data: result, error } = await supabase
    .from('items')
    .insert(data)
    .select()
    .single();
  
  if (error) throw error;
  return result;
};

const executeUpdateItem = async (data) => {
  const { itemId, updates } = data;
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

// Sync entire queue
export const syncQueue = async () => {
  if (isSyncing) {
    console.log('⏳ [OfflineQueue] Sync already in progress, skipping');
    return;
  }
  
  if (!navigator.onLine) {
    console.log('📡 [OfflineQueue] Offline, skipping sync');
    return;
  }
  
  await loadQueue();
  
  if (offlineQueue.length === 0) {
    console.log('✅ [OfflineQueue] Queue empty, nothing to sync');
    return;
  }
  
  isSyncing = true;
  console.log('🔄 [OfflineQueue] Starting sync of', offlineQueue.length, 'items');
  
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
  
  isSyncing = false;
  
  console.log('🎉 [OfflineQueue] Sync completed:', results);
  
  // Save updated queue state
  await Preferences.set({ 
    key: QUEUE_STATUS_KEY, 
    value: JSON.stringify({
      lastSync: Date.now(),
      results
    })
  });
  
  return results;
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

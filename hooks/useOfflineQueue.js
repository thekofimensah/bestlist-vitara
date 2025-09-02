// React Hook for Offline Queue Management
import { useState, useEffect, useCallback } from 'react';
import { 
  addToOfflineQueue, 
  syncQueue, 
  getQueueStatus, 
  clearQueue,
  QUEUE_TYPES 
} from '../lib/offlineQueue';

export const useOfflineQueue = () => {
  const [queueStatus, setQueueStatus] = useState({
    pendingItems: 0,
    isOnline: navigator.onLine,
    isSyncing: false,
    lastSync: null,
    lastResults: null
  });

  // Update queue status
  const updateStatus = useCallback(async () => {
    try {
      const status = await getQueueStatus();
      setQueueStatus(status);
    } catch (error) {
      console.error('Failed to get queue status:', error);
    }
  }, []);

  // Queue a create item operation
  const queueCreateItem = useCallback(async (itemData) => {
    try {
      const queueId = await addToOfflineQueue({
        type: QUEUE_TYPES.CREATE_ITEM,
        data: itemData
      });
      await updateStatus();
      return queueId;
    } catch (error) {
      console.error('Failed to queue create item:', error);
      throw error;
    }
  }, [updateStatus]);

  // Queue an update item operation
  const queueUpdateItem = useCallback(async (itemId, updates) => {
    try {
      const queueId = await addToOfflineQueue({
        type: QUEUE_TYPES.UPDATE_ITEM,
        data: { itemId, updates }
      });
      await updateStatus();
      return queueId;
    } catch (error) {
      console.error('Failed to queue update item:', error);
      throw error;
    }
  }, [updateStatus]);

  // Queue a delete item operation
  const queueDeleteItem = useCallback(async (itemId) => {
    try {
      const queueId = await addToOfflineQueue({
        type: QUEUE_TYPES.DELETE_ITEM,
        data: { itemId }
      });
      await updateStatus();
      return queueId;
    } catch (error) {
      console.error('Failed to queue delete item:', error);
      throw error;
    }
  }, [updateStatus]);

  // Queue a create post operation
  const queueCreatePost = useCallback(async (postData) => {
    try {
      const queueId = await addToOfflineQueue({
        type: QUEUE_TYPES.CREATE_POST,
        data: postData
      });
      await updateStatus();
      return queueId;
    } catch (error) {
      console.error('Failed to queue create post:', error);
      throw error;
    }
  }, [updateStatus]);

  // Queue a profile update operation
  const queueUpdateProfile = useCallback(async (userId, updates) => {
    try {
      const queueId = await addToOfflineQueue({
        type: QUEUE_TYPES.UPDATE_PROFILE,
        data: { userId, updates }
      });
      await updateStatus();
      return queueId;
    } catch (error) {
      console.error('Failed to queue profile update:', error);
      throw error;
    }
  }, [updateStatus]);

  // Queue a create list operation
  const queueCreateList = useCallback(async (listData) => {
    try {
      const queueId = await addToOfflineQueue({
        type: QUEUE_TYPES.CREATE_LIST,
        data: listData
      });
      await updateStatus();
      return queueId;
    } catch (error) {
      console.error('Failed to queue create list:', error);
      throw error;
    }
  }, [updateStatus]);

  // Manually trigger sync
  const triggerSync = useCallback(async () => {
    try {
      const results = await syncQueue();
      await updateStatus();
      return results;
    } catch (error) {
      console.error('Failed to sync queue:', error);
      throw error;
    }
  }, [updateStatus]);

  // Clear the queue (for debugging)
  const clearQueueData = useCallback(async () => {
    try {
      await clearQueue();
      await updateStatus();
    } catch (error) {
      console.error('Failed to clear queue:', error);
      throw error;
    }
  }, [updateStatus]);

  // Listen for online/offline status changes
  useEffect(() => {
    const handleOnline = async () => {
      console.log('📡 [useOfflineQueue] Network restored');
      await updateStatus();
      
      // Trigger sync if there are pending items
      const status = await getQueueStatus();
      if (status.pendingItems > 0) {
        console.log('📡 [useOfflineQueue] Network restored with pending items, starting sync...');
        try {
          await triggerSync();
          console.log('✅ [useOfflineQueue] Auto-sync completed successfully');
        } catch (error) {
          console.error('❌ [useOfflineQueue] Auto-sync failed:', error);
        }
      }
    };

    const handleOffline = () => {
      console.log('📡 [useOfflineQueue] Network lost');
      updateStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial status update
    updateStatus();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateStatus, triggerSync]);

  // Auto-update status periodically when there are pending items
  useEffect(() => {
    if (queueStatus.pendingItems > 0) {
      let interval = setInterval(updateStatus, 5000); // Update every 5 seconds
      
      // Stop the interval when app goes to background to prevent network requests
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'hidden') {
          console.log('📡 [useOfflineQueue] App backgrounded - stopping status updates');
          clearInterval(interval);
        } else if (document.visibilityState === 'visible' && queueStatus.pendingItems > 0) {
          console.log('📡 [useOfflineQueue] App foregrounded - resuming status updates');
          clearInterval(interval); // Clear any existing interval
          interval = setInterval(updateStatus, 5000);
          
          // Try to sync when app comes back to foreground if online
          if (navigator.onLine) {
            console.log('📡 [useOfflineQueue] App foregrounded with pending items and online, attempting sync...');
            triggerSync().catch(error => {
              console.error('❌ [useOfflineQueue] Foreground sync failed:', error);
            });
          }
        }
      };
      
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      return () => {
        clearInterval(interval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }
  }, [queueStatus.pendingItems, updateStatus]);

  return {
    // Status
    queueStatus,
    
    // Queue operations
    queueCreateItem,
    queueUpdateItem,
    queueDeleteItem,
    queueCreatePost,
    queueUpdateProfile,
    queueCreateList,
    
    // Management
    triggerSync,
    clearQueueData,
    updateStatus,
    
    // Computed values
    hasPendingItems: queueStatus.pendingItems > 0,
    isOnline: queueStatus.isOnline,
    isSyncing: queueStatus.isSyncing
  };
};

export default useOfflineQueue;

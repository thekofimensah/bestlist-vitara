// Debug Local Offline Queue
// Run this in your browser console to inspect and clear the stuck queue

(async function debugOfflineQueue() {
  console.log('🔍 [Debug] Checking local offline queue...');
  
  try {
    // Check if Capacitor Preferences is available
    if (typeof window.CapacitorPreferences === 'undefined') {
      console.log('📱 [Debug] Capacitor not available, checking localStorage fallback...');
      
      // Check localStorage for fallback storage
      const queueData = localStorage.getItem('offline_queue_v1');
      const statusData = localStorage.getItem('offline_queue_status_v1');
      
      console.log('📦 [Debug] Queue data:', queueData);
      console.log('📊 [Debug] Status data:', statusData);
      
      if (queueData) {
        const queue = JSON.parse(queueData);
        console.log('📝 [Debug] Queue contents:', queue);
        console.log(`📊 [Debug] Queue has ${queue.length} items`);
        
        // Clear the queue
        localStorage.removeItem('offline_queue_v1');
        localStorage.removeItem('offline_queue_status_v1');
        console.log('🧹 [Debug] Queue cleared from localStorage');
      } else {
        console.log('✅ [Debug] No queue found in localStorage');
      }
    } else {
      // Use Capacitor Preferences
      const { CapacitorPreferences } = window;
      
      const queueResult = await CapacitorPreferences.get({ key: 'offline_queue_v1' });
      const statusResult = await CapacitorPreferences.get({ key: 'offline_queue_status_v1' });
      
      console.log('📦 [Debug] Queue data:', queueResult.value);
      console.log('📊 [Debug] Status data:', statusResult.value);
      
      if (queueResult.value) {
        const queue = JSON.parse(queueResult.value);
        console.log('📝 [Debug] Queue contents:', queue);
        console.log(`📊 [Debug] Queue has ${queue.length} items`);
        
        // Show details of each item
        queue.forEach((item, index) => {
          console.log(`  ${index + 1}. ${item.type} (ID: ${item.id}) - Retries: ${item.retryCount || 0}/${item.maxRetries || 3}`);
          console.log(`     Data:`, item.data);
          console.log(`     Timestamp:`, new Date(item.timestamp).toLocaleString());
        });
        
        // Clear the queue
        await CapacitorPreferences.remove({ key: 'offline_queue_v1' });
        await CapacitorPreferences.remove({ key: 'offline_queue_status_v1' });
        console.log('🧹 [Debug] Queue cleared from Capacitor Preferences');
      } else {
        console.log('✅ [Debug] No queue found in Capacitor Preferences');
      }
    }
    
    // Force refresh the page to update the UI
    console.log('🔄 [Debug] Refreshing page to update UI...');
    setTimeout(() => {
      window.location.reload();
    }, 1000);
    
  } catch (error) {
    console.error('❌ [Debug] Error checking queue:', error);
    
    // Try fallback localStorage cleanup
    try {
      localStorage.removeItem('offline_queue_v1');
      localStorage.removeItem('offline_queue_status_v1');
      console.log('🧹 [Debug] Fallback: Cleared localStorage');
      setTimeout(() => window.location.reload(), 1000);
    } catch (fallbackError) {
      console.error('❌ [Debug] Fallback cleanup failed:', fallbackError);
    }
  }
})();

// Also provide manual functions
window.debugQueue = {
  // Check queue status
  async check() {
    const { CapacitorPreferences } = window;
    const queueResult = await CapacitorPreferences.get({ key: 'offline_queue_v1' });
    if (queueResult.value) {
      const queue = JSON.parse(queueResult.value);
      console.log(`Queue has ${queue.length} items:`, queue);
      return queue;
    }
    console.log('Queue is empty');
    return [];
  },
  
  // Clear queue manually
  async clear() {
    const { CapacitorPreferences } = window;
    await CapacitorPreferences.remove({ key: 'offline_queue_v1' });
    await CapacitorPreferences.remove({ key: 'offline_queue_status_v1' });
    console.log('Queue cleared manually');
    window.location.reload();
  },
  
  // Clear localStorage fallback
  clearLocal() {
    localStorage.removeItem('offline_queue_v1');
    localStorage.removeItem('offline_queue_status_v1');
    console.log('localStorage queue cleared');
    window.location.reload();
  }
};

console.log('🛠️ [Debug] Functions available:');
console.log('  debugQueue.check() - Check queue contents');
console.log('  debugQueue.clear() - Clear Capacitor queue');
console.log('  debugQueue.clearLocal() - Clear localStorage queue');

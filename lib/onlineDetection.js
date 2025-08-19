// Centralized online detection utility for Bestlist Vitara
// Provides consistent online/offline state management across the app

import { useState, useEffect } from 'react';

let globalOnlineState = typeof navigator !== 'undefined' ? navigator.onLine : true;
let onlineListeners = new Set();

// Utility function to check if device is online
export const isOnline = () => globalOnlineState;

// Utility function to check if device is offline
export const isOffline = () => !globalOnlineState;

// Add listener for online status changes
export const addOnlineListener = (callback) => {
  onlineListeners.add(callback);
  // Return cleanup function
  return () => onlineListeners.delete(callback);
};

// Update global state and notify listeners
const updateOnlineState = (newState) => {
  if (globalOnlineState !== newState) {
    const previousState = globalOnlineState;
    globalOnlineState = newState;
    
    console.log(`🌐 [OnlineDetection] Status changed: ${previousState ? 'online' : 'offline'} -> ${newState ? 'online' : 'offline'}`);
    
    // Notify all listeners
    onlineListeners.forEach(callback => {
      try {
        callback(newState, previousState);
      } catch (error) {
        console.error('🌐 [OnlineDetection] Listener error:', error);
      }
    });
  }
};

// Initialize online detection if in browser environment
if (typeof window !== 'undefined') {
  const handleOnline = () => updateOnlineState(true);
  const handleOffline = () => updateOnlineState(false);
  
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);
  
  // Clean up listeners on unload
  window.addEventListener('beforeunload', () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  });
}

// React hook for online status
export const useOnlineStatus = () => {
  const [online, setOnline] = useState(globalOnlineState);
  
  useEffect(() => {
    const cleanup = addOnlineListener((newState) => {
      setOnline(newState);
    });
    
    return cleanup;
  }, []);
  
  return {
    isOnline: online,
    isOffline: !online
  };
};

// Enhanced wrapper for fetch requests with offline detection
export const safeFetch = async (input, init = {}) => {
  // Check if offline before making request
  if (isOffline()) {
    const error = new Error('Device is offline');
    error.name = 'OfflineError';
    throw error;
  }
  
  try {
    return await fetch(input, init);
  } catch (error) {
    // If fetch fails, double-check online status
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.warn('🌐 [SafeFetch] Fetch failed, device may be offline');
    }
    throw error;
  }
};

// Wrapper for subscription retry logic that respects online status
export const shouldRetrySubscription = (retryCount, maxRetries) => {
  // Don't retry if offline
  if (isOffline()) {
    console.log('🌐 [SubscriptionRetry] Skipping retry - device is offline');
    return false;
  }
  
  // Don't retry if exceeded max attempts
  if (retryCount >= maxRetries) {
    console.log(`🌐 [SubscriptionRetry] Max retries (${maxRetries}) exceeded`);
    return false;
  }
  
  return true;
};

// Utility to delay execution until device comes online
export const waitForOnline = (timeoutMs = 30000) => {
  return new Promise((resolve, reject) => {
    if (isOnline()) {
      resolve();
      return;
    }
    
    let timeout;
    const cleanup = addOnlineListener((newState) => {
      if (newState) {
        if (timeout) clearTimeout(timeout);
        cleanup();
        resolve();
      }
    });
    
    // Set timeout to reject if stays offline too long
    timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout waiting for online connection'));
    }, timeoutMs);
  });
};

export default {
  isOnline,
  isOffline,
  useOnlineStatus,
  safeFetch,
  shouldRetrySubscription,
  waitForOnline,
  addOnlineListener
};

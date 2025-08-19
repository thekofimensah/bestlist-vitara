// Utility functions to help existing components check offline status
// This provides a migration path for components using navigator.onLine directly

import { isOnline, isOffline } from './onlineDetection';

// Wrapper for components that were checking navigator.onLine directly
export const checkOnlineStatus = () => {
  return isOnline();
};

// Enhanced fetch wrapper that handles common patterns in the app
export const fetchWithOfflineGuard = async (url, options = {}) => {
  if (isOffline()) {
    console.log(`🌐 [OfflineGuard] Skipping fetch to ${url} - device is offline`);
    throw new Error('Device is offline');
  }
  
  try {
    return await fetch(url, options);
  } catch (error) {
    // If fetch fails with a network error, it might indicate going offline
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.warn(`🌐 [OfflineGuard] Fetch to ${url} failed - network may be unavailable`);
    }
    throw error;
  }
};

// Utility to show user-friendly offline messages
export const getOfflineMessage = (action = 'this action') => {
  return `${action} requires an internet connection. Please check your network and try again.`;
};

// Helper to conditionally disable UI elements when offline
export const shouldDisableWhenOffline = () => {
  return isOffline();
};

export default {
  checkOnlineStatus,
  fetchWithOfflineGuard,
  getOfflineMessage,
  shouldDisableWhenOffline,
  isOnline,
  isOffline
};

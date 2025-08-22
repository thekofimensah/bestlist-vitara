import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { saveStatsLocal, getStatsLocal } from '../lib/localUserCache';
import { shouldRetrySubscription, isOffline, useOnlineStatus } from '../lib/onlineDetection';
const isAppActive = () => (typeof window !== 'undefined' && window.__APP_ACTIVE__ !== false);

// Simple in-memory cache to avoid refetch on navigation
// Map<userId, stats>
const statsCache = new Map();

const useUserStats = (userId) => {
  const [stats, setStats] = useState({
    photosTaken: 0,
    listsCreated: 0,
    uniqueIngredients: 0,
    likesReceived: 0,
    totalItems: 0,
    avgRating: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Online status tracking
  const { isOnline } = useOnlineStatus();
  
  // Retry logic for realtime subscriptions
  const [subscriptionRetryCount, setSubscriptionRetryCount] = useState(0);
  const [lastSubscriptionAttempt, setLastSubscriptionAttempt] = useState(0);
  const MAX_SUBSCRIPTION_RETRIES = 3;
  const SUBSCRIPTION_RETRY_DELAY = 5000; // 5 seconds
  
  // Track timeout IDs for proper cleanup
  const activeTimeouts = useRef(new Set());
  const isUnmountedRef = useRef(false);
  const intentionalCloseRef = useRef(false);

  // Helper to create tracked timeouts that can be properly cleaned up
  const createTrackedTimeout = (callback, delay) => {
    const timeoutId = setTimeout(() => {
      activeTimeouts.current.delete(timeoutId);
      if (!isUnmountedRef.current && isAppActive()) {
        callback();
      }
    }, delay);
    activeTimeouts.current.add(timeoutId);
    return timeoutId;
  };

  // Helper to clear all tracked timeouts
  const clearAllTimeouts = () => {
    activeTimeouts.current.forEach(timeoutId => clearTimeout(timeoutId));
    activeTimeouts.current.clear();
  };

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    let subscription;
    let appStateHandler;

    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);

        const isDev = window.location.hostname === 'localhost' || window.location.hostname.includes('192.168');
        console.log(`[${isDev ? 'DEV' : 'PROD'}] 🔍 [useUserStats] Fetching stats for user:`, userId);
        // If offline or app inactive, serve from local cache and exit
        if ((typeof navigator !== 'undefined' && navigator.onLine === false) || !isAppActive()) {
          console.log('🔍 [useUserStats] App offline or inactive, using local cache');
          const local = await getStatsLocal(userId);
          if (local) setStats(local);
          setLoading(false);
          return;
        }
        
        console.log('🔍 [useUserStats] Querying profile_stats table...');
        // Simple, fast query - just one row from profile_stats
        const { data, error } = await supabase
          .from('profile_stats')
          .select('*')
          .eq('user_id', userId)
          .single();
          
        console.log('🔍 [useUserStats] Query result:', { data, error });

        if (error) {
          // If no stats row exists, create one
          if (error.code === 'PGRST116') {
            console.log('🔧 [useUserStats] No stats found, creating initial row');
            try {
              await supabase.rpc('ensure_profile_stats', { target_user_id: userId });
              
              // Fetch again after creating
              const { data: newData, error: newError } = await supabase
                .from('profile_stats')
                .select('*')
                .eq('user_id', userId)
                .single();
              
              if (newError) {
                console.log('🔧 [useUserStats] Still no stats after creation, using defaults');
                // If still no stats, just use defaults
                setStats({
                  photosTaken: 0,
                  listsCreated: 0,
                  uniqueIngredients: 0,
                  likesReceived: 0,
                  totalItems: 0,
                  avgRating: 0
                });
              } else {
                setStats({
                  photosTaken: newData.photos_taken || 0,
                  listsCreated: newData.lists_created || 0,
                  uniqueIngredients: newData.unique_ingredients || 0,
                  likesReceived: newData.likes_received || 0,
                  totalItems: newData.total_items || 0,
                  avgRating: parseFloat(newData.avg_rating) || 0
                });
              }
            } catch (rpcError) {
              console.log('🔧 [useUserStats] RPC error, using default stats:', rpcError);
              // If RPC fails, just use defaults
              setStats({
                photosTaken: 0,
                listsCreated: 0,
                uniqueIngredients: 0,
                likesReceived: 0,
                totalItems: 0,
                avgRating: 0
              });
            }
          } else {
            throw error;
          }
        } else {
          const newStats = {
            photosTaken: data.photos_taken || 0,
            listsCreated: data.lists_created || 0,
            uniqueIngredients: data.unique_ingredients || 0,
            likesReceived: data.likes_received || 0,
            totalItems: data.total_items || 0,
            avgRating: parseFloat(data.avg_rating) || 0
          };
          console.log('🔍 [useUserStats] Setting stats:', newStats);
          setStats(newStats);
          
          // Persist locally for offline use
          await saveStatsLocal(userId, newStats);
        }

        console.log('✅ [useUserStats] Stats loaded successfully');

        // Update cache with current stats
        const currentStats = {
          photosTaken: data?.photos_taken || 0,
          listsCreated: data?.lists_created || 0,
          uniqueIngredients: data?.unique_ingredients || 0,
          likesReceived: data?.likes_received || 0,
          totalItems: data?.total_items || 0,
          avgRating: parseFloat(data?.avg_rating || 0)
        };
        statsCache.set(userId, currentStats);

      } catch (err) {
        console.error('🚨 [useUserStats] Error fetching stats:', JSON.stringify({
          message: err?.message || 'Unknown error',
          code: err?.code || 'NO_CODE', 
          details: err?.details || 'NO_DETAILS',
          name: err?.name || 'NO_NAME',
          stack: err?.stack || 'NO_STACK',
          fullError: err
        }, null, 2));
        setError(err?.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    // Serve from cache immediately if available, but always fetch fresh data
    const cached = statsCache.get(userId);
    if (cached) {
      console.log('🔍 [useUserStats] Using cached stats, fetching fresh data in background');
      setStats(cached);
      setLoading(false);
      // Still fetch fresh data in background
      setTimeout(fetchStats, 100);
    } else {
      // Try local persisted cache first (for cold start offline)
      (async () => {
        console.log('🔍 [useUserStats] No memory cache, checking local storage...');
        const local = await getStatsLocal(userId);
        if (local) {
          console.log('🔍 [useUserStats] Using local storage cache, fetching fresh data');
          setStats(local);
          setLoading(false);
          // Still fetch fresh data  
          setTimeout(fetchStats, 100);
        } else {
          console.log('🔍 [useUserStats] No cache found, fetching fresh data');
          // Initial fetch only if no cache
          fetchStats();
        }
      })();
    }

    // Clean up subscription function
    const cleanupSubscription = () => {
      if (subscription) {
        console.log('🧹 [useUserStats] Cleaning up subscription');
        // Mark this close as intentional so we don't trigger retries
        intentionalCloseRef.current = true;
        supabase.removeChannel(subscription);
        subscription = null;
      }
    };

    // Set up real-time subscription for automatic updates (only if app is active)
    const setupRealtimeSubscription = () => {
      // Don't set up subscription if app is not active or offline
      if (!isAppActive()) {
        return; // Silent - no logging when app inactive
      }
      
      if (!isOnline) {
        return; // Silent - no logging when offline
      }
      
      // Check if we've exceeded retry limit
      if (subscriptionRetryCount >= MAX_SUBSCRIPTION_RETRIES) {
        console.log(`🔔 [useUserStats] Max subscription retries (${MAX_SUBSCRIPTION_RETRIES}) exceeded - giving up`);
        setError('Realtime updates unavailable - stats will refresh manually');
        return;
      }
      
      // Implement exponential backoff
      const now = Date.now();
      const timeSinceLastAttempt = now - lastSubscriptionAttempt;
      const minDelay = SUBSCRIPTION_RETRY_DELAY * Math.pow(2, subscriptionRetryCount);
      
      if (timeSinceLastAttempt < minDelay && subscriptionRetryCount > 0) {
        console.log(`🔔 [useUserStats] Too soon to retry (${Math.round((minDelay - timeSinceLastAttempt) / 1000)}s remaining)`);
        createTrackedTimeout(setupRealtimeSubscription, minDelay - timeSinceLastAttempt);
        return;
      }
      
      setLastSubscriptionAttempt(now);

      // Clean up existing subscription first
      cleanupSubscription();
      
      console.log(`🔔 [useUserStats] Setting up real-time subscription for user: ${userId} (attempt ${subscriptionRetryCount + 1})`);
      
      subscription = supabase
        .channel(`user_stats_${userId}_${now}`) // Unique channel name to avoid conflicts
        .on(
          'postgres_changes',
          { 
            event: '*', 
            schema: 'public', 
            table: 'profile_stats', 
            filter: `user_id=eq.${userId}` 
          },
          (payload) => {
            console.log('🔔 [useUserStats] Real-time stats update received:', payload);
            
            // Reset retry count on successful message
            setSubscriptionRetryCount(0);
            setError(null);
            
            if (payload.new) {
              setStats({
                photosTaken: payload.new.photos_taken || 0,
                listsCreated: payload.new.lists_created || 0,
                uniqueIngredients: payload.new.unique_ingredients || 0,
                likesReceived: payload.new.likes_received || 0,
                totalItems: payload.new.total_items || 0,
                avgRating: parseFloat(payload.new.avg_rating) || 0
              });
              // Update cache
              statsCache.set(userId, {
                photosTaken: payload.new.photos_taken || 0,
                listsCreated: payload.new.lists_created || 0,
                uniqueIngredients: payload.new.unique_ingredients || 0,
                likesReceived: payload.new.likes_received || 0,
                totalItems: payload.new.total_items || 0,
                avgRating: parseFloat(payload.new.avg_rating) || 0
              });
            }
          }
        )
        .subscribe((status) => {
          // Only log subscription status when online to reduce noise
          if (isOnline) {
            console.log('🔔 [useUserStats] Subscription status:', status);
          }
          
          // Ignore CLOSED events that we intentionally triggered via cleanup
          if (status === 'CLOSED' && intentionalCloseRef.current) {
            intentionalCloseRef.current = false;
            return;
          }

          if (status === 'SUBSCRIBED') {
            // Reset retry count on successful subscription
            setSubscriptionRetryCount(0);
            setError(null);
            // Cancel any pending scheduled retries from earlier failures
            clearAllTimeouts();
          } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
            // Only log if we're online to reduce noise when offline
            if (isOnline) {
              console.log(`🔔 [useUserStats] Subscription failed (${status}) - will retry if under limit`);
            }
            
            // Increment retry count and attempt to reconnect
            setSubscriptionRetryCount(prev => {
              const newCount = prev + 1;
              if (shouldRetrySubscription(newCount, MAX_SUBSCRIPTION_RETRIES)) {
                const delay = SUBSCRIPTION_RETRY_DELAY * Math.pow(2, newCount - 1);
                if (isOnline) {
                  console.log(`🔔 [useUserStats] Scheduling retry ${newCount}/${MAX_SUBSCRIPTION_RETRIES} in ${delay/1000}s`);
                }
                createTrackedTimeout(setupRealtimeSubscription, delay);
              } else {
                if (isOnline) {
                  console.log('🔔 [useUserStats] Max retries exceeded - realtime updates disabled');
                  setError('Realtime updates unavailable - stats will refresh manually');
                }
              }
              return newCount;
            });
          }
        });
    };

    // Set up app state listener to handle background/foreground
    const setupAppStateListener = () => {
      appStateHandler = () => {
        if (isAppActive()) {
          console.log('🔔 [useUserStats] App became active - resetting retry count and setting up subscription');
          // Reset retry count when app becomes active to give users a fresh chance
          setSubscriptionRetryCount(0);
          setError(null);
          setupRealtimeSubscription();
        } else {
          console.log('🔔 [useUserStats] App became inactive - cleaning up subscription');
          cleanupSubscription();
        }
      };

      // Listen for app state changes via the global variable
      if (typeof window !== 'undefined') {
        const checkAppState = () => {
          const currentActive = isAppActive();
          const wasActive = window.__STATS_LAST_ACTIVE__ !== false;
          if (currentActive !== wasActive) {
            window.__STATS_LAST_ACTIVE__ = currentActive;
            appStateHandler();
          }
        };
        
        // Check every few seconds, but only when document is visible
        const intervalId = setInterval(() => {
          if (document.visibilityState === 'visible') {
            checkAppState();
          }
        }, 2000);
        
        // Additional cleanup on visibility change to prevent background requests
        const handleVisibilityChange = () => {
          if (document.visibilityState === 'hidden') {
            console.log('🔔 [useUserStats] App backgrounded - pausing interval');
            clearInterval(intervalId);
          }
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        
        // Store cleanup function
        appStateHandler.cleanup = () => {
          clearInterval(intervalId);
          document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
      }
    };

    if (isOnline) {
      setupRealtimeSubscription();
    }
    setupAppStateListener();

    // Cleanup function
    return () => {
      console.log('🧹 [useUserStats] Cleaning up useEffect');
      isUnmountedRef.current = true;
      clearAllTimeouts();
      cleanupSubscription();
      if (appStateHandler?.cleanup) {
        appStateHandler.cleanup();
      }
    };
  }, [userId, isOnline]); // Add isOnline dependency
  
  // Separate effect to handle online/offline transitions
  useEffect(() => {
    if (!userId) return;
    
    if (isOnline) {
      // Reset retry count when coming back online
      setSubscriptionRetryCount(0);
      setError(null);
      console.log('🌐 [useUserStats] Device back online - setting up subscription');
    } else {
      // Clean up subscription when going offline
      console.log('🌐 [useUserStats] Device offline - cleaning up subscription');
      // Don't set error state when going offline, just cleanup silently
    }
  }, [isOnline, userId]);

  // Manual refresh function with database recalculation
  const refreshStats = async () => {
    if (!userId) return;
    
    console.log('🔄 [useUserStats] Manual refresh requested');
    setLoading(true);
    
    try {
      // First, try to recalculate stats in the database
      console.log('🔄 [useUserStats] Recalculating stats in database...');
      const { error: rpcError } = await supabase.rpc('ensure_profile_stats', { 
        target_user_id: userId 
      });
      
      if (rpcError) {
        console.warn('⚠️ [useUserStats] RPC call failed, proceeding with direct query:', rpcError);
      }
      
      // Now fetch the updated stats
      const { data, error } = await supabase
        .from('profile_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If no stats row exists, try to create one
        if (error.code === 'PGRST116') {
          console.log('🔧 [useUserStats] No stats row found, creating one...');
          const { error: createError } = await supabase.rpc('ensure_profile_stats', { 
            target_user_id: userId 
          });
          
          if (createError) {
            throw new Error(`Failed to create stats row: ${createError.message}`);
          }
          
          // Try fetching again
          const { data: newData, error: newError } = await supabase
            .from('profile_stats')
            .select('*')
            .eq('user_id', userId)
            .single();
            
          if (newError) throw newError;
          
          setStats({
            photosTaken: newData.photos_taken || 0,
            listsCreated: newData.lists_created || 0,
            uniqueIngredients: newData.unique_ingredients || 0,
            likesReceived: newData.likes_received || 0,
            totalItems: newData.total_items || 0,
            avgRating: parseFloat(newData.avg_rating) || 0
          });
        } else {
          throw error;
        }
      } else {
        setStats({
          photosTaken: data.photos_taken || 0,
          listsCreated: data.lists_created || 0,
          uniqueIngredients: data.unique_ingredients || 0,
          likesReceived: data.likes_received || 0,
          totalItems: data.total_items || 0,
          avgRating: parseFloat(data.avg_rating) || 0
        });
      }
      
      // Reset error state on successful refresh
      setError(null);
      console.log('✅ [useUserStats] Stats refreshed successfully');
      
    } catch (err) {
      console.error('🚨 [useUserStats] Error refreshing stats:', JSON.stringify({
        message: err?.message || 'Unknown error',
        code: err?.code || 'NO_CODE',
        details: err?.details || 'NO_DETAILS', 
        name: err?.name || 'NO_NAME',
        stack: err?.stack || 'NO_STACK',
        fullError: err
      }, null, 2));
      setError(err?.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, error, refreshStats };
};

export default useUserStats;
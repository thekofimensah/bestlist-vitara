import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { saveStatsLocal, getStatsLocal } from '../lib/localUserCache';
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

        console.log('🔍 [useUserStats] Fetching stats for user:', userId);
        // If offline or app inactive, serve from local cache and exit
        if ((typeof navigator !== 'undefined' && navigator.onLine === false) || !isAppActive()) {
          const local = await getStatsLocal(userId);
          if (local) setStats(local);
          setLoading(false);
          return;
        }
        
        // Simple, fast query - just one row from profile_stats
        const { data, error } = await supabase
          .from('profile_stats')
          .select('*')
          .eq('user_id', userId)
          .single();

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
          setStats({
            photosTaken: data.photos_taken || 0,
            listsCreated: data.lists_created || 0,
            uniqueIngredients: data.unique_ingredients || 0,
            likesReceived: data.likes_received || 0,
            totalItems: data.total_items || 0,
            avgRating: parseFloat(data.avg_rating) || 0
          });
          // Persist locally for offline use
          await saveStatsLocal(userId, {
            photosTaken: data.photos_taken || 0,
            listsCreated: data.lists_created || 0,
            uniqueIngredients: data.unique_ingredients || 0,
            likesReceived: data.likes_received || 0,
            totalItems: data.total_items || 0,
            avgRating: parseFloat(data.avg_rating) || 0
          });
        }

        console.log('✅ [useUserStats] Stats loaded successfully');

        // Update cache
        statsCache.set(userId, {
          photosTaken: (error ? (data?.photos_taken || 0) : (data?.photos_taken || 0)),
          listsCreated: (error ? (data?.lists_created || 0) : (data?.lists_created || 0)),
          uniqueIngredients: (error ? (data?.unique_ingredients || 0) : (data?.unique_ingredients || 0)),
          likesReceived: (error ? (data?.likes_received || 0) : (data?.likes_received || 0)),
          totalItems: (error ? (data?.total_items || 0) : (data?.total_items || 0)),
          avgRating: parseFloat(error ? (data?.avg_rating || 0) : (data?.avg_rating || 0))
        });

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

    // Serve from cache immediately if available; still set up subscription
    const cached = statsCache.get(userId);
    if (cached) {
      setStats(cached);
      setLoading(false);
    } else {
      // Try local persisted cache first (for cold start offline)
      (async () => {
        const local = await getStatsLocal(userId);
        if (local) {
          setStats(local);
          setLoading(false);
        } else {
          // Initial fetch only if no cache
          fetchStats();
        }
      })();
    }

    // Clean up subscription function
    const cleanupSubscription = () => {
      if (subscription) {
        console.log('🧹 [useUserStats] Cleaning up subscription');
        supabase.removeChannel(subscription);
        subscription = null;
      }
    };

    // Set up real-time subscription for automatic updates (only if app is active)
    const setupRealtimeSubscription = () => {
      // Don't set up subscription if app is not active
      if (!isAppActive()) {
        console.log('🔔 [useUserStats] Skipping subscription setup - app inactive');
        return;
      }

      // Clean up existing subscription first
      cleanupSubscription();
      
      console.log('🔔 [useUserStats] Setting up real-time subscription for user:', userId);
      
      subscription = supabase
        .channel(`user_stats_${userId}`)
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
          console.log('🔔 [useUserStats] Subscription status:', status);
        });
    };

    // Set up app state listener to handle background/foreground
    const setupAppStateListener = () => {
      appStateHandler = () => {
        if (isAppActive()) {
          console.log('🔔 [useUserStats] App became active - setting up subscription');
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
        
        // Store cleanup function
        appStateHandler.cleanup = () => clearInterval(intervalId);
      }
    };

    setupRealtimeSubscription();
    setupAppStateListener();

    // Cleanup function
    return () => {
      console.log('🧹 [useUserStats] Cleaning up useEffect');
      cleanupSubscription();
      if (appStateHandler?.cleanup) {
        appStateHandler.cleanup();
      }
    };
  }, [userId]);

  // No more manual refresh needed - stats update automatically via triggers!
  // But keeping a simple refresh function for edge cases
  const refreshStats = async () => {
    if (!userId) return;
    
    console.log('🔄 [useUserStats] Manual refresh requested');
    setLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('profile_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) throw error;

      setStats({
        photosTaken: data.photos_taken || 0,
        listsCreated: data.lists_created || 0,
        uniqueIngredients: data.unique_ingredients || 0,
        likesReceived: data.likes_received || 0,
        totalItems: data.total_items || 0,
        avgRating: parseFloat(data.avg_rating) || 0
      });
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
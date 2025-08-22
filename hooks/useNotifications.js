import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { shouldRetrySubscription, isOffline, useOnlineStatus } from '../lib/onlineDetection';

// Check if app is active (same as useUserStats)
const isAppActive = () => (typeof window !== 'undefined' && window.__APP_ACTIVE__ !== false);

// Helper function to log to Android Studio with context
const logToAndroid = (message, data = null) => {
  const context = {
    isDev: window.location.hostname === 'localhost' || window.location.hostname.includes('192.168'),
    isCapacitor: !!window.Capacitor,
    timestamp: new Date().toISOString()
  };
  
  const logMessage = data ? `${message}: ${JSON.stringify(data)}` : message;
  const fullMessage = `[${context.isDev ? 'DEV' : 'PROD'}] ${logMessage}`;
  
  console.log(fullMessage);
  
  // Also try to use Capacitor's logging if available
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Console) {
    window.Capacitor.Plugins.Console.log({ message: fullMessage });
  }
};

export const useNotifications = (userId) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  
  // Online status tracking
  const { isOnline } = useOnlineStatus();
  
  // Retry logic for realtime subscriptions
  const [subscriptionRetryCount, setSubscriptionRetryCount] = useState(0);
  const [lastSubscriptionAttempt, setLastSubscriptionAttempt] = useState(0);
  const MAX_SUBSCRIPTION_RETRIES = 3;
  const SUBSCRIPTION_RETRY_DELAY = 5000; // 5 seconds
  const [ready, setReady] = useState(false);
  
  // Track timeout IDs for proper cleanup
  const activeTimeouts = useRef(new Set());
  const isUnmountedRef = useRef(false);

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

  // Achievement-related notification types that should NOT appear in the bell
  const ACHIEVEMENT_TYPES = new Set([
    'achievement',
    'achievement_awarded',
    'first_achievement',
    'first_action',
    'first_follow_achievement',
    'global_first',
    'global_first_achievement'
  ]);

  useEffect(() => {
    if (!userId) {
      logToAndroid('🔔 No userId provided to useNotifications');
      setReady(false);
      return;
    }

    logToAndroid('🔔 Setting up notifications for user:', userId);
    
    // Load initial notifications
    setReady(false);
    loadNotifications();

    let subscription;
    let appStateHandler;

    // Clean up subscription function
    const cleanupSubscription = () => {
      if (subscription) {
        logToAndroid('🔔 Cleaning up notifications subscription');
        subscription.unsubscribe();
        subscription = null;
      }
    };

    // Set up subscription only if app is active and online
    const setupSubscription = () => {
      if (!isAppActive()) {
        return; // Silent - no logging when app inactive
      }
      
      if (!isOnline) {
        return; // Silent - no logging when offline
      }
      
      // Check if we've exceeded retry limit
      if (subscriptionRetryCount >= MAX_SUBSCRIPTION_RETRIES) {
        logToAndroid(`🔔 Max subscription retries (${MAX_SUBSCRIPTION_RETRIES}) exceeded - giving up`);
        logToAndroid('🔔 Notifications will still work, but won\'t update in real-time');
        return;
      }
      
      // Implement exponential backoff
      const now = Date.now();
      const timeSinceLastAttempt = now - lastSubscriptionAttempt;
      const minDelay = SUBSCRIPTION_RETRY_DELAY * Math.pow(2, subscriptionRetryCount);
      
      if (timeSinceLastAttempt < minDelay && subscriptionRetryCount > 0) {
        logToAndroid(`🔔 Too soon to retry (${Math.round((minDelay - timeSinceLastAttempt) / 1000)}s remaining)`);
        createTrackedTimeout(setupSubscription, minDelay - timeSinceLastAttempt);
        return;
      }
      
      setLastSubscriptionAttempt(now);

      // Clean up existing subscription first
      cleanupSubscription();

      // Subscribe to new notifications (with error handling for Realtime)
      try {
        logToAndroid(`🔔 Setting up notifications subscription (attempt ${subscriptionRetryCount + 1})`);
        
        subscription = supabase
          .channel(`notifications:${userId}_${now}`) // Unique channel name to avoid conflicts
          .on('postgres_changes', {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${userId}`
          }, (payload) => {
            logToAndroid('🔔 Received new notification:', payload.new);
            
            // Reset retry count on successful message
            setSubscriptionRetryCount(0);
            
            // Ignore achievement-related notifications in the bell
            if (payload?.new?.type && ACHIEVEMENT_TYPES.has(payload.new.type)) {
              logToAndroid('🔔 Ignoring achievement-type notification for bell:', payload.new.type);
              return;
            }
            setNotifications(prev => {
              logToAndroid('🔔 Adding notification to existing:', prev.length, 'notifications');
              return [payload.new, ...prev];
            });
            setUnreadCount(prev => prev + 1);
          })
          .subscribe((status) => {
            // Only log subscription status when online to reduce noise
            if (isOnline) {
              logToAndroid('🔔 Notifications subscription status:', status);
            }
            
            if (status === 'SUBSCRIBED') {
              logToAndroid('🔔 Successfully subscribed to notifications channel');
              // Reset retry count on successful subscription
              setSubscriptionRetryCount(0);
            } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
              // Only log if we're online to reduce noise when offline
              if (isOnline) {
                logToAndroid(`🔔 Subscription failed (${status}) - will retry if under limit`);
              }
              
              // Increment retry count and attempt to reconnect
              setSubscriptionRetryCount(prev => {
                const newCount = prev + 1;
                if (shouldRetrySubscription(newCount, MAX_SUBSCRIPTION_RETRIES)) {
                  const delay = SUBSCRIPTION_RETRY_DELAY * Math.pow(2, newCount - 1);
                  if (isOnline) {
                    logToAndroid(`🔔 Scheduling retry ${newCount}/${MAX_SUBSCRIPTION_RETRIES} in ${delay/1000}s`);
                  }
                  createTrackedTimeout(setupSubscription, delay);
                } else {
                  if (isOnline) {
                    logToAndroid('🔔 Max retries exceeded - realtime updates disabled');
                    logToAndroid('🔔 Notifications will still work, but won\'t update in real-time');
                  }
                }
                return newCount;
              });
            }
          });

      } catch (error) {
        logToAndroid('🔔 Error setting up notifications subscription:', error.message);
        logToAndroid('🔔 Notifications will still work, but won\'t update in real-time');
        
        // Increment retry count on error
        setSubscriptionRetryCount(prev => {
          const newCount = prev + 1;
          if (newCount < MAX_SUBSCRIPTION_RETRIES) {
            const delay = SUBSCRIPTION_RETRY_DELAY * Math.pow(2, newCount - 1);
            logToAndroid(`🔔 Scheduling retry ${newCount}/${MAX_SUBSCRIPTION_RETRIES} in ${delay/1000}s`);
            createTrackedTimeout(setupSubscription, delay);
          }
          return newCount;
        });
      }
    };

    // Set up app state listener to handle background/foreground
    const setupAppStateListener = () => {
      appStateHandler = () => {
        if (isAppActive()) {
          logToAndroid('🔔 App became active - resetting retry count and setting up notifications subscription');
          // Reset retry count when app becomes active to give users a fresh chance
          setSubscriptionRetryCount(0);
          setupSubscription();
        } else {
          logToAndroid('🔔 App became inactive - cleaning up notifications subscription');
          cleanupSubscription();
        }
      };

      // Listen for app state changes via the global variable
      if (typeof window !== 'undefined') {
        const checkAppState = () => {
          const currentActive = isAppActive();
          const wasActive = window.__NOTIFICATIONS_LAST_ACTIVE__ !== false;
          if (currentActive !== wasActive) {
            window.__NOTIFICATIONS_LAST_ACTIVE__ = currentActive;
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
            logToAndroid('🔔 [useNotifications] App backgrounded - pausing interval');
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
      setupSubscription();
    }
    setupAppStateListener();

    return () => {
      logToAndroid('🔔 Unsubscribing from notifications');
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
      logToAndroid('🌐 [useNotifications] Device back online - setting up subscription');
    } else {
      // Clean up subscription when going offline
      logToAndroid('🌐 [useNotifications] Device offline - cleaning up subscription');
    }
  }, [isOnline, userId]);

  const loadNotifications = async () => {
    logToAndroid('🔔 Loading initial notifications for user:', userId);
    
    try {
      // First, get notifications without the join
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (notificationsError) {
        logToAndroid('🔔 Error loading notifications:', notificationsError);
        setReady(true);
        return;
      }

      logToAndroid('🔔 Raw notifications data:', notificationsData);

      if (notificationsData && notificationsData.length > 0) {
        // Filter out achievement-related types so they show only under Achievements
        const filtered = notificationsData.filter(n => !ACHIEVEMENT_TYPES.has(n?.type));
        logToAndroid('🔔 Filtered notifications count (excluding achievements):', filtered.length);

        // Get unique actor IDs
        const actorIds = [...new Set(filtered.map(n => n.actor_id))];
        logToAndroid('🔔 Actor IDs to fetch:', actorIds);

        // Fetch profiles for all actors
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', actorIds);

        if (profilesError) {
          logToAndroid('🔔 Error loading profiles:', profilesError);
          return;
        }

        logToAndroid('🔔 Profiles data:', profilesData);

        // Create a map of actor_id to profile data
        const profilesMap = {};
        profilesData?.forEach(profile => {
          profilesMap[profile.id] = profile;
        });

        // Combine notifications with profile data
        const enrichedNotifications = filtered.map(notification => ({
          ...notification,
          profiles: profilesMap[notification.actor_id] || null
        }));

        logToAndroid('🔔 Enriched notifications:', enrichedNotifications);
        
        setNotifications(enrichedNotifications);
        const unreadNotifications = enrichedNotifications.filter(n => !n.read);
        logToAndroid('🔔 Unread notifications:', unreadNotifications.length);
        setUnreadCount(unreadNotifications.length);
        setReady(true);
      } else {
        logToAndroid('🔔 No notification data returned');
        setNotifications([]);
        setUnreadCount(0);
        setReady(true);
      }
    } catch (err) {
      logToAndroid('🔔 Exception loading notifications:', JSON.stringify({
        message: err.message,
        name: err.name,
        details: err.details,
        hint: err.hint,
        code: err.code,
        fullError: err
      }, null, 2));
      setReady(true);
    }
  };

  const markAsRead = async (notificationId) => {
    logToAndroid('🔔 Marking notification as read:', notificationId);
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
    
    // Remove from list when swiped/acted on
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    logToAndroid('🔔 Marking all notifications as read');
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);

    setNotifications(prev => 
      prev.map(n => ({ ...n, read: true }))
    );
    setUnreadCount(0);
  };

  const toggleOpen = () => {
    logToAndroid('🔔 Toggling notifications dropdown:', !isOpen);
    logToAndroid('🔔 Current notifications in state:', notifications);
    logToAndroid('🔔 Current unread count:', unreadCount);
    setIsOpen(!isOpen);
  };

  return { 
    notifications, 
    unreadCount, 
    isOpen,
    toggleOpen,
    markAsRead,
    markAllAsRead,
    ready
  };
};
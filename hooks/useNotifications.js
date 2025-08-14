import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

// Helper function to log to Android Studio
const logToAndroid = (message, data = null) => {
  const logMessage = data ? `${message}: ${JSON.stringify(data)}` : message;
  console.log(logMessage);
  
  // Also try to use Capacitor's logging if available
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Console) {
    window.Capacitor.Plugins.Console.log({ message: logMessage });
  }
};

export const useNotifications = (userId) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [ready, setReady] = useState(false);

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

    // Subscribe to new notifications (with error handling for Realtime)
    let subscription;
    try {
      subscription = supabase
        .channel(`notifications:${userId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        }, (payload) => {
          logToAndroid('🔔 Received new notification:', payload.new);
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
          if (status === 'SUBSCRIBED') {
            logToAndroid('🔔 Successfully subscribed to notifications channel');
          } else if (status === 'CHANNEL_ERROR') {
            logToAndroid('🔔 Failed to subscribe to notifications - Realtime may not be enabled');
            logToAndroid('🔔 Notifications will still work, but won\'t update in real-time');
          }
        });

      logToAndroid('🔔 Attempted to subscribe to notifications channel');
    } catch (error) {
      logToAndroid('🔔 Error setting up notifications subscription:', error.message);
      logToAndroid('🔔 Notifications will still work, but won\'t update in real-time');
    }

    return () => {
      logToAndroid('🔔 Unsubscribing from notifications');
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [userId]);

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
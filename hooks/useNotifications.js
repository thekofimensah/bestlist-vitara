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

  useEffect(() => {
    if (!userId) {
      logToAndroid('🔔 No userId provided to useNotifications');
      return;
    }

    logToAndroid('🔔 Setting up notifications for user:', userId);
    
    // Load initial notifications
    loadNotifications();

    // Subscribe to new notifications
    const subscription = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        logToAndroid('🔔 Received new notification:', payload.new);
        setNotifications(prev => {
          logToAndroid('🔔 Adding notification to existing:', prev.length, 'notifications');
          return [payload.new, ...prev];
        });
        setUnreadCount(prev => prev + 1);
      })
      .subscribe();

    logToAndroid('🔔 Subscribed to notifications channel');

    return () => {
      logToAndroid('🔔 Unsubscribing from notifications');
      subscription.unsubscribe();
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
        return;
      }

      logToAndroid('🔔 Raw notifications data:', notificationsData);

      if (notificationsData && notificationsData.length > 0) {
        // Get unique actor IDs
        const actorIds = [...new Set(notificationsData.map(n => n.actor_id))];
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
        const enrichedNotifications = notificationsData.map(notification => ({
          ...notification,
          profiles: profilesMap[notification.actor_id] || null
        }));

        logToAndroid('🔔 Enriched notifications:', enrichedNotifications);
        
        setNotifications(enrichedNotifications);
        const unreadNotifications = enrichedNotifications.filter(n => !n.read);
        logToAndroid('🔔 Unread notifications:', unreadNotifications.length);
        setUnreadCount(unreadNotifications.length);
      } else {
        logToAndroid('🔔 No notification data returned');
        setNotifications([]);
        setUnreadCount(0);
      }
    } catch (err) {
      logToAndroid('🔔 Exception loading notifications:', err);
    }
  };

  const markAsRead = async (notificationId) => {
    logToAndroid('🔔 Marking notification as read:', notificationId);
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
    
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? {...n, read: true} : n)
    );
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
    markAllAsRead 
  };
};
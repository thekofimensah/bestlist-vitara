import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useOnlineStatus } from '../lib/onlineDetection';

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

export const useNotifications = (userId) => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [ready, setReady] = useState(false);
  
  const { isOnline } = useOnlineStatus();
  const subscriptionRef = useRef(null);
  const notificationCacheRef = useRef(new Map()); // For deduplication
  const lastActionRef = useRef(new Map()); // Track last actions to prevent duplicates
  
  // Simplified deduplication key generator
  const getDedupeKey = useCallback((notification) => {
    // Create unique key based on type, actor, and reference
    return `${notification.type}-${notification.actor_id}-${notification.reference_id || ''}`;
  }, []);
  
  // Check if we should show this notification (with debouncing)
  const shouldShowNotification = useCallback((notification) => {
    // Skip achievement types
    if (ACHIEVEMENT_TYPES.has(notification.type)) {
      console.log('🔔 Skipping achievement notification:', notification.type);
      return false;
    }
    
    const key = getDedupeKey(notification);
    const now = Date.now();
    const lastAction = lastActionRef.current.get(key);
    
    // Debounce: If same action within 5 seconds, skip it
    const DEBOUNCE_TIME = 5000; // 5 seconds
    if (lastAction && (now - lastAction) < DEBOUNCE_TIME) {
      console.log('🔔 Debouncing duplicate notification:', key);
      return false;
    }
    
    // Update last action time
    lastActionRef.current.set(key, now);
    
    // Clean up old entries (older than 1 minute)
    for (const [k, time] of lastActionRef.current.entries()) {
      if (now - time > 60000) {
        lastActionRef.current.delete(k);
      }
    }
    
    return true;
  }, [getDedupeKey]);
  
  // Process and deduplicate notifications
  const processNotifications = useCallback((rawNotifications) => {
    const processed = [];
    const seen = new Set();
    
    for (const notification of rawNotifications) {
      const key = getDedupeKey(notification);
      
      // Skip if we've already seen this notification in this batch
      if (seen.has(key)) continue;
      
      // Skip achievement types
      if (ACHIEVEMENT_TYPES.has(notification.type)) continue;
      
      seen.add(key);
      processed.push(notification);
    }
    
    return processed;
  }, [getDedupeKey]);

  // Load initial notifications
  const loadNotifications = useCallback(async () => {
    if (!userId) return;
    
    console.log('🔔 Loading notifications for user:', userId);
    setReady(false);
    
    try {
      // Get notifications
      const { data: notificationsData, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .not('type', 'in', `(${Array.from(ACHIEVEMENT_TYPES).join(',')})`) // Filter server-side
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('🔔 Error loading notifications:', error);
        setReady(true);
        return;
      }

      if (!notificationsData || notificationsData.length === 0) {
        setNotifications([]);
        setUnreadCount(0);
        setReady(true);
        return;
      }

      // Process and deduplicate
      const processed = processNotifications(notificationsData);
      
      // Get unique actor IDs
      const actorIds = [...new Set(processed.map(n => n.actor_id).filter(Boolean))];
      
      if (actorIds.length > 0) {
        // Fetch profiles
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', actorIds);

        // Create profiles map
        const profilesMap = {};
        profiles?.forEach(profile => {
          profilesMap[profile.id] = profile;
        });

        // Enrich notifications
        const enriched = processed.map(notification => ({
          ...notification,
          profiles: profilesMap[notification.actor_id] || null
        }));

        setNotifications(enriched);
        setUnreadCount(enriched.filter(n => !n.read).length);
      } else {
        setNotifications(processed);
        setUnreadCount(processed.filter(n => !n.read).length);
      }
      
      setReady(true);
    } catch (err) {
      console.error('🔔 Exception loading notifications:', err);
      setReady(true);
    }
  }, [userId, processNotifications]);

  // Set up realtime subscription (simplified)
  const setupSubscription = useCallback(() => {
    if (!userId || !isOnline) return;
    
    // Clean up existing subscription
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
    }
    
    console.log('🔔 Setting up notifications subscription');
    
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, async (payload) => {
        const newNotification = payload.new;
        
        // Check if we should show this notification
        if (!shouldShowNotification(newNotification)) {
          return;
        }
        
        console.log('🔔 New notification:', newNotification);
        
        // Fetch profile data for the new notification
        if (newNotification.actor_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, avatar_url')
            .eq('id', newNotification.actor_id)
            .single();
          
          newNotification.profiles = profile;
        }
        
        // Add to notifications (deduplicated)
        setNotifications(prev => {
          // Check if this exact notification already exists
          const exists = prev.some(n => 
            n.id === newNotification.id || 
            (getDedupeKey(n) === getDedupeKey(newNotification) && 
             Math.abs(new Date(n.created_at) - new Date(newNotification.created_at)) < 5000)
          );
          
          if (exists) {
            console.log('🔔 Notification already exists, skipping');
            return prev;
          }
          
          return [newNotification, ...prev];
        });
        
        if (!newNotification.read) {
          setUnreadCount(prev => prev + 1);
        }
      })
      .subscribe((status) => {
        console.log('🔔 Subscription status:', status);
      });
    
    subscriptionRef.current = channel;
  }, [userId, isOnline, shouldShowNotification, getDedupeKey]);

  // Main effect for loading and subscription
  useEffect(() => {
    if (!userId) {
      setReady(false);
      return;
    }
    
    loadNotifications();
    
    if (isOnline) {
      // Small delay to ensure initial load completes first
      const timer = setTimeout(setupSubscription, 1000);
      return () => {
        clearTimeout(timer);
        if (subscriptionRef.current) {
          subscriptionRef.current.unsubscribe();
          subscriptionRef.current = null;
        }
      };
    }
  }, [userId, isOnline, loadNotifications, setupSubscription]);

  // Mark notification as read
  const markAsRead = useCallback(async (notificationId) => {
    console.log('🔔 Marking as read:', notificationId);
    
    // Optimistic update
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    setUnreadCount(prev => Math.max(0, prev - 1));
    
    // Update in database
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(async () => {
    console.log('🔔 Marking all as read');
    
    // Optimistic update
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
    
    // Update in database
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
  }, [userId]);

  // Toggle dropdown
  const toggleOpen = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

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
import { useState, useCallback, useRef } from 'react';

const NOTIFICATION_COOLDOWN = 2000; // 2 seconds between notifications
const MODAL_PRIORITY_TYPES = ['legendary', 'global_first'];

const useAchievementNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [currentModal, setCurrentModal] = useState(null);
  
  // Track recent achievements to prevent duplicates
  const recentAchievementsRef = useRef(new Map());
  const lastNotificationTimeRef = useRef(0);

  // Generate unique key for achievement deduplication
  const getAchievementKey = useCallback((achievement) => {
    return `${achievement.id || achievement.name}-${achievement.type || 'default'}`;
  }, []);

  // Check if we've recently shown this achievement
  const isDuplicate = useCallback((achievement) => {
    const key = getAchievementKey(achievement);
    const now = Date.now();
    const lastShown = recentAchievementsRef.current.get(key);
    
    // If shown within last 30 seconds, consider it a duplicate
    if (lastShown && (now - lastShown) < 30000) {
      console.log('🏆 Duplicate achievement blocked:', key);
      return true;
    }
    
    // Clean up old entries (older than 1 minute)
    for (const [k, time] of recentAchievementsRef.current.entries()) {
      if (now - time > 60000) {
        recentAchievementsRef.current.delete(k);
      }
    }
    
    return false;
  }, [getAchievementKey]);

  // Show achievement notification
  const showAchievement = useCallback((achievementData) => {
    const { achievement, isGlobalFirst = false } = achievementData;
    
    // Check for duplicates
    if (isDuplicate(achievement)) {
      return;
    }
    
    const key = getAchievementKey(achievement);
    const now = Date.now();
    
    // Record this achievement as shown
    recentAchievementsRef.current.set(key, now);
    
    // Determine if this should be a modal
    const shouldShowModal = 
      MODAL_PRIORITY_TYPES.includes(achievement.rarity) || 
      isGlobalFirst;
    
    if (shouldShowModal) {
      // Replace any existing modal
      setCurrentModal({ 
        ...achievementData, 
        id: `modal-${now}`,
        timestamp: now 
      });
    } else {
      // Check cooldown for toast notifications
      const timeSinceLastNotification = now - lastNotificationTimeRef.current;
      
      if (timeSinceLastNotification < NOTIFICATION_COOLDOWN) {
        // Delay this notification
        setTimeout(() => {
          setNotifications(prev => [...prev, { 
            ...achievementData, 
            id: `toast-${Date.now()}`,
            timestamp: Date.now()
          }]);
        }, NOTIFICATION_COOLDOWN - timeSinceLastNotification);
      } else {
        // Show immediately
        lastNotificationTimeRef.current = now;
        setNotifications(prev => [...prev, { 
          ...achievementData, 
          id: `toast-${now}`,
          timestamp: now
        }]);
      }
    }
  }, [isDuplicate, getAchievementKey]);

  // Remove specific notification
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // Close modal
  const closeModal = useCallback(() => {
    setCurrentModal(null);
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    setCurrentModal(null);
    recentAchievementsRef.current.clear();
  }, []);

  return {
    notifications,
    currentModal,
    showAchievement,
    removeNotification,
    closeModal,
    clearAll
  };
};

export default useAchievementNotifications;
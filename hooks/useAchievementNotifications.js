import { useState, useCallback } from 'react';

const useAchievementNotifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [currentModal, setCurrentModal] = useState(null);
  const [lastNotificationTime, setLastNotificationTime] = useState(0);

  // Add achievement notification to queue
  const showAchievement = useCallback((achievementData) => {
    const { achievement, isGlobalFirst = false } = achievementData;
    
    // Determine notification type based on rarity and context
    const shouldShowModal = achievement.rarity === 'legendary' || isGlobalFirst;
    
    // Implement cooldown to prevent spam
    const now = Date.now();
    const cooldownPeriod = 2000; // 2 seconds between notifications
    
    if (now - lastNotificationTime < cooldownPeriod && !shouldShowModal) {
      // Queue for later or batch with existing
      setNotifications(prev => [...prev, { ...achievementData, id: Date.now() }]);
      return;
    }

    setLastNotificationTime(now);

    if (shouldShowModal) {
      // Show full-screen modal for legendary/global first achievements
      setCurrentModal({ ...achievementData, id: Date.now() });
    } else {
      // Show toast notification for common achievements
      setNotifications(prev => [...prev, { ...achievementData, id: Date.now() }]);
    }
  }, [lastNotificationTime]);

  // Remove toast notification
  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  // Close modal
  const closeModal = useCallback(() => {
    setCurrentModal(null);
  }, []);

  // Clear all notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
    setCurrentModal(null);
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
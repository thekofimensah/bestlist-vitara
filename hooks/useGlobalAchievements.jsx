import { createContext, useContext, useState } from 'react';

// Global context for achievement notifications
const AchievementContext = createContext();

export const useGlobalAchievements = () => {
  const context = useContext(AchievementContext);
  if (!context) {
    // Return a fallback implementation instead of throwing
    return {
      notifications: [],
      currentModal: null,
      showAchievement: () => {}, // No-op function
      removeNotification: () => {},
      closeModal: () => {},
      clearAll: () => {}
    };
  }
  return context;
};

export const AchievementProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [currentModal, setCurrentModal] = useState(null);
  const [lastNotificationTime, setLastNotificationTime] = useState(0);

  // Add achievement notification to queue
  const showAchievement = (achievementData) => {
    console.log('🏆 [Achievement] showAchievement called with:', achievementData);
    
    const { achievement, isGlobalFirst = false } = achievementData;
    
    // Determine notification type based on rarity and context
    const shouldShowModal = achievement.rarity === 'legendary' || isGlobalFirst;
    
    // Implement cooldown to prevent spam
    const now = Date.now();
    const cooldownPeriod = 2000; // 2 seconds between notifications
    
    if (now - lastNotificationTime < cooldownPeriod && !shouldShowModal) {
      // Queue for later or batch with existing
      setNotifications(prev => [...prev, { ...achievementData, id: Date.now() }]);
      console.log('🏆 [Achievement] Queued notification due to cooldown');
      return;
    }

    setLastNotificationTime(now);

    if (shouldShowModal) {
      // Show full-screen modal for legendary/global first achievements
      setCurrentModal({ ...achievementData, id: Date.now() });
      console.log('🏆 [Achievement] Showing modal for:', achievement.name);
    } else {
      // Show toast notification for common achievements
      setNotifications(prev => [...prev, { ...achievementData, id: Date.now() }]);
      console.log('🏆 [Achievement] Showing toast for:', achievement.name);
    }
  };

  // Remove toast notification
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  // Close modal
  const closeModal = () => {
    setCurrentModal(null);
  };

  // Clear all notifications
  const clearAll = () => {
    setNotifications([]);
    setCurrentModal(null);
  };

  const value = {
    notifications,
    currentModal,
    showAchievement,
    removeNotification,
    closeModal,
    clearAll
  };

  return (
    <AchievementContext.Provider value={value}>
      {children}
    </AchievementContext.Provider>
  );
};
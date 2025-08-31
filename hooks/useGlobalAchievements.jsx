import React, { createContext, useContext, useState } from 'react';

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
    
    const { achievement, isGlobalFirst = false } = achievementData;
    
    // Determine notification type based on rarity and context
    // Note: Global first achievements now use the perimeter glow system in AddItemModal instead of modal
    const shouldShowModal = achievement.rarity === 'legendary' && !isGlobalFirst;
    
    // Implement cooldown to prevent spam
    const now = Date.now();
    const cooldownPeriod = 2000; // 2 seconds between notifications
    
    if (now - lastNotificationTime < cooldownPeriod && !shouldShowModal) {
      // Queue for later or batch with existing
      setNotifications(prev => [...prev, { ...achievementData, id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, createdAt: now }]);
      console.log('🏆 [Achievement] Queued notification due to cooldown');
      return;
    }

    setLastNotificationTime(now);

    if (shouldShowModal) {
      // Show full-screen modal for legendary (non-global-first) achievements
      setCurrentModal({ ...achievementData, id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, createdAt: now });
    } else {
      // Show toast notification for common achievements and global first achievements
      // (Global first achievements also get the glow effect in AddItemModal)
      setNotifications(prev => [...prev, { ...achievementData, id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, createdAt: now }]);
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

  // Expose test function globally for debugging
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      window.testAchievement = () => {
        showAchievement({
          achievement: {
            id: 'test-achievement',
            name: 'Test Achievement',
            description: 'This is a test achievement',
            icon: '🏆',
            rarity: 'common'
          },
          isGlobalFirst: false
        });
      };
      
      window.testFirstInWorldAchievement = () => {
        showAchievement({
          achievement: {
            id: 'test-first-world',
            name: 'First in World',
            description: 'You are the first to discover this!',
            icon: '🌍',
            rarity: 'legendary'
          },
          isGlobalFirst: true
        });
      };
    }
  }, [showAchievement]);

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
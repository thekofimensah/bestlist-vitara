import React from 'react';
import AchievementToast from './AchievementToast';
import AchievementModal from './AchievementModal';
import { useGlobalAchievements } from '../../hooks/useGlobalAchievements.jsx';

const AchievementSystem = () => {
  const { 
    notifications, 
    currentModal, 
    removeNotification, 
    closeModal 
  } = useGlobalAchievements();

  return (
    <>
      {/* Toast Notifications */}
      {notifications.map((notification, index) => (
        <AchievementToast
          key={notification.id}
          achievement={notification.achievement}
          onClose={() => removeNotification(notification.id)}
          isVisible={true}
          style={{ top: `${4 + index * 6}rem` }} // Stack multiple toasts
        />
      ))}

      {/* Modal for Legendary Achievements */}
      {currentModal && (
        <AchievementModal
          achievement={currentModal.achievement}
          onClose={closeModal}
          isVisible={true}
          isGlobalFirst={currentModal.isGlobalFirst}
        />
      )}
    </>
  );
};

export default AchievementSystem;
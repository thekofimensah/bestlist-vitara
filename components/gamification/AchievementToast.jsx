import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Sparkles } from 'lucide-react';
import ModalPortal from '../ui/ModalPortal';

const AchievementToast = ({ achievement, onClose, isVisible = true }) => {
  useEffect(() => {
    if (isVisible) {
      // Auto-close after 3 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 3000);

      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate([50]);
      }

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!achievement) return null;

  const getRarityStyles = (rarity) => {
    switch (rarity) {
      case 'legendary':
        return {
          accent: '#8B5CF6', // Purple
          bg: 'bg-gradient-to-br from-purple-50 to-pink-50',
          iconBg: 'bg-gradient-to-br from-purple-500 to-pink-500',
          border: 'border-purple-200'
        };
      case 'rare':
        return {
          accent: '#3B82F6', // Blue
          bg: 'bg-gradient-to-br from-blue-50 to-cyan-50',
          iconBg: 'bg-gradient-to-br from-blue-500 to-cyan-500',
          border: 'border-blue-200'
        };
      default:
        return {
          accent: '#10B981', // Emerald
          bg: 'bg-gradient-to-br from-emerald-50 to-green-50',
          iconBg: 'bg-gradient-to-br from-emerald-500 to-green-500',
          border: 'border-emerald-200'
        };
    }
  };

  const styles = getRarityStyles(achievement.rarity);


  return (
    // CRITICAL: Must pass isOpen prop to ModalPortal for toast to render in DOM
    <ModalPortal type="toast" isOpen={isVisible}>
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-4 left-4 right-4 z-toast pointer-events-none"
          style={{ 
            paddingTop: 'env(safe-area-inset-top)'
          }}
        >
          <div
            className={`relative ${styles.bg} ${styles.border} border rounded-xl shadow-lg overflow-hidden backdrop-blur-sm`}
            style={{
              boxShadow: `0 8px 25px -8px ${styles.accent}40, 0 4px 12px -4px ${styles.accent}20`
            }}
          >
            {/* Content */}
            <div className="flex items-center gap-3 p-4">
              {/* Icon Container */}
              <div className={`relative flex-shrink-0 w-12 h-12 ${styles.iconBg} rounded-xl flex items-center justify-center shadow-sm`}>
                <div className="text-xl text-white" style={{ lineHeight: '1', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                  {achievement.icon || '🏆'}
                </div>
                
                {/* Legendary sparkle effect */}
                {achievement.rarity === 'legendary' && (
                  <motion.div
                    animate={{ 
                      rotate: 360,
                      scale: [1, 1.1, 1]
                    }}
                    transition={{ 
                      rotate: { duration: 3, repeat: Infinity, ease: 'linear' },
                      scale: { duration: 2, repeat: Infinity }
                    }}
                    className="absolute -top-1 -right-1"
                  >
                    <div className="w-5 h-5 bg-yellow-400 rounded-full flex items-center justify-center">
                      <Sparkles className="w-3 h-3 text-yellow-100" />
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Achievement Details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 text-sm leading-tight">
                    {achievement.name}
                  </h3>
                  {achievement.rarity === 'legendary' && (
                    <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                  )}
                </div>
                
                {achievement.reward_points > 0 && (
                  <p className="text-xs text-gray-600 font-medium">
                    +{achievement.reward_points} points earned
                  </p>
                )}
              </div>

              {/* Achievement Trophy Icon */}
              <div className="flex-shrink-0">
                <Trophy className="w-5 h-5 text-gray-400" />
              </div>
            </div>

            {/* Progress Bar */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 3, ease: 'linear' }}
              className="absolute bottom-0 left-0 right-0 h-1 rounded-b-xl"
              style={{ 
                background: `linear-gradient(90deg, ${styles.accent}, ${styles.accent}80)`,
                transformOrigin: 'left'
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </ModalPortal>
  );
};

export default AchievementToast;
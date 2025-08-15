import React, { useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Trophy, Star, Sparkles } from 'lucide-react';

const AchievementToast = ({ achievement, onClose, isVisible = true }) => {
  useEffect(() => {
    if (isVisible) {
      // Auto-close after 2.5 seconds (quick dopamine hit)
      const timer = setTimeout(() => {
        onClose();
      }, 2500);

      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
      }

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!achievement) return null;

  const getRarityStyles = (rarity) => {
    switch (rarity) {
      case 'legendary':
        return {
          bg: 'bg-gradient-to-r from-purple-500 to-pink-500',
          text: 'text-white',
          border: 'border-purple-300',
          glow: 'shadow-lg shadow-purple-500/30'
        };
      case 'rare':
        return {
          bg: 'bg-gradient-to-r from-blue-500 to-cyan-500',
          text: 'text-white',
          border: 'border-blue-300',
          glow: 'shadow-lg shadow-blue-500/30'
        };
      default:
        return {
          bg: 'bg-gradient-to-r from-teal-500 to-green-500',
          text: 'text-white',
          border: 'border-teal-300',
          glow: 'shadow-lg shadow-teal-500/30'
        };
    }
  };

  const styles = getRarityStyles(achievement.rarity);

  const controls = useAnimation();

  const handleDragEnd = async (_, info) => {
    const distance = info.offset.x;
    const velocity = info.velocity.x || 0;
    const threshold = 110;
    const fast = Math.abs(velocity) > 480;
    if (Math.abs(distance) > threshold || fast) {
      const direction = distance >= 0 ? 1 : -1;
      await controls.start({
        x: direction * ((typeof window !== 'undefined' ? window.innerWidth : 600) + 260),
        opacity: 0,
        rotate: direction * 4,
        transition: { type: 'spring', stiffness: 700, damping: 32 }
      });
      setTimeout(() => onClose(), 100);
    } else {
      controls.start({ x: 0, opacity: 1, transition: { type: 'spring', stiffness: 600, damping: 35, bounce: 0.35 } });
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -100, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 280, damping: 28, duration: 0.45 }}
          className="fixed top-4 left-4 right-4 z-50"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          {/* Animated glowing edge BORDER that moves with the card */}
          <motion.div
            animate={controls}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            dragMomentum={true}
            whileTap={{ scale: 0.98 }}
            onDragEnd={handleDragEnd}
            className="p-[2px] rounded-2xl cursor-pointer"
            style={{
              background: 'linear-gradient(90deg, #14b8a6, #60a5fa, #a78bfa, #14b8a6)',
              filter: 'drop-shadow(0 8px 20px rgba(20,184,166,0.25))',
            }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          >
            <motion.div className={`bg-white rounded-2xl p-4 ${styles.text}`}>
              <div className="flex items-start gap-3">
                {/* Achievement Icon */}
                <div className="relative flex-shrink-0">
                  <div className="text-3xl leading-none">
                    {achievement.icon || '🏆'}
                  </div>
                  {achievement.rarity === 'legendary' && (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                      className="absolute -top-1 -right-1"
                    >
                      <Sparkles className="w-4 h-4 text-yellow-400" />
                    </motion.div>
                  )}
                </div>

                {/* Achievement Details */}
                <div className="flex-1 min-w-0 flex flex-col">
                  <h3 className="font-bold text-base leading-snug text-gray-900 mb-1">
                    🏆 {achievement.name}
                  </h3>
                  {achievement.reward_points > 0 && (
                    <div className="text-xs text-gray-600 font-medium">
                      +{achievement.reward_points} points
                    </div>
                  )}
                </div>

                {/* Sparkle for legendary only */}
                {achievement.rarity === 'legendary' && (
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="flex-shrink-0"
                  >
                    <Star className="w-5 h-5 text-yellow-400" />
                  </motion.div>
                )}
              </div>

              {/* Progress Bar Animation with side offsets to respect rounded edges */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 2.5, ease: 'linear' }}
                className="absolute bottom-1 h-1 bg-gradient-to-r from-teal-500 via-blue-400 to-purple-400 rounded-full"
                style={{ left: 8, right: 8, transformOrigin: 'left' }}
              />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AchievementToast;
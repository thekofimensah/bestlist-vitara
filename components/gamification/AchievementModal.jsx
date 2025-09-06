import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Sparkles, X } from 'lucide-react';

const AchievementModal = ({ achievement, onClose, isVisible = true, isGlobalFirst = false }) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowConfetti(true);
      
      // Haptic feedback pattern for major achievements
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 300]);
      }

      // Auto-close after 6 seconds for modal
      const timer = setTimeout(() => {
        onClose();
      }, 6000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  if (!achievement) return null;

  const isLegendary = achievement.rarity === 'legendary' || isGlobalFirst;

  return (
    <AnimatePresence>
      {isVisible && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0, opacity: 0, rotateY: 180 }}
            animate={{ scale: 1, opacity: 1, rotateY: 0 }}
            exit={{ scale: 0, opacity: 0, rotateY: -180 }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 20,
              duration: 0.8 
            }}
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
          >
            <div className={`
              relative max-w-sm w-full mx-4
              ${isLegendary 
                ? 'bg-gradient-to-br from-purple-600 via-pink-600 to-red-600' 
                : 'bg-gradient-to-br from-teal-600 via-blue-600 to-indigo-600'
              }
              rounded-3xl p-8 text-white text-center
              shadow-2xl border-4 border-white/20
            `}>
              
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Confetti Effect */}
              {showConfetti && isLegendary && (
                <div className="absolute inset-0 pointer-events-none">
                  {[...Array(20)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ 
                        x: '50%', 
                        y: '50%', 
                        scale: 0,
                        rotate: 0
                      }}
                      animate={{ 
                        x: `${Math.random() * 100}%`, 
                        y: `${Math.random() * 100}%`, 
                        scale: [0, 1, 0],
                        rotate: 360
                      }}
                      transition={{ 
                        duration: 2,
                        delay: i * 0.1,
                        ease: "easeOut"
                      }}
                      className="absolute w-2 h-2 bg-yellow-300 rounded-full"
                    />
                  ))}
                </div>
              )}

              {/* Header */}
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="mb-6"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Trophy className="w-6 h-6 text-yellow-300" />
                  <span className="text-lg font-bold text-yellow-300">
                    {isGlobalFirst ? 'WORLD FIRST!' : 'ACHIEVEMENT UNLOCKED!'}
                  </span>
                  <Trophy className="w-6 h-6 text-yellow-300" />
                </div>
                
                {isLegendary && (
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="text-yellow-300 text-sm font-medium"
                  >
                    ✨ LEGENDARY ACHIEVEMENT ✨
                  </motion.div>
                )}
              </motion.div>

              {/* Achievement Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ 
                  delay: 0.5,
                  type: "spring",
                  stiffness: 200,
                  damping: 15
                }}
                className="relative mb-6"
              >
                <div className="text-8xl mb-4">
                  {achievement.icon || '🏆'}
                </div>
                
                {isLegendary && (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-2 -right-2"
                  >
                    <Sparkles className="w-8 h-8 text-yellow-300" />
                  </motion.div>
                )}
              </motion.div>

              {/* Achievement Details */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="mb-6"
              >
                <h2 className="text-2xl font-bold mb-2">
                  {achievement.name}
                </h2>
                <p className="text-white/90 text-base mb-4">
                  {achievement.description}
                </p>
                
                {achievement.reward_points > 0 && (
                  <div className="bg-white/20 rounded-full px-4 py-2 inline-block">
                    <span className="font-bold text-yellow-300">
                      +{achievement.reward_points} points
                    </span>
                  </div>
                )}
              </motion.div>

              {/* Special Global First Message */}
              {isGlobalFirst && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1 }}
                  className="bg-yellow-500/20 border border-yellow-400/50 rounded-xl p-3 mb-4"
                >
                  <Star className="w-5 h-5 text-yellow-300 mx-auto mb-1" />
                  <p className="text-sm text-yellow-100">
                    You're the first person to discover this! Your name will be remembered forever.
                  </p>
                </motion.div>
              )}

              {/* Action Button */}
              <motion.button
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.9 }}
                onClick={onClose}
                className="w-full bg-white/20 hover:bg-white/30 transition-colors rounded-2xl py-3 px-6 font-semibold border border-white/30"
              >
                Awesome! 🎉
              </motion.button>

              {/* Progress Bar */}
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 6, ease: "linear" }}
                className="absolute bottom-0 left-0 h-1 bg-white/30 rounded-b-3xl"
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default AchievementModal;
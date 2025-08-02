import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Sparkles } from 'lucide-react';

const AchievementToast = ({ achievement, onClose, isVisible = true }) => {
  useEffect(() => {
    if (isVisible) {
      // Auto-close after 4 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 4000);

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

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: -100, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -100, opacity: 0, scale: 0.9 }}
          transition={{ 
            type: "spring", 
            stiffness: 300, 
            damping: 30,
            duration: 0.5 
          }}
          className={`
            fixed top-16 left-4 right-4 z-50 
            ${styles.bg} ${styles.text} ${styles.glow}
            rounded-2xl p-4 border-2 ${styles.border}
            backdrop-blur-sm
          `}
          onClick={onClose}
        >
          <div className="flex items-center gap-3">
            {/* Achievement Icon */}
            <div className="relative">
              <div className="text-3xl">
                {achievement.icon || '🏆'}
              </div>
              {achievement.rarity === 'legendary' && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute -top-1 -right-1"
                >
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                </motion.div>
              )}
            </div>

            {/* Achievement Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Trophy className="w-4 h-4" />
                <span className="text-sm font-medium opacity-90">
                  Achievement Unlocked!
                </span>
                {achievement.rarity === 'legendary' && (
                  <Star className="w-4 h-4 text-yellow-300" />
                )}
              </div>
              <h3 className="font-bold text-lg leading-tight">
                {achievement.name}
              </h3>
              <p className="text-sm opacity-90 leading-tight">
                {achievement.description}
              </p>
              {achievement.reward_points > 0 && (
                <div className="text-xs mt-1 opacity-75">
                  +{achievement.reward_points} points
                </div>
              )}
            </div>

            {/* Rarity Badge */}
            <div className="text-right">
              <div className="text-xs font-medium opacity-75 uppercase tracking-wider">
                {achievement.rarity}
              </div>
              {achievement.rarity === 'legendary' && (
                <motion.div
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="text-yellow-300 text-xs mt-1"
                >
                  ✨ LEGENDARY ✨
                </motion.div>
              )}
            </div>
          </div>

          {/* Progress Bar Animation */}
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: "100%" }}
            transition={{ duration: 4, ease: "linear" }}
            className="absolute bottom-0 left-0 h-1 bg-white/30 rounded-b-2xl"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AchievementToast;
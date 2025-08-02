import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Star, Globe } from 'lucide-react';

const FirstInWorldBanner = ({ isVisible = false, productName = "this item", onComplete }) => {
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShowConfetti(true);
      
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate([200, 100, 200, 100, 300]);
      }

      // Auto-complete after 4 seconds
      const timer = setTimeout(() => {
        onComplete && onComplete();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute top-4 left-4 right-4 z-50"
        >
          <div className="relative bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 rounded-2xl p-6 text-white shadow-2xl border-4 border-white/20">
            
            {/* Confetti Effect */}
            {showConfetti && (
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                {[...Array(30)].map((_, i) => (
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
                      scale: [0, 1, 0.5, 0],
                      rotate: [0, 180, 360]
                    }}
                    transition={{ 
                      duration: 3,
                      delay: i * 0.1,
                      ease: "easeOut"
                    }}
                    className={`absolute w-2 h-2 rounded-full ${
                      i % 4 === 0 ? 'bg-yellow-300' :
                      i % 4 === 1 ? 'bg-pink-300' :
                      i % 4 === 2 ? 'bg-blue-300' : 'bg-green-300'
                    }`}
                  />
                ))}
              </div>
            )}

            {/* Sparkle animations */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(6)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    scale: [1, 1.5, 1],
                    rotate: [0, 180, 360],
                    opacity: [0.7, 1, 0.7]
                  }}
                  transition={{ 
                    duration: 2,
                    delay: i * 0.3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className={`absolute ${
                    i === 0 ? 'top-2 left-4' :
                    i === 1 ? 'top-2 right-4' :
                    i === 2 ? 'top-1/2 left-2' :
                    i === 3 ? 'top-1/2 right-2' :
                    i === 4 ? 'bottom-2 left-4' : 'bottom-2 right-4'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-yellow-300" />
                </motion.div>
              ))}
            </div>

            {/* Content */}
            <div className="relative z-10 text-center">
              {/* Icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="mb-4"
              >
                <div className="w-16 h-16 mx-auto bg-white/20 rounded-full flex items-center justify-center relative">
                  <Globe className="w-8 h-8 text-yellow-300" />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute -top-2 -right-2"
                  >
                    <Star className="w-6 h-6 text-yellow-300" fill="currentColor" />
                  </motion.div>
                </div>
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="mb-2"
              >
                <h2 className="text-2xl font-bold text-yellow-300 mb-1">
                  🌍 WORLD FIRST! 🌍
                </h2>
                <p className="text-lg font-semibold">
                  You're the first person to photograph
                </p>
                <p className="text-xl font-bold text-yellow-200">
                  "{productName}"
                </p>
              </motion.div>

              {/* Subtitle */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-white/90 text-sm"
              >
                Your discovery will be remembered forever! 🏆
              </motion.div>

              {/* Pulsing border effect */}
              <motion.div
                animate={{ 
                  scale: [1, 1.02, 1],
                  opacity: [0.5, 0.8, 0.5]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="absolute inset-0 border-4 border-yellow-300/50 rounded-2xl"
              />
            </div>

            {/* Progress bar */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              transition={{ duration: 4, ease: "linear" }}
              className="absolute bottom-0 left-0 h-1 bg-yellow-300/60 rounded-b-2xl"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FirstInWorldBanner;
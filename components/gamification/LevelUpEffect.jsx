import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LevelUpEffect = ({ isActive, onComplete }) => {
  return (
    <AnimatePresence>
      {isActive && (
        <>
          {/* Nuke explosion flash */}
          <motion.div
            initial={{ opacity: 0, scale: 0, y: 0 }}
            animate={{ 
              opacity: [0, 0.3, 1, 0.8, 0.4, 0], 
              scale: [0, 2, 8, 12, 18, 25],
              y: [0, -50, -150, -300, -500, -800]
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 1,
              times: [0, 0.1, 0.3, 0.6, 0.8, 1]
            }}
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none w-4 h-4 bg-white rounded-full"
            style={{
              boxShadow: '0 0 100px 50px rgba(255,255,255,0.9), 0 0 200px 100px rgba(255,255,255,0.6)'
            }}
          />

          {/* Achievement text */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="fixed top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-60 pointer-events-none text-center"
            onAnimationComplete={onComplete}
          >
            <div 
              className="text-4xl font-bold text-white mb-2"
              style={{ textShadow: '0 0 20px rgba(147,197,253,1), 2px 2px 4px rgba(0,0,0,0.8)' }}
            >
              🌍 FIRST IN WORLD!
            </div>
            
            <div 
              className="text-lg font-semibold text-white"
              style={{ textShadow: '0 0 10px rgba(196,181,253,0.9), 1px 1px 2px rgba(0,0,0,0.8)' }}
            >
              Achievement Unlocked
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default LevelUpEffect;
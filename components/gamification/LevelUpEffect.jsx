import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LevelUpEffect = ({ isActive, onComplete }) => {
  return (
    <AnimatePresence>
      {isActive && (
        <>
          {/* Initial dark overlay with burst - creates dramatic contrast on white */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.85, 0] }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 0.4,
              times: [0, 0.3, 1],
              ease: [0.4, 0, 0.2, 1]
            }}
            className="fixed inset-0 z-50 pointer-events-none"
            style={{
              background: 'radial-gradient(circle at center, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.8) 60%, rgba(0,0,0,0.95) 100%)'
            }}
          />

          {/* Dramatic golden energy wave - high contrast against white */}
          <motion.div
            initial={{ 
              y: '100vh',
              scaleY: 0.1,
              opacity: 0
            }}
            animate={{ 
              y: '-100vh',
              scaleY: [0.1, 3, 0.1],
              opacity: [0, 1, 1, 0]
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 1.3,
              times: [0, 0.25, 0.75, 1],
              ease: [0.25, 0.46, 0.45, 0.94],
              delay: 0.1
            }}
            className="fixed left-0 right-0 z-45 pointer-events-none origin-center"
            style={{
              height: '16px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(234,179,8,0.6) 5%, rgba(253,224,71,0.9) 20%, rgba(255,255,255,1) 35%, rgba(255,215,0,1) 50%, rgba(255,255,255,1) 65%, rgba(253,224,71,0.9) 80%, rgba(234,179,8,0.6) 95%, transparent 100%)',
              boxShadow: '0 0 40px rgba(255,215,0,1), 0 0 80px rgba(253,224,71,0.8), 0 0 120px rgba(234,179,8,0.6), inset 0 0 20px rgba(255,255,255,0.5)'
            }}
          />

          {/* Electric purple secondary wave */}
          <motion.div
            initial={{ 
              y: '100vh',
              scaleY: 0.1,
              opacity: 0
            }}
            animate={{ 
              y: '-100vh',
              scaleY: [0.1, 2.5, 0.1],
              opacity: [0, 0.9, 0.9, 0]
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 1.3,
              times: [0, 0.25, 0.75, 1],
              ease: [0.25, 0.46, 0.45, 0.94],
              delay: 0.2
            }}
            className="fixed left-0 right-0 z-40 pointer-events-none origin-center"
            style={{
              height: '12px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(147,51,234,0.4) 10%, rgba(168,85,247,0.8) 25%, rgba(196,181,253,0.95) 40%, rgba(255,255,255,1) 50%, rgba(196,181,253,0.95) 60%, rgba(168,85,247,0.8) 75%, rgba(147,51,234,0.4) 90%, transparent 100%)',
              boxShadow: '0 0 30px rgba(168,85,247,0.9), 0 0 60px rgba(147,51,234,0.7), inset 0 0 15px rgba(255,255,255,0.4)'
            }}
          />

          {/* Crimson accent trail */}
          <motion.div
            initial={{ 
              y: '100vh',
              scaleY: 0.1,
              opacity: 0
            }}
            animate={{ 
              y: '-100vh',
              scaleY: [0.1, 2, 0.1],
              opacity: [0, 0.8, 0.8, 0]
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 1.3,
              times: [0, 0.25, 0.75, 1],
              ease: [0.25, 0.46, 0.45, 0.94],
              delay: 0.3
            }}
            className="fixed left-0 right-0 z-35 pointer-events-none origin-center"
            style={{
              height: '8px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(220,38,127,0.3) 15%, rgba(236,72,153,0.7) 30%, rgba(251,207,232,0.9) 45%, rgba(255,255,255,1) 50%, rgba(251,207,232,0.9) 55%, rgba(236,72,153,0.7) 70%, rgba(220,38,127,0.3) 85%, transparent 100%)',
              boxShadow: '0 0 25px rgba(236,72,153,0.8), 0 0 50px rgba(220,38,127,0.6)'
            }}
          />

          {/* Explosive particle burst with varied colors - reduced count for performance */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i / 12) * 360 + Math.random() * 20;
            const radius = 80 + Math.random() * 300;
            const x = Math.cos((angle * Math.PI) / 180) * radius;
            const y = Math.sin((angle * Math.PI) / 180) * radius;
            
            const colors = [
              'radial-gradient(circle, rgba(255,215,0,1) 0%, rgba(234,179,8,0.8) 40%, transparent 70%)',
              'radial-gradient(circle, rgba(168,85,247,1) 0%, rgba(147,51,234,0.8) 40%, transparent 70%)',
              'radial-gradient(circle, rgba(236,72,153,1) 0%, rgba(220,38,127,0.8) 40%, transparent 70%)',
              'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(253,224,71,0.9) 30%, transparent 60%)'
            ];
            
            return (
              <motion.div
                key={`particle-${i}`}
                initial={{ 
                  opacity: 0,
                  scale: 0,
                  x: 0,
                  y: 0
                }}
                animate={{ 
                  opacity: [0, 1, 1, 0],
                  scale: [0, 2, 1, 0],
                  x: [0, x, x * 1.8],
                  y: [0, y, y * 1.8]
                }}
                exit={{ opacity: 0 }}
                transition={{ 
                  duration: 2.2,
                  delay: 0.35 + (i * 0.015),
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
                className="fixed top-1/2 left-1/2 z-30 pointer-events-none"
                style={{
                  width: '8px',
                  height: '8px',
                  background: colors[i % colors.length],
                  borderRadius: '50%',
                  boxShadow: '0 0 15px rgba(255,255,255,0.9)'
                }}
              />
            );
          })}

          {/* Sparkling stars effect - reduced count for performance */}
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={`star-${i}`}
              initial={{ 
                opacity: 0,
                scale: 0,
                rotate: 0,
                x: `${5 + i * 6}vw`,
                y: `${20 + Math.random() * 60}vh`
              }}
              animate={{ 
                opacity: [0, 1, 1, 0],
                scale: [0, 1.5, 1, 0],
                rotate: [0, 180, 360],
                y: [`${20 + Math.random() * 60}vh`, `${Math.random() * 30}vh`]
              }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 2.8,
                delay: 0.6 + i * 0.1,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
              className="fixed z-25 pointer-events-none"
              style={{
                fontSize: '12px',
                filter: 'drop-shadow(0 0 6px rgba(255,215,0,0.8))'
              }}
            >
              ⭐
            </motion.div>
          ))}

          {/* Achievement text with dark background for contrast */}
          <motion.div
            initial={{ 
              opacity: 0,
              scale: 0.4,
              y: 40,
              rotateX: -20
            }}
            animate={{ 
              opacity: [0, 0, 1, 1, 0],
              scale: [0.4, 0.4, 1.1, 1, 0.95],
              y: [40, 40, -5, 0, -10],
              rotateX: [-20, -20, 5, 0, 0]
            }}
            exit={{ 
              opacity: 0,
              scale: 0.9,
              y: -20
            }}
            transition={{
              duration: 2.2,
              times: [0, 0.25, 0.45, 0.75, 1],
              ease: [0.25, 0.46, 0.45, 0.94],
              delay: 0.7
            }}
            className="fixed top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-60 pointer-events-none"
            onAnimationComplete={onComplete}
          >
            <div className="relative">
              {/* Dark semi-transparent background for text readability */}
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.4, 1], opacity: [0, 0.9, 0.8] }}
                transition={{ 
                  duration: 1,
                  delay: 1,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
                className="absolute inset-0 -m-8 rounded-3xl"
                style={{
                  background: 'radial-gradient(ellipse, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.3) 100%)',
                  backdropFilter: 'blur(10px)'
                }}
              />
              
              {/* Glowing aura behind text */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 2, 1.2] }}
                transition={{ 
                  duration: 1.2, 
                  delay: 1.1,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
                className="absolute inset-0 -m-6 rounded-2xl"
                style={{
                  background: 'radial-gradient(ellipse, rgba(255,215,0,0.4) 0%, rgba(168,85,247,0.3) 50%, transparent 80%)',
                  filter: 'blur(25px)'
                }}
              />
              
              <div className="text-center relative z-10">
                <motion.div 
                  initial={{ y: 12, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 1.1, duration: 0.6 }}
                  className="text-4xl font-black relative z-10"
                  style={{
                    background: 'linear-gradient(135deg, #FFD700 0%, #FFA500 25%, #FF69B4 50%, #8A2BE2 75%, #FFD700 100%)',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    color: 'transparent',
                    textShadow: '0 0 40px rgba(255,215,0,0.8), 0 0 80px rgba(255,105,180,0.6), 0 0 120px rgba(138,43,226,0.4)',
                    filter: 'drop-shadow(0 0 10px rgba(255,255,255,0.9)) drop-shadow(2px 2px 4px rgba(0,0,0,0.8))',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    fontWeight: '900',
                    letterSpacing: '0.02em'
                  }}
                >
                  🌍 FIRST IN WORLD!
                </motion.div>
                
                <motion.div 
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 1.25, duration: 0.6 }}
                  className="text-lg font-bold text-white mt-3 relative z-10"
                  style={{
                    textShadow: '0 0 30px rgba(255,215,0,0.9), 0 0 60px rgba(168,85,247,0.7), 0 0 90px rgba(236,72,153,0.5), 2px 2px 6px rgba(0,0,0,0.9)',
                    letterSpacing: '0.1em',
                    fontWeight: '700'
                  }}
                >
                  ACHIEVEMENT UNLOCKED
                </motion.div>
                
                {/* Animated gradient underline */}
                <motion.div
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: '100%', opacity: [0, 1, 0.8] }}
                  transition={{ delay: 1.5, duration: 1 }}
                  className="h-0.5 mt-3 mx-auto rounded-full"
                  style={{
                    maxWidth: '220px',
                    background: 'linear-gradient(90deg, transparent 0%, #FFD700 20%, #FF69B4 40%, #8A2BE2 60%, #FFD700 80%, transparent 100%)',
                    boxShadow: '0 0 15px rgba(255,215,0,0.8), 0 0 30px rgba(255,105,180,0.6)'
                  }}
                />
              </div>
            </div>
          </motion.div>

          {/* Dramatic vignette effect */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.6, 0.3, 0] }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 4,
              times: [0, 0.3, 0.7, 1],
              delay: 0.2
            }}
            className="fixed inset-0 z-15 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.4) 80%, rgba(0,0,0,0.7) 100%)'
            }}
          />
        </>
      )}
    </AnimatePresence>
  );
};

export default LevelUpEffect;
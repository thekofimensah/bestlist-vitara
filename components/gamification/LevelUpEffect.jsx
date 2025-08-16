import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const LevelUpEffect = ({ isActive, onComplete }) => {
  return (
    <AnimatePresence>
      {isActive && (
        <>
          {/* Initial bright flash - happens first and fast */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 0.3,
              times: [0, 0.3, 1],
              ease: [0.4, 0, 0.2, 1]
            }}
            className="fixed inset-0 z-50 pointer-events-none bg-white"
          />

          {/* Main energy wave - comes right after flash */}
          <motion.div
            initial={{ 
              y: '100vh',
              scaleY: 0.1,
              opacity: 0
            }}
            animate={{ 
              y: '-100vh',
              scaleY: [0.1, 2, 0.1],
              opacity: [0, 1, 1, 0]
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 1.2,
              times: [0, 0.3, 0.7, 1],
              ease: [0.25, 0.46, 0.45, 0.94],
              delay: 0.15
            }}
            className="fixed left-0 right-0 z-40 pointer-events-none origin-center"
            style={{
              height: '12px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.4) 10%, rgba(147,197,253,0.9) 30%, rgba(255,255,255,1) 50%, rgba(147,197,253,0.9) 70%, rgba(59,130,246,0.4) 90%, transparent 100%)',
              boxShadow: '0 0 30px rgba(147,197,253,0.8), 0 0 60px rgba(59,130,246,0.6), 0 0 100px rgba(255,255,255,0.4)'
            }}
          />

          {/* Secondary energy trail */}
          <motion.div
            initial={{ 
              y: '100vh',
              scaleY: 0.1,
              opacity: 0
            }}
            animate={{ 
              y: '-100vh',
              scaleY: [0.1, 1.5, 0.1],
              opacity: [0, 0.8, 0.8, 0]
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 1.2,
              times: [0, 0.3, 0.7, 1],
              ease: [0.25, 0.46, 0.45, 0.94],
              delay: 0.25
            }}
            className="fixed left-0 right-0 z-35 pointer-events-none origin-center"
            style={{
              height: '8px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(168,85,247,0.3) 15%, rgba(196,181,253,0.8) 35%, rgba(255,255,255,0.9) 50%, rgba(196,181,253,0.8) 65%, rgba(168,85,247,0.3) 85%, transparent 100%)',
              boxShadow: '0 0 25px rgba(168,85,247,0.6), 0 0 50px rgba(196,181,253,0.4)'
            }}
          />

          {/* Tertiary trail with pink accent */}
          <motion.div
            initial={{ 
              y: '100vh',
              scaleY: 0.1,
              opacity: 0
            }}
            animate={{ 
              y: '-100vh',
              scaleY: [0.1, 1.2, 0.1],
              opacity: [0, 0.6, 0.6, 0]
            }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 1.2,
              times: [0, 0.3, 0.7, 1],
              ease: [0.25, 0.46, 0.45, 0.94],
              delay: 0.35
            }}
            className="fixed left-0 right-0 z-30 pointer-events-none origin-center"
            style={{
              height: '4px',
              background: 'linear-gradient(90deg, transparent 0%, rgba(236,72,153,0.2) 20%, rgba(251,207,232,0.6) 40%, rgba(255,255,255,0.8) 50%, rgba(251,207,232,0.6) 60%, rgba(236,72,153,0.2) 80%, transparent 100%)',
              boxShadow: '0 0 20px rgba(236,72,153,0.5)'
            }}
          />

          {/* Dynamic particle burst */}
          {Array.from({ length: 20 }).map((_, i) => {
            const angle = (i / 20) * 360;
            const radius = 50 + Math.random() * 200;
            const x = Math.cos((angle * Math.PI) / 180) * radius;
            const y = Math.sin((angle * Math.PI) / 180) * radius;
            
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
                  scale: [0, 1.5, 0.5, 0],
                  x: [0, x, x * 1.5],
                  y: [0, y, y * 1.5]
                }}
                exit={{ opacity: 0 }}
                transition={{ 
                  duration: 1.8,
                  delay: 0.4 + (i * 0.02),
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
                className="fixed top-1/2 left-1/2 z-25 pointer-events-none"
                style={{
                  width: '6px',
                  height: '6px',
                  background: i % 3 === 0 
                    ? 'radial-gradient(circle, rgba(147,197,253,1) 0%, rgba(59,130,246,0.8) 40%, transparent 70%)'
                    : i % 3 === 1 
                    ? 'radial-gradient(circle, rgba(196,181,253,1) 0%, rgba(168,85,247,0.8) 40%, transparent 70%)'
                    : 'radial-gradient(circle, rgba(255,255,255,1) 0%, rgba(251,207,232,0.8) 40%, transparent 70%)',
                  borderRadius: '50%',
                  boxShadow: '0 0 10px rgba(255,255,255,0.8)'
                }}
              />
            );
          })}

          {/* Floating light orbs */}
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.div
              key={`orb-${i}`}
              initial={{ 
                opacity: 0,
                scale: 0,
                x: `${10 + i * 10}vw`,
                y: '80vh'
              }}
              animate={{ 
                opacity: [0, 0.8, 0.8, 0],
                scale: [0, 1.2, 0.8, 0],
                y: [0, -Math.random() * 400 - 200],
                x: `${10 + i * 10 + (Math.random() - 0.5) * 20}vw`
              }}
              exit={{ opacity: 0 }}
              transition={{ 
                duration: 2.5,
                delay: 0.6 + i * 0.08,
                ease: [0.25, 0.46, 0.45, 0.94]
              }}
              className="fixed z-20 pointer-events-none"
              style={{
                width: '8px',
                height: '8px',
                background: 'radial-gradient(circle, rgba(255,255,255,0.9) 0%, rgba(147,197,253,0.6) 50%, transparent 100%)',
                borderRadius: '50%',
                boxShadow: '0 0 15px rgba(147,197,253,0.8), 0 0 30px rgba(255,255,255,0.4)'
              }}
            />
          ))}

          {/* Achievement text with enhanced entrance */}
          <motion.div
            initial={{ 
              opacity: 0,
              scale: 0.5,
              y: 30,
              rotateX: -15
            }}
            animate={{ 
              opacity: [0, 0, 1, 1, 1],
              scale: [0.5, 0.5, 1.2, 1.05, 1],
              y: [30, 30, -5, 0, 0],
              rotateX: [-15, -15, 5, 0, 0]
            }}
            exit={{ 
              opacity: 0,
              scale: 0.8,
              y: -20
            }}
            transition={{
              duration: 2.5,
              times: [0, 0.3, 0.5, 0.7, 1],
              ease: [0.25, 0.46, 0.45, 0.94],
              delay: 0.8
            }}
            className="fixed top-1/4 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-60 pointer-events-none"
            onAnimationComplete={onComplete}
          >
            <div className="text-center">
              {/* Glowing background for text */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.3, 1] }}
                transition={{ 
                  duration: 0.8, 
                  delay: 1.2,
                  ease: [0.25, 0.46, 0.45, 0.94]
                }}
                className="absolute inset-0 -m-4 rounded-2xl opacity-20"
                style={{
                  background: 'radial-gradient(ellipse, rgba(147,197,253,0.8) 0%, rgba(59,130,246,0.4) 50%, transparent 80%)',
                  filter: 'blur(20px)'
                }}
              />
              
              <motion.div 
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.3, duration: 0.6 }}
                className="text-5xl font-bold text-white relative z-10"
                style={{
                  textShadow: '0 0 30px rgba(147,197,253,1), 0 0 60px rgba(59,130,246,0.8), 0 0 100px rgba(255,255,255,0.6), 2px 2px 4px rgba(0,0,0,0.8)',
                  filter: 'drop-shadow(0 0 20px rgba(147,197,253,0.8))',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontWeight: '800',
                  letterSpacing: '0.02em'
                }}
              >
                🌍 FIRST IN WORLD!
              </motion.div>
              
              <motion.div 
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1.5, duration: 0.6 }}
                className="text-xl font-semibold text-white mt-3 relative z-10"
                style={{
                  textShadow: '0 0 20px rgba(196,181,253,0.9), 0 0 40px rgba(168,85,247,0.6), 1px 1px 2px rgba(0,0,0,0.8)',
                  letterSpacing: '0.05em'
                }}
              >
                Achievement Unlocked
              </motion.div>
              
              {/* Subtle animated underline */}
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: '100%', opacity: [0, 1, 0.7] }}
                transition={{ delay: 1.8, duration: 1 }}
                className="h-0.5 bg-gradient-to-r from-transparent via-blue-300 to-transparent mt-2 mx-auto"
                style={{
                  maxWidth: '200px',
                  boxShadow: '0 0 10px rgba(147,197,253,0.8)'
                }}
              />
            </div>
          </motion.div>

          {/* Subtle screen edge glow */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.3, 0.1, 0] }}
            exit={{ opacity: 0 }}
            transition={{ 
              duration: 3,
              times: [0, 0.4, 0.8, 1],
              delay: 0.5
            }}
            className="fixed inset-0 z-10 pointer-events-none"
            style={{
              background: 'radial-gradient(ellipse at center, transparent 30%, rgba(147,197,253,0.1) 70%, rgba(59,130,246,0.2) 100%)'
            }}
          />
        </>
      )}
    </AnimatePresence>
  );
};

export default LevelUpEffect;
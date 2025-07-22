import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Sparkles } from 'lucide-react';

// Rating Overlay Component - the sparkle intermediary screen
export const RatingOverlay = ({ 
  image, 
  onRatingSelect, 
  isVisible = true 
}) => {
  const [showStars, setShowStars] = useState(false);
  const [selectedStar, setSelectedStar] = useState(null);
  const [showExit, setShowExit] = useState(false);
  const [sparkles, setSparkles] = useState([]);

  // Animation sequence
  useEffect(() => {
    if (isVisible) {
      // Show sparkles first - smoother animation
      const sparklePositions = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: 10 + Math.random() * 80, // Keep sparkles away from edges
        y: 10 + Math.random() * 80, // Keep sparkles away from edges
        delay: i * 0.1, // Staggered instead of random for smoothness
        size: 3 + Math.random() * 2 // Varied sizes
      }));
      setSparkles(sparklePositions);
      
      // Then show stars after a delay
      setTimeout(() => setShowStars(true), 600); // Faster transition
    }
  }, [isVisible]);

  const handleStarSelect = (rating) => {
    if (selectedStar !== null) return; // Prevent multiple selections
    
    setSelectedStar(rating);
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    // Start exit animation
    setTimeout(() => {
      setShowExit(true);
      // Delay callback to allow animation
      setTimeout(() => onRatingSelect(rating), 600);
    }, 300);
  };

  const starOrder = [3, 2, 4, 1, 5]; // Center out cascade

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Background with image */}
      <div className="absolute inset-0 bg-black/20">
        <img 
          src={image} 
          alt="Captured" 
          className="w-full h-full object-cover" 
        />
      </div>

      {/* Sparkle effects - Smooth and fluid */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <AnimatePresence>
          {sparkles.map((sparkle) => (
            <motion.div
              key={sparkle.id}
              className="absolute text-yellow-300 will-change-transform"
              style={{ 
                left: `${sparkle.x}%`, 
                top: `${sparkle.y}%` 
              }}
              initial={{ 
                opacity: 0, 
                scale: 0, 
                rotate: 0,
                y: 20
              }}
              animate={{ 
                opacity: [0, 0.8, 1, 0.8, 0], 
                scale: [0, 0.8, 1, 1.2, 0],
                rotate: [0, 180, 360],
                y: [20, 0, -10, 0, 20]
              }}
              transition={{ 
                duration: 3,
                delay: sparkle.delay,
                ease: "easeInOut",
                repeat: Infinity,
                repeatDelay: 0.5,
                times: [0, 0.2, 0.5, 0.8, 1]
              }}
            >
              <Sparkles 
                className="drop-shadow-lg" 
                style={{ 
                  width: `${sparkle.size}px`, 
                  height: `${sparkle.size}px` 
                }} 
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Star Rating Section */}
      <div className="relative z-10 flex flex-col items-center">
        <AnimatePresence>
          {showStars && !showExit && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-white text-lg font-medium mb-8 text-center px-6"
              >
                How would you rate this?
              </motion.div>

              <motion.div 
                className="flex items-center gap-4"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
              >
                {[1, 2, 3, 4, 5].map((rating, index) => (
                  <motion.button
                    key={rating}
                    onClick={() => handleStarSelect(rating)}
                    className="relative"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0,
                      scale: selectedStar === rating ? [1, 1.3, 1.1] : 1
                    }}
                    transition={{ 
                      delay: 0.4 + (index * 0.1),
                      type: "spring",
                      stiffness: 300 
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Star
                      className={`w-12 h-12 transition-all duration-200 drop-shadow-lg ${
                        selectedStar === rating
                          ? 'text-teal-400 fill-teal-400'
                          : 'text-white hover:text-yellow-300'
                      }`}
                      fill={selectedStar === rating ? 'currentColor' : 'none'}
                    />
                    
                    {/* Enhanced explosion effect for selected star */}
                    {selectedStar === rating && (
                      <>
                        {/* Particle burst */}
                        {[...Array(16)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="absolute w-2 h-2 bg-teal-400 rounded-full"
                            style={{
                              left: '50%',
                              top: '50%'
                            }}
                            initial={{ 
                              opacity: 1, 
                              scale: 1,
                              x: 0,
                              y: 0
                            }}
                            animate={{ 
                              opacity: 0,
                              scale: 0,
                              x: (Math.cos((i * 22.5) * Math.PI / 180) * 50),
                              y: (Math.sin((i * 22.5) * Math.PI / 180) * 50)
                            }}
                            transition={{ 
                              duration: 0.8,
                              delay: 0.1,
                              ease: "easeOut"
                            }}
                          />
                        ))}
                        
                        {/* Multiple glow rings */}
                        <motion.div
                          className="absolute inset-0 rounded-full bg-teal-400/20"
                          initial={{ scale: 1, opacity: 0 }}
                          animate={{ 
                            scale: [1, 2, 3], 
                            opacity: [0.6, 0.3, 0] 
                          }}
                          transition={{ duration: 0.8 }}
                        />
                        <motion.div
                          className="absolute inset-0 rounded-full border-2 border-teal-400/60"
                          style={{
                            left: '-8px',
                            top: '-8px',
                            right: '-8px',
                            bottom: '-8px'
                          }}
                          initial={{ scale: 0.5, opacity: 0 }}
                          animate={{ 
                            scale: [0.5, 1.5, 2.5], 
                            opacity: [0.8, 0.4, 0] 
                          }}
                          transition={{ duration: 0.6, delay: 0.2 }}
                        />
                      </>
                    )}
                  </motion.button>
                ))}
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Exit Animation */}
        <AnimatePresence>
          {showExit && selectedStar && (
            <motion.div
              className="flex items-center gap-4"
              initial={{ opacity: 1, scale: 1, y: 0 }}
              animate={{ 
                opacity: 0, 
                scale: 0.8, 
                y: -40 
              }}
              transition={{ 
                duration: 0.6,
                ease: "easeInOut"
              }}
            >
              {/* Particle burst effect */}
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-teal-400 rounded-full"
                  initial={{ 
                    opacity: 1, 
                    scale: 1,
                    x: 0,
                    y: 0
                  }}
                  animate={{ 
                    opacity: 0,
                    scale: 0,
                    x: (Math.cos((i * 30) * Math.PI / 180) * 60),
                    y: (Math.sin((i * 30) * Math.PI / 180) * 60)
                  }}
                  transition={{ 
                    duration: 0.8,
                    delay: 0.1,
                    ease: "easeOut"
                  }}
                />
              ))}
              
              <Star
                className="w-12 h-12 text-teal-400 fill-teal-400"
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Helper text */}
        {showStars && !showExit && (
          <motion.p
            className="text-white/90 text-sm mt-6 text-center px-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
          >
            Tap a star to continue
          </motion.p>
        )}
      </div>
    </div>
  );
}; 
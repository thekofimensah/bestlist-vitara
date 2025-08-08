import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Sparkles } from 'lucide-react';
import { getInstagramClassicFilter } from '../lib/imageUtils';

// Rating Overlay Component - the sparkle intermediary screen
export const RatingOverlay = ({ 
  image, 
  onRatingSelect, 
  isVisible = true 
}) => {
  const [showStars, setShowStars] = useState(true);
  const [selectedStar, setSelectedStar] = useState(null);
  const [showExit, setShowExit] = useState(false);
  const [sparkles, setSparkles] = useState([]);
  const [isTallImage, setIsTallImage] = useState(false);

  // Animation sequence
  useEffect(() => {
    if (isVisible) {
      // Show sparkles first
      const sparklePositions = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 0.5
      }));
      setSparkles(sparklePositions);
      // Stars visible immediately for snappier UX
      setShowStars(true);
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

  // Display stars left-to-right 1..5 so selection maps correctly.
  // Use a center-out delay for entrance animation only.
  const stars = [1, 2, 3, 4, 5];
  const getStarDelay = (value) => {
    const center = 3; // middle star
    const distance = Math.abs(value - center);
    return 0.2 + distance * 0.06;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      {/* Card Container */}
      <motion.div 
        className="bg-white rounded-3xl overflow-hidden w-full max-w-md max-h-[90vh] mx-auto flex flex-col shadow-2xl"
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Image Section */}
        <div className="relative bg-gray-100 flex-shrink-0 h-[52vh] sm:h-[56vh] md:h-[60vh]">
          <img 
            src={image} 
            alt="Captured" 
            className="w-full h-full object-cover"
            style={{ filter: getInstagramClassicFilter() }}
            onLoad={(e) => {
              const img = e.currentTarget;
              if (img.naturalHeight && img.naturalWidth) {
                setIsTallImage(img.naturalHeight / img.naturalWidth > 1.4);
              }
            }}
          />
          
          {/* Sparkle effects over image */}
          <div className="absolute inset-0 pointer-events-none">
            <AnimatePresence>
              {sparkles.map((sparkle) => (
                <motion.div
                  key={sparkle.id}
                  className="absolute text-yellow-300"
                  style={{ 
                    left: `${sparkle.x}%`, 
                    top: `${sparkle.y}%` 
                  }}
                  initial={{ opacity: 0, scale: 0, rotate: 0 }}
                  animate={{ 
                    opacity: [0, 1, 0], 
                    scale: [0, 1, 0],
                    rotate: 360
                  }}
                  transition={{ 
                    duration: 2, 
                    delay: sparkle.delay,
                    repeat: Infinity,
                    repeatDelay: 1
                  }}
                >
                  <Sparkles className="w-4 h-4" />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Content Section */}
        <div className="p-5 flex flex-col items-center text-center overflow-y-auto">
          {/* Title/Header */}
          <div className="mb-3">
            <h2 className="text-xl font-semibold tracking-tight text-gray-900">Rate this item</h2>
          </div>

          {/* Star Rating Section */}
          <div className="flex flex-col items-center">
        <AnimatePresence>
          {showStars && !showExit && (
            <>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-gray-700 text-base font-medium mb-5 text-center px-6"
              >
                How would you rate this?
              </motion.div>

              <motion.div 
                className="flex items-center gap-4"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                {stars.map((value) => (
                  <motion.button
                    key={value}
                    onClick={() => handleStarSelect(value)}
                    className="relative"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      delay: getStarDelay(value),
                      type: "spring",
                      stiffness: 300 
                    }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Star
                      className={`w-12 h-12 transition-all duration-200 ${
                        selectedStar === value
                          ? 'text-teal-500 fill-teal-500'
                          : 'text-gray-400 hover:text-yellow-400'
                      }`}
                      fill={selectedStar === value ? 'currentColor' : 'none'}
                      style={{
                        filter: selectedStar === value 
                          ? 'drop-shadow(0 2px 4px rgba(20, 184, 166, 0.3))' 
                          : 'none',
                        stroke: selectedStar === value ? 'none' : '#6B7280',
                        strokeWidth: selectedStar === value ? 0 : 1.5
                      }}
                    />
                    
                    {/* Glow effect for selected star */}
                    {selectedStar === value && (
                      <motion.div
                        className="absolute inset-0 rounded-full bg-teal-400/30"
                        initial={{ scale: 1, opacity: 0 }}
                        animate={{ 
                          scale: [1, 1.5, 2], 
                          opacity: [0.5, 0.2, 0] 
                        }}
                        transition={{ duration: 0.6 }}
                      />
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
                className="text-gray-600 text-sm mt-4 text-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                Tap a star to continue
              </motion.p>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}; 
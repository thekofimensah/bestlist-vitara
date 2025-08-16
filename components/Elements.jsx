import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Sparkles } from 'lucide-react';
import { getInstagramClassicFilter } from '../lib/imageUtils';

// Rating Overlay Component - the sparkle intermediary screen
export const RatingOverlay = ({ 
  image, 
  onRatingSelect, 
  isVisible = true,
  firstInWorldAchievement = null
}) => {
  const [showStars, setShowStars] = useState(true);
  const [selectedStar, setSelectedStar] = useState(null);
  const [showExit, setShowExit] = useState(false);
  const [sparkles, setSparkles] = useState([]);
  const [isTallImage, setIsTallImage] = useState(false);

  // Get achievement colors for first-in-world styling
  const getAchievementColors = (achievement) => {
    if (!achievement) return null;
    
    const rarity = achievement.rarity || 'legendary';
    switch (rarity) {
      case 'legendary':
        return {
          background: 'bg-gradient-to-br from-purple-900/60 via-pink-900/60 to-purple-900/60',
          card: 'bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200',
          glow: 'shadow-purple-500/30'
        };
      case 'rare':
        return {
          background: 'bg-gradient-to-br from-blue-900/60 via-cyan-900/60 to-blue-900/60',
          card: 'bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200',
          glow: 'shadow-blue-500/30'
        };
      default:
        return {
          background: 'bg-gradient-to-br from-teal-900/60 via-green-900/60 to-teal-900/60',
          card: 'bg-gradient-to-br from-teal-50 to-green-50 border-2 border-teal-200',
          glow: 'shadow-teal-500/30'
        };
    }
  };

  const achievementColors = getAchievementColors(firstInWorldAchievement);

  // Animation sequence - optimized for speed
  useEffect(() => {
    if (isVisible) {
      // Show sparkles first with faster timing
      const sparklePositions = Array.from({ length: 6 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 0.15 // Reduced from 0.5 to 0.15
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
    
    // Start exit animation - faster timing
    setTimeout(() => {
      setShowExit(true);
      // Delay callback to allow animation - reduced timing
      setTimeout(() => onRatingSelect(rating), 350);
    }, 150);
  };

  // Display stars left-to-right 1..5 so selection maps correctly.
  // Use a center-out delay for entrance animation only - optimized for speed
  const stars = [1, 2, 3, 4, 5];
  const getStarDelay = (value) => {
    const center = 3; // middle star
    const distance = Math.abs(value - center);
    return 0.05 + distance * 0.02; // Much faster: reduced from 0.2 + 0.06 to 0.05 + 0.02
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${
      achievementColors ? achievementColors.background : 'bg-black/40'
    }`}>
      {/* Card Container */}
      <motion.div 
        className={`rounded-3xl overflow-hidden w-full max-w-md max-h-[90vh] mx-auto flex flex-col shadow-2xl ${
          achievementColors ? `${achievementColors.card} ${achievementColors.glow}` : 'bg-white'
        }`}
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
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.02, duration: 0.2 }}
              >
                {stars.map((value) => (
                  <motion.button
                    key={value}
                    onClick={() => handleStarSelect(value)}
                    className="relative"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ 
                      delay: getStarDelay(value),
                      type: "spring",
                      stiffness: 500,
                      damping: 25,
                      duration: 0.3
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
                          scale: [1, 1.3, 1.8], 
                          opacity: [0.6, 0.3, 0] 
                        }}
                        transition={{ duration: 0.4 }}
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
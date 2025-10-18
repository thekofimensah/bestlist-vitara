import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import iconUrl from '../assets/icon.png';
import { splashScreenTokens } from '../design-tokens.js';

const LoadingScreen = ({ loadingProgress, appLoading }) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  
  // Loading messages from design tokens
  const loadingMessages = splashScreenTokens.loadingMessages;

  // Safely handle loadingProgress if it's undefined
  const safeLoadingProgress = loadingProgress || {};
  
  // Calculate loading progress (condensed into 3 buckets for UX)
  const coreReady = safeLoadingProgress.auth && safeLoadingProgress.userTracking && safeLoadingProgress.profile;
  const contentReady = safeLoadingProgress.lists && safeLoadingProgress.feed && safeLoadingProgress.stats;
  const extrasReady = safeLoadingProgress.achievements && safeLoadingProgress.camera;
  const displaySteps = [
    { key: 'core', label: 'Core setup', done: coreReady },
    { key: 'content', label: 'Content', done: contentReady },
    { key: 'extras', label: 'Extras', done: extrasReady }
  ];
  const loadingComplete = displaySteps.every(s => s.done);
  const completedSteps = displaySteps.filter(s => s.done).length;
  const totalSteps = displaySteps.length;
  const progressPercentage = Math.round((completedSteps / totalSteps) * 100);

  // Update loading message based on progress
  useEffect(() => {
    if (loadingComplete) {
      setCurrentMessageIndex(3); // "Done!"
    } else if (contentReady) {
      setCurrentMessageIndex(2); // "Loading profile..."
    } else if (coreReady) {
      setCurrentMessageIndex(1); // "Loading Lists..."
    } else {
      setCurrentMessageIndex(0); // "Loading assets..."
    }
  }, [safeLoadingProgress, loadingComplete, coreReady, contentReady]);

  // Don't show loading screen if app is not loading
  if (!appLoading) {
    return null;
  }

  // Full loading screen for initial app load
  return (
    <div className="min-h-screen flex flex-col justify-center items-center overflow-hidden" style={{ backgroundColor: splashScreenTokens.backgroundColor }}>
      {/* Logo and App Name */}
      <motion.div 
        className="text-center"
        initial={{ opacity: 1, scale: 0.6, y: 20 }} // Start smaller and slightly lower to match splash screen
        animate={{ opacity: 1, scale: 1, y: 0 }} // Grow to full size and move to center
        transition={{ 
          duration: 0.6, 
          ease: [0.43, 0.13, 0.23, 0.96], // Custom easing for smooth, natural feel
          delay: 0.1 
        }}
      >
        <motion.div
          initial={{ scale: 1 }}
          animate={{ 
            y: splashScreenTokens.logoAnimation.y,
            scale: 1 
          }}
          transition={{ 
            y: {
              duration: splashScreenTokens.logoAnimation.duration, 
              repeat: Infinity, 
              ease: splashScreenTokens.logoAnimation.ease,
              delay: 0.7 // Start floating animation after transition completes
            }
          }}
          className="mb-4"
        >
          <motion.div 
            className="rounded-full bg-white flex items-center justify-center drop-shadow-lg"
            initial={{ width: '12rem', height: '12rem' }} // Start at smaller size (w-48 h-48)
            animate={{ width: '18rem', height: '18rem' }} // Grow to w-72 h-72
            transition={{ 
              duration: 0.6, 
              ease: [0.43, 0.13, 0.23, 0.96],
              delay: 0.1 
            }}
          >
            <img 
              src={iconUrl} 
              alt="CURATE"
              width="320" 
              height="320" 
              className="drop-shadow-lg w-72 h-72 md:w-80 md:h-80"
              style={{ filter: splashScreenTokens.iconFilter }}
            />
          </motion.div>
        </motion.div>
      </motion.div>
      
      {/* Loading Text */}
      <motion.div 
        className="fixed bottom-12 md:bottom-16 left-0 right-0 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }} // Fade in after icon transition
      >
        <div className="text-black/80 text-sm md:text-base">
          {loadingMessages[currentMessageIndex]}
          {currentMessageIndex < 3 && (
            <span className="dots ml-1">...</span>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default LoadingScreen;

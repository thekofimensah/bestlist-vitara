import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import iconUrl from '../assets/icon.svg';
import { splashScreenTokens } from '../design-tokens.js';

const LoadingScreen = ({ loadingProgress, appLoading, isResuming = false }) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);
  
  // Loading messages from design tokens
  const loadingMessages = splashScreenTokens.loadingMessages;

  // Safely handle loadingProgress if it's undefined
  const safeLoadingProgress = loadingProgress || {};
  
  // Calculate loading progress (condensed into 3 buckets for UX)
  const coreReady = safeLoadingProgress.auth && safeLoadingProgress.userTracking;
  const contentReady = safeLoadingProgress.lists && safeLoadingProgress.feed && safeLoadingProgress.stats;
  const extrasReady = safeLoadingProgress.achievements;
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

  // If resuming (coming back from background), show a more subtle loading experience
  if (isResuming) {
    return (
      <motion.div 
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        style={{ 
          backgroundColor: splashScreenTokens.resuming.backgroundColor,
          backdropFilter: splashScreenTokens.resuming.backdropFilter
        }}
      >
        <motion.div 
          className="text-center"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <motion.div
            animate={{ y: [-5, 5, -5] }}
            transition={{ 
              duration: 2, 
              repeat: Infinity, 
              ease: "easeInOut" 
            }}
            className="mb-4"
          >
            <img 
              src={iconUrl} 
              alt="Bestlist Logo"
              width={splashScreenTokens.resuming.iconSize.width} 
              height={splashScreenTokens.resuming.iconSize.height} 
              className={`drop-shadow-lg ${splashScreenTokens.resuming.iconSize.mobileClass} ${splashScreenTokens.resuming.iconSize.tabletClass}`}
              style={{ filter: splashScreenTokens.iconFilter }}
            />
          </motion.div>
          <div className="text-lg font-medium" style={{ color: splashScreenTokens.resuming.textColor }}>
            Refreshing...
          </div>
          <div className="mt-2 w-16 h-1 rounded-full overflow-hidden" style={{ backgroundColor: splashScreenTokens.resuming.progressBarColor }}>
            <motion.div 
              className="h-full rounded-full"
              style={{ backgroundColor: splashScreenTokens.resuming.progressBarFillColor }}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Full loading screen for initial app load
  return (
    <div className="min-h-screen flex flex-col justify-center items-center overflow-hidden" style={{ backgroundColor: splashScreenTokens.backgroundColor }}>
      {/* Logo and App Name */}
      <motion.div 
        className="text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      >
        <motion.div
          animate={{ y: splashScreenTokens.logoAnimation.y }}
          transition={{ 
            duration: splashScreenTokens.logoAnimation.duration, 
            repeat: Infinity, 
            ease: splashScreenTokens.logoAnimation.ease 
          }}
          className="mb-4"
        >
          <img 
            src={iconUrl} 
            alt="Bestlist Logo"
            width="320" 
            height="320" 
            className="drop-shadow-lg w-72 h-72 md:w-80 md:h-80"
            style={{ filter: splashScreenTokens.iconFilter }}
          />
        </motion.div>
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-katibeh text-white mt-4 text-shadow tracking-widest font-normal">
          {splashScreenTokens.appName}
        </h1>
      </motion.div>
      
      {/* Loading Text */}
      <motion.div 
        className="fixed bottom-12 md:bottom-16 left-0 right-0 text-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.5 }}
      >
        <div className="text-white/80 text-sm md:text-base">
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

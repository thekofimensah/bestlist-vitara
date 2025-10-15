import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const PullToRefresh = ({ 
  children, 
  onRefresh, 
  threshold = 60, // Optimized threshold
  disabled = false,
  className = '',
}) => {
  // Check if device is offline and disable pull-to-refresh
  const isOffline = !navigator.onLine;
  const isDisabled = disabled || isOffline;
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [releaseToRefresh, setReleaseToRefresh] = useState(false);
  
  const containerRef = useRef(null);
  const startY = useRef(0);
  const startX = useRef(0);
  const pullStarted = useRef(false);
  const pullDistanceRef = useRef(0);
  const lastScrollTop = useRef(0);

  // Keep pullDistance in sync with ref for event handlers
  useEffect(() => {
    pullDistanceRef.current = pullDistance;
  }, [pullDistance]);

  // Helper function to find the actual scrollable container
  const findScrollContainer = (element) => {
    if (!element) return null;
    
    // Check if this element is scrollable
    const style = window.getComputedStyle(element);
    const isScrollable = style.overflow === 'auto' || style.overflow === 'scroll' || 
                        style.overflowY === 'auto' || style.overflowY === 'scroll';
    
    if (isScrollable && element.scrollHeight > element.clientHeight) {
      return element;
    }
    
    // Check parent elements
    let parent = element.parentElement;
    while (parent && parent !== document.body) {
      const parentStyle = window.getComputedStyle(parent);
      const parentIsScrollable = parentStyle.overflow === 'auto' || parentStyle.overflow === 'scroll' || 
                                parentStyle.overflowY === 'auto' || parentStyle.overflowY === 'scroll';
      
      if (parentIsScrollable && parent.scrollHeight > parent.clientHeight) {
        return parent;
      }
      parent = parent.parentElement;
    }
    
    // Fallback to window/document
    return window;
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scrollContainer = findScrollContainer(container);
    if (!scrollContainer) return;

    const handleTouchStart = (e) => {
      // Do not activate pull-to-refresh while typing to preserve keyboard gestures
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
        return;
      }
      
      // Get scroll position from the correct container
      let scrollTop = 0;
      if (scrollContainer === window) {
        scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
      } else {
        scrollTop = scrollContainer.scrollTop;
      }
      
      // Only allow pull-to-refresh when at the very top (strict check to prevent accidental triggers)
      const isAtTop = scrollTop === 0;
      if (!isAtTop || isRefreshing || isDisabled) return;

      startY.current = e.touches[0].clientY;
      startX.current = e.touches[0].clientX;
      pullStarted.current = true;
      lastScrollTop.current = scrollTop;
    };

    const handleTouchMove = (e) => {
      // Skip when an input is focused to avoid swallowing swipe-typing
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
        return;
      }
      
      if (!pullStarted.current || isRefreshing || isDisabled) return;
      
      // Get current scroll position from the correct container
      let currentScrollTop = 0;
      if (scrollContainer === window) {
        currentScrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop;
      } else {
        currentScrollTop = scrollContainer.scrollTop;
      }
      
      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const deltaY = currentY - startY.current;
      const deltaX = Math.abs(currentX - startX.current);
      const scrollDelta = currentScrollTop - lastScrollTop.current;

      // If scrolling up or away from top, cancel
      if (currentScrollTop > 0) {
        pullStarted.current = false;
        setPullDistance(0);
        setIsPulling(false);
        setReleaseToRefresh(false);
        return;
      }

      // Cancel if too much horizontal movement
      if (deltaX > Math.abs(deltaY) && deltaX > 20) {
        pullStarted.current = false;
        setPullDistance(0);
        setIsPulling(false);
        setReleaseToRefresh(false);
        return;
      }

      // Only respond to downward pulls
      if (deltaY > 0) {
        // Natural resistance curve for smooth pulling
        const resistance = 1 + (deltaY / 100) * 0.5;
        const maxDistance = threshold * 2.5;
        const distance = Math.min(deltaY / resistance, maxDistance);
        
        setPullDistance(distance);
        setIsPulling(distance > 10);
        setReleaseToRefresh(distance > threshold);

        // Prevent scroll when pulling
        if (distance > 5) {
          e.preventDefault();
        }
      }

      lastScrollTop.current = currentScrollTop;
    };

    const handleTouchEnd = () => {
      // Do not trigger refresh completion while editing text
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
        return;
      }
      
      if (!pullStarted.current) return;
      
      pullStarted.current = false;
      const finalDistance = pullDistanceRef.current;
      
      if (finalDistance > threshold && !isRefreshing) {
        setIsRefreshing(true);
        setIsPulling(false);
        setReleaseToRefresh(false);
        
        // Keep the indicator visible during refresh
        setPullDistance(threshold);
        
        // Trigger refresh
        Promise.resolve(onRefresh()).finally(() => {
          // Emit camera reset event
          setTimeout(() => {
            const resetEvent = new CustomEvent('camera:reset');
            window.dispatchEvent(resetEvent);
          }, 500);

          // Smooth completion
          setTimeout(() => {
            setIsRefreshing(false);
            setPullDistance(0);
          }, 1000);
        });
      } else {
        // Smooth spring back
        setIsPulling(false);
        setReleaseToRefresh(false);
        setPullDistance(0);
      }
    };

    // Add event listeners. Use passive: true for start/end, but not for move since we need preventDefault
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [threshold, onRefresh, isRefreshing, isDisabled]);

  // Calculate progress (0 to 1)
  const progress = Math.min(pullDistance / threshold, 1);
  const opacity = Math.min(pullDistance / 20, 1);

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
      style={{
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Modern pull indicator */}
      <AnimatePresence>
        {(pullDistance > 0 || isRefreshing) && (
          <motion.div 
            className="fixed top-0 left-0 right-0 z-50 pointer-events-none"
            initial={{ y: -60, opacity: 0 }}
            animate={{
              y: Math.min(pullDistance * 0.6, 50),
              opacity: opacity,
            }}
            exit={{ y: -60, opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 30,
            }}
          >
            <div className="flex flex-col items-center justify-center">
              <div className="relative">
                {/* White background circle */}
                <motion.div
                  className="bg-white rounded-full shadow-lg flex items-center justify-center"
                  style={{
                    width: 46,
                    height: 46,
                  }}
                  animate={{
                    scale: isRefreshing ? 1 : 0.85 + (progress * 0.15),
                  }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 20,
                  }}
                >
                  {/* Inner content - dots or spinner */}
                  <div className="relative w-full h-full flex items-center justify-center">
                    {isRefreshing ? (
                      // Modern circular spinner
                      <motion.div
                        className="absolute inset-0 rounded-full"
                        style={{
                          background: `conic-gradient(from 0deg, transparent, #1F6D5A)`,
                          mask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), black calc(100% - 3px))',
                          WebkitMask: 'radial-gradient(farthest-side, transparent calc(100% - 3px), black calc(100% - 3px))',
                        }}
                        animate={{
                          rotate: 360,
                        }}
                        transition={{
                          duration: 1,
                          ease: "linear",
                          repeat: Infinity,
                        }}
                      />
                    ) : (
                      // Dots that scale with progress
                      <div className="flex gap-1">
                        <motion.div
                          className="w-1.5 h-1.5 bg-teal-600 rounded-full"
                          style={{
                            opacity: 0.3 + (progress * 0.7),
                            scale: 0.7 + (progress * 0.3),
                          }}
                        />
                        <motion.div
                          className="w-1.5 h-1.5 bg-teal-600 rounded-full"
                          style={{
                            opacity: 0.3 + (progress * 0.7),
                            scale: 0.7 + (progress * 0.3),
                          }}
                        />
                        <motion.div
                          className="w-1.5 h-1.5 bg-teal-600 rounded-full"
                          style={{
                            opacity: 0.3 + (progress * 0.7),
                            scale: 0.7 + (progress * 0.3),
                          }}
                        />
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Progress ring */}
                {!isRefreshing && (
                  <svg
                    className="absolute inset-0 pointer-events-none"
                    style={{ 
                      width: 46, 
                      height: 46,
                      transform: 'rotate(-90deg)',
                    }}
                  >
                    <circle
                      cx="23"
                      cy="23"
                      r="20"
                      fill="none"
                      stroke="rgba(229, 231, 235, 0.5)"
                      strokeWidth="2.5"
                    />
                    <circle
                      cx="23"
                      cy="23"
                      r="20"
                      fill="none"
                      stroke="#1F6D5A"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeDasharray={`${progress * 126} 126`}
                      style={{
                        transition: 'stroke-dasharray 0.15s ease-out',
                        filter: 'drop-shadow(0 0 6px rgba(31, 109, 90, 0.3))',
                      }}
                    />
                  </svg>
                )}
              </div>

              {/* Status text */}
              <AnimatePresence mode="wait">
                {!isRefreshing && pullDistance > 5 && (
                  <motion.div
                    className="mt-2 text-xs font-medium"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ 
                      opacity: Math.min(pullDistance / 30, 1),
                      y: 0,
                    }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      color: releaseToRefresh ? '#1F6D5A' : '#9CA3AF',
                    }}
                  >
                    {releaseToRefresh ? 'Release to refresh' : 'Pull down to refresh'}
                  </motion.div>
                )}
                {isRefreshing && (
                  <motion.div
                    className="mt-2 text-xs font-medium text-teal-600"
                    initial={{ opacity: 0, y: -5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.15 }}
                  >
                    Refreshing...
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content with smooth transform */}
      <motion.div
        animate={{
          y: isRefreshing ? threshold * 0.5 : 0,
        }}
        transition={{
          type: "spring",
          stiffness: 400,
          damping: 30,
        }}
      >
        {children}
      </motion.div>
    </div>
  );
};

export default PullToRefresh; 
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const PullToRefresh = ({ 
  children, 
  onRefresh, 
  threshold = 70, // Reduced from 90 to make it easier to trigger
  disabled = false,
  className = '',
}) => {
  // Check if device is offline and disable pull-to-refresh
  const isOffline = !navigator.onLine;
  const isDisabled = disabled || isOffline;
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const containerRef = useRef(null);
  const startY = useRef(0);
  const startX = useRef(0);
  const pullStarted = useRef(false);
  const pullDistanceRef = useRef(0);
  const lastPullDistance = useRef(0);
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
      lastPullDistance.current = 0;
      lastScrollTop.current = scrollTop;
      
      console.log('🔄 PullToRefresh: Pull started at top, scrollTop:', scrollTop);
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

      // If scrolling up (negative delta) or away from top, cancel immediately (strict check)
      if (scrollDelta < 0 || currentScrollTop > 0) { // No tolerance - must be at exact top
        pullStarted.current = false;
        setPullDistance(0);
        setIsPulling(false);
        console.log('🔄 PullToRefresh: Cancelled - scrolling up or away from top, scrollTop:', currentScrollTop, 'scrollDelta:', scrollDelta);
        return;
      }

      // Cancel if too much horizontal movement (allow native back gesture)
      if (deltaX > Math.abs(deltaY) && deltaX > 20) {
        pullStarted.current = false;
        setPullDistance(0);
        setIsPulling(false);
        return;
      }

      // Only respond to downward pulls
      if (deltaY > 0) {
        // Improved resistance curve - more responsive at start, smoother overall
        const resistance = 1 + (deltaY / 80) * 0.4; // Reduced resistance for easier pulling
        const maxDistance = threshold * 2.2;
        const distance = Math.min(deltaY / resistance, maxDistance);
        
        // More responsive smoothing for better performance
        const smoothingFactor = 0.6; // Increased from 0.3 for more responsiveness
        const smoothDistance = lastPullDistance.current + (distance - lastPullDistance.current) * smoothingFactor;
        lastPullDistance.current = smoothDistance;
        
        setPullDistance(smoothDistance);
        setIsPulling(smoothDistance > threshold);

        // Prevent scroll when pulling (more aggressive prevention for better grab)
        if (smoothDistance > 2 && deltaX < Math.abs(deltaY)) { // Reduced threshold from 5 to 2
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
        console.log('🔄 PullToRefresh: Starting refresh...');
        setIsRefreshing(true);
        setIsPulling(false);
        
        // Trigger refresh and reset camera state
        Promise.resolve(onRefresh()).finally(() => {
          // Reset camera state to guarantee it works even if failing
          console.log('🔄 PullToRefresh: Resetting camera state');
          
          // Emit camera reset event for the camera manager
          const resetEvent = new CustomEvent('camera:reset');
          window.dispatchEvent(resetEvent);

          // Also emit the legacy event for backward compatibility
          const legacyResetEvent = new CustomEvent('feed:reset-camera');
          window.dispatchEvent(legacyResetEvent);

          setTimeout(() => {
            console.log('🔄 PullToRefresh: Refresh completed');
            setIsRefreshing(false);
            setPullDistance(0);
          }, 500);
        });
      } else {
        // Smooth reset animation
        setIsPulling(false);
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

  // Calculate spinner properties with smooth easing - optimized for performance
  const spinnerHeight = isRefreshing ? 60 : Math.max(pullDistance, 0);
  const spinnerOpacity = isRefreshing ? 1 : Math.min(pullDistance / 30, 1); // Faster opacity transition
  const spinnerRotation = isRefreshing ? 360 : pullDistance * 2; // Reduced rotation multiplier for smoother animation

  return (
    <div 
      ref={containerRef}
      className={`relative ${className}`}
      style={{
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Optimized spinner that comes down */}
      {pullDistance > 0 && (
        <motion.div 
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center"
          style={{ 
            pointerEvents: 'none',
            willChange: 'transform, opacity' // Optimize for animations
          }}
          animate={{
            y: Math.min(pullDistance - 15, 70), // Slightly reduced travel distance
            opacity: spinnerOpacity,
            scale: 0.85 + (spinnerOpacity * 0.15) // Reduced scale range for smoother animation
          }}
          transition={{
            type: "tween", // Use tween instead of spring for better performance
            duration: 0.1, // Very fast transition
            ease: "easeOut"
          }}
        >
          {/* Optimized spinner with smooth rotation */}
          <motion.div
            className="w-10 h-10 border-4 border-gray-300 rounded-full bg-white shadow-sm" // Slightly smaller for better performance
            style={{
              borderTopColor: '#1F6D5A',
              willChange: 'transform' // Optimize for rotation
            }}
            animate={{
              rotate: isRefreshing ? 360 : spinnerRotation
            }}
            transition={{
              type: isRefreshing ? "tween" : "tween", // Always use tween for consistency
              duration: isRefreshing ? 1 : 0.1, // Fast transition for pull, smooth for refresh
              ease: isRefreshing ? "linear" : "easeOut",
              repeat: isRefreshing ? Infinity : 0
            }}
          />
        </motion.div>
      )}

      {/* Content */}
      {children}

      {/* CSS for spinner animation */}
      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default PullToRefresh; 
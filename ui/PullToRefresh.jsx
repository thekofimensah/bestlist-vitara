import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const PullToRefresh = ({ 
  children, 
  onRefresh, 
  threshold = 90,
  disabled = false,
  className = '',
}) => {
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
      
      // Only allow pull-to-refresh when exactly at the top
      const isAtTop = scrollTop <= 0;
      if (!isAtTop || isRefreshing || disabled) return;

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
      
      if (!pullStarted.current || isRefreshing || disabled) return;
      
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

      // If scrolling up (negative delta) or away from top, cancel immediately
      if (scrollDelta < 0 || currentScrollTop > 0) {
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
        // Smooth resistance curve - starts easy, gets progressively harder
        const resistance = 1 + (deltaY / 100) * 0.5;
        const maxDistance = threshold * 2.5;
        const distance = Math.min(deltaY / resistance, maxDistance);
        
        // Smooth interpolation between last and current distance
        const smoothDistance = lastPullDistance.current + (distance - lastPullDistance.current) * 0.3;
        lastPullDistance.current = smoothDistance;
        
        setPullDistance(smoothDistance);
        setIsPulling(smoothDistance > threshold);

        // Prevent scroll when pulling significantly
        if (smoothDistance > 5 && deltaX < Math.abs(deltaY)) {
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
        
        // Trigger refresh
        Promise.resolve(onRefresh()).finally(() => {
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

    // Add event listeners. Use passive: true everywhere to avoid intercepting gesture typing on Android
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [threshold, onRefresh, isRefreshing, disabled]);

  // Calculate spinner properties with smooth easing
  const spinnerHeight = isRefreshing ? 60 : Math.max(pullDistance, 0);
  const spinnerOpacity = isRefreshing ? 1 : Math.min(pullDistance / 40, 1);
  const spinnerRotation = isRefreshing ? 360 : pullDistance * 2.5;

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      style={{
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {/* Smooth spinner that comes down */}
      {pullDistance > 0 && (
        <motion.div 
          className="fixed top-0 left-0 right-0 z-50 flex items-center justify-center"
          style={{ 
            pointerEvents: 'none'
          }}
          animate={{
            y: Math.min(pullDistance - 20, 80),
            opacity: spinnerOpacity,
            scale: 0.8 + (spinnerOpacity * 0.2)
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 30,
            mass: 0.8
          }}
        >
          {/* Clean spinner with smooth rotation */}
          <motion.div
            className="w-12 h-12 border-4 border-gray-300 rounded-full bg-white shadow-sm"
            style={{
              borderTopColor: '#1F6D5A',
            }}
            animate={{
              rotate: isRefreshing ? 360 : spinnerRotation
            }}
            transition={{
              type: isRefreshing ? "tween" : "spring",
              duration: isRefreshing ? 1 : undefined,
              ease: isRefreshing ? "linear" : undefined,
              stiffness: isRefreshing ? undefined : 200,
              damping: isRefreshing ? undefined : 25,
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
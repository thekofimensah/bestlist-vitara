import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

const PullToRefresh = ({ 
  onRefresh, 
  children, 
  threshold = 70,
  resistance = 2.5,
  refreshingText = "Refreshing...",
  pullText = "Pull to refresh",
  releaseText = "Release to refresh",
  disabled = false,
  className = ""
}) => {
  const [isPulling, setIsPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canPull, setCanPull] = useState(false);
  
  const containerRef = useRef(null);
  const startY = useRef(0);
  const currentY = useRef(0);
  const pullStarted = useRef(false);

  // Check if we can pull (at top of page)
  const checkCanPull = () => {
    if (containerRef.current) {
      const scrollTop = containerRef.current.scrollTop;
      setCanPull(scrollTop <= 0);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleScroll = () => {
      checkCanPull();
    };

    const handleTouchStart = (e) => {
      if (!canPull || isRefreshing || disabled) return;
      
      startY.current = e.touches[0].clientY;
      pullStarted.current = true;
    };

    const handleTouchMove = (e) => {
      if (!pullStarted.current || !canPull || isRefreshing || disabled) return;

      currentY.current = e.touches[0].clientY;
      const deltaY = currentY.current - startY.current;

      if (deltaY > 0) {
        // Calculate pull distance with resistance
        const distance = Math.min(deltaY / resistance, threshold * 1.5);
        setPullDistance(distance);
        setIsPulling(distance > threshold);

        // Prevent default scrolling when pulling down significantly
        if (distance > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = () => {
      if (!pullStarted.current) return;
      
      pullStarted.current = false;
      
      if (isPulling && pullDistance > threshold && !isRefreshing) {
        setIsRefreshing(true);
        setIsPulling(false);
        
        // Keep the pull distance at threshold during refresh
        setPullDistance(threshold);
        
        // Trigger refresh
        Promise.resolve(onRefresh()).finally(() => {
          // Smooth animation back to 0
          setTimeout(() => {
            setIsRefreshing(false);
            setPullDistance(0);
          }, 300);
        });
      } else {
        // Animate back to 0
        setIsPulling(false);
        setPullDistance(0);
      }
    };

    // Add scroll listener as passive
    container.addEventListener('scroll', handleScroll, { passive: true });
    
    // Add touch listeners as non-passive so we can preventDefault
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    checkCanPull(); // Initial check

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [canPull, isRefreshing, disabled, isPulling, pullDistance, threshold, resistance, onRefresh]);

  const getRefreshText = () => {
    if (isRefreshing) return refreshingText;
    if (isPulling) return releaseText;
    return pullText;
  };

  const getIndicatorOpacity = () => {
    if (isRefreshing) return 1;
    return Math.min(pullDistance / 30, 1);
  };

  const getIconRotation = () => {
    if (isRefreshing) return 0;
    if (isPulling) return 180;
    return pullDistance * 2;
  };

  return (
    <div 
      ref={containerRef}
      className={`h-full overflow-auto ${className}`}
      style={{
        WebkitOverflowScrolling: 'touch',
        // Prevent pull-to-refresh on Safari
        overscrollBehavior: 'contain',
      }}
    >
      {/* Pull-to-refresh indicator */}
      <motion.div 
        className="flex flex-col items-center justify-center bg-stone-50"
        style={{ backgroundColor: '#F6F6F4' }}
        initial={{ height: 0, marginTop: 0, opacity: 0 }}
        animate={{ 
          height: pullDistance,
          marginTop: -pullDistance,
          opacity: getIndicatorOpacity(),
        }}
        transition={{ 
          type: "spring", 
          stiffness: 300, 
          damping: 30,
          duration: 0.3 
        }}
      >
        <div className="bg-white rounded-full p-3 shadow-lg border border-gray-100 mb-2">
          <motion.div
            animate={{ 
              rotate: getIconRotation(),
            }}
            transition={{ 
              type: "spring", 
              stiffness: 200, 
              damping: 20 
            }}
          >
            <RefreshCw 
              className={`w-5 h-5 text-teal-700 ${
                isRefreshing ? 'animate-spin' : ''
              }`}
              style={{ color: '#1F6D5A' }}
            />
          </motion.div>
        </div>
        
        <motion.div 
          className="text-sm text-gray-600 font-medium"
          animate={{ 
            scale: isPulling ? 1.05 : 1,
            color: isPulling ? '#1F6D5A' : '#6B7280'
          }}
          transition={{ duration: 0.2 }}
        >
          {getRefreshText()}
        </motion.div>
      </motion.div>
      
      {/* Page content */}
      <div className="relative">
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh; 
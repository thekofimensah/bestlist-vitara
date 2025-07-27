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
  const startX = useRef(0);
  const currentY = useRef(0);
  const pullStarted = useRef(false);
  const pullDistanceRef = useRef(0);

  // Keep pullDistanceRef in sync
  useEffect(() => {
    pullDistanceRef.current = pullDistance;
  }, [pullDistance]);

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
      // Always check scroll position fresh - don't rely on state
      const isAtTop = container.scrollTop <= 0;
      
      if (!isAtTop || isRefreshing || disabled) return;
      
      // Only start pull if this is a center-ish touch (avoid edge gestures for native back)
      const screenWidth = window.innerWidth;
      const touchX = e.touches[0].clientX;
      if (touchX < 80 || touchX > screenWidth - 80) return;
      
      startY.current = e.touches[0].clientY;
      startX.current = e.touches[0].clientX;
      pullStarted.current = true;
    };

    const handleTouchMove = (e) => {
      if (!pullStarted.current || isRefreshing || disabled) return;

      currentY.current = e.touches[0].clientY;
      const deltaY = currentY.current - startY.current;
      const deltaX = Math.abs(e.touches[0].clientX - startX.current);

      // If horizontal movement is greater than vertical, don't interfere (allow back gesture)
      if (deltaX > Math.abs(deltaY)) {
        pullStarted.current = false;
        setPullDistance(0);
        setIsPulling(false);
        return;
      }

      if (deltaY > 0) {
        // Calculate distance with resistance
        const distance = Math.min(deltaY / resistance, threshold * 2);
        
        setPullDistance(distance);
        setIsPulling(distance > threshold);

        // Only prevent default for significant vertical pulls
        if (distance > 20 && deltaX < deltaY) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = () => {
      if (!pullStarted.current) return;
      
      pullStarted.current = false;
      
      // Use ref to get current pullDistance value
      const currentDistance = pullDistanceRef.current;
      
      if (currentDistance > threshold && !isRefreshing) {
        setIsRefreshing(true);
        setIsPulling(false);
        
        // Trigger refresh
        Promise.resolve(onRefresh()).finally(() => {
          setTimeout(() => {
            setIsRefreshing(false);
            setPullDistance(0);
          }, 300);
        });
      } else {
        setIsPulling(false);
        setPullDistance(0);
      }
    };

    // Add listeners
    container.addEventListener('scroll', handleScroll, { passive: true });
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    
    checkCanPull();

    return () => {
      container.removeEventListener('scroll', handleScroll);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [threshold, onRefresh, isRefreshing, disabled]);

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
      }}
    >
            {/* Pull-to-refresh indicator */}
      <motion.div 
        className="flex flex-col items-center justify-center bg-stone-50"
        style={{ backgroundColor: '#F6F6F4' }}
        initial={{ height: 0, marginTop: 0, opacity: 0 }}
        animate={{ 
          height: isRefreshing ? 50 : pullDistance,
          marginTop: isRefreshing ? -50 : -pullDistance,
          opacity: isRefreshing ? 1 : getIndicatorOpacity(),
        }}
        transition={{ 
          type: "spring", 
          stiffness: 400, 
          damping: 25,
          duration: 0.2 
        }}
      >
        {/* Simple, clean refresh indicator */}
        <motion.div
          className="w-6 h-6 border-2 border-gray-300 border-t-teal-700 rounded-full"
          animate={{ 
            rotate: isRefreshing ? 360 : getIconRotation(),
          }}
          transition={{ 
            duration: isRefreshing ? 1 : 0.3,
            repeat: isRefreshing ? Infinity : 0,
            ease: isRefreshing ? "linear" : "easeOut"
          }}
          style={{ 
            borderTopColor: '#1F6D5A',
            opacity: isRefreshing ? 1 : Math.min(pullDistance / 40, 1)
          }}
        />
        </motion.div>
        

        
        {/* Page content */}
      <div className="relative min-h-full">
        {children}
        {/* Add extra height to ensure scrollable content */}
        <div style={{ height: '50px' }}></div>
      </div>
    </div>
  );
};

export default PullToRefresh; 
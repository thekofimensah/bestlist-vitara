import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const PullToRefresh = ({ 
  children, 
  onRefresh, 
  threshold = 80,
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

  // Keep pullDistance in sync with ref for event handlers
  useEffect(() => {
    pullDistanceRef.current = pullDistance;
  }, [pullDistance]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e) => {
      const isAtTop = container.scrollTop <= 5; // Small tolerance
      if (!isAtTop || isRefreshing || disabled) return;

      startY.current = e.touches[0].clientY;
      startX.current = e.touches[0].clientX;
      pullStarted.current = true;
      
      console.log('🔄 PullToRefresh: Pull started');
    };

    const handleTouchMove = (e) => {
      if (!pullStarted.current || isRefreshing || disabled) return;

      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const deltaY = currentY - startY.current;
      const deltaX = Math.abs(currentX - startX.current);

      // Cancel if too much horizontal movement (allow native back gesture)
      if (deltaX > Math.abs(deltaY) && deltaX > 20) {
        pullStarted.current = false;
        setPullDistance(0);
        setIsPulling(false);
        return;
      }

      // Only respond to downward pulls
      if (deltaY > 0) {
        // Apply resistance - gets harder to pull as distance increases
        const resistance = 2.5;
        const maxDistance = threshold * 2;
        const distance = Math.min(deltaY / resistance, maxDistance);
        
        setPullDistance(distance);
        setIsPulling(distance > threshold);

        console.log('🔄 PullToRefresh: Touch move', JSON.stringify({ 
          deltaY: Math.round(deltaY), 
          distance: Math.round(distance), 
          threshold,
          isPulling: distance > threshold 
        }));

        // Prevent scroll when pulling significantly
        if (distance > 10 && deltaX < Math.abs(deltaY)) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = () => {
      if (!pullStarted.current) return;
      
      pullStarted.current = false;
      const finalDistance = pullDistanceRef.current;
      
      console.log('🔄 PullToRefresh: Touch end', JSON.stringify({ 
        finalDistance: Math.round(finalDistance), 
        threshold, 
        willRefresh: finalDistance > threshold && !isRefreshing 
      }));
      
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
        // Cancel refresh
        setIsPulling(false);
        setPullDistance(0);
      }
    };

    // Add event listeners
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [threshold, onRefresh, isRefreshing, disabled]);

  // Calculate spinner properties
  const spinnerHeight = isRefreshing ? 60 : Math.max(pullDistance, 0);
  const spinnerOpacity = isRefreshing ? 1 : Math.min(pullDistance / 40, 1);
  const spinnerRotation = isRefreshing ? 360 : pullDistance * 3;

  return (
    <div 
      ref={containerRef}
      className={`relative h-full overflow-auto ${className}`}
      style={{
        WebkitOverflowScrolling: 'touch',
      }}
    >
             {/* Simple spinner that comes down */}
       {pullDistance > 0 && (
         <div 
           className="fixed top-0 left-1/2 z-50 flex items-center justify-center"
           style={{ 
             transform: `translateX(-50%) translateY(${Math.min(pullDistance - 20, 40)}px)`,
             pointerEvents: 'none'
           }}
         >
           {/* Clean spinner only */}
           <div
             className="w-6 h-6 border-2 border-gray-300 rounded-full bg-white shadow-sm"
             style={{
               borderTopColor: '#1F6D5A',
               transform: `rotate(${spinnerRotation}deg)`,
               animation: isRefreshing ? 'spin 1s linear infinite' : 'none'
             }}
           />
         </div>
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
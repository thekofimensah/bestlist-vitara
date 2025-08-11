import React, { useRef, useEffect } from 'react';
import LoadingSpinner from '../../ui/LoadingSpinner';

const InfiniteScrollTrigger = ({ 
  onIntersect, 
  loading = false, 
  rootMargin = '100px',
  threshold = 0.1,
  enabled = true,
  className = '',
  children
}) => {
  const elementRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    if (!enabled || !onIntersect) return;

    const element = elementRef.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !loading) {
          onIntersect();
        }
      },
      {
        root: null,
        rootMargin,
        threshold,
      }
    );

    observerRef.current.observe(element);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [onIntersect, loading, enabled, rootMargin, threshold]);

  return (
    <div 
      ref={elementRef} 
      className={`h-20 flex items-center justify-center ${className}`}
    >
      {loading ? (
        <LoadingSpinner size="md" color="teal" />
      ) : (
        children || (
          <div className="text-sm text-gray-500">
            {enabled ? 'Loading more...' : ''}
          </div>
        )
      )}
    </div>
  );
};

export default InfiniteScrollTrigger;

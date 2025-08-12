import React, { useRef, useEffect } from 'react';
import LoadingSpinner from '../../ui/LoadingSpinner';

const InfiniteScrollTrigger = ({ 
  onLoadMore, // Support both names for backward compatibility
  onIntersect,
  loading = false, 
  hasMore = true,
  rootMargin = '100px',
  threshold = 0.1,
  enabled = true,
  className = '',
  children
}) => {
  const elementRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    const callback = onLoadMore || onIntersect;
    if (!enabled || !callback || !hasMore) return;

    const element = elementRef.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && !loading && hasMore) {
          callback();
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
  }, [onLoadMore, onIntersect, loading, enabled, hasMore, rootMargin, threshold]);

  // Don't render the trigger if there's no more content
  if (!hasMore && !loading) {
    return (
      <div className="text-center py-4 text-sm text-gray-400">
        No more posts to load
      </div>
    );
  }

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
            {hasMore && enabled ? 'Loading more...' : ''}
          </div>
        )
      )}
    </div>
  );
};

export default InfiniteScrollTrigger;

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

// Image cache to prevent re-loading images
const ImageCache = new Map();

const ProgressiveImage = ({
  thumbnailUrl,
  fullUrl,
  alt = '',
  className = '',
  priority = 'normal', // 'critical', 'high', 'normal', 'low'
  lazyLoad = true,
  useThumbnail = true,
  size = 'medium',
  style = {},
  onLoad,
  onError,
  ...props
}) => {
  const [loadState, setLoadState] = useState('idle'); // idle, thumbnail, loading, loaded, error
  const [currentSrc, setCurrentSrc] = useState(null);
  const imgRef = useRef(null);
  const observerRef = useRef(null);
  const [isIntersecting, setIsIntersecting] = useState(!lazyLoad);

  // Determine which URL to use
  const actualThumbnailUrl = useThumbnail && thumbnailUrl ? thumbnailUrl : null;
  const targetUrl = fullUrl || thumbnailUrl;

  // Get image size variations
  const getImageUrl = useCallback((url, targetSize) => {
    if (!url) return null;
    
    // If we have thumbnail and target is small, use thumbnail
    if (actualThumbnailUrl && (targetSize === 'small' || targetSize === 'thumbnail')) {
      return actualThumbnailUrl;
    }
    
    return url;
  }, [actualThumbnailUrl]);

  // Load image with priority and caching
  const loadImage = useCallback((url, isPriority = false) => {
    if (!url || ImageCache.has(url)) {
      if (ImageCache.has(url)) {
        setCurrentSrc(url);
        setLoadState('loaded');
      }
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      // Set loading priority
      if (isPriority) {
        img.fetchPriority = priority === 'critical' ? 'high' : priority;
        img.loading = priority === 'critical' ? 'eager' : 'lazy';
      } else {
        img.fetchPriority = 'low';
        img.loading = 'lazy';
      }

      img.onload = () => {
        ImageCache.set(url, true);
        setCurrentSrc(url);
        setLoadState('loaded');
        onLoad?.(url);
        resolve();
      };

      img.onerror = () => {
        console.warn(`Failed to load image: ${url}`);
        setLoadState('error');
        onError?.(url);
        reject(new Error(`Failed to load image: ${url}`));
      };

      img.src = url;
    });
  }, [priority, onLoad, onError]);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (!lazyLoad) {
      setIsIntersecting(true);
      return;
    }

    const element = imgRef.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsIntersecting(true);
          observerRef.current?.disconnect();
        }
      },
      {
        rootMargin: priority === 'critical' ? '50px' : '100px', // Load critical images sooner
        threshold: 0.1,
      }
    );

    observerRef.current.observe(element);

    return () => {
      observerRef.current?.disconnect();
    };
  }, [lazyLoad, priority]);

  // Progressive loading logic
  useEffect(() => {
    if (!isIntersecting || !targetUrl) return;

    const loadProgressive = async () => {
      try {
        // Step 1: Load thumbnail first if available
        if (actualThumbnailUrl && actualThumbnailUrl !== targetUrl) {
          setLoadState('loading');
          await loadImage(actualThumbnailUrl, priority === 'critical');
          setLoadState('thumbnail');
        }

        // Step 2: Load full resolution
        if (targetUrl) {
          setLoadState('loading');
          await loadImage(targetUrl, priority === 'critical' || priority === 'high');
        }
      } catch (error) {
        console.error('Progressive loading failed:', error);
        setLoadState('error');
      }
    };

    loadProgressive();
  }, [isIntersecting, targetUrl, actualThumbnailUrl, loadImage, priority]);

  // Cleanup
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const renderPlaceholder = () => (
    <div 
      className={`bg-gray-100 animate-pulse flex items-center justify-center ${className}`}
      style={style}
    >
      <div className="w-8 h-8 bg-gray-200 rounded"></div>
    </div>
  );

  const renderError = () => (
    <div 
      className={`bg-gray-100 flex items-center justify-center ${className}`}
      style={style}
    >
      <div className="text-center text-gray-400 p-4">
        <div className="text-xs">Failed to load</div>
        <button 
          onClick={() => {
            setLoadState('idle');
            setIsIntersecting(true);
          }}
          className="text-xs text-blue-500 mt-1"
        >
          Retry
        </button>
      </div>
    </div>
  );

  if (loadState === 'error') {
    return renderError();
  }

  if (loadState === 'idle' || !isIntersecting) {
    return <div ref={imgRef}>{renderPlaceholder()}</div>;
  }

  return (
    <div ref={imgRef} className="relative">
      {/* Placeholder while loading */}
      {loadState === 'loading' && !currentSrc && renderPlaceholder()}
      
      {/* Image */}
      {currentSrc && (
        <motion.img
          src={currentSrc}
          alt={alt}
          className={className}
          style={style}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          {...props}
        />
      )}
      
      {/* Loading indicator for full res upgrade */}
      {loadState === 'loading' && currentSrc && actualThumbnailUrl && (
        <div className="absolute inset-0 bg-white bg-opacity-20 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

export default ProgressiveImage;

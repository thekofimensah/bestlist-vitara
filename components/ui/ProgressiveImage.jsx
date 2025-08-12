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
  onLoadStateChange, // New callback to track load state changes
  postId, // Post ID for tracking
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
  
  // Debug: Log the URLs being passed to the component (reduced frequency)
  if (Math.random() < 0.1) { // 10% frequency to reduce noise
    console.log('🖼️ [ProgressiveImage] URLs sample:', postId?.substring(0, 8), JSON.stringify({
      thumbnailUrl: thumbnailUrl ? (thumbnailUrl.startsWith('data:') ? 'DATA_URL' : 'HTTPS_URL') : 'MISSING',
      fullUrl: fullUrl ? (fullUrl.startsWith('data:') ? 'DATA_URL' : 'HTTPS_URL') : 'MISSING', 
      targetUrl: targetUrl ? (targetUrl.startsWith('data:') ? 'DATA_URL' : 'HTTPS_URL') : 'MISSING',
      priority
    }));
  }

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
    if (!url) {
      console.log('⚠️ [ProgressiveImage] No URL provided for postId:', postId);
      return Promise.resolve();
    }
    
    if (ImageCache.has(url)) {
      console.log('📦 [ProgressiveImage] Loading from cache:', url.substring(0, 50) + '...');
      setCurrentSrc(url);
      setLoadState('loaded');
      onLoadStateChange?.(postId, 'loaded');
      return Promise.resolve();
    }
    
    console.log('🔄 [ProgressiveImage] Loading new image:', url.substring(0, 50) + '...');

    return new Promise((resolve, reject) => {
      const img = new Image();
      
      // Set CORS for Supabase storage URLs
      if (url.includes('supabase')) {
        img.crossOrigin = 'anonymous';
      }
      
      // Set loading priority
      if (isPriority) {
        img.fetchPriority = priority === 'critical' ? 'high' : priority;
        img.loading = priority === 'critical' ? 'eager' : 'lazy';
      } else {
        img.fetchPriority = 'low';
        img.loading = 'lazy';
      }

      img.onload = () => {
        console.log('✅ [ProgressiveImage] Image loaded successfully:', url.substring(0, 50) + '...');
        ImageCache.set(url, true);
        setCurrentSrc(url);
        setLoadState('loaded');
        onLoad?.(url);
        onLoadStateChange?.(postId, 'loaded');
        resolve();
      };

      img.onerror = () => {
        console.warn('❌ [ProgressiveImage] Failed to load image:', url.substring(0, 50) + '...');
        setLoadState('error');
        onError?.(url);
        onLoadStateChange?.(postId, 'error');
        reject(new Error(`Failed to load image: ${url}`));
      };

      img.src = url;
    });
  }, [priority, onLoad, onError, onLoadStateChange, postId]);

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
        // Handle data URLs (Base64 images) - they don't need HTTP loading
        if (targetUrl.startsWith('data:')) {
          console.log('📦 [ProgressiveImage] Data URL detected, showing immediately:', targetUrl.substring(0, 50) + '...');
          setCurrentSrc(targetUrl);
          setLoadState('loaded');
          onLoadStateChange?.(postId, 'loaded');
          return;
        }

        // Fast-path for Supabase public storage URLs (fixes webview/CORS quirks)
        if (targetUrl.includes('/storage/v1/object/public/photos/')) {
          setCurrentSrc(targetUrl);
          setLoadState('loaded');
          onLoadStateChange?.(postId, 'loaded');
          return;
        }

        // For other HTTPS URLs, use progressive loading
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
  }, [isIntersecting, targetUrl, actualThumbnailUrl, loadImage, priority, onLoadStateChange, postId]);

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

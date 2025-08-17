import React, { useState, useCallback, useEffect } from 'react';
import { generateImageSizes, preloadImage } from '../../lib/imageStorage';
import { getLocalFirstUrl, getCachedLocalUrl } from '../../lib/localImageCache';

/**
 * Smart Image component that uses thumbnails for performance and full resolution on demand
 * @param {string} src - Image URL (can be storage URL or base64)
 * @param {string} alt - Alt text
 * @param {string} className - CSS classes
 * @param {object} style - Inline styles
 * @param {function} onClick - Click handler
 * @param {boolean} useThumbnail - Whether to use thumbnail by default
 * @param {string} size - Size variant (thumbnail, small, medium, large, original)
 * @param {boolean} lazyLoad - Whether to lazy load
 * @param {function} onLoad - Load handler
 * @param {object} ...props - Other props
 */
const SmartImage = ({ 
  src, 
  alt, 
  className = '', 
  style = {}, 
  onClick,
  useThumbnail = true,
  size = 'thumbnail',
  lazyLoad = true,
  onLoad,
  useLocalCache = true, // Enable local caching by default
  ...props 
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [fullResLoaded, setFullResLoaded] = useState(false);
  const [localOverrideSrc, setLocalOverrideSrc] = useState(null);
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false;

  // Try local-first resolution for remote URLs (background cache otherwise)
  useEffect(() => {
    let cancelled = false;
    const resolveLocal = async () => {
      try {
        if (!useLocalCache || !src || src.startsWith('data:') || src.startsWith('file:')) return;
        
        // For offline mode, try to get cached version immediately
        if (offline) {
          const cached = await getCachedLocalUrl(src);
          if (cached && !cancelled) {
            console.log('🔌 [SmartImage] Using offline cached image:', src.substring(0, 50) + '...');
            setLocalOverrideSrc(cached);
            return;
          }
        }
        
        // For online mode, try local first, then cache remote in background
        const local = await getLocalFirstUrl(src, undefined, (cached) => {
          if (!cancelled) {
            console.log('📦 [SmartImage] Cached image ready:', src.substring(0, 50) + '...');
            setLocalOverrideSrc(cached);
          }
        });
        
        if (local && !cancelled) {
          console.log('📦 [SmartImage] Using local cached image:', src.substring(0, 50) + '...');
          setLocalOverrideSrc(local);
        }
      } catch (error) {
        console.warn('Local cache resolution failed:', error);
      }
    };
    resolveLocal();
    return () => { cancelled = true; };
  }, [src, useLocalCache, offline]);

  // Determine which URL to use
  const getImageUrl = useCallback(() => {
    if (!src) return null;
    
    // Prefer local cache if available
    if (useLocalCache && localOverrideSrc) {
      return localOverrideSrc;
    }
    
    // If it's a base64 string, use as-is (legacy support)
    if (src.startsWith('data:')) {
      return src;
    }
    
    // If it's a storage URL, generate appropriate size
    if (src.includes('/storage/v1/object/public/photos/')) {
      const sizes = generateImageSizes(src);
      if (!sizes) return src;
      
      // Return appropriate size based on usage
      switch (size) {
        case 'thumbnail': return sizes.thumbnail;
        case 'small': return sizes.small;
        case 'medium': return sizes.medium;
        case 'large': return sizes.large;
        case 'original': return sizes.original;
        default: return useThumbnail ? sizes.thumbnail : sizes.original;
      }
    }
    
    // For other URLs, use as-is
    return src;
  }, [src, size, useThumbnail, useLocalCache, localOverrideSrc]);

  // Preload full resolution image on hover (for better UX)
  const handleMouseEnter = useCallback(async () => {
    if (!fullResLoaded && src && src.includes('/storage/v1/object/public/photos/')) {
      try {
        const sizes = generateImageSizes(src);
        if (sizes) {
          await preloadImage(sizes.large);
          setFullResLoaded(true);
        }
      } catch (error) {
        console.log('Preload failed:', error);
      }
    }
  }, [src, fullResLoaded]);

  const handleLoad = useCallback(() => {
    setImageLoaded(true);
    setImageError(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(async () => {
    console.warn('❌ [SmartImage] Image load failed:', src?.substring(0, 50) + '...');
    
    // Try to fall back to local cache if remote fails
    if (useLocalCache && src && !src.startsWith('data:') && !src.startsWith('file:') && !localOverrideSrc) {
      try {
        const cached = await getCachedLocalUrl(src);
        if (cached) {
          console.log('🔌 [SmartImage] Falling back to cached version:', src.substring(0, 50) + '...');
          setLocalOverrideSrc(cached);
          setImageError(false);
          return;
        }
      } catch (cacheError) {
        console.warn('Cache fallback failed:', cacheError);
      }
    }
    
    setImageError(true);
    setImageLoaded(false);
  }, [src, useLocalCache, localOverrideSrc]);

  const imageUrl = getImageUrl();

  if (!imageUrl || imageUrl === '') {
    return (
      <div 
        className={`bg-gray-200 flex items-center justify-center ${className}`}
        style={style}
        {...props}
      >
        <span className="text-gray-400 text-xs">No image</span>
      </div>
    );
  }

  if (imageError) {
    return (
      <div 
        className={`bg-gray-200 flex items-center justify-center ${className}`}
        style={style}
        {...props}
      >
        <span className="text-gray-400 text-xs">Failed to load</span>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Loading placeholder */}
      {!imageLoaded && (
        <div 
          className={`bg-gray-200 animate-pulse absolute inset-0 ${className}`}
          style={style}
        />
      )}
      
      {/* Actual image */}
      <img
        src={imageUrl}
        alt={alt}
        className={`transition-opacity duration-200 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        } ${className}`}
        style={style}
        onClick={onClick}
        onLoad={handleLoad}
        onError={handleError}
        onMouseEnter={handleMouseEnter}
        loading={lazyLoad ? 'lazy' : 'eager'}
        {...props}
      />
    </div>
  );
};

export default SmartImage;
import { useState, useEffect, useCallback, useRef } from 'react';
import { getOptimizedFeedPosts, getOptimizedFeedPostsLoadMore, getOptimizedUserPosts } from '../lib/supabase';
import { trackFeedRequest, trackFeedPhase, trackImageLoadingPhase } from '../lib/performanceTracking';

// Connection quality detection (browser-only fallback)
const getConnectionQuality = () => {
  if (!navigator.connection) return 'unknown';
  
  const { effectiveType, downlink } = navigator.connection;
  
  if (effectiveType === '4g' && downlink > 2) return 'fast';
  if (effectiveType === '4g' || downlink > 1) return 'good';
  if (effectiveType === '3g' || downlink > 0.5) return 'slow';
  return 'very-slow';
};

// Adaptive loading configuration
const getLoadingConfig = (connectionQuality) => {
  switch (connectionQuality) {
    case 'fast':
      return {
        batchSize: 8,
        enablePreload: true,
        maxConcurrentImages: 4,
        rootMargin: '200px'
      };
    case 'good':
      return {
        batchSize: 8,
        enablePreload: true,
        maxConcurrentImages: 4,
        rootMargin: '150px'
      };
    case 'slow':
      return {
        batchSize: 5,
        enablePreload: false,
        maxConcurrentImages: 2,
        rootMargin: '100px'
      };
    default:
      return {
        batchSize: 3,
        enablePreload: false,
        maxConcurrentImages: 1,
        rootMargin: '50px'
      };
  }
};

export const useOptimizedFeed = (feedType = 'following', options = {}) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);
  const [offset, setOffset] = useState(0);
  const [imageLoadStates, setImageLoadStates] = useState({});
  const [textLoaded, setTextLoaded] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  // Network quality (starts with browser fallback, then upgraded via Capacitor Network if available)
  const [connectionQuality, setConnectionQuality] = useState(getConnectionQuality());
  
  const config = getLoadingConfig(connectionQuality);
  const batchSize = options.batchSize || config.batchSize;
  
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);

  // Update image load state and check if all images are loaded
  const updateImageLoadState = useCallback((postId, state) => {
    setImageLoadStates(prev => {
      const newStates = {
        ...prev,
        [postId]: state
      };
      
      // Check if all images are loaded
      const allStates = Object.values(newStates);
      const loadedCount = allStates.filter(s => s === 'loaded').length;
      const errorCount = allStates.filter(s => s === 'error').length;
      const totalImages = allStates.length;
      
      // If all images are either loaded or errored, consider image phase complete
      if (loadedCount + errorCount === totalImages && totalImages > 0 && !imagesLoaded) {
        setImagesLoaded(true);
        trackImageLoadingPhase('feed', 'complete', totalImages);
        trackFeedPhase('feed', 'images_loaded', { 
          imageCount: totalImages,
          loadedCount,
          errorCount 
        });
      }
      
      return newStates;
    });
  }, [imagesLoaded]);

  // Upgrade network quality detection using Capacitor Network if available
  useEffect(() => {
    let cancelled = false;
    const upgradeFromCapacitor = async () => {
      try {
        // Avoid bundling error if plugin not installed
        const cap = window.Capacitor || window.CapacitorPlugins || null;
        if (!cap) return;
        const { Network } = await import('@capacitor/network');
        const status = await Network.getStatus();
        // status.connectionType: 'wifi' | 'cellular' | 'none' | 'unknown'
        // No effectiveType; classify conservatively
        let quality = 'unknown';
        if (status.connectionType === 'wifi') quality = 'fast';
        else if (status.connectionType === 'cellular') quality = 'good';
        else if (status.connectionType === 'none') quality = 'very-slow';
        if (!cancelled && quality && quality !== connectionQuality) {
          setConnectionQuality(quality);
        }
      } catch (_) {
        // ignore
      }
    };
    upgradeFromCapacitor();
    return () => { cancelled = true; };
  }, []);

  // Load initial feed
  const loadInitialFeed = useCallback(async () => {
    if (loadingRef.current) return;
    
    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      
      // Track the optimized feed request
      const result = await trackFeedRequest(
        'feed',
        'initial_load',
        () => getOptimizedFeedPosts(feedType, batchSize, 0),
        batchSize,
        0
      );
      
      const { data, error: feedError } = result;
      
      if (!mountedRef.current) return;
      
      if (feedError) {
        setError(feedError);
        return;
      }
      
      const newPosts = data || [];
      
      // 🎯 TEXT PHASE: Data is loaded, text can be displayed immediately
      trackFeedPhase('feed', 'text_loaded', { 
        postCount: newPosts.length,
        hasText: newPosts.every(p => p.item_name || p.snippet)
      });
      
      setPosts(newPosts);
      setOffset(newPosts.length);
      setHasMore(newPosts.length === batchSize);
      setTextLoaded(true);
      

      
      // Initialize image load states and start image loading phase
      const initialImageStates = {};
      newPosts.forEach(post => {
        initialImageStates[post.id] = 'idle';
      });
      setImageLoadStates(initialImageStates);
      
      // 🖼️ IMAGE PHASE: Start tracking image loading
      const imagesWithUrls = newPosts.filter(p => p.image).length;
      if (imagesWithUrls > 0) {
        trackImageLoadingPhase('feed', 'start', imagesWithUrls);
      } else {
        setImagesLoaded(true);
        trackFeedPhase('feed', 'images_loaded', { imageCount: 0, reason: 'no_images' });
      }
      
    } catch (err) {
      console.error('Feed loading error:', err);
      if (mountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        loadingRef.current = false;
        

      } else {
        console.log('⚠️ [useOptimizedFeed] Component unmounted, skipping setLoading(false)');
      }
    }
  }, [feedType, batchSize]);

  // Load more posts
  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore || loadingMore) return;
    
    try {
      loadingRef.current = true;
      setLoadingMore(true);
      
      // Track the optimized load more request
      const result = await trackFeedRequest(
        'feed',
        'load_more',
        () => getOptimizedFeedPostsLoadMore(feedType, batchSize, offset),
        batchSize,
        offset
      );
      
      const { data, error: feedError } = result;
      
      if (!mountedRef.current) return;
      
      if (feedError) {
        console.error('Load more error:', feedError);
        return;
      }
      
      const newPosts = data || [];
      
      setPosts(prev => {
        // Prevent duplicates
        const existingIds = new Set(prev.map(p => p.id));
        const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p.id));
        return [...prev, ...uniqueNewPosts];
      });
      
      setOffset(prev => prev + newPosts.length);
      setHasMore(newPosts.length === batchSize);
      
      // Add image load states for new posts
      const newImageStates = {};
      newPosts.forEach(post => {
        newImageStates[post.id] = 'idle';
      });
      setImageLoadStates(prev => ({ ...prev, ...newImageStates }));
      
    } catch (err) {
      console.error('Load more error:', err);
    } finally {
      if (mountedRef.current) {
        setLoadingMore(false);
        loadingRef.current = false;
      }
    }
  }, [feedType, batchSize, offset, hasMore, loadingMore]);

  // Refresh feed (separate from initial load for proper tracking)
  const refresh = useCallback(async () => {
    if (loadingRef.current) return;
    
    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      
      // Reset states
      setOffset(0);
      setPosts([]);
      setImageLoadStates({});
      setTextLoaded(false);
      setImagesLoaded(false);
      
      // Track the refresh request (different from initial_load)
      const result = await trackFeedRequest(
        'feed',
        'refresh', // ← This is the key difference
        () => getOptimizedFeedPosts(feedType, batchSize, 0),
        batchSize,
        0
      );
      
      const { data, error: feedError } = result;
      
      if (!mountedRef.current) return;
      
      if (feedError) {
        setError(feedError);
        return;
      }
      
      const newPosts = data || [];
      
      // TEXT PHASE: Data is loaded
      trackFeedPhase('feed', 'text_loaded', { 
        postCount: newPosts.length,
        hasText: newPosts.every(p => p.item_name || p.snippet)
      });
      
      setPosts(newPosts);
      setOffset(newPosts.length);
      setHasMore(newPosts.length === batchSize);
      setTextLoaded(true);
      
      // Initialize image load states
      const initialImageStates = {};
      newPosts.forEach(post => {
        initialImageStates[post.id] = 'idle';
      });
      setImageLoadStates(initialImageStates);
      
      // IMAGE PHASE: Start tracking image loading
      const imagesWithUrls = newPosts.filter(p => p.image).length;
      if (imagesWithUrls > 0) {
        trackImageLoadingPhase('feed', 'start', imagesWithUrls);
      } else {
        setImagesLoaded(true);
        trackFeedPhase('feed', 'images_loaded', { imageCount: 0, reason: 'no_images' });
      }
      
    } catch (err) {
      console.error('Feed refresh error:', err);
      if (mountedRef.current) {
        setError(err.message);
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        loadingRef.current = false;
      }
    }
  }, [feedType, batchSize]);

  // Load initial feed on mount and type change
  useEffect(() => {
    mountedRef.current = true;
    loadInitialFeed();
    
    return () => {
      mountedRef.current = false;
    };
  }, [loadInitialFeed]);

  // Only log critical state changes 
  useEffect(() => {
    if (!loading && posts?.length > 0) {
      console.log('✅ [useOptimizedFeed] Feed loaded successfully:', JSON.stringify({
        postsCount: posts.length,
        hasMore,
        timestamp: performance.now().toFixed(2) + 'ms'
      }));
    }
  }, [loading, posts?.length, hasMore]);

  return {
    posts,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    imageLoadStates,
    updateImageLoadState,
    connectionQuality,
    config,
    textLoaded,
    imagesLoaded
  };
};

export const useProfilePosts = (userId) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  
  const connectionQuality = getConnectionQuality();
  const config = getLoadingConfig(connectionQuality);
  const batchSize = config.batchSize;
  
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);

  const loadInitialPosts = useCallback(async () => {
    if (!userId || loadingRef.current) return;
    
    try {
      loadingRef.current = true;
      setLoading(true);
      
      // Track the profile request
      const result = await trackFeedRequest(
        'profile',
        'initial_load',
        () => getOptimizedUserPosts(userId, batchSize, 0),
        batchSize,
        0
      );
      
      const { data } = result;
      
      if (!mountedRef.current) return;
      
      const newPosts = data || [];
      setPosts(newPosts);
      setOffset(newPosts.length);
      setHasMore(newPosts.length === batchSize);
      
    } catch (err) {
      console.error('Profile posts loading error:', err);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        loadingRef.current = false;
      }
    }
  }, [userId, batchSize]);

  const loadMore = useCallback(async () => {
    if (!userId || loadingRef.current || !hasMore || loadingMore) return;
    
    try {
      loadingRef.current = true;
      setLoadingMore(true);
      
      // Track the profile load more request
      const result = await trackFeedRequest(
        'profile',
        'load_more',
        () => getOptimizedUserPosts(userId, batchSize, offset),
        batchSize,
        offset
      );
      
      const { data } = result;
      
      if (!mountedRef.current) return;
      
      const newPosts = data || [];
      setPosts(prev => [...prev, ...newPosts]);
      setOffset(prev => prev + newPosts.length);
      setHasMore(newPosts.length === batchSize);
      
    } catch (err) {
      console.error('Load more profile posts error:', err);
    } finally {
      if (mountedRef.current) {
        setLoadingMore(false);
        loadingRef.current = false;
      }
    }
  }, [userId, batchSize, offset, hasMore, loadingMore]);

  const refresh = useCallback(async () => {
    setOffset(0);
    setPosts([]);
    await loadInitialPosts();
  }, [loadInitialPosts]);

  useEffect(() => {
    mountedRef.current = true;
    loadInitialPosts();
    
    return () => {
      mountedRef.current = false;
    };
  }, [loadInitialPosts]);

  return {
    posts,
    loading,
    loadingMore,
    hasMore,
    totalCount,
    loadMore,
    refresh
  };
};

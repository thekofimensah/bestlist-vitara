import { useState, useEffect, useCallback, useRef } from 'react';
import { getFeedPosts } from '../lib/supabase';

// Connection quality detection
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
        batchSize: 12,
        enablePreload: true,
        maxConcurrentImages: 6,
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
  
  const connectionQuality = getConnectionQuality();
  const config = getLoadingConfig(connectionQuality);
  const batchSize = options.batchSize || config.batchSize;
  
  const loadingRef = useRef(false);
  const mountedRef = useRef(true);

  // Update image load state
  const updateImageLoadState = useCallback((postId, state) => {
    setImageLoadStates(prev => ({
      ...prev,
      [postId]: state
    }));
  }, []);

  // Load initial feed
  const loadInitialFeed = useCallback(async () => {
    if (loadingRef.current) return;
    
    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      
      console.log(`🔄 Loading initial ${feedType} feed (batch: ${batchSize})`);
      const startTime = performance.now();
      
      const { data, error: feedError } = await getFeedPosts(feedType, batchSize, 0);
      
      const loadTime = performance.now() - startTime;
      console.log(`✅ Feed loaded in ${loadTime.toFixed(2)}ms`);
      
      if (!mountedRef.current) return;
      
      if (feedError) {
        setError(feedError);
        return;
      }
      
      const newPosts = data || [];
      setPosts(newPosts);
      setOffset(newPosts.length);
      setHasMore(newPosts.length === batchSize);
      
      // Initialize image load states
      const initialImageStates = {};
      newPosts.forEach(post => {
        initialImageStates[post.id] = 'idle';
      });
      setImageLoadStates(initialImageStates);
      
    } catch (err) {
      console.error('Feed loading error:', err);
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

  // Load more posts
  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore || loadingMore) return;
    
    try {
      loadingRef.current = true;
      setLoadingMore(true);
      
      console.log(`🔄 Loading more ${feedType} posts (offset: ${offset})`);
      
      const { data, error: feedError } = await getFeedPosts(feedType, batchSize, offset);
      
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

  // Refresh feed
  const refresh = useCallback(async () => {
    setOffset(0);
    setPosts([]);
    setImageLoadStates({});
    await loadInitialFeed();
  }, [loadInitialFeed]);

  // Load initial feed on mount and type change
  useEffect(() => {
    mountedRef.current = true;
    loadInitialFeed();
    
    return () => {
      mountedRef.current = false;
    };
  }, [loadInitialFeed]);

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
    config
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
      
      // Import getUserPosts dynamically to avoid circular imports
      const { getUserPosts } = await import('../lib/supabase');
      const { data } = await getUserPosts(userId, batchSize, 0);
      
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
      
      const { getUserPosts } = await import('../lib/supabase');
      const { data } = await getUserPosts(userId, batchSize, offset);
      
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

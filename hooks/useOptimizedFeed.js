import { useState, useEffect, useCallback, useRef } from 'react';
import { getOptimizedFeedPosts, getOptimizedFeedPostsLoadMore, getOptimizedUserPosts } from '../lib/supabase';
import { trackFeedRequest, trackFeedPhase, trackImageLoadingPhase } from '../lib/performanceTracking';

// Simple in-memory cache for profile posts to avoid refetching on navigation
// Map<userId, { posts: any[], hasMore: boolean, offset: number, lastUpdated: number }>
const profilePostsCache = new Map();
// In-memory cache for feed posts by feedType (e.g., 'following')
// Map<feedType, { posts: any[], hasMore: boolean, offset: number, lastUpdated: number }>
const feedPostsCache = new Map();
const FEED_CACHE_MAX_POSTS = 300;
// Simple offline detector (Capacitor-aware would be nicer, but this is safe & synchronous)
const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;
const isAppActive = () => (typeof window !== 'undefined' && window.__APP_ACTIVE__ !== false);


// Helper to deduplicate by id
const dedupeById = (posts) => {
  const seen = new Set();
  const result = [];
  for (const p of posts) {
    const id = p?.id;
    if (id == null || seen.has(id)) continue;
    seen.add(id);
    result.push(p);
  }
  return result;
};

// Public API to allow other parts of the app to prepend a newly created post
export const prependProfilePost = (userId, post) => {
  if (!userId || !post) return;
  const cached = profilePostsCache.get(userId) || { posts: [], hasMore: true, offset: 0, lastUpdated: 0 };
  // Prepend and dedupe
  const updated = dedupeById([post, ...cached.posts]);
  const newCache = {
    ...cached,
    posts: updated,
    offset: Math.max(updated.length, cached.offset),
    lastUpdated: Date.now()
  };
  profilePostsCache.set(userId, newCache);
};

// Remove posts from cache by item IDs (used on deletion)
export const removeProfilePostsByItemIds = (userId, itemIds = []) => {
  if (!userId || !Array.isArray(itemIds) || itemIds.length === 0) return;
  const cached = profilePostsCache.get(userId);
  if (!cached || !cached.posts) return;
  const toRemove = new Set(itemIds);
  const filtered = cached.posts.filter(p => !p?.items?.id || !toRemove.has(p.items.id));
  profilePostsCache.set(userId, {
    ...cached,
    posts: filtered,
    offset: Math.min(cached.offset, filtered.length),
    lastUpdated: Date.now()
  });
};

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
        batchSize: 4,
        enablePreload: false,
        maxConcurrentImages: 2,
        rootMargin: '100px'
      };
    default:
      return {
        batchSize: 4,
        enablePreload: false,
        maxConcurrentImages: 2,
        rootMargin: '50px'
      };
  }
};

export const useOptimizedFeed = (feedType = 'following', options = {}) => {
  const [posts, setPosts] = useState([]);
  const initialFeedCached = feedPostsCache.get(feedType);
  const [loading, setLoading] = useState(!(initialFeedCached && initialFeedCached.posts && initialFeedCached.posts.length > 0));
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
    if (!isAppActive()) return; // avoid background fetch spam
    
    try {
      loadingRef.current = true;
      // Serve from cache first if present
      const cached = feedPostsCache.get(feedType);
      if (cached && cached.posts && cached.posts.length > 0) {
        setPosts(cached.posts);
        setOffset(cached.offset || cached.posts.length);
        setHasMore(typeof cached.hasMore === 'boolean' ? cached.hasMore : true);
        setTextLoaded(true);
        setLoading(false);
        // Revalidate in background when online
        if (!isOffline() && isAppActive()) {
          const result = await trackFeedRequest(
            'feed',
            'revalidate',
            () => getOptimizedFeedPosts(feedType, batchSize, 0),
            batchSize,
            0
          );
          const { data, error: feedError } = result;
          if (!mountedRef.current) return;
          if (!feedError && Array.isArray(data)) {
            setPosts(prev => {
              const merged = dedupeById([...data, ...prev]).slice(0, FEED_CACHE_MAX_POSTS);
              feedPostsCache.set(feedType, {
                posts: merged,
                hasMore: merged.length === batchSize || prev.length > batchSize,
                offset: merged.length,
                lastUpdated: Date.now()
              });
              setOffset(merged.length);
              setHasMore(merged.length === batchSize || prev.length > batchSize);
              return merged;
            });
          }
        }
        return;
      }

      setLoading(true);
      setError(null);
      if (isOffline() || !isAppActive()) {
        setLoading(false);
        loadingRef.current = false;
        // Notify UI we need to be online for non-cached content
        try { window.dispatchEvent(new CustomEvent('feed:offline-required', { detail: { reason: 'initial' } })); } catch (_) {}
        return;
      }

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
      
      const capped = newPosts.slice(0, FEED_CACHE_MAX_POSTS);
      setPosts(capped);
      setOffset(capped.length);
      setHasMore(capped.length === batchSize);
      setTextLoaded(true);

      // Update feed cache
      feedPostsCache.set(feedType, {
        posts: capped,
        hasMore: capped.length === batchSize,
        offset: capped.length,
        lastUpdated: Date.now()
      });

      // Initialize image load states and start image loading phase
      const initialImageStates = {};
      capped.forEach(post => {
        initialImageStates[post.id] = 'idle';
      });
      setImageLoadStates(initialImageStates);
      
      // 🖼️ IMAGE PHASE: Start tracking image loading
      const imagesWithUrls = capped.filter(p => p.image).length;
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
    if (isOffline() || !isAppActive()) {
      try { window.dispatchEvent(new CustomEvent('feed:offline-required', { detail: { reason: 'load_more' } })); } catch (_) {}
      return;
    }
    
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
        // Prevent duplicates and cap cache size; purge older first
        const existingIds = new Set(prev.map(p => p.id));
        const uniqueNewPosts = newPosts.filter(p => !existingIds.has(p.id));
        const merged = dedupeById([...prev, ...uniqueNewPosts]).slice(0, FEED_CACHE_MAX_POSTS);
        feedPostsCache.set(feedType, {
          posts: merged,
          hasMore: newPosts.length === batchSize,
          offset: offset + newPosts.length,
          lastUpdated: Date.now()
        });
        return merged;
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
    if (isOffline() || !isAppActive()) {
      try { window.dispatchEvent(new CustomEvent('feed:offline-required', { detail: { reason: 'refresh' } })); } catch (_) {}
      setLoading(false);
      return;
    }
    try {
      loadingRef.current = true;
      setLoading(true);
      setError(null);
      
      // Reset states (keep showing current posts until new arrive)
      setOffset(0);
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
      
      const capped = newPosts.slice(0, FEED_CACHE_MAX_POSTS);
      setPosts(prev => dedupeById([...capped, ...prev]).slice(0, FEED_CACHE_MAX_POSTS));
      setOffset(capped.length);
      setHasMore(capped.length === batchSize);
      feedPostsCache.set(feedType, {
        posts: dedupeById([...(feedPostsCache.get(feedType)?.posts || []), ...capped]).slice(0, FEED_CACHE_MAX_POSTS),
        hasMore: capped.length === batchSize,
        offset: capped.length,
        lastUpdated: Date.now()
      });
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
    
    // Serve from cache immediately if available (no network)
    const cached = profilePostsCache.get(userId);
    if (cached && cached.posts && cached.posts.length > 0) {
      setPosts(cached.posts);
      setOffset(cached.offset || cached.posts.length);
      setHasMore(typeof cached.hasMore === 'boolean' ? cached.hasMore : true);
      setLoading(false);
      // SWR: revalidate silently in background without clearing existing posts
      if (!isOffline()) {
        trackFeedRequest(
          'profile',
          'revalidate',
          () => getOptimizedUserPosts(userId, batchSize, 0),
          batchSize,
          0
        ).then(({ data }) => {
          if (!mountedRef.current) return;
          if (Array.isArray(data) && data.length > 0) {
            setPosts(prev => {
              const merged = dedupeById([...data, ...prev]);
              profilePostsCache.set(userId, {
                posts: merged,
                hasMore: merged.length >= prev.length ? (merged.length === batchSize) : true,
                offset: merged.length,
                lastUpdated: Date.now()
              });
              setOffset(merged.length);
              setHasMore(merged.length === batchSize || prev.length > batchSize);
              return merged;
            });
          }
        }).catch(() => {});
      }
      return; // Render cached immediately
    }
    
    try {
      loadingRef.current = true;
      setLoading(true);
      if (isOffline()) {
        // Offline: no fetch, just show what we have (likely none if cache empty)
        setLoading(false);
        loadingRef.current = false;
        return;
      }
      
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
      
      // Update cache
      profilePostsCache.set(userId, {
        posts: newPosts,
        hasMore: newPosts.length === batchSize,
        offset: newPosts.length,
        lastUpdated: Date.now()
      });
      
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
    if (isOffline()) return;
    
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
      setPosts(prev => {
        const merged = dedupeById([...prev, ...newPosts]);
        // Update cache
        profilePostsCache.set(userId, {
          posts: merged,
          hasMore: newPosts.length === batchSize,
          offset: (offset + newPosts.length),
          lastUpdated: Date.now()
        });
        return merged;
      });
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
    if (!userId || loadingRef.current) return;
    // Allow refresh to be called in offline mode so UI path is exercised,
    // but do not call network; keep existing posts as-is.
    try {
      loadingRef.current = true;
      setLoading(true);
      if (isOffline()) {
        // Offline: simulate quick refresh without fetching
        setLoading(false);
        loadingRef.current = false;
        return;
      }
      
      const result = await trackFeedRequest(
        'profile',
        'refresh',
        () => getOptimizedUserPosts(userId, batchSize, 0),
        batchSize,
        0
      );
      const { data } = result;
      if (!mountedRef.current) return;
      const newPosts = data || [];
      // Do not clear; merge to avoid flicker and keep thumbnails stable
      setPosts(prev => dedupeById([...newPosts, ...prev]));
      setOffset(newPosts.length);
      setHasMore(newPosts.length === batchSize);
      // Update cache
      profilePostsCache.set(userId, {
        posts: dedupeById([...newPosts, ...(profilePostsCache.get(userId)?.posts || [])]),
        hasMore: newPosts.length === batchSize,
        offset: newPosts.length,
        lastUpdated: Date.now()
      });
    } catch (err) {
      console.error('Profile refresh error:', err);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
        loadingRef.current = false;
      }
    }
  }, [userId, batchSize]);

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

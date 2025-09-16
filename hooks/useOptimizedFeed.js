import { useState, useEffect, useCallback, useRef } from 'react';
import { getOptimizedFeedPosts, getOptimizedFeedPostsLoadMore, getOptimizedUserPosts } from '../lib/supabase';
import { trackFeedRequest, trackFeedPhase, trackImageLoadingPhase } from '../lib/performanceTracking';
import { Preferences } from '@capacitor/preferences';
import { shouldLoadFromCacheOnly } from '../lib/onlineDetection';

// Simple in-memory cache for profile posts to avoid refetching on navigation
// Map<userId, { posts: any[], hasMore: boolean, offset: number, lastUpdated: number }>
const profilePostsCache = new Map();
// In-memory cache for feed posts by feedType (e.g., 'following')
// Map<feedType, { posts: any[], hasMore: boolean, offset: number, lastUpdated: number }>
const feedPostsCache = new Map();
// Offline posts cache for immediate display before sync
// Map<userId, { posts: any[] }>
const offlinePostsCache = new Map();
const FEED_CACHE_MAX_POSTS = 300;
const MAX_CACHE_ENTRIES = 10; // Limit number of cached feeds/profiles to prevent memory leak
const CACHE_CLEANUP_INTERVAL = 60000; // Clean up every minute

// Cache cleanup functions to prevent memory leaks
const cleanupCache = (cache, maxEntries) => {
  if (cache.size > maxEntries) {
    const entries = Array.from(cache.entries());
    const toDelete = entries.slice(0, Math.floor(maxEntries / 2));
    toDelete.forEach(([key]) => cache.delete(key));
    console.log(`🧹 [FeedCache] Cleaned up ${toDelete.length} cache entries`);
  }
};

// Periodic cleanup
let cleanupTimer = null;
const startCacheCleanup = () => {
  if (!cleanupTimer) {
    cleanupTimer = setInterval(() => {
      cleanupCache(profilePostsCache, MAX_CACHE_ENTRIES);
      cleanupCache(feedPostsCache, MAX_CACHE_ENTRIES);
      cleanupCache(offlinePostsCache, MAX_CACHE_ENTRIES);
    }, CACHE_CLEANUP_INTERVAL);
  }
};

// Start cleanup on module load
startCacheCleanup();
// Simple offline detector (Capacitor-aware would be nicer, but this is safe & synchronous)
const isOffline = () => typeof navigator !== 'undefined' && navigator.onLine === false;
const isAppActive = () => (typeof window !== 'undefined' && window.__APP_ACTIVE__ !== false);

// Persistent cache functions for profile posts (similar to useUserStats pattern)
const PROFILE_POSTS_CACHE_KEY = (userId) => `profile_posts_${userId}`;
// Persistent cache functions for feed posts
const FEED_POSTS_CACHE_KEY = (feedType) => `feed_posts_${feedType}`;

const saveProfilePostsLocal = async (userId, cacheData) => {
  if (!userId || !cacheData) return;
  try {
    // Limit cache size to prevent OOM from large Capacitor bridge payloads
    const limitedCache = {
      ...cacheData,
      posts: cacheData.posts?.slice(0, 30) || [] // Limit to 30 posts max for profiles
    };
    
    const serialized = JSON.stringify(limitedCache);
    const sizeMB = (serialized.length / (1024 * 1024)).toFixed(2);
    
    // Don't save if payload is too large (>3MB)
    if (serialized.length > 3 * 1024 * 1024) {
      console.warn(`⚠️ [ProfileCache] Skipping save - payload too large: ${sizeMB}MB`);
      return;
    }
    
    await Preferences.set({ 
      key: PROFILE_POSTS_CACHE_KEY(userId), 
      value: serialized
    });
    console.log(`💾 [ProfileCache] Saved profile posts to persistent storage for userId: ${userId} (${sizeMB}MB, ${limitedCache.posts.length} posts)`);
  } catch (error) {
    console.warn('⚠️ [ProfileCache] Failed to save to persistent storage:', error);
  }
};

const getProfilePostsLocal = async (userId) => {
  if (!userId) return null;
  try {
    const { value } = await Preferences.get({ key: PROFILE_POSTS_CACHE_KEY(userId) });
    if (value) {
      const parsed = JSON.parse(value);
      console.log('📦 [ProfileCache] Loaded profile posts from persistent storage:', parsed.posts?.length || 0, 'posts');
      return parsed;
    }
  } catch (error) {
    console.warn('⚠️ [ProfileCache] Failed to load from persistent storage:', error);
  }
  return null;
};

// Feed posts persistent storage functions
const saveFeedPostsLocal = async (feedType, cacheData) => {
  if (!feedType || !cacheData) return;
  try {
    // Limit cache size to prevent OOM from large Capacitor bridge payloads
    const limitedCache = {
      ...cacheData,
      posts: cacheData.posts?.slice(0, 50) || [] // Limit to 50 posts max
    };
    
    const serialized = JSON.stringify(limitedCache);
    const sizeMB = (serialized.length / (1024 * 1024)).toFixed(2);
    
    // Don't save if payload is too large (>5MB)
    if (serialized.length > 5 * 1024 * 1024) {
      console.warn(`⚠️ [FeedCache] Skipping save - payload too large: ${sizeMB}MB`);
      return;
    }
    
    await Preferences.set({ 
      key: FEED_POSTS_CACHE_KEY(feedType), 
      value: serialized
    });
    console.log(`💾 [FeedCache] Saved feed posts to persistent storage for feedType: ${feedType} (${sizeMB}MB, ${limitedCache.posts.length} posts)`);
  } catch (error) {
    console.warn('⚠️ [FeedCache] Failed to save to persistent storage:', error);
  }
};

const getFeedPostsLocal = async (feedType) => {
  if (!feedType) return null;
  try {
    const { value } = await Preferences.get({ key: FEED_POSTS_CACHE_KEY(feedType) });
    if (value) {
      const parsed = JSON.parse(value);
      console.log('📦 [FeedCache] Loaded feed posts from persistent storage:', parsed.posts?.length || 0, 'posts for feedType:', feedType);
      return parsed;
    }
  } catch (error) {
    console.warn('⚠️ [FeedCache] Failed to load from persistent storage:', error);
  }
  return null;
};


// Helper to deduplicate by id and content
const dedupeById = (posts) => {
  const seen = new Set();
  const seenItems = new Set();
  const result = [];
  
  for (const p of posts) {
    const id = p?.id;
    const itemId = p?.items?.id || p?.item_id;
    const itemName = p?.items?.name || p?.items?.user_product_name;
    
    // Skip if we've seen this exact ID
    if (id != null && seen.has(id)) continue;
    
    // Skip offline posts if we have a real post with the same item
    if (p?.offline && itemName) {
      const itemKey = `${itemName}_${p?.items?.rating || 0}_${p?.lists?.id || ''}`;
      if (seenItems.has(itemKey)) continue;
      seenItems.add(itemKey);
    } else if (itemId && itemName) {
      // For real posts, track by item info to prevent duplicates
      const itemKey = `${itemName}_${p?.items?.rating || 0}_${p?.lists?.id || ''}`;
      seenItems.add(itemKey);
    }
    
    if (id != null) seen.add(id);
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
  // Save to persistent storage
  saveProfilePostsLocal(userId, newCache);
  // Notify listeners (e.g., useProfilePosts) that cache changed
  try { window.dispatchEvent(new CustomEvent('profile:posts-updated', { detail: { userId } })); } catch (_) {}
};

// Public API to add offline posts for immediate display
export const addOfflineProfilePost = (userId, item, listId, listName) => {
  if (!userId || !item) return;
  
  const offlinePost = {
    id: `offline_post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    user_id: userId,
    items: {
      ...item,
      pending_sync: true,
      offline: true
    },
    lists: {
      id: listId,
      name: listName || 'Unknown List'
    },
    created_at: new Date().toISOString(),
    pending_sync: true,
    offline: true
  };
  
  // Add to offline cache
  const offlineCached = offlinePostsCache.get(userId) || { posts: [] };
  const updatedOfflinePosts = dedupeById([offlinePost, ...offlineCached.posts]);
  offlinePostsCache.set(userId, { posts: updatedOfflinePosts });
  
  // Also add to main cache so it appears immediately
  const mainCached = profilePostsCache.get(userId) || { posts: [], hasMore: true, offset: 0, lastUpdated: 0 };
  const updated = dedupeById([offlinePost, ...mainCached.posts]);
  const newCache = {
    ...mainCached,
    posts: updated,
    offset: Math.max(updated.length, mainCached.offset),
    lastUpdated: Date.now()
  };
  profilePostsCache.set(userId, newCache);
  // Save to persistent storage
  saveProfilePostsLocal(userId, newCache);
  
  // Notify listeners
  try { window.dispatchEvent(new CustomEvent('profile:posts-updated', { detail: { userId } })); } catch (_) {}
  
  console.log('📱 [OfflineCache] Added offline post for item:', item.name || item.user_product_name || 'Unknown');
  return offlinePost.id;
};

// Public API to remove offline posts when they sync successfully
export const removeOfflineProfilePost = (userId, offlinePostId) => {
  if (!userId || !offlinePostId) return;
  
  // Remove from offline cache
  const offlineCached = offlinePostsCache.get(userId);
  if (offlineCached) {
    const filteredOffline = offlineCached.posts.filter(p => p.id !== offlinePostId);
    offlinePostsCache.set(userId, { posts: filteredOffline });
  }
  
  // Remove from main cache
  const mainCached = profilePostsCache.get(userId);
  if (mainCached) {
    const filteredMain = mainCached.posts.filter(p => p.id !== offlinePostId);
    const newCache = {
      ...mainCached,
      posts: filteredMain,
      offset: Math.min(mainCached.offset, filteredMain.length),
      lastUpdated: Date.now()
    };
    profilePostsCache.set(userId, newCache);
    // Save to persistent storage
    saveProfilePostsLocal(userId, newCache);
    
    // Notify listeners
    try { window.dispatchEvent(new CustomEvent('profile:posts-updated', { detail: { userId } })); } catch (_) {}
  }
  
  console.log('🧹 [OfflineCache] Removed offline post:', offlinePostId);
};

// Public API to clear all offline posts for a user (used after successful sync)
export const clearOfflinePostsForUser = (userId) => {
  if (!userId) return;
  
  // Clear offline cache
  offlinePostsCache.set(userId, { posts: [] });
  
  // Remove offline posts from main cache
  const mainCached = profilePostsCache.get(userId);
  if (mainCached) {
    const filteredMain = mainCached.posts.filter(p => !p.offline && !p.pending_sync);
    const newCache = {
      ...mainCached,
      posts: filteredMain,
      offset: Math.min(mainCached.offset, filteredMain.length),
      lastUpdated: Date.now()
    };
    profilePostsCache.set(userId, newCache);
    // Save to persistent storage
    saveProfilePostsLocal(userId, newCache);
    
    // Notify listeners
    try { window.dispatchEvent(new CustomEvent('profile:posts-updated', { detail: { userId } })); } catch (_) {}
  }
  
  console.log('🧹 [OfflineCache] Cleared all offline posts for user:', userId);
};

// Public API to update feed posts (used for immediate comment count updates)
export const updateFeedPosts = (feedType, updatedPosts) => {
  if (!feedType || !updatedPosts || !Array.isArray(updatedPosts)) return;
  
  const cached = feedPostsCache.get(feedType);
  if (cached) {
    // Update the cache with the new posts
    const newCache = {
      ...cached,
      posts: updatedPosts,
      lastUpdated: Date.now()
    };
    feedPostsCache.set(feedType, newCache);
    
    // Notify listeners that feed posts have been updated
    try { 
      window.dispatchEvent(new CustomEvent('feed:posts-updated', { 
        detail: { feedType, posts: updatedPosts } 
      })); 
    } catch (_) {}
    
    console.log('💬 [Feed Cache] Updated feed posts for:', feedType, 'Posts count:', updatedPosts.length);
  }
};

// Public API to remove posts from a specific user from feed cache (used when unfollowing)
export const removeUserPostsFromFeedCache = (feedType, userId) => {
  if (!feedType || !userId) return;
  
  const cached = feedPostsCache.get(feedType);
  if (!cached || !cached.posts) {
    console.log('🗑️ [Feed Cache] No cache found for feedType:', feedType);
    return;
  }
  
  console.log('🗑️ [Feed Cache] Before filtering - total posts:', cached.posts.length);
  console.log('🗑️ [Feed Cache] Looking to remove posts from userId:', userId);
  
  // Filter out posts from the unfollowed user
  const filteredPosts = cached.posts.filter(post => {
    // Try multiple possible fields where user ID might be stored
    const postUserId = post.profiles?.id || post.user_id || post.users?.id;
    const shouldKeep = postUserId !== userId;
    
    if (!shouldKeep) {
      console.log('🗑️ [Feed Cache] Removing post:', post.id, 'from user:', postUserId);
    }
    
    return shouldKeep;
  });
  
  console.log('🗑️ [Feed Cache] After filtering - remaining posts:', filteredPosts.length);
  
  const newCache = {
    ...cached,
    posts: filteredPosts,
    offset: Math.min(cached.offset, filteredPosts.length),
    lastUpdated: Date.now()
  };
  
  feedPostsCache.set(feedType, newCache);
  // Save to persistent storage
  saveFeedPostsLocal(feedType, newCache);
  
  // Notify listeners that cache changed
  try { 
    console.log('🗑️ [Feed Cache] Dispatching feed:posts-updated event for feedType:', feedType);
    window.dispatchEvent(new CustomEvent('feed:posts-updated', { 
      detail: { feedType, posts: filteredPosts } 
    })); 
  } catch (e) {
    console.error('🗑️ [Feed Cache] Error dispatching event:', e);
  }
  
  console.log('🗑️ [Feed Cache] Removed posts from user', userId, 'from', feedType, 'feed. Remaining posts:', filteredPosts.length);
};

// Remove posts from cache by item IDs (used on deletion)
export const removeProfilePostsByItemIds = (userId, itemIds = []) => {
  if (!userId || !Array.isArray(itemIds) || itemIds.length === 0) return;
  const cached = profilePostsCache.get(userId);
  if (!cached || !cached.posts) return;
  const toRemove = new Set(itemIds);
  const filtered = cached.posts.filter(p => !p?.items?.id || !toRemove.has(p.items.id));
  const newCache = {
    ...cached,
    posts: filtered,
    offset: Math.min(cached.offset, filtered.length),
    lastUpdated: Date.now()
  };
  profilePostsCache.set(userId, newCache);
  // Save to persistent storage
  saveProfilePostsLocal(userId, newCache);
  // Notify listeners (e.g., useProfilePosts) that cache changed
  try { window.dispatchEvent(new CustomEvent('profile:posts-updated', { detail: { userId } })); } catch (_) {}
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
      
      // Cleanup old image states to prevent memory leak (keep last 200)
      const stateEntries = Object.entries(newStates);
      if (stateEntries.length > 200) {
        const recentStates = Object.fromEntries(stateEntries.slice(-200));
        console.log(`🧹 [FeedImageStates] Cleaned up ${stateEntries.length - 200} old image states`);
        return recentStates;
      }
      
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
    console.log('🔄 [useOptimizedFeed] loadInitialFeed called for feedType:', feedType);
    if (loadingRef.current) {
      console.log('🔄 [useOptimizedFeed] loadInitialFeed skipped - already loading');
      return;
    }
    const appActive = isAppActive();
    console.log('🔄 [useOptimizedFeed] App active check:', appActive, 'window.__APP_ACTIVE__:', typeof window !== 'undefined' ? window.__APP_ACTIVE__ : 'undefined');
    
    if (!appActive) {
      console.log('🔄 [useOptimizedFeed] loadInitialFeed skipped - app not active');
      return; // avoid background fetch spam
    }
    
    try {
      loadingRef.current = true;
      
      // Check if we're in offline-first mode
      const cacheOnlyMode = shouldLoadFromCacheOnly();
      
      // STEP 1: Check in-memory cache first
      let cached = feedPostsCache.get(feedType);
      console.log('📦 [useOptimizedFeed] In-memory cache check for feedType:', feedType, 'found:', !!cached, 'posts:', cached?.posts?.length || 0);
      
      // STEP 2: If no in-memory cache, check persistent storage
      if (!cached || !cached.posts || cached.posts.length === 0) {
        console.log('📦 [useOptimizedFeed] Checking persistent storage for feedType:', feedType);
        const persistentCache = await getFeedPostsLocal(feedType);
        if (persistentCache && persistentCache.posts && persistentCache.posts.length > 0) {
          console.log('📦 [useOptimizedFeed] Found persistent cache for feedType:', feedType, 'posts:', persistentCache.posts.length);
          // Load persistent cache into in-memory cache
          feedPostsCache.set(feedType, persistentCache);
          cached = persistentCache;
        }
      }
      
      if (cached && cached.posts && cached.posts.length > 0) {
        console.log('📦 [useOptimizedFeed] Serving from cache:', cached.posts.length, 'posts for feedType:', feedType);
        setPosts(cached.posts);
        setOffset(cached.offset || cached.posts.length);
        setHasMore(typeof cached.hasMore === 'boolean' ? cached.hasMore : true);
        setTextLoaded(true);
        setLoading(false);
        // Skip revalidation if we're in cache-only mode
        if (!cacheOnlyMode && !isOffline() && isAppActive()) {
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
              const revalidateCache = {
                posts: merged,
                hasMore: merged.length === batchSize || prev.length > batchSize,
                offset: merged.length,
                lastUpdated: Date.now()
              };
              feedPostsCache.set(feedType, revalidateCache);
              // Save to persistent storage
              saveFeedPostsLocal(feedType, revalidateCache);
              setOffset(merged.length);
              setHasMore(merged.length === batchSize || prev.length > batchSize);
              return merged;
            });
          }
        }
        return;
      }

      // If in cache-only mode and no cache, just set empty state
      if (cacheOnlyMode) {
        console.log('📦 [useOptimizedFeed] Cache-only mode with no cache for feedType:', feedType, '- setting empty state');
        setPosts([]);
        setLoading(false);
        setTextLoaded(true);
        setHasMore(false);
        loadingRef.current = false;
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
      console.log('🔄 [useOptimizedFeed] Initial load got', newPosts.length, 'posts for feedType:', feedType);
      
      // 🎯 TEXT PHASE: Data is loaded, text can be displayed immediately
      trackFeedPhase('feed', 'text_loaded', { 
        postCount: newPosts.length,
        hasText: newPosts.every(p => p.item_name || p.snippet)
      });
      
      const capped = newPosts.slice(0, FEED_CACHE_MAX_POSTS);
      setPosts(capped);
      setOffset(capped.length);
      // Only set hasMore to false if we got fewer posts than requested AND we got some posts
      // If we got 0 posts initially, keep hasMore as true to avoid showing "no more posts" message
      setHasMore(capped.length === 0 ? true : capped.length === batchSize);
      setTextLoaded(true);

      // Update feed cache
      const newCache = {
        posts: capped,
        hasMore: capped.length === 0 ? true : capped.length === batchSize,
        offset: capped.length,
        lastUpdated: Date.now()
      };
      feedPostsCache.set(feedType, newCache);
      // Save to persistent storage
      saveFeedPostsLocal(feedType, newCache);

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
        const loadMoreCache = {
          posts: merged,
          hasMore: newPosts.length === batchSize,
          offset: offset + newPosts.length,
          lastUpdated: Date.now()
        };
        feedPostsCache.set(feedType, loadMoreCache);
        // Save to persistent storage
        saveFeedPostsLocal(feedType, loadMoreCache);
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
  const refresh = useCallback(async (silent = false) => {
    console.log('🔄 [useOptimizedFeed] Refresh called for feedType:', feedType, 'silent:', silent);
    if (loadingRef.current) {
      console.log('🔄 [useOptimizedFeed] Refresh skipped - already loading');
      return;
    }
    const offline = isOffline();
    const appActive = isAppActive();
    console.log('🔄 [useOptimizedFeed] Checking conditions - offline:', offline, 'appActive:', appActive, 'window.__APP_ACTIVE__:', typeof window !== 'undefined' ? window.__APP_ACTIVE__ : 'undefined');
    
    if (offline || !appActive) {
      console.log('🔄 [useOptimizedFeed] Refresh skipped - offline:', offline, 'or app not active:', !appActive);
      try { window.dispatchEvent(new CustomEvent('feed:offline-required', { detail: { reason: 'refresh' } })); } catch (_) {}
      setLoading(false);
      return;
    }
    try {
      loadingRef.current = true;
      // 🚀 OPTIMIZATION: Don't show loading screen for background/silent refreshes
      if (!silent) {
        setLoading(true);
      }
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
      console.log('🔄 [useOptimizedFeed] Refresh loaded', newPosts.length, 'posts for feedType:', feedType);
      
      // TEXT PHASE: Data is loaded
      trackFeedPhase('feed', 'text_loaded', { 
        postCount: newPosts.length,
        hasText: newPosts.every(p => p.item_name || p.snippet)
      });
      
      const capped = newPosts.slice(0, FEED_CACHE_MAX_POSTS);
      // For refresh, replace the posts completely instead of merging
      setPosts(capped);
      setOffset(capped.length);
      setHasMore(capped.length === batchSize);
      const refreshCache = {
        posts: capped,
        hasMore: capped.length === batchSize,
        offset: capped.length,
        lastUpdated: Date.now()
      };
      feedPostsCache.set(feedType, refreshCache);
      // Save to persistent storage
      saveFeedPostsLocal(feedType, refreshCache);
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
        // Only clear loading state if it was set (for non-silent refreshes)
        if (!silent) {
          setLoading(false);
        }
        loadingRef.current = false;
      }
    }
  }, [feedType, batchSize]);

  // Load initial feed on mount and type change
  useEffect(() => {
    mountedRef.current = true;
    console.log('🔄 [useOptimizedFeed] Feed type changed to:', feedType, '- loading initial feed');
    console.log('🔄 [useOptimizedFeed] Current posts before reset:', posts.length);

    // Clear current posts and reset state when feed type changes
    setPosts([]);
    setOffset(0);
    setHasMore(true);
    setError(null);
    setTextLoaded(false);
    setImagesLoaded(false);
    setImageLoadStates({});

    console.log('🔄 [useOptimizedFeed] State reset complete, calling loadInitialFeed');
    loadInitialFeed();

    // Listen for feed cache updates (e.g., comment count changes)
    const handleFeedUpdate = (event) => {
      console.log('🔄 [useOptimizedFeed] Received feed:posts-updated event:', {
        eventFeedType: event?.detail?.feedType,
        currentFeedType: feedType,
        postsCount: event?.detail?.posts?.length,
        eventDetail: event?.detail
      });
      
      if (event?.detail?.feedType === feedType && Array.isArray(event.detail.posts)) {
        console.log('💬 [useOptimizedFeed] Updating feed posts via cache - new count:', event.detail.posts.length);
        setPosts(event.detail.posts);
      } else {
        console.log('🚫 [useOptimizedFeed] Event ignored - feedType mismatch or invalid posts array');
      }
    };

    // Listen for unfollow events to force refresh of following feed cache only
    const handleUnfollowEvent = (event) => {
      console.log('🔄 [useOptimizedFeed] Received user:unfollowed event for current feedType:', feedType, 'event:', event?.detail);
      
      // Always refresh the "following" feed cache when someone is unfollowed
      // This ensures the following feed is updated even if we're currently viewing "for_you"
      const followingCache = feedPostsCache.get('following');
      if (followingCache) {
        console.log('🔄 [useOptimizedFeed] Clearing following feed cache after unfollow');
        // Clear the following feed cache to force a fresh load next time
        feedPostsCache.delete('following');
        // Also clear persistent storage
        try {
          saveFeedPostsLocal('following', { posts: [], hasMore: true, offset: 0, lastUpdated: Date.now() });
        } catch (e) {
          console.warn('Failed to clear following feed persistent cache:', e);
        }
      }
      
      // Only refresh the current feed if it's the following feed
      if (feedType === 'following') {
        console.log('🔄 [useOptimizedFeed] Current feed is following - forcing refresh');
        setTimeout(() => {
          refresh(true); // Silent refresh
        }, 200);
      } else {
        console.log('🔄 [useOptimizedFeed] Current feed is', feedType, '- not refreshing, only cleared following cache');
      }
    };

    try {
      window.addEventListener('feed:posts-updated', handleFeedUpdate);
      window.addEventListener('user:unfollowed', handleUnfollowEvent);
    } catch (_) {}

    return () => {
      mountedRef.current = false;
      try {
        window.removeEventListener('feed:posts-updated', handleFeedUpdate);
        window.removeEventListener('user:unfollowed', handleUnfollowEvent);
      } catch (_) {}
    };
  }, [loadInitialFeed, feedType]);

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

export const useProfilePosts = (userId, includePrivate = false) => {
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
    
    // Always include offline posts at the beginning
    const offlineCached = offlinePostsCache.get(userId);
    const offlinePosts = offlineCached?.posts || [];
    
    // STEP 1: Check in-memory cache first (fastest)
    const memoryCache = profilePostsCache.get(userId);
    if (memoryCache && memoryCache.posts && memoryCache.posts.length > 0) {
      console.log('📦 [ProfilePosts] Serving from memory cache:', memoryCache.posts.length, 'posts');
      // Merge offline posts with cached posts, offline posts first
      const mergedPosts = dedupeById([...offlinePosts, ...memoryCache.posts]);
      setPosts(mergedPosts);
      setOffset(memoryCache.offset || memoryCache.posts.length);
      setHasMore(typeof memoryCache.hasMore === 'boolean' ? memoryCache.hasMore : true);
      setLoading(false);
      // SWR: revalidate silently in background without clearing existing posts
      if (!isOffline()) {
        trackFeedRequest(
          'profile',
          'revalidate',
          () => getOptimizedUserPosts(userId, batchSize, 0, includePrivate),
          batchSize,
          0
        ).then(({ data }) => {
          if (!mountedRef.current) return;
          if (Array.isArray(data) && data.length > 0) {
            setPosts(prev => {
              // Keep offline posts, merge with fresh data
              const currentOffline = offlinePostsCache.get(userId)?.posts || [];
              const merged = dedupeById([...currentOffline, ...data, ...prev]);
              const newCache = {
                posts: merged,
                hasMore: merged.length >= prev.length ? (merged.length === batchSize) : true,
                offset: merged.length,
                lastUpdated: Date.now()
              };
              profilePostsCache.set(userId, newCache);
              // Save to persistent storage for next app start
              saveProfilePostsLocal(userId, newCache);
              setOffset(merged.length);
              setHasMore(merged.length === batchSize || prev.length > batchSize);
              return merged;
            });
          }
        }).catch(() => {});
      }
      return; // Exit early - served from memory cache
    }
    
    // STEP 2: Check persistent storage cache (still fast)
    const persistentCache = await getProfilePostsLocal(userId);
    if (persistentCache && persistentCache.posts && persistentCache.posts.length > 0) {
      console.log('📦 [ProfilePosts] Serving from persistent cache:', persistentCache.posts.length, 'posts');
      // Load persistent cache into memory cache
      profilePostsCache.set(userId, persistentCache);
      // Merge offline posts with cached posts, offline posts first
      const mergedPosts = dedupeById([...offlinePosts, ...persistentCache.posts]);
      setPosts(mergedPosts);
      setOffset(persistentCache.offset || persistentCache.posts.length);
      setHasMore(typeof persistentCache.hasMore === 'boolean' ? persistentCache.hasMore : true);
      setLoading(false);
      // SWR: revalidate silently in background
      if (!isOffline()) {
        trackFeedRequest(
          'profile',
          'revalidate',
          () => getOptimizedUserPosts(userId, batchSize, 0, includePrivate),
          batchSize,
          0
        ).then(({ data }) => {
          if (!mountedRef.current) return;
          if (Array.isArray(data) && data.length > 0) {
            setPosts(prev => {
              // Keep offline posts, merge with fresh data
              const currentOffline = offlinePostsCache.get(userId)?.posts || [];
              const merged = dedupeById([...currentOffline, ...data, ...prev]);
              const newCache = {
                posts: merged,
                hasMore: merged.length >= prev.length ? (merged.length === batchSize) : true,
                offset: merged.length,
                lastUpdated: Date.now()
              };
              profilePostsCache.set(userId, newCache);
              // Update persistent storage
              saveProfilePostsLocal(userId, newCache);
              setOffset(merged.length);
              setHasMore(merged.length === batchSize || prev.length > batchSize);
              return merged;
            });
          }
        }).catch(() => {});
      }
      return; // Exit early - served from persistent cache
    }

    // STEP 3: No cache found - load from database (fallback)
    console.log('🔄 [ProfilePosts] No cache found, loading from database...');
    
    // If no cache but we have offline posts, show them immediately
    if (offlinePosts.length > 0) {
      setPosts(offlinePosts);
      setLoading(false);
      console.log('📱 [ProfilePosts] Showing offline posts while loading:', offlinePosts.length);
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
        () => getOptimizedUserPosts(userId, batchSize, 0, includePrivate),
        batchSize,
        0
      );
      
      const { data } = result;
      
      if (!mountedRef.current) return;
      
      const newPosts = data || [];
      
      // Include offline posts at the beginning
      const currentOffline = offlinePostsCache.get(userId)?.posts || [];
      const mergedPosts = dedupeById([...currentOffline, ...newPosts]);
      
      setPosts(mergedPosts);
      setOffset(newPosts.length);
      setHasMore(newPosts.length === batchSize);
      
      // Update cache
      const newCache = {
        posts: mergedPosts,
        hasMore: newPosts.length === batchSize,
        offset: newPosts.length,
        lastUpdated: Date.now()
      };
      profilePostsCache.set(userId, newCache);
      // Save to persistent storage for next app start
      saveProfilePostsLocal(userId, newCache);
      
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
        () => getOptimizedUserPosts(userId, batchSize, offset, includePrivate),
        batchSize,
        offset
      );
      
      const { data } = result;
      
      if (!mountedRef.current) return;
      
      const newPosts = data || [];
      setPosts(prev => {
        const merged = dedupeById([...prev, ...newPosts]);
        // Update cache
        const newCache = {
          posts: merged,
          hasMore: newPosts.length === batchSize,
          offset: (offset + newPosts.length),
          lastUpdated: Date.now()
        };
        profilePostsCache.set(userId, newCache);
        // Save to persistent storage
        saveProfilePostsLocal(userId, newCache);
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
        () => getOptimizedUserPosts(userId, batchSize, 0, includePrivate),
        batchSize,
        0
      );
      const { data } = result;
      if (!mountedRef.current) return;
      const newPosts = data || [];
      
      // Include offline posts at the beginning, then fresh data, then existing
      const currentOffline = offlinePostsCache.get(userId)?.posts || [];
      const mergedPosts = dedupeById([...currentOffline, ...newPosts, ...posts]);
      
      setPosts(mergedPosts);
      setOffset(newPosts.length);
      setHasMore(newPosts.length === batchSize);
      // Update cache
      const newCache = {
        posts: mergedPosts,
        hasMore: newPosts.length === batchSize,
        offset: newPosts.length,
        lastUpdated: Date.now()
      };
      profilePostsCache.set(userId, newCache);
      // Save to persistent storage
      saveProfilePostsLocal(userId, newCache);
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
    const onCacheUpdate = (e) => {
      if (!userId || e?.detail?.userId !== userId) return;
      const cached = profilePostsCache.get(userId);
      if (cached && Array.isArray(cached.posts)) {
        setPosts(cached.posts);
        setOffset(cached.offset || cached.posts.length);
        setHasMore(typeof cached.hasMore === 'boolean' ? cached.hasMore : true);
      }
    };
    try { window.addEventListener('profile:posts-updated', onCacheUpdate); } catch (_) {}
    
    return () => {
      mountedRef.current = false;
      try { window.removeEventListener('profile:posts-updated', onCacheUpdate); } catch (_) {}
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

// Export cache functions for external use (e.g., App.jsx offline loading)
export { getProfilePostsLocal, getFeedPostsLocal };

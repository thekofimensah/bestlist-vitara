import React, { useState, memo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Star, Heart, MessageCircle, Share, X, UserPlus, UserMinus, Bookmark } from 'lucide-react';
import ProgressiveImage from './ui/ProgressiveImage';
import { likePost, unlikePost, followUser, unfollowUser, supabase } from '../lib/supabase';
import FirstInWorldBadge from './gamification/FirstInWorldBadge';
import { Preferences } from '@capacitor/preferences';

// Follow state cache functions
const FOLLOW_STATE_KEY = (followerId, followingId) => `follow_state_${followerId}_${followingId}`;

const saveFollowStateCache = async (followerId, followingId, isFollowing) => {
  if (!followerId || !followingId) return;
  try {
    const key = FOLLOW_STATE_KEY(followerId, followingId);
    const cacheData = {
      isFollowing,
      timestamp: Date.now()
    };
    await Preferences.set({
      key,
      value: JSON.stringify(cacheData)
    });
  } catch (error) {
    console.warn('Failed to save follow state to cache:', error);
  }
};

const getFollowStateCache = async (followerId, followingId) => {
  if (!followerId || !followingId) return null;
  try {
    const key = FOLLOW_STATE_KEY(followerId, followingId);
    const { value } = await Preferences.get({ key });
    if (value) {
      const parsed = JSON.parse(value);
      // Cache for 24 hours
      if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
        return parsed.isFollowing;
      }
    }
  } catch (error) {
    console.warn('Failed to load follow state from cache:', error);
  }
  return null;
};

const clearFollowStateCache = async (followerId, followingId) => {
  if (!followerId || !followingId) return;
  try {
    const key = FOLLOW_STATE_KEY(followerId, followingId);
    await Preferences.remove({ key });
  } catch (error) {
    console.warn('Failed to clear follow state cache:', error);
  }
};

// Saved state cache functions (similar to follow state)
const SAVED_STATE_KEY = (userId, postId) => `saved_state_${userId}_${postId}`;

const saveSavedStateCache = async (userId, postId, isSaved) => {
  if (!userId || !postId) return;
  try {
    const key = SAVED_STATE_KEY(userId, postId);
    const cacheData = {
      isSaved,
      timestamp: Date.now()
    };
    await Preferences.set({
      key,
      value: JSON.stringify(cacheData)
    });
  } catch (error) {
    console.warn('Failed to save saved state to cache:', error);
  }
};

const getSavedStateCache = async (userId, postId) => {
  if (!userId || !postId) return null;
  try {
    const key = SAVED_STATE_KEY(userId, postId);
    const { value } = await Preferences.get({ key });
    if (value) {
      const parsed = JSON.parse(value);
      // Cache for 24 hours
      if (Date.now() - parsed.timestamp < 24 * 60 * 60 * 1000) {
        return parsed.isSaved;
      }
    }
  } catch (error) {
    console.warn('Failed to load saved state from cache:', error);
  }
  return null;
};

const clearSavedStateCache = async (userId, postId) => {
  if (!userId || !postId) return;
  try {
    const key = SAVED_STATE_KEY(userId, postId);
    await Preferences.remove({ key });
  } catch (error) {
    console.warn('Failed to clear saved state cache:', error);
  }
};

// Enhanced StarRating component using Lucide icons
const StarRating = memo(({ rating, size = 'lg' }) => {
  const starSize = size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-4.5 h-4.5'; // lg is twice the original size

  return (
    <div className="flex items-center gap-0.5 leading-none h-6">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${starSize} ${
            star <= rating ? 'text-yellow-500 fill-current' : 'text-gray-300'
          }`}
        />
      ))}
    </div>
  );
});

const PostCardSkeleton = memo(() => (
  <div className="bg-white mb-4 shadow-sm overflow-hidden animate-pulse">
    {/* Header */}
    <div className="flex items-center gap-3 px-4 pt-4 mb-3">
      <div className="w-8 h-8 rounded-full bg-gray-200" />
      <div className="flex-1">
        <div className="h-4 bg-gray-200 rounded mb-1 w-24" />
        <div className="h-3 bg-gray-200 rounded w-16" />
      </div>
      <div className="flex items-center gap-2">
        <div className="h-4 w-12 bg-gray-200 rounded" />
        <div className="h-4 w-12 bg-gray-200 rounded" />
      </div>
    </div>

    {/* Image */}
    <div className="w-full aspect-square bg-gray-200 mb-3" />

    {/* Content */}
    <div className="px-4 space-y-2">
      <div className="h-5 bg-gray-200 rounded w-3/4" />
      <div className="h-4 bg-gray-200 rounded w-full" />
      <div className="h-4 bg-gray-200 rounded w-1/2" />
    </div>

    {/* Actions */}
    <div className="flex items-center gap-4 px-4 py-3">
      <div className="w-6 h-6 bg-gray-200 rounded" />
      <div className="w-6 h-6 bg-gray-200 rounded" />
      <div className="w-6 h-6 bg-gray-200 rounded ml-auto" />
    </div>
  </div>
));

const OptimizedPostCard = memo(({
  post,
  priority = 'normal',
  imageLoadState,
  onTap,
  onLikeChange,
  onUserTap,
  onCommentTap,
  onShareTap,
  onImageTap,
  updateImageLoadState,
  skeletonOnly = false
}) => {
  const [liked, setLiked] = useState(post?.user_liked || false);
  const [likeCount, setLikeCount] = useState(post?.likes || 0);
  const [isLiking, setIsLiking] = useState(false);
  const [showFirstInWorldPopup, setShowFirstInWorldPopup] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowLoading, setIsFollowLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(post?.user_saved || false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Initialize follow state with caching
  useEffect(() => {
    (async () => {
      try {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user || !post?.user_id) return;

        // First check cache
        const cachedFollowState = await getFollowStateCache(user.id, post.user_id);
        if (cachedFollowState !== null) {
          setIsFollowing(cachedFollowState);
          return;
        }

        // If not in cache, fetch from database
        const { data, error } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', post.user_id)
          .limit(1);

        if (!error) {
          const isFollowingUser = (data || []).length > 0;
          setIsFollowing(isFollowingUser);
          // Save to cache
          await saveFollowStateCache(user.id, post.user_id, isFollowingUser);
        }
      } catch (error) {
        console.warn('Error initializing follow state:', error);
      }
    })();
  }, [post?.user_id]);

  // Initialize saved state with caching
  useEffect(() => {
    (async () => {
      try {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user || !post?.id) return;

        // First check cache
        const cachedSavedState = await getSavedStateCache(user.id, post.id);
        if (cachedSavedState !== null) {
          setIsSaved(cachedSavedState);
          return;
        }

        // If not in cache, fetch from database
        const { data, error } = await supabase
          .rpc('user_has_saved_post', { 
            p_user_id: user.id,
            p_post_id: post.id 
          });

        if (!error && data !== null) {
          const isSavedPost = data === true;
          setIsSaved(isSavedPost);
          // Save to cache
          await saveSavedStateCache(user.id, post.id, isSavedPost);
        }
      } catch (error) {
        console.warn('Error initializing saved state:', error);
      }
    })();
  }, [post?.id]);

  // Listen for global follow/unfollow events to keep state in sync across app
  useEffect(() => {
    let currentUserId = null;
    let targetUserId = post?.user_id || null;
    (async () => {
      try {
        const authUser = (await supabase.auth.getUser()).data.user;
        currentUserId = authUser?.id || null;
      } catch (_) {}
    })();

    const handleFollowed = (e) => {
      const followerId = e?.detail?.followerId;
      const followingId = e?.detail?.followingId;
      if (!currentUserId || !targetUserId) return;
      if (followerId === currentUserId && followingId === targetUserId) {
        setIsFollowing(true);
        saveFollowStateCache(currentUserId, targetUserId, true).catch(() => {});
      }
    };

    const handleUnfollowed = (e) => {
      const followerId = e?.detail?.followerId;
      const followingId = e?.detail?.followingId;
      if (!currentUserId || !targetUserId) return;
      if (followerId === currentUserId && followingId === targetUserId) {
        setIsFollowing(false);
        saveFollowStateCache(currentUserId, targetUserId, false).catch(() => {});
      }
    };

    try {
      window.addEventListener('user:followed', handleFollowed);
      window.addEventListener('user:unfollowed', handleUnfollowed);
    } catch (_) {}

    return () => {
      try {
        window.removeEventListener('user:followed', handleFollowed);
        window.removeEventListener('user:unfollowed', handleUnfollowed);
      } catch (_) {}
    };
  }, [post?.user_id]);

  // Listen for global save/unsave events to keep state in sync across app
  useEffect(() => {
    let currentUserId = null;
    let currentPostId = post?.id || null;
    (async () => {
      try {
        const authUser = (await supabase.auth.getUser()).data.user;
        currentUserId = authUser?.id || null;
      } catch (_) {}
    })();

    const handlePostSavedChanged = (e) => {
      const postId = e?.detail?.postId;
      const saved = e?.detail?.saved;
      if (!currentPostId || postId !== currentPostId) return;
      setIsSaved(saved === true);
      if (currentUserId) {
        saveSavedStateCache(currentUserId, currentPostId, saved === true).catch(() => {});
      }
    };

    try {
      window.addEventListener('bestlist:post-saved-changed', handlePostSavedChanged);
    } catch (_) {}

    return () => {
      try {
        window.removeEventListener('bestlist:post-saved-changed', handlePostSavedChanged);
      } catch (_) {}
    };
  }, [post?.id]);


  // Show skeleton while loading
  if (skeletonOnly || !post) {
    return <PostCardSkeleton />;
  }

  const handleLike = async (e) => {
    e.stopPropagation();
    
    if (isLiking) return;
    
    try {
      setIsLiking(true);
      const newLikedState = !liked;
      
      // Optimistic update
      setLiked(newLikedState);
      setLikeCount(prev => newLikedState ? prev + 1 : prev - 1);
      
      // Call API
      if (newLikedState) {
        await likePost(post.id);
      } else {
        await unlikePost(post.id);
      }
      
      // Notify parent component
      onLikeChange?.(post.id, newLikedState);
      
    } catch (error) {
      console.error('Like/unlike error:', error);
      // Revert optimistic update on error
      setLiked(!liked);
      setLikeCount(prev => liked ? prev + 1 : prev - 1);
    } finally {
      setIsLiking(false);
    }
  };

  const handleUserTap = (e) => {
    e.stopPropagation();
    if (onUserTap && post.user?.name) {
      onUserTap(post.user.name);
    }
  };

  const handleDoubleTap = (e) => {
    e.preventDefault();
    setLiked(true);
  };

  const handleFollowToggle = async (e) => {
    e.stopPropagation();
    if (isFollowLoading) return;

    try {
      setIsFollowLoading(true);
      const newFollowState = !isFollowing;

      // Optimistic update
      setIsFollowing(newFollowState);

      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      if (newFollowState) {
        await followUser(post.user_id);
      } else {
        await unfollowUser(post.user_id);
      }

      // Update cache with new follow state
      await saveFollowStateCache(user.id, post.user_id, newFollowState);

    } catch (error) {
      console.error('Follow/unfollow error:', error);
      // Revert optimistic update on error
      setIsFollowing(!isFollowing);
    } finally {
      setIsFollowLoading(false);
    }
  };

  const handleSaveToggle = async (e) => {
    e.stopPropagation();
    if (isSaving) return;

    try {
      setIsSaving(true);
      const newSavedState = !isSaved;
      
      // Optimistic update
      setIsSaved(newSavedState);
      
      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      // Update cache immediately for consistency across tabs
      await saveSavedStateCache(user.id, post.id, newSavedState);

      // Use the toggle_save_post function for simpler implementation
      const { data, error } = await supabase
        .rpc('toggle_save_post', { 
          p_user_id: user.id,
          p_post_id: post.id 
        });

      if (error) throw error;

      // The function returns { saved: boolean, message: string }
      if (data.saved !== newSavedState) {
        // Something went wrong, revert the optimistic update
        setIsSaved(data.saved);
        // Update cache with correct state
        await saveSavedStateCache(user.id, post.id, data.saved);
      }

      // Broadcast events to update other parts of the app without manual refresh
      try {
        // Notify other cards in feed about saved state change
        window.dispatchEvent(new CustomEvent('bestlist:post-saved-changed', { 
          detail: { postId: post.id, saved: data.saved === true } 
        }));
      } catch (_) {}

      if (data.saved === true) {
        // If saved, notify ListsView to optimistically add the item to Saved Items list
        try {
          // Get saved list id
          const { data: savedListId } = await supabase.rpc('get_or_create_saved_items_list', { p_user_id: user.id });
          if (savedListId) {
            const itemObj = {
              id: data.new_item_id || `temp_${Date.now()}`,
              list_id: savedListId,
              name: post.item_name || post.items?.name,
              image_url: post.image || post.items?.image_url,
              rating: post.rating || post.items?.rating,
              notes: post.snippet || post.items?.notes,
              is_stay_away: post.items?.is_stay_away || false,
              place_name: post.items?.place_name,
              ai_product_name: post.items?.ai_product_name,
              ai_brand: post.items?.ai_brand,
              ai_category: post.items?.ai_category,
              ai_confidence: post.items?.ai_confidence,
              ai_description: post.items?.ai_description,
              ai_tags: post.items?.ai_tags,
              user_product_name: post.items?.user_product_name,
              user_description: post.items?.user_description,
              user_tags: post.items?.user_tags,
              detailed_breakdown: post.items?.detailed_breakdown,
              price: post.items?.price,
              currency_code: post.items?.currency_code,
              saved_from_post_id: post.id,
              original_creator_id: post.user_id,
              is_saved_item: true,
              created_at: new Date().toISOString()
            };
            try {
              window.dispatchEvent(new CustomEvent('bestlist:item-saved', { 
                detail: { item: itemObj, listId: savedListId, postId: post.id } 
              }));
            } catch (_) {}
          }
        } catch (_) {}
      } else {
        // If unsaved, notify ListsView to remove it from Saved Items
        try { 
          window.dispatchEvent(new CustomEvent('bestlist:item-unsaved', { 
            detail: { postId: post.id } 
          })); 
        } catch (_) {}
      }

    } catch (error) {
      console.error('Save/unsave error:', error);
      // Revert optimistic update on error
      setIsSaved(!isSaved);
      // Clear cache on error
      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        await clearSavedStateCache(user.id, post.id);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.div 
      className="bg-white mb-4 shadow-sm overflow-hidden" 
      onClick={onTap}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
     {/* Header - Product name and list name with elegant hierarchy */}
    <div className="px-4 pt-4 mb-2">
      {/* Product name - primary emphasis */}
      <div
        className="text-[1.35rem] font-medium text-gray-900 line-clamp-1"
        style={{ maxWidth: '90%' }}
      >
        {post.item_name}
      </div>
      
      {/* List name and follow button row */}
      {post.list_name && (
        <div className="flex items-center justify-between">
          {/* List name with subtle styling */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider -mt-1">
              {post.list_name}
            </span>
          </div>
          
          {/* Follow button */}
          <button
            onClick={handleFollowToggle}
            disabled={isFollowLoading}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
              isFollowing
                ? 'bg-gray-100 text-gray-600 hover:bg-gray-150 border border-gray-200'
                : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
            } disabled:opacity-50 shadow-sm hover:shadow-md`}
          >
            {isFollowLoading ? (
              <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin"></div>
            ) : isFollowing ? (
              <>
                <UserMinus className="w-3 h-3" />
                Following
              </>
            ) : (
              <>
                <UserPlus className="w-3 h-3" />
                Follow
              </>
            )}
          </button>
        </div>
      )}
    </div>

      {/* Image with user avatar overlay in TOP RIGHT */}
      <div 
        className="relative mb-3 cursor-pointer select-none"
        onDoubleClick={handleDoubleTap}
        onClick={(e) => {
          e.stopPropagation();
          onImageTap?.(post.id);
        }}
        onContextMenu={(e) => e.preventDefault()}
        style={{ touchAction: 'pan-y' }}
      >
        <ProgressiveImage
          thumbnailUrl={post.image}
          fullUrl={post.image}
          alt="Food item"
          className="w-full aspect-square object-cover select-none"
          priority={priority}
          lazyLoad={true}
          useThumbnail={false}
          size="medium"
          postId={post.id}
          onLoadStateChange={updateImageLoadState}
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
          style={{ WebkitUserDrag: 'none', userDrag: 'none', WebkitTouchCallout: 'none' }}
        />
        
        {/* User avatar with white border - positioned in TOP RIGHT of image */}
        <div className="absolute top-3 right-3">
          <button onClick={handleUserTap} className="flex-shrink-0">
            <ProgressiveImage
              thumbnailUrl={post.user?.avatar}
              fullUrl={post.user?.avatar}
              alt={post.user?.name}
              className="w-10 h-10 rounded-full object-cover border-1 border-white shadow-lg"
              priority="high"
              lazyLoad={false}
              useThumbnail={false}
              size="thumbnail"
              postId={`${post.id}-avatar`}
              onLoadStateChange={updateImageLoadState}
            />
          </button>
        </div>

        {/* Username positioned under the avatar with WHITE TEXT, NO BACKGROUND */}
        <div className="absolute top-12 right-3">
          <button
            onClick={handleUserTap}
            className="text-sm font-medium text-white hover:text-gray-200 transition-colors text-right drop-shadow-lg"
          >
            {post.user?.name}
          </button>
        </div>

      </div>

      {/* Stars + Share/Trophy in the same row */}
      <div className="px-4 mb-1">
        <div className="flex items-center justify-between">
          <StarRating rating={post.rating} size="lg" />
          <div className="flex items-center gap-2">
            {(post.items?.is_first_in_world || post.items?.first_in_world_achievement_id) && (
              <FirstInWorldBadge
                achievement={{
                  id: post.items.first_in_world_achievement_id || 'first_in_world',
                  name: 'First in World',
                  rarity: 'legendary',
                  icon: '🌍'
                }}
                size="small"
                variant="default"
                animate={true}
                onClick={() => setShowFirstInWorldPopup(true)}
              />
            )}
            {/* Save button left of Share */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleSaveToggle(e);
              }}
              className={`text-gray-500 hover:text-purple-600 transition-colors ${isSaved ? 'text-purple-600' : ''}`}
              aria-label="Save"
            >
              <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShareTap?.(post);
              }}
              className="text-gray-500 hover:text-gray-700 transition-colors"
              aria-label="Share"
            >
              <Share className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* User's product description (post.notes) directly under image */}
      {post.snippet && (
        <div className="px-4 mb-3">
          <div className="flex items-start justify-between gap-3">
            {/* Snippet text on the left - 75% width */}
            <div className="flex-1" style={{ maxWidth: '85%' }}>
              <p className="text-base text-gray-700 font-normal line-clamp-2">"{post.snippet}"</p>
              {/* Location under snippet if exists */}
              {post.location && (
                <div className="text-xs text-gray-500 mt-1">
                  {post.location}
                </div>
              )}
            </div>

            {/* Right-side spacer for layout consistency */}
            <div className="flex items-center gap-2 flex-shrink-0" />
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-4">
          <button
            onClick={handleLike}
            disabled={isLiking}
            className={`flex items-center gap-1 text-sm ${
              liked ? 'text-red-500' : 'text-gray-500'
            } hover:text-red-500 transition-colors disabled:opacity-50`}
          >
            <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onCommentTap?.(post);
            }}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
        </div>
        
      </div>

      {/* Likes count */}
      {likeCount > 0 && (
        <div className="px-4">
          <p className="text-sm font-medium text-gray-900 mb-1">
            {likeCount} {likeCount === 1 ? 'like' : 'likes'}
          </p>
        </div>
      )}

      {/* Comments */}
      <div className="px-4 pb-3">
        {post.comments > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCommentTap?.(post);
            }}
            className="text-sm text-gray-500 mb-2 block"
          >
            View all {post.comments} comments
          </button>
        )}

        {/* Timestamp */}
        <div className="text-xs text-gray-400 tracking-wide">
          {post.timestamp}
        </div>
      </div>

      {/* First in World Achievement Popup */}
      {showFirstInWorldPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-2xl p-8 max-w-xs mx-auto relative text-center">
            {/* Close button */}
            <button
              onClick={() => setShowFirstInWorldPopup(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-5xl mb-4">🏆</div>

            <h3 className="text-xl font-bold text-gray-900 mb-2">
              A Historic First!
            </h3>

            <p className="text-sm text-gray-600 leading-relaxed">
              {post.user?.name} made history!
              <br />
              <br />
              {post.user?.name} was the first to find and rate this product, and that's theirs forever.
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
});

OptimizedPostCard.displayName = 'OptimizedPostCard';

export default OptimizedPostCard
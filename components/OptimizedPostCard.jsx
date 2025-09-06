import React, { useState, memo, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Star, Heart, MessageCircle, Share, X, UserPlus, UserMinus } from 'lucide-react';
import ProgressiveImage from './ui/ProgressiveImage';
import { likePost, unlikePost, followUser, unfollowUser, supabase } from '../lib/supabase';
import FirstInWorldBadge from './gamification/FirstInWorldBadge';

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
    <div className="flex items-center gap-3 px-5 pt-4 mb-3">
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
    <div className="px-5 space-y-2">
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
  
  // Initialize follow state to match PublicUserProfile behavior
  useEffect(() => {
    (async () => {
      try {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user || !post?.user_id) return;
        const { data, error } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', post.user_id)
          .limit(1);
        if (!error) {
          setIsFollowing((data || []).length > 0);
        }
      } catch (_) {}
    })();
  }, [post?.user_id]);

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

      if (newFollowState) {
        await followUser(post.user_id);
      } else {
        await unfollowUser(post.user_id);
      }
    } catch (error) {
      console.error('Follow/unfollow error:', error);
      // Revert optimistic update on error
      setIsFollowing(!isFollowing);
    } finally {
      setIsFollowLoading(false);
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
      {/* Header - Product name, list name left; Follow button right */}
      <div className="px-5 pt-4 mb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1" style={{ maxWidth: '75%' }}>
            <div className="text-xl font-normal text-gray-900 line-clamp-1">
              {post.item_name}
            </div>
            {post.list_name && (
              <div className="pt-0.1 px-0.5">
                <div className="text-sm text-gray-450">
                  {post.list_name}
                </div>
              </div>
            )}
          </div>

          {/* (Follow button moved below) */}
        </div>
      </div>

      {/* Follow button row, right-aligned, above image */}
      {post.list_name && (
        <div className="px-5 -mt-2 mb-1 flex justify-end">
          <button
            onClick={handleFollowToggle}
            disabled={isFollowLoading}
            className={`rounded-lg px-2 py-1 text-xs font-medium transition-colors flex items-center gap-1 ${
              isFollowing
                ? 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                : 'border border-teal-700 text-teal-700 hover:bg-teal-50'
            } disabled:opacity-50`}
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
              className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-lg"
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
      <div className="px-5 mb-1">
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
        <div className="px-5 mb-3">
          <div className="flex items-start justify-between gap-3">
            {/* Snippet text on the left - 75% width */}
            <div className="flex-1" style={{ maxWidth: '75%' }}>
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
      <div className="flex items-center justify-between px-5 py-2">
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
        <div className="px-5">
          <p className="text-sm font-medium text-gray-900 mb-1">
            {likeCount} {likeCount === 1 ? 'like' : 'likes'}
          </p>
        </div>
      )}

      {/* Comments */}
      <div className="px-5 pb-3">
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-5">
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
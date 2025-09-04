import React, { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Star, Heart, MessageCircle, Share, X } from 'lucide-react';
import ProgressiveImage from './ui/ProgressiveImage';
import { likePost, unlikePost } from '../lib/supabase';
import FirstInWorldBadge from './gamification/FirstInWorldBadge';

// Enhanced StarRating component using Lucide icons
const StarRating = memo(({ rating, size = 'lg' }) => {
  const starSize = size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : 'w-4 h-4'; // lg is twice the original size

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

  // // Debug: Log post data to understand image URLs (only for first few posts)
  // if (Math.random() < 0.1) { // Only log 10% of posts to reduce noise
  //   console.log('🐛 [OptimizedPostCard] Post data sample:', post?.id?.substring(0, 8), JSON.stringify({
  //     userAvatar: post?.user?.avatar ? 'HAS_AVATAR' : 'NO_AVATAR',
  //     postImage: post?.image ? (post?.image.startsWith('data:') ? 'BASE64_IMAGE' : 'URL_IMAGE') : 'NO_IMAGE',
  //     hasUserData: !!post?.user,
  //     hasItemsData: !!post?.items
  //   }));
  // }

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

  return (
    <motion.div 
      className="bg-white mb-4 shadow-sm overflow-hidden" 
      onClick={onTap}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header - Loads immediately */}
      <div className="flex items-center gap-3 px-4 pt-4 mb-3">
        <button onClick={handleUserTap} className="flex-shrink-0">
                  <ProgressiveImage
          thumbnailUrl={post.user?.avatar}
          fullUrl={post.user?.avatar}
          alt={post.user?.name}
          className="w-8 h-8 rounded-full object-cover"
          priority="high"
          lazyLoad={false}
          useThumbnail={false}
          size="thumbnail"
          postId={`${post.id}-avatar`}
          onLoadStateChange={updateImageLoadState}
        />
        </button>
        
        <div className="flex-1 min-w-0">
          <button
            onClick={handleUserTap}
            className="text-sm font-medium text-gray-900 hover:text-teal-700 transition-colors text-left"
          >
            {post.user?.name}
          </button>
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-500">{post.timestamp}</div>
            {/* List name aligned with timestamp */}
            {post.list_name && (
              <div className="text-xs text-gray-500 text-right max-w-50 truncate ml-2">
                {post.list_name}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image - Loads progressively with priority */}
      <div 
        className="relative mb-3 cursor-pointer"
        onDoubleClick={handleDoubleTap}
        onClick={(e) => {
          e.stopPropagation();
          onImageTap?.(post.id);
        }}
      >
        <ProgressiveImage
          thumbnailUrl={post.image}
          fullUrl={post.image}
          alt="Food item"
          className="w-full aspect-square object-cover"
          priority={priority}
          lazyLoad={true}
          useThumbnail={false}
          size="medium"
          postId={post.id}
          onLoadStateChange={updateImageLoadState}
        />
      </div>

      {/* Title + Badge + Share (loads immediately) */}
      <div className="px-4 mt-2 flex items-start justify-between">
        <div className="text-base font-semibold text-gray-900 mr-3">
          {post.item_name}
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {/* First in World Badge - positioned next to share button */}
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

      {/* Description + Location (loads immediately) */}
      {(post.snippet || post.location) && (
        <div className="px-4 mt-1 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {post.snippet && (
              <p className="text-sm text-gray-700 line-clamp-2">{post.snippet}</p>
            )}
          </div>
          {post.location && (
            <div className="text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
              {post.location}
            </div>
          )}
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

          {/* Stars moved from header */}
          <div className="flex items-center">
            <StarRating rating={post.rating} size="md" />
          </div>
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
              {post.user?.name} was the very first person to find and rate this product, and that's theirs forever.
            </p>
          </div>
        </div>
      )}
    </motion.div>
  );
});

OptimizedPostCard.displayName = 'OptimizedPostCard';

export default OptimizedPostCard;

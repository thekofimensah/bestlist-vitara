import React, { useState, memo } from 'react';
import { motion } from 'framer-motion';
import { Star, Heart, MessageCircle, Share } from 'lucide-react';
import ProgressiveImage from './ui/ProgressiveImage';
import { likePost, unlikePost } from '../lib/supabase';

const StarRating = memo(({ rating, size = 'sm' }) => {
  const starSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  
  return (
    <div className="flex items-center gap-0.5 leading-none h-4">
      {[1, 2, 3, 4, 5].map((star) => (
        <div
          key={star}
          className={`${starSize} ${
            star <= rating ? 'text-yellow-500' : 'text-gray-300'
          }`}
        >
          ★
        </div>
      ))}
    </div>
  );
});

const VerdictBadge = memo(({ verdict, size = 'sm' }) => {
  const getVerdictStyle = () => {
    switch (verdict) {
      case 'AVOID':
        return 'bg-red-50 text-red-700 border-red-100';
      case 'KEEP':
        return 'bg-yellow-50 text-yellow-700 border-yellow-100';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const padding = size === 'sm' ? 'px-2' : 'px-3 py-1';
  const heightClass = size === 'sm' ? 'h-4' : 'h-5';

  return (
    <span className={`${padding} ${heightClass} rounded-full ${textSize} font-medium border inline-flex items-center justify-center leading-none ${getVerdictStyle()}`}>
      {verdict}
    </span>
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
  skeletonOnly = false
}) => {
  const [liked, setLiked] = useState(post?.user_liked || false);
  const [likeCount, setLikeCount] = useState(post?.likes || 0);
  const [isLiking, setIsLiking] = useState(false);

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
            size="thumbnail"
          />
        </button>
        
        <div className="flex-1 min-w-0">
          <button 
            onClick={handleUserTap}
            className="text-sm font-medium text-gray-900 hover:text-teal-700 transition-colors text-left"
          >
            {post.user?.name}
          </button>
          <div className="text-xs text-gray-500">{post.timestamp}</div>
        </div>
        
        <div className="flex items-center gap-2 h-4">
          <StarRating rating={post.rating} />
          <VerdictBadge verdict={post.verdict} />
        </div>
      </div>

      {/* Title + Share (loads immediately) */}
      <div className="px-4 mt-2 flex items-start justify-between">
        <div className="text-base font-semibold text-gray-900 mr-3">
          {post.item_name}
        </div>
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
          lazyLoad={priority === 'normal' || priority === 'low'}
          useThumbnail={true}
          size="medium"
        />
      </div>

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
    </motion.div>
  );
});

OptimizedPostCard.displayName = 'OptimizedPostCard';

export default OptimizedPostCard;

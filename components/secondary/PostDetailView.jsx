import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Heart, MessageSquare, Share, Edit3, Star, MapPin, User } from 'lucide-react';
import { supabase, likePost, unlikePost, getPostComments, commentOnPost } from '../../lib/supabase';
import { getInstagramClassicFilter } from '../../lib/imageUtils';
import CommentsModal from './CommentsModal';

const PostDetailView = ({ postId, onBack, onEdit, currentUser }) => {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [showComments, setShowComments] = useState(false);
  const [isLiking, setIsLiking] = useState(false);

  useEffect(() => {
    if (postId) {
      loadPost();
      loadComments();
    }
  }, [postId]);

  const loadPost = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          items(*),
          lists(name),
          profiles(username, avatar_url),
          likes(user_id)
        `)
        .eq('id', postId)
        .single();

      if (error) throw error;

      setPost(data);
      setLiked(data.likes?.some(like => like.user_id === currentUser?.id) || false);
      setLikeCount(data.like_count || 0);
    } catch (error) {
      console.error('Error loading post:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    try {
      const { data } = await getPostComments(postId);
      setComments(data || []);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleLike = async () => {
    if (isLiking) return;

    try {
      setIsLiking(true);
      const newLikedState = !liked;
      
      setLiked(newLikedState);
      setLikeCount(prev => newLikedState ? prev + 1 : prev - 1);
      
      if (newLikedState) {
        await likePost(postId);
      } else {
        await unlikePost(postId);
      }
    } catch (error) {
      console.error('Like error:', error);
      setLiked(!liked);
      setLikeCount(prev => liked ? prev + 1 : prev - 1);
    } finally {
      setIsLiking(false);
    }
  };

  const handleCommentAdded = async () => {
    await loadComments();
    await loadPost(); // Refresh comment count
  };

  const isOwner = currentUser?.id === post?.user_id;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center" style={{ backgroundColor: '#F6F6F4' }}>
        <div className="text-center">
          <p className="text-gray-500 mb-4">Post not found</p>
          <button onClick={onBack} className="text-teal-600 hover:text-teal-700">
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black relative">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/50 to-transparent">
        <div className="flex items-center justify-between p-4 pt-8">
          <button
            onClick={onBack}
            className="w-10 h-10 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          
          {isOwner && (
            <button
              onClick={() => onEdit(post.items)}
              className="w-10 h-10 bg-black/30 backdrop-blur-sm rounded-full flex items-center justify-center"
            >
              <Edit3 className="w-4 h-4 text-white" />
            </button>
          )}
        </div>
      </div>

      {/* Main Image */}
      <div className="relative h-[60vh] bg-black flex items-center justify-center">
        <img
          src={post.items?.image_url}
          alt={post.items?.name}
          className="max-w-full max-h-full object-contain"
          style={{ filter: getInstagramClassicFilter() }}
        />
      </div>

      {/* Content Section */}
      <div className="bg-white rounded-t-3xl mt-[-24px] relative z-10 min-h-[40vh]">
        {/* Product Info */}
        <div className="p-6 pb-4">
          {/* User Info */}
          <div className="flex items-center gap-3 mb-4">
            <img
              src={post.profiles?.avatar_url || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"%3E%3C/path%3E%3Ccircle cx="12" cy="7" r="4"%3E%3C/circle%3E%3C/svg%3E'}
              alt={post.profiles?.username}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <p className="font-medium text-gray-900">@{post.profiles?.username}</p>
              <p className="text-sm text-gray-500">{post.lists?.name}</p>
            </div>
          </div>

          {/* Product Name */}
          <h1 className="text-2xl font-bold text-gray-900 mb-3">{post.items?.name}</h1>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-4">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= (post.items?.rating || 0)
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-lg font-medium text-gray-900">
              {post.items?.rating}/5
            </span>
          </div>

          {/* Location */}
          {post.location && (
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="text-gray-600">{post.location}</span>
            </div>
          )}

          {/* Notes */}
          {post.items?.notes && (
            <div className="mb-6">
              <h3 className="font-medium text-gray-900 mb-2">Notes</h3>
              <p className="text-gray-700 leading-relaxed">{post.items.notes}</p>
            </div>
          )}

          {/* Engagement Actions */}
          <div className="flex items-center justify-between py-4 border-t border-gray-100">
            <div className="flex items-center gap-6">
              <button
                onClick={handleLike}
                className="flex items-center gap-2 group"
                disabled={isLiking}
              >
                <Heart
                  className={`w-6 h-6 transition-all ${
                    liked
                      ? 'text-red-500 fill-red-500'
                      : 'text-gray-500 group-hover:text-red-500'
                  }`}
                />
                <span className={`font-medium ${liked ? 'text-red-500' : 'text-gray-700'}`}>
                  {likeCount}
                </span>
              </button>

              <button
                onClick={() => setShowComments(true)}
                className="flex items-center gap-2 group"
              >
                <MessageSquare className="w-6 h-6 text-gray-500 group-hover:text-blue-500" />
                <span className="font-medium text-gray-700">{comments.length}</span>
              </button>
            </div>

            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Share className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Comments Preview */}
        {comments.length > 0 && (
          <div className="px-6 pb-6">
            <button
              onClick={() => setShowComments(true)}
              className="text-left w-full"
            >
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                <img
                  src={comments[0].profiles?.avatar_url || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"%3E%3C/path%3E%3Ccircle cx="12" cy="7" r="4"%3E%3C/circle%3E%3C/svg%3E'}
                  alt={comments[0].profiles?.username}
                  className="w-8 h-8 rounded-full object-cover"
                />
                <div className="flex-1">
                  <p className="text-sm">
                    <span className="font-medium">@{comments[0].profiles?.username}</span>{' '}
                    <span className="text-gray-700">{comments[0].content}</span>
                  </p>
                  {comments.length > 1 && (
                    <p className="text-xs text-gray-500 mt-1">
                      View all {comments.length} comments
                    </p>
                  )}
                </div>
              </div>
            </button>
          </div>
        )}
      </div>

      {/* Comments Modal */}
      <CommentsModal
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        postId={postId}
        onCommentAdded={handleCommentAdded}
      />
    </div>
  );
};

export default PostDetailView;
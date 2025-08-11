import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Heart, MessageSquare, Share, Edit3, Star, MapPin, User } from 'lucide-react';
import { supabase, likePost, unlikePost, getPostComments, commentOnPost } from '../../lib/supabase';
import { getInstagramClassicFilter } from '../../lib/imageUtils';
import SmartImage from './SmartImage';

const PostDetailView = ({ postId, onBack, onEdit, currentUser, onNavigateToUser }) => {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [isLiking, setIsLiking] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);

  useEffect(() => {
    console.log('🔍 PostDetailView: postId received:', postId);
    if (postId) {
      loadPost();
      loadComments();
    }
  }, [postId]);

  const loadPost = async () => {
    try {
      // First, get the post data
      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

      if (postError) throw postError;

      // Get the item data
      const { data: itemData, error: itemError } = await supabase
        .from('items')
        .select('*')
        .eq('id', postData.item_id)
        .single();

      if (itemError) throw itemError;

      // Get the list data
      const { data: listData, error: listError } = await supabase
        .from('lists')
        .select('name')
        .eq('id', postData.list_id)
        .single();

      // Get the user profile data
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username, avatar_url')
        .eq('id', postData.user_id)
        .single();

      // Check if current user liked this post
      const { data: likeData, error: likeError } = await supabase
        .from('likes')
        .select('user_id')
        .eq('post_id', postId)
        .eq('user_id', currentUser?.id)
        .maybeSingle();

      // Combine all the data
      const combinedData = {
        ...postData,
        items: itemData,
        lists: listData || { name: 'Unknown List' },
        profiles: profileData || { username: 'Unknown User', avatar_url: null },
        user_liked: !likeError && likeData !== null
      };

      setPost(combinedData);
      setLiked(combinedData.user_liked);
      setLikeCount(postData.like_count || 0);
    } catch (error) {
      console.error('Error loading post:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
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

  const handleAddComment = async () => {
    if (!newComment.trim() || !post || isCommenting) return;
    
    try {
      setIsCommenting(true);
      const { data: commentData, error: commentError } = await commentOnPost(postId, newComment);
      if (commentError) throw commentError;
      
      setComments(prev => [commentData, ...prev]);
      setNewComment('');
      await loadPost(); // Refresh comment count
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsCommenting(false);
    }
  };

  const handleUserTap = () => {
    if (post?.profiles?.username && onNavigateToUser) {
      onNavigateToUser(post.profiles.username);
    }
  };

  const isOwner = currentUser?.id === post?.user_id;
  const displayLocation = post?.items?.place_name || post?.location || post?.items?.location || '';

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
    <div className="min-h-screen bg-black relative overflow-y-auto" style={{ paddingBottom: '80px' }}>
      {/* Header */}
      <div className="sticky top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/50 to-transparent">
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
        <SmartImage
          src={post.items?.image_url}
          alt={post.items?.name}
          className="max-w-full max-h-full object-contain"
          style={{ filter: getInstagramClassicFilter() }}
          useThumbnail={false}
          size="large"
          lazyLoad={false}
        />
      </div>

      {/* Content Section */}
      <div className="bg-white rounded-t-3xl mt-[-24px] relative z-10">
        {/* Product Info */}
        <div className="p-6 pb-4">
          {/* User Info */}
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={handleUserTap}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <img
                src={post.profiles?.avatar_url || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"%3E%3C/path%3E%3Ccircle cx="12" cy="7" r="4"%3E%3C/circle%3E%3C/svg%3E'}
                alt={post.profiles?.username}
                className="w-10 h-10 rounded-full object-cover"
              />
              <div>
                <p className="font-medium text-gray-900">{post.profiles?.username}</p>
                <p className="text-sm text-gray-500">{post.lists?.name}</p>
              </div>
            </button>
          </div>

          {/* Product Name */}
          <h1 className="text-base font-semibold text-gray-900 mb-3">{post.items?.name}</h1>

          {/* Rating + Location aligned on same row */}
          <div className="flex items-center mb-4">
            <div className="flex items-center gap-2">
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
              <span className="text-base font-semibold text-gray-900">
                {post.items?.rating}
              </span>
            </div>

            {displayLocation && (
              <div className="ml-auto flex items-center gap-1 min-w-0">
                <MapPin className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <span className="text-sm text-gray-600 whitespace-nowrap truncate">{displayLocation}</span>
              </div>
            )}
          </div>

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
                  className={`w-5 h-5 transition-all ${
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
                onClick={() => document.getElementById('comments-section')?.scrollIntoView({ behavior: 'smooth' })}
                className="flex items-center gap-2 group"
              >
                <MessageSquare className="w-5 h-5 text-gray-500 group-hover:text-blue-500" />
                <span className="font-medium text-gray-700">{comments.length}</span>
              </button>
            </div>

            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <Share className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Comments Section */}
        <div id="comments-section" className="border-t border-gray-100 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 px-6">Comments ({comments.length})</h3>
          
          {/* Comments List */}
          <div className="px-6 space-y-4 mb-6">
            {comments.length > 0 ? (
              comments.map(comment => (
                <div key={comment.id} className="flex items-start gap-3">
                  <img
                    src={comment.profiles?.avatar_url || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"%3E%3C/path%3E%3Ccircle cx="12" cy="7" r="4"%3E%3C/circle%3E%3C/svg%3E'}
                    alt={comment.profiles?.username}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="flex-1">
                    <p className="text-sm">
                      <span className="font-medium text-gray-900">@{comment.profiles?.username}</span>{' '}
                      <span className="text-gray-700">{comment.content}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No comments yet. Be the first to comment!</p>
            )}
          </div>

          {/* Add Comment */}
          <div className="px-6 pb-24">
            <div className="relative flex items-center">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 p-3 pr-12 border border-gray-200 rounded-full focus:outline-none focus:border-teal-500 bg-gray-50"
                onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
              />
              {newComment.trim() && (
                <button
                  onClick={handleAddComment}
                  disabled={isCommenting}
                  className="absolute right-2 p-2 text-teal-500 hover:text-teal-600 disabled:opacity-50 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostDetailView;
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Heart, MessageSquare, Share, Edit3, Star, MapPin, User } from 'lucide-react';
import { supabase, likePost, unlikePost, getPostComments, commentOnPost, deleteComment } from '../../lib/supabase';
import { getInstagramClassicFilter } from '../../lib/imageUtils';
import SmartImage from './SmartImage';
import FirstInWorldBadge from '../gamification/FirstInWorldBadge';
import CommentsModal from '../CommentsModal';
import ShareModal from './ShareModal';
import { useAuth } from '../../hooks/useAuth';

const PostDetailView = ({ postId, onBack, onEdit, currentUser, onNavigateToUser, scrollToComments = false }) => {
  const { userProfile } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [isLiking, setIsLiking] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const containerRef = useRef(null);
  const commentsRef = useRef(null);
  const [showShareModal, setShowShareModal] = useState(false);

  // Auto-scroll to comments when opened from a comment notification
  useEffect(() => {
    if (!scrollToComments || loading || !post) return;
    const el = commentsRef.current || document.getElementById('comments-section');
    if (!el) return;
    setTimeout(() => {
      try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (_) {}
    }, 100);
  }, [scrollToComments, loading, post]);

  useEffect(() => {
    console.log('🔍 PostDetailView: postId received:', postId);
    if (postId) {
      loadPost();
      loadComments();
    }
  }, [postId]);

  const loadPost = async () => {
    try {
      // If offline, show friendly message instead of generic error
      if (typeof navigator !== 'undefined' && navigator.onLine === false) {
        setLoading(false);
        setPost(undefined);
        return;
      }
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

  const handleCommentAdded = async (postId) => {
    await loadComments();
    await loadPost(); // Refresh comment count
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || isCommenting) return;
    
    try {
      setIsCommenting(true);
      const { data, error } = await commentOnPost(
        postId, 
        newComment.trim(), 
        replyingTo?.commentId || null
      );
      
      if (error) {
        console.error('❌ Error posting comment:', error?.message || 'Unknown error');
        console.error('❌ Error details:', JSON.stringify({
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          code: error?.code,
          name: error?.name
        }, null, 2));
        return;
      }

      // Format the new comment (same as CommentsModal)
      const formattedComment = {
        id: data.id,
        content: data.content,
        created_at: data.created_at,
        parent_id: data.parent_id,
        profiles: {
          username: userProfile?.username,
          display_name: userProfile?.display_name,
          avatar_url: userProfile?.avatar_url
        },
        replies: []
      };

      // Add comment to the appropriate place (same logic as CommentsModal)
      if (replyingTo?.commentId) {
        // This is a reply - add it to the parent comment's replies
        setComments(prev => prev.map(comment => 
          comment.id === replyingTo.commentId 
            ? { ...comment, replies: [...comment.replies, formattedComment] }
            : comment
        ));
      } else {
        // This is a top-level comment
        setComments(prev => [...prev, formattedComment]);
      }

      setNewComment('');
      setReplyingTo(null);
      
      // Refresh comment count
      await loadPost();
      
      // Provide haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    } catch (error) {
      console.error('❌ Error submitting comment exception:', error?.message || 'Unknown error');
    } finally {
      setIsCommenting(false);
    }
  };

  const handleReplyToComment = (comment) => {
    setReplyingTo({ commentId: comment.id, username: comment.profiles?.username });
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const handleDeleteComment = async (commentId, isReply = false, parentId = null) => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      const { error } = await deleteComment(commentId);
      
      if (error) {
        console.error('❌ Error deleting comment:', error);
        alert('Failed to delete comment. Please try again.');
        return;
      }

      // Remove comment from local state
      if (isReply && parentId) {
        // Remove reply from parent comment
        setComments(prev => prev.map(comment => 
          comment.id === parentId 
            ? { ...comment, replies: comment.replies.filter(reply => reply.id !== commentId) }
            : comment
        ));
      } else {
        // Remove top-level comment
        setComments(prev => prev.filter(comment => comment.id !== commentId));
      }

      // Refresh comment count
      await loadPost();

      console.log('✅ Comment deleted successfully');
    } catch (error) {
      console.error('❌ Delete comment exception:', error);
      alert('Failed to delete comment. Please try again.');
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
      <div className="min-h-screen bg-stone-50" style={{ backgroundColor: '#F6F6F4' }}>
        {/* Image area skeleton */}
        <div className="relative h-[60vh] bg-black flex items-center justify-center">
          <div className="w-11/12 h-5/6 bg-gray-800/60 rounded-2xl animate-pulse" />
        </div>
        
        {/* Content skeleton */}
        <div className="bg-white rounded-t-3xl mt-[-24px] relative z-10">
          <div className="p-6 pb-4">
            {/* User info */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
              <div className="flex-1">
                <div className="h-4 w-32 bg-gray-200 rounded mb-2 animate-pulse" />
                <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
              </div>
            </div>

            {/* Title */}
            <div className="h-5 w-1/2 bg-gray-200 rounded mb-3 animate-pulse" />

            {/* Rating + Location */}
            <div className="flex items-center mb-4 gap-4">
              <div className="flex items-center gap-2">
                <div className="h-5 w-24 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="ml-auto h-4 w-28 bg-gray-100 rounded animate-pulse" />
            </div>

            {/* Notes */}
            <div className="space-y-2 mb-6">
              <div className="h-3 w-full bg-gray-100 rounded animate-pulse" />
              <div className="h-3 w-11/12 bg-gray-100 rounded animate-pulse" />
              <div className="h-3 w-10/12 bg-gray-100 rounded animate-pulse" />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between py-4 border-t border-gray-100">
              <div className="flex items-center gap-6">
                <div className="h-5 w-16 bg-gray-100 rounded animate-pulse" />
                <div className="h-5 w-16 bg-gray-100 rounded animate-pulse" />
              </div>
              <div className="h-8 w-8 bg-gray-100 rounded-full animate-pulse" />
            </div>
          </div>

          {/* Comments skeleton */}
          <div className="border-t border-gray-100 pt-6">
            <div className="px-6 mb-4 h-5 w-40 bg-gray-200 rounded animate-pulse" />
            <div className="px-6 space-y-4 mb-6">
              {[1,2,3].map(i => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
                  <div className="flex-1">
                    <div className="h-3 w-1/2 bg-gray-200 rounded mb-2 animate-pulse" />
                    <div className="h-3 w-2/3 bg-gray-100 rounded animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-6" style={{ backgroundColor: '#F6F6F4' }}>
        <div className="text-center">
          {typeof navigator !== 'undefined' && navigator.onLine === false ? (
            <>
              <p className="text-gray-700 mb-2">Unable to show this post while offline</p>
              <p className="text-gray-500 text-sm mb-4">Connect to the internet and try again.</p>
            </>
          ) : (
            <p className="text-gray-500 mb-4">Post not found</p>
          )}
          <button onClick={onBack} className="text-teal-600 hover:text-teal-700">
            Go back
          </button>
        </div>
      </div>
    );
  }

  

  return (
    <div ref={containerRef} className="min-h-screen bg-black relative overflow-y-auto" style={{ paddingBottom: '80px' }}>
      {/* Header */}
      <div className="sticky top-0 left-0 right-0 z-0 bg-gradient-to-b from-black/50 to-transparent">
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
      <div className="bg-white rounded-t-3xl mt-[-24px] relative z-0 min-h-[calc(100vh-60vh+24px)]">
        {/* Product Info */}
        <div className="p-6 pb-4">
          {/* User Info */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleUserTap}
              className="flex items-center gap-3 hover:opacity-80 transition-opacity"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                <img
                  src={post.profiles?.avatar_url || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"%3E%3C/path%3E%3Ccircle cx="12" cy="7" r="4"%3E%3C/circle%3E%3C/svg%3E'}
                  alt={post.profiles?.username}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="text-left">
                <p className="font-medium text-gray-900 text-left">{post.profiles?.username}</p>
                <p className="text-sm text-gray-500 text-left">{post.lists?.name}</p>
              </div>
            </button>
            
            {/* First in World Badge - positioned all the way to the right */}
            {(post.items?.is_first_in_world || post.items?.first_in_world_achievement_id) && (
              <div className="flex-shrink-0">
                <FirstInWorldBadge 
                  achievement={{
                    id: post.items.first_in_world_achievement_id || 'first_in_world',
                    name: 'First in World',
                    rarity: 'legendary',
                    icon: '🌍'
                  }}
                  size="medium"
                  variant="default"
                  animate={true}
                />
              </div>
            )}
          </div>

          {/* Product Name */}
          <h1 className="text-base font-semibold text-gray-900 mb-3 leading-tight" style={{
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
            hyphens: 'auto',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: '1.3'
          }}>{post.items?.name}</h1>

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
                <MapPin className="w-4 h-4 text-gray-500 flex-shrink-0" />
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

            <button 
              onClick={() => setShowShareModal(true)}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <Share className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Comments Section */}
        <div id="comments-section" ref={commentsRef} className="border-t border-gray-100 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 px-6">Comments ({comments.length})</h3>
          
          {/* Comments List */}
          <div className="px-6 space-y-4 mb-6">
            {comments.length > 0 ? (
              comments.map(comment => (
                <div key={comment.id}>
                  {/* Main comment */}
                  <div className="flex items-start gap-3">
                    <img
                      src={comment.profiles?.avatar_url || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"%3E%3C/path%3E%3Ccircle cx="12" cy="7" r="4"%3E%3C/circle%3E%3C/svg%3E'}
                      alt={comment.profiles?.username}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <p className="text-sm">
                        <span className="font-medium text-gray-900">{comment.profiles?.username}</span>{' '}
                        <span className="text-gray-700">{comment.content}</span>
                      </p>
                      <div className="flex items-center gap-4 mt-1">
                        <p className="text-xs text-gray-500">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </p>
                        <button
                          onClick={() => handleReplyToComment(comment)}
                          className="text-xs text-gray-500 hover:text-teal-700 transition-colors"
                        >
                          Reply
                        </button>
                        {comment.profiles?.username === userProfile?.username && (
                          <button
                            onClick={() => handleDeleteComment(comment.id)}
                            className="text-xs text-red-400 hover:text-red-600 transition-colors"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Replies */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="ml-11 mt-3 space-y-3">
                      {comment.replies.map((reply) => (
                        <div key={reply.id} className="flex gap-3">
                          <img
                            src={reply.profiles?.avatar_url || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"%3E%3C/path%3E%3Ccircle cx="12" cy="7" r="4"%3E%3C/circle%3E%3C/svg%3E'}
                            alt={reply.profiles?.username}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900 text-xs">
                                {reply.profiles?.username || 'Anonymous'}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(reply.created_at).toLocaleDateString()}
                              </span>
                            </div>
                            <p className="text-gray-700 text-xs leading-relaxed mb-1">
                              {reply.content}
                            </p>
                            {reply.profiles?.username === userProfile?.username && (
                              <button
                                onClick={() => handleDeleteComment(reply.id, true, comment.id)}
                                className="text-xs text-red-400 hover:text-red-600 transition-colors"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-4">No comments yet. Be the first to comment!</p>
            )}
          </div>

          {/* Add Comment */}
          <div className="px-6 pb-24">
            {/* Reply indicator */}
            {replyingTo && (
              <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-teal-50 rounded-xl">
                <span className="text-sm text-teal-700">
                  Replying to @{replyingTo.username}
                </span>
                <button
                  onClick={cancelReply}
                  className="text-teal-600 hover:text-teal-800"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            
            <div className="relative flex items-center">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={replyingTo ? `Reply to @${replyingTo.username}...` : "Add a comment..."}
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

      {/* Comments Modal */}
      <CommentsModal
        isOpen={showCommentsModal}
        onClose={() => setShowCommentsModal(false)}
        post={post}
        onCommentAdded={handleCommentAdded}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        post={{
          id: post?.id,
          item_name: post?.items?.name,
          list_name: post?.lists?.name,
          user: {
            name: post?.profiles?.username,
            avatar: post?.profiles?.avatar_url
          },
          snippet: post?.items?.notes
        }}
      />
    </div>
  );
};

export default PostDetailView;
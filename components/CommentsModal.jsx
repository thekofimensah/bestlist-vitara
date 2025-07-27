import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, User } from 'lucide-react';
import { commentOnPost, getPostComments } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

const CommentsModal = ({ isOpen, onClose, post, onCommentAdded }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null); // { commentId, username }
  const { userProfile } = useAuth();
  const inputRef = useRef(null);

  // Load comments when modal opens
  useEffect(() => {
    if (isOpen && post?.id) {
      loadComments();
    }
  }, [isOpen, post?.id]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    }
  }, [isOpen]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const { data, error } = await getPostComments(post.id);
      if (error) {
        console.error('❌ Error loading comments:', error?.message || 'Unknown error');
        console.error('❌ Error details:', JSON.stringify({
          message: error?.message,
          details: error?.details,
          hint: error?.hint,
          code: error?.code,
          name: error?.name
        }, null, 2));
      } else {
        setComments(data || []);
      }
    } catch (error) {
      console.error('❌ Error loading comments exception:', error?.message || 'Unknown error');
      console.error('❌ Exception details:', JSON.stringify({
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        name: error?.name
      }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || submitting) return;

    try {
      setSubmitting(true);
      const { data, error } = await commentOnPost(
        post.id, 
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

      // Format the new comment
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

      // Add comment to the appropriate place
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
      
      // Notify parent component to update comment count
      if (onCommentAdded) {
        onCommentAdded(post.id);
      }
      
      // Provide haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    } catch (error) {
      console.error('❌ Error submitting comment exception:', error?.message || 'Unknown error');
      console.error('❌ Exception details:', JSON.stringify({
        message: error?.message,
        details: error?.details,
        hint: error?.hint,
        code: error?.code,
        name: error?.name
      }, null, 2));
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplyToComment = (comment) => {
    setReplyingTo({ 
      commentId: comment.id, 
      username: comment.profiles?.username || 'User' 
    });
    inputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
    setNewComment('');
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmitComment();
    }
  };

  const getTimeAgo = (dateString) => {
    const now = new Date();
    const commentDate = new Date(dateString);
    const diffInMinutes = Math.floor((now - commentDate) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    return `${Math.floor(diffInMinutes / 1440)}d`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[80vh] flex flex-col"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                Comments ({comments.reduce((total, comment) => total + 1 + comment.replies.length, 0)})
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {loading ? (
                // Loading skeleton
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-3">
                      <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                      <div className="flex-1">
                        <div className="h-3 bg-gray-200 rounded animate-pulse mb-2 w-20" />
                        <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : comments.length === 0 ? (
                // Empty state
                <div className="text-center py-8">
                  <div className="text-gray-500 mb-2">No comments yet</div>
                  <div className="text-gray-400 text-sm">Be the first to comment!</div>
                </div>
                             ) : (
                 // Comments with replies
                 comments.map((comment) => (
                   <div key={comment.id}>
                     {/* Main comment */}
                     <div className="flex gap-3">
                       <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                         {comment.profiles?.avatar_url ? (
                           <img
                             src={comment.profiles.avatar_url}
                             alt={comment.profiles?.username}
                             className="w-full h-full object-cover"
                           />
                         ) : (
                           <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                             <User className="w-4 h-4 text-gray-400" />
                           </div>
                         )}
                       </div>
                       <div className="flex-1 min-w-0">
                         <div className="flex items-center gap-2 mb-1">
                           <span className="font-medium text-gray-900 text-sm">
                             {comment.profiles?.username || 'Anonymous'}
                           </span>
                           <span className="text-xs text-gray-500">
                             {getTimeAgo(comment.created_at)}
                           </span>
                         </div>
                         <p className="text-gray-700 text-sm leading-relaxed mb-1">
                           {comment.content}
                         </p>
                         <button
                           onClick={() => handleReplyToComment(comment)}
                           className="text-xs text-gray-500 hover:text-teal-700 transition-colors"
                         >
                           Reply
                         </button>
                       </div>
                     </div>

                     {/* Replies */}
                     {comment.replies && comment.replies.length > 0 && (
                       <div className="ml-11 mt-3 space-y-3">
                         {comment.replies.map((reply) => (
                           <div key={reply.id} className="flex gap-3">
                             <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0">
                               {reply.profiles?.avatar_url ? (
                                 <img
                                   src={reply.profiles.avatar_url}
                                   alt={reply.profiles?.username}
                                   className="w-full h-full object-cover"
                                 />
                               ) : (
                                 <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                                   <User className="w-3 h-3 text-gray-400" />
                                 </div>
                               )}
                             </div>
                             <div className="flex-1 min-w-0">
                               <div className="flex items-center gap-2 mb-1">
                                 <span className="font-medium text-gray-900 text-xs">
                                   {reply.profiles?.username || 'Anonymous'}
                                 </span>
                                 <span className="text-xs text-gray-500">
                                   {getTimeAgo(reply.created_at)}
                                 </span>
                               </div>
                               <p className="text-gray-700 text-xs leading-relaxed">
                                 {reply.content}
                               </p>
                             </div>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                 ))
               )}
            </div>

            {/* Comment Input */}
            <div className="px-6 py-4 border-t border-gray-100">
              {/* Reply indicator */}
              {replyingTo && (
                <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-teal-50 rounded-xl">
                  <span className="text-sm text-teal-700">
                    Replying to {replyingTo.username}
                  </span>
                  <button
                    onClick={cancelReply}
                    className="text-teal-600 hover:text-teal-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              <div className="flex gap-3 items-end">
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                  {userProfile?.avatar_url ? (
                    <img
                      src={userProfile.avatar_url}
                      alt="Your avatar"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                </div>
                <div className="flex-1 flex gap-2">
                  <textarea
                    ref={inputRef}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={replyingTo ? `Reply to @${replyingTo.username}...` : "Add a comment..."}
                    className="flex-1 bg-gray-50 rounded-2xl px-4 py-3 text-sm resize-none outline-none border-none focus:bg-gray-100 transition-colors"
                    rows={1}
                    style={{ maxHeight: '100px', minHeight: '44px' }}
                  />
                  <button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || submitting}
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all ${
                      newComment.trim() && !submitting
                        ? 'bg-teal-700 text-white'
                        : 'bg-gray-200 text-gray-400'
                    }`}
                    style={newComment.trim() && !submitting ? { backgroundColor: '#1F6D5A' } : {}}
                  >
                    {submitting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default CommentsModal; 
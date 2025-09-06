import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Calendar, Heart, MessageCircle, UserPlus, UserMinus, Star, User } from 'lucide-react';
import { getUserProfile, getUserPosts, followUser, unfollowUser, getUserFollowers, getUserFollowing, supabase } from '../../lib/supabase';
import { removeUserPostsFromFeedCache } from '../../hooks/useOptimizedFeed';
import { useAuth } from '../../hooks/useAuth';
import SmartImage from './SmartImage';
import CommentsModal from './CommentsModal';
import { App as CapacitorApp } from '@capacitor/app';

const UserProfile = ({ username, onBack, onNavigateToUser, onSelectPost, onImageTap, onEditItem }) => {
  const { user: currentUser } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef(null);
  const [postsCount, setPostsCount] = useState(0);

  // Comments modal state
  const [commentsModal, setCommentsModal] = useState({ isOpen: false, post: null });

  // Load user profile data
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setLoading(true);
        console.log('🔍 Loading profile for username:', username);
        
        // Get user profile by username
        const { data: profile, error } = await getUserProfile(username);
        
        if (error) {
          console.error('❌ Error loading user profile:', error?.message || 'Unknown error');
          console.error('❌ Error details:', JSON.stringify({
            message: error?.message,
            details: error?.details,
            hint: error?.hint,
            code: error?.code,
            name: error?.name
          }, null, 2));
          return;
        }
        
        if (!profile) {
          console.log('👤 Profile not found for username:', username);
          return;
        }
        
        setUserProfile(profile);
        
        // Load follower/following counts and check follow status
        const [followersResult, followingResult, followStatusResult] = await Promise.all([
          getUserFollowers(profile.id),
          getUserFollowing(profile.id),
          // Check if current user is following this user directly
          currentUser ? supabase
            .from('follows')
            .select('id')
            .eq('follower_id', currentUser.id)
            .eq('following_id', profile.id)
            .single() : Promise.resolve({ data: null, error: null })
        ]);
        
        setFollowersCount(followersResult.data?.length || 0);
        setFollowingCount(followingResult.data?.length || 0);
        
        // Set follow status based on direct query
        if (currentUser) {
          const isFollowingUser = !!followStatusResult.data && !followStatusResult.error;
          setIsFollowing(isFollowingUser);
        }

        // Load total public posts count accurately
        try {
          const postsCountRes = await supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', profile.id)
            .eq('is_public', true);
          setPostsCount(postsCountRes?.count || 0);
        } catch (_) {
          setPostsCount(0);
        }
        
      } catch (error) {
        console.error('❌ Error in loadUserProfile:', error?.message || 'Unknown error');
        console.error('❌ Error details:', JSON.stringify({
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

    const enrichPosts = async (posts) => {
      try {
        const enriched = await Promise.all(
          (posts || []).map(async (p) => {
            const [likeRes, commentRes] = await Promise.all([
              supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', p.id),
              supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', p.id)
            ]);
            return {
              ...p,
              like_count: likeRes?.count || 0,
              comment_count: commentRes?.count || 0
            };
          })
        );
        return enriched;
      } catch {
        return posts || [];
      }
    };

    const loadUserPosts = async () => {
      try {
        setPostsLoading(true);
        console.log('🔍 Loading posts for username:', username);
        const pageSize = 8;
        const { data: posts, error } = await getUserPosts(username, pageSize, 0);
        
        if (error) {
          console.error('❌ Error loading user posts:', error?.message || 'Unknown error');
          console.error('❌ Error details:', JSON.stringify({
            message: error?.message,
            details: error?.details,
            hint: error?.hint,
            code: error?.code,
            name: error?.name
          }, null, 2));
          return;
        }
        
        const enriched = await enrichPosts(posts || []);
        setUserPosts(enriched);
        setOffset(enriched.length);
        setHasMore((posts?.length || 0) === pageSize);
        
              } catch (error) {
          console.error('❌ Error in loadUserPosts:', error?.message || 'Unknown error');
          console.error('❌ Error details:', JSON.stringify({
            message: error?.message,
            details: error?.details,
            hint: error?.hint,
            code: error?.code,
            name: error?.name
          }, null, 2));
        } finally {
        setPostsLoading(false);
      }
    };

    if (username) {
      loadUserProfile();
      loadUserPosts();
    }
  }, [username, currentUser]);

  const handleFollowToggle = async () => {
    if (!currentUser || !userProfile || followLoading) return;
    
    try {
      setFollowLoading(true);
      
      if (isFollowing) {
        // Unfollow
        const { error } = await unfollowUser(userProfile.id);
        if (!error) {
          setIsFollowing(false);
          setFollowersCount(prev => Math.max(0, prev - 1));
          
          // Remove the unfollowed user's posts from the following feed cache
          console.log(`🔄 About to remove posts from user ${userProfile.id} (${userProfile.username}) from following feed cache`);
          removeUserPostsFromFeedCache('following', userProfile.id);
          
          // Force a small delay and then trigger a custom event to ensure UI updates
          setTimeout(() => {
            try {
              console.log('🔄 Dispatching custom unfollow event to force UI refresh');
              window.dispatchEvent(new CustomEvent('user:unfollowed', { 
                detail: { userId: userProfile.id, username: userProfile.username } 
              }));
            } catch (e) {
              console.error('Error dispatching unfollow event:', e);
            }
          }, 100);
          
          console.log(`✅ Unfollowed ${userProfile.username} and removed their posts from following feed`);
        } else {
          console.error('❌ Error unfollowing user:', error);
        }
      } else {
        // Follow
        const { error } = await followUser(userProfile.id);
        if (!error) {
          setIsFollowing(true);
          setFollowersCount(prev => prev + 1);
        } else {
          console.error('❌ Error following user:', error);
        }
      }
    } catch (error) {
      console.error('❌ Error toggling follow:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  // Infinite scroll for posts
  useEffect(() => {
    if (!hasMore || postsLoading) return;
    const el = sentinelRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(async (entries) => {
      const first = entries[0];
      if (first.isIntersecting && !loadingMore) {
        try {
          setLoadingMore(true);
          const pageSize = 8;
          const { data } = await getUserPosts(username, pageSize, offset);
          const newItems = data || [];
          // Enrich with counts
          const enriched = await Promise.all(
            newItems.map(async (p) => {
              const [likeRes, commentRes] = await Promise.all([
                supabase.from('likes').select('*', { count: 'exact', head: true }).eq('post_id', p.id),
                supabase.from('comments').select('*', { count: 'exact', head: true }).eq('post_id', p.id)
              ]);
              return { ...p, like_count: likeRes?.count || 0, comment_count: commentRes?.count || 0 };
            })
          );
          setUserPosts((prev) => [...prev, ...enriched]);
          setOffset((prev) => prev + newItems.length);
          if (newItems.length < pageSize) setHasMore(false);
        } finally {
          setLoadingMore(false);
        }
      }
    }, { root: null, rootMargin: '200px', threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, postsLoading, loadingMore, offset, username]);

  const formatPostForDisplay = (post) => {
    return {
      id: post.id,
      user: {
        name: post.profiles?.username || 'User',
        avatar:
          post.profiles?.avatar_url ||
          "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E",
      },
      image:
        post.items?.image_url ||
        post.lists?.items?.[0]?.image_url ||
        'https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg',
      title: post.items?.name || post.lists?.name || 'Untitled',
      description: post.content || post.items?.notes,
      rating: post.items?.rating || 3,
      likes: post.like_count || 0,
      comments: post.comment_count || 0,
      location: post.location || post.items?.location || '',
      created_at: post.created_at,
      user_liked: post.user_liked || false,
    };
  };

  const handlePostClick = (post) => {
    if (!post) return;
    if (typeof onImageTap === 'function') {
      onImageTap(post.id);
      return;
    }
    if (typeof onSelectPost === 'function') {
      onSelectPost(post);
      return;
    }
    if (typeof onEditItem === 'function') {
      onEditItem(post.items, post.lists);
    }
  };

  const handleCommentTap = (post) => {
    setCommentsModal({ isOpen: true, post });
  };

  const handleCommentAdded = async (postId) => {
    // Update the specific post's comment count immediately
    if (userPosts) {
      const updatedPosts = userPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comment_count: (post.comment_count || 0) + 1,
            comments: (post.comments || 0) + 1 // Also update the 'comments' field that the UI displays
          };
        }
        return post;
      });
      
      // Update the posts state
      setUserPosts(updatedPosts);
    }
    
    console.log('💬 Comment added to post:', postId);
  };

  const handleCloseComments = () => {
    setCommentsModal({ isOpen: false, post: null });
  };

  // Native Android back swipe/button -> go back
  useEffect(() => {
    let handle;
    const add = async () => {
      try {
        handle = await CapacitorApp.addListener('backButton', () => {
          if (typeof onBack === 'function') onBack();
        });
      } catch (_) {}
    };
    add();
    return () => { try { handle && handle.remove && handle.remove(); } catch (_) {} };
  }, [onBack]);


  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50" style={{ backgroundColor: '#F6F6F4' }}>
        <div className="pt-16 px-4">
          <div className="animate-pulse">
            {/* Header placeholder */}
            <div className="flex items-center gap-2 mb-4">
              <button className="w-10 h-10 flex items-center justify-center">
                <div className="w-5 h-5 bg-gray-200 rounded" />
              </button>
              <div className="h-6 w-24 bg-gray-200 rounded" />
            </div>

            {/* Profile card skeleton */}
            <div className="bg-white rounded-2xl p-6 shadow-sm mb-6" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div className="flex items-start gap-4 mb-4">
                <div className="w-20 h-20 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 rounded w-40 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-28" />
                  <div className="flex items-center gap-4 mt-3">
                    <div className="h-4 bg-gray-200 rounded w-16" />
                    <div className="h-4 bg-gray-200 rounded w-16" />
                    <div className="h-4 bg-gray-200 rounded w-16" />
                  </div>
                </div>
              </div>
            </div>

            {/* Posts list skeleton */}
            <div className="bg-white rounded-2xl shadow-sm" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
              <div className="p-4 border-b border-gray-100">
                <div className="h-5 bg-gray-200 rounded w-28" />
              </div>
              <div className="p-4 space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex gap-3">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg" />
                    <div className="flex-1">
                      <div className="h-4 bg-gray-200 rounded mb-2 w-1/2" />
                      <div className="h-3 bg-gray-200 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen bg-stone-50" style={{ backgroundColor: '#F6F6F4' }}>
        <div className="pt-16 px-4">
          <button onClick={onBack} className="mb-4 flex items-center gap-2 text-gray-600">
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <div className="text-center py-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">User not found</h2>
            <p className="text-gray-600">The user {username} could not be found.</p>
          </div>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === userProfile.id;

  return (
    <div className="min-h-screen bg-stone-50" style={{ backgroundColor: '#F6F6F4' }}>
      {/* Profile Content */}
      <div className="px-4 pb-20">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          {/* Header with Back Button */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={onBack} className="w-10 h-10 flex items-center justify-center" aria-label="Back">
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h2 className="text-base font-semibold text-gray-900">Profile</h2>
            <div className="w-10" />
          </div>
          <div className="flex items-start gap-4 mb-4">
         

            {/* Profile Info (username replaced by avatar here) */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-100">
                  {userProfile.avatar_url ? (
                    <img src={userProfile.avatar_url} alt={userProfile.username} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <User className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                </div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {userProfile.username}
                </h2>
              </div>

              {/* Stats */}
              <div className="flex justify-between items-start w-full">
                <div className="text-center">
                  <div className="text-lg font-bold leading-none text-center">{postsCount || 0}</div>
                  <div className="text-xs text-gray-500 mt-0.5 leading-tight text-center">Posts</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold leading-none text-gray-900">{followersCount || 0}</div>
                  <div className="text-xs text-gray-500 mt-0.5 leading-tight text-center">Followers</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold leading-none text-gray-900">{followingCount || 0}</div>
                  <div className="text-xs text-gray-500 mt-0.5 leading-tight text-center">Following</div>
                </div>
              </div>
            </div>

            {/* Follow Button */}
            {!isOwnProfile && currentUser && (
              <button
                onClick={handleFollowToggle}
                disabled={followLoading}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition-colors flex items-center gap-2 ${
                  isFollowing
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-teal-700 text-white hover:bg-teal-800'
                }`}
                style={{ backgroundColor: !isFollowing ? '#1F6D5A' : undefined }}
              >
                {followLoading ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                ) : isFollowing ? (
                  <>
                    <UserMinus className="w-4 h-4" />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    Follow
                  </>
                )}
              </button>
            )}
          </div>

          {/* Bio */}
          {/* {userProfile.bio && (
            <p className="text-gray-700 text-sm leading-relaxed mb-4">
              {userProfile.bio}
            </p>
          )} */}

          {/* Join Date */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>Joined {new Date(userProfile.created_at || Date.now()).toLocaleDateString('en-US', { 
              month: 'long', 
              year: 'numeric' 
            })}</span>
          </div>
        </div>

        {/* Posts Section (list style, minimal changes) */}
        <div className="bg-white rounded-2xl shadow-sm" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div className="p-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">Recent Posts</h3>
          </div>

          {postsLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="w-16 h-16 bg-gray-200 rounded-lg animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded animate-pulse mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : userPosts.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500">No posts yet</p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {userPosts.map((post) => {
                const formattedPost = formatPostForDisplay(post);
                return (
                  <button
                    key={post.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePostClick(post);
                    }}
                    className="w-full text-left flex gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <SmartImage
                      src={formattedPost.image}
                      alt={formattedPost.title}
                      className="w-16 h-16 object-cover rounded-lg"
                      useThumbnail={true}
                      size="small"
                      lazyLoad={true}
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePostClick(post);
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">{formattedPost.title}</h4>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">{formattedPost.description}</p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          <span>{formattedPost.likes}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCommentTap(post);
                          }}
                          className="flex items-center gap-1 hover:text-gray-700 transition-colors"
                        >
                          <MessageCircle className="w-3 h-3" />
                          <span>{formattedPost.comments}</span>
                        </button>
                        {formattedPost.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{formattedPost.location}</span>
                          </div>
                        )}
                        <span className="ml-auto">{new Date(formattedPost.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
              {hasMore && <div ref={sentinelRef} className="h-8" />}
              {loadingMore && (
                <div className="text-center text-sm text-gray-500 py-2">Loading…</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Comments Modal */}
      <CommentsModal
        isOpen={commentsModal.isOpen}
        onClose={handleCloseComments}
        post={commentsModal.post}
        onCommentAdded={handleCommentAdded}
      />
    </div>
  );
};

export default UserProfile; 
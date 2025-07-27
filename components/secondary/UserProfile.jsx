import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Calendar, Users, Heart, MessageCircle, UserPlus, UserMinus } from 'lucide-react';
import { getUserProfile, getUserPosts, followUser, unfollowUser, getUserFollowers, getUserFollowing } from '../../lib/supabase';
import { useAuth } from '../../hooks/useAuth';

const UserProfile = ({ username, onBack, onNavigateToUser }) => {
  const { user: currentUser } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [userPosts, setUserPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

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
        
        // Load follower/following counts
        const [followersResult, followingResult] = await Promise.all([
          getUserFollowers(profile.id),
          getUserFollowing(profile.id)
        ]);
        
        setFollowersCount(followersResult.data?.length || 0);
        setFollowingCount(followingResult.data?.length || 0);
        
        // Check if current user is following this user
        if (currentUser && followersResult.data) {
          const isCurrentlyFollowing = followersResult.data.some(
            follower => follower.follower_id === currentUser.id
          );
          setIsFollowing(isCurrentlyFollowing);
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

    const loadUserPosts = async () => {
      try {
        setPostsLoading(true);
        console.log('🔍 Loading posts for username:', username);
        
        const { data: posts, error } = await getUserPosts(username, 20, 0);
        
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
        
        setUserPosts(posts || []);
        
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
        }
      } else {
        // Follow
        const { error } = await followUser(userProfile.id);
        if (!error) {
          setIsFollowing(true);
          setFollowersCount(prev => prev + 1);
        }
      }
    } catch (error) {
      console.error('❌ Error toggling follow:', error);
    } finally {
      setFollowLoading(false);
    }
  };

  const formatPostForDisplay = (post) => {
    return {
      id: post.id,
      user: {
              name: post.profiles?.username || 'User',
      avatar: post.profiles?.avatar_url || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"%3E%3C/path%3E%3Ccircle cx="12" cy="7" r="4"%3E%3C/circle%3E%3C/svg%3E'
      },
      image: post.items?.image_url || post.lists?.items?.[0]?.image_url || 'https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg',
      title: post.items?.name || post.lists?.name || 'Untitled',
      description: post.content || post.items?.notes || 'No description',
      rating: post.items?.rating || 3,
      likes: post.like_count || 0,
      comments: post.comment_count || 0,
      location: post.location || post.items?.location || '',
      created_at: post.created_at,
      user_liked: post.user_liked || false
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50" style={{ backgroundColor: '#F6F6F4' }}>
        <div className="pt-16 px-4">
          <div className="animate-pulse">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-32"></div>
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
            <p className="text-gray-600">The user @{username} could not be found.</p>
          </div>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === userProfile.id;

  return (
    <div className="min-h-screen bg-stone-50" style={{ backgroundColor: '#F6F6F4' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="w-10 h-10 flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-semibold text-gray-900">
              @{userProfile.username}
            </h1>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="pt-6 px-4">
        {/* Profile Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div className="flex items-start gap-4 mb-4">
            {/* Avatar */}
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
              {userProfile.avatar_url ? (
                <img 
                  src={userProfile.avatar_url} 
                  alt={userProfile.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <img 
                  src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='none' stroke='%23999' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2'%3E%3C/path%3E%3Ccircle cx='12' cy='7' r='4'%3E%3C/circle%3E%3C/svg%3E"
                  alt="Default avatar"
                  className="w-10 h-10 opacity-60"
                />
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900 mb-1">
                {userProfile.display_name || `@${userProfile.username}`}
              </h2>
              <p className="text-gray-600 text-sm mb-3">
                @{userProfile.username}
              </p>
              
              {/* Stats */}
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span><strong>{userPosts.length}</strong> posts</span>
                <span><strong>{followersCount}</strong> followers</span>
                <span><strong>{followingCount}</strong> following</span>
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
          {userProfile.bio && (
            <p className="text-gray-700 text-sm leading-relaxed mb-4">
              {userProfile.bio}
            </p>
          )}

          {/* Join Date */}
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>Joined {new Date(userProfile.created_at || Date.now()).toLocaleDateString('en-US', { 
              month: 'long', 
              year: 'numeric' 
            })}</span>
          </div>
        </div>

        {/* Posts Section */}
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
                  <div key={post.id} className="flex gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                    <img 
                      src={formattedPost.image} 
                      alt={formattedPost.title}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-gray-900 truncate">
                        {formattedPost.title}
                      </h4>
                      <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                        {formattedPost.description}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <div className="flex items-center gap-1">
                          <Heart className="w-3 h-3" />
                          <span>{formattedPost.likes}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <MessageCircle className="w-3 h-3" />
                          <span>{formattedPost.comments}</span>
                        </div>
                        {formattedPost.location && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate">{formattedPost.location}</span>
                          </div>
                        )}
                        <span className="ml-auto">
                          {new Date(formattedPost.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile; 
import React, { useEffect, useState, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Camera, LogOut, Shield, FileText, Settings,
  Star, User, List as ListIcon, Heart
} from 'lucide-react';
import { supabase, signOut, getUserPosts, getUserFollowers, getUserFollowing } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

import PrivacyPolicy from './secondary/PrivacyPolicy.jsx';
import TermsOfService from './secondary/TermsOfService';
import useAchievements from '../hooks/useAchievements';
import ProgressiveImage from './ui/ProgressiveImage';
import InfiniteScrollTrigger from './ui/InfiniteScrollTrigger';
import { ProfileGridSkeleton, AchievementsSkeleton } from './ui/SkeletonLoader';
import { useProfilePosts } from '../hooks/useOptimizedFeed';
import { uploadImageToStorage } from '../lib/imageStorage';
import { saveAvatarUrl, getAvatarUrl, saveBasicProfile, getBasicProfile } from '../lib/localUserCache';
import { Preferences } from '@capacitor/preferences';
import FirstInWorldBadge from './gamification/FirstInWorldBadge';
import useUserStats from '../hooks/useUserStats';

// Helper functions for caching social counts
const SOCIAL_COUNTS_KEY = (userId) => `social_counts_${userId}`;

const saveSocialCounts = async (userId, counts) => {
  if (!userId || !counts) return;
  try {
    await Preferences.set({ 
      key: SOCIAL_COUNTS_KEY(userId), 
      value: JSON.stringify(counts) 
    });
  } catch (_) {}
};

const getSocialCounts = async (userId) => {
  if (!userId) return null;
  try {
    const { value } = await Preferences.get({ key: SOCIAL_COUNTS_KEY(userId) });
    return value ? JSON.parse(value) : null;
  } catch (_) { return null; }
};

/* Smaller, quieter stat pill used in "Additional Info" */
const StatCard = ({ icon, value, label }) => (
  <div className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100">
    <div className="flex items-center gap-2 mb-1">
      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#DCEFE9' }}>
          {icon}
      </div>
      <div className="ml-auto text-sm font-semibold text-gray-900">{Number(value ?? 0).toLocaleString()}</div>
    </div>
    <div className="text-[11px] text-gray-500">{label}</div>
    </div>
  );
  
const ProfileView = React.forwardRef(({ onBack, isRefreshing = false, onEditItem, onNavigateToUser, onImageTap, hadNewAchievementsOnEnter = false }, ref) => {
  const { user, userProfile } = useAuth();

  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(() => userProfile?.avatar_url || null);
  const [showSettings, setShowSettings] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsOfService, setShowTermsOfService] = useState(false);


  const { getUserAchievements } = useAchievements();
  const [hadNewOnEnter, setHadNewOnEnter] = useState(hadNewAchievementsOnEnter);

  const [achievementsOpen, setAchievementsOpen] = useState(true);
  const [infoOpen, setInfoOpen] = useState(false);
  const [userAchievements, setUserAchievements] = useState([]);
  const [achievementsLoading, setAchievementsLoading] = useState(true);

  const [cachedProfile, setCachedProfile] = useState(null);
  const [primaryName, setPrimaryName] = useState(null);

  // Optimized posts loading
  const { 
    posts, 
    loading: postsLoading, 
    loadingMore, 
    hasMore, 
    totalCount,
    loadMore, 
    refresh: refreshPosts 
  } = useProfilePosts(user?.id);
  
  // Use the optimized stats hook for posts count (from profile_stats table)
  const { stats: userStats, loading: statsLoading, refreshStats } = useUserStats(user?.id);
  
  // Separate state for followers/following counts (not in profile_stats table)
  const [followersCount, setFollowersCount] = useState(null);
  const [followingCount, setFollowingCount] = useState(null);
  const [socialCountsLoading, setSocialCountsLoading] = useState(true);
  
  // Extract posts count from userStats
  const postsCount = userStats?.totalItems || 0;
  const countsLoading = statsLoading || socialCountsLoading;
  
  // Debug logging for stats
  useEffect(() => {
    console.log('📊 [ProfileView] Stats updated:', {
      userStats,
      statsLoading,
      postsCount,
      followersCount,
      followingCount,
      socialCountsLoading,
      countsLoading
    });
  }, [userStats, statsLoading, postsCount, followersCount, followingCount, socialCountsLoading, countsLoading]);

  // Followers/Following list views
  const [showFollowers, setShowFollowers] = useState(false);
  const [showFollowing, setShowFollowing] = useState(false);
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [peopleLoading, setPeopleLoading] = useState(false);

  // Achievement modal
  const [selectedAchievement, setSelectedAchievement] = useState(null);
  const [showAchievementModal, setShowAchievementModal] = useState(false);
  const fileInputRef = React.useRef(null);

  // Function to refresh all profile data
  const refreshProfileData = async () => {
    console.log('🔄 [ProfileView] Refreshing all profile data...');
    
    // Refresh stats (posts count, etc.)
    if (refreshStats) {
      await refreshStats();
    }
    
    // Refresh posts
    if (refreshPosts) {
      await refreshPosts();
    }
    
    // Refresh social counts
    await loadSocialCounts(true);
    
    console.log('✅ [ProfileView] Profile data refresh completed');
  };

  // Expose imperative API to open/close settings from parent
  useImperativeHandle(ref, () => ({
    openSettings: () => setShowSettings(true),
    closeSettings: () => setShowSettings(false),
    refresh: refreshProfileData,
  }));

  // Initialize basic profile and avatar from local cache for instant display
  useEffect(() => {
    const initBasics = async () => {
      if (!user?.id) return;
      const basic = await getBasicProfile(user.id);
      if (basic) setCachedProfile(basic);
      const localAvatar = await getAvatarUrl(user.id);
      if (localAvatar) setAvatarUrl(localAvatar);
      else if (avatarUrl == null) setAvatarUrl(userProfile?.avatar_url || null);
    };
    initBasics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Ensure name is immediately available from email, then cached, then remote
  // useEffect(() => {
  //   if (user?.email && !primaryName) {
  //     // Only use email prefix if no name is set yet
  //     setPrimaryName(user.email.split('@')[0]);
  //   }
  // }, [user?.email, primaryName]);

  // Priority-based name resolution
  useEffect(() => {
    let newName = null;
    
    // Priority 1: Remote profile data (highest priority)
    if (userProfile?.display_name) {
      newName = userProfile.display_name;
    } else if (userProfile?.username) {
      newName = userProfile.username;
    }
    // Priority 2: Cached profile data
    else if (cachedProfile?.display_name) {
      newName = cachedProfile.display_name;
    } else if (cachedProfile?.username) {
      newName = cachedProfile.username;
    }
    // Priority 3: Email fallback (lowest priority)
    else if (user?.email) {
      newName = user.email.split('@')[0];
    }

    if (newName && newName !== primaryName) {
      setPrimaryName(newName);
    }
  }, [
    userProfile?.display_name, 
    userProfile?.username, 
    cachedProfile?.display_name, 
    cachedProfile?.username, 
    user?.email, 
    primaryName
  ]);

  // If no local avatar and remote arrives later, set once without flicker
  useEffect(() => {
    if (!avatarUrl && userProfile?.avatar_url) {
      setAvatarUrl(userProfile.avatar_url);
    }
  }, [userProfile?.avatar_url, avatarUrl]);

  // Persist basics whenever profile/user changes
  useEffect(() => {
    if (!user?.id) return;
    const displayName = userProfile?.display_name || null;
    const username = userProfile?.username || null;
    const email = user?.email || null;
    if (displayName || username || email) {
      saveBasicProfile(user.id, { display_name: displayName, username, email });
    }
  }, [user?.id, user?.email, userProfile?.display_name, userProfile?.username]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    
    console.log('📷 [Avatar] Starting upload for user:', user.id);
    
    try {
      const upload = await uploadImageToStorage(file, user.id);
      console.log('📷 [Avatar] Upload result:', upload);
      
      if (upload?.error || !upload?.url) {
        console.error('📷 [Avatar] Upload failed:', upload?.error);
        return;
      }
      
      console.log('📷 [Avatar] Updating database with URL:', upload.url);
      
      // Update both tables - profiles (main) and users (metadata)
      const [profileResult, usersResult] = await Promise.all([
        supabase
          .from('profiles')
          .update({ avatar_url: upload.url })
          .eq('id', user.id),
        supabase
          .from('users')
          .update({ avatar_url: upload.url })
          .eq('id', user.id)
      ]);
      
      if (profileResult.error) {
        console.error('📷 [Avatar] Failed to update profiles table:', profileResult.error);
      } else {
        console.log('📷 [Avatar] Successfully updated profiles table');
      }
      
      if (usersResult.error) {
        console.error('📷 [Avatar] Failed to update users table:', usersResult.error);
      } else {
        console.log('📷 [Avatar] Successfully updated users table');
      }
      
      // Also try to update auth user metadata for consistency
      try {
        const { error: authError } = await supabase.auth.updateUser({
          data: { avatar_url: upload.url }
        });
        
        if (authError) {
          console.warn('📷 [Avatar] Could not update auth user metadata (this is okay):', authError);
        } else {
          console.log('📷 [Avatar] Successfully updated auth user metadata');
        }
      } catch (authErr) {
        console.warn('📷 [Avatar] Auth update not supported (this is okay):', authErr);
      }
      
      // Optimistically reflect change without full reload
      setAvatarUrl(upload.url);
      console.log('📷 [Avatar] UI updated with new avatar URL');
      
      // Cache locally for offline use
      await saveAvatarUrl(user.id, upload.url);
      console.log('📷 [Avatar] Cached locally for offline use');
      
      // reset input so selecting the same file again triggers change
      if (e.target) e.target.value = '';
      
    } catch (err) {
      console.error('📷 [Avatar] Upload error:', err);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error } = await signOut();
      if (error) console.error('❌ Sign out error:', error);
    } catch (error) {
      console.error('❌ Sign out exception:', error);
    }
  };



  // Function to load social counts with caching
  const loadSocialCounts = async (forceRefresh = false) => {
    if (!user?.id) return;
    
    try {
      setSocialCountsLoading(true);
      
      // Try to load from cache first (unless forcing refresh)
      if (!forceRefresh) {
        const cached = await getSocialCounts(user.id);
        if (cached) {
          setFollowersCount(cached.followersCount || 0);
          setFollowingCount(cached.followingCount || 0);
          setSocialCountsLoading(false);
          
          // Load fresh data in background
          setTimeout(() => loadSocialCounts(true), 100);
          return;
        }
      }
      
      // Load fresh data from server
      const [followersRes, followingRes] = await Promise.all([
        getUserFollowers(user.id),
        getUserFollowing(user.id)
      ]);

      const newCounts = {
        followersCount: followersRes.data?.length || 0,
        followingCount: followingRes.data?.length || 0
      };
      
      setFollowersCount(newCounts.followersCount);
      setFollowingCount(newCounts.followingCount);
      
      // Cache the results
      await saveSocialCounts(user.id, newCounts);
      
      console.log('📊 [ProfileView] Social stats loaded - Followers:', newCounts.followersCount, 'Following:', newCounts.followingCount);
    } catch (e) {
      console.error('Error loading social counts:', e);
    } finally {
      setSocialCountsLoading(false);
    }
  };

  /* Load achievements */
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        setAchievementsLoading(true);
        const ach = await getUserAchievements(user?.id);
        if (alive) setUserAchievements(ach || []);
      } finally {
        if (alive) setAchievementsLoading(false);
      }
    };
    if (user?.id) {
      load();
    }
    return () => { alive = false; };
  }, [user?.id, getUserAchievements]);

  /* Load social counts */
  useEffect(() => {
    if (user?.id) {
      loadSocialCounts();
    }
  }, [user?.id]);

  // Infinite scroll is now handled by useProfilePosts hook

  if (showPrivacyPolicy) return <PrivacyPolicy onBack={() => setShowPrivacyPolicy(false)} />;
  if (showTermsOfService) return <TermsOfService onBack={() => setShowTermsOfService(false)} />;

  // Followers/following loaders
  const loadPeople = async (type) => {
    if (!user?.id) return;
    try {
      setPeopleLoading(true);
      if (type === 'followers') {
        const res = await getUserFollowers(user.id);
        const ids = (res.data || []).map((f) => f.follower_id);
        if (ids.length === 0) { setFollowers([]); return; }
        const { data: profiles } = await supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', ids);
        setFollowers(profiles || []);
      } else {
        const res = await getUserFollowing(user.id);
        const ids = (res.data || []).map((f) => f.following_id);
        if (ids.length === 0) { setFollowing([]); return; }
        const { data: profiles } = await supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', ids);
        setFollowing(profiles || []);
      }
    } finally {
      setPeopleLoading(false);
    }
  };

  if (showFollowers || showFollowing) {
    const list = showFollowers ? followers : following;
    const title = showFollowers ? 'Followers' : 'Following';
    return (
      <div className="min-h-screen bg-white">
        <div
          className="fixed top-0 left-0 right-0 z-20 pb-3 bg-white"
          style={{
            paddingTop: 'calc(env(safe-area-inset-top) + 32px)',
            paddingLeft: 'env(safe-area-inset-left)',
            paddingRight: 'env(safe-area-inset-right)'
          }}
        >
          <div className="px-4 flex items-center justify-between">
            <button onClick={() => { setShowFollowers(false); setShowFollowing(false); }} className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <div className="w-10" />
          </div>
        </div>

        <div className="pt-20 px-4 pb-6 space-y-3">
          {peopleLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {list.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onNavigateToUser && p.username && onNavigateToUser(p.username)}
                  className="w-full flex items-center gap-3 bg-white"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100">
                    {p.avatar_url ? (
                      <img src={p.avatar_url} alt={p.username} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><User className="w-5 h-5 text-gray-400" /></div>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{p.display_name || p.username || 'User'}</div>
                    {p.username && <div className="text-xs text-gray-500 truncate">@{p.username}</div>}
                  </div>
                </button>
              ))}
              {list.length === 0 && (
                <div className="text-sm text-gray-500">No users yet</div>
              )}
                </div>
          )}
              </div>
            </div>
    );
  }

  /* Settings view unchanged to preserve functionality */
  if (showSettings) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#F6F6F4' }}>
        <div className="pt-16 px-4 pb-10">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Profile</h3>
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
            <div className="text-sm text-gray-600">Email</div>
            <div className="text-base text-gray-900">{user?.email}</div>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">App</h3>
            <div className="space-y-3">
            <button onClick={() => setShowPrivacyPolicy(true)} className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between hover:bg-gray-50">
              <span className="text-gray-900">Privacy Policy</span>
              <div className="w-2 h-2 bg-gray-300 rounded-full" />
              </button>
            <button onClick={() => setShowTermsOfService(true)} className="w-full bg-white rounded-2xl p-4 shadow-sm flex items-center justify-between hover:bg-gray-50">
              <span className="text-gray-900">Terms of Service</span>
              <div className="w-2 h-2 bg-gray-300 rounded-full" />
            </button>
          </div>
          <button onClick={handleSignOut} className="mt-6 w-full bg-red-50 border border-red-100 rounded-2xl p-4 text-red-600 font-medium">Sign Out</button>
        </div>

        {/* Settings header */}
        <div
          className="fixed top-0 left-0 right-0 z-20 pb-4"
          style={{
            backgroundColor: '#F6F6F4',
            paddingTop: 'calc(env(safe-area-inset-top) + 32px)',
            paddingLeft: 'env(safe-area-inset-left)',
            paddingRight: 'env(safe-area-inset-right)'
          }}
        >
          <div className="px-4 flex items-center justify-between">
            <button onClick={() => setShowSettings(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
            <h2 className="text-base font-semibold text-gray-900">Settings</h2>
            <div className="w-10" />
          </div>
        </div>
      </div>
    );
  }

  /* -------- Profile (mimic screenshot layout, our style) -------- */
  return (
    <div 
      className="min-h-screen overflow-x-hidden" 
      style={{ backgroundColor: '#FFFFFF' }}
    >
      <div className="px-4 pb-20 pt-6 space-y-6">
        {/* Header row (best-practice alignment) */}
        <div className="p-1">
          <div className="grid grid-cols-[auto,1fr] gap-4 items-start">
            {/* Avatar spans both rows and is vertically centered */}
            <div className="row-span-2 self-start w-24 h-24 rounded-full overflow-hidden bg-gray-100 cursor-pointer" onClick={handleAvatarClick}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFileChange} />

            {/* Username + email (right col, first row) */}
            <div className="min-w-0 flex flex-col justify-start">
              <div className="text-base font-semibold text-gray-900 truncate">
                {primaryName}
              </div>
              <div className="text-sm text-gray-500 truncate">{user?.email}</div>
            </div>

            {/* Counts row (right col, second row) */}
            <div className="col-start-2 mt-2">
              <div className="grid grid-cols-3 gap-6 w-full max-w-[320px] justify-items-start items-start text-left">
                <div>
                  {countsLoading || postsCount === null ? (
                    <div className="h-6 w-10 bg-gray-100 rounded animate-pulse" />
                  ) : (
                    <div className="text-2xl font-bold leading-none text-left">{postsCount}</div>
                  )}
                  <div className="text-xs text-gray-500 mt-0.5 leading-tight text-left">Items</div>
                </div>
                <button className="text-left" onClick={() => { setShowFollowing(false); setShowFollowers(true); loadPeople('followers'); }}>
                  {countsLoading || followersCount === null ? (
                    <div className="h-6 w-10 bg-gray-100 rounded animate-pulse" />
                  ) : (
                    <div className="text-2xl font-bold leading-none text-gray-900">{followersCount}</div>
                  )}
                  <div className="text-xs text-gray-500 mt-0.5 leading-tight">Followers</div>
                </button>
                <button className="text-left" onClick={() => { setShowFollowers(false); setShowFollowing(true); loadPeople('following'); }}>
                  {countsLoading || followingCount === null ? (
                    <div className="h-6 w-10 bg-gray-100 rounded animate-pulse" />
                  ) : (
                    <div className="text-2xl font-bold leading-none text-gray-900">{followingCount}</div>
                  )}
                  <div className="text-xs text-gray-500 mt-0.5 leading-tight">Following</div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Achievements section (no dropdown) */}
        <div>
          <div className="mb-2">
            <div className="relative inline-flex items-center">
              <h3 className="text-sm font-semibold text-gray-900">Achievements</h3>
              {hadNewOnEnter && (
                <span className="ml-2 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </div>
          </div>
          {achievementsLoading ? (
            <AchievementsSkeleton count={10} />
          ) : (
            <>
              {userAchievements.length > 0 ? (
                <div className="grid grid-cols-5 gap-2">
                  {userAchievements.map((ua) => (
                    <button
                      key={ua.id}
                      onClick={() => { setSelectedAchievement(ua); setShowAchievementModal(true); }}
                      className="flex flex-col items-center"
                    >
                      <div className="w-14 h-14 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-xl relative">
                        {ua.achievements?.icon || '🏆'}
                        {ua.count > 1 && (
                          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] bg-teal-600 text-white">x{ua.count}</span>
                        )}
                      </div>
                      <div className="mt-1 text-[10px] text-gray-600 text-center truncate w-14">
                        {ua.achievements?.name}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500">No achievements yet</div>
              )}
            </>
          )}
        </div>
        {/* Additional information hidden per request */}

        {/* Recent Activity feed (mimic screenshot "cards") */}
                  <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900">Recent photos</h3>
          </div>

          {postsLoading ? (
            <ProfileGridSkeleton count={6} />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {posts.length > 0 && console.log('🔍 [ProfileView] Posts loaded:', posts.length)}
              {posts.map((post, index) => (
                <div key={post.id}>
                  <div
                    className="relative cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Navigate to post detail view
                      if (post.id && onImageTap) {
                        onImageTap(post.id);
                      }
                    }}
                  >
                    <ProgressiveImage
                      thumbnailUrl={post.items?.image_url}
                      fullUrl={post.items?.image_url}
                      alt={post.items?.name || 'Item'}
                      className="w-full aspect-square object-cover rounded-xl"
                      priority={index < 6 ? 'high' : 'normal'} // First 6 images get high priority
                      useLocalCache={true} // Enable local caching for offline access
                      postId={post.items?.id}
                      viewType="profile"
                      onLoadStateChange={(loadState) => {
                        // Debug log for ProfileView images
                        if (Math.random() < 0.1) { // 10% frequency to avoid spam
                          console.log(`🖼️ [ProfileView] Image load state: ${post.items?.id?.substring(0, 8)} ${JSON.stringify({
                            loadState,
                            imageUrl: post.items?.image_url ? (post.items.image_url.startsWith('https://') ? 'HTTPS_URL' : 'BASE64_OR_OTHER') : 'NO_URL'
                          })}`);
                        }
                      }}
                    />
                    {/* Pending sync indicator for offline items */}
                    {post.items?.pending_sync && (
                      <div className="absolute top-2 right-2 w-3 h-3 bg-orange-500 rounded-full border-2 border-white shadow-sm" title="Pending sync" />
                    )}
                    {/* First in World Badge for profile photos */}
                    {(post.items?.is_first_in_world || post.items?.first_in_world_achievement_id) && (
                      <FirstInWorldBadge 
                        achievement={{
                          id: post.items.first_in_world_achievement_id || 'first_in_world',
                          name: 'First in World',
                          rarity: 'legendary',
                          icon: '🌍'
                        }}
                        size="small"
                        variant="floating"
                        animate={true}
                      />
                    )}
                  </div>

                  <div className="mt-2">
                    {/* Title */}
                    <div className="text-[13px] font-medium text-gray-900 truncate">
                      {post.items?.name || 'Untitled'}
                    </div>

                    {/* Rating + List badge */}
                    <div className="mt-1 flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[12px] text-gray-700">
                        <Star className="w-3.5 h-3.5 text-yellow-500 fill-current" />
                        <span>{post.items?.rating ? Math.abs(post.items.rating) : '—'}</span>
                      </div>
                      {post.lists?.name && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-gray-50 border border-gray-200 text-gray-600 truncate max-w-[70%]">
                          {post.lists.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Optimized Infinite Scroll */}
              {hasMore && (
                <div className="col-span-2">
                  <InfiniteScrollTrigger
                    onIntersect={loadMore}
                    loading={loadingMore}
                    enabled={!postsLoading}
                    rootMargin="200px"
                  />
                </div>
              )}
              
              {posts.length === 0 && !postsLoading && (
                <div className="col-span-2 text-sm text-gray-500">No recent photos yet</div>
              )}
            </div>
          )}
          </div>
        </div>

      {/* Achievement details modal */}
      {showAchievementModal && selectedAchievement && (
        <div className="fixed inset-0 z-30 bg-black/40 flex items-center justify-center px-6" onClick={() => setShowAchievementModal(false)}>
          <div className="w-full max-w-sm bg-white rounded-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-16 h-16 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-3xl relative">
                {selectedAchievement.achievements?.icon || '🏆'}
                {selectedAchievement.count > 1 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full text-[10px] bg-teal-600 text-white">x{selectedAchievement.count}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-base font-semibold text-gray-900 truncate">
                  {selectedAchievement.achievements?.name}
                </div>
              </div>
            </div>
            <div className="text-sm text-gray-600 whitespace-pre-line">
              {selectedAchievement.achievements?.description || 'No description'}
            </div>
            <div className="mt-4 flex justify-end">
              <button className="px-4 py-2 text-sm font-medium rounded-full bg-teal-600 text-white" onClick={() => setShowAchievementModal(false)}>Close</button>
          </div>
          </div>
          </div>
        )}
    </div>
  );
});

export default ProfileView;
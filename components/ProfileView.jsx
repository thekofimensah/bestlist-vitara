import React, { useEffect, useState, useImperativeHandle } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowLeft, Camera, LogOut, Shield, FileText, Settings,
  Star, User, List as ListIcon, Heart
} from 'lucide-react';
import { supabase, signOut, getUserPosts, getUserFollowers, getUserFollowing } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import useUserStats from '../hooks/useUserStats';
import PrivacyPolicy from './secondary/PrivacyPolicy.jsx';
import TermsOfService from './secondary/TermsOfService';
import useAchievements from '../hooks/useAchievements';
import SmartImage from './secondary/SmartImage';
import { uploadImageToStorage } from '../lib/imageStorage';

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
  
const ProfileView = React.forwardRef(({ onBack, isRefreshing = false, onEditItem, onNavigateToUser }, ref) => {
  const { user, userProfile } = useAuth();

  const [loading, setLoading] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsOfService, setShowTermsOfService] = useState(false);

  const { stats, loading: statsLoading, error: statsError } = useUserStats(user?.id);
  const { getUserAchievements } = useAchievements();

  const [achievementsOpen, setAchievementsOpen] = useState(true);
  const [infoOpen, setInfoOpen] = useState(false);
  const [userAchievements, setUserAchievements] = useState([]);
  const [achievementsLoading, setAchievementsLoading] = useState(true);

  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [postsCount, setPostsCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = React.useRef(null);

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

  // Expose imperative API to open/close settings from parent
  useImperativeHandle(ref, () => ({
    openSettings: () => setShowSettings(true),
    closeSettings: () => setShowSettings(false),
  }));

  // Initialize local avatar URL from profile; don't override if we've set a new one locally
  useEffect(() => {
    if (avatarUrl == null) {
      setAvatarUrl(userProfile?.avatar_url || null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userProfile?.avatar_url]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;
    try {
      const upload = await uploadImageToStorage(file, user.id);
      if (upload?.error || !upload?.url) return;
      await Promise.all([
        supabase.from('profiles').update({ avatar_url: upload.url }).eq('id', user.id),
        supabase.from('users').update({ avatar_url: upload.url }).eq('id', user.id)
      ]);
      // Optimistically reflect change without full reload
      setAvatarUrl(upload.url);
      // reset input so selecting the same file again triggers change
      if (e.target) e.target.value = '';
    } catch (err) {
      console.error('Avatar upload error', err);
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

  // Real stats with fallbacks (totalItems is the "big number")
  const userStats = {
    photosTaken: stats?.photosTaken || 0,
    listsCreated: stats?.listsCreated || 0,
    uniqueIngredients: stats?.uniqueIngredients || 0,
    likesReceived: stats?.likesReceived || 0,
    totalItems: stats?.totalItems || 0,
    avgRating: stats?.avgRating || 0,
  };

  /* Load achievements, counts and initial posts */
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

      try {
        setPostsLoading(true);
        if (user?.id) {
          const [followersRes, followingRes, postsCountRes] = await Promise.all([
            getUserFollowers(user.id),
            getUserFollowing(user.id),
            supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('is_public', true),
          ]);

          if (alive) {
            setFollowersCount(followersRes.data?.length || 0);
            setFollowingCount(followingRes.data?.length || 0);
            setPostsCount(postsCountRes?.count || 0);
          }

          const pageSize = 8;
          const { data } = await getUserPosts(user.id, pageSize, 0);
          if (alive) {
            setPosts(data || []);
            setOffset((data?.length || 0));
            setHasMore((data?.length || 0) === pageSize);
          }
        }
      } catch (e) {
        if (alive) {
          setPosts([]);
          setHasMore(false);
        }
      } finally {
        if (alive) setPostsLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [user?.id, getUserAchievements]);

  /* Infinite scroll */
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
          const { data } = await getUserPosts(user.id, pageSize, offset);
          const newItems = data || [];
          setPosts((prev) => [...prev, ...newItems]);
          setOffset((prev) => prev + newItems.length);
          if (newItems.length < pageSize) setHasMore(false);
        } finally {
          setLoadingMore(false);
        }
      }
    }, { root: null, rootMargin: '200px', threshold: 0 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [hasMore, postsLoading, loadingMore, offset, user?.id]);

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
    <div className="min-h-screen" style={{ backgroundColor: '#FFFFFF' }}>
      <div className="px-4 pb-8 pt-6 space-y-6">
        {/* Header row (best-practice alignment) */}
        <div className="p-1">
          <div className="grid grid-cols-[auto,1fr] gap-4 items-start">
            {/* Avatar spans both rows and is vertically centered */}
            <div className="row-span-2 self-start w-20 h-20 rounded-full overflow-hidden bg-gray-100 cursor-pointer" onClick={handleAvatarClick}>
              {(avatarUrl || userProfile?.avatar_url) ? (
                <img src={avatarUrl || userProfile?.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFileChange} />

            {/* Username + email (right col, first row) */}
            <div className="min-w-0">
              <div className="text-base font-semibold text-gray-900 truncate">
                {userProfile?.display_name || userProfile?.username || user?.email?.split('@')[0] || 'User'}
              </div>
              <div className="text-sm text-gray-500 truncate">{user?.email}</div>
            </div>

            {/* Counts row (right col, second row) */}
            <div className="col-start-2 mt-2 flex justify-end">
              <div className="grid grid-cols-3 gap-12 min-w-[280px] justify-items-center text-center">
                <div>
                  <div className="text-2xl font-bold leading-none">{postsCount}</div>
                  <div className="text-xs text-gray-500 mt-0.5 leading-tight">Posts</div>
                </div>
                <button className="text-center" onClick={() => { setShowFollowing(false); setShowFollowers(true); loadPeople('followers'); }}>
                  <div className="text-2xl font-bold leading-none text-gray-900">{followersCount}</div>
                  <div className="text-xs text-gray-500 mt-0.5 leading-tight">Followers</div>
                </button>
                <button className="text-center" onClick={() => { setShowFollowers(false); setShowFollowing(true); loadPeople('following'); }}>
                  <div className="text-2xl font-bold leading-none text-gray-900">{followingCount}</div>
                  <div className="text-xs text-gray-500 mt-0.5 leading-tight">Following</div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Achievements section (no dropdown) */}
        <div>
          <div className="mb-2">
            <h3 className="text-sm font-semibold text-gray-900">Achievements</h3>
          </div>
          {achievementsLoading ? (
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />
              ))}
            </div>
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
            <div className="grid grid-cols-2 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-2 shadow-sm">
                  <div className="w-full aspect-square bg-gray-100 rounded-xl animate-pulse" />
                  <div className="h-3 bg-gray-100 rounded mt-2" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {posts.map((post) => (
                <div key={post.id}>
                  <div
                    className="relative cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditItem && onEditItem(post.items, post.lists);
                    }}
                  >
                    <SmartImage
                      src={post.items?.image_url}
                      alt={post.items?.name || 'Item'}
                      className="w-full aspect-square object-cover rounded-xl"
                      useThumbnail={true}
                      size="medium"
                      lazyLoad={true}
                    />
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

              {/* Infinite-scroll sentinel */}
              {hasMore && <div ref={sentinelRef} className="col-span-2 h-8" />}
              {loadingMore && (
                <div className="col-span-2 text-center text-sm text-gray-500 py-2">Loading…</div>
              )}
              {posts.length === 0 && (
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
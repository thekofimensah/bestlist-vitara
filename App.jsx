import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, List, User, Search, Bell, X, Trophy } from 'lucide-react';
import { App as CapacitorApp } from '@capacitor/app';
import MainScreen from './components/MainScreen';
import ErrorBoundary from './components/ErrorBoundary';
import { installGlobalErrorTracking } from './lib/errorTracking';
import ListsView from './components/ListsView';
import ProfileView from './components/ProfileView';
import ShowItemsInListView from './components/secondary/ShowItemsInListView';
import AuthView from './components/AuthView';
import AddItemModal from './components/AddItemModal';
import UserProfile from './components/secondary/PublicUserProfile.jsx';
import PullToRefresh from './ui/PullToRefresh';
import { enableNativeKeyboardEnhancements } from './lib/enableNativeKeyboard';
import { supabase, signOut, searchUserContent, getFeedPosts, getPostCommentCount, searchUsers, followUser, unfollowUser, getSessionOptimized } from './lib/supabase';
import { useOptimizedFeed } from './hooks/useOptimizedFeed';
import { useLists } from './hooks/useLists';
import { motion as Sparkles } from 'framer-motion';
import { NotificationsDropdown } from './components/secondary/NotificationsDropdown';
import AchievementsDropdown from './components/gamification/AchievementsDropdown';
import useAchievements from './hooks/useAchievements';
import { useNotifications } from './hooks/useNotifications';
import PostDetailView from './components/secondary/PostDetailView';
import AchievementSystem from './components/gamification/AchievementSystem';
import { AchievementProvider } from './hooks/useGlobalAchievements.jsx';
import useUserTracking from './hooks/useUserTracking';
import usePendingAchievements from './hooks/usePendingAchievements';
import useUserStats from './hooks/useUserStats';

// Helper function to format post data from database (moved from MainScreen)
  const formatPostForDisplay = (post) => {
  const getTimeAgo = (dateString) => {
    if (!dateString) return '';
    const now = new Date();
    const postDate = new Date(dateString);
    const diffMs = now - postDate;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    
    if (diffSec < 60) return 'Just now';
    if (diffMin < 60) return `${diffMin}m`;
    if (diffHrs < 24) return `${diffHrs}h`;
    if (diffDays < 7) return `${diffDays}d`;
    if (diffWeeks < 4) return `${diffWeeks}w`;
    return `${diffMonths}mo`;
  };

  const getVerdictFromRating = (rating, isStayAway) => {
    if (isStayAway) return 'AVOID';
    return rating >= 4 ? 'KEEP' : 'MEH';
  };

  return {
    id: post.id,
    user: {
      name: post.user?.name || post.profiles?.display_name || post.profiles?.username || 'User',
      avatar: post.user?.avatar || post.profiles?.avatar_url || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"%3E%3C/path%3E%3Ccircle cx="12" cy="7" r="4"%3E%3C/circle%3E%3C/svg%3E',
    },
    image: post.items?.image_url || '',
    rating: post.items?.rating || 3,
    verdict: getVerdictFromRating(post.items?.rating, post.items?.is_stay_away),
    snippet: post.items?.notes || '',
    timestamp: getTimeAgo(post.created_at),
    likes: post.like_count || 0,
    comments: post.comment_count || 0,
    user_liked: post.user_liked || false,
    item_name: post.items?.name || 'Unknown Item',
    list_name: post.lists?.name || 'Unknown List',
    location: post.items?.place_name || post.location || null
  };
};

// Custom loading component
const MultiStepLoadingScreen = ({ step, totalSteps, messages, currentMessage }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50" style={{ backgroundColor: '#F6F6F4' }}>
      <div className="flex flex-col items-center justify-center px-8">
        {/* Logo */}
        <div className="w-24 h-24 bg-teal-700 rounded-3xl flex items-center justify-center mb-8 shadow-lg" style={{ backgroundColor: '#1F6D5A' }}>
          <span className="text-white text-3xl font-bold">b</span>
        </div>
        
        {/* App Name */}
        <h1 className="text-3xl font-normal text-gray-900 mb-2 tracking-tight" style={{ fontFamily: 'Jost, sans-serif' }}>bestlist</h1>
        <p className="text-gray-600 text-center mb-8">Your personal food discovery companion</p>
        
        {/* Progress Bar */}
        <div className="w-64 bg-gray-200 rounded-full h-2 mb-4">
          <div 
            className="bg-teal-700 h-2 rounded-full transition-all duration-300 ease-out"
            style={{ 
              width: `${(step / totalSteps) * 100}%`,
              backgroundColor: '#1F6D5A'
            }}
          />
          </div>
        
        {/* Step Counter */}
        <div className="text-sm text-gray-500 mb-6">
          Step {step} of {totalSteps}
        </div>
        
        {/* Current Message */}
        <motion.div
          key={currentMessage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="text-center"
        >
          <p className="text-gray-700 font-medium">{currentMessage}</p>
        </motion.div>
      </div>
    </div>
  );
};

const App = () => {
  // Enable native keyboard features globally
  useEffect(() => {
    const teardown = enableNativeKeyboardEnhancements();
    // Install once
    installGlobalErrorTracking();
    return () => teardown && teardown();
  }, []);
  const [user, setUser] = useState(null);
  const { notifications, unreadCount, isOpen, toggleOpen, markAsRead, markAllAsRead, ready: notificationsReady } = useNotifications(user?.id);
  const [achievementsOpen, setAchievementsOpen] = useState(false);
  const [recentAchievements, setRecentAchievements] = useState([]);
  const { getUserAchievements } = useAchievements();
  // Pending achievements hook (must be declared before any effects that reference it)
  const {
    pendingAchievements,
    loading: achievementsLoading,
    showPendingAchievements,
    loadPendingAchievements,
    markAsNotified
  } = usePendingAchievements(user?.id);

  // Load recent achievements when user opens the dropdown or on user change
  useEffect(() => {
    const load = async () => {
      if (!user?.id) return;
      const data = await getUserAchievements(user.id);
      setRecentAchievements(data?.slice(0, 50) || []);
    };
    if (achievementsOpen) {
      load();
    }
  }, [achievementsOpen, user?.id]);

  // When opening Achievements, mark any pending achievements as seen/notified
  useEffect(() => {
    if (!achievementsOpen) return;
    if (!pendingAchievements || pendingAchievements.length === 0) return;
    const ids = pendingAchievements.map(a => a.achievement_id).filter(Boolean);
    if (ids.length > 0) {
      setTimeout(() => {
        try { markAsNotified(ids); } catch {}
      }, 300);
    }
  }, [achievementsOpen, pendingAchievements, markAsNotified]);
  const { trackUserSession, isTracking } = useUserTracking();
  const [appLoading, setAppLoading] = useState(true);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  
  // Comprehensive loading state for all data
  const [loadingProgress, setLoadingProgress] = useState({
    auth: false,
    lists: false,
    feed: false,
    stats: false,
    achievements: false,
    userTracking: false
  });
  
  
  
  
  // User stats hook 
  const { stats: userStats, loading: statsLoading } = useUserStats(user?.id);
  const [currentScreen, setCurrentScreen] = useState('home');
  const [previousScreen, setPreviousScreen] = useState('home');
  const [selectedList, setSelectedList] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedUsername, setSelectedUsername] = useState(null);
  const [userProfileKey, setUserProfileKey] = useState(0);
  const [userProfileOrigin, setUserProfileOrigin] = useState(null);
  const profileViewRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef(null);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTab, setSearchTab] = useState('content'); // 'content' or 'users'
  const [userResults, setUserResults] = useState([]);
  const [followingUsers, setFollowingUsers] = useState(new Set());
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [scrollToCommentsOnOpen, setScrollToCommentsOnOpen] = useState(false);
  const [postOriginScreen, setPostOriginScreen] = useState(null);
  const { 
    lists, 
    loading: listsLoading, 
    addItemToList, 
    updateItemInList, 
    refreshLists, 
    createList, 
    reorderLists,
    deleteList,
    updateList,
    retryCount,
    connectionError,
    isRetrying 
  } = useLists(user?.id);
  const [editingItem, setEditingItem] = useState(null);
  const [editingList, setEditingList] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deepLinkData, setDeepLinkData] = useState(null);
  const mainScreenRef = useRef(null);
  const hasInitialized = useRef(false);

  // Use optimized feed hook
  const {
    posts: feedPosts,
    loading: isLoadingFeed,
    loadingMore: isLoadingMore,
    error: feedError,
    loadMore,
    refresh: refreshFeed,
    hasMore,
    connectionQuality,
    updateImageLoadState,
    textLoaded,
    imagesLoaded
  } = useOptimizedFeed('following');

  // Log only critical changes
  useEffect(() => {
    if (!isLoadingFeed && feedPosts?.length > 0) {
      console.log('✅ [App] Feed data received:', JSON.stringify({
        feedPostsCount: feedPosts.length,
        timestamp: performance.now().toFixed(2) + 'ms'
      }));
    }
  }, [isLoadingFeed, feedPosts?.length]);

  // Feed loading progress ref (defined at component level to avoid closure issues)
  const feedResolveRef = useRef(null);

  // Watch for feed loading completion
  useEffect(() => {
    if (!isLoadingFeed && feedResolveRef.current) {
      setLoadingProgress(prev => {
        const newProgress = { ...prev, feed: true };
        console.log('📊 [App] Feed loading completed via effect:', JSON.stringify(newProgress));
        return newProgress;
      });
      console.log('✅ [App] Feed loaded via effect');
      feedResolveRef.current();
      feedResolveRef.current = null;
    }
  }, [isLoadingFeed]);

  const handleSignOut = async () => {
    try {
      await signOut();
      // Reset all states
      setUser(null);
      setAppLoading(false);
      setImagesLoading(false);
      setProfileLoading(false);
      setSelectedList(null);
      setSelectedItem(null);
      setEditingItem(null);
      setEditingList(null);
      // Feed state is now managed by useOptimizedFeed hook
    } catch (error) {
      console.error('Error signing out:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error
      });
    }
  };

  // Real Supabase search function
  const performSearch = async (query) => {
    if (!query.trim() || !user?.id) {
      setSearchResults([]);
      setUserResults([]);
      return;
    }

    setIsSearching(true);
    
    try {
      if (searchTab === 'content') {
        const { data, error } = await searchUserContent(user.id, query);
        
        if (error) {
          console.error('Search error:', JSON.stringify({
          message: err.message,
          name: err.name,
          details: err.details,
          hint: err.hint,
          code: err.code,
          fullError: err
        }, null, 2));
          setSearchResults([]);
        } else {
          setSearchResults(data || []);
        }
      } else {
        const { data, error } = await searchUsers(query);
        
        if (error) {
          console.error('User search error:', JSON.stringify({
          message: err.message,
          name: err.name,
          details: err.details,
          hint: err.hint,
          code: err.code,
          fullError: err
        }, null, 2));
          setUserResults([]);
        } else {
          // Exclude current user from results
          const filtered = (data || []).filter((u) => u.id !== user?.id);
          setUserResults(filtered);
        }
      }
    } catch (error) {
      console.error('Search failed:', JSON.stringify({
          message: err.message,
          name: err.name,
          details: err.details,
          hint: err.hint,
          code: err.code,
          fullError: err
        }, null, 2));
      if (searchTab === 'content') {
        setSearchResults([]);
      } else {
        setUserResults([]);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    // Debounce search
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      performSearch(query);
    }, 300);
  };

  // Force native keyboard attributes on the search box specifically
  useEffect(() => {
    const el = searchInputRef.current;
    if (!el) return;
    try {
      el.setAttribute('autocorrect', 'on');
      el.setAttribute('autocapitalize', 'sentences');
      el.setAttribute('spellcheck', 'true');
      if (!el.hasAttribute('inputmode')) el.setAttribute('inputmode', 'search');
      // Ensure iOS allows selection/long-press
      el.style.webkitUserSelect = 'text';
      el.style.userSelect = 'text';
      el.style.webkitTouchCallout = 'default';
      el.style.touchAction = 'manipulation';
    } catch {}
  }, [showSearch, searchTab]);

  const handleSearchTabChange = (tab) => {
    setSearchTab(tab);
    setSearchResults([]);
    setUserResults([]);
    if (searchQuery.trim()) {
      performSearch(searchQuery);
    }
  };

  const handleFollowUser = async (userId, username) => {
    try {
      await followUser(userId);
      setFollowingUsers(prev => new Set([...prev, userId]));
      console.log(`Started following ${username}`);
    } catch (error) {
      console.error('Follow error:', JSON.stringify({
          message: err.message,
          name: err.name,
          details: err.details,
          hint: err.hint,
          code: err.code,
          fullError: err
        }, null, 2));
    }
  };

  const handleUnfollowUser = async (userId, username) => {
    try {
      await unfollowUser(userId);
      setFollowingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
      console.log(`Unfollowed ${username}`);
    } catch (error) {
      console.error('Unfollow error:', JSON.stringify({
          message: err.message,
          name: err.name,
          details: err.details,
          hint: err.hint,
          code: err.code,
          fullError: err
        }, null, 2));
    }
  };

  const handleSearchResultClick = (result) => {
    // Navigate to appropriate screen based on result type
    if (result.type === 'item') {
      // Find the list and navigate to it
      const targetList = lists.find(list => list.id === result.listId);
      if (targetList) {
        setSelectedList(targetList);
        setCurrentScreen('list-detail');
      }
    } else if (result.type === 'list') {
      // Navigate to specific list
      const targetList = lists.find(list => list.id === result.id);
      if (targetList) {
        setSelectedList(targetList);
        setCurrentScreen('list-detail');
      } else {
        setCurrentScreen('lists');
      }
    }
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const navigateToScreen = (screen) => {
    setPreviousScreen(currentScreen);
    setCurrentScreen(screen);
    setSelectedList(null);
    setSelectedItem(null);
    try {
      if (typeof window !== 'undefined' && window.history && window.history.pushState) {
        window.history.pushState({ screen }, '');
      }
    } catch (_) {}
    if (screen === 'user-profile') {
      setUserProfileKey((k) => k + 1);
    }
  };

  const handleNavigateToUser = (username) => {
    setSelectedUsername(username);
    setPreviousScreen(currentScreen);
    setUserProfileOrigin(currentScreen);
    navigateToScreen('user-profile');
  };

  const handleBackFromUserProfile = () => {
    setSelectedUsername(null);
    const target = userProfileOrigin || (previousScreen && previousScreen !== 'user-profile' ? previousScreen : 'home');
    setCurrentScreen(target);
    setUserProfileOrigin(null);
  };

  const handleSearch = () => {
    setShowSearch(true);
  };

  const handleNotifications = () => {
    // Debug logging for Android Studio
    const logToAndroid = (message, data = null) => {
      const logMessage = data ? `${message}: ${JSON.stringify(data)}` : message;
      console.log(logMessage);
      
      // Also try to use Capacitor's logging if available
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Console) {
        window.Capacitor.Plugins.Console.log({ message: logMessage });
      }
    };

    logToAndroid('🔔 handleNotifications called');
    logToAndroid('🔔 Current user:', user);
    logToAndroid('🔔 User ID:', user?.id);
    logToAndroid('🔔 Current notifications state:', { notifications, unreadCount, isOpen });
    
    toggleOpen();
  };

  const handleNavigateToPost = (postId, type) => {
    // Close the notifications dropdown
    if (isOpen) toggleOpen();
    
    // Navigate to post detail view
    setSelectedPostId(postId);
    setPostOriginScreen(currentScreen);
    navigateToScreen('post-detail');
    
    // If comment notification, request auto-scroll inside PostDetailView (one-shot)
    setScrollToCommentsOnOpen(type === 'comment');
    
    console.log('🔔 Navigating to post:', postId);
  };

  // Handle opening a shared link when not following author: route to public profile
  const handleOpenSharedPost = async (postId) => {
    try {
      // We need the post's author. Fetch minimal data.
      const { data, error } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .single();
      if (error || !data?.user_id) return;
      setSelectedUsername(null);
      // Navigate to public profile view by username if available
      const { data: profile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', data.user_id)
        .single();
      if (profile?.username) {
        handleNavigateToUser(profile.username);
      }
    } catch (_) {}
  };

  const handleImageTap = (postId) => {
    console.log('🔍 handleImageTap called with postId:', postId);
    setSelectedPostId(postId);
    setPostOriginScreen(currentScreen);
    navigateToScreen('post-detail');
  };

  const handleBackFromPost = () => {
    setSelectedPostId(null);
    // Prefer explicit origin if available
    if (postOriginScreen) {
      setCurrentScreen(postOriginScreen);
      if (postOriginScreen === 'user-profile') setUserProfileKey((k) => k + 1);
      setPostOriginScreen(null);
      return;
    }
    // Fallback to previousScreen or home
    if (previousScreen === 'profile' || previousScreen === 'lists' || previousScreen === 'user-profile') {
      setCurrentScreen(previousScreen);
      if (previousScreen === 'user-profile') setUserProfileKey((k) => k + 1);
    } else {
      setCurrentScreen('home');
    }
  };

  // Handle native Android back button globally
  useEffect(() => {
    const onBack = () => {
      try {
        // Close item editor modal first (e.g., opened from ProfileView)
        if (editingItem) {
          setEditingItem(null);
          return;
        }
        // Close search if open
        if (showSearch) {
          setShowSearch(false);
          return;
        }

        // Route by current screen
        if (currentScreen === 'post-detail') {
          handleBackFromPost();
          return;
        }
        if (currentScreen === 'list-detail') {
          handleBackFromList();
          return;
        }
        if (currentScreen === 'user-profile') {
          handleBackFromUserProfile();
          return;
        }
        if (currentScreen === 'profile') {
          navigateToScreen('home');
          return;
        }
        // Use browser history to go back if possible
        try {
          if (typeof window !== 'undefined' && window.history && window.history.state) {
            window.history.back();
            return;
          }
        } catch (_) {}
        // Fallback: navigate home
        if (currentScreen !== 'home') {
          navigateToScreen('home');
          return;
        }
        return;
      } catch (e) {
        // Swallow errors to avoid exiting the app
      }
    };

    let backListenerHandle;
    const add = async () => {
      try {
        backListenerHandle = await CapacitorApp.addListener('backButton', onBack);
      } catch (_) {}
    };
    add();

    return () => {
      try { backListenerHandle && backListenerHandle.remove && backListenerHandle.remove(); } catch (_) {}
    };
  }, [currentScreen, showSearch]);

  // Sync app state with browser history for native back gestures/swipes
  useEffect(() => {
    const onPopState = () => {
      // Close item editor modal first
      if (editingItem) {
        setEditingItem(null);
        return;
      }
      // Decide where to go based on currentScreen and previousScreen
      if (currentScreen === 'post-detail') {
        handleBackFromPost();
        return;
      }
      if (currentScreen === 'item-detail') {
        handleBackFromItem();
        return;
      }
      if (currentScreen === 'list-detail') {
        handleBackFromList();
        return;
      }
      if (currentScreen === 'user-profile') {
        handleBackFromUserProfile();
        return;
      }
      if (currentScreen === 'profile') {
        navigateToScreen('home');
        return;
      }
    };
    try { window.addEventListener('popstate', onPopState); } catch (_) {}
    // Ensure at least one history entry exists
    try {
      if (typeof window !== 'undefined' && window.history && !window.history.state) {
        window.history.replaceState({ screen: currentScreen }, '');
      }
    } catch (_) {}
    return () => { try { window.removeEventListener('popstate', onPopState); } catch (_) {} };
  }, [currentScreen, editingItem]);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    
    const initializeApp = async () => {
      console.log('🚀 [App] Starting comprehensive app initialization...');
      
      try {
        // Step 1: Authentication
        console.log('🔐 [App] Loading authentication...');
        setLoadingProgress(prev => ({ ...prev, auth: false }));
        const existingUser = await getSessionOptimized();
        setUser(existingUser);
        setLoadingProgress(prev => ({ ...prev, auth: true }));
        console.log('✅ [App] Authentication loaded');

        if (existingUser) {
          // Step 2: User tracking (can run in parallel)
          console.log('📊 [App] Starting user tracking...');
          setLoadingProgress(prev => ({ ...prev, userTracking: false }));
          trackUserSession().finally(() => {
            setLoadingProgress(prev => ({ ...prev, userTracking: true }));
            console.log('✅ [App] User tracking completed');
          });

          // Step 3: Load all data in parallel with proper progress tracking
          console.log('📊 [App] Loading all app data in parallel...');
          
          // Start all loading operations
          const promises = [];
          
          // Lists loading - wait for lists to be available
          promises.push(
            new Promise((resolve) => {
              const checkListsAvailable = () => {
                // Only log every 10 checks to reduce noise
                const checkCount = checkListsAvailable.count || 0;
                checkListsAvailable.count = checkCount + 1;
                
                if (checkCount % 10 === 0) {
                  console.log('🔍 [App] Checking if lists are available:', lists?.length || 0, '(attempt', checkCount + ')');
                }
                
                if (lists && lists.length >= 0) { // Lists are available when array exists
                  setLoadingProgress(prev => {
                    const newProgress = { ...prev, lists: true };
                    console.log('✅ [App] Setting lists to loaded');
                    console.log('📊 [App] New loading progress:', JSON.stringify(newProgress));
                    return newProgress;
                  });
                  console.log('✅ [App] Lists loaded after', checkCount, 'checks');
                  resolve();
                } else {
                  setTimeout(checkListsAvailable, 100);
                }
              };
              checkListsAvailable();
            })
          );

          // Feed data - use ref to avoid stale closure
          promises.push(
            new Promise((resolve) => {
              feedResolveRef.current = resolve;
              // Initial check in case feed is already loaded
              if (!isLoadingFeed) {
                setLoadingProgress(prev => {
                  const newProgress = { ...prev, feed: true };
                  console.log('📊 [App] Feed loading progress:', JSON.stringify(newProgress));
                  return newProgress;
                });
                console.log('✅ [App] Feed already loaded');
                resolve();
                feedResolveRef.current = null;
              }
            })
          );

          // User stats - wait for stats to be available
          promises.push(
            new Promise((resolve) => {
              const checkStatsAvailable = () => {
                // Only log every 10 checks to reduce noise
                const checkCount = checkStatsAvailable.count || 0;
                checkStatsAvailable.count = checkCount + 1;
                
                if (checkCount % 10 === 0) {
                  console.log('🔍 [App] Checking if stats are available:', userStats ? 'yes' : 'no', '(attempt', checkCount + ')');
                }
                
                if (userStats) { // Stats are available when object exists
                  setLoadingProgress(prev => {
                    const newProgress = { ...prev, stats: true };
                    console.log('✅ [App] Setting stats to loaded');
                    console.log('📊 [App] New loading progress:', JSON.stringify(newProgress));
                    return newProgress;
                  });
                  console.log('✅ [App] Stats loaded after', checkCount, 'checks');
                  resolve();
                } else {
                  setTimeout(checkStatsAvailable, 100);
                }
              };
              checkStatsAvailable();
            })
          );

          // Pending achievements
          promises.push(
            (async () => {
              try {
                console.log('🏆 [App] Loading pending achievements...');
                setLoadingProgress(prev => ({ ...prev, achievements: false }));
                const achievements = await loadPendingAchievements(user.id);
                setLoadingProgress(prev => {
                  const newProgress = { ...prev, achievements: true };
                  console.log('📊 [App] New loading progress:', newProgress);
                  return newProgress;
                });
                console.log('✅ [App] Pending achievements loaded:', achievements?.length || 0);
                
                // Store achievements for showing after app loads
                if (achievements && achievements.length > 0) {
                  setTimeout(() => {
                    console.log('🎉 [App] Showing pending achievements...');
                    showPendingAchievements(achievements);
                  }, 1000);
                }
              } catch (error) {
                console.error('❌ [App] Achievements loading failed:', error);
                setLoadingProgress(prev => {
                  const newProgress = { ...prev, achievements: true };
                  console.log('📊 [App] New loading progress:', newProgress);
                  return newProgress;
                });
              }
            })()
          );

          // Notifications: do not gate app load; let dropdown fetch on demand

          // Wait for all data to load with timeout
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Loading timeout')), 8000); // 8 second timeout
          });
          
          // Wait for all with timeout, but do not block app if some subsystems are slow
          try {
            await Promise.race([
              Promise.all(promises),
              timeoutPromise
            ]);
          } catch (e) {
            console.log('⏰ [App] Non-fatal loading timeout - proceeding with available data');
          }
          console.log('🎉 [App] All data loaded successfully!');
        } else {
          // No user, mark everything as loaded
          setLoadingProgress({
            auth: true,
            lists: true,
            feed: true,
            stats: true,
            achievements: true,
            userTracking: true
          });
        }

      } catch (error) {
        console.error('❌ [App] Error during app initialization:', JSON.stringify({
          message: error.message,
          name: error.name,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        }, null, 2));
        
        // If it's a timeout error, mark all remaining steps as complete
        if (error.message === 'Loading timeout') {
          console.log('⏰ [App] Loading timeout - marking remaining steps as complete');
          setLoadingProgress(prev => ({
            ...prev,
            lists: true,
            feed: true,
            stats: true,
            achievements: true,
            userTracking: true
          }));
        }
      } finally {
        // Only stop app loading when everything is done
        setAppLoading(false);
        console.log('🎉 [App] App initialization complete - showing app!');
        
        // 🏆 Trigger any pending sign-in achievements now that app is fully loaded
        if (typeof window.triggerPendingSignInAchievements === 'function') {
          window.triggerPendingSignInAchievements();
        }
      }
    };
    
    initializeApp();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔐 [Auth] Auth state changed:', event);
        setUser(session?.user ?? null);
        
        // If user signs out, stop loading immediately
        if (!session?.user) {
          setAppLoading(false);
        }

        // Refresh feed cache on sign-in events
        if (event === 'SIGNED_IN') {
          // Feed refresh is now handled by useOptimizedFeed hook
          refreshFeed().catch(console.error);
        }
      }
    );
    return () => subscription?.unsubscribe();
  }, []);

  // Retry wrapper for network requests that might fail on app resume
  const retryNetworkRequest = async (requestFn, maxRetries = 2) => {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        console.log(`🔄 Network request attempt ${attempt + 1} failed:`, error.message);
        
        if (attempt === maxRetries) {
          throw error; // Final attempt failed
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  };

  // Old loadFeedData function removed - now using useOptimizedFeed hook

  // Handle tab change - optimized feed hook handles the data
  const handleTabChange = async (feedType) => {
    console.log('🔄 Tab changed to:', feedType);
    // Feed data is now managed by the optimized hook
  };

  // Feed refresh is now handled by the optimized hook
  const handleFeedRefresh = async () => {
    console.log('🔄 [App] Starting feed refresh...');
    await refreshFeed();
    console.log('✅ [App] Feed refresh completed');
  };

  // Handle item deletion from lists - refresh feed to stay in sync
  const handleItemDeleted = async (deletedItemIds) => {
    console.log('🗑️ [App] Items deleted from lists, refreshing feed:', deletedItemIds);
    
    // Refresh the feed to remove deleted items
    await refreshFeed();
    
    // Also refresh lists to ensure consistency
    await refreshLists();
    
    console.log('✅ [App] Feed and lists refreshed after item deletion');
  };

  // Feed loading is now handled in the main initialization useEffect
  // This useEffect is no longer needed since we preload everything during app startup

  // Handle deep links
  useEffect(() => {
    const handleDeepLink = async () => {
      try {
        // Handle app open from deep link
        CapacitorApp.addListener('appUrlOpen', (event) => {
          console.log('🔗 Deep link opened:', event.url);
          
          try {
            const url = new URL(event.url);
            const path = url.pathname;
            
            if (path.startsWith('/post/')) {
              const postId = path.split('/post/')[1];
              console.log('📱 Navigate to post:', postId);
              setDeepLinkData({ type: 'post', id: postId });
              // Navigate to home screen to show the post
              setCurrentScreen('home');
            } else if (path.startsWith('/list/')) {
              const listId = path.split('/list/')[1];
              console.log('📱 Navigate to list:', listId);
              setDeepLinkData({ type: 'list', id: listId });
              // Navigate to lists screen to show the list
              setCurrentScreen('lists');
            }
          } catch (error) {
            console.error('❌ Error parsing deep link:', JSON.stringify({
          message: err.message,
          name: err.name,
          details: err.details,
          hint: err.hint,
          code: err.code,
          fullError: err
        }, null, 2));
          }
        });

        // Handle app state changes
        CapacitorApp.addListener('appStateChange', async (state) => {
          console.log('📱 App state changed:', state);
          try { window.__APP_ACTIVE__ = !!state.isActive; } catch (_) {}
          
          if (state.isActive) {
            // App is coming back from background
            console.log('🔄 App resumed - refreshing data and camera...');
            
            try {
              // Refresh authentication state
              const { data: { user: currentUser } } = await supabase.auth.getUser();
              if (currentUser && currentUser.id !== user?.id) {
                setUser(currentUser);
              }
              
              // Refresh data if user is logged in
              if (user) {
                // Refresh lists with retry
                await retryNetworkRequest(() => refreshLists(false));
                
                // Refresh feed using optimized hook
                await refreshFeed();
              }
              
              // Restart camera if on main screen
              if (currentScreen === 'home' && mainScreenRef.current) {
                setTimeout(() => {
                  mainScreenRef.current?.refreshFeedData();
                }, 500); // Small delay to ensure app is fully active
              }
              
            } catch (error) {
              console.error('❌ Error refreshing app data on resume:', JSON.stringify({
          message: err.message,
          name: err.name,
          details: err.details,
          hint: err.hint,
          code: err.code,
          fullError: err
        }, null, 2));
            }
          }
        });

        return () => {
          // Clean up listeners
          CapacitorApp.removeAllListeners();
        };
      } catch (error) {
        console.error('❌ Error setting up deep link listeners:', JSON.stringify({
          message: err.message,
          name: err.name,
          details: err.details,
          hint: err.hint,
          code: err.code,
          fullError: err
        }, null, 2));
      }
    };

    handleDeepLink();
  }, []);

  const handleAddItem = async (selectedListIds, item, isStayAway = false) => {
    console.log('🔧 App.handleAddItem called with:', JSON.stringify({
      selectedListIds,
      item: { name: item.name, type: item.type },
      isStayAway
    }, null, 2));
    
    setImagesLoading(true);
    
    try {
      const itemData = {
        ...item,
        is_stay_away: isStayAway
      };
      console.log('🔧 Calling addItemToList with selectedListIds array:', selectedListIds);
      const result = await addItemToList(selectedListIds, itemData, isStayAway);
      console.log('✅ addItemToList completed successfully');
      
      if (result.error) {
        throw result.error;
      }
      
      // Stats will update automatically via database triggers
      
      return result.data; // Return the saved item
    } catch (error) {
      console.error('❌ Error in handleAddItem:', JSON.stringify({
          message: err.message,
          name: err.name,
          details: err.details,
          hint: err.hint,
          code: err.code,
          fullError: err
        }, null, 2));
      throw error;
    } finally {
      setImagesLoading(false);
      setEditingItem(null);
      if (selectedList) {
        refreshLists();
      }
    }
  };

  const handleUpdateItem = async (item) => {
    console.log('🔧 [App] handleUpdateItem called with item:', JSON.stringify({
      id: item?.id,
      name: item?.name,
      hasId: !!item?.id,
      keys: Object.keys(item || {})
    }, null, 2));
    
    // Don't show loading state for updates since they're optimistic
    setEditingItem(null); // Close modal immediately for instant feedback
    
    try {
      // For updates, we don't need to specify listIds since we're updating by item ID
      // The item should contain its current list_id already
      await updateItemInList([], item); // Empty array for listIds since we're updating existing item
      console.log('✅ Item update completed successfully');
      
      // Stats will update automatically via database triggers
    } catch (error) {
      console.error('❌ Item update failed:', JSON.stringify({
          message: err.message,
          name: err.name,
          details: err.details,
          hint: err.hint,
          code: err.code,
          fullError: err
        }, null, 2));
      // Could show a toast notification here for failed updates
    }
    
    // No need to refresh lists since updateItemInList handles optimistic updates
  };

  const handleEditItem = (item, list) => {
    setEditingItem(item);
    setEditingList(list);
    try {
      if (typeof window !== 'undefined' && window.history && window.history.pushState) {
        window.history.pushState({ screen: 'item-edit' }, '');
      }
    } catch (_) {}
  };

  const handleViewItemDetail = (item) => {
    setSelectedItem(item);
    navigateToScreen('item-detail');
  };

  const handleSelectList = (list) => {
    setSelectedList(list);
    navigateToScreen('list-detail');
  };

  const handleBackFromList = () => {
    setSelectedList(null);
    setCurrentScreen('lists');
  };

  const handleBackFromItem = () => {
    setSelectedItem(null);
    if (selectedList) {
      setCurrentScreen('list-detail');
    } else {
      setCurrentScreen('lists');
    }
  };

  const handleCreateList = async (name, color) => {
    try {
      console.log('🔧 App: handleCreateList called with:', { name, color });
      const newList = await createList(name, color);
      console.log('🔧 App: createList returned:', newList);
      
      // Stats will update automatically via database triggers
      
      return newList;
    } catch (error) {
      console.error('❌ App: Error in handleCreateList:', JSON.stringify({
          message: err.message,
          name: err.name,
          details: err.details,
          hint: err.hint,
          code: err.code,
          fullError: err
        }, null, 2));
      throw error; // Re-throw so AddItemModal can handle it
    }
  };

  // Screen-specific refresh handlers
  const handleHomeRefresh = async () => {
    setRefreshing(true);
    
    try {
      // It is critical to await the data loading before setting refreshing to false
      await Promise.all([
        refreshLists(false),
        refreshFeed() // Use optimized feed refresh
      ]);
      
    } catch (error) {
      console.error('❌ Home refresh error:', JSON.stringify({
          message: err.message,
          name: err.name,
          details: err.details,
          hint: err.hint,
          code: err.code,
          fullError: err
        }, null, 2));
    } finally {
      // This ensures the spinner disappears only after all data is loaded
      setRefreshing(false);
    }
  };

  // Feed refresh function removed - using the optimized version above

  const handleListsRefresh = async () => {
    setRefreshing(true);
    
    try {
      // Refresh lists from database
      await refreshLists(false);
      
      // Quick loading feedback
      await new Promise(resolve => setTimeout(resolve, 600));
      
    } catch (error) {
      console.error('❌ Lists refresh error:', JSON.stringify({
          message: err.message,
          name: err.name,
          details: err.details,
          hint: err.hint,
          code: err.code,
          fullError: err
        }, null, 2));
    } finally {
      setRefreshing(false);
    }
  };

  const handleProfileRefresh = async () => {
    setRefreshing(true);
    
    try {
      // Refresh profile data (in a real app, this would fetch updated stats)
      // For now, just simulate a refresh
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error('❌ Profile refresh error:', JSON.stringify({
          message: err.message,
          name: err.name,
          details: err.details,
          hint: err.hint,
          code: err.code,
          fullError: err
        }, null, 2));
    } finally {
      setRefreshing(false);
    }
  };

  const handleListDetailRefresh = async () => {
    setRefreshing(true);
    
    try {
      // Refresh lists from database
      await refreshLists(false);
      
      await new Promise(resolve => setTimeout(resolve, 600));
      
    } catch (error) {
      console.error('❌ List detail refresh error:', JSON.stringify({
          message: err.message,
          name: err.name,
          details: err.details,
          hint: err.hint,
          code: err.code,
          fullError: err
        }, null, 2));
    } finally {
      setRefreshing(false);
    }
  };

  const renderScreen = () => {
    if (currentScreen === 'post-detail' && selectedPostId) {
      return (
        <PostDetailView
          postId={selectedPostId}
          onBack={handleBackFromPost}
          onEdit={handleEditItem}
          currentUser={user}
          onNavigateToUser={handleNavigateToUser}
          scrollToComments={scrollToCommentsOnOpen}
        />
      );
    }

    if (currentScreen === 'item-detail' && selectedItem) {
      // Render individual item detail view
      return (
        <PullToRefresh onRefresh={handleListDetailRefresh} disabled={refreshing}>
          <div className="min-h-screen bg-stone-50" style={{ backgroundColor: '#F6F6F4' }}>
            <div className="p-4">
              <button onClick={handleBackFromItem} className="mb-4">
                ← Back
              </button>
              <h1>{selectedItem.name}</h1>
              <img src={selectedItem.image_url || selectedItem.image} alt={selectedItem.name} className="w-full h-64 object-cover rounded-xl" />
              <p>{selectedItem.notes}</p>
              {/* Add more item details here */}
            </div>
          </div>
        </PullToRefresh>
      );
    }

    if (currentScreen === 'list-detail' && selectedList) {
      return (
        <PullToRefresh onRefresh={handleListDetailRefresh} disabled={refreshing}>
          <ShowItemsInListView 
            list={selectedList} 
            onBack={handleBackFromList}
            onAddItem={handleAddItem}
            onEditItem={handleEditItem}
            refreshList={refreshLists}
            onDeleteList={deleteList}
            onUpdateList={updateList}
            onNavigateToCamera={() => navigateToScreen('home')}
            onItemDeleted={handleItemDeleted}
          />
        </PullToRefresh>
      );
    }

    switch (currentScreen) {
      case 'home':
        return (
          <PullToRefresh onRefresh={handleHomeRefresh} disabled={refreshing}>
            <MainScreen
              ref={mainScreenRef}
              lists={lists}
              loading={imagesLoading || listsLoading || refreshing}
              onAddItem={handleAddItem}
              onSelectList={handleSelectList}
              onCreateList={handleCreateList}
              onNavigateToUser={handleNavigateToUser}
              onRefreshFeed={handleFeedRefresh}
              onTabChange={handleTabChange}
              onImageTap={handleImageTap}
              // Pass feed data down as props
              feedPosts={feedPosts}
              isLoadingFeed={isLoadingFeed}
              isLoadingMore={isLoadingMore}
              feedError={feedError}
              onLoadMore={loadMore}
              hasMore={hasMore}
              updateImageLoadState={updateImageLoadState}
              textLoaded={textLoaded}
              imagesLoaded={imagesLoaded}
            />
          </PullToRefresh>
        );
      case 'lists':
        return (
          <PullToRefresh onRefresh={handleListsRefresh} disabled={refreshing}>
            <ListsView
              lists={lists}
              onSelectList={handleSelectList}
              onCreateList={handleCreateList}
              onEditItem={handleEditItem}
              onViewItemDetail={handleViewItemDetail}
              onReorderLists={reorderLists}
              isRefreshing={refreshing}
              onDeleteList={deleteList}
              onUpdateList={updateList}
              onItemDeleted={handleItemDeleted}
              onNavigateToCamera={() => navigateToScreen('home')}
            />
          </PullToRefresh>
        );
      case 'profile':
        return (
          <PullToRefresh onRefresh={handleProfileRefresh} disabled={refreshing}>
            <ProfileView 
              ref={profileViewRef}
              onBack={() => navigateToScreen('home')}
              isRefreshing={refreshing}
              onEditItem={handleEditItem}
              onNavigateToUser={handleNavigateToUser}
            />
          </PullToRefresh>
        );
      case 'user-profile':
        return (
          <UserProfile
            key={userProfileKey}
            username={selectedUsername}
            onBack={handleBackFromUserProfile}
            onNavigateToUser={handleNavigateToUser}
            onImageTap={handleImageTap}
          />
        );
      default:
        return (
          <PullToRefresh onRefresh={handleHomeRefresh} disabled={refreshing}>
            <MainScreen
              ref={mainScreenRef}
              lists={lists}
              loading={imagesLoading || listsLoading || refreshing}
              onAddItem={handleAddItem}
              onSelectList={handleSelectList}
              onCreateList={handleCreateList}
              onNavigateToUser={handleNavigateToUser}
              onRefreshFeed={handleFeedRefresh}
              onTabChange={handleTabChange}
              updateImageLoadState={updateImageLoadState}
              textLoaded={textLoaded}
              imagesLoaded={imagesLoaded}
            />
          </PullToRefresh>
        );
    }
  };


  // Connection Status Component
  const ConnectionStatus = () => {
    if (!connectionError && !isRetrying) return null;

    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-50 border-b border-yellow-200 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isRetrying ? (
              <>
                <div className="w-4 h-4 border-2 border-yellow-600 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-yellow-800">
                  Reconnecting... (attempt {retryCount})
                </span>
              </>
            ) : connectionError?.fatal ? (
              <>
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span className="text-sm text-red-800">Connection failed</span>
              </>
            ) : (
              <>
                <div className="w-4 h-4 bg-yellow-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-yellow-800">
                  Retrying in {connectionError?.nextRetryIn}s...
                </span>
              </>
            )}
          </div>
          {connectionError?.code && (
            <span className="text-xs text-yellow-600">
              {connectionError.code}
            </span>
          )}
        </div>
      </div>
    );
  };

  // Calculate loading progress (condensed into 3 buckets for UX)
  const coreReady = loadingProgress.auth && loadingProgress.userTracking;
  const contentReady = loadingProgress.lists && loadingProgress.feed && loadingProgress.stats;
  const extrasReady = loadingProgress.achievements; // achievements/notifications/etc.
  const displaySteps = [
    { key: 'core', label: 'Core setup', icon: '🔐', done: coreReady },
    { key: 'content', label: 'Content', icon: '🍽️', done: contentReady },
    { key: 'extras', label: 'Extras', icon: '🏆', done: extrasReady }
  ];
  const loadingComplete = displaySteps.every(s => s.done);
  const completedSteps = displaySteps.filter(s => s.done).length;
  const totalSteps = displaySteps.length;
  const progressPercentage = Math.round((completedSteps / totalSteps) * 100);
  
  // Debug loading progress
  console.log('📊 [App] Loading progress:', {
    completedSteps,
    totalSteps,
    progressPercentage,
    loadingProgress
  });

  // Show loading screen during comprehensive data loading
  if (appLoading || (!user && appLoading)) {
    return (
      <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-6" style={{ backgroundColor: '#F6F6F4' }}>
        <div className="w-full max-w-sm">
          {/* App Logo/Branding */}
          <div className="text-center mb-12">
            <div className="w-20 h-20 bg-teal-700 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-lg" style={{ backgroundColor: '#1F6D5A' }}>
              <span className="text-2xl">🍽️</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">BestList</h1>
            <p className="text-sm text-gray-600">Discover your perfect taste</p>
          </div>

          {/* Loading Progress */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Loading your experience</span>
              <span className="text-sm text-gray-500">{progressPercentage}%</span>
            </div>
            
            {/* Progress Bar */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-6 overflow-hidden">
              <motion.div
                className="h-2 bg-teal-700 rounded-full"
                style={{ backgroundColor: '#1F6D5A' }}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 0.5, ease: "easeInOut" }}
              />
            </div>

              {/* Loading Steps (condensed to 3) */}
              <div className="space-y-3">
                {displaySteps.map(({ key, label, icon, done }, index) => (
                  <motion.div
                    key={key}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                      done 
                        ? 'bg-teal-50 border border-teal-200' 
                        : 'bg-white border border-gray-200'
                    }`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      done 
                        ? 'bg-teal-700 text-white' 
                        : 'bg-gray-100 text-gray-400'
                    }`} style={{ backgroundColor: done ? '#1F6D5A' : undefined }}>
                      {done ? '✓' : icon}
                    </div>
                    <span className={`text-sm font-medium ${
                      done ? 'text-teal-700' : 'text-gray-600'
                    }`} style={{ color: done ? '#1F6D5A' : undefined }}>
                      {label}
                    </span>
                    {!done && (
                      <div className="ml-auto">
                        <div className="w-4 h-4 border-2 border-gray-300 border-t-teal-700 rounded-full animate-spin"></div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
          </div>

          {/* Subtle loading message */}
          <div className="text-center">
            <p className="text-xs text-gray-500">
              Preparing everything for the best experience...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Show auth view only when not loading and no user
  if (!appLoading && !user) {
    return (
      <ErrorBoundary name="AuthView">
        <AuthView />
      </ErrorBoundary>
    );
  }

  return (
    <AchievementProvider>
      <ErrorBoundary name="AppRoot">
      <div 
        className="min-h-screen bg-stone-50 relative" 
                 style={{
          backgroundColor: '#F6F6F4',
          // Responsive design for keyboard handling
          paddingBottom: 'env(safe-area-inset-bottom)',
          minHeight: '100dvh', // Dynamic viewport height for mobile (fallback to 100vh if not supported)
        }}
    >
      {/* Connection Status Bar */}
      <ConnectionStatus />
      
      {/* Header */}
      <div 
        className="sticky bg-stone-50 z-10 pb-2" 
        style={{ 
          backgroundColor: '#F6F6F4',
          top: (connectionError || isRetrying) ? '48px' : '0',
          paddingTop: 'calc(env(safe-area-inset-top) + 48px)',
          paddingLeft: 'env(safe-area-inset-left)',
          paddingRight: 'env(safe-area-inset-right)'
        }}
      >
        <div className="px-4 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-teal-700 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1F6D5A' }}>
              <span className="text-white text-xs font-bold">b</span>
            </div>
            <h1 className="text-xl font-normal text-gray-900 tracking-tight" style={{ fontFamily: 'Jost, sans-serif' }}>bestlist</h1>
          </div>
          <div className="flex items-center gap-3">
            {currentScreen === 'profile' ? (
              <button
                onClick={() => profileViewRef.current?.openSettings?.()}
                className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm"
                aria-label="Settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6"/>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 8 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 3.6 15a1.65 1.65 0 0 0-1.51-1H2a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 3.6 8a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 8 3.6c.19 0 .37-.04.54-.1H9a2 2 0 1 1 4 0h.46c.17.06.35.1.54.1a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 8c0 .19.04.37.1.54V9a2 2 0 1 1 0 4h-.09c-.17.06-.35.1-.51.1Z"/>
                </svg>
              </button>
            ) : (
              <>
                <button 
                  onClick={handleSearch}
                  className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm"
                >
                  <Search className="w-4 h-4 text-gray-700" />
                </button>
                <button
                  onClick={() => setAchievementsOpen((v) => !v)}
                  className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm relative"
                  aria-label="Achievements"
                >
                  <Trophy className="w-4 h-4 text-gray-700" />
                  {pendingAchievements && pendingAchievements.length > 0 && (
                    <div className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-teal-500 rounded-full flex items-center justify-center">
                      <span className="text-[10px] font-medium text-white">
                        {Math.min(9, pendingAchievements.length)}
                        {pendingAchievements.length > 9 ? '+' : ''}
                      </span>
                    </div>
                  )}
                </button>
                <div className="relative">
                  <button 
                    onClick={handleNotifications}
                    className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm relative"
                  >
                    <Bell className="w-4 h-4 text-gray-700" />
                    {unreadCount > 0 && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-[10px] font-medium text-white">{unreadCount}</span>
                      </div>
                    )}
                  </button>
                  <NotificationsDropdown
                    notifications={notifications}
                    unreadCount={unreadCount}
                    isOpen={isOpen}
                    onClose={toggleOpen}
                    onMarkRead={markAsRead}
                    onMarkAllRead={markAllAsRead}
                    onNavigateToPost={handleNavigateToPost}
                  />
                </div>
                <AchievementsDropdown
                  isOpen={achievementsOpen}
                  onClose={() => setAchievementsOpen(false)}
                  achievements={recentAchievements}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Content - Updated height for PullToRefresh */}
      <main className="relative" style={{ height: 'calc(100vh - 140px)' }}>
        <ErrorBoundary name="MainContent">
          {renderScreen()}
        </ErrorBoundary>
      </main>

      {/* Bottom Navigation */}
      <div 
        className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-2 z-20"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-around">
          <button
            onClick={() => navigateToScreen('home')}
            className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors duration-150 ${
              currentScreen === 'home'
                ? 'text-teal-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            style={{ color: currentScreen === 'home' ? '#1F6D5A' : undefined }}
          >
            <Home className="w-5 h-5" />
            <span className="text-xs font-medium">Home</span>
          </button>

          <button
            onClick={() => navigateToScreen('lists')}
            className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors duration-150 ${
              currentScreen === 'lists' || currentScreen === 'list-detail' || currentScreen === 'item-detail'
                ? 'text-teal-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            style={{ color: (currentScreen === 'lists' || currentScreen === 'list-detail' || currentScreen === 'item-detail') ? '#1F6D5A' : undefined }}
          >
            <List className="w-5 h-5" />
            <span className="text-xs font-medium">Lists</span>
          </button>

          <button
            onClick={() => navigateToScreen('profile')}
            className={`flex flex-col items-center gap-1 px-4 py-2 transition-colors duration-150 ${
              currentScreen === 'profile'
                ? 'text-teal-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            style={{ color: currentScreen === 'profile' ? '#1F6D5A' : undefined }}
          >
            <User className="w-5 h-5" />
            <span className="text-xs font-medium">Profile</span>
          </button>
        </div>
      </div>

      {/* Edit Item Modal */}
      {editingItem && (
        <AddItemModal
          image={editingItem.image_url || editingItem.image}
                    lists={lists}
          onClose={() => setEditingItem(null)}
                      onSave={editingItem.id ? 
              ((selectedListIds, item, isStayAway) => handleUpdateItem(item)) : 
              handleAddItem
            }
          item={editingItem}
                    onCreateList={handleCreateList}
                  />
      )}

      {/* Search Modal */}
      {showSearch && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-20 flex items-start justify-center pt-8 p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md h-[85vh] flex flex-col overflow-hidden">
            {/* Search Header */}
            <div className="p-6 pb-4 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Search</h3>
                <button
                  onClick={() => {
                    setShowSearch(false);
                    setSearchQuery('');
                    setSearchResults([]);
                    setUserResults([]);
                    setSearchTab('content');
                  }}
                  className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Search Tabs */}
              <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
                <button
                  onClick={() => handleSearchTabChange('content')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    searchTab === 'content'
                      ? 'bg-white text-teal-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Content
                </button>
                <button
                  onClick={() => handleSearchTabChange('users')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    searchTab === 'users'
                      ? 'bg-white text-teal-700 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Users
                </button>
              </div>
              
              <div className="relative">
                   <input
                    ref={searchInputRef}
                    type="text"
                     name="search"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder={searchTab === 'content' ? 'Search lists and items...' : 'Search users...'}
                    className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100 transition-all duration-200"
                    autoFocus
                    autoComplete="on"
                    autoCorrect="on"
                    autoCapitalize="sentences"
                    spellCheck="true"
                    inputMode="search"
                    enterKeyHint="search"
                  />
                  {/* Search Icon */}
                  <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                    <Search className="w-4 h-4 text-gray-400" />
                  </div>
                  {/* Loading/Clear Button */}
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    {isSearching ? (
                      <div className="w-4 h-4 border-2 border-teal-700 border-t-transparent rounded-full animate-spin"></div>
                    ) : searchQuery ? (
                      <button
                        onClick={() => {
                          setSearchQuery('');
                          setSearchResults([]);
                          setUserResults([]);
                        }}
                        className="w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

            {/* Search Results */}
            {searchQuery && (
              <div className="flex-1 overflow-y-auto">
                {searchTab === 'content' && searchResults.length > 0 ? (
                  <div className="px-6 pb-6">
                    <div className="text-sm text-gray-500 mb-4">
                      {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
                    </div>
                    
                    {/* Group results: Lists first, then Items */}
                    {(() => {
                      const lists = searchResults.filter(r => r.type === 'list');
                      const items = searchResults.filter(r => r.type === 'item');
                      
                      return (
                        <div className="space-y-6">
                          {/* Lists Section */}
                          {lists.length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
                                Lists ({lists.length})
                              </div>
                              <div className="space-y-2">
                                {lists.map((result) => (
                                  <button
                                    key={`${result.type}-${result.id}`}
                                    onClick={() => handleSearchResultClick(result)}
                                    className="w-full text-left p-3 bg-teal-50 rounded-xl hover:bg-teal-100 transition-colors border border-teal-100"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-teal-100 text-teal-700">
                                        <List className="w-4 h-4" />
                                      </div>
                                      <div className="flex-1">
                                        <div className="font-medium text-gray-900">{result.name}</div>
                                        <div className="text-sm text-gray-500">
                                          {result.itemCount || 0} items
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Items Section */}
                          {items.length > 0 && (
                            <div>
                              <div className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-3">
                                Items ({items.length})
                              </div>
                              <div className="space-y-2">
                                {items.map((result) => (
                                  <button
                                    key={`${result.type}-${result.id}`}
                                    onClick={() => handleSearchResultClick(result)}
                                    className="w-full text-left p-3 bg-stone-50 rounded-xl hover:bg-stone-100 transition-colors"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-yellow-100 text-yellow-700">
                                        <span className="text-xs font-bold">★</span>
                                      </div>
                                      <div className="flex-1">
                                        <div className="font-medium text-gray-900">{result.name}</div>
                                        <div className="text-sm text-gray-500">
                                          in {result.list}
                                          {result.rating && (
                                            <span className="ml-2">
                                              ★ {Math.abs(result.rating)}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : searchTab === 'users' && userResults.length > 0 ? (
                  <div className="px-6 pb-6">
                    <div className="text-sm text-gray-500 mb-4">
                      {userResults.length} user{userResults.length !== 1 ? 's' : ''} found
                    </div>
                    
                    <div className="space-y-3">
                      {userResults.map((user) => (
                        <div
                          key={user.id}
                          className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                          <button
                            onClick={() => {
                              handleNavigateToUser(user.username);
                              setShowSearch(false);
                              setSearchQuery('');
                              setSearchResults([]);
                              setUserResults([]);
                              setSearchTab('content');
                            }}
                            className="flex items-center gap-3 flex-1 text-left"
                          >
                            <img
                              src={user.avatar_url || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"%3E%3C/path%3E%3Ccircle cx="12" cy="7" r="4"%3E%3C/circle%3E%3C/svg%3E'}
                              alt={user.username}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{user.username}</div>
                             
                            </div>
                          </button>
                          
                          {user.id !== user?.id && (
                            <button
                              onClick={() => {
                                if (followingUsers.has(user.id)) {
                                  handleUnfollowUser(user.id, user.username);
                                } else {
                                  handleFollowUser(user.id, user.username);
                                }
                              }}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                followingUsers.has(user.id)
                                  ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                  : 'bg-teal-600 text-white hover:bg-teal-700'
                              }`}
                            >
                              {followingUsers.has(user.id) ? 'Following' : 'Follow'}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : !isSearching ? (
                  <div className="px-6 pb-6 text-center">
                    <div className="text-sm text-gray-500 mb-2">
                      {searchTab === 'content' ? 'No content found' : 'No users found'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {searchTab === 'content' 
                        ? 'Try different keywords or check spelling'
                        : 'Try searching for exact usernames'
                      }
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {!searchQuery && (
              <div className="px-6 pb-6">
                <div className="text-sm text-gray-500">
                  {searchTab === 'content' 
                    ? 'Search through your lists and food items'
                    : 'Search for other users to follow'
                  }
                </div>
                <div className="mt-3 space-y-2">
                 
                  
                </div>
              </div>
            )}
          </div>
        </div>
     
      )}

      {/* Achievement System - Global notifications */}
      <AchievementSystem />
    </div>
    </ErrorBoundary>
  </AchievementProvider>
  );
};

export default App;
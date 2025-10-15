import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, List, User, Search, Bell, X, Star } from 'lucide-react';
import { App as CapacitorApp } from '@capacitor/app';
import { SplashScreen } from '@capacitor/splash-screen';
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
import ModalPortal from './components/ui/ModalPortal';
import { enableNativeKeyboardEnhancements } from './lib/enableNativeKeyboard';
import { supabase, signOut, searchUserContent, getFeedPosts, getPostCommentCount, searchUsers, followUser, unfollowUser, getSessionOptimized } from './lib/supabase';
import { useOptimizedFeed } from './hooks/useOptimizedFeed';
import { useLists } from './hooks/useLists';
import { motion as Sparkles } from 'framer-motion';
import { NotificationsDropdown } from './components/secondary/NotificationsDropdown';
// Removed header Achievements dropdown per redesign
// import useAchievements from './hooks/useAchievements';
import { useNotifications } from './hooks/useNotifications';
import PostDetailView from './components/secondary/PostDetailView';
import SearchModal from './components/secondary/SearchModal';
import AchievementSystem from './components/gamification/AchievementSystem';
import { AchievementProvider } from './hooks/useGlobalAchievements.jsx';
import useUserTracking from './hooks/useUserTracking';
import usePendingAchievements from './hooks/usePendingAchievements';
import useUserStats from './hooks/useUserStats';
import { updateFeedPosts, addOfflineProfilePost, getProfilePostsLocal, removeUserPostsFromFeedCache } from './hooks/useOptimizedFeed';
import { useOfflineQueue } from './hooks/useOfflineQueue';
import LoadingScreen from './components/LoadingScreen';
import { shouldLoadFromCacheOnly } from './lib/onlineDetection';
import iconUrl from './assets/icon.svg';

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
      name: post.user?.name || post.profiles?.username || 'User',
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


const App = () => {
  // Enable native keyboard features globally
  useEffect(() => {
    const teardown = enableNativeKeyboardEnhancements();
    // Install once
    installGlobalErrorTracking();
    return () => teardown && teardown();
  }, []);

  // Hide native splash screen when React app initializes
  useEffect(() => {
    const hideSplash = async () => {
      try {
        console.log('🎨 [App] Attempting to hide native splash screen...');
        await SplashScreen.hide({ fadeOutDuration: 150 });
        console.log('✅ [App] Native splash hidden successfully');
      } catch (error) {
        console.log('❌ [App] Failed to hide splash:', error);
        console.log('🎨 [App] Plugin not available or splash already hidden');
      }
    };

    // Hide splash immediately when App component mounts
    hideSplash();
  }, []);
  const [user, setUser] = useState(null);
  const { notifications, unreadCount, isOpen, toggleOpen, markAsRead, markAllAsRead, ready: notificationsReady } = useNotifications(user?.id);
  // const { getUserAchievements } = useAchievements();
  // Pending achievements hook (must be declared before any effects that reference it)
  const {
    pendingAchievements,
    loading: achievementsLoading,
    showPendingAchievements,
    loadPendingAchievements,
    markAsNotified
  } = usePendingAchievements(user?.id);
  const [hadNewAchievementsOnEnter, setHadNewAchievementsOnEnter] = useState(false);

  // Removed dropdown-driven achievements loading/marking
  const { trackUserSession, isTracking } = useUserTracking();
  const [appLoading, setAppLoading] = useState(true);
  const [hasShownInitialUI, setHasShownInitialUI] = useState(false);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [profileReady, setProfileReady] = useState(false);

  // Camera ready callback
  const handleCameraReady = () => {
    console.log('📷 [App] Camera is ready');
    setCameraReady(true);
    setLoadingProgress(prev => ({ ...prev, camera: true }));
  };
  
  // TODO: Critical image loading states for each tab (simplified for now)
  // Will be implemented after confirming basic logic works
  
  // Comprehensive loading state for all data
  const [loadingProgress, setLoadingProgress] = useState({
    auth: false,
    lists: false,
    feed: false,
    stats: false,
    achievements: false,
    userTracking: false,
    camera: false,
    profile: false
  });
  
  
  
  
  // User stats hook 
  const { stats: userStats, loading: statsLoading } = useUserStats(user?.id);
  
  // Offline queue hook
  const { 
    queueStatus, 
    queueCreateItem, 
    queueUpdateItem,
    queueCreateList,
    triggerSync: syncOfflineQueue,
    clearQueueData: clearQueue
  } = useOfflineQueue();
  const [currentScreen, setCurrentScreen] = useState('home');
  const [previousScreen, setPreviousScreen] = useState(null);
  const [selectedList, setSelectedList] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedUsername, setSelectedUsername] = useState(null);
  const [userProfileKey, setUserProfileKey] = useState(0);
  const [userProfileOrigin, setUserProfileOrigin] = useState(null);
  const profileViewRef = useRef(null);
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
    addOfflineItemToCache,
    updateOfflineItemInCache,
    addOfflineListToCache,
    retryCount,
    connectionError,
    isRetrying 
  } = useLists(user?.id);
  const [editingItem, setEditingItem] = useState(null);
  const [editingList, setEditingList] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deepLinkData, setDeepLinkData] = useState(null);
  const [isListsReorderMode, setIsListsReorderMode] = useState(false);
  const mainScreenRef = useRef(null);
  const hasInitialized = useRef(false);
  const [isNavigating, setIsNavigating] = useState(false);

  // Mark achievements as seen when user navigates to Profile; clear badge when leaving
  useEffect(() => {
    if (currentScreen === 'profile') {
      if (pendingAchievements && pendingAchievements.length > 0) {
        setHadNewAchievementsOnEnter(true);
        const ids = pendingAchievements.map(a => a.achievement_id).filter(Boolean);
        if (ids.length > 0) {
          try { markAsNotified(ids); } catch {}
        }
      }
    } else {
      setHadNewAchievementsOnEnter(false);
    }
  }, [currentScreen, pendingAchievements, markAsNotified]);

  // Scroll position management - save/restore scroll positions per screen
  const scrollPositions = useRef({});
  
  const saveScrollPosition = React.useCallback((screenName) => {
    if (typeof window !== 'undefined') {
      const position = {
        window: window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0,
        containers: {}
      };
      
      // Save scroll positions of all scrollable containers
      const containers = document.querySelectorAll('.overflow-auto, .overflow-y-auto');
      containers.forEach((container, index) => {
        position.containers[index] = container.scrollTop;
      });
      
      scrollPositions.current[screenName] = position;
      console.log('📜 [Scroll] Saved scroll position for', screenName, ':', position.window);
    }
  }, []);

  const restoreScrollPosition = React.useCallback((screenName) => {
    if (typeof window !== 'undefined' && scrollPositions.current[screenName]) {
      const position = scrollPositions.current[screenName];
      
      requestAnimationFrame(() => {
        // Restore window scroll position
        window.scrollTo({ top: position.window, behavior: 'instant' });
        document.documentElement.scrollTop = position.window;
        document.body.scrollTop = position.window;
        
        // Restore container scroll positions
        const containers = document.querySelectorAll('.overflow-auto, .overflow-y-auto');
        containers.forEach((container, index) => {
          if (position.containers[index] !== undefined) {
            container.scrollTop = position.containers[index];
          }
        });
        
        console.log('📜 [Scroll] Restored scroll position for', screenName, ':', position.window);
      });
    }
  }, []);

  // OPTIMIZED: Efficient scroll reset with reduced DOM queries
  const resetScrollToTop = React.useCallback(() => {
    if (typeof window !== 'undefined') {
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        
        // Cache scrollable containers to avoid repeated queries
        if (!resetScrollToTop.cachedContainers) {
          resetScrollToTop.cachedContainers = document.querySelectorAll('.overflow-auto, .overflow-y-auto');
        }
        resetScrollToTop.cachedContainers.forEach(container => {
          container.scrollTop = 0;
        });
      });
    }
  }, []);



  // Current feed type state - match MainScreen default tab
  const [currentFeedType, setCurrentFeedType] = useState('for_you');

  // Use optimized feed hook with dynamic feed type
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
  } = useOptimizedFeed(currentFeedType);

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

  // Feed images are tracked directly via textLoaded && imagesLoaded

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
      
      // Remove the unfollowed user's posts from the following feed cache
      removeUserPostsFromFeedCache('following', userId);
      
      console.log(`Unfollowed ${username} and removed their posts from following feed`);
    } catch (error) {
      console.error('Unfollow error:', JSON.stringify({
          message: error.message,
          name: error.name,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        }, null, 2));
    }
  };


  // OPTIMIZED: Memoized navigation with scroll position management
  const navigateToScreen = React.useCallback((screen) => {
    console.log('🔧 [App] navigateToScreen called with screen:', screen, 'from currentScreen:', currentScreen);
    // Skip navigation if already on the target screen
    if (currentScreen === screen) {
      console.log('🔧 [App] Already on target screen, skipping navigation');
      return;
    }
    
    // Set navigation state to prevent camera from starting immediately
    setIsNavigating(true);
    
    // Save scroll position of current screen before navigating away
    saveScrollPosition(currentScreen);
    
    setPreviousScreen(currentScreen);
    setCurrentScreen(screen);
    // Don't clear selectedList when navigating to list-detail
    if (screen !== 'list-detail') {
      setSelectedList(null);
    }
    setSelectedItem(null);
    
    console.log('🔧 [App] Navigation state updated, new screen:', screen);
    
    // Handle scroll position based on target screen
    requestAnimationFrame(() => {
      if (screen === 'home') {
        // Restore scroll position for home screen to prevent camera activation
        restoreScrollPosition('home');
      } else {
        // Reset scroll for other screens
        resetScrollToTop();
      }
      
      // Clear navigation state after a delay to allow UI to settle
      setTimeout(() => {
        setIsNavigating(false);
      }, 1000); // Give enough time for scroll restoration and UI settling
    });
    
    try {
      if (typeof window !== 'undefined' && window.history && window.history.pushState) {
        window.history.pushState({ screen }, '');
      }
    } catch (_) {}
    
    if (screen === 'user-profile') {
      setUserProfileKey((k) => k + 1);
    }
  }, [currentScreen, saveScrollPosition, restoreScrollPosition]);

  const handleNavigateToUser = (username) => {
    setSelectedUsername(username);
    setPreviousScreen(currentScreen);
    setUserProfileOrigin(currentScreen);
    navigateToScreen('user-profile');
  };

  const handleBackFromUserProfile = React.useCallback(() => {
    setSelectedUsername(null);
    const target = userProfileOrigin || (previousScreen && previousScreen !== 'user-profile' ? previousScreen : 'home');
    
    // Save current screen position before navigating back
    saveScrollPosition('user-profile');
    
    setCurrentScreen(target);
    setUserProfileOrigin(null);
    
    // Handle scroll position based on target screen
    requestAnimationFrame(() => {
      if (target === 'home') {
        // Restore scroll position for home screen to prevent camera activation
        restoreScrollPosition('home');
      } else {
        // Reset scroll for other screens
        resetScrollToTop();
      }
    });
  }, [userProfileOrigin, previousScreen, saveScrollPosition, restoreScrollPosition]);

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

  // Handle opening a shared link when not following author: route to public profile (I think not used)
  // const handleOpenSharedPost = async (postId) => {
  //   try {
  //     // We need the post's author. Fetch minimal data.
  //     const { data, error } = await supabase
  //       .from('posts')
  //       .select('user_id')
  //       .eq('id', postId)
  //       .single();
  //     if (error || !data?.user_id) return;
  //     setSelectedUsername(null);
  //     // Navigate to public profile view by username if available
  //     const { data: profile } = await supabase
  //       .from('profiles')
  //       .select('username')
  //       .eq('id', data.user_id)
  //       .single();
  //     if (profile?.username) {
  //       handleNavigateToUser(profile.username);
  //     }
  //   } catch (_) {}
  // };

  const handleImageTap = (postId) => {
    console.log('🔍 handleImageTap called with postId:', postId);
    setSelectedPostId(postId);
    setPostOriginScreen(currentScreen);
    navigateToScreen('post-detail');
  };

  const handleBackFromPost = React.useCallback(() => {
    setSelectedPostId(null);
    
    // Set navigation state to prevent camera from starting immediately
    setIsNavigating(true);
    
    // Save current screen position before navigating back
    saveScrollPosition('post-detail');
    
    let targetScreen;
    
    // Prefer explicit origin if available
    if (postOriginScreen) {
      targetScreen = postOriginScreen;
      setCurrentScreen(postOriginScreen);
      if (postOriginScreen === 'user-profile') setUserProfileKey((k) => k + 1);
      setPostOriginScreen(null);
    } else {
      // Fallback to previousScreen or home
      if (previousScreen === 'profile' || previousScreen === 'lists' || previousScreen === 'user-profile') {
        targetScreen = previousScreen;
        setCurrentScreen(previousScreen);
        if (previousScreen === 'user-profile') setUserProfileKey((k) => k + 1);
      } else {
        targetScreen = 'home';
        setCurrentScreen('home');
      }
    }
    
    // Handle scroll position based on target screen
    requestAnimationFrame(() => {
      if (targetScreen === 'home') {
        // Restore scroll position for home screen to prevent camera activation
        restoreScrollPosition('home');
      } else {
        // Reset scroll for other screens
        resetScrollToTop();
      }
      
      // Clear navigation state after a delay to allow UI to settle
      setTimeout(() => {
        setIsNavigating(false);
      }, 1000); // Give enough time for scroll restoration and UI settling
    });
  }, [postOriginScreen, previousScreen, saveScrollPosition, restoreScrollPosition]);

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

  // Cache-only loading function for offline mode
  const loadFromCacheOnly = async (existingUser) => {
    console.log('📦 [App] Loading from cache only - offline mode');

    try {
      // Import cache functions directly from hooks
      const { getListsLocal } = await import('./hooks/useLists');
      // getProfilePostsLocal is now statically imported above

      // Load cached lists
      const cachedLists = await getListsLocal(existingUser?.id);
      if (cachedLists && cachedLists.length >= 0) {
        console.log('📦 [App] Loaded cached lists:', cachedLists.length);
        // Lists will be loaded by useLists hook naturally
      }

      // Load cached feed posts
      const cachedFeed = await getProfilePostsLocal(existingUser?.id);
      if (cachedFeed?.posts) {
        console.log('📦 [App] Loaded cached feed posts:', cachedFeed.posts.length);
        // Feed will be loaded by useOptimizedFeed hook naturally
      }

      // Mark all loading states as complete for offline mode
      setLoadingProgress({
        auth: true,
        lists: true,
        feed: true,
        stats: true,
        achievements: true,
        userTracking: true,
        camera: true,
        profile: true
      });

      setCameraReady(true);
      setProfileReady(true);

      console.log('✅ [App] Cache-only loading completed');

    } catch (error) {
      console.error('❌ [App] Cache loading error:', error);
      // Fallback to empty states
      setLoadingProgress({
        auth: true,
        lists: true,
        feed: true,
        stats: true,
        achievements: true,
        userTracking: true,
        camera: true,
        profile: true
      });
      setCameraReady(true);
      setProfileReady(true);
    }
  };

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

        // Step 1.5: Check if we should load from cache only (offline mode)
        const cacheOnlyMode = shouldLoadFromCacheOnly();
        
        if (cacheOnlyMode && existingUser) {
          console.log('📱 [App] OFFLINE MODE - Loading from cache only');
          await loadFromCacheOnly(existingUser);
          return;
        }

        if (existingUser) {
          // Step 2: User tracking (can run in parallel)
          console.log('📊 [App] Starting user tracking...');
          setLoadingProgress(prev => ({ ...prev, userTracking: false }));
          trackUserSession().finally(() => {
            setLoadingProgress(prev => ({ ...prev, userTracking: true }));
            console.log('✅ [App] User tracking completed');
          });

          // Step 2.5: Profile loading (in parallel)
          console.log('👤 [App] Loading user profile...');
          setLoadingProgress(prev => ({ ...prev, profile: false }));
          
          // Step 3: Load all data in parallel with proper progress tracking
          console.log('📊 [App] Loading all app data in parallel...');
          
          // Start all loading operations
          const promises = [];
          
          // Profile loading - wait for profile to be available
          promises.push(
            new Promise(async (resolve) => {
              try {
                const { data, error } = await supabase
                  .from('profiles')
                  .select('*')
                  .eq('id', existingUser.id)
                  .single();
                
                if (!error && data) {
                  console.log('✅ [App] Profile loaded successfully');
                  setLoadingProgress(prev => ({ ...prev, profile: true }));
                  setProfileReady(true);
                } else {
                  console.log('⚠️ [App] Profile not found or error, continuing without profile');
                  setLoadingProgress(prev => ({ ...prev, profile: true }));
                  setProfileReady(true);
                }
              } catch (error) {
                console.error('❌ [App] Profile loading failed:', error);
                setLoadingProgress(prev => ({ ...prev, profile: true }));
                setProfileReady(true);
              }
              resolve();
            })
          );
          
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
                
                // Safety check for user.id
                if (!user?.id) {
                  console.log('⚠️ [App] No user ID available for achievements loading');
                  setLoadingProgress(prev => ({ ...prev, achievements: true }));
                  return;
                }
                
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
            userTracking: true,
            camera: true,
            profile: true
          });
          setCameraReady(true);
          setProfileReady(true);
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
            userTracking: true,
            camera: true,
            profile: true
          }));
          setCameraReady(true);
          setProfileReady(true);
        }
      } finally {
        // Only stop app loading when everything is done
        setAppLoading(false);
        setHasShownInitialUI(true); // Mark that we've shown UI at least once
        console.log('🎉 [App] App initialization complete - showing app!');
        
        // 🏆 Trigger any pending sign-in achievements now that app is fully loaded
        if (typeof window !== 'undefined' && typeof window.triggerPendingSignInAchievements === 'function') {
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

  // Listen for lists refresh events after successful sync
  useEffect(() => {
    const handleListsRefreshNeeded = (event) => {
      if (event.detail?.userId === user?.id) {
        console.log('🔄 [App] Lists refresh needed after sync, refreshing...');
        refreshLists(false).catch(error => {
          console.error('❌ [App] Failed to refresh lists after sync:', error);
        });
      }
    };

    window.addEventListener('lists:refresh-needed', handleListsRefreshNeeded);
    return () => {
      window.removeEventListener('lists:refresh-needed', handleListsRefreshNeeded);
    };
  }, [user?.id, refreshLists]);

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
    console.log('🔄 [App] Tab changed to:', feedType, '(previous:', currentFeedType, ')');
    console.log('🔄 [App] Current feed state:', {
      isLoadingFeed,
      feedPosts: feedPosts?.length || 0,
      hasShownInitialUI,
      appLoading
    });
    setCurrentFeedType(feedType);
    // Feed data will be reloaded automatically when feedType changes by useOptimizedFeed hook
  };

  // Feed refresh is now handled by the optimized hook
  const handleFeedRefresh = async () => {
    console.log('🔄 [App] Starting feed refresh...');
    await refreshFeed();
    console.log('✅ [App] Feed refresh completed');
  };

  // Update feed posts (used by MainScreen to update comment counts immediately)
  const handleUpdateFeedPosts = (updatedPosts) => {
    // Update the current feed type's posts cache directly for immediate UI updates
    if (updatedPosts && Array.isArray(updatedPosts)) {
      updateFeedPosts(currentFeedType, updatedPosts);
      console.log('💬 [App] Updated feed posts cache with comment count changes for:', currentFeedType);
    }
  };

  // Handle item deletion from lists - refresh feed to stay in sync
  const handleItemDeleted = async (deletedItemIds) => {
    console.log('🗑️ [App] Items deleted from lists, refreshing in background:', deletedItemIds);
    
    // 🚀 OPTIMISTIC: Don't block UI with synchronous refreshes
    // The UI has already been updated optimistically by the delete components
    
    // 🔥 SILENT Background refresh - no loading screens or await
    refreshFeed(true).then(() => {
      console.log('✅ [App] Feed refreshed silently in background after deletion');
    }).catch(err => {
      console.error('❌ [App] Background feed refresh failed:', err);
    });
    
    // Background lists refresh - no await to prevent loading screens  
    refreshLists().then(() => {
      console.log('✅ [App] Lists refreshed in background after deletion');
    }).catch(err => {
      console.error('❌ [App] Background lists refresh failed:', err);
    });
    
    console.log('🚀 [App] Silent background refreshes started, UI remains responsive');
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
            
            // Reset scroll position to top when app becomes active
            resetScrollToTop();
            
            try {
              // Refresh authentication state (non-blocking)
              const authPromise = supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
                if (currentUser && currentUser.id !== user?.id) {
                  setUser(currentUser);
                }
              });
              
              // Refresh data if user is logged in (completely non-blocking)
              if (user) {
                // Use setTimeout to defer all refreshes to prevent UI blocking
                setTimeout(() => {
                  // Sync offline queue when coming back online
                  if (queueStatus.pendingItems > 0) {
                    console.log('📱 [Sync] App resumed with pending items, starting sync...');
                    syncOfflineQueue().catch(syncError => {
                      console.error('❌ [Sync] Failed to sync offline queue:', syncError);
                    });
                  }
                  
                  // Refresh lists with retry
                  retryNetworkRequest(() => refreshLists(false)).catch(error => {
                    console.error('❌ [App] Failed to refresh lists on resume:', error);
                  });
                  
                  // Refresh feed using optimized hook
                  refreshFeed().catch(error => {
                    console.error('❌ [App] Failed to refresh feed on resume:', error);
                  });
                }, 100); // Small delay to ensure app is fully stable
              }
              
              // Wait for auth to complete, but don't block UI
              await authPromise;
              
              // Restart camera if on main screen (with delay to prevent white screen)
              if (currentScreen === 'home' && mainScreenRef.current) {
                setTimeout(() => {
                  mainScreenRef.current?.refreshFeedData();
                }, 1000); // Increased delay to ensure app is fully stable
              }
              
            } catch (error) {
              console.error('❌ Error refreshing app data on resume:', JSON.stringify({
                message: error.message,
                name: error.name,
                details: error.details,
                hint: error.hint,
                code: error.code,
                fullError: error
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

    // Mark app as active to allow background-safe operations
    try { window.__APP_ACTIVE__ = true; } catch (_) {}
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
      
      // Check if we're offline (check both sources for reliability)
      if (!queueStatus.isOnline || !navigator.onLine) {
        console.log('📱 [Offline] Queueing item for later sync:', itemData.name);
        
        // Add to offline queue
        const queueId = await queueCreateItem({
          selectedListIds,
          itemData,
          isStayAway
        });
        
        console.log('📱 [Offline] Item queued with ID:', queueId);
        
        // Add to local cache so it appears immediately in lists
        const offlineId = addOfflineItemToCache(selectedListIds, itemData, isStayAway);
        
        // Also add to profile posts cache for immediate display in recent photos
        const listName = lists.find(l => l.id === selectedListIds[0])?.name || 'Unknown List';
        addOfflineProfilePost(user?.id, itemData, selectedListIds[0], listName);
        
        // Return a mock result for offline mode
        return {
          data: {
            id: offlineId,
            ...itemData,
            pending_sync: true
          },
          achievements: [], // No achievements when offline
          error: null
        };
      }
      
      console.log('🔧 Calling addItemToList with selectedListIds array:', selectedListIds);
      // Online mode - create item normally, but handle network failures
      try {
        // Start DB work without keeping the spinner on
        const dbStartTime = performance.now();
        console.log('⏱️ [TIMING] Starting addItemToList database operation...');
        const resultPromise = addItemToList(selectedListIds, itemData, isStayAway);
      
      // Add timing when promise resolves
      resultPromise.then((result) => {
        const dbEndTime = performance.now();
        console.log('✅ [TIMING] addItemToList completed in', Math.round(dbEndTime - dbStartTime), 'ms');
        return result;
      }).catch((error) => {
        const dbEndTime = performance.now();
        console.log('❌ [TIMING] addItemToList failed after', Math.round(dbEndTime - dbStartTime), 'ms');
        throw error;
      });
      // Stop global image loading immediately for snappy UX
      setImagesLoading(false);
      // Ensure cleanup/refresh after completion without blocking UI
      resultPromise.finally(() => {
        try { setEditingItem(null); } catch (_) {}
        // Avoid heavy list refresh; optimistic update already applied
      });
      return resultPromise;
      } catch (networkError) {
        // If network request fails, treat as offline and queue the operation
        console.log('📱 [Network Failed] Treating as offline, queueing item for later sync:', itemData.name);
        console.log('📱 [Network Error]:', networkError.message);
        
        // Add to offline queue
        const queueId = await queueCreateItem({
          selectedListIds,
          itemData,
          isStayAway
        });
        
        console.log('📱 [Network Failed] Item queued with ID:', queueId);
        
        // Add to local cache so it appears immediately in lists
        const offlineId = addOfflineItemToCache(selectedListIds, itemData, isStayAway);
        
        // Also add to profile posts cache for immediate display in recent photos
        const listName = lists.find(l => l.id === selectedListIds[0])?.name || 'Unknown List';
        addOfflineProfilePost(user?.id, itemData, selectedListIds[0], listName);
        
        // Stop loading
        setImagesLoading(false);
        
        // Return a mock result for offline mode
        return {
          data: {
            id: offlineId,
            ...itemData,
            pending_sync: true
          },
          achievements: [], // No achievements when offline
          error: null
        };
      }
    } catch (error) {
      console.error('❌ Error in handleAddItem:', JSON.stringify({
          message: error.message || 'Unknown error',
          name: error.name,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        }, null, 2));
      
      // If we're online but got an error, it might be a network issue
      // Queue for offline sync as fallback
      if (queueStatus.isOnline && (error.message?.includes('network') || error.message?.includes('fetch'))) {
        console.log('📱 [Network Error] Queueing item for later sync due to network error');
        try {
          const queueId = await queueCreateItem({
            selectedListIds,
            itemData: {
              ...item,
              is_stay_away: isStayAway
            },
            isStayAway
          });
          
          // Return a pending result
          return {
            data: {
              id: `offline_${queueId}`,
              ...item,
              is_stay_away: isStayAway,
              pending_sync: true
            },
            achievements: [],
            error: null
          };
        } catch (queueError) {
          console.error('Failed to queue item:', queueError);
        }
      }
      
      throw error;
    } finally {
      // imagesLoading already cleared above for online path; ensure cleared for any unexpected paths
      try { setImagesLoading(false); } catch (_) {}
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
      // Check if we're offline (check both sources for reliability)
      if (!queueStatus.isOnline || !navigator.onLine) {
        console.log('📱 [Offline] Queueing item update for later sync:', item.name);
        
        // Queue the update for offline sync
        const queueId = await queueUpdateItem(item);
        
        console.log('📱 [Offline] Item update queued with ID:', queueId);
        
        // Update in local cache so changes appear immediately
        updateOfflineItemInCache(item);
        
        // Return a mock result for offline mode
        return {
          data: {
            ...item,
            pending_sync: true
          },
          error: null
        };
      }
      
      // For updates, we don't need to specify listIds since we're updating by item ID
      // The item should contain its current list_id already
      const result = await updateItemInList([], item); // Empty array for listIds since we're updating existing item
      console.log('✅ Item update completed successfully');
      
      // Stats will update automatically via database triggers
      return result; // Return the full result object
    } catch (error) {
      console.error('❌ Item update failed:', JSON.stringify({
          message: error.message || 'Unknown error',
          name: error.name,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        }, null, 2));
      
      // If we're online but got an error, queue for offline sync as fallback
      if (queueStatus.isOnline && (error.message?.includes('network') || error.message?.includes('fetch'))) {
        console.log('📱 [Network Error] Queueing item update for later sync due to network error');
        try {
          const queueId = await queueUpdateItem(item);
          
          // Return a pending result
          return {
            data: {
              ...item,
              pending_sync: true
            },
            error: null
          };
        } catch (queueError) {
          console.error('Failed to queue item update:', queueError);
        }
      }
      
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
    console.log('🔧 [App] handleSelectList called with list:', list?.name, list?.id);
    // Set both the list and screen in the same render cycle
    setSelectedList(list);
    setCurrentScreen('list-detail');
    setPreviousScreen('lists');
    console.log('🔧 [App] List selection and navigation completed');
  };

  const handleBackFromList = () => {
    setSelectedList(null);
    setCurrentScreen('lists');
    resetScrollToTop();
  };

  const handleBackFromItem = () => {
    setSelectedItem(null);
    if (selectedList) {
      setCurrentScreen('list-detail');
    } else {
      setCurrentScreen('lists');
    }
    resetScrollToTop();
  };

  const handleCreateList = async (name, color) => {
    try {
      console.log('🔧 App: handleCreateList called with:', { name, color });
      
      // Check if we're offline (check both sources for reliability)
      if (!queueStatus.isOnline || !navigator.onLine) {
        console.log('📱 [Offline] Queueing list for later sync:', name);
        
        // Add to offline queue
        const queueId = await queueCreateList({
          userId: user?.id,
          name: name,
          color: color || '#1F6D5A'
        });
        
        console.log('📱 [Offline] List queued with ID:', queueId);
        
        // Add to local cache so it appears immediately in lists
        const offlineList = addOfflineListToCache({
          name: name,
          color: color || '#1F6D5A'
        });
        
        console.log('📱 [Offline] List added to cache:', offlineList?.id);
        
        // Return the offline list
        return offlineList;
      }
      
      // Online mode - create list normally, but handle network failures
      try {
        const newList = await createList(name, color);
        console.log('🔧 App: createList returned:', newList);
        
        // Stats will update automatically via database triggers
        
        return newList;
      } catch (networkError) {
        // If network request fails, treat as offline and queue the operation
        console.log('📱 [Network Failed] Treating as offline, queueing list for later sync:', name);
        console.log('📱 [Network Error]:', networkError.message);
        
        // Add to offline queue
        const queueId = await queueCreateList({
          userId: user?.id,
          name: name,
          color: color || '#1F6D5A'
        });
        
        console.log('📱 [Network Failed] List queued with ID:', queueId);
        
        // Add to local cache so it appears immediately in lists
        const offlineList = addOfflineListToCache({
          name: name,
          color: color || '#1F6D5A'
        });
        
        console.log('📱 [Network Failed] List added to cache:', offlineList?.id);
        
        // Return the offline list
        return offlineList;
      }
    } catch (error) {
      console.error('❌ App: Error in handleCreateList:', JSON.stringify({
          message: error.message,
          name: error.name,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        }, null, 2));
      throw error; // Re-throw so AddItemModal can handle it
    }
  };

  // Screen-specific refresh handlers
  const handleHomeRefresh = async () => {
    setRefreshing(true);
    
    try {
      // Ensure app is marked active so feed refresh doesn't get skipped
      try { window.__APP_ACTIVE__ = true; } catch (_) {}
      // It is critical to await the data loading before setting refreshing to false
      await Promise.all([
        refreshLists(false),
        refreshFeed() // Use optimized feed refresh
      ]);
      
    } catch (error) {
      console.error('❌ Home refresh error:', JSON.stringify({
          message: error.message,
          name: error.name,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
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

  const handleReorderModeChange = (isReorderMode) => {
    setIsListsReorderMode(isReorderMode);
  };

  const handleProfileRefresh = async () => {
    setRefreshing(true);
    
    try {
      console.log('🔄 [App] Starting profile refresh...');
      
      // Call ProfileView's refresh function if available
      if (profileViewRef.current?.refresh) {
        await profileViewRef.current.refresh();
      } else {
        // Fallback: just wait a bit
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log('✅ [App] Profile refresh completed');
      
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
    console.log('🔧 [App] renderScreen called with currentScreen:', currentScreen, 'selectedList:', selectedList?.name);
    // Only handle detail screens - keep these as conditional renders (they should reload when context changes)
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

    if (currentScreen === 'user-profile') {
      return (
        <UserProfile
          key={userProfileKey}
          username={selectedUsername}
          onBack={handleBackFromUserProfile}
          onNavigateToUser={handleNavigateToUser}
          onImageTap={handleImageTap}
        />
      );
    }

    // For main tabs, return null - they're rendered persistently
    return null;
  };

  // OPTIMIZED: Memoized tab transitions and conditional rendering
  const tabTransitions = React.useMemo(() => ({
    active: {
      transition: 'opacity 150ms ease-out', // Faster, simpler transition
      opacity: 1,
      pointerEvents: 'auto'
    },
    hidden: {
      transition: 'opacity 150ms ease-out',
      opacity: 0,
      pointerEvents: 'none'
    }
  }), []);

  // Persistent rendering for main tabs - prevents image reloading
  const renderMainTabs = React.useCallback(() => {
    // Only render main tabs if we're not on a detail screen
    const isDetailScreen = ['post-detail', 'item-detail', 'list-detail', 'user-profile'].includes(currentScreen);
    if (isDetailScreen) return null;

    return (
      <>
        {/* Home Tab - Conditionally render heavy components */}
        <div 
          className="absolute inset-0"
          style={currentScreen === 'home' ? tabTransitions.active : tabTransitions.hidden}
        >
          {currentScreen === 'home' && ( // Only render when actually on home tab
            <PullToRefresh onRefresh={handleHomeRefresh} disabled={refreshing}>
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
              <div className="px-4 mb-3 flex items-baseline justify-between">
                <div className="flex items-baseline gap-3 pl-2">
                  <span className="text-title-main font-arsenal-sc text-gray-600 leading-none pb-4">
                    curate
                  </span>

                    {/* Offline Status Indicator */}
                    {!queueStatus.isOnline && (
                      <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 rounded-full">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span className="text-[9px] font-medium text-orange-700">Offline</span>
                      </div>
                    )}

                    {/* Sync Status Indicator */}
                    {queueStatus.pendingItems > 0 && (
                      <button
                        onClick={async () => {
                          if (!queueStatus.isSyncing) {
                            console.log('🔄 [UI] Manual sync triggered by user');
                            try {
                              await syncOfflineQueue();
                              console.log('✅ [UI] Manual sync completed');
                            } catch (error) {
                              console.error('❌ [UI] Manual sync failed:', error);
                            }
                          }
                        }}
                        disabled={queueStatus.isSyncing}
                        className="flex items-center gap-1 px-2 py-1 bg-blue-100 rounded-full hover:bg-blue-200 transition-colors disabled:cursor-not-allowed"
                      >
                        {queueStatus.isSyncing ? (
                          <>
                            <div className="w-2 h-2 border border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-[9px] font-medium text-blue-700">Syncing</span>
                          </>
                        ) : (
                          <>
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-[9px] font-medium text-blue-700">{queueStatus.pendingItems} pending</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={handleSearch}
                      className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm"
                    >
                      <Search className="w-4 h-4 text-gray-700" />
                    </button>
                    {/* Achievements header icon removed per redesign */}
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
                      <div className="relative z-30">
                        <NotificationsDropdown
                          notifications={notifications}
                          unreadCount={unreadCount}
                          isOpen={isOpen}
                          onClose={toggleOpen}
                          onMarkRead={markAsRead}
                          onMarkAllRead={markAllAsRead}
                          onNavigateToPost={handleNavigateToPost}
                          onNavigateToUser={handleNavigateToUser}
                        />
                      </div>
                    </div>
                    {/* Dropdown removed */}
                  </div>
                </div>
              </div>
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
                feedPosts={feedPosts}
                isLoadingFeed={isLoadingFeed}
                isLoadingMore={isLoadingMore}
                feedError={feedError}
                onLoadMore={loadMore}
                hasMore={hasMore}
                updateImageLoadState={updateImageLoadState}
                textLoaded={textLoaded}
                imagesLoaded={imagesLoaded}
                onUpdateFeedPosts={handleUpdateFeedPosts}
                onCameraReady={handleCameraReady}
                isActive={currentScreen === 'home' && !appLoading} // Pass active state, but not during app loading
              />
            </PullToRefresh>
          )}
        </div>

        {/* Lists Tab - Always mounted for fast switching */}
        <div 
          className="absolute inset-0"
          style={currentScreen === 'lists' ? tabTransitions.active : tabTransitions.hidden}
        >
          <PullToRefresh onRefresh={handleListsRefresh} disabled={refreshing || isListsReorderMode}>
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
              onSearch={handleSearch}
              onNotifications={handleNotifications}
              unreadCount={unreadCount}
              notifications={notifications}
              isNotificationsOpen={isOpen}
              onMarkRead={markAsRead}
              onMarkAllRead={markAllAsRead}
              onNavigateToPost={handleNavigateToPost}
              onNavigateToUser={handleNavigateToUser}
              onReorderModeChange={handleReorderModeChange}
              onAddItem={handleAddItem}
              isActive={currentScreen === 'lists'} // Pass active state
            />
          </PullToRefresh>
        </div>

        {/* Profile Tab - Lazy load on first access */}
        <div 
          className="absolute inset-0"
          style={currentScreen === 'profile' ? tabTransitions.active : tabTransitions.hidden}
        >
          {(currentScreen === 'profile' || previousScreen === 'profile') && (
            <PullToRefresh onRefresh={handleProfileRefresh} disabled={refreshing}>
              <ProfileView 
                ref={profileViewRef}
                onBack={() => navigateToScreen('home')}
                isRefreshing={refreshing}
                onEditItem={handleEditItem}
                onNavigateToUser={handleNavigateToUser}
                onImageTap={handleImageTap}
                hadNewAchievementsOnEnter={hadNewAchievementsOnEnter}
                isActive={currentScreen === 'profile'} // Pass active state
              />
            </PullToRefresh>
          )}
        </div>
      </>
    );
  }, [currentScreen, previousScreen, lists, imagesLoading, listsLoading, refreshing, feedPosts, isLoadingFeed, isLoadingMore, feedError, hasMore, textLoaded, imagesLoaded, unreadCount, notifications, isOpen, isListsReorderMode, hadNewAchievementsOnEnter]); // Memoize with necessary dependencies


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
  const coreReady = loadingProgress.auth && loadingProgress.userTracking && loadingProgress.profile;
  const contentReady = loadingProgress.lists && loadingProgress.feed && loadingProgress.stats;
  const extrasReady = loadingProgress.achievements && loadingProgress.camera; // achievements/notifications/camera
  const displaySteps = [
    { key: 'core', label: 'Core setup', icon: '🔐', done: coreReady },
    { key: 'content', label: 'Content', icon: '🍽️', done: contentReady },
    { key: 'extras', label: 'Extras', icon: '🏆', done: extrasReady }
  ];
  const loadingComplete = displaySteps.every(s => s.done);
  const completedSteps = displaySteps.filter(s => s.done).length;
  const totalSteps = displaySteps.length;
  const progressPercentage = Math.round((completedSteps / totalSteps) * 100);
  
  // Check if all tabs have their data AND critical images ready
  // Note: We only check essential data loading, not UI states like camera initialization
  // If lists are available (even if still loading fresh data), consider them ready
  const hasListsData = lists && lists.length >= 0; // Even empty array means lists are loaded
  
  // Check critical images: Temporarily disabled to fix white screen
  // TODO: Add proper critical image tracking for progressive loading
  const criticalImagesReady = true; // Temporarily disabled
  
  // Don't let tab switching affect initial loading screen
  // Once we've shown initial UI, feed loading from tab switches shouldn't block the app
  const feedReadyForInitialLoad = hasShownInitialUI ? true : !isLoadingFeed;
  const allTabsReady = (!listsLoading || hasListsData) && feedReadyForInitialLoad && !statsLoading && !achievementsLoading && cameraReady && profileReady;
  
  // OPTIMIZED: Reduce debug logging frequency
  const debugLogCountRef = useRef(0);
  useEffect(() => {
    debugLogCountRef.current++;
    // Only log every 5th state change to reduce noise
    if (debugLogCountRef.current % 5 === 0) {
      console.log('📊 [App] Loading state (sample):', {
        appLoading,
        allTabsReady,
        willShowLoadingScreen: appLoading || !allTabsReady
      });
    }
  }, [appLoading, allTabsReady]);

  // Show full-screen loading screen only on first app boot before initial UI render
  if (!hasShownInitialUI && (appLoading || !allTabsReady)) {
    return <LoadingScreen loadingProgress={loadingProgress} appLoading={appLoading} />;
  }

  // Show auth view only when not loading and no user
  if (!appLoading && !user) {
    return (
      <ErrorBoundary name="AuthView">
        <AuthView />
      </ErrorBoundary>
    );
  }

  // App is now ready to render

  return (
    <AchievementProvider>
      <ErrorBoundary name="AppRoot">
      <div 
        className="min-h-screen bg-stone-50 flex flex-col" 
                 style={{
          backgroundColor: '#F6F6F4',
          // Responsive design for keyboard handling
          paddingBottom: 'env(safe-area-inset-bottom)',
          minHeight: '100dvh', // Dynamic viewport height for mobile (fallback to 100vh if not supported)
        }}
    >
      {/* Connection Status Bar */}
      <ConnectionStatus />
      

      
      

      {/* Main Content */}
      <main className="relative flex-1">

        
        <ErrorBoundary name="MainContent">
          {renderScreen() || renderMainTabs()}
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
            className={`relative flex flex-col items-center gap-1 px-4 py-2 transition-colors duration-150 ${
              currentScreen === 'profile'
                ? 'text-teal-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            style={{ color: currentScreen === 'profile' ? '#1F6D5A' : undefined }}
          >
            <div className="relative">
              <User className="w-5 h-5" />
              {pendingAchievements && pendingAchievements.length > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </div>
            <span className="text-xs font-medium">Profile</span>
          </button>
        </div>
      </div>

      {/* Edit Item Modal */}
      <ModalPortal isOpen={!!editingItem}>
        <AnimatePresence mode="wait">
          {editingItem && (
            <motion.div
              key="edit-item-modal"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
            >
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
                showRatingFirst={editingItem.showRatingFirst || false}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </ModalPortal>

            {/* Search Modal */}
      <SearchModal
        isOpen={showSearch}
        onClose={() => setShowSearch(false)}
        user={user}
        lists={lists}
        onNavigateToUser={handleNavigateToUser}
        onNavigateToList={(list) => {
          setSelectedList(list);
          setCurrentScreen('list-detail');
        }}
        onFollowUser={handleFollowUser}
        onUnfollowUser={handleUnfollowUser}
        followingUsers={followingUsers}
      />

      {/* Achievement System - Global notifications */}
      <AchievementSystem />
    </div>
    </ErrorBoundary>
  </AchievementProvider>
  );
};

export default App;
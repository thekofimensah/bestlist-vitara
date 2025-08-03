import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, List, User, Search, Bell, X } from 'lucide-react';
import { App as CapacitorApp } from '@capacitor/app';
import MainScreen from './components/MainScreen';
import ListsView from './components/ListsView';
import ProfileView from './components/ProfileView';
import ShowItemsInListView from './components/secondary/ShowItemsInListView';
import AuthView from './components/AuthView';
import AddItemModal from './components/AddItemModal';
import UserProfile from './components/secondary/UserProfile';
import PullToRefresh from './ui/PullToRefresh';
import { supabase, signOut, searchUserContent, getFeedPosts, getPostCommentCount, searchUsers, followUser, unfollowUser, getSessionOptimized } from './lib/supabase';
import { useLists } from './hooks/useLists';
import { motion as Sparkles } from 'framer-motion';
import { NotificationsDropdown } from './components/secondary/NotificationsDropdown';
import { useNotifications } from './hooks/useNotifications';
import PostDetailView from './components/secondary/PostDetailView';
import AchievementSystem from './components/gamification/AchievementSystem';
import { AchievementProvider } from './hooks/useGlobalAchievements.jsx';

// Helper function to format post data from database (moved from MainScreen)
const formatPostForDisplay = (post) => {
  const getTimeAgo = (dateString) => {
    if (!dateString) return '';
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInHours = Math.floor((now - postDate) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d`;
    return `${Math.floor(diffInHours / 168)}w`;
  };

  const getVerdictFromRating = (rating, isStayAway) => {
    if (isStayAway) return 'AVOID';
    return rating >= 4 ? 'KEEP' : 'MEH';
  };

  return {
    id: post.id,
    user: {
      name: post.profiles?.username || 'User',
      avatar: post.profiles?.avatar_url || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"%3E%3C/path%3E%3Ccircle cx="12" cy="7" r="4"%3E%3C/circle%3E%3C/svg%3E',
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
    location: post.location || null
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
        <h1 className="text-3xl font-normal text-gray-900 mb-2 tracking-tight" style={{ fontFamily: 'Jost, sans-serif' }}>ChefKiss</h1>
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
  const [user, setUser] = useState(null);
  const { notifications, unreadCount, isOpen, toggleOpen, markAsRead, markAllAsRead } = useNotifications(user?.id);
  const [appLoading, setAppLoading] = useState(true);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [currentScreen, setCurrentScreen] = useState('home');
  const [previousScreen, setPreviousScreen] = useState('home');
  const [selectedList, setSelectedList] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [selectedUsername, setSelectedUsername] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTab, setSearchTab] = useState('content'); // 'content' or 'users'
  const [userResults, setUserResults] = useState([]);
  const [followingUsers, setFollowingUsers] = useState(new Set());
  const [selectedPostId, setSelectedPostId] = useState(null);
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

  // Feed-related state, now living in the main App component
  const [feedPosts, setFeedPosts] = useState([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [feedError, setFeedError] = useState(null);

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
      setFeedPosts([]); // Reset feed on sign out
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
          console.error('Search error:', error);
          setSearchResults([]);
        } else {
          setSearchResults(data || []);
        }
      } else {
        const { data, error } = await searchUsers(query);
        
        if (error) {
          console.error('User search error:', error);
          setUserResults([]);
        } else {
          setUserResults(data || []);
        }
      }
    } catch (error) {
      console.error('Search failed:', error);
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
      console.error('Follow error:', error);
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
      console.error('Unfollow error:', error);
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
    setSelectedUsername(null);
  };

  const handleNavigateToUser = (username) => {
    setSelectedUsername(username);
    setCurrentScreen('user-profile');
  };

  const handleBackFromUserProfile = () => {
    setSelectedUsername(null);
    setCurrentScreen('home'); // Go back to feed
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

  const handleNavigateToPost = (postId) => {
    // Close the notifications dropdown
    if (isOpen) toggleOpen();
    
    // Navigate to post detail view
    setSelectedPostId(postId);
    setCurrentScreen('post-detail');
    
    console.log('🔔 Navigating to post:', postId);
  };

  const handleImageTap = (postId) => {
    console.log('🔍 handleImageTap called with postId:', postId);
    setSelectedPostId(postId);
    setCurrentScreen('post-detail');
  };

  const handleBackFromPost = () => {
    setSelectedPostId(null);
    setCurrentScreen('home');
  };

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Use optimized session restoration that doesn't block UI
        const user = await getSessionOptimized();
        setUser(user);
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        // Always stop loading quickly to prevent hanging
        setAppLoading(false);
      }
    };
    
    initializeApp();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null);
        setAppLoading(false);
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

  // Load feed data, now living in the main App component
  const loadFeedData = async (feedType = 'for_you') => {
    // Do not reload if we already have posts, unless it's a manual refresh
    if (feedPosts.length > 0 && !refreshing) {
      console.log('✅ Feed already loaded, skipping reload.');
      return;
    }

    try {
      setIsLoadingFeed(true);
      setFeedError(null);
      
      console.log('🔍 Loading feed data for:', feedType);
      
      const { data: rawPosts, error } = await getFeedPosts(feedType, 20, 0);
      
      if (error) {
        console.error('❌ Feed loading error:', error?.message || 'Unknown error');
        setFeedError(error.message || 'Failed to load feed');
        // On refresh, do not clear posts on error. Keep stale data.
        if (!refreshing) {
          setFeedPosts([]);
        }
      } else {
        if (!rawPosts || rawPosts.length === 0) {
          setFeedPosts([]);
        } else {
          const formattedPosts = rawPosts.map(formatPostForDisplay);
          const postsWithCommentCounts = await Promise.all(
            formattedPosts.map(async (post) => {
              try {
                const { count } = await getPostCommentCount(post.id);
                return { ...post, comments: count };
              } catch {
                return post;
              }
            })
          );
          setFeedPosts(postsWithCommentCounts);
        }
      }
    } catch (error) {
      console.error('❌ Feed loading exception:', error);
      setFeedError(error.message || 'Failed to load feed');
      // On refresh, do not clear posts on error. Keep stale data.
      if (!refreshing) {
        setFeedPosts([]);
      }
    } finally {
      setIsLoadingFeed(false);
    }
  };

  // Handle tab change and reload feed with appropriate type
  const handleTabChange = async (feedType) => {
    console.log('🔄 Tab changed to:', feedType);
    // Clear current posts to show loading state
    setFeedPosts([]);
    // Force reload by setting refreshing temporarily
    const wasRefreshing = refreshing;
    setRefreshing(true);
    await loadFeedData(feedType);
    setRefreshing(wasRefreshing);
  };

  // Load initial data once when the app starts
  useEffect(() => {
    if (user) {
      // loadFeedData(); // Commented out - using following by default for now
      loadFeedData('following'); // Default to following feed
    }
  }, [user]);

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
            console.error('❌ Error parsing deep link:', error);
          }
        });

        // Handle app state changes
        CapacitorApp.addListener('appStateChange', async (state) => {
          console.log('📱 App state changed:', state);
          
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
                
                // Refresh feed data with retry
                await retryNetworkRequest(() => loadFeedData('following'));
              }
              
              // Restart camera if on main screen
              if (currentScreen === 'home' && mainScreenRef.current) {
                setTimeout(() => {
                  mainScreenRef.current?.refreshFeedData();
                }, 500); // Small delay to ensure app is fully active
              }
              
            } catch (error) {
              console.error('❌ Error refreshing app data on resume:', error);
            }
          }
        });

        return () => {
          // Clean up listeners
          CapacitorApp.removeAllListeners();
        };
      } catch (error) {
        console.error('❌ Error setting up deep link listeners:', error);
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
      
      return result.data; // Return the saved item
    } catch (error) {
      console.error('❌ Error in handleAddItem:', error);
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
    } catch (error) {
      console.error('❌ Item update failed:', error);
      // Could show a toast notification here for failed updates
    }
    
    // No need to refresh lists since updateItemInList handles optimistic updates
  };

  const handleEditItem = (item, list) => {
    setEditingItem(item);
    setEditingList(list);
  };

  const handleViewItemDetail = (item) => {
    setSelectedItem(item);
    setCurrentScreen('item-detail');
  };

  const handleSelectList = (list) => {
    setSelectedList(list);
    setCurrentScreen('list-detail');
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
      return newList;
    } catch (error) {
      console.error('❌ App: Error in handleCreateList:', error);
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
        // loadFeedData() // Commented out - using following by default for now
        loadFeedData('following') // Default to following feed
      ]);
      
    } catch (error) {
      console.error('❌ Home refresh error:', error);
    } finally {
      // This ensures the spinner disappears only after all data is loaded
      setRefreshing(false);
    }
  };

  // Feed refresh function for MainScreen
  const handleFeedRefresh = async () => {
    console.log('🔄 App: Feed refresh triggered');
    // Call MainScreen's refresh function directly
    if (mainScreenRef.current && mainScreenRef.current.refreshFeedData) {
      await mainScreenRef.current.refreshFeedData();
    }
  };

  const handleListsRefresh = async () => {
    setRefreshing(true);
    
    try {
      // Refresh lists from database
      await refreshLists(false);
      
      // Quick loading feedback
      await new Promise(resolve => setTimeout(resolve, 600));
      
    } catch (error) {
      console.error('❌ Lists refresh error:', error);
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
      console.error('❌ Profile refresh error:', error);
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
      console.error('❌ List detail refresh error:', error);
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
              feedError={feedError}
              setFeedPosts={setFeedPosts}
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
              // Pass feed data down as props
              feedPosts={feedPosts}
              isLoadingFeed={isLoadingFeed}
              feedError={feedError}
              setFeedPosts={setFeedPosts}
            />
          </PullToRefresh>
        );
      case 'profile':
        return (
          <PullToRefresh onRefresh={handleProfileRefresh} disabled={refreshing}>
            <ProfileView 
              onBack={() => navigateToScreen('home')}
              isRefreshing={refreshing}
            />
          </PullToRefresh>
        );
      case 'user-profile':
        return (
          <UserProfile
            username={selectedUsername}
            onBack={handleBackFromUserProfile}
            onNavigateToUser={handleNavigateToUser}
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
              // Pass feed data down as props
              feedPosts={feedPosts}
              isLoadingFeed={isLoadingFeed}
              feedError={feedError}
              setFeedPosts={setFeedPosts}
            />
          </PullToRefresh>
        );
    }
  };

  // Show loading screen
  if (appLoading) {
    return (
      <MultiStepLoadingScreen
        step={1}
        totalSteps={3}
        messages={['Connecting to ChefKiss...', 'Loading your profile...', 'Setting up your kitchen...']}
        currentMessage="Connecting to ChefKiss..."
      />
    );
  }

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

  // Show auth view if no user
  if (!user) {
    return <AuthView />;
  }

  return (
    <AchievementProvider>
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
        className="sticky bg-stone-50 z-10 pt-8 pb-2" 
        style={{ 
          backgroundColor: '#F6F6F4',
          top: (connectionError || isRetrying) ? '48px' : '0'
        }}
      >
        <div className="px-4 mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-teal-700 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1F6D5A' }}>
              <span className="text-white text-xs font-bold">b</span>
            </div>
            <h1 className="text-xl font-normal text-gray-900 tracking-tight" style={{ fontFamily: 'Jost, sans-serif' }}>ChefKiss</h1>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleSearch}
              className="w-9 h-9 bg-white rounded-full flex items-center justify-center shadow-sm"
            >
              <Search className="w-4 h-4 text-gray-700" />
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
          </div>
        </div>
      </div>

      {/* Main Content - Updated height for PullToRefresh */}
      <main className="relative" style={{ height: 'calc(100vh - 140px)' }}>
        {renderScreen()}
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center pt-8 p-4 z-50">
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
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder={searchTab === 'content' ? 'Search lists and items...' : 'Search users...'}
                    className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100 transition-all duration-200"
                    autoFocus
                    autoComplete="on"
                    autoCorrect="on"
                    autoCapitalize="sentences"
                    spellCheck="true"
                    inputMode="text"
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
                              <div className="font-medium text-gray-900">@{user.username}</div>
                              {user.display_name && (
                                <div className="text-sm text-gray-600">{user.display_name}</div>
                              )}
                              {user.bio && (
                                <div className="text-xs text-gray-500 truncate">{user.bio}</div>
                              )}
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
                  <div className="text-xs text-gray-400">
                    {searchTab === 'content' ? 'Try searching for:' : 'Search by username:'}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {searchTab === 'content' 
                      ? ['cheese', 'chocolate', 'olive oil', 'bread'].map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => {
                              setSearchQuery(suggestion);
                              performSearch(suggestion);
                            }}
                            className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200"
                          >
                            {suggestion}
                          </button>
                        ))
                      : ['foodie', 'chef', 'baker'].map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => {
                              setSearchQuery(suggestion);
                              performSearch(suggestion);
                            }}
                            className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs hover:bg-gray-200"
                          >
                            @{suggestion}
                          </button>
                        ))
                    }
                  </div>
                </div>
              </div>
            )}
          </div>
      </div>
      )}

      {/* Achievement System - Global notifications */}
      <AchievementSystem />
      </div>
    </AchievementProvider>
  );
};

export default App;
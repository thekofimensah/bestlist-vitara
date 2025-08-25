import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Camera, 
  Plus, 
  Search, 
  Bell, 
  User, 
  Heart, 
  MessageCircle, 
  Share,
  Star,
  MapPin,
  Trophy,
  X
} from 'lucide-react';
import AddItemModal from './AddItemModal';
import ListsView from './ListsView';
import ProfileView from './ProfileView';
import { NotificationsDropdown } from './secondary/NotificationsDropdown';
import { AchievementsDropdown } from './gamification/AchievementsDropdown';
import PullToRefresh from '../ui/PullToRefresh';
import CommentsModal from './secondary/CommentsModal';
import ShareModal from './secondary/ShareModal';

// Mock data
const mockLists = [
  {
    id: '1',
    name: 'Coffee Favorites',
    color: '#1F6D5A',
    created_at: '2024-01-15T10:00:00Z',
    items: [
      {
        id: 'item1',
        name: 'Ethiopian Single Origin',
        image_url: 'https://images.pexels.com/photos/324028/pexels-photo-324028.jpeg?auto=compress&cs=tinysrgb&w=400',
        rating: 5,
        notes: 'Amazing floral notes with bright acidity',
        created_at: '2024-01-15T10:00:00Z',
        is_stay_away: false
      },
      {
        id: 'item2',
        name: 'Colombian Dark Roast',
        image_url: 'https://images.pexels.com/photos/1695052/pexels-photo-1695052.jpeg?auto=compress&cs=tinysrgb&w=400',
        rating: 4,
        notes: 'Rich and bold, perfect for mornings',
        created_at: '2024-01-14T10:00:00Z',
        is_stay_away: false
      }
    ],
    stayAways: [
      {
        id: 'item3',
        name: 'Bitter Blend',
        image_url: 'https://images.pexels.com/photos/894695/pexels-photo-894695.jpeg?auto=compress&cs=tinysrgb&w=400',
        rating: 2,
        notes: 'Too bitter for my taste',
        created_at: '2024-01-13T10:00:00Z',
        is_stay_away: true
      }
    ]
  },
  {
    id: '2',
    name: 'Dessert Discoveries',
    color: '#FF6B9D',
    created_at: '2024-01-10T10:00:00Z',
    items: [
      {
        id: 'item4',
        name: 'Chocolate Croissant',
        image_url: 'https://images.pexels.com/photos/2067396/pexels-photo-2067396.jpeg?auto=compress&cs=tinysrgb&w=400',
        rating: 5,
        notes: 'Perfectly flaky and buttery',
        created_at: '2024-01-10T10:00:00Z',
        is_stay_away: false
      }
    ],
    stayAways: []
  }
];

const mockFeedPosts = [
  {
    id: 'post1',
    user: {
      name: 'Sarah Chen',
      avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'
    },
    image: 'https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?auto=compress&cs=tinysrgb&w=400',
    title: 'Artisan Sourdough',
    description: 'Found this amazing bakery in downtown. The crust is perfect!',
    rating: 5,
    verdict: 'LOVE',
    tags: ['bakery', 'sourdough', 'artisan'],
    snippet: 'Perfect crust and amazing flavor',
    likes: 24,
    comments: 8,
    location: 'Downtown Bakery, San Francisco',
    created_at: '2024-01-15T14:30:00Z',
    user_liked: false
  },
  {
    id: 'post2',
    user: {
      name: 'Mike Rodriguez',
      avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'
    },
    image: 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=400',
    title: 'Matcha Latte',
    description: 'Creamy and not too sweet. Perfect balance of earthy matcha.',
    rating: 4,
    verdict: 'LOVE',
    tags: ['matcha', 'latte', 'cafe'],
    snippet: 'Perfect matcha balance',
    likes: 15,
    comments: 3,
    location: 'Green Tea Cafe, Portland',
    created_at: '2024-01-15T12:15:00Z',
    user_liked: true
  }
];

const mockNotifications = [
  {
    id: 'notif1',
    type: 'like',
    profiles: {
      username: 'sarah_chen',
      avatar_url: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'
    },
    created_at: '2024-01-15T14:00:00Z',
    read: false,
    reference_id: 'post1'
  },
  {
    id: 'notif2',
    type: 'comment',
    profiles: {
      username: 'mike_rodriguez',
      avatar_url: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&fit=crop'
    },
    created_at: '2024-01-15T13:30:00Z',
    read: false,
    reference_id: 'post2'
  }
];

const mockAchievements = [
  {
    id: 'ach1',
    achievements: {
      name: 'First Bite',
      description: 'Saved your first item',
      icon: '🍽️',
      rarity: 'common'
    },
    earned_at: '2024-01-15T10:00:00Z',
    count: 1
  },
  {
    id: 'ach2',
    achievements: {
      name: 'Explorer',
      description: 'Discovered 10 items',
      icon: '🗺️',
      rarity: 'rare'
    },
    earned_at: '2024-01-14T15:30:00Z',
    count: 1
  }
];

const PostCard = ({ post, onLike, onComment, onShare }) => {
  const [localLiked, setLocalLiked] = useState(post.user_liked);
  const [localLikes, setLocalLikes] = useState(post.likes);

  const handleLike = () => {
    setLocalLiked(!localLiked);
    setLocalLikes(prev => localLiked ? prev - 1 : prev + 1);
    onLike(post.id);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-3xl shadow-sm mb-6 overflow-hidden"
      style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
    >
      {/* Header */}
      <div className="p-4 pb-3">
        <div className="flex items-center gap-3">
          <img
            src={post.user.avatar}
            alt={post.user.name}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="flex-1">
            <p className="font-medium text-gray-900">{post.user.name}</p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {post.location && (
                <>
                  <MapPin className="w-3 h-3" />
                  <span>{post.location}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Image */}
      <div className="relative">
        <img
          src={post.image}
          alt={post.title}
          className="w-full aspect-square object-cover"
        />
        
        {/* Rating overlay */}
        <div className="absolute top-3 right-3 bg-white bg-opacity-90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center gap-1">
          <Star className="w-3 h-3 text-yellow-500 fill-current" />
          <span className="text-sm font-medium text-gray-900">{post.rating}</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-2">{post.title}</h3>
        <p className="text-gray-700 text-sm mb-3 leading-relaxed">{post.description}</p>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {post.tags.map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
            >
              #{tag}
            </span>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={handleLike}
              className="flex items-center gap-2 group"
            >
              <Heart
                className={`w-5 h-5 transition-colors ${
                  localLiked
                    ? 'text-red-500 fill-red-500'
                    : 'text-gray-500 group-hover:text-red-500'
                }`}
              />
              <span className={`text-sm font-medium ${localLiked ? 'text-red-500' : 'text-gray-700'}`}>
                {localLikes}
              </span>
            </button>

            <button
              onClick={() => onComment(post)}
              className="flex items-center gap-2 group"
            >
              <MessageCircle className="w-5 h-5 text-gray-500 group-hover:text-blue-500" />
              <span className="text-sm font-medium text-gray-700">{post.comments}</span>
            </button>
          </div>

          <button
            onClick={() => onShare(post)}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <Share className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const MainScreen = () => {
  const [currentView, setCurrentView] = useState('feed');
  const [selectedTab, setSelectedTab] = useState('For You');
  const [showModal, setShowModal] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [selectedList, setSelectedList] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh delay
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1500);
  };

  const handleLike = (postId) => {
    console.log('Mock: Like post', postId);
  };

  const handleComment = (post) => {
    setSelectedPost(post);
    setShowComments(true);
  };

  const handleShare = (post) => {
    setSelectedPost(post);
    setShowShare(true);
  };

  const handleCameraPress = () => {
    setShowModal(true);
  };

  const handleEditItem = (item, list) => {
    setEditingItem(item);
    setSelectedList(list);
    setShowModal(true);
  };

  const handleCreateList = async (name, color) => {
    console.log('Mock: Create list', { name, color });
  };

  const handleDeleteList = async (listId) => {
    console.log('Mock: Delete list', listId);
  };

  const handleUpdateList = async (listId, updates) => {
    console.log('Mock: Update list', { listId, updates });
  };

  const handleReorderLists = (newOrder) => {
    console.log('Mock: Reorder lists', newOrder.map(l => l.name));
  };

  const renderFeedView = () => (
    <div className="h-screen bg-stone-50" style={{ backgroundColor: '#F6F6F4' }}>
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#1F6D5A' }}>
              <span className="text-white font-bold text-sm">b</span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900">breadcrumbs</h1>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowSearch(!showSearch)}
              className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
            >
              <Search className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center relative"
            >
              <Bell className="w-5 h-5 text-gray-600" />
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-medium">2</span>
              </div>
            </button>
            <button
              onClick={() => setShowAchievements(!showAchievements)}
              className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center relative"
            >
              <Trophy className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="mb-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search posts, users, or lists..."
                className="w-full pl-10 pr-10 py-3 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:border-teal-700"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <button
                onClick={() => {
                  setShowSearch(false);
                  setSearchQuery('');
                }}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 w-6 h-6 flex items-center justify-center"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-2xl p-1">
          {['For You', 'Following'].map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-colors ${
                selectedTab === tab
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Feed Content */}
      <PullToRefresh onRefresh={handleRefresh} disabled={isRefreshing}>
        <div className="px-4 pt-4 pb-32">
          {mockFeedPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onLike={handleLike}
              onComment={handleComment}
              onShare={handleShare}
            />
          ))}
        </div>
      </PullToRefresh>

      {/* Notifications Dropdown */}
      <NotificationsDropdown
        notifications={mockNotifications}
        unreadCount={2}
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        onMarkRead={(id) => console.log('Mock: Mark read', id)}
        onMarkAllRead={() => console.log('Mock: Mark all read')}
        onNavigateToPost={(id) => console.log('Mock: Navigate to post', id)}
      />

      {/* Achievements Dropdown */}
      <AchievementsDropdown
        isOpen={showAchievements}
        onClose={() => setShowAchievements(false)}
        achievements={mockAchievements}
      />
    </div>
  );

  const renderBottomNav = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2 z-30">
      <div className="flex items-center justify-around">
        <button
          onClick={() => setCurrentView('feed')}
          className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors ${
            currentView === 'feed' ? 'text-teal-700' : 'text-gray-500'
          }`}
        >
          <div className="w-6 h-6 flex items-center justify-center">
            <div className={`w-2 h-2 rounded-full ${currentView === 'feed' ? 'bg-teal-700' : 'bg-gray-400'}`} />
          </div>
          <span className="text-xs font-medium">Feed</span>
        </button>

        <button
          onClick={handleCameraPress}
          className="w-14 h-14 bg-teal-700 rounded-full flex items-center justify-center shadow-lg"
          style={{ backgroundColor: '#1F6D5A' }}
        >
          <Camera className="w-6 h-6 text-white" />
        </button>

        <button
          onClick={() => setCurrentView('lists')}
          className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors ${
            currentView === 'lists' ? 'text-teal-700' : 'text-gray-500'
          }`}
        >
          <div className="w-6 h-6 flex items-center justify-center">
            <div className={`w-2 h-2 rounded-full ${currentView === 'lists' ? 'bg-teal-700' : 'bg-gray-400'}`} />
          </div>
          <span className="text-xs font-medium">Lists</span>
        </button>

        <button
          onClick={() => setCurrentView('profile')}
          className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors ${
            currentView === 'profile' ? 'text-teal-700' : 'text-gray-500'
          }`}
        >
          <User className={`w-6 h-6 ${currentView === 'profile' ? 'text-teal-700' : 'text-gray-500'}`} />
          <span className="text-xs font-medium">Profile</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50" style={{ backgroundColor: '#F6F6F4' }}>
      {/* Main Content */}
      <AnimatePresence mode="wait">
        {currentView === 'feed' && (
          <motion.div
            key="feed"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            {renderFeedView()}
          </motion.div>
        )}

        {currentView === 'lists' && (
          <motion.div
            key="lists"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <ListsView
              lists={mockLists}
              onSelectList={(list) => setSelectedList(list)}
              onCreateList={handleCreateList}
              onEditItem={handleEditItem}
              onDeleteList={handleDeleteList}
              onUpdateList={handleUpdateList}
              onReorderLists={handleReorderLists}
              isRefreshing={isRefreshing}
            />
          </motion.div>
        )}

        {currentView === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <ProfileView
              onBack={() => setCurrentView('feed')}
              isRefreshing={isRefreshing}
              onEditItem={handleEditItem}
              onNavigateToUser={(username) => console.log('Mock: Navigate to user', username)}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Navigation */}
      {renderBottomNav()}

      {/* Add Item Modal */}
      {showModal && (
        <AddItemModal
          lists={mockLists}
          editingItem={editingItem}
          selectedList={selectedList}
          onClose={() => {
            setShowModal(false);
            setEditingItem(null);
            setSelectedList(null);
          }}
          onSave={(selectedLists, item) => {
            console.log('Mock: Save item', { selectedLists, item });
            setShowModal(false);
            setEditingItem(null);
            setSelectedList(null);
          }}
        />
      )}

      {/* Comments Modal */}
      <CommentsModal
        isOpen={showComments}
        onClose={() => setShowComments(false)}
        post={selectedPost}
        onCommentAdded={(postId) => console.log('Mock: Comment added to', postId)}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={showShare}
        onClose={() => setShowShare(false)}
        post={selectedPost}
      />
    </div>
  );
};

export default MainScreen;
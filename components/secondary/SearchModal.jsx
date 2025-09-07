import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, List, User, Search, X, Star } from 'lucide-react';
import { searchUserContent, searchUsers, followUser, unfollowUser } from '../../lib/supabase';

const SearchModal = ({
  isOpen,
  onClose,
  user,
  lists,
  onNavigateToUser,
  onNavigateToList,
  onFollowUser,
  onUnfollowUser,
  followingUsers
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [userResults, setUserResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchTab, setSearchTab] = useState('content'); // 'content' or 'users'
  const searchInputRef = useRef(null);

  // Touch drag state
  const [touchStartY, setTouchStartY] = useState(null);
  const [touchCurrentY, setTouchCurrentY] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setSearchResults([]);
      setUserResults([]);
      setSearchTab('content');
      setIsDragging(false);
      setTouchStartY(null);
      setTouchCurrentY(null);
    }
  }, [isOpen]);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current.focus();
      }, 100);
    }
  }, [isOpen]);

  // Force native keyboard attributes on the search box
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
  }, [isOpen, searchTab]);

  // Perform search
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
          // Exclude current user from results
          const filtered = (data || []).filter((u) => u.id !== user?.id);
          setUserResults(filtered);
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

  const handleSearchResultClick = (result) => {
    // Navigate to appropriate screen based on result type
    if (result.type === 'item') {
      // Find the list and navigate to it
      const targetList = lists.find(list => list.id === result.listId);
      if (targetList) {
        onNavigateToList(targetList);
      }
    } else if (result.type === 'list') {
      // Navigate to specific list
      const targetList = lists.find(list => list.id === result.id);
      if (targetList) {
        onNavigateToList(targetList);
      }
    }
    onClose();
  };

  const handleUserClick = (userData) => {
    onNavigateToUser(userData.username);
    onClose();
  };

  const handleFollowToggle = async (userId, username) => {
    if (followingUsers.has(userId)) {
      await onUnfollowUser(userId, username);
    } else {
      await onFollowUser(userId, username);
    }
  };

  // Touch handlers for drag to close
  const handleTouchStart = (e) => {
    e.preventDefault(); // Prevent scrolling while dragging
    const touch = e.touches[0];
    setTouchStartY(touch.clientY);
    setTouchCurrentY(touch.clientY);
    setIsDragging(true);
  };

  const handleTouchMove = (e) => {
    if (!isDragging) return;
    e.preventDefault(); // Prevent scrolling while dragging
    const touch = e.touches[0];
    setTouchCurrentY(touch.clientY);
  };

  const handleTouchEnd = () => {
    if (!isDragging || touchStartY === null || touchCurrentY === null) {
      setIsDragging(false);
      setTouchStartY(null);
      setTouchCurrentY(null);
      return;
    }

    const swipeDistance = touchCurrentY - touchStartY;
    const swipeThreshold = 100; // Minimum distance to trigger close

    // If swiped down more than threshold, close the sheet
    if (swipeDistance > swipeThreshold) {
      onClose();
    }

    // Reset gesture state
    setIsDragging(false);
    setTouchStartY(null);
    setTouchCurrentY(null);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50"
        onClick={handleBackdropClick}
      >
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/30" />

        {/* Sheet */}
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="absolute inset-x-0 bottom-0 top-[10%] bg-white rounded-t-2xl shadow-xl flex flex-col"
        >
          {/* Grip + Header */}
          <div
            className="p-3 border-b border-gray-100"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div
              className="mx-auto mb-2 h-1 w-10 rounded-full bg-gray-200 cursor-grab active:cursor-grabbing touch-none select-none"
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                transform: isDragging && touchCurrentY !== null && touchStartY !== null
                  ? `translateY(${Math.max(0, touchCurrentY - touchStartY)}px)`
                  : 'translateY(0px)',
                transition: isDragging ? 'none' : 'transform 0.2s ease-out'
              }}
            />
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Search</h3>
              <button
                onClick={onClose}
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
                Products
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
                className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-100 transition-all duration-200"
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
                                      <Star className="w-4 h-4 fill-current" />
                                    </div>
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-900">{result.name}</div>
                                      <div className="text-sm text-gray-500">
                                        in {result.list}
                                        {result.rating && (
                                          <span className="ml-2 flex items-center gap-1">
                                            <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                            <span>{Math.abs(result.rating)}</span>
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
                    {userResults.map((userData) => (
                      <div
                        key={userData.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                      >
                        <button
                          onClick={() => handleUserClick(userData)}
                          className="flex items-center gap-3 flex-1 text-left"
                        >
                          <img
                            src={userData.avatar_url || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"%3E%3C/path%3E%3Ccircle cx="12" cy="7" r="4"%3E%3C/circle%3E%3C/svg%3E'}
                            alt={userData.username}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{userData.username}</div>
                          </div>
                        </button>

                        {userData.id !== user?.id && (
                          <button
                            onClick={() => handleFollowToggle(userData.id, userData.username)}
                            className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                              followingUsers.has(userData.id)
                                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                : 'bg-teal-600 text-white hover:bg-teal-700'
                            }`}
                          >
                            {followingUsers.has(userData.id) ? 'Following' : '+Follow'}
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
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
    
  );
};

export default SearchModal;

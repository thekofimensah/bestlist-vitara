import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import { Plus, MoreHorizontal, Star, X, ArrowLeft, Grid3X3, Share, Trash2, Check } from 'lucide-react';
import ShareModal from './secondary/ShareModal';
import LoadingSpinner from '../ui/LoadingSpinner';
import SmartImage from './secondary/SmartImage';
import { deleteItemAndRelated } from '../lib/supabase';
import { removeProfilePostsByItemIds } from '../hooks/useOptimizedFeed';
import { removeCachedImage } from '../lib/localImageCache';
import { supabase } from '../lib/supabase';
import FirstInWorldBadge from './gamification/FirstInWorldBadge';


const StarRating = ({ rating }) => {
  return (
    <div className="absolute bottom-1 left-1 flex items-center gap-0.5 bg-white bg-opacity-90 backdrop-blur-sm rounded-full px-1.5 py-0.5">
      <span className="text-yellow-500 text-xs">★</span>
      <span className="text-xs font-medium text-gray-700">{rating}</span>
    </div>
  );
};

const ItemTile = ({ 
  item, 
  isAddTile, 
  onTap, 
  onImageTap,
  onLongPress,
  showSelection = false,
  isSelected = false
}) => {
  if (isAddTile) {
    return (
      <div
        onClick={onTap}
        className="flex-shrink-0 w-26 h-26 bg-stone-100 border-2 border-dashed border-gray-300 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-stone-200 transition-colors"
        style={{ width: '200px', height: '200px', backgroundColor: '#F1F1EF' }}
      >
        <Plus className="w-6 h-6 text-gray-500" />
      </div>
    );
  }

  if (!item) return null;

  const verdict = item.is_stay_away ? 'AVOID' : 'LOVE';

  const longPressTimerRef = useRef(null);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  return (
    <div
      className={`flex-shrink-0 relative cursor-pointer group`}
      style={{ width: '200px' }}
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress?.(item, e);
      }}
      onTouchStart={(e) => {
        clearLongPressTimer();
        longPressTimerRef.current = setTimeout(() => {
          // Trigger vibration first
          if (navigator.vibrate) {
            navigator.vibrate(50);
          }
          // Then immediately trigger long press with selection
          onLongPress?.(item, e);
        }, 500);
      }}
      onTouchEnd={clearLongPressTimer}
      onTouchCancel={clearLongPressTimer}
      onTouchMove={clearLongPressTimer}
      onDragStart={(e) => {
        // Prevent drag ghost image
        e.preventDefault();
        return false;
      }}
      onSelectStart={(e) => {
        // Prevent text selection on long press
        e.preventDefault();
        return false;
      }}
      onClick={(e) => {
        e.stopPropagation();
        onTap?.();
      }}
    >
      <div className="relative">
        <SmartImage
          src={item.image_url || item.image}
          alt={item.name}
          className="w-26 h-26 object-cover rounded-2xl shadow-sm group-hover:shadow-md transition-all"
          style={{ width: '200px', height: '200px', userSelect: 'none' }}
          useThumbnail={true}
          size="small"
          lazyLoad={true}
          draggable={false}
          onClick={(e) => {
            e.stopPropagation();
            if (showSelection) {
              onTap?.();
            } else {
              onImageTap?.(item);
            }
          }}
        />
        {showSelection && isSelected && (
          <div className="absolute inset-0 rounded-2xl bg-red-600/20 pointer-events-none" />
        )}
        {item.rating && <StarRating rating={item.rating} />}
        {/* First in World Badge - check for first-in-world achievement */}
        {(item.is_first_in_world || item.first_in_world_achievement_id) && (
          <FirstInWorldBadge 
            achievement={{
              id: item.first_in_world_achievement_id || 'first_in_world',
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
      <div className="mt-2" onClick={(e) => { e.stopPropagation(); onTap?.(); }}>
        <p className="text-xs text-gray-700 font-medium truncate">{item.name}</p>
      </div>
    </div>
  );
};

const ListRow = ({ 
  list, 
  onItemTap,
  onItemImageTap, 
  onItemLongPress,
  selectedIds,
  selectionEnabled,
  onToggleSelectItem,
  onAddItem, 
  onListMenu, 
  onListTitleTap,
  onShareList,
  isReorderMode = false,
  sortMode = 'recent'
}) => {
  const allItems = [...(list.items || []), ...(list.stayAways || [])];
  const mode = list.__sortMode || sortMode;
  const sortedItems = [...allItems].sort((a, b) => {
    if (mode === 'ranking') {
      const ratingA = a.rating || 0;
      const ratingB = b.rating || 0;
      if (ratingB !== ratingA) return ratingB - ratingA;
      const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
      const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
      return dateB - dateA;
    }
    // Default: recent
    const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
    const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
    return dateB - dateA;
  });

  // Wiggle animation for reorder mode
  const wiggleVariants = {
    normal: {
      rotate: 0,
      x: 0,
    },
    wiggle: {
      rotate: [-0.5, 0.5, -0.5, 0.5, 0],
      x: [-1, 1, -1, 1, 0],
      transition: {
        duration: 0.5,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut"
      }
    }
  };

  return (
    <motion.div 
      className="mb-6"
      variants={wiggleVariants}
      animate={isReorderMode ? "wiggle" : "normal"}
      layout
    >
      {/* List Header */}
      <div className="flex items-center justify-between mb-3 px-6">
        {/* Drag Handle - only visible in reorder mode */}
        <AnimatePresence>
          {isReorderMode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className="w-6 h-6 flex items-center justify-center text-gray-400 mr-2 cursor-grab active:cursor-grabbing"
            >
              <Grid3X3 className="w-4 h-4" />
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={() => !isReorderMode && onListTitleTap(list)}
          className="flex-1 text-left"
          disabled={isReorderMode}
        >
          <h3 className="text-base font-medium text-gray-900">{list.name}</h3>
          <p className="text-xs text-gray-500">{allItems.length} items</p>
        </button>
        
        {!isReorderMode && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onShareList(list)}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              <Share className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => onListMenu(list, e)}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Horizontal Scroll Container - disabled in reorder mode */}
      <div className={`overflow-x-auto ${isReorderMode ? 'pointer-events-none opacity-60' : ''}`}>
        <div className="flex gap-3 px-6" style={{ paddingRight: '24px' }}>
          {sortedItems.map((item) => (
            <ItemTile
              key={item.id}
              item={item}
              onTap={() => (selectionEnabled ? onToggleSelectItem(item) : onItemTap(item))}
              onImageTap={onItemImageTap}
              onLongPress={onItemLongPress}
              showSelection={selectionEnabled}
              isSelected={selectedIds?.includes(item.id)}
            />
          ))}
          <ItemTile
            isAddTile
            onTap={() => onAddItem(list.id)}
          />
        </div>
      </div>
    </motion.div>
  );
};

const ListsView = ({ lists, onSelectList, onCreateList, onEditItem, onViewItemDetail, onReorderLists, isRefreshing = false, onDeleteList, onUpdateList, onItemDeleted, onNavigateToCamera }) => {
  const [showNewListDialog, setShowNewListDialog] = useState(false);
  const [isCreatingList, setIsCreatingList] = useState(false);
  // New list composer state (Best only)
  const [newListSubject, setNewListSubject] = useState('');
  const [newListLocation, setNewListLocation] = useState('');
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [reorderedLists, setReorderedLists] = useState(lists);
  const [shareModal, setShareModal] = useState({ isOpen: false, list: null });
  // (Simplified) No dynamic prefix measurement needed
  const scrollContainerRef = useRef(null);
  const savedScrollPosition = useRef(0);
  const hasScrolled = useRef(false);
  const [contextMenu, setContextMenu] = useState({ isOpen: false, listId: null, x: 0, y: 0 });
  const [renameDialog, setRenameDialog] = useState({ isOpen: false, list: null, newName: '' });
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false, list: null });
  // Multi-select state for bulk deletion across the overview page
  const [selectionEnabled, setSelectionEnabled] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState([]);
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState({ isOpen: false });

  // Update reordered lists when lists prop changes
  useEffect(() => {
    setReorderedLists(lists);
  }, [lists]);

  // Restore scroll position on mount, but only if user has scrolled before
  useEffect(() => {
    if (scrollContainerRef.current) {
      if (hasScrolled.current) {
        scrollContainerRef.current.scrollTop = savedScrollPosition.current;
      } else {
        // First time - ensure we're at the top
        scrollContainerRef.current.scrollTop = 0;
      }
    }
  }, [lists]);

  // Save scroll position when scrolling
  const handleScroll = (e) => {
    savedScrollPosition.current = e.target.scrollTop;
    if (e.target.scrollTop > 50) { // Consider scrolled if more than 50px
      hasScrolled.current = true;
    }
  };

  // Click-away to cancel selection mode when interacting outside the lists view
  useEffect(() => {
    if (!selectionEnabled) return;
    const handleClickAway = (event) => {
      if (scrollContainerRef.current && !scrollContainerRef.current.contains(event.target)) {
        setSelectionEnabled(false);
        setSelectedItemIds([]);
      }
    };
    document.addEventListener('click', handleClickAway, true);
    return () => document.removeEventListener('click', handleClickAway, true);
  }, [selectionEnabled]);

  const handleItemTap = (item) => {
    // Open AddItemModal for editing by finding the parent list
    const parentList = lists?.find(list => 
      [...(list.items || []), ...(list.stayAways || [])].some(listItem => listItem.id === item.id)
    );
    if (parentList && onEditItem) {
      onEditItem(item, parentList);
    }
  };

  const handleItemLongPress = (item) => {
    if (!selectionEnabled) {
      // Enable selection mode and immediately select the item that was long-pressed
      setSelectionEnabled(true);
      setSelectedItemIds([item.id]);
    } else {
      // If already in selection mode, toggle the item
      setSelectedItemIds(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]);
    }
  };

  const handleToggleSelectItem = (item) => {
    if (!selectionEnabled) return;
    setSelectedItemIds(prev => {
      const next = prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id];
      if (next.length === 0) {
        // Auto-cancel selection mode when none selected
        setSelectionEnabled(false);
      }
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (!selectionEnabled || selectedItemIds.length === 0) return;
    try {
      const errors = [];
      const deletedItemIds = [];
      
      for (const id of selectedItemIds) {
        const { error } = await deleteItemAndRelated(id);
        if (error) {
          errors.push({ id, error });
        } else {
          deletedItemIds.push(id);
          // Remove locally cached image for this item if present
          try {
            const item = lists?.flatMap(l => [...(l.items||[]), ...(l.stayAways||[])]).find(it => it.id === id);
            if (item?.image_url) await removeCachedImage(item.image_url);
          } catch (_) {}
        }
      }
      
      // Optimistic update of data in view
      setReorderedLists(prev => prev.map(l => ({
        ...l,
        items: (l.items || []).filter(it => !selectedItemIds.includes(it.id)),
        stayAways: (l.stayAways || []).filter(it => !selectedItemIds.includes(it.id))
      })));
      
      // Notify parent that items were deleted (for feed refresh)
      if (deletedItemIds.length > 0 && onItemDeleted) {
        console.log('🗑️ [ListsView] Notifying parent of deleted items:', deletedItemIds);
        onItemDeleted(deletedItemIds);
      }

      // Remove posts from profile cache for current user
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && deletedItemIds.length > 0) {
          removeProfilePostsByItemIds(user.id, deletedItemIds);
        }
      } catch (_) {}
      
      if (errors.length > 0) {
        console.error('Some deletions failed:', JSON.stringify(errors, null, 2));
        const firstMsg = errors[0]?.error?.message || errors[0]?.error || 'Unknown error';
        alert(`Failed to delete ${errors.length} item(s). First error: ${firstMsg}`);
      }
    } catch (error) {
      console.error('Error deleting selected items:', error);
      alert('Failed to delete selected items. Please try again.');
    } finally {
      setSelectedItemIds([]);
      setSelectionEnabled(false);
    }
  };

  const handleItemImageTap = (item) => {
    // Open AddItemModal for editing by finding the parent list
    const parentList = lists?.find(list => 
      [...(list.items || []), ...(list.stayAways || [])].some(listItem => listItem.id === item.id)
    );
    if (parentList && onEditItem) {
      onEditItem(item, parentList);
    }
  };

  const handleAddItem = (listId) => {
    // Go to main screen (camera/home) when adding a new item from overview
    if (typeof onNavigateToCamera === 'function') {
      onNavigateToCamera(listId);
      return;
    }
    // Fallback: navigate to list detail
    const targetList = lists?.find(list => list.id === listId);
    if (targetList && typeof onSelectList === 'function') onSelectList(targetList);
  };

  const handleListMenu = (list, event) => {
    event.stopPropagation();
    
    // Get viewport dimensions
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Approximate menu dimensions (adjust based on your menu size)
    const menuWidth = 160;
    const menuHeight = 96; // Approximate height for 2 menu items
    
    // Calculate position, adjusting if menu would go off-screen
    let x = event.pageX;
    let y = event.pageY;
    
    // Adjust horizontal position if menu would overflow right edge
    if (x + menuWidth > viewportWidth) {
      x = viewportWidth - menuWidth - 16; // 16px padding from edge
    }
    
    // Adjust vertical position if menu would overflow bottom edge
    if (y + menuHeight > viewportHeight) {
      y = event.pageY - menuHeight; // Position above the click point
    }
    
    // Ensure menu doesn't go off the left or top edges
    x = Math.max(16, x); // 16px minimum padding from left edge
    y = Math.max(16, y); // 16px minimum padding from top edge
    
    setContextMenu({
      isOpen: true,
      listId: list.id,
      x: x,
      y: y,
      sortMode: 'recent'
    });
  };

  const handleShareList = (list) => {
    // Prepare list data for sharing
    const listWithUserData = {
      ...list,
      itemCount: [...(list.items || []), ...(list.stayAways || [])].length,
      user: { name: 'You' } // You could get this from user context
    };
    setShareModal({ isOpen: true, list: listWithUserData });
  };

  const handleCloseShare = () => {
    setShareModal({ isOpen: false, list: null });
  };

  const handleListTitleTap = (list) => {
    // Navigate to single list view
    if (onSelectList) {
      onSelectList(list);
    }
  };

  const handleCreateList = async () => {
    if (isCreatingList) return;
    const subject = newListSubject.trim();
    if (!subject || !onCreateList) return;
    setIsCreatingList(true);
    const location = newListLocation.trim();
    const prefix = 'The best';
    const name = location ? `${prefix} ${subject} in ${location}` : `${prefix} ${subject}`;
    try {
      await onCreateList(name, '#1F6D5A');
      setShowNewListDialog(false);
      setNewListSubject('');
      setNewListLocation('');
    } finally {
      setIsCreatingList(false);
    }
  };

  const handleEnterReorderMode = () => {
    setIsReorderMode(true);
    // Add haptic feedback if available
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  };

  const handleExitReorderMode = () => {
    setIsReorderMode(false);
    // Save the new order if it changed
    if (onReorderLists && JSON.stringify(reorderedLists) !== JSON.stringify(lists)) {
      onReorderLists(reorderedLists);
    }
  };

  const handleRenameList = async () => {
    if (renameDialog.list && renameDialog.newName.trim()) {
      await onUpdateList(renameDialog.list.id, { name: renameDialog.newName.trim() });
      setRenameDialog({ isOpen: false, list: null, newName: '' });
    }
  };

  const handleDeleteList = async () => {
    if (deleteDialog.list) {
      await onDeleteList(deleteDialog.list.id);
      setDeleteDialog({ isOpen: false, list: null });
    }
  };

  const handleReorder = (newOrder) => {
    setReorderedLists(newOrder);
  };

  return (
    <div 
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="h-screen bg-stone-50 overflow-y-auto" 
      style={{ backgroundColor: '#F6F6F4' }}
    >
      {/* Content */}
      <div className="pb-32">
        {(!lists || lists.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <button
              onClick={() => setShowNewListDialog(true)}
              className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-4 shadow-sm hover:shadow-md transition-shadow"
              disabled={isRefreshing}
            >
              <Plus className="w-10 h-10 text-gray-400" />
            </button>
            <p className="text-gray-600">
              {isRefreshing ? 'Loading your lists...' : 'Create your first list'}
            </p>
          </div>
        ) : (
          <>
            {/* Header with reorder button */}
            <div className="flex items-center justify-between px-6 pt-4 pb-2">
              <h2 className="text-xl font-semibold text-gray-900">
                Your Lists
              </h2>
              <div className="flex items-center gap-2">
                {isReorderMode ? (
                  <button
                    onClick={handleExitReorderMode}
                    className="px-4 py-2 bg-teal-700 text-white rounded-full text-sm font-medium"
                    style={{ backgroundColor: '#1F6D5A' }}
                  >
                    Done
                  </button>
                ) : (
                  <>
                    {!selectionEnabled && (
                      <button
                        onClick={handleEnterReorderMode}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                        title="Reorder lists"
                        disabled={isRefreshing}
                      >
                    <Grid3X3 className="w-4 h-4" />
                      </button>
                    )}
                    {selectionEnabled && (
                      <>
                        <button
                          onClick={() => { setSelectionEnabled(false); setSelectedItemIds([]); }}
                          className="px-3 py-1.5 bg-gray-100 rounded-full text-sm"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => setBulkDeleteDialog({ isOpen: true })}
                          disabled={selectedItemIds.length === 0}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-full text-sm disabled:opacity-50"
                        >
                          <div className="flex items-center gap-2">
                            <Trash2 className="w-4 h-4" />
                            <span>Delete ({selectedItemIds.length})</span>
                          </div>
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            <div className="pt-2">
              {isReorderMode ? (
                <Reorder.Group
                  axis="y"
                  values={reorderedLists}
                  onReorder={handleReorder}
                  className="space-y-0"
                >
                  {(reorderedLists || []).map((list) => (
                    <Reorder.Item
                      key={list.id}
                      value={list}
                      className="cursor-grab active:cursor-grabbing"
                      whileDrag={{ 
                        scale: 1.02,
                        zIndex: 1000,
                        boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                        backgroundColor: "rgba(255,255,255,0.95)"
                      }}
                      dragElastic={0}
                    >
                      <ListRow
                        list={list}
                        onItemTap={handleItemTap}
                        onItemImageTap={handleItemImageTap}
                        onItemLongPress={handleItemLongPress}
                        selectedIds={selectedItemIds}
                        selectionEnabled={selectionEnabled}
                        onToggleSelectItem={handleToggleSelectItem}
                        onAddItem={handleAddItem}
                        onListMenu={handleListMenu}
                        onListTitleTap={handleListTitleTap}
                        onShareList={handleShareList}
                        isReorderMode={isReorderMode}
                      />
                    </Reorder.Item>
                  ))}
                </Reorder.Group>
              ) : (
                <div>
                  {(reorderedLists || []).map((list) => (
                    <ListRow
                      key={list.id}
                      list={list}
                      onItemTap={handleItemTap}
                      onItemImageTap={handleItemImageTap}
                      onItemLongPress={handleItemLongPress}
                      selectedIds={selectedItemIds}
                      selectionEnabled={selectionEnabled}
                      onToggleSelectItem={handleToggleSelectItem}
                      onAddItem={handleAddItem}
                      onListMenu={handleListMenu}
                      onListTitleTap={handleListTitleTap}
                      onShareList={handleShareList}
                      isReorderMode={isReorderMode}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Floating New List Button - hidden in reorder mode */}
            <AnimatePresence>
              {!isReorderMode && (
                <motion.button
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  onClick={() => setShowNewListDialog(true)}
                  className="fixed bottom-24 right-6 w-14 h-14 bg-teal-700 rounded-full flex items-center justify-center shadow-lg z-20"
                  style={{ backgroundColor: '#1F6D5A' }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Plus className="w-6 h-6 text-white" />
                </motion.button>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {/* New List Dialog (simple, matches AddItemModal) */}
      {showNewListDialog && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-20 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Create List</h3>
            <div className="space-y-4">
              <div className="flex items-baseline whitespace-nowrap border-2 border-teal-100 rounded-2xl focus-within:border-teal-400 focus-within:bg-teal-50/30 transition-all duration-200">
                <span className="pl-4 pr-1 text-base text-gray-700">The best</span>
                <input
                  type="text"
                  value={newListSubject}
                  onChange={(e) => setNewListSubject(e.target.value.toLowerCase())}
                  onKeyDown={(e) => { if (e.key === 'Enter' && newListSubject.trim()) handleCreateList(); }}
                  placeholder="What are you ranking?"
                  className="flex-1 min-w-0 pr-4 py-3 border-none outline-none bg-transparent text-base font-medium"
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
              <div className="flex items-baseline whitespace-nowrap border border-gray-200 rounded-xl bg-gray-50/50 focus-within:border-gray-300">
                <span className="pl-4 pr-1 text-sm text-gray-700 italic">in</span>
                <input
                  type="text"
                  value={newListLocation}
                  onChange={(e) => setNewListLocation(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && newListSubject.trim()) handleCreateList(); }}
                  placeholder="location"
                  className="flex-1 min-w-0 pr-4 py-2.5 border-none outline-none bg-transparent text-sm text-gray-600 italic"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <div className="pr-3 text-xs text-gray-400">Optional</div>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowNewListDialog(false);
                  setNewListSubject('');
                  setNewListLocation('');
                }}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-2xl font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateList}
                disabled={!newListSubject.trim() || isCreatingList}
                className="flex-1 px-4 py-3 bg-teal-700 text-white rounded-2xl font-medium disabled:opacity-50"
                style={{ backgroundColor: '#1F6D5A' }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModal.isOpen}
        onClose={handleCloseShare}
        list={shareModal.list}
      />

      {/* Item Context Menu removed; long-press now enables multi-select */}

      {/* Context Menu */}
      {contextMenu.isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setContextMenu({ ...contextMenu, isOpen: false })}
          />
          <div 
            className="fixed bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            {/* Sort options */}
            {(() => {
              const l = lists?.find(l => l.id === contextMenu.listId);
              const currentMode = (l?.__sortMode || 'recent');
              return (
                <>
                  <button
                    onClick={() => {
                      const listToUpdate = lists?.find(l => l.id === contextMenu.listId);
                      if (!listToUpdate) return;
                      listToUpdate.__sortMode = 'recent';
                      setReorderedLists(prev => prev.map(l => l.id === listToUpdate.id ? { ...l, __sortMode: 'recent' } : l));
                      setContextMenu({ isOpen: false, listId: null, x: 0, y: 0 });
                    }}
                    className="w-full px-4 py-3 text-left text-sm font-medium hover:bg-gray-50 flex items-center gap-3"
                  >
                    <span className="flex-1 text-gray-900">Sort by Recent</span>
                    {currentMode === 'recent' && <Check className="w-4 h-4 text-teal-600" />}
                  </button>
                  <button
                    onClick={() => {
                      const listToUpdate = lists?.find(l => l.id === contextMenu.listId);
                      if (!listToUpdate) return;
                      listToUpdate.__sortMode = 'ranking';
                      setReorderedLists(prev => prev.map(l => l.id === listToUpdate.id ? { ...l, __sortMode: 'ranking' } : l));
                      setContextMenu({ isOpen: false, listId: null, x: 0, y: 0 });
                    }}
                    className="w-full px-4 py-3 text-left text-sm font-medium hover:bg-gray-50 flex items-center gap-3"
                  >
                    <span className="flex-1 text-gray-900">Sort by Rating</span>
                    {currentMode === 'ranking' && <Check className="w-4 h-4 text-teal-600" />}
                  </button>
                  <div className="h-px bg-gray-100 my-1" />
                </>
              );
            })()}
            <button
              onClick={() => {
                const listToRename = lists?.find(l => l.id === contextMenu.listId);
                setRenameDialog({ isOpen: true, list: listToRename, newName: listToRename?.name || '' });
                setContextMenu({ isOpen: false, listId: null, x: 0, y: 0 });
              }}
              className="w-full px-4 py-3 text-left text-sm font-medium text-gray-900 hover:bg-gray-50 flex items-center gap-3"
            >
              Rename
            </button>
            <button
              onClick={() => {
                const listToDelete = lists?.find(l => l.id === contextMenu.listId);
                setDeleteDialog({ isOpen: true, list: listToDelete });
                setContextMenu({ isOpen: false, listId: null, x: 0, y: 0 });
              }}
              className="w-full px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-3"
            >
              Delete
            </button>
          </div>
        </>
      )}

      {/* Rename List Dialog */}
      {renameDialog.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Rename List</h3>
            <input
              type="text"
              value={renameDialog.newName}
              onChange={(e) => setRenameDialog({ ...renameDialog, newName: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:border-teal-700 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setRenameDialog({ isOpen: false, list: null, newName: '' })} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-2xl font-medium">Cancel</button>
              <button onClick={handleRenameList} disabled={!renameDialog.newName.trim()} className="flex-1 px-4 py-3 bg-teal-700 text-white rounded-2xl font-medium disabled:opacity-50">Rename</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete List Confirmation */}
      {deleteDialog.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete List?</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete "{deleteDialog.list?.name}"?
              <br />
              <br />
              All items in this list will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteDialog({ isOpen: false, list: null })} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-2xl font-medium">Cancel</button>
              <button onClick={handleDeleteList} className="flex-1 px-4 py-3 bg-red-600 text-white rounded-2xl font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation */}
      {bulkDeleteDialog.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Items?</h3>
            <p className="text-gray-600 mb-4">Delete {selectedItemIds.length} selected item(s)? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setBulkDeleteDialog({ isOpen: false })} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-2xl font-medium">Cancel</button>
              <button onClick={() => { setBulkDeleteDialog({ isOpen: false }); handleBulkDelete(); }} className="flex-1 px-4 py-3 bg-red-600 text-white rounded-2xl font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListsView;
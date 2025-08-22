import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MoreHorizontal, Search, X, Star, Plus, Trash2, Share } from 'lucide-react';
import AddItemModal from '../AddItemModal';
import ShareModal from './ShareModal';
import SmartImage from './SmartImage';
import { deleteItemAndRelated } from '../../lib/supabase';
import { removeProfilePostsByItemIds } from '../../hooks/useOptimizedFeed';
import { removeCachedImage } from '../../lib/localImageCache';
import { supabase } from '../../lib/supabase';

const VerdictBadge = ({ verdict }) => {
  const getVerdictStyle = () => {
    switch (verdict) {
      case 'AVOID':
        return 'bg-red-50 text-red-700 border-red-100';
      case 'KEEP':
        return 'bg-yellow-50 text-yellow-700 border-yellow-100';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  return (
    <span className={`absolute top-1 right-1 px-1.5 py-0.5 rounded-full text-xs font-medium border ${getVerdictStyle()}`}>
      {verdict}
    </span>
  );
};

const StarRating = ({ rating }) => {
  if (!rating) return null;
  
  return (
    <div className="absolute bottom-1 left-1 flex items-center gap-0.5 bg-white bg-opacity-90 backdrop-blur-sm rounded-full px-1.5 py-0.5">
      <Star className="w-3 h-3 text-yellow-500 fill-current" />
      <span className="text-xs font-medium text-gray-700">{Math.abs(rating)}</span>
    </div>
  );
};

const ItemTile = ({ 
  item, 
  isSelected, 
  onTap, 
  onLongPress,
  showSelection = false 
}) => {
  const verdict = item.is_stay_away ? 'AVOID' : 'KEEP';
  const longPressTimerRef = useRef(null);

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  return (
    <div
      onClick={onTap}
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress?.(e);
      }}
      onTouchStart={(e) => {
        clearLongPressTimer();
        longPressTimerRef.current = setTimeout(() => {
          onLongPress?.(e);
        }, 500);
      }}
      onTouchEnd={clearLongPressTimer}
      onTouchCancel={clearLongPressTimer}
      onTouchMove={clearLongPressTimer}
      className={`relative cursor-pointer group`}
    >
      <div className={`relative`}>
        <SmartImage
          src={item.image_url || item.image}
          alt={item.name}
          className="w-full aspect-square object-cover rounded-2xl shadow-sm group-hover:shadow-md transition-shadow"
          useThumbnail={true}
          size="medium"
          lazyLoad={true}
          onClick={(e) => {
            e.stopPropagation();
            if (showSelection) {
              onTap?.();
            }
          }}
        />
        {showSelection && isSelected && (
          <div className="absolute inset-0 rounded-2xl bg-red-600/20 pointer-events-none" />
        )}
        <VerdictBadge verdict={verdict} />
        <StarRating rating={item.rating} />
        
        {/* Selection indicator */}
        {/* visible already above */}
      </div>
      <div className="mt-2">
        <p className="text-sm text-gray-700 font-medium truncate">{item.name}</p>
        {item.notes && (
          <p className="text-xs text-gray-500 truncate mt-1">{item.notes}</p>
        )}
      </div>
    </div>
  );
};

const ShowItemsInListView = ({ 
  list, 
  onBack, 
  onAddItem, 
  onEditItem, 
  refreshList,
  onDeleteList,
  onUpdateList,
  onNavigateToCamera,
  onItemDeleted
}) => {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('Newest');
  const [filterBy, setFilterBy] = useState('All');
  const [selectedItems, setSelectedItems] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [shareModal, setShareModal] = useState({ isOpen: false, list: null });
  const [listMenu, setListMenu] = useState({ isOpen: false, x: 0, y: 0 });
  const [renameDialog, setRenameDialog] = useState({ isOpen: false, newName: '' });
  const [deleteDialog, setDeleteDialog] = useState({ isOpen: false });
  const [bulkDeleteDialog, setBulkDeleteDialog] = useState({ isOpen: false });
  const containerRef = useRef(null);

  // Combine all items
  const allItems = [
    ...(list.items || []).map(item => ({ ...item, is_stay_away: false })),
    ...(list.stayAways || []).map(item => ({ ...item, is_stay_away: true }))
  ];

  // Sort options
  const sortOptions = ['Newest', 'Oldest', 'Top Rated', 'Name A-Z'];
  const filterOptions = ['All', 'KEEP', 'AVOID'];

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = allItems;

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    // Apply verdict filter
    if (filterBy !== 'All') {
      filtered = filtered.filter(item => {
        const verdict = item.is_stay_away ? 'AVOID' : 'KEEP';
        return verdict === filterBy;
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'Oldest':
          return new Date(a.created_at) - new Date(b.created_at);
        case 'Top Rated':
          return (Math.abs(b.rating) || 0) - (Math.abs(a.rating) || 0);
        case 'Name A-Z':
          return a.name.localeCompare(b.name);
        case 'Newest':
        default:
          return new Date(b.created_at) - new Date(a.created_at);
      }
    });

    return filtered;
  }, [allItems, searchQuery, sortBy, filterBy]);

  // Click-away to cancel selection mode when interacting outside the view
  useEffect(() => {
    if (selectedItems.length === 0) return;
    const handleClickAway = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setSelectedItems([]);
      }
    };
    document.addEventListener('click', handleClickAway, true);
    return () => document.removeEventListener('click', handleClickAway, true);
  }, [selectedItems.length]);

  // Calculate counts
  // const favoriteItems = allItems.filter(item => !item.is_stay_away);
  // const avoidItems = allItems.filter(item => item.is_stay_away);

  const handleItemTap = (item) => {
    if (selectedItems.length > 0) {
      // Selection mode - toggle selection
      setSelectedItems(prev => {
        if (prev.includes(item.id)) {
          return prev.filter(id => id !== item.id);
        } else {
          return [...prev, item.id];
        }
      });
    } else {
      // Normal mode - open item detail or edit
      if (onEditItem) {
        onEditItem(item, list);
      }
    }
  };

  const handleItemLongPress = (item) => {
    if (selectedItems.length === 0) {
      setSelectedItems([item.id]);
    } else {
      // Toggle selection in selection mode
      setSelectedItems(prev => prev.includes(item.id) ? prev.filter(id => id !== item.id) : [...prev, item.id]);
    }
  };

  const handleDeleteSelected = async () => {
    const itemsToDelete = [...selectedItems]; // Copy the IDs
    
    try {
      // 🚀 IMMEDIATE UI UPDATE: Clear selection and refresh list for better UX
      setSelectedItems([]);
      
      if (refreshList) {
        refreshList();
      }
      
      console.log('🚀 [ShowItemsInListView] Items removed from UI, deleting in background...');
      
      // ⚡ Background deletion - don't block UI
      const errors = [];
      const deletedItemIds = [];
      
      for (const itemId of itemsToDelete) {
        try {
          const { error } = await deleteItemAndRelated(itemId);
          if (error) {
            errors.push({ itemId, error });
          } else {
            deletedItemIds.push(itemId);
            // Remove locally cached image for this item if present
            try {
              const item = allItems.find(i => i.id === itemId);
              if (item?.image_url) await removeCachedImage(item.image_url);
            } catch (_) {}
          }
        } catch (deleteError) {
          errors.push({ itemId, error: deleteError });
        }
      }
      
      // Handle successful deletions
      if (deletedItemIds.length > 0) {
        // Notify parent for background refresh (won't block UI)
        if (onItemDeleted) {
          console.log('🗑️ [ShowItemsInListView] Notifying parent of deleted items:', deletedItemIds);
          onItemDeleted(deletedItemIds);
        }
        
        // Remove posts from profile cache for current user
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            removeProfilePostsByItemIds(user.id, deletedItemIds);
          }
        } catch (_) {}
      }
      
      // Handle errors (items were already removed from UI)
      if (errors.length > 0) {
        console.error('Some deletions failed:', JSON.stringify(errors, null, 2));
        const firstMsg = errors[0]?.error?.message || errors[0]?.error || 'Unknown error';
        alert(`${errors.length} item(s) failed to delete from database but were removed from view. They may reappear on refresh.`);
      }
      
      console.log('✅ [ShowItemsInListView] Background deletion completed');
      
    } catch (error) {
      console.error('Error deleting items:', JSON.stringify({
          message: error.message,
          name: error.name,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        }, null, 2));
      alert('Items were removed from view but deletion may have failed.');
    }
  };

  const handleEditItem = (item) => {
    if (onEditItem) {
      onEditItem(item, list);
    }
  };

  const handleRemoveItem = async (item) => {
    try {
      const confirmDelete = window.confirm('Remove this item from the list?');
      if (!confirmDelete) return;
      
      // 🚀 IMMEDIATE UI UPDATE: Refresh list immediately for better UX
      if (refreshList) {
        refreshList();
      }
      
      console.log('🚀 [ShowItemsInListView] Item removed from UI, deleting in background...');
      
      // ⚡ Background deletion - don't block UI
      const { error } = await deleteItemAndRelated(item.id);
      if (error) {
        console.error('Failed to remove item:', error);
        // Item was already removed from UI, inform user about background failure
        alert('Item was removed from view but may not have been deleted from database. It may reappear on refresh.');
        return;
      }
      
      // Notify parent for background feed refresh (won't block UI)
      if (onItemDeleted) {
        console.log('🗑️ [ShowItemsInListView] Notifying parent of deleted item:', item.id);
        onItemDeleted([item.id]);
      }
      
      console.log('✅ [ShowItemsInListView] Background deletion completed');
      
    } catch (error) {
      console.error('Error removing item:', JSON.stringify({
          message: error.message,
          name: error.name,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        }, null, 2));
      alert('Item was removed from view but deletion may have failed.');
    }
  };

  const clearSelection = () => {
    setSelectedItems([]);
  };

  const handleRenameList = async () => {
    if (renameDialog.newName.trim()) {
      await onUpdateList(list.id, { name: renameDialog.newName.trim() });
      setRenameDialog({ isOpen: false, newName: '' });
    }
  };

  const handleDeleteList = async () => {
    await onDeleteList(list.id);
    onBack(); // Go back to lists view after deleting
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-stone-50" style={{ backgroundColor: '#F6F6F4' }}>
      {/* Header */}
      <div className="sticky top-0 bg-stone-50 z-20 pt-8 pb-4" style={{ backgroundColor: '#F6F6F4' }}>
        <div className="px-4 flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={selectedItems.length > 0 ? clearSelection : onBack}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const listWithUserData = {
                  ...list,
                  itemCount: allItems.length,
                  user: { name: 'You' }
                };
                setShareModal({ isOpen: true, list: listWithUserData });
              }}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm"
            >
              <Share className="w-5 h-5 text-gray-700" />
            </button>
            <button 
              onClick={(e) => setListMenu({ isOpen: true, x: e.pageX, y: e.pageY })}
              className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm"
            >
              <MoreHorizontal className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        {showSearch && (
          <div className="px-4 mb-4">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search items..."
                className="w-full pl-10 pr-10 py-3 bg-white border border-gray-200 rounded-2xl focus:outline-none focus:border-teal-700"
                autoFocus
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

        {/* Sort and Filter Pills */}
        <div className="px-4">
          <div className="flex gap-2 overflow-x-auto pb-2">
            {!showSearch && (
              <button
                onClick={() => setShowSearch(true)}
                className="flex-shrink-0 px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Search className="w-4 h-4" />
              </button>
            )}
            
            {/* Sort Pills */}
            {sortOptions.map((option) => (
              <button
                key={option}
                onClick={() => setSortBy(option)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  sortBy === option
                    ? 'bg-teal-700 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
                style={{ backgroundColor: sortBy === option ? '#1F6D5A' : undefined }}
              >
                {option}
              </button>
            ))}

            {/* Filter Pills */}
            {filterOptions.map((option) => (
              <button
                key={option}
                onClick={() => setFilterBy(option)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  filterBy === option
                    ? 'bg-teal-700 text-white'
                    : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                }`}
                style={{ backgroundColor: filterBy === option ? '#1F6D5A' : undefined }}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Items Grid */}
      <div className="px-4 pb-28">
        {filteredAndSortedItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            {!searchQuery.trim() && (
              <button
                onClick={() => onNavigateToCamera ? onNavigateToCamera() : setShowAddModal(true)}
                className="px-6 py-3 bg-teal-700 text-white rounded-full font-medium"
                style={{ backgroundColor: '#1F6D5A' }}
              >
                Add First Item
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {filteredAndSortedItems.map((item) => (
              <ItemTile
                key={item.id}
                item={item}
                isSelected={selectedItems.includes(item.id)}
                onTap={() => handleItemTap(item)}
                onLongPress={() => handleItemLongPress(item)}
                showSelection={selectedItems.length > 0}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Delete + Cancel when items selected */}
      {selectedItems.length > 0 && (
        <div className="fixed bottom-24 right-6 z-20 flex items-center gap-2">
          <button
            onClick={() => setSelectedItems([])}
            className="px-4 py-3 bg-white rounded-full shadow border text-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={() => setBulkDeleteDialog({ isOpen: true })}
            className="px-4 py-3 bg-red-600 text-white rounded-full shadow flex items-center gap-2"
          >
            <Trash2 className="w-5 h-5" />
            Delete ({selectedItems.length})
          </button>
        </div>
      )}

      {/* Floating Add Button (when not in select mode) */}
      {selectedItems.length === 0 && (
        <button
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-24 right-6 w-14 h-14 bg-teal-700 rounded-full flex items-center justify-center shadow-lg z-20"
          style={{ backgroundColor: '#1F6D5A' }}
        >
          <Plus className="w-6 h-6 text-white" />
        </button>
      )}

      {/* Item context menu removed; long-press now enables multi-select */}

      {/* Add Item Modal */}
      {showAddModal && (
        <AddItemModal
          lists={[list]}
          onClose={() => setShowAddModal(false)}
          onSave={(selectedLists, item) => {
            if (onAddItem) {
              onAddItem(selectedLists, item);
            }
            setShowAddModal(false);
          }}
        />
      )}

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModal.isOpen}
        onClose={() => setShareModal({ isOpen: false, list: null })}
        list={shareModal.list}
      />

      {/* List Context Menu */}
      {listMenu.isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => setListMenu({ ...listMenu, isOpen: false })}
          />
          <div 
            className="fixed bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50"
            style={{ left: listMenu.x, top: listMenu.y, transform: 'translateX(-100%)' }}
          >
            <button
              onClick={() => {
                setRenameDialog({ isOpen: true, newName: list.name });
                setListMenu({ isOpen: false, x: 0, y: 0 });
              }}
              className="w-full px-4 py-3 text-left text-sm font-medium text-gray-900 hover:bg-gray-50 flex items-center gap-3"
            >
              Rename
            </button>
            <button
              onClick={() => {
                setDeleteDialog({ isOpen: true });
                setListMenu({ isOpen: false, x: 0, y: 0 });
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
              <button onClick={() => setRenameDialog({ isOpen: false, newName: '' })} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-2xl font-medium">Cancel</button>
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
            <p className="text-gray-600 mb-4">Are you sure you want to delete "{list.name}"? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteDialog({ isOpen: false })} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-2xl font-medium">Cancel</button>
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
            <p className="text-gray-600 mb-4">Delete {selectedItems.length} selected item(s)? This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setBulkDeleteDialog({ isOpen: false })} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-2xl font-medium">Cancel</button>
              <button onClick={() => { setBulkDeleteDialog({ isOpen: false }); handleDeleteSelected(); }} className="flex-1 px-4 py-3 bg-red-600 text-white rounded-2xl font-medium">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShowItemsInListView;
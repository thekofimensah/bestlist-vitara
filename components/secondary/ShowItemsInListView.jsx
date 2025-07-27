import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MoreHorizontal, Search, X, Star, Plus, Trash2, Edit3, Share } from 'lucide-react';
import AddItemModal from '../AddItemModal';
import ShareModal from './ShareModal';
import { deleteItemFromList } from '../../lib/supabase';

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

  return (
    <div
      onClick={onTap}
      onContextMenu={(e) => {
        e.preventDefault();
        onLongPress?.();
      }}
      className={`relative cursor-pointer group ${
        isSelected ? 'ring-2 ring-teal-500' : ''
      }`}
    >
      <div className="relative">
        <img
          src={item.image_url || item.image}
          alt={item.name}
          className="w-full aspect-square object-cover rounded-2xl shadow-sm group-hover:shadow-md transition-shadow"
        />
        <VerdictBadge verdict={verdict} />
        <StarRating rating={item.rating} />
        
        {/* Selection indicator */}
        {showSelection && isSelected && (
          <div className="absolute top-2 left-2 w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-full"></div>
          </div>
        )}
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
  refreshList 
}) => {
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('Newest');
  const [filterBy, setFilterBy] = useState('All');
  const [selectedItems, setSelectedItems] = useState([]);
  const [showContextMenu, setShowContextMenu] = useState(null);
  const [contextMenuPosition, setContextMenuPosition] = useState({ x: 0, y: 0 });
  const [showAddModal, setShowAddModal] = useState(false);
  const [shareModal, setShareModal] = useState({ isOpen: false, list: null });

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

  // Calculate counts
  const favoriteItems = allItems.filter(item => !item.is_stay_away);
  const avoidItems = allItems.filter(item => item.is_stay_away);

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

  const handleItemLongPress = (item, event) => {
    if (selectedItems.length === 0) {
      // Show context menu
      setShowContextMenu(item);
      setContextMenuPosition({
        x: event.pageX || event.touches?.[0]?.pageX || 0,
        y: event.pageY || event.touches?.[0]?.pageY || 0
      });
    } else {
      // Toggle selection in selection mode
      handleItemTap(item);
    }
  };

  const handleDeleteSelected = async () => {
    try {
      for (const itemId of selectedItems) {
        await deleteItemFromList(itemId);
      }
      setSelectedItems([]);
      if (refreshList) {
        refreshList();
      }
    } catch (error) {
      console.error('Error deleting items:', error);
    }
  };

  const handleEditItem = (item) => {
    setShowContextMenu(null);
    if (onEditItem) {
      onEditItem(item, list);
    }
  };

  const handleRemoveItem = async (item) => {
    setShowContextMenu(null);
    try {
      await deleteItemFromList(item.id);
      if (refreshList) {
        refreshList();
      }
    } catch (error) {
      console.error('Error removing item:', error);
    }
  };

  const clearSelection = () => {
    setSelectedItems([]);
  };

  return (
    <div className="min-h-screen bg-stone-50" style={{ backgroundColor: '#F6F6F4' }}>
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
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">{list.name}</h2>
              <div className="flex items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-500" />
                  {favoriteItems.length} favorites
                </span>
                <span className="flex items-center gap-1">
                  <X className="w-3 h-3 text-red-500" />
                  {avoidItems.length} avoided
                </span>
                <span>{allItems.length} total</span>
              </div>
            </div>
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
            <button className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
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
            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mb-4 shadow-sm">
              <Search className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchQuery.trim() ? 'No matching items' : 'No items yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchQuery.trim() 
                ? 'Try adjusting your search or filters'
                : 'Start adding items to build your collection'
              }
            </p>
            {!searchQuery.trim() && (
              <button
                onClick={() => setShowAddModal(true)}
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
                onLongPress={(e) => handleItemLongPress(item, e)}
                showSelection={selectedItems.length > 0}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Delete Button (when items selected) */}
      {selectedItems.length > 0 && (
        <button
          onClick={handleDeleteSelected}
          className="fixed bottom-24 right-6 w-14 h-14 bg-red-500 rounded-full flex items-center justify-center shadow-lg z-20"
        >
          <Trash2 className="w-6 h-6 text-white" />
        </button>
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

      {/* Item Context Menu */}
      {showContextMenu && (
        <div 
          className="fixed bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50"
          style={{
            left: contextMenuPosition.x,
            top: contextMenuPosition.y,
            transform: 'translate(-50%, -100%)'
          }}
        >
          <button
            onClick={() => handleEditItem(showContextMenu)}
            className="w-full px-4 py-3 text-left text-sm font-medium text-gray-900 hover:bg-gray-50 flex items-center gap-3"
          >
            <Edit3 className="w-4 h-4" />
            Edit Item
          </button>
          <button
            onClick={() => handleRemoveItem(showContextMenu)}
            className="w-full px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 flex items-center gap-3"
          >
            <Trash2 className="w-4 h-4" />
            Remove from List
          </button>
        </div>
      )}

      {/* Background overlay to close context menu */}
      {showContextMenu && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-20 z-40"
          onClick={() => setShowContextMenu(null)}
        />
      )}

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
    </div>
  );
};

export default ShowItemsInListView;
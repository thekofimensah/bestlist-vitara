import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Plus, MoreHorizontal, Star, X, ArrowLeft } from 'lucide-react';

const VerdictBadge = ({ verdict }) => {
  const getVerdictStyle = () => {
    switch (verdict) {
      case 'AVOID':
        return 'bg-red-50 text-red-700 border-red-100';
      case 'LOVE':
        return 'bg-yellow-50 text-yellow-700 border-yellow-100';
      case 'RETRY':
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
  onLongPress 
}) => {
  if (isAddTile) {
    return (
      <div
        onClick={onTap}
        className="flex-shrink-0 w-26 h-26 bg-stone-100 border-2 border-dashed border-gray-300 rounded-2xl flex items-center justify-center cursor-pointer hover:bg-stone-200 transition-colors"
        style={{ width: '104px', height: '104px', backgroundColor: '#F1F1EF' }}
      >
        <Plus className="w-6 h-6 text-gray-500" />
      </div>
    );
  }

  if (!item) return null;

  const verdict = item.is_stay_away ? 'AVOID' : 'LOVE';

  return (
    <div
      className="flex-shrink-0 relative cursor-pointer group"
      style={{ width: '104px' }}
    >
      <div className="relative">
        <img
          src={item.image_url || item.image}
          alt={item.name}
          className="w-26 h-26 object-cover rounded-2xl shadow-sm group-hover:shadow-md transition-shadow"
          style={{ width: '104px', height: '104px' }}
          onClick={(e) => {
            e.stopPropagation();
            onImageTap?.(item);
          }}
        />
        <VerdictBadge verdict={verdict} />
        {item.rating && <StarRating rating={item.rating} />}
      </div>
      <div className="mt-2" onClick={onTap}>
        <p className="text-xs text-gray-700 font-medium truncate">{item.name}</p>
      </div>
    </div>
  );
};

const ListRow = ({ 
  list, 
  onItemTap,
  onItemImageTap, 
  onAddItem, 
  onListMenu, 
  onListTitleTap 
}) => {
  const allItems = [...(list.items || []), ...(list.stayAways || [])];
  const sortedItems = allItems.sort((a, b) => {
    // First sort by rating (highest first)
    const ratingA = a.rating || 0;
    const ratingB = b.rating || 0;
    if (ratingB !== ratingA) {
      return ratingB - ratingA;
    }
    
    // Then sort by creation date (most recent first)
    const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
    const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
    return dateB - dateA;
  });

  return (
    <div className="mb-6">
      {/* List Header */}
      <div className="flex items-center justify-between mb-3 px-6">
        <button 
          onClick={() => onListTitleTap(list)}
          className="flex-1 text-left"
        >
          <h3 className="text-base font-medium text-gray-900">{list.name}</h3>
          <p className="text-xs text-gray-500">{allItems.length} items</p>
        </button>
        <button
          onClick={() => onListMenu(list.id)}
          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Horizontal Scroll Container */}
      <div className="overflow-x-auto">
        <div className="flex gap-3 px-6" style={{ paddingRight: '24px' }}>
          {sortedItems.map((item) => (
            <ItemTile
              key={item.id}
              item={item}
              onTap={() => onItemTap(item)}
              onImageTap={onItemImageTap}
            />
          ))}
          <ItemTile
            isAddTile
            onTap={() => onAddItem(list.id)}
          />
          {sortedItems.length > 4 && (
            <div className="flex-shrink-0 w-26 h-26 bg-gradient-to-r from-transparent to-white flex items-center justify-center">
              <span className="text-sm text-gray-500 font-medium">+{sortedItems.length - 4}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ListsView = ({ lists, onSelectList, onCreateList, onEditItem, onViewItemDetail }) => {
  const [showNewListDialog, setShowNewListDialog] = useState(false);
  const [newListName, setNewListName] = useState('');
  const scrollContainerRef = useRef(null);
  const savedScrollPosition = useRef(0);
  const hasScrolled = useRef(false);

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

  const handleItemTap = (item) => {
    // Open AddItemModal for editing by finding the parent list
    const parentList = lists.find(list => 
      [...(list.items || []), ...(list.stayAways || [])].some(listItem => listItem.id === item.id)
    );
    if (parentList && onEditItem) {
      onEditItem(item, parentList);
    }
  };

  const handleItemImageTap = (item) => {
    // Open AddItemModal for editing by finding the parent list
    const parentList = lists.find(list => 
      [...(list.items || []), ...(list.stayAways || [])].some(listItem => listItem.id === item.id)
    );
    if (parentList && onEditItem) {
      onEditItem(item, parentList);
    }
  };

  const handleAddItem = (listId) => {
    // Navigate to specific list to add item
    const targetList = lists.find(list => list.id === listId);
    if (targetList) {
      onSelectList(targetList);
    }
  };

  const handleListMenu = (listId) => {
    // Show context menu for list management
    console.log('List menu for:', listId);
  };

  const handleListTitleTap = (list) => {
    // Navigate to single list view
    if (onSelectList) {
      onSelectList(list);
    }
  };

  const handleCreateList = async () => {
    if (newListName.trim() && onCreateList) {
      await onCreateList(newListName.trim(), '#1F6D5A'); // Default teal color
      setNewListName('');
      setShowNewListDialog(false);
    }
  };

  return (
    <div 
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="min-h-screen bg-stone-50 pb-28 overflow-y-auto" 
      style={{ backgroundColor: '#F6F6F4' }}
    >
      {/* Content */}
      <div className="pb-6">
        {lists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mb-6 shadow-sm">
              <Plus className="w-10 h-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Start organizing tastes</h3>
            <p className="text-gray-600 mb-6">Create your first list to group ingredients and dishes</p>
            <button
              onClick={() => setShowNewListDialog(true)}
              className="px-6 py-3 bg-teal-700 text-white rounded-full font-medium"
              style={{ backgroundColor: '#1F6D5A' }}
            >
              Create Your First List
            </button>
          </div>
        ) : (
          <>
            <div className="pt-4">
              {lists.map((list) => (
                <ListRow
                  key={list.id}
                  list={list}
                  onItemTap={handleItemTap}
                  onItemImageTap={handleItemImageTap}
                  onAddItem={handleAddItem}
                  onListMenu={handleListMenu}
                  onListTitleTap={handleListTitleTap}
                />
              ))}
            </div>

            {/* Floating New List Button */}
            <button
              onClick={() => setShowNewListDialog(true)}
              className="fixed bottom-24 right-6 w-14 h-14 bg-teal-700 rounded-full flex items-center justify-center shadow-lg z-20"
              style={{ backgroundColor: '#1F6D5A' }}
            >
              <Plus className="w-6 h-6 text-white" />
            </button>
          </>
        )}
      </div>

      {/* New List Dialog */}
      {showNewListDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New List</h3>
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="e.g., Single Origin Chocolates"
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:border-teal-700 mb-4"
              autoFocus
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowNewListDialog(false);
                  setNewListName('');
                }}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-2xl font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateList}
                disabled={!newListName.trim()}
                className="flex-1 px-4 py-3 bg-teal-700 text-white rounded-2xl font-medium disabled:opacity-50"
                style={{ backgroundColor: '#1F6D5A' }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListsView;
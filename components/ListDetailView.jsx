import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, X, Heart, Frown, ArrowLeft, Filter } from 'lucide-react';
import ProductCard from './ProductCard';
import { deleteItemFromList } from '../lib/supabase';
import { ListGrid } from './Elements';

const ListDetailView = ({ list, onBack, onEditItem, refreshList }) => {
  const [sortBy, setSortBy] = useState('rating');
  const [showStayAways, setShowStayAways] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectMode, setSelectMode] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [localLoading, setLocalLoading] = useState(false);

  const sortItems = (items) => {
    return [...items].sort((a, b) => {
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'date') return new Date(b.date) - new Date(a.date);
      return 0;
    });
  };

  const displayItems = showStayAways ? list.stayAways : list.items;
  const sortedItems = sortItems(displayItems);
  const listColor = list.color || '#FF6B9D';

  // Only enable select mode on right-click/long-press
  const handleItemContextMenu = (e, itemId) => {
    e.preventDefault();
    setSelectMode(true);
    setSelectedIds([itemId]);
  };

  const toggleSelect = (itemId) => {
    if (!selectMode) return;
    setSelectedIds(ids =>
      ids.includes(itemId) ? ids.filter(id => id !== itemId) : [...ids, itemId]
    );
  };

  const clearSelection = () => {
    setSelectedIds([]);
    setSelectMode(false);
    setDeleting(false);
  };

  const handleDeleteSelected = async () => {
    setDeleting(true);
    setLocalLoading(true);
    if (Array.isArray(list.items)) {
      list.items = list.items.filter(item => !selectedIds.includes(item.id));
    }
    if (Array.isArray(list.stayAways)) {
      list.stayAways = list.stayAways.filter(item => !selectedIds.includes(item.id));
    }
    for (const id of selectedIds) {
      await deleteItemFromList(id);
    }
    clearSelection();
    setDeleting(false);
    if (typeof refreshList === 'function') {
      setLocalLoading(true);
      await refreshList();
      setLocalLoading(false);
    } else {
      setLocalLoading(false);
    }
  };

  // Modern header style
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <motion.div 
        className="p-6 text-white relative overflow-hidden"
        style={{ backgroundColor: listColor }}
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <motion.button
              onClick={onBack}
              className="p-2 bg-white/20 rounded-full"
              whileTap={{ scale: 0.9 }}
            >
              <ArrowLeft className="text-white" size={20} />
            </motion.button>
            <motion.button
              onClick={() => setShowSortMenu(!showSortMenu)}
              className="p-2 bg-white/20 rounded-full relative"
              whileTap={{ scale: 0.9 }}
            >
              <Filter className="text-white" size={20} />
              {showSortMenu && (
                <motion.div
                  className="absolute top-12 right-0 bg-white rounded-2xl shadow-lg p-3 min-w-32"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  {['rating', 'name', 'date'].map((option) => (
                    <button
                      key={option}
                      onClick={() => {
                        setSortBy(option);
                        setShowSortMenu(false);
                      }}
                      className={`block w-full text-left p-2 rounded-lg text-sm capitalize ${
                        sortBy === option ? 'bg-gray-100 font-semibold' : 'text-gray-600'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </motion.div>
              )}
            </motion.button>
          </div>
          <h1 className="text-2xl font-bold mb-2">{list.name}</h1>
          <div className="flex items-center space-x-4 text-white/90">
            <span className="flex items-center">
              <Heart className="mr-1" size={16} />
              {list.items.length} loved
            </span>
            <span className="flex items-center">
              <Frown className="mr-1" size={16} />
              {list.stayAways.length} avoided
            </span>
          </div>
        </div>
        {/* Decorative elements */}
        <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full"></div>
        <div className="absolute -bottom-2 -left-2 w-16 h-16 bg-white/10 rounded-full"></div>
      </motion.div>

      {/* Toggle Buttons */}
      <div className="p-6 pb-4">
        <div className="flex bg-gray-100 rounded-2xl p-1">
          <motion.button
            onClick={() => setShowStayAways(false)}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
              !showStayAways 
                ? 'bg-white text-gray-800 shadow-sm' 
                : 'text-gray-600'
            }`}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-center">
              <Heart className="mr-2" size={16} />
              Favorites ({list.items.length})
            </div>
          </motion.button>
          <motion.button
            onClick={() => setShowStayAways(true)}
            className={`flex-1 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
              showStayAways 
                ? 'bg-white text-gray-800 shadow-sm' 
                : 'text-gray-600'
            }`}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-center">
              <X className="mr-2" size={16} />
              Stay Aways ({list.stayAways.length})
            </div>
          </motion.button>
        </div>
      </div>

      {/* Items Grid */}
      <div className="flex-1 overflow-y-auto px-6 pb-6 relative">
        {localLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-50" style={{ minHeight: 200 }}>
            <span style={{ fontSize: 80, filter: 'drop-shadow(0 4px 16px #ff6b9d88)' }} className="animate-bounce">🍦</span>
            <div className="w-16 h-3 bg-pink-200 rounded-full blur-md animate-pulse mt-2"></div>
          </div>
        )}
        {sortedItems.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <div className="text-2xl mb-1">📷</div>
            <p className="text-xs">No items yet</p>
          </div>
        ) : (
          <ListGrid className="mt-6">
            {sortedItems.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  className={`relative group ${selectMode ? 'cursor-pointer' : ''} ${isSelected ? 'ring-2 ring-pink-400 border-pink-400' : ''}`}
                  onClick={e => {
                    if (selectMode) {
                      toggleSelect(item.id);
                    } else if (onEditItem) {
                      onEditItem(item, list);
                    }
                  }}
                  onContextMenu={e => handleItemContextMenu(e, item.id)}
                  style={{ minHeight: 180 }}
                >
                  {/* Show selection overlay if in select mode */}
                  {selectMode && (
                    <div className={`absolute inset-0 z-10 bg-pink-400/10 ${isSelected ? 'bg-pink-400/30' : ''}`}></div>
                  )}
                  {/* ProductCard shows all info */}
                  <ProductCard item={item} />
                  {/* Selection checkmark */}
                  {selectMode && isSelected && (
                    <div className="absolute top-2 right-2 z-20 bg-pink-500 rounded-full p-1 shadow">
                      <X size={14} className="text-white" />
                    </div>
                  )}
                </div>
              );
            })}
          </ListGrid>
        )}
      </div>

      {/* Footer: only floating delete button in select mode */}
      {selectMode && selectedIds.length > 0 && (
        <div className="fixed left-0 right-0 bottom-6 flex justify-center z-50 pointer-events-none">
          <button
            onClick={async () => {
              if (window.confirm(`Delete ${selectedIds.length} item(s)?`)) {
                await handleDeleteSelected();
              }
            }}
            className="pointer-events-auto px-8 py-3 rounded-2xl font-bold text-white bg-gradient-to-r from-red-500 to-pink-500 shadow-lg text-lg transition-all hover:scale-105 active:scale-95"
            style={{ minWidth: 220 }}
          >
            {`Delete ${selectedIds.length} item${selectedIds.length > 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  );
};

export default ListDetailView;
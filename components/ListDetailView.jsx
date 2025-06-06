import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Filter, Star, X, Heart, Frown } from 'lucide-react';
import ProductCard from './ProductCard';

const ListDetailView = ({ list, onBack, onEditItem }) => {
  const [sortBy, setSortBy] = useState('rating');
  const [showStayAways, setShowStayAways] = useState(false);
  const [showSortMenu, setShowSortMenu] = useState(false);

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

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <motion.div 
        className="p-6 text-white relative overflow-hidden"
        style={{ backgroundColor: list.color }}
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
      <div className="px-6 pb-6">
        {sortedItems.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="w-20 h-20 bg-gray-100 rounded-full mx-auto mb-4 flex items-center justify-center">
              {showStayAways ? (
                <X className="text-gray-400" size={32} />
              ) : (
                <Heart className="text-gray-400" size={32} />
              )}
            </div>
            <p className="text-lg font-semibold mb-2">
              {showStayAways ? 'No items to avoid yet' : 'No favorites yet'}
            </p>
            <p className="text-sm text-gray-400">
              {showStayAways 
                ? 'Items you want to avoid will appear here' 
                : 'Start adding items you love!'}
            </p>
          </div>
        ) : (
          <motion.div 
            className="grid grid-cols-2 gap-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {sortedItems.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => {
                  if (onEditItem) onEditItem(item, list);
                }}
                style={{ cursor: 'pointer' }}
              >
                <ProductCard 
                  item={item} 
                  isStayAway={showStayAways}
                  size="large"
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ListDetailView;
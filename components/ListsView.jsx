import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, Star, X } from 'lucide-react';
import CreateListModal from './CreateListModal';

const ListsView = ({ lists, onSelectList, onCreateList, onEditItem }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const createImageCollage = (items, stayAways, onItemClick) => {
    const allItems = [...items, ...stayAways];
    const displayItems = allItems.slice(0, 4);
    
    if (displayItems.length === 0) {
      return (
        <div className="w-full h-32 bg-gray-100 rounded-2xl flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="text-2xl mb-1">📷</div>
            <p className="text-xs">No items yet</p>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full h-32 rounded-2xl overflow-hidden grid grid-cols-2 gap-1">
        {displayItems.map((item, index) => (
          <div 
            key={index} 
            className={`relative overflow-hidden ${
              displayItems.length === 1 ? 'col-span-2' :
              displayItems.length === 3 && index === 0 ? 'col-span-2' : ''
            } group`}
            onClick={e => {
              e.stopPropagation();
              console.log('Clicked collage item:', item);
              if (onItemClick) onItemClick(item);
            }}
            style={{ cursor: 'pointer' }}
          >
            <img 
              src={item.image_url || item.image} 
              alt={item.name}
              className="w-full h-full object-cover group-hover:opacity-70 transition-opacity duration-200"
            />
            {/* Test button for click debug */}
            <button 
              style={{ position: 'absolute', top: 4, left: 4, zIndex: 20, background: 'rgba(255,255,255,0.7)', borderRadius: 4, padding: '2px 6px', fontSize: 10 }}
              onClick={e => { e.stopPropagation(); console.log('Test button clicked', item); }}
            >Test</button>
            {stayAways.includes(item) && (
              <div className="absolute top-1 right-1 bg-red-500 rounded-full p-1">
                <X size={8} className="text-white" />
              </div>
            )}
            {items.includes(item) && item.rating && (
              <div className="absolute bottom-1 right-1 bg-white/90 rounded-full px-1.5 py-0.5 flex items-center">
                <Star className="text-yellow-400 fill-current" size={8} />
                <span className="text-xs font-bold ml-0.5">{item.rating}</span>
              </div>
            )}
          </div>
        ))}
        {allItems.length > 4 && (
          <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded-full">
            +{allItems.length - 4}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black text-gray-800">My Lists</h2>
          <motion.button
            className="p-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"
            whileTap={{ scale: 0.9 }}
          >
            <Share2 className="text-white" size={20} />
          </motion.button>
        </div>

        <div className="space-y-4">
          {lists.map((list, index) => (
            <motion.div
              key={list.id}
              className="bg-white rounded-3xl shadow-lg overflow-hidden cursor-pointer"
              style={{ backgroundColor: list.color, zIndex: 10, position: 'relative' }}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                console.log('Clicked list:', list);
                onSelectList(list);
              }}
            >
              {/* List Header */}
              <div 
                className="p-4 text-white relative overflow-hidden"
                style={{ backgroundColor: list.color }}
              >
                <div className="absolute inset-0 bg-black/10"></div>
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold mb-1">{list.name}</h3>
                    <div className="flex items-center space-x-3 text-white/90 text-sm">
                      <span className="flex items-center">
                        ❤️ <span className="ml-1 font-semibold">{list.items.length}</span>
                      </span>
                      <span className="flex items-center">
                        ❌ <span className="ml-1 font-semibold">{list.stayAways.length}</span>
                      </span>
                      <span className="text-white/70 text-xs">
                        {list.items.length + list.stayAways.length} total
                      </span>
                    </div>
                  </div>
                  <div className="text-2xl opacity-70">
                    {list.name.includes('Gelato') ? '🍦' :
                     list.name.includes('Fish') ? '🐟' :
                     list.name.includes('Milk') ? '🥛' : '🍽️'}
                  </div>
                </div>
                
                {/* Decorative circles */}
                <div className="absolute -top-2 -right-2 w-12 h-12 bg-white/20 rounded-full"></div>
                <div className="absolute -bottom-1 -left-1 w-8 h-8 bg-white/10 rounded-full"></div>
              </div>

              {/* Image Collage */}
              <div className="p-4">
                {createImageCollage(list.items, list.stayAways, (item) => {
                  if (onEditItem) onEditItem(item, list);
                })}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Create New List */}
        <motion.button
          onClick={() => setShowCreateModal(true)}
          className="w-full mt-6 p-6 border-2 border-dashed border-gray-300 rounded-3xl text-center"
          whileTap={{ scale: 0.98 }}
          whileHover={{ borderColor: '#FF6B9D' }}
        >
          <div className="text-gray-600">
            <div className="w-12 h-12 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
              <span className="text-2xl">+</span>
            </div>
            <p className="font-semibold">Create New List</p>
            <p className="text-sm text-gray-400">Start a new collection</p>
          </div>
        </motion.button>
      </motion.div>

      {showCreateModal && (
        <CreateListModal
          onClose={() => setShowCreateModal(false)}
          onSave={onCreateList}
        />
      )}
    </div>
  );
};

export default ListsView;
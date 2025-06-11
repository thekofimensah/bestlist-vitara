import React from 'react';
import { motion } from 'framer-motion';
import { Heart, MapPin, Star, Users } from 'lucide-react';

const DiscoverView = () => {
  const trendingLists = [
    {
      id: 1,
      title: 'Tokyo Street Food',
      author: 'FoodieExplorer',
      items: 12,
      likes: 234,
      image: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=400&h=300&fit=crop',
      location: 'Tokyo, Japan',
      color: '#FF6B9D'
    },
    {
      id: 2,
      title: 'Italian Gelato Guide',
      author: 'GelatoLover',
      items: 8,
      likes: 189,
      image: 'https://images.unsplash.com/photo-1567206563064-6f60f40a2b57?w=400&h=300&fit=crop',
      location: 'Rome, Italy',
      color: '#4ECDC4'
    },
    {
      id: 3,
      title: 'French Cheese Collection',
      author: 'CheeseConnoisseur',
      items: 15,
      likes: 156,
      image: 'https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=400&h=300&fit=crop',
      location: 'Paris, France',
      color: '#FFE66D'
    }
  ];

  return (
    <div className="p-6 flex-1 min-h-0 flex flex-col">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <h2 className="text-2xl font-black text-gray-800 mb-6">Discover</h2>
        
        {/* Trending Section */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="w-2 h-6 bg-gradient-to-b from-pink-400 to-orange-400 rounded-full mr-3"></div>
            <h3 className="text-lg font-bold text-gray-800">Trending Lists</h3>
          </div>
          
          <div className="space-y-4">
            {trendingLists.map((list, index) => (
              <motion.div
                key={list.id}
                className="bg-white rounded-3xl shadow-lg overflow-hidden"
                initial={{ x: -30, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex">
                  {/* Image */}
                  <div className="w-24 h-24 relative overflow-hidden">
                    <img 
                      src={list.image} 
                      alt={list.title}
                      className="w-full h-full object-cover"
                    />
                    <div 
                      className="absolute inset-0 bg-gradient-to-br opacity-20"
                      style={{ backgroundColor: list.color }}
                    ></div>
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-bold text-gray-800 text-sm">{list.title}</h4>
                        <p className="text-xs text-gray-600">by {list.author}</p>
                      </div>
                      <motion.button
                        className="p-1"
                        whileTap={{ scale: 0.9 }}
                      >
                        <Heart className="text-gray-400" size={16} />
                      </motion.button>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center space-x-3">
                        <span className="flex items-center">
                          <Star size={12} className="mr-1" />
                          {list.items}
                        </span>
                        <span className="flex items-center">
                          <Heart size={12} className="mr-1" />
                          {list.likes}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <MapPin size={10} className="mr-1" />
                        <span>{list.location}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <div className="w-2 h-6 bg-gradient-to-b from-blue-400 to-purple-400 rounded-full mr-3"></div>
            <h3 className="text-lg font-bold text-gray-800">Categories</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: 'Street Food', icon: '🍜', color: '#FF6B9D' },
              { name: 'Desserts', icon: '🍰', color: '#4ECDC4' },
              { name: 'Beverages', icon: '🥤', color: '#FFE66D' },
              { name: 'Local Treats', icon: '🥨', color: '#A8E6CF' }
            ].map((category, index) => (
              <motion.button
                key={category.name}
                className="p-4 rounded-2xl text-center shadow-md bg-white"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="text-2xl mb-2">{category.icon}</div>
                <p className="font-semibold text-gray-800 text-sm">{category.name}</p>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Community Stats */}
        <motion.div
          className="bg-gradient-to-r from-pink-400 to-orange-400 rounded-3xl p-6 text-white"
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <div className="flex items-center mb-3">
            <Users className="mr-2" size={20} />
            <h3 className="font-bold">Community</h3>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-black">2.4K</p>
              <p className="text-xs opacity-90">Active Users</p>
            </div>
            <div>
              <p className="text-2xl font-black">12K</p>
              <p className="text-xs opacity-90">Lists Shared</p>
            </div>
            <div>
              <p className="text-2xl font-black">45K</p>
              <p className="text-xs opacity-90">Items Tracked</p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default DiscoverView;
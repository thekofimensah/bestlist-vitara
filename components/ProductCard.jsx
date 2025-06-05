import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Star } from 'lucide-react';

const ProductCard = ({ item }) => {
  return (
    <motion.div
      className="bg-white rounded-2xl shadow-md overflow-hidden"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Product Image */}
      <div className="relative h-24 bg-gray-100 overflow-hidden">
        <img 
          src={item.image} 
          alt={item.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
        
        {/* Rating Badge */}
        <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1 flex items-center">
          <Star className="text-yellow-400 fill-current" size={10} />
          <span className="text-xs font-bold ml-1">{item.rating}</span>
        </div>
      </div>
      
      {/* Product Info */}
      <div className="p-3">
        <h4 className="font-semibold text-gray-800 text-sm mb-1 truncate">{item.name}</h4>
        
        {item.location && (
          <div className="flex items-center mb-2">
            <MapPin className="text-gray-400" size={10} />
            <span className="text-xs text-gray-500 ml-1 truncate">{item.location}</span>
          </div>
        )}
        
        {item.notes && (
          <p className="text-xs text-gray-600 line-clamp-2 mb-2">{item.notes}</p>
        )}
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">{item.date}</span>
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Star
                key={i}
                size={8}
                className={`${
                  i < item.rating 
                    ? 'text-yellow-400 fill-current' 
                    : 'text-gray-300'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ProductCard;
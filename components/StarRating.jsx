import React from 'react';
import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

const StarRating = ({ rating, onRatingChange }) => {
  return (
    <div className="flex items-center justify-center space-x-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <motion.button
          key={star}
          onClick={() => onRatingChange(star)}
          className="focus:outline-none"
          whileTap={{ scale: 0.8 }}
          whileHover={{ scale: 1.2 }}
        >
          <Star
            size={32}
            className={`transition-colors ${
              star <= rating
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            }`}
          />
        </motion.button>
      ))}
    </div>
  );
};

export default StarRating;
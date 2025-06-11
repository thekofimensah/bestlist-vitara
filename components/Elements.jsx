import React from 'react';
import { motion } from 'framer-motion';
import { Check, Star } from 'lucide-react';

// ListBox: for lists in grid or add-to-list
export function ListBox({ list, selected, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={`flex flex-col justify-between p-2 rounded-xl border transition-all min-h-[4.5rem] flex-1 bg-white ${
        selected ? 'border-pink-400 bg-pink-50' : 'border-gray-200'
      }`}
      whileTap={{ scale: 0.95 }}
    >
      <div className="flex items-center justify-between mb-1">
        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: list.color }}></div>
        {selected && <Check size={12} className="text-pink-500" />}
      </div>
      <p className="font-semibold text-xs text-gray-800">{list.name}</p>
      <p className="text-xs text-gray-500">{(list.items?.length || 0) + (list.stayAways?.length || 0)} items</p>
    </motion.button>
  );
}

// StarRating: for rating selection
export function StarRating({ rating, onRatingChange }) {
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
}

// NotesInput: for notes textarea
export function NotesInput({ value, onChange, ...props }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      className="w-full p-2 bg-gray-50 rounded-xl border-none outline-none resize-none h-10 text-sm text-gray-800"
      placeholder="Add notes..."
      {...props}
    />
  );
}

// ImageAIDisplay: for image + AI tags/species/certainty
export function ImageAIDisplay({ image, tags, species, certainty }) {
  return (
    <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-2xl h-full flex flex-col items-center justify-center">
      <div className="flex items-center mb-2">
        <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
        <span className="text-xs font-medium text-gray-700">AI Detected</span>
      </div>
      <div className="w-full aspect-square bg-gray-100 rounded-xl overflow-hidden flex items-center justify-center">
        <img src={image} alt="Preview" className="w-full h-full object-cover" />
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {tags?.slice(0, 2).map((tag, i) => (
          <span key={i} className="px-1.5 py-0.5 bg-white/70 rounded-full text-xs text-gray-600">{tag}</span>
        ))}
      </div>
      <div className="flex items-center justify-between w-full mt-1">
        <span className="text-xs text-green-600 font-medium ml-1">{certainty}%</span>
        <span className="text-xs text-gray-600">{species}</span>
      </div>
    </div>
  );
}

// ListGrid: for consistent list grid layout
export function ListGrid({ children, className = '', ...props }) {
  return (
    <div
      className={`grid grid-cols-2 gap-2 flex-1 min-h-0 ${className}`.trim()}
      style={{ minHeight: 0 }}
      {...props}
    >
      {children}
    </div>
  );
}

// ImageAISection: two-column layout for image + AI/fields
export function ImageAISection({
  image,
  productName,
  setProductName,
  species,
  setSpecies,
  certainty,
  tags,
  inputClassName = '',
  speciesInputClassName = '',
  tagClassName = '',
  showInputs = true,
  ...motionProps
}) {
  return (
    <div className="flex gap-3">
      <div className="w-[70%]">
        <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden">
          <img
            src={image}
            alt="Captured product"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
      <div className="flex-[0_0_40%] min-w-[120px] min-w-0">
        <motion.div
          className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-2xl h-full flex flex-col min-w-0"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
          {...motionProps}
        >
          <div className="flex items-center mb-2">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
            <span className="text-xs font-medium text-gray-700">AI Detected</span>
          </div>
          <div className="flex-1 space-y-2">
            {showInputs && setProductName ? (
              <input
                type="text"
                value={productName}
                onChange={e => setProductName(e.target.value)}
                className={`w-full bg-transparent text-xs font-bold text-gray-800 border-none outline-none break-words whitespace-pre-line ${inputClassName}`}
                placeholder="Product Name"
              />
            ) : productName ? (
              <div className="text-xs font-bold text-gray-800 break-words whitespace-pre-line">{productName}</div>
            ) : null}
            <div className="flex items-center justify-between">
              {showInputs && setSpecies ? (
                <input
                  type="text"
                  value={species}
                  onChange={e => setSpecies(e.target.value)}
                  className={`bg-transparent text-xs text-gray-600 border-none outline-none flex-1 min-w-0 break-words whitespace-pre-line ${speciesInputClassName}`}
                  placeholder="Species"
                />
              ) : (
                <span className="text-xs text-gray-600 break-words whitespace-pre-line">{species}</span>
              )}
              <span className="text-xs text-green-600 font-medium ml-1">{certainty}%</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {tags?.slice(0, 2).map((tag, index) => (
                <span key={index} className={`px-1.5 py-0.5 bg-white/70 rounded-full text-xs text-gray-600 ${tagClassName}`}>{tag}</span>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 
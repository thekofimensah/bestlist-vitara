import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Star, Plus, Sparkles, X } from 'lucide-react';

// ListBox: for lists in grid or add-to-list
export function ListBox({ list, selected, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={`flex flex-col justify-between p-2 rounded-xl border transition-all min-h-[4.5rem] flex-1 ${
        selected ? 'border-pink-400 bg-pink-50' : 'border-gray-200 bg-white'
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

// StarRating: for rating selection (-3 to 3 scale)
export function StarRating({ rating, onRatingChange }) {
  const stars = Array.from({ length: 7 }, (_, i) => i - 3); // -3 to 3
  
  const getRatingDescription = (rating) => {
    switch (rating) {
      case 3: return "🔥 As good as it gets!";
      case 2: return "✨ Great!";
      case 1: return "👍 Not bad";
      case 0: return "😐 Meh";
      case -1: return "🤔 Not sure";
      case -2: return "😬 That was really bad";
      case -3: return "💀 This shouldn't exist";
      default: return "Select a rating";
    }
  };
  
  return (
    <div className="space-y-3">
      {/* Rating display */}
      <div className="text-center">
        <div className="text-2xl font-bold text-gray-800 mb-1">
          {rating > 0 ? `+${rating}` : rating}
        </div>
        <div className="text-sm text-gray-600">
          {getRatingDescription(rating)}
        </div>
      </div>
      
      {/* Stars */}
      <div className="flex items-center justify-center space-x-2">
        {stars.map((star) => (
          <motion.button
            key={star}
            onClick={() => onRatingChange(star)}
            className="focus:outline-none relative"
            whileTap={{ scale: 0.8 }}
            whileHover={{ scale: 1.1 }}
          >
            <Star
              size={28}
              className={`transition-colors ${
                star <= rating
                  ? star < 0 
                    ? 'text-red-400 fill-current' 
                    : star === 0
                      ? 'text-gray-400 fill-current'
                      : 'text-yellow-400 fill-current'
                  : 'text-gray-200'
              }`}
            />
            {/* Center line indicator */}
            {star === 0 && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-0.5 h-7 bg-gray-400"></div>
              </div>
            )}
          </motion.button>
        ))}
      </div>
      
      {/* Labels */}
      <div className="flex justify-between text-xs text-gray-500 px-2">
        <span className="text-red-500">Stay Away</span>
        <span className="text-gray-500">Meh</span>
        <span className="text-yellow-500">Favorite</span>
      </div>
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
  tags = [],
  setTags,
  inputClassName = '',
  speciesInputClassName = '',
  tagClassName = '',
  showInputs = true,
  isAIProcessing = false,
  ...motionProps
}) {
  const [newTag, setNewTag] = useState('');
  const [showTagInput, setShowTagInput] = useState(false);

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()]);
      setNewTag('');
      setShowTagInput(false);
    }
  };

  const removeTag = (tagToRemove) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleTagKeyPress = (e) => {
    if (e.key === 'Enter') {
      addTag();
    } else if (e.key === 'Escape') {
      setShowTagInput(false);
      setNewTag('');
    }
  };

  return (
    <div className="flex gap-3">
      <div className="w-[70%]">
        <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden relative">
          <img
            src={image}
            alt="Captured product"
            className="w-full h-full object-cover"
          />
          {/* AI Processing Overlay */}
          {isAIProcessing && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent">
              {/* Scanning line animation */}
              <div className="absolute inset-0">
                <div className="absolute h-full w-1 bg-gradient-to-b from-transparent via-blue-400 to-transparent animate-pulse opacity-70 scanner-line"></div>
              </div>
              {/* Shimmer overlay */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
              {/* AI icon in center */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="bg-white/95 rounded-full p-3 shadow-xl animate-pulse border-2 border-blue-200">
                  <div className="w-6 h-6 text-blue-500">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 0 1-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 1 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 1 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 1-3.09 3.09ZM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423L16.5 15.75l.394 1.183a2.25 2.25 0 0 0 1.423 1.423L19.5 18.75l-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"/>
                    </svg>
                  </div>
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
                </div>
              </div>
            </div>
          )}
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
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${
                isAIProcessing 
                  ? 'bg-yellow-400 animate-pulse' 
                  : certainty > 70 
                    ? 'bg-green-400 animate-pulse' 
                    : certainty > 0 
                      ? 'bg-orange-400 animate-pulse'
                      : 'bg-gray-400'
              }`}></div>
              <span className="text-xs font-medium text-gray-700">
                {isAIProcessing ? 'AI Analyzing...' : certainty > 0 ? 'AI Detected' : 'AI Analysis Failed'}
              </span>
            </div>
            {certainty > 0 && (
              <span className="text-xs text-green-600 font-medium">{certainty}%</span>
            )}
          </div>
          
          <div className="flex-1 space-y-3">
            {/* Product Name */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Product</label>
              {showInputs && setProductName ? (
                <input
                  type="text"
                  value={productName}
                  onChange={e => setProductName(e.target.value)}
                  className={`w-full bg-white/50 rounded-lg px-2 py-1.5 text-sm text-gray-800 border border-gray-200 focus:border-blue-400 focus:outline-none ${inputClassName}`}
                  placeholder="Enter product name"
                />
              ) : productName ? (
                <div className="text-sm text-gray-800 break-words bg-white/50 rounded-lg px-2 py-1.5 min-h-[32px] flex items-center">{productName}</div>
              ) : (
                <div className="text-sm text-gray-500 bg-white/50 rounded-lg px-2 py-1.5 min-h-[32px] flex items-center">No product name</div>
              )}
            </div>

            {/* Description/Species */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              {showInputs && setSpecies ? (
                <input
                  type="text"
                  value={species}
                  onChange={e => setSpecies(e.target.value)}
                  className={`w-full bg-white/50 rounded-lg px-2 py-1.5 text-sm text-gray-600 border border-gray-200 focus:border-blue-400 focus:outline-none ${speciesInputClassName}`}
                  placeholder="Enter description"
                />
              ) : (
                <div className="text-sm text-gray-600 break-words bg-white/50 rounded-lg px-2 py-1.5 min-h-[32px] flex items-center">{species || 'No description'}</div>
              )}
            </div>

            {/* Brand (placeholder for future) */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Brand</label>
              <div className="text-sm text-gray-500 bg-white/50 rounded-lg px-2 py-1.5 min-h-[32px] flex items-center">Coming soon</div>
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Tags</label>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag, index) => (
                    <motion.span 
                      key={index} 
                      className={`inline-flex items-center px-2 py-1 bg-white/70 rounded-full text-xs text-gray-600 ${tagClassName}`}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="ml-1 w-3 h-3 rounded-full bg-gray-300 hover:bg-gray-400 flex items-center justify-center text-gray-600 hover:text-white transition-colors"
                      >
                        <span className="text-xs">×</span>
                      </button>
                    </motion.span>
                  ))}
                </div>
                
                {showTagInput ? (
                  <div className="flex gap-1">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyDown={handleTagKeyPress}
                      className="flex-1 bg-white/50 rounded-lg px-2 py-1 text-xs border border-gray-200 focus:border-blue-400 focus:outline-none"
                      placeholder="Add tag..."
                      autoFocus
                    />
                    <button
                      onClick={addTag}
                      className="px-2 py-1 bg-blue-500 text-white rounded-lg text-xs hover:bg-blue-600 transition-colors"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => {
                        setShowTagInput(false);
                        setNewTag('');
                      }}
                      className="px-2 py-1 bg-gray-300 text-gray-600 rounded-lg text-xs hover:bg-gray-400 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowTagInput(true)}
                    className="text-xs text-blue-500 hover:text-blue-600 transition-colors"
                  >
                    + Add tag
                  </button>
                )}
              </div>
            </div>

            {/* Low confidence warning */}
            {!isAIProcessing && certainty > 0 && certainty < 70 && (
              <div className="text-xs text-red-500 font-medium bg-red-50 rounded-lg px-2 py-1">
                AI confidence low. Try retaking for better results.
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export function ListCard({ list, onClick, selected, selectable }) {
  // Use the list color for background, and darken on select
  const baseColor = list.color || '#eee';
  // Simple darken function for hex colors
  function darken(hex, amt = 20) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map(x => x + x).join('');
    let num = parseInt(c, 16);
    let r = Math.max(0, (num >> 16) - amt);
    let g = Math.max(0, ((num >> 8) & 0x00FF) - amt);
    let b = Math.max(0, (num & 0x0000FF) - amt);
    return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
  }
  const bgColor = selectable
    ? baseColor + '22'
    : baseColor + '22';

  const borderColor = selectable
    ? selected
      ? darken(baseColor, 64)
      : baseColor
    : baseColor;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      className={`p-4 rounded-2xl text-left w-full border transition-all duration-150 ${
        selectable ? 'cursor-pointer' : ''
      } ${selectable && selected ? 'border-2 border-green-500' : 'border border-gray-200'}`}
      style={{ backgroundColor: bgColor, position: 'relative' }}
      whileTap={{ scale: 0.97 }}
      whileHover={{ scale: selectable ? 1.03 : 1 }}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-800">{list.name}</span>
        {selectable && selected && (
          <Check size={18} className="text-pink-500" style={{ position: 'absolute', top: 12, right: 12 }} />
        )}
      </div>
      <div className="flex items-center space-x-2 text-xs text-gray-600 mt-1">
        <span>❤️ {list.items?.length || 0}</span>
        <span>❌ {list.stayAways?.length || 0}</span>
      </div>
    </motion.button>
  );
} 

// CreateFirstListButton: beautiful call-to-action for new users
export function CreateFirstListButton({ onClick, className = "", showIcon = true, title = "Create your first list", subtitle = "Start building your favorite things" }) {
  return (
    <motion.button
      onClick={onClick}
      className={`w-full p-8 bg-gradient-to-br from-pink-100 via-purple-50 to-blue-100 rounded-3xl text-center border-2 border-dashed border-pink-300 relative overflow-hidden ${className}`}
      whileTap={{ scale: 0.98 }}
      whileHover={{ scale: 1.02 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-4 left-6 w-8 h-8 bg-pink-300 rounded-full animate-pulse"></div>
        <div className="absolute bottom-6 right-8 w-6 h-6 bg-purple-300 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute top-1/2 right-4 w-4 h-4 bg-blue-300 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>
      
      <div className="relative z-10">
        {showIcon && (
          <motion.div 
            className="w-16 h-16 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg"
            whileHover={{ rotate: 360 }}
            transition={{ duration: 0.8 }}
          >
            <Plus className="text-white" size={32} />
          </motion.div>
        )}
        
        <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center justify-center gap-2">
          {title}
          <Sparkles className="text-pink-400" size={20} />
        </h3>
        
        <p className="text-gray-600 text-sm mb-4">{subtitle}</p>
        
        <div className="inline-flex items-center px-6 py-2 bg-white/80 rounded-full text-sm font-medium text-gray-700 shadow-sm">
          <Plus size={16} className="mr-2 text-pink-400" />
          Get Started
        </div>
      </div>
    </motion.button>
  );
} 
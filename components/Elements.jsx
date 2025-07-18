import React from 'react';
import { motion } from 'framer-motion';
import { Check, Star } from 'lucide-react';

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
  isAIProcessing = false,
  ...motionProps
}) {
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
          <div className="flex items-center mb-2">
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
            {/* Low confidence warning */}
            {!isAIProcessing && certainty > 0 && certainty < 70 && (
              <div className="mt-2 text-xs text-red-500 font-medium">
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
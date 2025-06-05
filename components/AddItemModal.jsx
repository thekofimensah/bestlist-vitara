import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Sparkles, Check } from 'lucide-react';

const AddItemModal = ({ image, lists, onClose, onSave }) => {
  const [selectedLists, setSelectedLists] = useState([lists[0]?.id || '']);
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [productName, setProductName] = useState('Delicious Discovery');
  const [productType, setProductType] = useState('Dessert');
  const [tags, setTags] = useState(['Sweet', 'Creamy', 'Cold']);
  const [species, setSpecies] = useState('Vanilla Gelato');
  const [certainty, setCertainty] = useState(87);
  const [location, setLocation] = useState('Current Location');

  const handleSave = () => {
    if (selectedLists.length === 0 || rating === 0) return;
    
    const isStayAway = rating <= 2;
    
    const newItem = {
      name: productName,
      type: productType,
      species,
      certainty,
      tags,
      image,
      rating: rating,
      notes,
      location,
      date: new Date().toLocaleDateString()
    };
    
    onSave(selectedLists, newItem, isStayAway);
    onClose();
  };

  const toggleList = (listId) => {
    setSelectedLists(prev => 
      prev.includes(listId) 
        ? prev.filter(id => id !== listId)
        : [...prev, listId]
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 z-50 flex items-end"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white w-full rounded-t-3xl p-4 max-h-[90vh] overflow-y-auto"
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Sparkles className="text-yellow-400 mr-2" size={20} />
              <h2 className="text-lg font-bold text-gray-800">Add Product</h2>
            </div>
            <motion.button
              onClick={onClose}
              className="p-2 bg-gray-100 rounded-full"
              whileTap={{ scale: 0.9 }}
            >
              <X size={16} className="text-gray-600" />
            </motion.button>
          </div>

          <div className="flex gap-3 mb-4">
            <div className="w-[70%]">
              <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden">
                <img 
                  src={image} 
                  alt="Captured product" 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="w-[30%]">
              <motion.div 
                className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-2xl h-full flex flex-col"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center mb-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                  <span className="text-xs font-medium text-gray-700">AI Detected</span>
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="w-full bg-transparent text-xs font-bold text-gray-800 border-none outline-none"
                  />
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={species}
                      onChange={(e) => setSpecies(e.target.value)}
                      className="bg-transparent text-xs text-gray-600 border-none outline-none flex-1 min-w-0"
                    />
                    <span className="text-xs text-green-600 font-medium ml-1">{certainty}%</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {tags.slice(0, 2).map((tag, index) => (
                      <span key={index} className="px-1.5 py-0.5 bg-white/70 rounded-full text-xs text-gray-600">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>

          <div className="mb-3">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Your Rating</label>
            <div className="flex justify-center items-center space-x-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <motion.button
                  key={star}
                  onClick={() => setRating(star)}
                  className="focus:outline-none"
                  whileTap={{ scale: 0.8 }}
                  whileHover={{ scale: 1.1 }}
                >
                  <svg
                    className={`w-8 h-8 transition-colors ${
                      star <= rating
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </motion.button>
              ))}
            </div>
            <div className="text-center mt-2 text-xs text-gray-500">
              {rating === 0 ? 'Select a rating' : rating <= 2 ? 'Will be added to Stay Aways' : 'Will be added to Favorites'}
            </div>
          </div>

          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 bg-gray-50 rounded-xl border-none outline-none resize-none h-10 text-sm text-gray-800"
              placeholder={rating <= 2 ? "Why avoid this?" : "What did you love about it?"}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Add to Lists</label>
            <div className="grid grid-cols-2 gap-2">
              {lists.map((list) => (
                <motion.button
                  key={list.id}
                  onClick={() => toggleList(list.id)}
                  className={`p-2 rounded-xl border transition-all ${
                    selectedLists.includes(list.id)
                      ? 'border-pink-400 bg-pink-50'
                      : 'border-gray-200 bg-white'
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: list.color }}
                    ></div>
                    {selectedLists.includes(list.id) && (
                      <Check size={12} className="text-pink-500" />
                    )}
                  </div>
                  <p className="font-semibold text-xs text-gray-800">{list.name}</p>
                  <p className="text-xs text-gray-500">{list.items?.length || 0} items</p>
                </motion.button>
              ))}
            </div>
          </div>

          <motion.button
            onClick={handleSave}
            disabled={selectedLists.length === 0 || rating === 0}
            className={`w-full py-3 rounded-xl font-bold text-white transition-all ${
              selectedLists.length > 0 && rating > 0
                ? rating <= 2 
                  ? 'bg-gradient-to-r from-red-400 to-red-500 shadow-lg'
                  : 'bg-gradient-to-r from-pink-400 to-orange-400 shadow-lg'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
            whileTap={{ scale: 0.98 }}
          >
            {rating <= 2 ? 'Add to Stay Aways' : 'Save Image'}
          </motion.button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AddItemModal;
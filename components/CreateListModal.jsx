import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Palette } from 'lucide-react';

const CreateListModal = ({ onClose, onSave }) => {
  const [listName, setListName] = useState('');
  const [selectedColor, setSelectedColor] = useState('#FF6B9D');
  const [loading, setLoading] = useState(false);

  const colors = [
    '#FF6B9D', '#4ECDC4', '#FFE66D', '#A8E6CF',
    '#FF8A80', '#81C784', '#64B5F6', '#BA68C8',
    '#FFB74D', '#F06292', '#4DB6AC', '#AED581'
  ];

  const handleSave = async () => {
    if (!listName.trim()) return;
    
    setLoading(true);
    try {
      await onSave(listName.trim(), selectedColor);
      onClose();
    } catch (error) {
      console.error('Error creating list:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-3xl p-6 w-full max-w-sm"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Palette className="text-pink-400 mr-2" size={20} />
              <h2 className="text-lg font-bold text-gray-800">Create New List</h2>
            </div>
            <motion.button
              onClick={onClose}
              className="p-2 bg-gray-100 rounded-full"
              whileTap={{ scale: 0.9 }}
            >
              <X size={16} className="text-gray-600" />
            </motion.button>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">List Name</label>
            <input
              type="text"
              value={listName}
              onChange={(e) => setListName(e.target.value)}
              placeholder="e.g., Best Pizza Places"
              className="w-full p-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-400 focus:border-transparent"
              maxLength={50}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">Choose Color</label>
            <div className="grid grid-cols-6 gap-3">
              {colors.map((color) => (
                <motion.button
                  key={color}
                  onClick={() => setSelectedColor(color)}
                  className={`w-10 h-10 rounded-full border-4 transition-all ${
                    selectedColor === color 
                      ? 'border-gray-400 scale-110' 
                      : 'border-transparent hover:scale-105'
                  }`}
                  style={{ backgroundColor: color }}
                  whileTap={{ scale: 0.95 }}
                />
              ))}
            </div>
          </div>

          <div className="flex space-x-3">
            <motion.button
              onClick={onClose}
              className="flex-1 py-3 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              whileTap={{ scale: 0.98 }}
            >
              Cancel
            </motion.button>
            <motion.button
              onClick={handleSave}
              disabled={!listName.trim() || loading}
              className={`flex-1 py-3 rounded-xl font-bold text-white transition-all ${
                listName.trim() && !loading
                  ? 'bg-gradient-to-r from-pink-400 to-orange-400 shadow-lg'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
              whileTap={{ scale: 0.98 }}
            >
              {loading ? 'Creating...' : 'Create List'}
            </motion.button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default CreateListModal;
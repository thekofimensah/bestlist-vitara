import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Palette } from 'lucide-react';
import ModalLayout from './ModalLayout';

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
    console.log('🔧 CreateListModal handleSave called with:', JSON.stringify({ listName: listName.trim(), selectedColor }));
    
    if (!listName.trim()) {
      console.log('❌ List name is empty, returning');
      return;
    }
    
    setLoading(true);
    try {
      console.log('🔧 Calling onSave...');
      await onSave(listName.trim(), selectedColor);
      console.log('✅ onSave completed successfully');
      onClose();
    } catch (error) {
      console.error('❌ Error in CreateListModal handleSave:', JSON.stringify({
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error
      }, null, 2));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalLayout
      isOpen={true}
      onClose={onClose}
      title="Create New List"
    >
      <div className="flex items-center mb-6">
              <Palette className="text-pink-400 mr-2" size={20} />
              <h2 className="text-lg font-bold text-gray-800">Create New List</h2>
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
          
          <div className="flex space-x-3 mt-8">
            <motion.button
              onClick={onClose}
              className="flex-1 py-3 border border-gray-200 rounded-xl font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              whileTap={{ scale: 0.98 }}
            >
              Cancel
            </motion.button>
            <motion.button
              onClick={() => {
                console.log('🔧 Create List button clicked!');
                handleSave();
              }}
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
    </ModalLayout>
  );
};

export default CreateListModal;
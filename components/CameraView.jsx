import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Sparkles, Image as ImageIcon } from 'lucide-react';
import AddItemModal from './AddItemModal';
import BulkImportModal from './BulkImportModal';
import { takeAndUploadPhoto } from '../lib/camera';

const CameraView = ({ lists, onAddItem, onSelectList }) => {
  const [showModal, setShowModal] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);

  const handleCapture = async () => {
    try {
      setError(null);
      const photoUrl = await takeAndUploadPhoto();
      if (photoUrl) {
        setCapturedImage({
          url: photoUrl,
          detected: {
            name: 'Captured Photo',
            type: 'Unknown',
            species: 'Unlabeled',
            certainty: 50
          }
        });
        setShowModal(true);
      }
    } catch (err) {
      console.error('Error capturing photo:', err);
      setError(err.message || 'Failed to access camera. Please check permissions and try again.');
    }
  };

  const handleBulkImport = () => {
    setShowBulkImport(true);
  };

  const handleListClick = (list) => {
    onSelectList(list);
  };

  return (
    <div className="p-6 h-full">
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-xl">
          {error}
        </div>
      )}

      <motion.div
        className="relative bg-gradient-to-br from-gray-900 to-gray-700 rounded-3xl h-96 mb-6 overflow-hidden shadow-2xl"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-20">
          {[...Array(9)].map((_, i) => (
            <div key={i} className="border border-white/30"></div>
          ))}
        </div>

        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <div className="w-24 h-24 border-2 border-white/60 rounded-lg">
            <div className="w-full h-full border border-white/30 rounded-lg m-1"></div>
          </div>
        </motion.div>

        <motion.div
          className="absolute top-4 right-4"
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles className="text-yellow-300" size={20} />
        </motion.div>

        <motion.div
          className="absolute bottom-6 left-6"
          animate={{ rotate: -360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles className="text-pink-300" size={16} />
        </motion.div>
      </motion.div>

      <motion.div
        className="flex justify-center items-center mb-6 relative"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="relative">
          <motion.button
            onClick={handleCapture}
            className="w-20 h-20 bg-gradient-to-br from-pink-400 to-orange-400 rounded-full flex items-center justify-center shadow-lg"
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.1 }}
          >
            <Camera className="text-white" size={32} />
          </motion.button>

          <motion.button
            onClick={handleBulkImport}
            className="absolute -right-16 bottom-0 w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center shadow-lg"
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.1 }}
          >
            <ImageIcon className="text-white" size={20} />
          </motion.button>
        </div>
      </motion.div>

      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <h3 className="text-lg font-bold text-gray-800 mb-3">Recent Lists</h3>
        <div className="grid grid-cols-2 gap-3">
          {lists.slice(0, 4).map((list) => (
            <motion.button
              key={list.id}
              onClick={() => handleListClick(list)}
              className="p-4 rounded-2xl text-left shadow-md"
              style={{ backgroundColor: list.color + '20', borderColor: list.color }}
              whileTap={{ scale: 0.95 }}
              whileHover={{ scale: 1.02 }}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-800">{list.name}</span>
              </div>
              <div className="flex items-center space-x-2 text-xs text-gray-600 mt-1">
                <span>❤️ {list.items?.length || 0}</span>
                <span>❌ {list.stayAways?.length || 0}</span>
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {showModal && (
        <AddItemModal
          image={capturedImage.url}
          lists={lists}
          onClose={() => setShowModal(false)}
          onSave={onAddItem}
        />
      )}

      {showBulkImport && (
        <BulkImportModal
          lists={lists}
          onClose={() => setShowBulkImport(false)}
          onSave={onAddItem}
        />
      )}
    </div>
  );
};

export default CameraView;
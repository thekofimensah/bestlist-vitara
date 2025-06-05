import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Check, Star, ArrowLeft } from 'lucide-react';
import { importMultiplePhotos } from '../lib/camera';

const BulkImportModal = ({ lists, onClose, onSave }) => {
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [photoData, setPhotoData] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [importedPhotos, setImportedPhotos] = useState([]);

  const handleStartImport = async () => {
    const photos = await importMultiplePhotos();
    setImportedPhotos(photos);
  };

  const handlePhotoSelect = (photo) => {
    setSelectedPhotos(prev => {
      const isSelected = prev.find(p => p.id === photo.id);
      return isSelected ? prev.filter(p => p.id !== photo.id) : [...prev, photo];
    });
  };

  const handleProcessPhotos = () => {
    if (selectedPhotos.length === 0) return;
    setIsProcessing(true);
    setCurrentPhotoIndex(0);
    const initialData = {};
    selectedPhotos.forEach(photo => {
      initialData[photo.id] = {
        rating: 0,
        notes: '',
        selectedLists: [lists[0]?.id || '']
      };
    });
    setPhotoData(initialData);
  };

  const handleNextPhoto = () => {
    if (currentPhotoIndex < selectedPhotos.length - 1) {
      setCurrentPhotoIndex(prev => prev + 1);
    } else {
      handleSaveAll();
    }
  };

  const handleBackToGallery = () => {
    setIsProcessing(false);
    setCurrentPhotoIndex(0);
    setPhotoData({});
  };

  const handleSaveAll = () => {
    selectedPhotos.forEach(photo => {
      const data = photoData[photo.id];
      if (data && data.rating > 0) {
        const isStayAway = data.rating <= 2;
        const newItem = {
          name: photo.detected.name,
          type: photo.detected.type,
          species: photo.detected.species,
          certainty: photo.detected.certainty,
          image: photo.url,
          rating: data.rating,
          notes: data.notes,
          location: 'Imported from Gallery',
          date: new Date().toLocaleDateString()
        };
        onSave(data.selectedLists, newItem, isStayAway);
      }
    });
    onClose();
  };

  const updatePhotoData = (photoId, updates) => {
    setPhotoData(prev => ({
      ...prev,
      [photoId]: { ...prev[photoId], ...updates }
    }));
  };

  const toggleList = (photoId, listId) => {
    const currentData = photoData[photoId] || {};
    const selectedLists = currentData.selectedLists || [];
    updatePhotoData(photoId, {
      selectedLists: selectedLists.includes(listId)
        ? selectedLists.filter(id => id !== listId)
        : [...selectedLists, listId]
    });
  };

  const currentPhoto = selectedPhotos[currentPhotoIndex];
  const currentData = photoData[currentPhoto?.id] || {};

  if (isProcessing && currentPhoto) {
    return (
      <AnimatePresence>
        <motion.div
          className="fixed inset-0 bg-black/50 z-50 flex items-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white w-full rounded-t-3xl p-4 max-h-[90vh] overflow-y-auto"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <motion.button
                  onClick={handleBackToGallery}
                  className="p-2 bg-gray-100 rounded-full mr-3"
                  whileTap={{ scale: 0.9 }}
                >
                  <ArrowLeft size={16} className="text-gray-600" />
                </motion.button>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">Rate Items</h2>
                  <p className="text-sm text-gray-600">
                    {currentPhotoIndex + 1} of {selectedPhotos.length}
                  </p>
                </div>
              </div>
              <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pink-400 to-orange-400 transition-all duration-300"
                  style={{ width: `${((currentPhotoIndex + 1) / selectedPhotos.length) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="flex gap-3 mb-4">
              <div className="w-[65%]">
                <div className="aspect-square bg-gray-100 rounded-2xl overflow-hidden">
                  <img
                    src={currentPhoto.url}
                    alt={currentPhoto.detected.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <div className="w-[35%]">
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-2xl h-full">
                  <div className="flex items-center mb-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                    <span className="text-xs font-medium text-gray-700">AI Detected</span>
                  </div>
                  <h3 className="text-sm font-bold text-gray-800 mb-1">{currentPhoto.detected.name}</h3>
                  <p className="text-xs text-gray-600 mb-1">{currentPhoto.detected.species}</p>
                  <span className="text-xs text-green-600 font-medium">{currentPhoto.detected.certainty}%</span>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Your Rating</label>
              <div className="flex justify-center items-center space-x-1">
                <motion.button
                  onClick={() => updatePhotoData(currentPhoto.id, { rating: 0 })}
                  className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${
                    (currentData.rating || 0) === 0 ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'
                  }`}
                  whileTap={{ scale: 0.8 }}
                  whileHover={{ scale: 1.1 }}
                >
                  <X size={16} />
                </motion.button>
                {[1, 2, 3, 4, 5].map((star) => (
                  <motion.button
                    key={star}
                    onClick={() => updatePhotoData(currentPhoto.id, { rating: star })}
                    className="focus:outline-none"
                    whileTap={{ scale: 0.8 }}
                    whileHover={{ scale: 1.1 }}
                  >
                    <Star
                      size={24}
                      className={`transition-colors ${
                        star <= (currentData.rating || 0)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  </motion.button>
                ))}
              </div>
              <div className="text-center mt-2 text-xs text-gray-500">
                {(currentData.rating || 0) === 0
                  ? 'Stay Away'
                  : (currentData.rating || 0) <= 2
                  ? 'Will be added to Stay Aways'
                  : 'Will be added to Favorites'}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={currentData.notes || ''}
                onChange={(e) => updatePhotoData(currentPhoto.id, { notes: e.target.value })}
                className="w-full p-3 bg-gray-50 rounded-xl border-none outline-none resize-none h-16 text-sm"
                placeholder={(currentData.rating || 0) <= 2 ? 'Why avoid this?' : 'What did you love about it?'}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Add to Lists</label>
              <div className="grid grid-cols-2 gap-2">
                {lists.map((list) => (
                  <motion.button
                    key={list.id}
                    onClick={() => toggleList(currentPhoto.id, list.id)}
                    className={`p-2 rounded-xl border transition-all ${
                      (currentData.selectedLists || []).includes(list.id)
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
                      {(currentData.selectedLists || []).includes(list.id) && (
                        <Check size={12} className="text-pink-500" />
                      )}
                    </div>
                    <p className="font-semibold text-xs text-gray-800">{list.name}</p>
                    <p className="text-xs text-gray-500">{list.items.length} items</p>
                  </motion.button>
                ))}
              </div>
            </div>

            <button
              onClick={handleNextPhoto}
              disabled={(currentData.rating || 0) === 0 || (currentData.selectedLists || []).length === 0}
              className={`w-full py-3 rounded-xl font-bold text-white ${
                (currentData.rating || 0) > 0 && (currentData.selectedLists || []).length > 0
                  ? (currentData.rating || 0) <= 2
                    ? 'bg-gradient-to-r from-red-400 to-red-500'
                    : 'bg-gradient-to-r from-pink-400 to-orange-400'
                  : 'bg-gray-300 cursor-not-allowed'
              }`}
            >
              {currentPhotoIndex === selectedPhotos.length - 1 ? 'Save All' : 'Next Photo'}
            </button>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }
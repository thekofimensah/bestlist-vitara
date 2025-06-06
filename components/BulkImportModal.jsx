import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Upload } from 'lucide-react';
import { Camera } from '@capacitor/camera';
import AddItemModal from './AddItemModal';

const BulkImportModal = ({ lists, onClose, onSave }) => {
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showAddItemModal, setShowAddItemModal] = useState(false);

  const loadRecentPhotos = async () => {
    try {
      const photos = await Camera.pickImages({
        quality: 80,
        limit: 50,
        correctOrientation: true,
        multiple: true
      });
      
      const processedPhotos = photos.photos.map(photo => ({
        id: `recent_${Date.now()}_${Math.random()}`,
        url: photo.webPath,
        detected: {
          name: 'Recent Photo',
          type: 'Unknown',
          species: 'Unlabeled',
          certainty: 50
        }
      }));
      
      setSelectedPhotos(processedPhotos);
      if (processedPhotos.length > 0) {
        setCurrentPhotoIndex(0);
        setShowAddItemModal(true);
      }
    } catch (error) {
      console.error('Error loading recent photos:', error);
    }
  };

  const handleNextPhoto = () => {
    if (currentPhotoIndex < selectedPhotos.length - 1) {
      setCurrentPhotoIndex(prev => prev + 1);
    } else {
      setShowAddItemModal(false);
      onClose();
    }
  };

  const handleSave = (selectedLists, item, isStayAway) => {
    onSave(selectedLists, item, isStayAway);
    handleNextPhoto();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white w-full rounded-t-3xl p-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-800">Import Photos</h2>
          <button onClick={onClose} className="p-2">
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        <button
          onClick={loadRecentPhotos}
          className="w-full py-3 bg-gradient-to-r from-pink-400 to-orange-400 text-white rounded-xl font-bold flex items-center justify-center gap-2"
        >
          <Upload size={20} />
          Select Photos
        </button>

        {showAddItemModal && selectedPhotos[currentPhotoIndex] && (
          <AddItemModal
            image={selectedPhotos[currentPhotoIndex].url}
            lists={lists}
            onClose={() => {
              setShowAddItemModal(false);
              onClose();
            }}
            onSave={handleSave}
            currentIndex={currentPhotoIndex + 1}
            totalPhotos={selectedPhotos.length}
          />
        )}
      </div>
    </div>
  );
};

export default BulkImportModal;
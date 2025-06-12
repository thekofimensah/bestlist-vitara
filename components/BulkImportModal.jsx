import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, ArrowLeft, ArrowRight, SkipForward, Check } from 'lucide-react';
import ModalLayout from './ModalLayout';
import { buildItem } from './itemUtils';
import { ListBox, StarRating, NotesInput, ListGrid, ImageAISection, ListCard } from './Elements';
import AddItemModal from './AddItemModal';
import { Camera } from '@capacitor/camera';

const getDefaultPhotoState = (lists) => ({
  selectedLists: lists && lists.length > 0 ? [lists[0].id] : [],
  rating: 0,
  notes: '',
  productName: 'Delicious Discovery',
  productType: 'Dessert',
  tags: ['Sweet', 'Creamy', 'Cold'],
  species: 'Vanilla Gelato',
  certainty: 87,
  location: 'Current Location',
});

const BulkImportModal = ({ lists, onClose, onSave }) => {
  const [selectedPhotos, setSelectedPhotos] = useState([]);
  const [photoStates, setPhotoStates] = useState([]); // Array of per-photo state
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [savedPhotoIndexes, setSavedPhotoIndexes] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSingleAdd, setShowSingleAdd] = useState(false);
  const [singleAddState, setSingleAddState] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form state for current photo
  const currentState = photoStates[currentPhotoIndex] || getDefaultPhotoState(lists);

  // Native image picker handler
  const handleNativePickImages = async () => {
    setLoading(true);
    try {
      const result = await Camera.pickImages({
        quality: 80,
        limit: 10
      });
      if (result && result.photos && result.photos.length > 0) {
        // Filter out invalid photos
        const validPhotos = result.photos.filter(photo => photo.webPath);
        if (validPhotos.length === 0) {
          if (typeof window !== 'undefined' && window.showToast) {
            window.showToast('No valid images were selected.');
          }
          onClose();
          return;
        }
        const photoObjs = validPhotos.map(photo => ({
          id: `${photo.webPath}_${Date.now()}_${Math.random()}`,
          file: null,
        url: photo.webPath,
        detected: {
            name: 'Imported Photo',
          type: 'Unknown',
          species: 'Unlabeled',
          certainty: 50
        }
      }));
        setSelectedPhotos(photoObjs);
        setPhotoStates(photoObjs.map(() => getDefaultPhotoState(lists)));
        setCurrentPhotoIndex(0);
        setErrorMsg(''); // clear any previous error
      } else {
        // User cancelled: close modal, do not show error or retry
        onClose();
        return;
      }
    } catch (err) {
      let msg = 'Failed to pick images. Please try again.';
      if (err && err.message && err.message.toLowerCase().includes('permission')) {
        msg = 'Permission denied. Please allow access to your photos.';
      } else if (err && err.message && err.message.toLowerCase().includes('cancel')) {
        onClose();
        return;
      }
      if (typeof window !== 'undefined' && window.showToast) {
        window.showToast(msg);
      }
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleNativePickImages();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (selectedPhotos.length === 1 && !showSingleAdd && selectedPhotos[0]) {
      setShowSingleAdd(true);
      setSingleAddState(getDefaultPhotoState(lists));
    }
    // eslint-disable-next-line
  }, [selectedPhotos]);

  const handleNextPhoto = () => {
    if (currentPhotoIndex < selectedPhotos.length - 1) {
      setCurrentPhotoIndex(prev => prev + 1);
    } else {
      handleModalClose();
    }
  };

  const handlePrevPhoto = () => {
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(prev => prev - 1);
    }
  };

  const handleSkipPhoto = () => {
    handleNextPhoto();
  };

  // Save the state for the current photo and call onSave
  const handleSave = async () => {
    setPhotoStates(prev => {
      const newStates = [...prev];
      newStates[currentPhotoIndex] = { ...currentState };
      return newStates;
    });
    if (!savedPhotoIndexes.includes(currentPhotoIndex)) {
      // Always use the url/webPath for native picker images
      const image = selectedPhotos[currentPhotoIndex]?.url;
      const newItem = buildItem({ ...currentState, image });
      onSave(currentState.selectedLists, newItem, currentState.rating <= 2);
      setSavedPhotoIndexes(prev => [...prev, currentPhotoIndex]);
    }
    handleNextPhoto();
  };

  // When finishing the last photo, save any unsaved photos
  useEffect(() => {
    if (
      selectedPhotos.length > 0 &&
      savedPhotoIndexes.length < selectedPhotos.length &&
      currentPhotoIndex >= selectedPhotos.length
    ) {
      Promise.all(
        selectedPhotos.map(async (photo, idx) => {
          if (!savedPhotoIndexes.includes(idx)) {
            const state = photoStates[idx];
            if (state) {
              let image = state.image;
              if (photo.file && (!image || !image.startsWith('data:'))) {
                image = await fileToDataUrl(photo.file);
              }
              const newItem = buildItem({ ...state, image });
              await onSave(state.selectedLists, newItem, state.rating <= 2);
            }
          }
        })
      ).then(() => setSavedPhotoIndexes([])); // reset for next import
    }
    // eslint-disable-next-line
  }, [currentPhotoIndex, selectedPhotos.length, savedPhotoIndexes.length]);

  const handleModalClose = () => {
    setSelectedPhotos([]);
    setPhotoStates([]);
    setCurrentPhotoIndex(0);
    setSavedPhotoIndexes([]);
    setShowSingleAdd(false);
    setSingleAddState(null);
    onClose();
  };

  // Handlers for form fields
  const setField = (field, value) => {
    setPhotoStates(prev => {
      const newStates = [...prev];
      newStates[currentPhotoIndex] = { ...newStates[currentPhotoIndex], [field]: value };
      return newStates;
    });
  };

  const toggleList = (listId) => {
    setPhotoStates(prev => {
      const newStates = [...prev];
      const selected = newStates[currentPhotoIndex]?.selectedLists || [];
      newStates[currentPhotoIndex] = {
        ...newStates[currentPhotoIndex],
        selectedLists: selected.includes(listId)
          ? selected.filter(id => id !== listId)
          : [...selected, listId],
      };
      return newStates;
    });
  };

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => resolve(e.target.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Remove image handler
  const handleRemovePhoto = (index) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoStates(prev => prev.filter((_, i) => i !== index));
    if (currentPhotoIndex >= index && currentPhotoIndex > 0) {
      setCurrentPhotoIndex(prev => prev - 1);
    }
  };

  // Bulk save handler
  const handleBulkSave = async () => {
    setErrorMsg('');
    if (isSaving) return; // Prevent duplicate
    // Validate all images have a rating
    const missingIdx = photoStates.findIndex(state => !state || !state.rating || state.rating === 0);
    if (missingIdx !== -1) {
      setErrorMsg('One or more images are missing a rating.');
      setCurrentPhotoIndex(missingIdx);
      return;
    }
    setIsSaving(true);
    for (let idx = 0; idx < selectedPhotos.length; idx++) {
      // Always use the url/webPath for native picker images
      const image = selectedPhotos[idx]?.url;
      const newItem = buildItem({ ...photoStates[idx], image });
      await onSave(photoStates[idx].selectedLists, newItem, photoStates[idx].rating <= 2);
    }
    if (typeof window !== 'undefined' && window.refreshLists) {
      await window.refreshLists();
    }
    setIsSaving(false);
    handleModalClose();
  };

  // If only one image and showSingleAdd, render AddItemModal
  if (showSingleAdd && selectedPhotos.length === 1 && selectedPhotos[0]) {
    return (
      <AddItemModal
        image={selectedPhotos[0].url}
        lists={lists}
        onClose={onClose}
        onSave={onSave}
        initialState={singleAddState}
      />
    );
  }

  return (
    <ModalLayout
      isOpen={true}
      onClose={handleModalClose}
      title="Import Photos"
    >
      {/* Loading overlay */}
      {loading && (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-white/80 z-50" style={{ minHeight: 200 }}>
          <span style={{ fontSize: 80, filter: 'drop-shadow(0 4px 16px #ff6b9d88)' }} className="animate-bounce">🍦</span>
          <div className="w-16 h-3 bg-pink-200 rounded-full blur-md animate-pulse mt-2"></div>
          <span className="mt-4 text-lg text-gray-600 font-semibold">Loading...</span>
        </div>
      )}
      {selectedPhotos.length > 0 && (
        <>
          <div className="flex items-center justify-between px-0 py-2 border-b border-gray-50 bg-gray-50 mb-4 rounded-t-2xl">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrevPhoto}
                disabled={currentPhotoIndex === 0}
                className="p-2 rounded-full bg-gray-100 disabled:opacity-50"
              >
                <ArrowLeft size={18} />
              </button>
              <span className="text-xs text-gray-600">
                Photo {currentPhotoIndex + 1} of {selectedPhotos.length}
              </span>
              <button
                onClick={handleNextPhoto}
                disabled={currentPhotoIndex === selectedPhotos.length - 1}
                className="p-2 rounded-full bg-gray-100 disabled:opacity-50"
              >
                <ArrowRight size={18} />
          </button>
        </div>
        <button
              onClick={handleSkipPhoto}
              className="p-2 rounded-full bg-gray-100"
              title="Skip this photo"
        >
              <SkipForward size={18} />
        </button>
            {/* Bulk Save Button (only for multiple images) */}
            {selectedPhotos.length > 1 && photoStates.some(s => s && s.rating > 0) && (
              <motion.button
                onClick={handleBulkSave}
                disabled={isSaving}
                className="ml-4 px-4 py-2 rounded-xl font-bold text-white bg-gradient-to-r from-pink-400 to-orange-400 shadow-lg flex items-center justify-center gap-2 disabled:opacity-60"
                whileTap={{ scale: isSaving ? 1 : 0.98 }}
              >
                {isSaving && <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>}
                Save All Images
              </motion.button>
        )}
      </div>
          <div className="overflow-visible min-w-0">
            <ImageAISection
              image={selectedPhotos[currentPhotoIndex]?.url}
              productName={currentState.productName}
              setProductName={val => setField('productName', val)}
              species={currentState.species}
              setSpecies={val => setField('species', val)}
              certainty={currentState.certainty}
              tags={currentState.tags}
            />
          </div>
          <div className="mb-3">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Your Rating</label>
            <StarRating rating={currentState.rating} onRatingChange={r => setField('rating', r)} />
            <div className="text-center mt-2 text-xs text-gray-500">
              {currentState.rating === 0 ? 'Select a rating' : currentState.rating <= 2 ? 'Will be added to Stay Aways' : 'Will be added to Favorites'}
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <NotesInput
              value={currentState.notes}
              onChange={e => setField('notes', e.target.value)}
              placeholder={currentState.rating <= 2 ? "Why avoid this?" : "What did you love about it?"}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Add to Lists</label>
            <div className="grid grid-cols-2 gap-3 mb-2">
              {lists.map((list) => (
                <ListCard
                  key={list.id}
                  list={list}
                  onClick={() => toggleList(list.id)}
                  selected={currentState.selectedLists.includes(list.id)}
                  selectable={true}
                />
              ))}
            </div>
          </div>
        </>
      )}
      {/* Preview selected images (only if user cancels out of AddItem step) */}
      {selectedPhotos.length > 0 && photoStates.length === 0 && (
        <div className="grid grid-cols-3 gap-2 mt-4">
          {selectedPhotos.map(photo => (
            <img
              key={photo.id}
              src={photo.url}
              alt="Preview"
              className="w-full h-24 object-cover rounded-xl border"
            />
          ))}
    </div>
      )}
    </ModalLayout>
  );
};

export default BulkImportModal;
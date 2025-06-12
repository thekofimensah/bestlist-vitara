import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Sparkles, Check, ArrowLeft, ArrowRight, SkipForward } from 'lucide-react';
import ModalLayout from './ModalLayout';
import { buildItem } from './itemUtils';
import { ListCard, StarRating, NotesInput, ImageAISection } from './Elements';

const AddItemModal = ({ image, lists, onClose, onSave, item, isBulk, currentIndex, totalPhotos, onNext, onPrev, onSkip, initialState, onStateChange }) => {
  const [selectedLists, setSelectedLists] = useState(() => {
    if (initialState && initialState.selectedLists) return initialState.selectedLists;
    if (item) return [item.list_id];
    if (lists && lists.length > 0) return [lists[0].id];
    return [];
  });
  const [rating, setRating] = useState(initialState?.rating ?? item?.rating ?? 0);
  const [notes, setNotes] = useState(initialState?.notes ?? item?.notes ?? '');
  const [productName, setProductName] = useState(initialState?.productName ?? item?.name ?? 'Delicious Discovery');
  const [productType, setProductType] = useState(initialState?.productType ?? item?.type ?? 'Dessert');
  const [tags, setTags] = useState(initialState?.tags ?? item?.tags ?? ['Sweet', 'Creamy', 'Cold']);
  const [species, setSpecies] = useState(initialState?.species ?? item?.species ?? 'Vanilla Gelato');
  const [certainty, setCertainty] = useState(initialState?.certainty ?? item?.certainty ?? 87);
  const [location, setLocation] = useState(initialState?.location ?? item?.location ?? 'Current Location');

  useEffect(() => {
    if (initialState) {
      setSelectedLists(initialState.selectedLists ?? []);
      setRating(initialState.rating ?? 0);
      setNotes(initialState.notes ?? '');
      setProductName(initialState.productName ?? 'Delicious Discovery');
      setProductType(initialState.productType ?? 'Dessert');
      setTags(initialState.tags ?? ['Sweet', 'Creamy', 'Cold']);
      setSpecies(initialState.species ?? 'Vanilla Gelato');
      setCertainty(initialState.certainty ?? 87);
      setLocation(initialState.location ?? 'Current Location');
    }
  }, [initialState]);

  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        selectedLists,
        rating,
        notes,
        productName,
        productType,
        tags,
        species,
        certainty,
        location,
      });
    }
    // eslint-disable-next-line
  }, [selectedLists, rating, notes, productName, productType, tags, species, certainty, location]);

  const handleSave = () => {
    if (selectedLists.length === 0 || rating === 0) return;
    const isStayAway = rating <= 2;
    const newItem = buildItem({
      productName,
      productType,
      species,
      certainty,
      tags,
      image,
      rating,
      notes,
      location
    });
    onSave(selectedLists, newItem, isStayAway);
    if (isBulk && onNext) onNext();
    else onClose();
  };

  const toggleList = (listId) => {
    setSelectedLists(prev => 
      prev.includes(listId) 
        ? prev.filter(id => id !== listId)
        : [...prev, listId]
    );
  };

  return (
    <ModalLayout
      isOpen={true}
      onClose={onClose}
      title={isBulk ? `Rate Imported Photo (${currentIndex} of ${totalPhotos})` : 'Add Product'}
      headerClassName="pt-8"
      closeButtonClassName="mt-2"
    >
      {/* Bulk navigation (if in bulk mode) */}
      {isBulk && (
        <div className="flex items-center justify-between px-0 py-2 border-b border-gray-50 bg-gray-50 mb-4 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <button
              onClick={onPrev}
              disabled={currentIndex === 1}
              className="p-2 rounded-full bg-gray-100 disabled:opacity-50"
            >
              <ArrowLeft size={18} />
            </button>
            <span className="text-xs text-gray-600">
              Photo {currentIndex} of {totalPhotos}
            </span>
            <button
              onClick={onNext}
              disabled={currentIndex === totalPhotos}
              className="p-2 rounded-full bg-gray-100 disabled:opacity-50"
            >
              <ArrowRight size={18} />
            </button>
          </div>
          <button
            onClick={onSkip}
            className="p-2 rounded-full bg-gray-100"
            title="Skip this photo"
              >
            <SkipForward size={18} />
          </button>
                </div>
      )}
      {/* Main content (image, fields, etc.) */}
      <ImageAISection
        image={image}
        productName={productName}
        setProductName={setProductName}
        species={species}
        setSpecies={setSpecies}
        certainty={certainty}
        tags={tags}
      />
          <div className="mb-3">
            <label className="text-sm font-medium text-gray-700 mb-2 block">Your Rating</label>
        <StarRating rating={rating} onRatingChange={setRating} />
            <div className="text-center mt-2 text-xs text-gray-500">
              {rating === 0 ? 'Select a rating' : rating <= 2 ? 'Will be added to Stay Aways' : 'Will be added to Favorites'}
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
        <NotesInput
              value={notes}
          onChange={e => setNotes(e.target.value)}
              placeholder={rating <= 2 ? "Why avoid this?" : "What did you love about it?"}
            />
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
        } mb-4`}
            whileTap={{ scale: 0.98 }}
          >
        {rating <= 2 ? 'Add to Stay Aways' : 'Add to Favorites'}
          </motion.button>
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Add to Lists</label>
        <div className="grid grid-cols-2 gap-3 mb-2">
          {lists.map((list) => (
            <ListCard
              key={list.id}
              list={list}
              onClick={() => toggleList(list.id)}
              selected={selectedLists.includes(list.id)}
              selectable={true}
            />
          ))}
        </div>
      </div>
    </ModalLayout>
  );
};

export default AddItemModal;
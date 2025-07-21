import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Sparkles, Check, ArrowLeft, ArrowRight, SkipForward, Plus, Star, ChevronDown, ChevronUp, Edit3 } from 'lucide-react';
import { buildItem } from '../hooks/itemUtils';
import Cropper from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';

const StarRating = ({ rating, showNumber = true, editable = true, onChange }) => {
  const getStarColor = (index) => {
    const position = index - 3; // Convert to -3 to +3 scale
    if (position <= rating) {
      if (rating >= 2) return '#1F6D5A'; // Deep green for high ratings
      if (rating >= 0) return '#B58121'; // Amber for neutral/positive
      return '#B0443C'; // Red for negative
    }
    return '#B3B6B3'; // Inactive gray
  };

  const getStarFill = (index) => {
    const position = index - 3;
    return position <= rating ? 'currentColor' : 'none';
  };

  const handleStarClick = (index) => {
    if (editable && onChange) {
      onChange(index - 3); // Convert back to -3 to +3 scale
    }
  };

  return (
    <div className="flex items-center gap-1">
      {[0, 1, 2, 3, 4, 5, 6].map((index) => (
        <Star
          key={index}
          className={`w-4 h-4 ${editable ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
          style={{ color: getStarColor(index) }}
          onClick={editable ? () => handleStarClick(index) : undefined}
          fill={getStarFill(index)}
        />
      ))}
      {showNumber && (
        <span className="ml-2 text-sm font-medium text-gray-700">
          {rating > 0 ? `+${rating}` : rating}
        </span>
      )}
    </div>
  );
};

const RatingDots = ({ rating, max = 5, editable = true, onChange }) => {
  return (
    <div className="flex gap-1">
      {[...Array(max)].map((_, i) => (
        <button
          key={i}
          className={`w-3 h-3 rounded-full transition-all ${
            i < rating ? 'bg-teal-700' : 'bg-gray-300'
          } ${editable ? 'cursor-pointer hover:scale-110 active:scale-95' : ''}`}
          onClick={editable ? () => onChange?.(i + 1) : undefined}
          disabled={!editable}
        />
      ))}
    </div>
  );
};

const VerdictBadge = ({ verdict }) => {
  const getVerdictStyle = () => {
    switch (verdict) {
      case 'AVOID':
        return 'bg-red-50 text-red-700 border-red-100';
      case 'KEEP':
        return 'bg-yellow-50 text-yellow-700 border-yellow-100';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-100';
    }
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getVerdictStyle()}`}>
      {verdict}
    </span>
  );
};

const AddItemModal = ({ 
  image, 
  lists, 
  onClose, 
  onSave, 
  item, 
  isBulk, 
  currentIndex, 
  totalPhotos, 
  onNext, 
  onPrev, 
  onSkip, 
  initialState, 
  onStateChange, 
  aiMetadata, 
  isAIProcessing, 
  onCreateList 
}) => {
  const [currentImage, setCurrentImage] = useState(image); // image shown & saved
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropComplete = useCallback((_ignored, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const getCroppedImg = async () => {
    return new Promise((resolve, reject) => {
      const imageObj = new Image();
      imageObj.src = currentImage;
      imageObj.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = croppedAreaPixels.width;
        canvas.height = croppedAreaPixels.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(
          imageObj,
          croppedAreaPixels.x,
          croppedAreaPixels.y,
          croppedAreaPixels.width,
          croppedAreaPixels.height,
          0,
          0,
          croppedAreaPixels.width,
          croppedAreaPixels.height
        );
        resolve(canvas.toDataURL('image/jpeg'));
      };
      imageObj.onerror = (e) => reject(e);
    });
  };

  const [showCreateListDialog, setShowCreateListDialog] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [selectedLists, setSelectedLists] = useState(() => {
    if (initialState && initialState.selectedLists) return initialState.selectedLists;
    if (item && item.list_id) return [item.list_id];
    // Default to empty array to avoid UUID errors
    return [];
  });
  const [rating, setRating] = useState(initialState?.rating ?? item?.rating ?? 0);
  const [notes, setNotes] = useState(initialState?.notes ?? item?.notes ?? '');
  const [productName, setProductName] = useState(() => {
    if (aiMetadata?.productName) return aiMetadata.productName;
    return initialState?.productName ?? item?.name ?? (isAIProcessing ? 'Analyzing...' : 'Loading...');
  });
  const [productType, setProductType] = useState(() => {
    if (aiMetadata?.productType) return aiMetadata.productType;
    return initialState?.productType ?? item?.type ?? (isAIProcessing ? 'Analyzing...' : 'Unknown');
  });
  const [tags, setTags] = useState(() => {
    if (aiMetadata?.tags) return aiMetadata.tags;
    return initialState?.tags ?? item?.tags ?? (isAIProcessing ? ['Analyzing...'] : ['Loading...']);
  });
  const [certainty, setCertainty] = useState(() => {
    if (aiMetadata?.certainty) return aiMetadata.certainty;
    return initialState?.certainty ?? item?.certainty ?? 0;
  });
  const [location, setLocation] = useState(initialState?.location ?? item?.location ?? 'Current Location');
  const [rarity, setRarity] = useState(1); // 1=Common, 2=Uncommon, 3=Rare
  const [showListDropdown, setShowListDropdown] = useState(false);
  const [activeTags, setActiveTags] = useState([]);
  const [customTag, setCustomTag] = useState('');
  const [flavorNotes, setFlavorNotes] = useState([]);
  const [newFlavorNote, setNewFlavorNote] = useState('');
  const [showDetailedAttributes, setShowDetailedAttributes] = useState(false);
  const [showAdditionalTags, setShowAdditionalTags] = useState(false);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editPrice, setEditPrice] = useState('');
  const [qualityOverview, setQualityOverview] = useState('');

  // Mock attributes for detailed breakdown
  const [attributes, setAttributes] = useState({
    aroma: 4,
    texture: 4,
    freshness: 5,
    balance: 4,
    value: 4
  });

  // Initialize active tags from AI metadata or existing tags
  useEffect(() => {
    if (tags && tags.length > 0 && tags[0] !== 'Loading...' && tags[0] !== 'Analyzing...') {
      setActiveTags(tags);
    }
  }, [tags]);

  // Update state when AI metadata becomes available
  useEffect(() => {
    if (aiMetadata) {
      setProductName(aiMetadata.productName);
      setProductType(aiMetadata.productType);
      setTags(aiMetadata.tags);
      setCertainty(aiMetadata.certainty);
      setActiveTags(aiMetadata.tags || []);
      // Auto-fill the quality overview/description from AI
      setQualityOverview(aiMetadata.species || aiMetadata.description || aiMetadata.notes || '');
      // Set some reasonable mock attributes based on rating
      const baseRating = Math.abs(aiMetadata.rating || rating || 3);
      setAttributes({
        aroma: Math.min(5, Math.max(1, baseRating)),
        texture: Math.min(5, Math.max(1, baseRating)),
        freshness: Math.min(5, Math.max(1, baseRating + 1)),
        balance: Math.min(5, Math.max(1, baseRating)),
        value: Math.min(5, Math.max(1, baseRating - 1))
      });
    }
  }, [aiMetadata]);

  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        selectedLists,
        rating,
        notes,
        productName,
        productType,
        tags: activeTags,
        certainty,
        location,
      });
    }
    // eslint-disable-next-line
  }, [selectedLists, rating, notes, productName, productType, activeTags, certainty, location]);

  const handleSave = () => {
    if (selectedLists.length === 0 || rating === 0) return;
    const isStayAway = rating < 0;
    const newItem = buildItem({
      productName,
      productType,
      certainty,
      tags: activeTags,
      image: currentImage,
      rating,
      notes,
      location
    });
    onSave(selectedLists, newItem, isStayAway);
    if (isBulk && onNext) onNext();
    else onClose();
  };

  const handleCreateList = async () => {
    if (newListName.trim() && onCreateList) {
      const newList = await onCreateList(newListName.trim(), '#1F6D5A'); // Default teal color
      if (newList && newList.id) {
        setSelectedLists([newList.id]);
      }
      setNewListName('');
      setShowCreateListDialog(false);
    }
  };

  const removeTag = (tagToRemove) => {
    setActiveTags(activeTags.filter(tag => tag !== tagToRemove));
  };

  const addTag = (tagToAdd) => {
    if (!activeTags.includes(tagToAdd)) {
      setActiveTags([...activeTags, tagToAdd]);
    }
  };

  const addFlavorNote = () => {
    if (newFlavorNote.trim()) {
      setFlavorNotes([...flavorNotes, newFlavorNote.trim()]);
      setNewFlavorNote('');
    }
  };

  const removeFlavorNote = (index) => {
    setFlavorNotes(flavorNotes.filter((_, i) => i !== index));
  };

  const addCustomTag = () => {
    if (customTag.trim() && !activeTags.includes(customTag.trim())) {
      setActiveTags([...activeTags, customTag.trim()]);
      setCustomTag('');
    }
  };

  const getSelectedListName = () => {
    if (selectedLists.length === 0) return 'Select lists';
    if (selectedLists.length === 1) {
      const list = lists.find(l => l.id === selectedLists[0]);
      return list?.name || 'Unknown list';
    }
    return `${selectedLists.length} lists selected`;
  };

  const getVerdictFromRating = (rating) => {
    if (rating < 0) return 'AVOID';
    if (rating > 0) return 'KEEP';
    return 'NEUTRAL';
  };

  const handleRarityChange = (delta) => {
    setRarity(prev => {
      const newVal = ((prev - 1 + delta + 3) % 3) + 1;
      return newVal;
    });
  };

  const getRarityLabel = (rarity) => {
    const labels = ['Common', 'Uncommon', 'Rare'];
    return labels[rarity - 1] || 'Common';
  };

  const handlePriceEdit = () => {
    setIsEditingPrice(true);
  };

  const handlePriceSave = () => {
    setIsEditingPrice(false);
  };

  const handleAttributeChange = (attribute, value) => {
    setAttributes(prev => ({
      ...prev,
      [attribute]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-stone-50 flex flex-col z-50" style={{ backgroundColor: '#F6F6F4' }}>
      {/* Hero Image Section - 35% of screen */}
      <div className="relative h-[35vh] overflow-hidden">
        {/* Cinematic AI Loading Effect (from original) */}
        {isAIProcessing && (
          <div className="absolute inset-0 z-10 pointer-events-none">
            {/* Scanning line animation */}
            <div className="absolute inset-0 bg-gradient-to-r from-teal-500/20 via-blue-500/20 to-purple-500/20 animate-pulse"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/10 to-transparent animate-ping"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="flex items-center gap-3 bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-3">
                <div className="relative">
                  <div className="w-4 h-4 border-2 border-teal-700 border-t-transparent rounded-full animate-spin"></div>
                  <div className="absolute inset-0 w-4 h-4 border border-teal-300 rounded-full animate-ping"></div>
                </div>
                <span className="text-sm font-medium text-gray-900">AI analyzing...</span>
              </div>
            </div>
          </div>
        )}

        <img
          src={currentImage}
          alt="Food item"
          className={`w-full h-full object-cover transition-all duration-500 ${
            isAIProcessing ? 'saturate-150 contrast-110' : 'saturate-100 contrast-100'
          }`}
        />
        
        {/* Crop button - moved to top right */}
        {!isAIProcessing && !isCropping && (
          <button
            onClick={() => setIsCropping(true)}
            className="absolute top-2 right-2 bg-white/80 backdrop-blur-sm rounded-full px-3 py-1 flex items-center gap-1 text-xs font-medium shadow-lg active:scale-95 transition-transform"
          >
            Crop
          </button>
        )}

        {/* Cropping Overlay - full screen */}
        {isCropping && (
          <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
            {/* Cropper taking full square area (but will auto contain) */}
            <div className="absolute inset-0">
              <Cropper
                image={currentImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            {/* Cancel & Confirm */}
            <button
              onClick={() => setIsCropping(false)}
              className="absolute top-6 left-4 w-10 h-10 bg-white/85 rounded-full flex items-center justify-center shadow-lg active:scale-95"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={async () => {
                const cropped = await getCroppedImg();
                setCurrentImage(cropped);
                setIsCropping(false);
              }}
              className="absolute top-6 right-4 w-10 h-10 bg-teal-700 text-white rounded-full flex items-center justify-center shadow-lg active:scale-95"
              style={{ backgroundColor: '#1F6D5A' }}
            >
              <Check className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Back Button */}
        <button 
          onClick={onClose}
          className="absolute top-6 left-4 w-10 h-10 bg-white bg-opacity-90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg z-20 active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>

        {/* Bulk navigation buttons */}
        {isBulk && (
          <div className="absolute top-6 right-4 flex gap-2 z-20">
            <button
              onClick={onPrev}
              disabled={currentIndex === 1}
              className="w-10 h-10 bg-white bg-opacity-90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg disabled:opacity-50 active:scale-95 transition-transform"
            >
              <ArrowLeft className="w-4 h-4 text-gray-700" />
            </button>
            <button
              onClick={onNext}
              disabled={currentIndex === totalPhotos}
              className="w-10 h-10 bg-white bg-opacity-90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg disabled:opacity-50 active:scale-95 transition-transform"
            >
              <ArrowRight className="w-4 h-4 text-gray-700" />
            </button>
            <button
              onClick={onSkip}
              className="w-10 h-10 bg-white bg-opacity-90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg active:scale-95 transition-transform"
            >
              <SkipForward className="w-4 h-4 text-gray-700" />
            </button>
          </div>
        )}

        {/* Bulk indicator */}
        {isBulk && (
          <div className="absolute bottom-4 left-4 bg-white bg-opacity-90 backdrop-blur-sm rounded-full px-3 py-1 shadow-lg z-20">
            <span className="text-xs font-medium text-gray-700">{currentIndex} of {totalPhotos}</span>
          </div>
        )}
      </div>

      {/* Overlapping Data Card - fills remaining 65% with padding */}
      <div 
        className="flex-1 bg-white rounded-t-3xl shadow-xl overflow-hidden -mt-6 relative z-10 mx-4"
        style={{
          borderTopLeftRadius: '48px',
          borderTopRightRadius: '48px',
          boxShadow: '0 8px 24px -4px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.05)'
        }}
      >
        {/* Scrollable content */}
        <div className="h-full overflow-y-auto overscroll-behavior-contain">
          <div className="p-6 pb-8 min-h-full">
            {/* Category Pills */}
            <div className="flex gap-2 mb-4 overflow-x-auto">
              {activeTags.map((tag, index) => (
                <div
                  key={index}
                  className="flex items-center gap-1 px-3 py-1.5 bg-stone-100 text-gray-600 rounded-full text-xs font-medium whitespace-nowrap"
                  style={{ backgroundColor: '#F1F1EF' }}
                >
                  <span>{tag}</span>
                  {!isAIProcessing && (
                    <button
                      onClick={() => removeTag(tag)}
                      className="w-3 h-3 flex items-center justify-center hover:bg-gray-300 rounded-full"
                    >
                      <X className="w-2 h-2" />
                    </button>
                  )}
                </div>
              ))}
              
              {!isAIProcessing && (
                <button
                  onClick={() => setShowAdditionalTags(!showAdditionalTags)}
                  className="px-3 py-1.5 bg-teal-100 text-teal-700 rounded-full text-xs font-medium whitespace-nowrap"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Item Header */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <input
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  disabled={isAIProcessing}
                  className="text-xl font-semibold text-gray-900 bg-transparent border-none outline-none flex-1"
                  placeholder="Product name"
                />
                {!isAIProcessing && aiMetadata && (
                  <div className="flex items-center gap-1 bg-stone-50 rounded-full px-2 py-0.5" style={{ backgroundColor: '#FAFAF9' }}>
                    <Sparkles className="w-2.5 h-2.5 text-gray-400" />
                    <span className="text-xs text-gray-400">AI</span>
                    <span className="text-xs text-gray-400">{Math.round(certainty) || 95}%</span>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-4 mb-3">
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    disabled={isAIProcessing}
                    className="bg-transparent border-none outline-none"
                    placeholder="Location"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <VerdictBadge verdict={getVerdictFromRating(rating)} />
                <div className="flex items-center gap-2 text-xs text-gray-500 min-w-0">
                  <span>Rarity:</span>
                  <div className="flex items-center bg-gray-100 rounded-lg px-1 py-0.5">
                    <button
                      onClick={() => handleRarityChange(-1)}
                      disabled={isAIProcessing}
                      className="p-1 disabled:opacity-30 active:scale-95"
                    >
                      <ArrowLeft className="w-3 h-3 text-gray-600" />
                    </button>
                    <span className="text-xs font-medium text-gray-700 px-1 min-w-[60px] text-center">
                      {getRarityLabel(rarity)}
                    </span>
                    <button
                      onClick={() => handleRarityChange(1)}
                      disabled={isAIProcessing}
                      className="p-1 disabled:opacity-30 active:scale-95"
                    >
                      <ArrowRight className="w-3 h-3 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quality Overview - Auto-filled description */}
            <div className="mb-6">
              <textarea
                value={qualityOverview}
                onChange={(e) => setQualityOverview(e.target.value)}
                disabled={isAIProcessing}
                placeholder={
                  isAIProcessing 
                    ? "AI is analyzing the image..." 
                    : "Describe what you see, taste, or think about this item..."
                }
                className="w-full text-sm text-gray-700 leading-relaxed bg-transparent border-none outline-none resize-none"
                rows={3}
              />
            </div>

            {/* Overall Rating */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-900">Overall Rating</h3>
                {!isAIProcessing && (
                  <button
                    onClick={() => setShowDetailedAttributes(!showDetailedAttributes)}
                    className="flex items-center gap-1 text-xs text-teal-700 hover:text-teal-800"
                  >
                    <span>Detailed Breakdown</span>
                    {showDetailedAttributes ? (
                      <ChevronUp className="w-3 h-3" />
                    ) : (
                      <ChevronDown className="w-3 h-3" />
                    )}
                  </button>
                )}
              </div>
              <StarRating rating={rating} onChange={setRating} editable={!isAIProcessing} />
              <div className="text-center mt-2 text-xs text-gray-500">
                {rating === 0 ? 'Select a rating' : rating < 0 ? 'Will be added to Stay Aways' : 'Will be added to Favorites'}
              </div>

              {showDetailedAttributes && !isAIProcessing && (
                <div className="mt-4 space-y-4 bg-stone-50 rounded-xl p-4" style={{ backgroundColor: '#F1F1EF' }}>
                  {Object.entries(attributes).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 capitalize">{key}</span>
                      <div className="flex items-center gap-3">
                        <RatingDots 
                          rating={value} 
                          onChange={(newValue) => handleAttributeChange(key, newValue)}
                        />
                        <span className="text-sm text-gray-500 w-3 font-medium">{value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Flavor Notes section removed per latest design */}

            {/* Additional Tags Section */}
            {showAdditionalTags && !isAIProcessing && (
              <div className="mb-6 p-4 bg-stone-50 rounded-xl" style={{ backgroundColor: '#F1F1EF' }}>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Add Tags</h4>
                
                {/* Custom tag input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCustomTag()}
                    placeholder="Custom tag..."
                    className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-700"
                  />
                  <button
                    onClick={addCustomTag}
                    className="px-3 py-2 bg-teal-700 text-white rounded-lg text-sm font-medium"
                    style={{ backgroundColor: '#1F6D5A' }}
                  >
                    Add
                  </button>
                </div>
              </div>
            )}

            {/* Personal Notes */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Your Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={isAIProcessing}
                placeholder="Add your personal thoughts, memories, or additional notes..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-700 resize-none"
                rows={3}
              />
            </div>

            {/* List Selection */}
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Add to Lists</h3>
              <div className="relative">
                <button
                  onClick={() => setShowListDropdown(!showListDropdown)}
                  disabled={isAIProcessing}
                  className="w-full flex items-center justify-between p-3 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700 disabled:opacity-50"
                >
                  <span className="text-sm text-gray-700">{getSelectedListName()}</span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </button>

                {showListDropdown && !isAIProcessing && (
                  <>
                    {/* Click-away overlay */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowListDropdown(false)}
                    />
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                      {lists.length === 0 ? (
                        <div className="p-3 text-center">
                          <button
                            onClick={() => setShowCreateListDialog(true)}
                            className="text-teal-700 text-sm font-medium"
                            style={{ color: '#1F6D5A' }}
                          >
                            Create your first list
                          </button>
                        </div>
                      ) : (
                        <>
                          {lists.map((list) => (
                            <label key={list.id} className="flex items-center p-3 hover:bg-gray-50 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedLists.includes(list.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedLists([...selectedLists, list.id]);
                                  } else {
                                    setSelectedLists(selectedLists.filter(id => id !== list.id));
                                  }
                                }}
                                className="mr-3"
                              />
                              <span className="text-sm text-gray-900 flex-1">{list.name}</span>
                            </label>
                          ))}
                          <div className="border-t border-gray-100">
                            <button
                              onClick={() => setShowCreateListDialog(true)}
                              className="w-full p-3 text-left text-teal-700 text-sm font-medium hover:bg-gray-50"
                              style={{ color: '#1F6D5A' }}
                            >
                              + Create new list
                            </button>
                          </div>
                        </>
                      )}
                      {/* Done button */}
                      <div className="border-t border-gray-100 p-2 text-right">
                        <button
                          onClick={() => setShowListDropdown(false)}
                          className="text-xs text-teal-700 font-medium px-3 py-1 hover:underline"
                        >
                          Done
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleSave}
                disabled={selectedLists.length === 0 || rating === 0 || isAIProcessing}
                className={`flex-1 h-13 rounded-full font-semibold text-base flex items-center justify-center gap-2 mr-4 transition-all duration-200 ${
                  selectedLists.length > 0 && rating !== 0 && !isAIProcessing
                    ? 'bg-teal-700 text-white hover:bg-teal-800 active:scale-95'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                style={{ 
                  backgroundColor: selectedLists.length > 0 && rating !== 0 && !isAIProcessing ? '#1F6D5A' : undefined,
                  height: '52px' 
                }}
              >
                <Plus className="w-5 h-5" />
                {rating < 0 ? 'Add to Stay Aways' : rating === 0 ? 'Add to Lists' : 'Add to Favorites'}
              </button>
              
              <div className="text-right">
                {isEditingPrice ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      onBlur={handlePriceSave}
                      onKeyDown={(e) => e.key === 'Enter' && handlePriceSave()}
                      className="text-lg font-semibold text-gray-900 bg-transparent border-b border-gray-300 focus:border-teal-700 outline-none w-32 text-right"
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div>
                      <div className="text-lg font-semibold text-gray-900">{editPrice || 'Add price'}</div>
                      <div className="text-xs text-gray-500">Cost</div>
                    </div>
                    {!isAIProcessing && (
                      <button
                        onClick={handlePriceEdit}
                        className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Simple Create List Dialog */}
      {showCreateListDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New List</h3>
            <input
              type="text"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="e.g., Single Origin Chocolates"
              className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:border-teal-700 mb-4"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleCreateList()}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCreateListDialog(false);
                  setNewListName('');
                }}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-2xl font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateList}
                disabled={!newListName.trim()}
                className="flex-1 px-4 py-3 bg-teal-700 text-white rounded-2xl font-medium disabled:opacity-50"
                style={{ backgroundColor: '#1F6D5A' }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddItemModal;
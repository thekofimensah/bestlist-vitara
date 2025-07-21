import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Sparkles, Check, ArrowLeft, ArrowRight, SkipForward, Plus, Star, ChevronDown, ChevronUp, Edit3, Navigation } from 'lucide-react';
import { buildItem } from '../hooks/itemUtils';
import Cropper from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { RatingOverlay } from './Elements';

const StarRating = ({ rating, showNumber = true, editable = true, onChange }) => {
  const getStarColor = (index) => {
    if (index <= rating) {
      if (rating >= 4) return '#1F6D5A'; // Deep green for keeps (4-5)
      if (rating === 3) return '#B58121'; // Amber for neutral (3)
      return '#B0443C'; // Red for not keeps (1-2)
    }
    return '#B3B6B3'; // Inactive gray
  };

  const getStarFill = (index) => {
    return index <= rating ? 'currentColor' : 'none';
  };

  const handleStarClick = (index) => {
    if (editable && onChange) {
      onChange(index); // Use 1-5 scale
    }
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((index) => (
        <Star
          key={index}
          className={`w-6 h-6 ${editable ? 'cursor-pointer hover:scale-110 transition-transform' : ''}`}
          style={{ color: getStarColor(index) }}
          onClick={editable ? () => handleStarClick(index) : undefined}
          fill={getStarFill(index)}
        />
      ))}
      {showNumber && (
        <span className="ml-2 text-sm font-medium text-gray-700">
          {rating}
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
      case 'LOVE':
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
  onCreateList,
  showRatingFirst = false,
  onUpdateAI
}) => {
  
  const [currentImage, setCurrentImage] = useState(image); // image shown & saved
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  
  // Rating overlay state
  const [showRatingOverlay, setShowRatingOverlay] = useState(showRatingFirst);
  const [selectedRating, setSelectedRating] = useState(null);

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
    
    // Default to the list that was most recently added to
    if (lists && lists.length > 0) {
      // Find the most recent item across all lists
      let mostRecentItem = null;
      let mostRecentListId = null;
      
      lists.forEach(list => {
        const allItems = [...(list.items || []), ...(list.stayAways || [])];
        allItems.forEach(item => {
          if (!mostRecentItem || new Date(item.created_at) > new Date(mostRecentItem.created_at)) {
            mostRecentItem = item;
            mostRecentListId = list.id;
          }
        });
      });
      
      // If we found a recent item, use that list; otherwise use the first list
      if (mostRecentListId) {
        return [mostRecentListId];
      } else if (lists.length > 0) {
        return [lists[0].id];
      }
    }
    
    // Fallback to empty array
    return [];
  });
  const [rating, setRating] = useState(initialState?.rating ?? item?.rating ?? 3);
  const [notes, setNotes] = useState(initialState?.notes ?? item?.notes ?? '');
  const [productName, setProductName] = useState(() => {
    if (aiMetadata?.productName) return aiMetadata.productName;
    return initialState?.productName ?? item?.name ?? (isAIProcessing ? 'Analyzing...' : '');
  });
  const [productType, setProductType] = useState(() => {
    if (aiMetadata?.productType) return aiMetadata.productType;
    return initialState?.productType ?? item?.type ?? (isAIProcessing ? 'Analyzing...' : '');
  });
  const [tags, setTags] = useState(() => {
    if (aiMetadata?.tags) return aiMetadata.tags;
    return initialState?.tags ?? item?.tags ?? (isAIProcessing ? ['Analyzing...'] : []);
  });
  const [certainty, setCertainty] = useState(() => {
    if (aiMetadata?.certainty) return aiMetadata.certainty;
    return initialState?.certainty ?? item?.certainty ?? 0;
  });
  const [location, setLocation] = useState(initialState?.location ?? item?.location ?? 'Current Location');
  const [place, setPlace] = useState('');
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
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
    aroma: 3,
    texture: 3,
    freshness: 3,
    balance: 3,
    value: 3
  });

  // Initialize active tags from AI metadata or existing tags
  useEffect(() => {
    if (tags && tags.length > 0 && tags[0] !== 'Loading...' && tags[0] !== 'Analyzing...') {
      setActiveTags(tags);
    }
  }, [tags]);

  // Update selectedLists when lists change and none are selected
  useEffect(() => {
    if (selectedLists.length === 0 && lists && lists.length > 0) {
      // Find the most recent item across all lists
      let mostRecentItem = null;
      let mostRecentListId = null;
      
      lists.forEach(list => {
        const allItems = [...(list.items || []), ...(list.stayAways || [])];
        allItems.forEach(item => {
          if (!mostRecentItem || new Date(item.created_at) > new Date(mostRecentItem.created_at)) {
            mostRecentItem = item;
            mostRecentListId = list.id;
          }
        });
      });
      
      // If we found a recent item, use that list; otherwise use the first list
      if (mostRecentListId) {
        setSelectedLists([mostRecentListId]);
      } else if (lists.length > 0) {
        setSelectedLists([lists[0].id]);
      }
    }
  }, [lists, selectedLists.length]);

  // Handle rating selection from overlay
  const handleRatingSelect = (rating) => {
    setSelectedRating(rating);
    setRating(rating);
    setShowRatingOverlay(false);
  };

  // Update state when AI metadata becomes available
  useEffect(() => {
    if (aiMetadata) {
      setProductName(aiMetadata.productName);
      setProductType(aiMetadata.productType);
      setTags(aiMetadata.tags);
      setCertainty(aiMetadata.certainty);
      setActiveTags(aiMetadata.tags || []);
      // Auto-fill the quality overview/description from AI
      setQualityOverview(aiMetadata.species || '');
      // Attributes will be synced by the rating useEffect
      
      // Notify parent component of AI update
      if (onUpdateAI) {
        onUpdateAI(aiMetadata);
      }
    }
  }, [aiMetadata, onUpdateAI]);

  // Sync attributes with overall rating when user changes rating
  useEffect(() => {
    if (rating > 0) {
      setAttributes({
        aroma: rating,
        texture: rating,
        freshness: rating,
        balance: rating,
        value: rating
      });
    }
  }, [rating]);

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
    console.log('🔍 Save button clicked');
    console.log('🔍 selectedLists:', selectedLists);
    console.log('🔍 selectedLists type:', typeof selectedLists);
    console.log('🔍 selectedLists isArray:', Array.isArray(selectedLists));
    console.log('🔍 selectedLists JSON:', JSON.stringify(selectedLists));
    console.log('🔍 rating:', rating);
    console.log('🔍 selectedLists.length:', selectedLists.length);
    
    if (selectedLists.length === 0) return;
    console.log('🔍 Validation passed, proceeding with save');
    
    const isStayAway = rating <= 2;
    const newItem = buildItem({
      productName,
      productType,
      certainty,
      tags: activeTags,
      image: currentImage,
      rating,
      notes,
      qualityOverview,
      place,
      location
    });
    console.log('🔍 Built item:', newItem);
    console.log('🔍 Built item JSON:', JSON.stringify(newItem, null, 2));
    console.log('🔍 Calling onSave with:', selectedLists, newItem, isStayAway);
    console.log('🔍 onSave parameters JSON:', JSON.stringify({
      selectedLists,
      newItem,
      isStayAway
    }, null, 2));
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
      setShowAdditionalTags(false);
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
    if (rating <= 2) return 'AVOID';
    if (rating >= 4) return 'LOVE';
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

  // Get device location
  const getCurrentLocation = async () => {
    if (!Capacitor.isNativePlatform()) {
      // Web fallback - use browser geolocation
      if (navigator.geolocation) {
        setIsLoadingLocation(true);
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const coordsText = `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
              try {
                const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
                const geo = await resp.json();
                if (geo.address) {
                  const city = geo.address.city || geo.address.town || geo.address.village || geo.address.hamlet || '';
                  const country = geo.address.country || '';
                  const place = [city, country].filter(Boolean).join(', ');
                  setLocation(place || coordsText);
                } else {
                  setLocation(coordsText);
                }
              } catch (e) {
                setLocation(coordsText);
              }
            } catch (error) {
              setLocation('Location detected');
            }
            setIsLoadingLocation(false);
          },
          (error) => {
            console.error('Error getting location:', error);
            setIsLoadingLocation(false);
          }
        );
      }
      return;
    }

    try {
      setIsLoadingLocation(true);
      const position = await Geolocation.getCurrentPosition();
      const coordsText = `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
      try {
        const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
        const geo = await resp.json();
        if (geo.address) {
          const city = geo.address.city || geo.address.town || geo.address.village || geo.address.hamlet || '';
          const country = geo.address.country || '';
          const place = [city, country].filter(Boolean).join(', ');
          setLocation(place || coordsText);
        } else {
          setLocation(coordsText);
        }
      } catch (e) {
        setLocation(coordsText);
      }
    } catch (error) {
      console.error('Error getting location:', error);
      setLocation('Location unavailable');
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Auto-fetch location on mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  return (
    <div className="fixed inset-0 bg-stone-50 flex flex-col z-50" style={{ backgroundColor: '#F6F6F4' }}>
      {/* Hero Image Section - 35% of screen */}
      <div className={`relative h-[35vh] overflow-hidden ${showRatingOverlay ? 'hidden' : ''}`}>
        {/* Cinematic AI Loading Effect (from original) */}
        {isAIProcessing && (
          <div className="absolute inset-0 z-10 pointer-events-none">
            {/* Scanning line animation */}
            <div className="absolute inset-0">
              <div className="absolute h-full w-1 left-1/2 -translate-x-1/2 bg-gradient-to-b from-transparent via-blue-400 to-transparent animate-pulse opacity-70" style={{animationDuration:'1.2s'}}></div>
            </div>
            {/* Shimmer overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer"></div>
            {/* AI icon in center */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white/95 rounded-full p-3 shadow-xl animate-pulse border-2 border-blue-200 relative">
                <Sparkles className="w-6 h-6 text-blue-500" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping"></div>
              </div>
            </div>
            {/* Cancel Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg pointer-events-auto z-30"
            >
              <X className="w-4 h-4 text-gray-700" />
            </button>
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
            onClick={() => {
              setZoom(1);
              setCrop({ x: 0, y: 0 });
              setIsCropping(true);
            }}
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
                showGrid={true}
                cropShape="rect"
                zoomSpeed={0.5}
                minZoom={0.5}
                maxZoom={4}
                wheelZoomSpeed={0.02}
                disableAutomaticStylesInjection={false}
              />
            </div>
            
            {/* Instructions */}
            <div className="absolute top-16 left-1/2 transform -translate-x-1/2 bg-black/60 rounded-lg px-4 py-2">
              <p className="text-white text-sm text-center">
                Drag to move • Pinch to zoom • Drag corners to resize
              </p>
            </div>
            
            {/* Cancel & Confirm */}
            <button
              onClick={() => {
                setZoom(1);
                setCrop({ x: 0, y: 0 });
                setIsCropping(false);
              }}
              className="absolute top-6 left-4 w-10 h-10 bg-white/85 rounded-full flex items-center justify-center shadow-lg active:scale-95"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>
            <button
              onClick={async () => {
                const cropped = await getCroppedImg();
                setCurrentImage(cropped);
                setZoom(1);
                setCrop({ x: 0, y: 0 });
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
        className={`flex-1 bg-white rounded-t-3xl shadow-xl overflow-hidden -mt-6 relative z-10 mx-4 ${showRatingOverlay ? 'hidden' : ''}`}
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
                  <div className="flex items-center gap-1">
                    <Plus className="w-3 h-3" />
                    <span className="text-gray-400 font-normal">Add tags</span>
                  </div>
                </button>
              )}
              
              {/* Inline tag input when showAdditionalTags is true */}
              {showAdditionalTags && !isAIProcessing && (
                <div className="flex gap-1 items-center order-first">
                  <input
                    type="text"
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        addCustomTag();
                      } else if (e.key === 'Escape') {
                        setShowAdditionalTags(false);
                        setCustomTag('');
                      }
                    }}
                    placeholder="Add tag..."
                    className="px-2 py-1 text-xs border border-gray-200 rounded-full focus:outline-none focus:border-teal-700 w-28"
                    autoFocus
                  />
                  <button
                    onClick={addCustomTag}
                    className="px-3 py-1.5 bg-teal-700 text-white rounded-full text-xs hover:bg-teal-800 transition-colors min-w-[32px] flex items-center justify-center"
                    style={{ backgroundColor: '#1F6D5A' }}
                  >
                    ✓
                  </button>
                </div>
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
                  placeholder="Product name..."
                />
                {!isAIProcessing && aiMetadata && (
                  <div className="flex items-center gap-1 bg-stone-50 rounded-full px-2 py-0.5" style={{ backgroundColor: '#FAFAF9' }}>
                    <Sparkles className="w-2.5 h-2.5 text-gray-400" />
                    <span className="text-xs text-gray-400">AI</span>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{certainty > 0 ? `${Math.round(certainty)}%` : 'N/A'}</span>
                  </div>
                )}
              </div>
              
              {/* Overall Rating Section - moved here */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <StarRating rating={rating} onChange={setRating} editable={!isAIProcessing} />
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
            </div>

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

            {/* Quality Overview - Auto-filled description */}
            <div className="mb-6">
              <textarea
                value={qualityOverview}
                onChange={(e) => setQualityOverview(e.target.value)}
                disabled={isAIProcessing}
                placeholder={
                  isAIProcessing 
                    ? "AI is analyzing the image..." 
                    : "Describe this item..."
                }
                className="w-full text-sm text-gray-700 leading-relaxed bg-transparent border-none outline-none resize-none"
                rows={3}
              />
            </div>

            {/* Flavor Notes section removed per latest design */}

            {/* Location */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900">Location</h3>
              </div>
              <div className="flex gap-3">
                {/* Place name (left) */}
                <div className="flex-1">
                  <input
                    type="text"
                    value={place}
                    onChange={(e) => setPlace(e.target.value)}
                    placeholder="Place name.."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-700"
                  />
                </div>
                
                {/* GPS location (right) */}
                <div className="text-right min-w-[120px]">
                  {isLoadingLocation ? (
                    <div className="flex items-center justify-end gap-2 px-3 py-2">
                      <div className="w-3 h-3 border border-teal-700 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm text-gray-500">Getting...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-1 text-sm text-gray-600 px-3 py-2">
                      <MapPin className="w-4 h-4" />
                      <span>{location}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* List Selection */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900">Select lists</h3>
                <button
                  onClick={() => setShowListDropdown(!showListDropdown)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg text-sm relative"
                >
                  {showListDropdown && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowListDropdown(false);
                      }}
                      className="absolute -left-12 px-2 py-1 bg-teal-700 text-white text-xs rounded-lg font-medium"
                      style={{ backgroundColor: '#1F6D5A' }}
                    >
                      Done
                    </button>
                  )}
                  <span>{getSelectedListName()}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showListDropdown ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Dropdown */}
              {showListDropdown && (
                <>
                  {/* Click away overlay */}
                  <div 
                    className="fixed inset-0 bg-transparent z-10"
                    onClick={() => setShowListDropdown(false)}
                  />
                  <div className="relative">
                    <div className="absolute top-0 left-0 right-0 bg-white rounded-xl shadow-lg border border-gray-200 z-20 max-h-64 overflow-y-auto">
                      
                      {/* List options */}
                      <div className="py-2">
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
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleSave}
                disabled={selectedLists.length === 0 || isAIProcessing}
                className={`flex-1 h-13 rounded-full font-semibold text-base flex items-center justify-center gap-2 mr-4 transition-all duration-200 ${
                  selectedLists.length > 0 && !isAIProcessing
                    ? 'bg-teal-700 text-white hover:bg-teal-800 active:scale-95'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                style={{ 
                  backgroundColor: selectedLists.length > 0 && !isAIProcessing ? '#1F6D5A' : undefined,
                  height: '52px' 
                }}
              >
                <Plus className="w-5 h-5" />
                {rating <= 2 ? 'Add to Stay Aways' : rating >= 4 ? 'Add to Favorites' : 'Add to Lists'}
              </button>
              
              <div className="text-right">
                {isEditingPrice ? (
                  <input
                    type="text"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    onBlur={handlePriceSave}
                    onKeyDown={(e) => e.key === 'Enter' && handlePriceSave()}
                    className="text-lg font-semibold text-gray-900 bg-transparent border-b border-gray-300 focus:border-teal-700 outline-none w-32 text-right"
                    autoFocus
                  />
                ) : (
                  <div 
                    onClick={handlePriceEdit}
                    className="cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                  >
                    <div className="text-lg font-semibold text-gray-900">{editPrice || 'Add price'}</div>
                    <div className="text-xs text-gray-500">Cost</div>
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

      {/* Rating Overlay (Sparkle Screen) */}
      <AnimatePresence>
        {showRatingOverlay && (
          <RatingOverlay
            image={currentImage}
            onRatingSelect={handleRatingSelect}
            isVisible={true}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default AddItemModal;
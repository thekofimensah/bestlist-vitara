import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Sparkles, Check, ArrowLeft, ArrowRight, SkipForward, Plus, Star, ChevronDown, ChevronUp, Edit3, Navigation } from 'lucide-react';
import { buildItem } from '../hooks/itemUtils';
import Cropper from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
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
  onUpdateAI,
  photoMetadata
}) => {
  
  const [currentImage, setCurrentImage] = useState(image); // image shown & saved
  const [isCropping, setIsCropping] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  
  // Rating overlay state
  const [showRatingOverlay, setShowRatingOverlay] = useState(showRatingFirst);
  const [selectedRating, setSelectedRating] = useState(null);
  
  // AI retry state
  const [aiRetryCount, setAiRetryCount] = useState(0);
  const [aiCancelled, setAiCancelled] = useState(false);
  
  // Full screen photo view state
  const [showFullScreenPhoto, setShowFullScreenPhoto] = useState(false);
  
  // AI Summary section state
  const [showAISummary, setShowAISummary] = useState(false);

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
    return initialState?.productName ?? item?.name ?? '';
  });
  const [productType, setProductType] = useState(() => {
    if (aiMetadata?.productType) return aiMetadata.productType;
    return initialState?.productType ?? item?.type ?? '';
  });
  const [tags, setTags] = useState(() => {
    if (aiMetadata?.tags) return aiMetadata.tags;
    return initialState?.tags ?? item?.tags ?? [];
  });
  const [certainty, setCertainty] = useState(() => {
    if (aiMetadata?.certainty) return aiMetadata.certainty;
    return initialState?.certainty ?? item?.certainty ?? 0;
  });
  const [location, setLocation] = useState(initialState?.location ?? item?.location ?? 'Current Location');
  const [locationSearch, setLocationSearch] = useState('');
  const [locationResults, setLocationResults] = useState([]);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const [isSearchingLocation, setIsSearchingLocation] = useState(false);
  const [recentLocations, setRecentLocations] = useState(() => {
    try {
      const saved = localStorage.getItem('recentLocations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  
  // Debounced location search
  useEffect(() => {
    if (locationSearch.length < 2) {
      setLocationResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsSearchingLocation(true);
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationSearch)}&limit=5`
        );
        const results = await response.json();
        setLocationResults(results.map(r => {
          // Extract city from various possible fields
          const city = r.address?.city || r.address?.town || r.address?.village || r.name || r.display_name.split(',')[0];
          
          // Extract country from address or fallback to parsing display_name
          let country = r.address?.country;
          if (!country && r.display_name) {
            // Try to extract country from the end of display_name
            const parts = r.display_name.split(',').map(p => p.trim());
            country = parts[parts.length - 1]; // Last part is usually the country
          }
          
          return {
            display: r.display_name,
            name: r.name || r.display_name.split(',')[0],
            city: city,
            country: country || '',
            lat: r.lat,
            lon: r.lon
          };
        }));
      } catch (error) {
        console.error('Location search error:', error);
        setLocationResults([]);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(searchTimeout);
  }, [locationSearch]);
  const [place, setPlace] = useState('');
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [rarity, setRarity] = useState(1); // 1=Common, 2=Uncommon, 3=Rare
  const [showListDropdown, setShowListDropdown] = useState(false);
  const listDropdownRef = useRef(null);

  // Scroll to list dropdown when it opens
  useEffect(() => {
    if (showListDropdown) {
      // Wait for dropdown to render first
      setTimeout(() => {
        listDropdownRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center', // Center the dropdown in viewport
          inline: 'nearest'
        });
      }, 100);
    }
  }, [showListDropdown]);

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
    if (tags && tags.length > 0) {
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
    console.log('Rating selected from overlay:', rating);
    setSelectedRating(rating);
    setRating(rating);
    setShowRatingOverlay(false);
  };

  // State for allergens
  const [allergens, setAllergens] = useState([]);

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
      // Set allergens from AI data
      setAllergens(aiMetadata.allergens || []);
      // Attributes will be synced by the rating useEffect
      
      // Notify parent component of AI update
      if (onUpdateAI) {
        onUpdateAI(aiMetadata);
      }
    }
  }, [aiMetadata]);

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
      setActiveTags([tagToAdd, ...activeTags]);
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
      setActiveTags([customTag.trim(), ...activeTags]);
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

  const getRatingLabel = (rating) => {
    const labels = {
      1: 'Hate',
      2: 'Avoid', 
      3: 'Meh',
      4: 'Like',
      5: 'Love'
    };
    return labels[rating] || '';
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

  // Get device location with improved error handling
  const getCurrentLocation = async () => {
    setIsLoadingLocation(true);
    
    try {
      let position;
      
      if (Capacitor.isNativePlatform()) {
        // Try native geolocation first
        try {
          position = await Geolocation.getCurrentPosition({
            enableHighAccuracy: false, // Use less battery
            timeout: 10000, // 10 second timeout
            maximumAge: 300000 // Accept 5-minute old position
          });
        } catch (nativeError) {
          console.log('Native geolocation failed, trying web fallback:', nativeError);
          // Fall back to web geolocation even on native
          if (navigator.geolocation) {
            position = await new Promise((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 300000
              });
            });
          } else {
            throw new Error('No geolocation available');
          }
        }
      } else {
        // Web platform - use browser geolocation
        if (navigator.geolocation) {
          position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: false,
              timeout: 10000,
              maximumAge: 300000
            });
          });
        } else {
          throw new Error('Geolocation not supported');
        }
      }

      // If we got a position, process it
      if (position?.coords) {
        const coordsText = `${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`;
        
        try {
          // Try reverse geocoding
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
        } catch (geocodeError) {
          console.log('Reverse geocoding failed, using coordinates:', geocodeError);
          setLocation(coordsText);
        }
      } else {
        throw new Error('No position data received');
      }
      
    } catch (error) {
      console.log('All location methods failed:', error);
      // Don't change location if it's already set from EXIF or other source
      if (location === 'Current Location') {
        setLocation('Location not available');
      }
    } finally {
      setIsLoadingLocation(false);
    }
  };

  // Track if location was manually set to prevent overriding
  const [locationManuallySet, setLocationManuallySet] = useState(false);

  // Auto-fetch location on mount (only if no location available and not manually set)
  useEffect(() => {
    // Don't fetch current location if we already have location from other sources or it was manually set
    if (!photoMetadata?.location && !initialState?.location && !item?.location && !locationManuallySet && location === 'Current Location') {
      getCurrentLocation();
    }
  }, [photoMetadata?.location, initialState?.location, item?.location, locationManuallySet, location]);

  // Handle Android back button/gesture
  useEffect(() => {
    let backButtonListener;
    
    const setupBackButton = async () => {
      if (Capacitor.isNativePlatform()) {
        backButtonListener = await App.addListener('backButton', () => {
          // Handle back button press in modal
          if (showFullScreenPhoto) {
            setShowFullScreenPhoto(false);
          } else if (isCropping) {
            setIsCropping(false);
          } else if (showCreateListDialog) {
            setShowCreateListDialog(false);
          } else if (showLocationSearch) {
            setShowLocationSearch(false);
          } else {
            // Close the modal
            onClose();
          }
        });
      }
    };

    setupBackButton();

    // Cleanup
    return () => {
      if (backButtonListener) {
        backButtonListener.remove();
      }
    };
  }, [showFullScreenPhoto, isCropping, showCreateListDialog, showLocationSearch, onClose]);

  // Handle photo click to show full screen
  const handlePhotoClick = () => {
    if (!isAIProcessing) {
      setShowFullScreenPhoto(true);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-stone-50 z-50 overflow-y-auto modal-overlay" 
      style={{ 
        backgroundColor: '#F6F6F4',
        // Allow native gestures on the edges
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        // Don't intercept touch events on edges
        touchAction: 'pan-y'
      }}
    >
      {/* Hero Image Section */}
      <div 
        className={`relative overflow-hidden ${showRatingOverlay ? 'hidden' : ''}`}
        style={{ height: '350px' }}
      >
        {/* Cinematic AI Loading Effect (from original) */}
        {(isAIProcessing && !aiCancelled) && (
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
            {/* Cancel AI Button - centered */}
            <button
              onClick={() => {
                setAiCancelled(true);
                if (onUpdateAI) {
                  onUpdateAI(null); // Stop AI processing
                }
              }}
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg pointer-events-auto z-30 mt-16"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        )}

        {/* AI Failed/Cancelled State */}
        {aiCancelled && aiRetryCount < 3 && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/20">
            <div className="bg-white rounded-2xl p-6 mx-6 text-center shadow-xl">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Analysis Stopped</h3>
              <p className="text-sm text-gray-600 mb-4">Would you like to retry the analysis?</p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setAiCancelled(false);
                    setAiRetryCount(prev => prev + 1);
                    // Trigger retry logic here
                  }}
                  className="flex-1 px-4 py-2 bg-teal-700 text-white rounded-xl font-medium"
                  style={{ backgroundColor: '#1F6D5A' }}
                >
                  Retry ({3 - aiRetryCount} left)
                </button>
                <button
                  onClick={() => {
                    setAiCancelled(false);
                    // Continue without AI
                  }}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <img
          src={currentImage}
          alt="Food item"
          className={`w-full h-full object-cover transition-all duration-500 cursor-pointer ${
            isAIProcessing ? 'saturate-150 contrast-110' : 'saturate-100 contrast-100'
          }`}
          onClick={handlePhotoClick}
        />


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

      {/* Overlapping Data Card */}
      <div 
        className={`rounded-t-3xl shadow-xl relative z-10 mx-4 ${showRatingOverlay ? 'hidden' : ''}`}
        style={{
          backgroundColor: 'white',
          borderTopLeftRadius: '48px',
          borderTopRightRadius: '48px',
          boxShadow: '0 8px 24px -4px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.05)',
          marginTop: '-24px',
          minHeight: 'calc(100vh - 326px)' // Ensure it fills remaining space
        }}
      >
        {/* Scrollable content */}
        <div className="h-full overflow-y-auto">
          <div className="p-6 pb-20 min-h-full">
            {/* Category Pills */}
            <div className="flex gap-2 mb-4 overflow-x-auto items-center">
              {!isAIProcessing && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowAdditionalTags(!showAdditionalTags)}
                    className="px-3 py-1.5 bg-teal-100 text-teal-700 rounded-full text-xs font-medium whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                      <Plus className="w-3 h-3" />
                    </div>
                  </button>

                  {showAdditionalTags && (
                    <div className="flex gap-1 items-center">
                      <input
                        type="text"
                        value={customTag}
                        onChange={(e) => setCustomTag(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') addCustomTag();
                          else if (e.key === 'Escape') {
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
              )}
              
              {/* Loading placeholders for tags when AI is processing */}
              {isAIProcessing && (
                <>
                  <div className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap w-16 h-6 loading-tag"></div>
                  <div className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap w-20 h-6 loading-tag"></div>
                  <div className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap w-14 h-6 loading-tag"></div>
                </>
              )}
              
              {!isAIProcessing && activeTags.map((tag, index) => (
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
            </div>

            {/* Item Header */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                {isAIProcessing ? (
                  <div className="h-7 bg-gray-200 rounded-lg flex-1 skeleton-shimmer"></div>
                ) : (
                  <input
                    type="text"
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    className="text-xl font-semibold text-gray-900 bg-transparent border-none outline-none flex-1 placeholder:text-base placeholder:font-normal placeholder:text-gray-400"
                    placeholder="Product name..."
                  />
                )}
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
                  <div className="flex items-center gap-3">
                    <StarRating rating={rating} onChange={setRating} editable={!isAIProcessing} showNumber={false} />
                    <span className="text-sm font-medium text-gray-600">{getRatingLabel(rating)}</span>
                  </div>
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
                
                <div className="flex items-center gap-3 mt-4">
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

            {/* AI Summary & Details Section */}
            <div className="mb-6">
              <button
                onClick={() => setShowAISummary(!showAISummary)}
                className="flex items-center justify-between w-full p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  <span className="text-sm font-medium text-gray-900">AI Summary & Details</span>
                </div>
                {showAISummary ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </button>
              
              {showAISummary && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 space-y-4"
                >
                  {/* AI Description */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-600 mb-2">Description</h4>
                    <textarea
                      value={qualityOverview}
                      onChange={(e) => setQualityOverview(e.target.value)}
                      disabled={isAIProcessing}
                      placeholder={
                        isAIProcessing 
                          ? "AI is analyzing the image..." 
                          : "Describe this item..."
                      }
                      className="w-full text-sm text-gray-700 leading-relaxed bg-white border border-gray-200 rounded-lg p-3 outline-none focus:border-teal-700 resize-none"
                      rows={3}
                    />
                  </div>
                  
                  {/* Allergens */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-600 mb-2">Allergens</h4>
                    <div className="flex flex-wrap gap-2">
                      {allergens.length > 0 ? (
                        allergens.map((allergen) => (
                          <span
                            key={allergen}
                            className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium"
                          >
                            {allergen}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">No allergens detected</span>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Flavor Notes section removed per latest design */}

            {/* Location */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-medium text-gray-900">Location</h3>
                  {photoMetadata?.location && (
                    <div className="flex items-center gap-1 bg-blue-50 rounded-full px-2 py-0.5">
                      <span className="text-xs text-blue-600 font-medium">📷 From Photo</span>
                    </div>
                  )}
                  {photoMetadata?.dateTime && (
                    <div className="flex items-center gap-1 bg-green-50 rounded-full px-2 py-0.5">
                      <span className="text-xs text-green-600 font-medium">🕒 {new Date(photoMetadata.dateTime).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
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
                
                {/* Location with search (right) */}
                <div className="relative min-w-[200px]">
                  {showLocationSearch ? (
                    <div className="absolute right-0 top-0 w-full z-10">
                      <div className="bg-white rounded-lg shadow-xl border border-gray-200">
                        {/* Search input */}
                        <div className="p-2 border-b border-gray-100">
                          <div className="relative">
                            <input
                              type="text"
                              value={locationSearch}
                              onChange={(e) => setLocationSearch(e.target.value)}
                              placeholder="Search location..."
                              className="w-full pl-8 pr-3 py-2 text-sm bg-gray-50 rounded-lg focus:outline-none focus:bg-white focus:border-teal-700"
                              autoFocus
                            />
                            <MapPin className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
                            {isSearchingLocation && (
                              <div className="absolute right-2 top-2.5">
                                <div className="w-4 h-4 border-2 border-teal-700 border-t-transparent rounded-full animate-spin"></div>
                              </div>
                            )}
                          </div>
                        </div>
                        
                                                  {/* Results */}
                          <div className="max-h-48 overflow-y-auto">
                            {/* Recently selected */}
                            {recentLocations.length > 0 && locationSearch.length < 2 && (
                              <>
                                <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                                  Recently selected
                                </div>
                                {recentLocations.map((recentLocation, index) => (
                                  <button
                                    key={`recent-${index}`}
                                    onClick={() => {
                                      setLocation(recentLocation);
                                      setLocationManuallySet(true);
                                      setShowLocationSearch(false);
                                      setLocationSearch('');
                                    }}
                                    className="w-full p-2 text-left hover:bg-gray-50 flex items-start gap-2"
                                  >
                                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                    <div>
                                      <div className="text-sm font-medium text-gray-900">
                                        {recentLocation}
                                      </div>
                                    </div>
                                  </button>
                                ))}
                                {locationResults.length > 0 && (
                                  <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                                    Search results
                                  </div>
                                )}
                              </>
                            )}
                            
                            {locationResults.length > 0 ? (
                              locationResults.map((result, index) => (
                              <button
                                key={index}
                                                                  onClick={() => {
                                    // Format as city + country
                                    const city = result.city;
                                    const country = result.country;
                                    const newLocation = [city, country].filter(Boolean).join(', ');
                                    

                                    setLocation(newLocation);
                                    setLocationManuallySet(true); // Prevent auto-location from overriding
                                    
                                    // Save to recent locations
                                    const updatedRecent = [
                                      newLocation,
                                      ...recentLocations.filter(loc => loc !== newLocation)
                                    ].slice(0, 5); // Keep only 5 recent
                                    setRecentLocations(updatedRecent);
                                    localStorage.setItem('recentLocations', JSON.stringify(updatedRecent));
                                    
                                    setShowLocationSearch(false);
                                    setLocationSearch('');
                                  }}
                                className="w-full p-2 text-left hover:bg-gray-50 flex items-start gap-2"
                              >
                                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                <div>
                                  <div className="text-sm font-medium text-gray-900">
                                    {[result.city, result.country].filter(Boolean).join(', ')}
                                  </div>
                                  <div className="text-xs text-gray-500 truncate">
                                    {result.display}
                                  </div>
                                </div>
                              </button>
                            ))
                          ) : locationSearch.length >= 2 ? (
                            <div className="p-3 text-center text-sm text-gray-500">
                              No locations found
                            </div>
                          ) : (
                            <div className="p-3 text-center text-sm text-gray-500">
                              Type to search locations
                            </div>
                          )}
                        </div>
                        
                        {/* Close button */}
                        <div className="p-2 border-t border-gray-100">
                          <button
                            onClick={() => {
                              setShowLocationSearch(false);
                              setLocationSearch('');
                            }}
                            className="w-full px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 rounded"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowLocationSearch(true)}
                      className="w-full flex items-center justify-end gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors text-right"
                    >
                      <span className="truncate">{location}</span>
                      <MapPin className="w-4 h-4 flex-shrink-0" />
                    </button>
                                      )}
                  </div>
              </div>
            </div>

            {/* List Selection */}
            <div className="mb-16" ref={listDropdownRef}>
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
                    <div className="absolute top-0 left-0 right-0 bg-white rounded-xl shadow-lg border border-gray-200 z-20 max-h-80 overflow-y-auto mb-4" style={{ maxHeight: 'min(80vh, 320px)', marginBottom: '100px' }}>
                      
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
                Add to Lists
              </button>
              
              <div className="text-right">
                {isEditingPrice ? (
                  <input
                    type="text"
                    inputMode="decimal"
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

      {/* Full Screen Photo View */}
      <AnimatePresence>
        {showFullScreenPhoto && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 bg-black/50 backdrop-blur-sm">
              <button
                onClick={() => setShowFullScreenPhoto(false)}
                className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center"
              >
                <X className="w-5 h-5 text-white" />
              </button>
              
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setShowFullScreenPhoto(false);
                    setIsCropping(true);
                  }}
                  className="px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full flex items-center gap-2 text-white font-medium"
                >
                  <span>Crop</span>
                </button>
              </div>
            </div>

            {/* Full screen image */}
            <div 
              className="flex-1 flex items-center justify-center p-4"
              onClick={(e) => {
                // Click outside image to close
                if (e.target === e.currentTarget) {
                  setShowFullScreenPhoto(false);
                }
              }}
            >
              <img
                src={currentImage}
                alt="Food item"
                className="max-w-full max-h-full object-contain"
                style={{ maxHeight: 'calc(100vh - 120px)' }}
              />
            </div>

            {/* Tap to close hint */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-black/60 rounded-lg px-4 py-2">
              <p className="text-white text-sm text-center">
                Tap outside image to close
              </p>
          </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modern Crop Interface */}
      <AnimatePresence>
        {isCropping && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black z-50 flex flex-col"
          >
            {/* Crop Header */}
            <div className="flex items-center justify-between p-4 bg-black">
              <button
                onClick={() => {
                  setZoom(1);
                  setCrop({ x: 0, y: 0 });
                  setIsCropping(false);
                }}
                className="px-4 py-2 text-white font-medium"
              >
                Cancel
              </button>
              
              <h2 className="text-white font-semibold">Crop Photo</h2>
              
              <button
                onClick={async () => {
                  try {
                    const cropped = await getCroppedImg();
                    setCurrentImage(cropped);
                    setZoom(1);
                    setCrop({ x: 0, y: 0 });
                    setIsCropping(false);
                  } catch (error) {
                    console.error('Crop error:', error);
                  }
                }}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium"
              >
                Done
              </button>
            </div>

            {/* Cropper */}
            <div className="flex-1 relative">
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
                style={{
                  containerStyle: {
                    width: '100%',
                    height: '100%',
                    backgroundColor: '#000'
                  },
                  cropAreaStyle: {
                    border: '2px solid #fff',
                    borderRadius: '8px'
                  }
                }}
              />
            </div>

            {/* Zoom Controls */}
            <div className="bg-black p-4">
              <div className="flex items-center gap-4 max-w-sm mx-auto">
                <span className="text-white text-sm">Zoom</span>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: '#374151',
                    outline: 'none'
                  }}
                />
                <span className="text-white text-sm w-8">{zoom.toFixed(1)}x</span>
      </div>
      
              <div className="text-center mt-3">
                <p className="text-gray-400 text-sm">
                  Drag to move • Pinch to zoom • Adjust slider for fine control
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
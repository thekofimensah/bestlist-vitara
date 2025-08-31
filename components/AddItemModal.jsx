import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Sparkles, ArrowLeft,ArrowRight, SkipForward,  Plus, Star, ChevronDown, ChevronUp, Share } from 'lucide-react';
import { buildItem } from '../hooks/itemUtils';
import { RatingOverlay } from './Elements';
import SmartImage from './secondary/SmartImage';
import Cropper from 'react-easy-crop';
import 'react-easy-crop/react-easy-crop.css';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { 
  allCurrencies, 
  getCurrencyInfo, 
  getCurrencyFromLocale,
  getSmartCurrencyGuess,
  formatPriceInput,
  getRecentCurrencies,
  saveRecentCurrency,
  getCurrencyDisplay,
  getCurrencyFromCountryName
} from '../lib/currencyUtils';
import { createPost, deleteItemAndRelated } from '../lib/supabase';
import { prependProfilePost } from '../hooks/useOptimizedFeed';
import { supabase } from '../lib/supabase';
import { getInstagramClassicFilter } from '../lib/imageUtils';
import AchievementGlow from './gamification/AchievementGlow';
import FirstInWorldBadge from './gamification/FirstInWorldBadge';
import { useGlobalAchievements } from '../hooks/useGlobalAchievements';
import ShareModal from './secondary/ShareModal';

// Word suggestion (Phase 3 - AI Integration)
import HorizontalSuggestions from './wordSuggestions/HorizontalSuggestions';
import { useWordSuggestions } from '../hooks/useWordSuggestions';


const StarRating = ({ rating, showNumber = true, editable = true, onChange }) => {
  const [justClicked, setJustClicked] = useState(null);
  
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
      setJustClicked(index);
      onChange(index); // Use 1-5 scale
      
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(30);
      }
      
      // Reset animation after delay
      setTimeout(() => setJustClicked(null), 600);
    }
  };

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((index) => (
        <motion.div
          key={index}
          className="relative"
          animate={justClicked === index ? {
            scale: [1, 1.5, 1.2, 1],
            rotate: [0, -10, 10, 0]
          } : {}}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 15,
            duration: 0.6
          }}
        >
          <Star
            className={`w-6 h-6 ${editable ? 'cursor-pointer hover:scale-110 transition-transform' : ''} ${
              justClicked === index ? 'drop-shadow-lg' : ''
            }`}
            style={{ color: getStarColor(index) }}
            onClick={editable ? () => handleStarClick(index) : undefined}
            fill={getStarFill(index)}
          />
          
          {/* Fun particle burst effect */}
          <AnimatePresence>
            {justClicked === index && (
              <>
                {[...Array(8)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-1 h-1 rounded-full"
                    style={{
                      backgroundColor: getStarColor(index),
                      left: '50%',
                      top: '50%'
                    }}
                    initial={{ 
                      opacity: 1, 
                      scale: 1,
                      x: 0,
                      y: 0
                    }}
                    animate={{ 
                      opacity: 0,
                      scale: 0,
                      x: (Math.cos((i * 45) * Math.PI / 180) * 20),
                      y: (Math.sin((i * 45) * Math.PI / 180) * 20)
                    }}
                    exit={{ opacity: 0 }}
                    transition={{ 
                      duration: 0.5,
                      ease: "easeOut"
                    }}
                  />
                ))}
                
                {/* Glow ring effect */}
                <motion.div
                  className="absolute inset-0 rounded-full border-2 opacity-60"
                  style={{
                    borderColor: getStarColor(index),
                    left: '-4px',
                    top: '-4px',
                    right: '-4px',
                    bottom: '-4px'
                  }}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ 
                    scale: [0.8, 2, 3], 
                    opacity: [0.6, 0.3, 0] 
                  }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.6 }}
                />
              </>
            )}
          </AnimatePresence>
        </motion.div>
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
  photoMetadata,
  aiError,
  onRetryAI,
  aiTriggeredAchievements
}) => {
  
  // Removed verbose init logs to avoid noise on each re-render
  
  const [currentImage, setCurrentImage] = useState(image); // image shown & saved
  
  // Update currentImage when storage URL becomes available
  useEffect(() => {
    if (image && image !== currentImage) {
      // If we receive a new storage URL (HTTPS), update to use it
      if (image.startsWith('https://') && currentImage && currentImage.startsWith('data:')) {
        console.log('🔄 [AddItemModal] Switching from Base64 to storage URL:', image.substring(0, 50) + '...');
        setCurrentImage(image);
      }
    }
  }, [image, currentImage]);


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
  const [createListError, setCreateListError] = useState(null);
  
  // First in World achievement state
  const [firstInWorldAchievement, setFirstInWorldAchievement] = useState(() => {
    // Check if editing an existing first-in-world item
    if (item?.is_first_in_world || item?.first_in_world_achievement_id) {
      const achievement = {
        id: item.first_in_world_achievement_id || 'first_in_world',
        name: 'First in World',
        rarity: 'legendary',
        icon: '🌍'
      };
      console.log('🧪 Initial first-in-world achievement set:', achievement);
      return achievement;
    }
    return null;
  });

  // Set first in world achievement from AI-triggered achievements (for glow effect)
  // Use useRef to track if we've already processed these achievements
  const processedAchievementsRef = useRef(null);
  const { showAchievement } = useGlobalAchievements();
  
  useEffect(() => {
    if (aiTriggeredAchievements && aiTriggeredAchievements.length > 0) {
      // Stringify to compare achievement arrays properly
      const achievementsKey = JSON.stringify(aiTriggeredAchievements);
      
      // Skip if we've already processed these exact achievements
      if (processedAchievementsRef.current === achievementsKey) {
        return;
      }
      
      // Find any global first achievements
      const globalFirstAchievement = aiTriggeredAchievements.find(a => a.isGlobalFirst);
      if (globalFirstAchievement) {
        console.log('🏆 [AddItemModal] Setting first in world achievement from AI:', globalFirstAchievement);
        setFirstInWorldAchievement({
          id: globalFirstAchievement.achievement?.id || globalFirstAchievement.id,
          name: globalFirstAchievement.achievement?.name || globalFirstAchievement.name,
          rarity: globalFirstAchievement.achievement?.rarity || globalFirstAchievement.rarity,
          icon: globalFirstAchievement.achievement?.icon || '🌍',
          isGlobalFirst: true
        });
        
        // Trigger an achievement toast instead of full-screen effect
        setTimeout(() => {
          showAchievement({
            achievement: {
              id: globalFirstAchievement.achievement?.id || globalFirstAchievement.id,
              name: globalFirstAchievement.achievement?.name || globalFirstAchievement.name || 'First in World',
              rarity: globalFirstAchievement.achievement?.rarity || globalFirstAchievement.rarity || 'legendary',
              icon: globalFirstAchievement.achievement?.icon || '🌍'
            },
            isGlobalFirst: true
          });
        }, 200);
        
        // Mark these achievements as processed
        processedAchievementsRef.current = achievementsKey;
      }
    }
  }, [aiTriggeredAchievements]);


  const [firstInWorldProduct, setFirstInWorldProduct] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Debug success animation state (only when it changes to true)
  useEffect(() => {
    if (showSuccessAnimation) {
      console.log('🎉 [SUCCESS] Animation showing:', successMessage);
    }
  }, [showSuccessAnimation, successMessage]);
  // LevelUpEffect removed per design
  
  // AI status toast
  const [showAIToast, setShowAIToast] = useState(false);
  const [aiToastMessage, setAiToastMessage] = useState('');
  
  // Manual AI sparkle toggle
  const [showAISparkle, setShowAISparkle] = useState(() => {
    // Default to true if we have AI metadata, false otherwise
    return Boolean(aiMetadata);
  });
  
  // First in World popup state
  const [showFirstInWorldPopup, setShowFirstInWorldPopup] = useState(false);
  
  // Auto-close countdown for first-in-world achievements
  const [autoCloseCountdown, setAutoCloseCountdown] = useState(null);

  const onCropComplete = useCallback((_ignored, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const getCroppedImg = async () => {
    return new Promise((resolve, reject) => {
      const imageObj = new Image();
      // Set crossOrigin to handle CORS images properly
      imageObj.crossOrigin = 'anonymous';
      imageObj.src = currentImage;
      imageObj.onload = () => {
        try {
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
          resolve(canvas.toDataURL('image/jpeg', 0.9));
        } catch (error) {
          console.error('Canvas crop error:', error);
          reject(error);
        }
      };
      imageObj.onerror = (e) => {
        console.error('Image load error for cropping:', e);
        reject(e);
      };
    });
  };

  const [showCreateListDialog, setShowCreateListDialog] = useState(false);
  const [isCreatingList, setIsCreatingList] = useState(false);
  // New list composer state (Best only)
  const [newListSubject, setNewListSubject] = useState('');
  const [newListLocation, setNewListLocation] = useState('');
  const [selectedLists, setSelectedLists] = useState(() => {
    if (initialState && initialState.selectedLists) return initialState.selectedLists;
    if (item && (item.list_id || item.listId)) return [item.list_id || item.listId];
    
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
    const name = initialState?.productName ?? item?.name ?? '';
    console.log('📦 [AddItemModal] Initializing productName:', JSON.stringify({
      aiMetadata_productName: aiMetadata?.productName,
      initialState_productName: initialState?.productName,
      item_name: item?.name,
      item_ai_product_name: item?.ai_product_name,
      item_user_product_name: item?.user_product_name,
      final_name: name
    }, null, 2));
    return name;
  });
  const [productNameManuallyEdited, setProductNameManuallyEdited] = useState(false);
  const [isProductNameEditing, setIsProductNameEditing] = useState(false);
  const [category, setCategory] = useState(() => {
    if (aiMetadata?.category) return aiMetadata.category;
    const cat = initialState?.category ?? item?.category ?? '';
    console.log('🏷️ [AddItemModal] Initializing category:', JSON.stringify({
      aiMetadata_category: aiMetadata?.category,
      initialState_category: initialState?.category,
      item_category: item?.category,
      item_ai_category: item?.ai_category,
      final_category: cat
    }, null, 2));
    return cat;
  });
  const [tags, setTags] = useState(() => {
    if (aiMetadata?.tags) return aiMetadata.tags;
    // Check multiple sources for existing item tags
    const tagList = initialState?.tags ?? item?.user_tags ?? item?.ai_tags ?? item?.tags ?? [];
    console.log('🏷️ [AddItemModal] Initializing tags state:', JSON.stringify({
      aiMetadata_tags: aiMetadata?.tags,
      initialState_tags: initialState?.tags,
      item_user_tags: item?.user_tags,
      item_ai_tags: item?.ai_tags,
      item_tags: item?.tags,
      final_tags: tagList
    }, null, 2));
    return tagList;
  });
  const [certainty, setCertainty] = useState(() => {
    if (aiMetadata?.certainty) return aiMetadata.certainty;
    const cert = initialState?.certainty ?? item?.certainty ?? 0;
    console.log('🎯 [AddItemModal] Initializing certainty:', JSON.stringify({
      aiMetadata_certainty: aiMetadata?.certainty,
      initialState_certainty: initialState?.certainty,
      item_certainty: item?.certainty,
      item_ai_confidence: item?.ai_confidence,
      final_certainty: cert
    }, null, 2));
    return cert;
  });
  const [location, setLocation] = useState(initialState?.location ?? item?.location ?? 'Current Location');
  const [locationSearch, setLocationSearch] = useState('');
  const [locationResults, setLocationResults] = useState([]);
  const [showLocationSearch, setShowLocationSearch] = useState(false);
  const locationDropdownRef = useRef(null);
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
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationSearch)}&limit=5&addressdetails=1&extratags=1`
        );
        const results = await response.json();
        // Sort by: prefix match > population (desc) > importance (desc)
        const query = locationSearch.trim().toLowerCase();
        const sorted = [...results].sort((a, b) => {
          const aName = (a.name || a.display_name || '').toLowerCase();
          const bName = (b.name || b.display_name || '').toLowerCase();
          const aPrefix = aName.startsWith(query) ? 1 : 0;
          const bPrefix = bName.startsWith(query) ? 1 : 0;
          if (aPrefix !== bPrefix) return bPrefix - aPrefix;
          // Prefer city/town/village
          const rankClass = (r) => {
            const t = r.type || r.addresstype || '';
            if (['city', 'town'].includes(t)) return 2;
            if (t === 'village') return 1;
            return 0;
          };
          const aRank = rankClass(a);
          const bRank = rankClass(b);
          if (aRank !== bRank) return bRank - aRank;
          // Earlier substring match index is better
          const aIdx = aName.indexOf(query);
          const bIdx = bName.indexOf(query);
          if (aIdx !== bIdx) return (aIdx === -1 ? 9999 : aIdx) - (bIdx === -1 ? 9999 : bIdx);
          const aPop = Number(a.extratags?.population) || 0;
          const bPop = Number(b.extratags?.population) || 0;
          if (aPop !== bPop) return bPop - aPop;
          const aImp = Number(a.importance) || 0;
          const bImp = Number(b.importance) || 0;
          return bImp - aImp;
        });
        setLocationResults(sorted.map(r => {
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
        console.error('Location search error:', JSON.stringify({
          message: error.message,
          name: error.name,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        }, null, 2));
        setLocationResults([]);
      } finally {
        setIsSearchingLocation(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(searchTimeout);
  }, [locationSearch]);
  const [place, setPlace] = useState('');
  
  // Debug place state changes
  useEffect(() => {
    console.log('🔍 [Places State] place state changed to:', `"${place}"`);
  }, [place]);
  const placeInputRef = useRef(null);
  const googleAutocompleteRef = useRef(null);
  const googleScriptLoadingRef = useRef(false);
  const placeDropdownRef = useRef(null);
  const [showPlaceSearch, setShowPlaceSearch] = useState(false);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [placeResults, setPlaceResults] = useState([]);
  const [selectedPlaceCoords, setSelectedPlaceCoords] = useState(null);
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [currentCoords, setCurrentCoords] = useState(null);
  // Rarity is now hardcoded to Common (1) - removed UI for now
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

  // Auto-scroll location dropdown into view when opened
  useEffect(() => {
    if (showLocationSearch) {
      setTimeout(() => {
        locationDropdownRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'nearest'
        });
      }, 50);
    }
  }, [showLocationSearch]);

  // Close location dropdown on click-away
  useEffect(() => {
    if (!showLocationSearch) return;
    const handleClickAway = (e) => {
      if (!locationDropdownRef.current) return;
      if (!locationDropdownRef.current.contains(e.target)) {
        setShowLocationSearch(false);
        setLocationSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickAway);
    document.addEventListener('touchstart', handleClickAway, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickAway);
      document.removeEventListener('touchstart', handleClickAway);
    };
  }, [showLocationSearch]);

  // Compute distance between two lat/lon points (meters)
  const haversine = (lat1, lon1, lat2, lon2) => {
    const toRad = (d) => (d * Math.PI) / 180;
    const R = 6371000;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  };

  // Debounced place search using Google Places API
  useEffect(() => {
    console.log('🔍 [Places useEffect] Called with:', { place, showPlaceSearch, currentCoords });
    if (!showPlaceSearch) {
      console.log('🔍 [Places useEffect] Exiting - showPlaceSearch is false');
      return;
    }
    const q = (place || '').trim();
    console.log('🔍 [Places Search] Starting search for:', q);
    
    if (q.length < 2) {
      console.log('🔍 [Places Search] Query too short, clearing results');
      setPlaceResults([]);
      return;
    }

    console.log('🔍 [Places Search] Setting timeout for query:', q);
    const t = setTimeout(async () => {
      console.log('🔍 [Places Search] Executing search after timeout for:', q);
      setIsSearchingPlaces(true);
      try {
        const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
        console.log('🔍 [Places Search] API Key check:', apiKey ? 'Found' : 'Missing');
        
        if (!apiKey) {
          console.error('⚠️ Google Places API key not found in VITE_GOOGLE_PLACES_API_KEY');
          setPlaceResults([]);
          return;
        }

        // Use Google Places API Text Search (New) for food establishments
        const url = `https://places.googleapis.com/v1/places:searchText`;
        
        const requestBody = {
          textQuery: q,
          maxResultCount: 8,
          locationBias: currentCoords ? {
            circle: {
              center: {
                latitude: currentCoords.lat,
                longitude: currentCoords.lon
              },
              radius: 50000 // 50km radius
            }
          } : undefined
        };

        console.log('🔍 [Places Search] Request URL:', url);
        console.log('🔍 [Places Search] Request body:', JSON.stringify(requestBody, null, 2));
        console.log('🔍 [Places Search] Using coords:', currentCoords);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.types,places.primaryType'
          },
          body: JSON.stringify(requestBody)
        });

        console.log('🔍 [Places Search] Response status:', response.status, response.statusText);
        
        if (!response.ok) {
          console.log('🔍 [Places Search] New API failed, trying fallback...');
          // Fallback to legacy Text Search if new API fails
          const types = 'restaurant|cafe|bakery|supermarket|grocery_or_supermarket|meal_takeaway|food';
          const legacyUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&type=${types}&key=${apiKey}`;
          console.log('🔍 [Places Search] Fallback URL:', legacyUrl);
          const legacyResponse = await fetch(legacyUrl);
          const legacyData = await legacyResponse.json();
          console.log('🔍 [Places Search] Fallback response:', legacyData);
          
          if (legacyData.status === 'OK' && legacyData.results) {
            const results = legacyData.results.slice(0, 8).map(result => ({
              name: result.name,
              display: result.formatted_address,
              lat: result.geometry?.location?.lat,
              lon: result.geometry?.location?.lng,
              types: result.types || [],
              rating: result.rating
            })).filter(r => r.lat && r.lon);
            
            setPlaceResults(results);
          } else {
            setPlaceResults([]);
          }
        } else {
          const data = await response.json();
          console.log('🔍 [Places Search] Main API response:', data);
          
          if (data.places && data.places.length > 0) {
            const results = data.places.map(place => ({
              name: place.displayName?.text || 'Unknown Place',
              display: place.formattedAddress || 'Address not available',
              lat: place.location?.latitude,
              lon: place.location?.longitude,
              types: place.types || [],
              primaryType: place.primaryType
            })).filter(r => r.lat && r.lon);
            
            console.log('🔍 [Places Search] Final results:', results);
            setPlaceResults(results);
          } else {
            console.log('🔍 [Places Search] No places found in response');
            setPlaceResults([]);
          }
        }
      } catch (error) {
        console.error('🔍 [Places Search] Error:', error);
        console.error('🔍 [Places Search] Error details:', error.message, error.stack);
        setPlaceResults([]);
      } finally {
        setIsSearchingPlaces(false);
      }
    }, 500);
    return () => clearTimeout(t);
  }, [place, showPlaceSearch, currentCoords]);

  // Close place dropdown on click-away
  useEffect(() => {
    if (!showPlaceSearch) return;
    const handleClickAway = (e) => {
      console.log('🔍 [Click Away] Event triggered:', e.type, e.target);
      
      // Ignore events while user is actively typing
      if (document.activeElement === placeInputRef.current) {
        console.log('🔍 [Click Away] Input is focused, ignoring click-away');
        return;
      }
      
      // Ignore touch events that might be from keyboard interaction
      if (e.type === 'touchstart' && e.target.tagName === 'DIV') {
        console.log('🔍 [Click Away] Ignoring touchstart on div (likely keyboard)');
        return;
      }
      
      if (!placeDropdownRef.current) {
        console.log('🔍 [Click Away] No dropdown ref, ignoring');
        return;
      }
      
      if (!placeDropdownRef.current.contains(e.target)) {
        console.log('🔍 [Click Away] Click outside dropdown, closing');
        setShowPlaceSearch(false);
      } else {
        console.log('🔍 [Click Away] Click inside dropdown, keeping open');
      }
    };
    document.addEventListener('mousedown', handleClickAway);
    document.addEventListener('touchstart', handleClickAway, { passive: true });
    return () => {
      document.removeEventListener('mousedown', handleClickAway);
      document.removeEventListener('touchstart', handleClickAway);
    };
  }, [showPlaceSearch]);

  const [activeTags, setActiveTags] = useState(() => {
    // Initialize from existing item data
    const tags = item?.user_tags || item?.ai_tags || item?.tags || [];
    console.log('🏷️ [AddItemModal] Initializing activeTags:', JSON.stringify({
      item_user_tags: item?.user_tags,
      item_ai_tags: item?.ai_tags,
      item_tags: item?.tags,
      final_tags: tags
    }, null, 2));
    return tags;
  });
  const [customTag, setCustomTag] = useState('');
  const [flavorNotes, setFlavorNotes] = useState([]);
  const [newFlavorNote, setNewFlavorNote] = useState('');
  const [showDetailedAttributes, setShowDetailedAttributes] = useState(false);
  const [showAdditionalTags, setShowAdditionalTags] = useState(false);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editPrice, setEditPrice] = useState(item?.price || '');
  const [currency, setCurrency] = useState('USD');
  const [showCurrencySelector, setShowCurrencySelector] = useState(false);
  const [recentCurrencies, setRecentCurrencies] = useState(() => {
    try {
      const saved = localStorage.getItem('recentCurrencies');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [qualityOverview, setQualityOverview] = useState(() => {
    // Initialize from existing item data
    const description = item?.user_description || item?.ai_description || item?.species || '';
    console.log('📝 [AddItemModal] Initializing qualityOverview:', JSON.stringify({
      item_user_description: item?.user_description,
      item_ai_description: item?.ai_description,
      item_species: item?.species,
      final_description: description
    }, null, 2));
    return description;
  });
  
  // Public/Private toggle state
  const [isPublic, setIsPublic] = useState(true);

  // Replace the static attributes state with a dynamic system
  const [newAttributeName, setNewAttributeName] = useState('');
  const [showAddAttribute, setShowAddAttribute] = useState(false);

  // Get default attributes for a list (remember user preferences)
  const getListAttributes = useCallback((listId) => {
    try {
      const saved = localStorage.getItem(`listAttributes_${listId}`);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading list attributes:', JSON.stringify({
          message: error.message,
          name: error.name,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        }, null, 2));
    }
    
    // Default attributes (removed "balance")
    return ['aroma', 'texture', 'freshness', 'value'];
  }, []);

  // Save list attributes to localStorage
  const saveListAttributes = useCallback((listId, attributes) => {
    try {
      localStorage.setItem(`listAttributes_${listId}`, JSON.stringify(attributes));
    } catch (error) {
      console.error('Error saving list attributes:', JSON.stringify({
          message: error.message,
          name: error.name,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        }, null, 2));
    }
  }, []);

  // Dynamic attributes state
  const [attributes, setAttributes] = useState({});
  const [attributeNames, setAttributeNames] = useState([]);

  // Update attributes when selected lists change
  useEffect(() => {
    if (selectedLists.length > 0) {
      const primaryListId = selectedLists[0]; // Use first selected list for attributes
      const listAttributeNames = getListAttributes(primaryListId);
      setAttributeNames(listAttributeNames);
      
      // Initialize attribute values from existing item or default to rating
      const initialAttributes = {};
      listAttributeNames.forEach(name => {
        initialAttributes[name] = item?.detailed_breakdown?.[name] || rating || 3;
      });
      setAttributes(initialAttributes);
    }
  }, [selectedLists, getListAttributes, item?.detailed_breakdown, rating]);

  // Sync attributes with overall rating when user changes rating
  useEffect(() => {
    if (rating > 0 && attributeNames.length > 0) {
      const updatedAttributes = {};
      attributeNames.forEach(name => {
        updatedAttributes[name] = rating;
      });
      setAttributes(updatedAttributes);
    }
  }, [rating, attributeNames]);

  // Handle attribute value change
  const handleAttributeChange = (attribute, value) => {
    setAttributes(prev => ({
      ...prev,
      [attribute]: value
    }));
  };

  // Add new custom attribute
  const addCustomAttribute = () => {
    if (newAttributeName.trim() && !attributeNames.includes(newAttributeName.trim().toLowerCase())) {
      const newName = newAttributeName.trim().toLowerCase();
      const updatedNames = [...attributeNames, newName];
      setAttributeNames(updatedNames);
      setAttributes(prev => ({
        ...prev,
        [newName]: rating || 3
      }));
      
      // Save to localStorage for the primary list
      if (selectedLists.length > 0) {
        saveListAttributes(selectedLists[0], updatedNames);
      }
      
      setNewAttributeName('');
      setShowAddAttribute(false);
    }
  };

  // Remove attribute
  const removeAttribute = (attributeName) => {
    const updatedNames = attributeNames.filter(name => name !== attributeName);
    setAttributeNames(updatedNames);
    
    const updatedAttributes = { ...attributes };
    delete updatedAttributes[attributeName];
    setAttributes(updatedAttributes);
    
    // Save to localStorage for the primary list
    if (selectedLists.length > 0) {
      saveListAttributes(selectedLists[0], updatedNames);
    }
  };

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
  const [allergens, setAllergens] = useState(() => {
    // Initialize from existing item data
    const allergenList = item?.user_allergens || item?.ai_allergens || [];
    console.log('🚨 [AddItemModal] Initializing allergens:', JSON.stringify({
      item_user_allergens: item?.user_allergens,
      item_ai_allergens: item?.ai_allergens,
      final_allergens: allergenList
    }, null, 2));
    return allergenList;
  });

  // Update state when AI metadata becomes available
  useEffect(() => {
    if (aiMetadata) {
      if (!productNameManuallyEdited && aiMetadata.productName) {
        setProductName((prev) => prev || aiMetadata.productName);
      }
      setCategory(aiMetadata.category);
      setTags(aiMetadata.tags);
      setCertainty(aiMetadata.certainty);
      setActiveTags(aiMetadata.tags || []);
      // Auto-fill the quality overview/description from AI
      setQualityOverview(aiMetadata.species || '');
      // Set allergens from AI data
      setAllergens(aiMetadata.allergens || []);
      // Show AI sparkle when metadata is available
      setShowAISparkle(true);
      // Attributes will be synced by the rating useEffect
      
      // Notify parent component of AI update
      if (onUpdateAI) {
        onUpdateAI(aiMetadata);
      }
    }
  }, [aiMetadata, productNameManuallyEdited]);

  // Show toast when AI fails
  useEffect(() => {
    if (aiError && !isAIProcessing) {
      setAiToastMessage('Analysis failed');
      setShowAIToast(true);
      setTimeout(() => setShowAIToast(false), 4000);
    }
  }, [aiError, isAIProcessing]);

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
        category,
        tags: activeTags,
        certainty,
        location,
      });
    }
    // eslint-disable-next-line
  }, [selectedLists, rating, notes, productName, category, activeTags, certainty, location]);

  const handleSave = async () => {
    console.log('🔍 Save button clicked');
    
    // Prevent multiple saves
    if (isSaving) {
      console.log('🔍 Save already in progress, ignoring click');
      return;
    }
    
    // Validate required fields
    const errors = {};
    
    if (!productName.trim()) {
      errors.productName = 'Required';
    }
    
    if (selectedLists.length === 0) {
      errors.selectedLists = 'Please select at least one list';
    }
    
    // If there are validation errors, show them and scroll to first error
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      setShowValidationErrors(true);
      
      // Scroll to the first error field
      setTimeout(() => {
        if (errors.productName && productNameRef.current) {
          productNameRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          productNameRef.current.focus();
        } else if (errors.selectedLists && listsRef.current) {
          listsRef.current.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 100);
      
      // Add haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      // Clear validation errors after 5 seconds
      setTimeout(() => {
        setShowValidationErrors(false);
        setValidationErrors({});
      }, 5000);
      
      return;
    }
    
    // Clear any existing validation errors
    setValidationErrors({});
    setShowValidationErrors(false);
    
    // Start saving
    setIsSaving(true);
    console.log('🔍 Starting save operation...');
    
    const isStayAway = rating <= 2;
    const newItem = buildItem({
      // Preserve item ID if editing
      id: item?.id,
      
      // AI Metadata from aiMetadata
      ai_product_name: aiMetadata?.productName,
      ai_brand: aiMetadata?.brand,
      ai_category: aiMetadata?.category,
      ai_confidence: aiMetadata?.certainty,
      ai_description: aiMetadata?.description,
      ai_tags: aiMetadata?.tags,
      ai_allergens: aiMetadata?.allergens,
      ai_lookup_status: aiError ? 'error' : 'success',
      
      // User overrides
      user_product_name: isProductNameEditedByUser ? productName : null,
      user_description: qualityOverview,
      user_tags: activeTags,
      
      // Core fields
      productName,
      category,
      certainty,
      tags: activeTags,
      image: currentImage,
      rating,
      notes,
      qualityOverview,
      place,
      location,
      price: editPrice || null,
      currency_code: currency || 'USD',
      detailed_breakdown: attributes,
      rarity: 1, // Hardcoded to Common for now
      
      // Privacy setting
      is_public: isPublic,
      
      // Photo/location metadata
      photo_date_time: photoMetadata?.dateTime,
      photo_location_source: getPhotoLocationSource(),
      latitude: selectedPlaceCoords?.lat ?? photoMetadata?.latitude,
      longitude: selectedPlaceCoords?.lng ?? photoMetadata?.longitude
    });
    
    try {
      // OPTIMAL SAVE: Do heavy operations during "Saving..." state
      const saveStartTime = performance.now();
      console.log('⏱️ [TIMING] Starting optimized save operation...');
      
      // Step 1: Core database save (524ms - happens during "Saving...")
      const saveResult = await onSave(selectedLists, newItem, isStayAway);
      const savedItem = saveResult?.data || saveResult;
      const dbEndTime = performance.now();
      console.log('✅ Database save completed in', Math.round(dbEndTime - saveStartTime), 'ms');
      
      // Step 2: Create public post during "Saving..." if needed (405ms - also during loading)
      let postRow = null;
      if (isPublic && !item?.id && savedItem) {
        const postStartTime = performance.now();
        console.log('⏱️ [TIMING] Creating public post during save...');
        const { data: createdPost, error: postError } = await createPost(savedItem.id, selectedLists[0], true, location);
        const postEndTime = performance.now();
        if (postError) {
          console.warn('⚠️ Post creation failed (non-fatal):', postError);
        } else {
          postRow = createdPost;
          console.log('✅ Post created during save in', Math.round(postEndTime - postStartTime), 'ms');
        }
      }
      
      // Step 3: Ensure minimum save time for better UX perception
      console.log('⏱️ [TIMING] Processing additional save operations...');
      const additionalStartTime = performance.now();
      
      // Add some productive work that takes time
      await new Promise(resolve => {
        // Simulate image processing/optimization work
        const processingTime = Math.max(200, 400 - (performance.now() - saveStartTime));
        setTimeout(resolve, processingTime);
      });
      
      const additionalEndTime = performance.now();
      console.log('✅ Additional processing completed in', Math.round(additionalEndTime - additionalStartTime), 'ms');
      
      // Step 4: Add minimum save time for better UX (ensures user sees "Saving...")
      const minSaveTime = 800; // Minimum 800ms to feel substantial
      const currentSaveTime = performance.now() - saveStartTime;
      if (currentSaveTime < minSaveTime) {
        const remainingTime = minSaveTime - currentSaveTime;
        console.log('⏱️ [TIMING] Adding', Math.round(remainingTime), 'ms for better save UX...');
        await new Promise(resolve => setTimeout(resolve, remainingTime));
      }
      
      const totalSaveTime = performance.now() - saveStartTime;
      console.log('✅ All heavy operations completed in', Math.round(totalSaveTime), 'ms');
      
      // Step 3: Show success animation immediately (user feels the save is complete)
      console.log('✨ [Success] Showing success animation');
      setIsSaving(false);
      setShowSuccessAnimation(true);
      
      // Determine the primary list name for success message
      const primaryList = lists?.find(l => l.id === selectedLists[0]);
      const listName = primaryList?.name || 'your list';
      
      // CHECK: If this is a first-in-world achievement, show it briefly
      const hasFirstInWorldAchievement = saveResult?.achievements?.some(a => a.isGlobalFirst);
      
      if (hasFirstInWorldAchievement) {
        console.log('🏆 [Fast Save] First in world achievement detected');
        const globalFirstAchievement = saveResult.achievements.find(a => a.isGlobalFirst);
        setFirstInWorldProduct(productName || newItem.name || 'this item');
        setFirstInWorldAchievement(globalFirstAchievement);
        
        // Show success + achievement for 2.5 seconds then close
        setTimeout(() => {
          setShowSuccessAnimation(false);
          if (isBulk && onNext) onNext();
          else onClose();
        }, 2500);
      } else {
        // Show success animation briefly then close (natural timing)
        setTimeout(() => {
          setShowSuccessAnimation(false);
          if (isBulk && onNext) onNext();
          else onClose();
        }, 600);
      }
      
      // Step 4: Only fast operations in background (167ms cache update)
      if (postRow) {
        scheduleFastBackgroundOperations(savedItem, selectedLists[0], postRow);
      }
      
    } catch (error) {
      console.error('❌ Save operation failed:', error);
      alert('Failed to save item. Please try again.');
      setIsSaving(false);
      setShowSuccessAnimation(false);
    }
  };

    // Schedule only fast background operations (167ms cache update)
  const scheduleFastBackgroundOperations = (savedItem, listId, postRow) => {
    console.log('📅 [Background] Scheduling fast cache update...');
    
    // Use requestIdleCallback for better performance, fallback to immediate setTimeout
    const runWhenIdle = (callback) => {
      if (window.requestIdleCallback) {
        window.requestIdleCallback(callback, { timeout: 50 });
      } else {
        setTimeout(callback, 0);
      }
    };
    
    // Only fast operation: Update profile cache (167ms)
    runWhenIdle(async () => {
      try {
        const cacheStartTime = performance.now();
        console.log('🔄 [Background] Updating profile cache...');
        const { data: { user } } = await supabase.auth.getUser();
        const newPost = {
          id: postRow?.id,
          user_id: user?.id,
          items: savedItem,
          lists: { id: listId, name: (lists || []).find(l => l.id === listId)?.name || '' }
        };
        prependProfilePost(user?.id, newPost);
        const cacheEndTime = performance.now();
        console.log('✅ [Background] Profile cache updated in', Math.round(cacheEndTime - cacheStartTime), 'ms');
      } catch (cacheErr) {
        console.log('⚠️ [Background] Profile cache update failed (non-fatal)');
      }
    });
  };

  const handleCreateList = async () => {
    if (isCreatingList) return;
    const subject = newListSubject.trim();
    if (!subject || !onCreateList) return;
    setCreateListError(null);
    setIsCreatingList(true);
    try {
      const location = newListLocation.trim();
      const prefix = 'Best';
      const name = location ? `${prefix} ${subject} in ${location}` : `${prefix} ${subject}`;
      console.log('🔧 AddItemModal: Creating list with name:', name);
      const newList = await onCreateList(name, '#1F6D5A');
      console.log('🔧 AddItemModal: Got result from onCreateList:', newList);
      if (newList && newList.id) {
        setSelectedLists([newList.id]);
        setShowCreateListDialog(false);
        setNewListSubject('');
        setNewListLocation('');
      } else {
        console.error('❌ AddItemModal: List creation failed - no ID returned');
        setCreateListError('Could not create list. Please try again.');
      }
    } catch (error) {
      console.error('❌ AddItemModal: Error creating list:', JSON.stringify({
        message: error.message,
        name: error.name,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error
      }, null, 2));
      setCreateListError(error.message || 'An unexpected error occurred.');
    } finally {
      setIsCreatingList(false);
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



  // Rarity functions removed - hardcoded to Common (1)

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

  // Determine photo location source based on available data
  const getPhotoLocationSource = () => {
    // If we have EXIF GPS data, it came from the photo
    if (photoMetadata?.hasEXIF && (photoMetadata?.latitude || photoMetadata?.longitude)) {
      console.log('📍 [Location] Source: EXIF (GPS data from photo)');
      return 'exif';
    }
    
    // If user manually entered a location (not just device location)
    if (locationManuallySet || (location && location !== 'Current Location' && location !== photoMetadata?.location)) {
      console.log('📍 [Location] Source: Manual (user entered)');
      return 'manual';
    }
    
    // If we used device location during capture
    if (photoMetadata?.location || location === 'Current Location') {
      console.log('📍 [Location] Source: Device (current GPS)');
      return 'device';
    }
    
    // Default to manual if no specific source can be determined
    console.log('📍 [Location] Source: Manual (default)');
    return 'manual';
  };

  const handlePriceEdit = () => {
    setIsEditingPrice(true);
  };

  const handlePriceSave = () => {
    setIsEditingPrice(false);
  };

  // Auto-detect currency on mount using smart detection
  useEffect(() => {
    const detectCurrency = async () => {
      console.log('🌍 Starting smart currency detection...');
      
      try {
        let detectedCurrency;
        
        // First check if editing existing item with currency
        if (item?.currency_code) {
          detectedCurrency = item.currency_code;
          console.log('🌍 Using existing item currency:', detectedCurrency);
        } else {
          // Use locale-based currency detection (no location permission needed)
          detectedCurrency = getCurrencyFromLocale();
          console.log('🌍 Auto-detected currency:', detectedCurrency);
        }
        
        setCurrency(detectedCurrency);
      } catch (error) {
        console.error('🌍 Currency detection failed:', JSON.stringify({
          message: error.message,
          name: error.name,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        }, null, 2));
        setCurrency('USD'); // Fallback
      }
    };
    
    detectCurrency();
    
    // Load recent currencies
    setRecentCurrencies(getRecentCurrencies());
  }, [item?.currency_code, location]);

  // When location changes, try to infer currency from country
  useEffect(() => {
    if (
      location &&
      location !== 'Current Location' &&
      !currencyManuallySet
    ) {
      // Try to extract country from location string (assume last part after comma)
      const country = location.split(',').pop().trim();
      const inferred = getCurrencyFromCountryName(country);
      if (inferred && inferred !== currency) {
        setCurrency(inferred);
      }
    }
    // eslint-disable-next-line
  }, [location]);

  // When user picks a currency manually
  const handleCurrencySelect = (currencyCode) => {
    setCurrency(currencyCode);
    setShowCurrencySelector(false);
    setCurrencyManuallySet(true);
    // Save to recent currencies using utility function
    saveRecentCurrency(currencyCode);
    setRecentCurrencies(getRecentCurrencies()); // Refresh from storage
  };

  // Format price input with currency-specific rules
  const formatPriceInputLocal = (value) => {
    return formatPriceInput(value, currency);
  };

  // Always use numeric keyboard for better UX
  const getPriceInputMode = () => {
    return "numeric"; // Always use numeric keyboard
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
          console.log('Native geolocation failed, trying web fallback:', JSON.stringify({
          message: nativeError.message,
          name: nativeError.name,
          details: nativeError.details,
          hint: nativeError.hint,
          code: nativeError.code,
          fullError: nativeError
        }, null, 2));
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
            setCurrentCoords({ lat: position.coords.latitude, lon: position.coords.longitude });
          } else {
            setLocation(coordsText);
          }
        } catch (geocodeError) {
          console.log('Reverse geocoding failed, using coordinates:', JSON.stringify({
          message: geocodeError.message,
          name: geocodeError.name,
          details: geocodeError.details,
          hint: geocodeError.hint,
          code: geocodeError.code,
          fullError: geocodeError
        }, null, 2));
          setLocation(coordsText);
          setCurrentCoords({ lat: position.coords.latitude, lon: position.coords.longitude });
        }
      } else {
        throw new Error('No position data received');
      }
      
    } catch (error) {
      console.log('All location methods failed:', JSON.stringify({
          message: error.message,
          name: error.name,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        }, null, 2));
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
  const [currencyManuallySet, setCurrencyManuallySet] = useState(false);



  // Auto-fetch location on mount (only if no location available and not manually set)
  useEffect(() => {
    // Don't fetch current location if we already have location from other sources or it was manually set
    if (!photoMetadata?.location && !initialState?.location && !item?.location && !locationManuallySet && location === 'Current Location') {
      console.log('🌍 Triggering location fetch...');
      getCurrentLocation();
    }
  }, [photoMetadata?.location, initialState?.location, item?.location, locationManuallySet]);

  // Removed Google Places default dropdown; using custom popup + Nominatim

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

  // Add a function to reset to default attributes
  const resetToDefaultAttributes = () => {
    const defaultAttributes = ['aroma', 'texture', 'freshness', 'value'];
    setAttributeNames(defaultAttributes);
    
    const resetAttributes = {};
    defaultAttributes.forEach(name => {
      resetAttributes[name] = rating || 3;
    });
    setAttributes(resetAttributes);
    
    // Save to localStorage for the primary list
    if (selectedLists.length > 0) {
      saveListAttributes(selectedLists[0], defaultAttributes);
    }
  };

  // Add validation state
  const [validationErrors, setValidationErrors] = useState({});
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  // Refs for scrolling to validation errors
  const productNameRef = useRef(null);
  // Ensure product name textarea auto-resizes so wrapped lines aren't hidden
  useLayoutEffect(() => {
    const el = productNameRef.current;
    if (el) {
      try {
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 80) + 'px';
      } catch (_) {}
    }
  }, [productName]);
  const listsRef = useRef(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const isEditingExisting = Boolean(item?.id);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProductNameEditedByUser, setIsProductNameEditedByUser] = useState(false);
  
  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);

  // --- Word Suggestions (Phase 3 - AI Integration) ---
  const notesTextareaRef = useRef(null);
  const { getSuggestions, removeDuplicates, getFilteredSuggestions } = useWordSuggestions();
  
  // AI-only suggestions (no fallback)
  const [availableSuggestions, setAvailableSuggestions] = useState([]);
  const [usedSuggestionWords, setUsedSuggestionWords] = useState([]);
  const [hasSuggestions, setHasSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const activeTouchRef = useRef(null);
  const [flyingAnimations, setFlyingAnimations] = useState([]);

  // Update word suggestions when AI metadata or rating changes
  useEffect(() => {
    const updateSuggestions = async () => {
      // Only proceed if we have sufficient product identification
      if (aiMetadata && (!aiMetadata.productName || aiMetadata.certainty < 40)) {
        console.log('📝 [AddItemModal] Skipping word suggestions - insufficient product identification:', {
          productName: aiMetadata.productName,
          certainty: aiMetadata.certainty
        });
        setAvailableSuggestions([]);
        setHasSuggestions(false);
        setIsLoadingSuggestions(false);
        return;
      }

      // Only show loading if we expect AI suggestions (when AI is processing or we have metadata)
      if (aiMetadata?.wordSuggestions || isAIProcessing) {
        setIsLoadingSuggestions(true);
      }
      
      try {
        console.log('📝 [AddItemModal] Updating word suggestions for rating:', rating, 'AI metadata:', !!aiMetadata?.wordSuggestions);
        const newSuggestions = await getSuggestions(aiMetadata, rating);
        
        if (newSuggestions && newSuggestions.length > 0) {
          // Remove duplicates and filter out already used words
          const cleanedSuggestions = removeDuplicates(newSuggestions);
          const filteredSuggestions = getFilteredSuggestions(cleanedSuggestions, usedSuggestionWords);
          
          setAvailableSuggestions(filteredSuggestions);
          setHasSuggestions(true);
          console.log('📝 [AddItemModal] Updated suggestions:', filteredSuggestions.length, 'items');
        } else {
          // No AI suggestions available
          setAvailableSuggestions([]);
          setHasSuggestions(false);
          console.log('📝 [AddItemModal] No AI suggestions available');
        }
      } catch (error) {
        console.error('📝 [AddItemModal] Error updating suggestions:', error);
        setAvailableSuggestions([]);
        setHasSuggestions(false);
      } finally {
        setIsLoadingSuggestions(false);
      }
    };

    updateSuggestions();
  }, [aiMetadata, rating, usedSuggestionWords, isAIProcessing, getSuggestions, removeDuplicates, getFilteredSuggestions]);

  // Create flying animation for suggestion tap
  const createFlyingAnimation = useCallback((buttonRect, word, isDoubleTap = false) => {
    const animationId = Date.now() + Math.random();

    // Calculate end position (near the notes textarea)
    const notesRect = notesTextareaRef.current?.getBoundingClientRect();
    if (!notesRect) return;

    const startX = buttonRect.left + buttonRect.width / 2;
    const startY = buttonRect.top + buttonRect.height / 2;
    const endX = notesRect.left + notesRect.width / 2;
    const endY = notesRect.top + 20; // Slightly above the textarea

    const newAnimation = {
      id: animationId,
      word,
      startX,
      startY,
      endX,
      endY,
      isDoubleTap,
      createdAt: Date.now()
    };

    setFlyingAnimations(prev => [...prev, newAnimation]);

    // Remove animation after it completes (600ms)
    setTimeout(() => {
      setFlyingAnimations(prev => prev.filter(anim => anim.id !== animationId));
    }, 600);
  }, []);
  const insertAtCursor = useCallback((text) => {
    const el = notesTextareaRef.current;
    
    // Helper function to format a list of adjectives naturally
    const formatAdjectives = (adjectives) => {
      if (adjectives.length === 0) return '';
      if (adjectives.length === 1) return adjectives[0];
      if (adjectives.length === 2) return `${adjectives[0]} and ${adjectives[1]}`;
      
      // For 3+ adjectives: "word1, word2, and word3" (Oxford comma)
      const allButLast = adjectives.slice(0, -1).join(', ');
      const last = adjectives[adjectives.length - 1];
      return `${allButLast}, and ${last}`;
    };
    
    // Helper function to capitalize first letter
    const capitalizeFirst = (str) => str.charAt(0).toUpperCase() + str.slice(1);
    
    const insertText = (beforeText, newText) => {
      const trimmedBefore = beforeText.trim();
      
      // If completely empty, just add the capitalized word
      if (!beforeText) {
        return capitalizeFirst(newText);
      }
      
      // If starts new sentence (after period, exclamation, question, or newline), capitalize and add
      if (/[.!?]\s*$/.test(trimmedBefore) || beforeText.endsWith('\n')) {
        const needsSpace = !/[\s\n]$/.test(beforeText);
        return beforeText + (needsSpace ? ' ' : '') + capitalizeFirst(newText);
      }
      
      // Extract current sentence/line (everything after last sentence-ending punctuation or newline)
      const lastBreakMatch = beforeText.match(/([.!?\n])([^.!?\n]*)$/);
      const currentSentence = lastBreakMatch ? lastBreakMatch[2].trim() : trimmedBefore;
      
      // Parse existing adjectives in current sentence
      let existingAdjectives = [];
      
      // Remove common non-adjective words and split by commas and "and"
      const cleanSentence = currentSentence
        .replace(/\b(is|are|was|were|the|a|an|very|quite|really|extremely)\b/gi, ' ')
        .trim();
      
      if (cleanSentence) {
        // Split by comma and "and", then clean up
        existingAdjectives = cleanSentence
          .split(/,|\sand\s/i)
          .map(adj => adj.trim())
          .filter(adj => adj.length > 0);
      }
      
      // Check if the new adjective already exists (case-insensitive)
      const newTextLower = newText.toLowerCase();
      const isDuplicate = existingAdjectives.some(adj => 
        adj.toLowerCase().includes(newTextLower) || newTextLower.includes(adj.toLowerCase())
      );
      
      if (isDuplicate) {
        return beforeText; // Don't add duplicates
      }
      
      // Add new adjective to the list
      const allAdjectives = [...existingAdjectives, newText];
      const formattedList = formatAdjectives(allAdjectives);
      
      // Replace the adjective portion in the sentence
      if (lastBreakMatch) {
        // We have a sentence break, replace just the current sentence's content
        const beforeCurrentSentence = beforeText.substring(0, lastBreakMatch.index + lastBreakMatch[1].length);
        const leadingWhitespace = lastBreakMatch[2].match(/^\s*/)?.[0] || '';
        
        return beforeCurrentSentence + leadingWhitespace + formattedList;
      } else {
        // We're at the very start, need to handle spacing carefully
        const leadingWhitespace = beforeText.match(/^\s*/)?.[0] || '';
        return leadingWhitespace + capitalizeFirst(formattedList);
      }
    };
    
    if (!el) {
      setNotes((prev) => insertText(prev || '', text));
      return;
    }
    
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const before = notes.slice(0, start);
    const after = notes.slice(end);
    
    const newBefore = insertText(before, text);
    const newValue = newBefore + after;
    
    setNotes(newValue);
    
    requestAnimationFrame(() => {
      const pos = newBefore.length;
      el.setSelectionRange(pos, pos);
    });
  }, [notes]);


  

  const handleSuggestionTap = useCallback((s, buttonRect, isDoubleTap = false) => {
    const wordToAdd = isDoubleTap 
      ? (s.variations?.opposite)
      : s.label;
    const wordToCheck = wordToAdd;

    console.log('📝 [AddItemModal] Suggestion tap:', {
      label: s.label,
      isDoubleTap,
      wordToAdd,
      hasAIOpposite: !!s.variations?.opposite,
      variations: s.variations
    });

    // Prevent duplicates: simple token check
    const exists = (notes || '').toLowerCase().includes(wordToCheck.toLowerCase());
    if (!exists) {
      insertAtCursor(wordToAdd);
      
      // Track used words to filter future suggestions
      setUsedSuggestionWords(prev => [...prev, s.label, wordToAdd]);
      
      // Create flying animation if we have button position
      if (buttonRect) {
        createFlyingAnimation(buttonRect, wordToAdd, isDoubleTap);
      }
      
      // Remove the selected suggestion with a small delay to prevent accidental taps on the next word
      setTimeout(() => {
        setAvailableSuggestions((prev) => prev.filter((x) => x.id !== s.id));
      }, 300);
    }
    
    if (navigator.vibrate) navigator.vibrate(isDoubleTap ? 20 : 5); // Stronger vibration for double tap
  }, [insertAtCursor, notes, createFlyingAnimation]);





  return (
    <div 
      className="fixed inset-0 bg-stone-50 overflow-y-auto modal-overlay" 
      style={{ 
        backgroundColor: '#F6F6F4',
        zIndex: 'var(--z-modal)', // Use standardized z-index for modals
        // Allow native gestures on the edges
        paddingLeft: 'env(safe-area-inset-left)',
        paddingRight: 'env(safe-area-inset-right)',
        // Don't intercept touch events on edges
        touchAction: 'pan-y',
        // Ensure it covers everything
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh'
      }}
    >
      {/* Hero Image Section */}
      <div 
        className={`relative overflow-hidden bg-black ${showRatingOverlay ? 'hidden' : ''}`}
        style={{ height: '350px' }}
      >
        {/* Simplified backdrop fill to avoid black bars for portrait images */}
        <div className="absolute inset-0 z-0">
          <img
            src={currentImage}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover blur-lg scale-105 opacity-40"
          />
          <div className="absolute inset-0 bg-black/30" />
        </div>
        {/* Simplified AI Loading Effects */}
        {(isAIProcessing && !aiCancelled && !aiError) && (
          <>
            {/* Simple shimmer overlay */}
            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 5 }}>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
            </div>
            
            {/* Simple progress line */}
            <div className="absolute bottom-0 left-0 right-0 z-10">
              <div className="h-1 bg-teal-500 animate-pulse" />
            </div>
            
            {/* Cancel button - top right only */}
            <button
              onClick={() => {
                setAiCancelled(true);
                if (onUpdateAI) onUpdateAI(null);
                // Show toast
                setAiToastMessage('Continuing without AI');
                setShowAIToast(true);
                setTimeout(() => setShowAIToast(false), 3000);
              }}
              className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1.5 shadow-lg border border-gray-200 hover:bg-white transition-colors"
            >
              <span className="text-xs font-medium text-gray-700">Cancel</span>
            </button>
            
            {/* Status overlay - positioned just above card */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
              <div className="bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-gray-200 flex items-center gap-2">
                <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
                <span className="text-sm font-medium text-gray-800">Analyzing…</span>
              </div>
            </div>
          </>
        )}

        <div className="absolute inset-0 z-10">
          <img
            src={currentImage}
            alt="Food item"
            className={`w-full h-full object-cover object-center transition-opacity duration-300 cursor-pointer ${
              isAIProcessing ? 'opacity-90' : 'opacity-100'
            }`}
            style={{ filter: getInstagramClassicFilter() }}
            onClick={handlePhotoClick}
          />
        </div>


        {/* Back Button */}
        <button 
          onClick={() => {
            if (aiError) {
              // Show a brief message before going back
              if (navigator.vibrate) navigator.vibrate(50);
              // Trigger parent to show error message
              onClose('ai_error');
            } else {
              onClose();
            }
          }}
          className="absolute top-6 left-4 w-10 h-10 bg-white bg-opacity-90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-lg z-20 active:scale-95 transition-transform"
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>

        {/* First in World Achievement Countdown */}
        {autoCloseCountdown && (
          <div className="absolute top-6 left-1/2 transform -translate-x-1/2 z-20">
            <div className="bg-purple-600 text-white rounded-full px-4 py-2 shadow-lg flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-lg">🏆</span>
                <span className="text-sm font-medium">First in World!</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs opacity-80">Auto-close in</span>
                <span className="text-lg font-bold">{autoCloseCountdown}s</span>
              </div>
              <button
                onClick={() => {
                  setAutoCloseCountdown(null);
                  if (isBulk && onNext) onNext();
                  else onClose();
                }}
                className="ml-2 px-2 py-1 bg-white/20 hover:bg-white/30 rounded-full text-xs font-medium transition-colors"
              >
                Close Now
              </button>
            </div>
          </div>
        )}

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
      <AchievementGlow 
        achievement={firstInWorldAchievement} 
        variant="border" 
        intensity="strong"
        className={`relative z-10 mx-4 ${showRatingOverlay ? 'hidden' : ''}`}
      >
        <div 
          className="rounded-t-3xl shadow-xl"
          style={{
            backgroundColor: 'white',
            borderTopLeftRadius: '48px',
            borderTopRightRadius: '48px',
            boxShadow: firstInWorldAchievement 
              ? '0 8px 24px -4px rgba(168, 85, 247, 0.2), 0 2px 6px rgba(168, 85, 247, 0.1)' 
              : '0 8px 24px -4px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.05)',
            marginTop: '-24px',
            minHeight: 'calc(100vh - 326px)' // Ensure it fills remaining space
          }}
        >
        {/* Scrollable content */}
        <div className="h-full overflow-y-auto">
          <div className="p-6 pb-20 min-h-full">




            {/* Item Header */}
            <div className="mb-6 pt-3 relative">
              {/* First in World Badge - positioned in top right */}
              {firstInWorldAchievement && (
                <div className="absolute top-0 right-0 z-10 pb-2">
                  <FirstInWorldBadge 
                    achievement={firstInWorldAchievement}
                    size="medium"
                    className="cursor-pointer hover:scale-110 transition-transform"
                    onClick={() => setShowFirstInWorldPopup(true)}
                  />
                </div>
              )}
              
              <div className="flex items-center justify-between mb-2 select-none" style={{ WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none' }}>
                <div className="flex-1 relative min-h-[32px]" style={{ maxWidth: '66%' }}>
                  {isAIProcessing && !aiCancelled && !aiError ? (
                    // Match tags overlay style with shimmer pills
                    <div className="flex items-center gap-2">
                      <div className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap w-28 h-7 loading-tag"></div>
                      <div className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap w-20 h-7 loading-tag"></div>
                      <div className="hidden sm:block px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap w-16 h-7 loading-tag"></div>
                    </div>
                  ) : (
                    isProductNameEditing ? (
                      <textarea
                        ref={productNameRef}
                        value={productName}
                        onChange={(e) => {
                          setProductName(e.target.value);
                          setIsProductNameEditedByUser(true);
                          if (validationErrors.productName) {
                            const newErrors = { ...validationErrors };
                            delete newErrors.productName;
                            setValidationErrors(newErrors);
                          }
                        }}
                        onFocus={() => setProductNameManuallyEdited(true)}
                        onBlur={() => setIsProductNameEditing(false)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.target.blur(); // Exit editing mode
                          }
                        }}
                        className={`text-xl font-semibold text-gray-900 bg-transparent border-none outline-none w-full leading-tight resize-none placeholder:text-base placeholder:font-normal placeholder:text-gray-400 ${
                          showValidationErrors && validationErrors.productName 
                            ? 'ring-2 ring-rose-300 ring-opacity-60 rounded-lg px-2 py-1 bg-rose-50' 
                            : ''
                        }`}
                        placeholder="Product name..."
                        autoComplete="off"
                        autoCorrect="on"
                        autoCapitalize="words"
                        spellCheck="true"
                        rows={1}
                        style={{
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
                          minHeight: '32px',
                          height: 'auto',
                          maxHeight: '80px',
                          overflow: 'hidden'
                        }}
                        onInput={(e) => {
                          e.target.style.height = 'auto';
                          e.target.style.height = Math.min(e.target.scrollHeight, 80) + 'px';
                        }}
                      />
                    ) : (
                      <div
                        className={`text-xl font-semibold text-gray-900 leading-tight cursor-pointer ${
                          showValidationErrors && validationErrors.productName 
                            ? 'ring-2 ring-rose-300 ring-opacity-60 rounded-lg px-2 py-1 bg-rose-50' 
                            : ''
                        }`}
                        style={{
                          wordBreak: 'break-word',
                          overflowWrap: 'break-word',
                          hyphens: 'auto',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          minHeight: '32px',
                          lineHeight: '1.2'
                        }}
                        onClick={() => {
                          setIsProductNameEditing(true);
                          setTimeout(() => {
                            if (productNameRef.current) {
                              productNameRef.current.focus();
                              productNameRef.current.setSelectionRange(productName.length, productName.length);
                            }
                          }, 0);
                        }}
                      >
                        {productName || <span className="text-gray-400 font-normal">Product name...</span>}
                      </div>
                    )
                  )}
                </div>
                <div className="flex items-center gap-2 select-none" style={{ WebkitUserSelect: 'none', userSelect: 'none' }}>
                  {!isAIProcessing && aiMetadata && (
                    <button 
                      onClick={() => setShowAISparkle(!showAISparkle)}
                      className="flex items-center gap-1 bg-stone-50 rounded-full px-2 py-0.5 hover:bg-stone-100 transition-colors" 
                      style={{ backgroundColor: '#FAFAF9' }}
                      title="Toggle AI indicator"
                    >
                      <Sparkles className={`w-2.5 h-2.5 transition-colors ${showAISparkle ? 'text-yellow-500' : 'text-gray-400'}`} />
                      <span className="text-xs text-gray-400">AI</span>
                      <span className="text-xs text-gray-400 whitespace-nowrap">{certainty > 0 ? `${Math.round(certainty)}%` : 'N/A'}</span>
                    </button>
                  )}
                  
                  {/* Share Button - only show for existing items */}
                  {isEditingExisting && (
                    <button
                      onClick={() => setShowShareModal(true)}
                      className="w-8 h-8 bg-stone-50 rounded-full flex items-center justify-center hover:bg-stone-100 transition-colors"
                      style={{ backgroundColor: '#FAFAF9' }}
                      title="Share item"
                    >
                      <Share className="w-4 h-4 text-gray-600" />
                    </button>
                  )}
                </div>
              </div>
              
              {/* Product name validation error */}
              {showValidationErrors && validationErrors.productName && (
                <div className="mt-1 text-rose-600 text-sm font-medium">
                  {validationErrors.productName}
                </div>
              )}
              
              {/* Overall Rating Section - moved here */}
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <StarRating rating={rating} onChange={setRating} editable={true} showNumber={false} />
                  <span className="text-sm font-medium text-gray-600">{getRatingLabel(rating)}</span>
                  {!isAIProcessing && (
                    <button
                      onClick={() => setShowDetailedAttributes(!showDetailedAttributes)}
                      className="flex items-center justify-center w-6 h-6 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {showDetailedAttributes ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  )}

                </div>
                
                {showDetailedAttributes && !isAIProcessing && (
                  <div className="mt-4 space-y-4 bg-stone-50 rounded-xl p-4" style={{ backgroundColor: '#F1F1EF' }}>
                    {/* Existing attributes */}
                    {attributeNames.map((attributeName) => (
                      <div key={attributeName} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600 capitalize">{attributeName}</span>
                          {/* Remove button - only show if more than 1 attribute */}
                          {attributeNames.length > 1 && (
                            <button
                              onClick={() => removeAttribute(attributeName)}
                              className="ml-1 w-4 h-4 flex items-center justify-center hover:bg-red-100 rounded-full text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <RatingDots 
                            rating={attributes[attributeName] || 3} 
                            onChange={(newValue) => handleAttributeChange(attributeName, newValue)}
                          />
                          <span className="text-sm text-gray-500 w-3 font-medium">{attributes[attributeName] || 3}</span>
                        </div>
                      </div>
                    ))}
                    
                    {/* Add new attribute and reset to default */}
                    <div className="pt-2 border-t border-gray-200">
                      {showAddAttribute ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={newAttributeName}
                            onChange={(e) => setNewAttributeName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') addCustomAttribute();
                              else if (e.key === 'Escape') {
                                setShowAddAttribute(false);
                                setNewAttributeName('');
                              }
                            }}
                            placeholder="Attribute name..."
                            className="flex-1 px-2 py-1 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-700"
                            autoFocus
                          />
                          <button
                            onClick={addCustomAttribute}
                            className="px-3 py-1 bg-teal-700 text-white rounded-lg text-sm hover:bg-teal-800 transition-colors"
                            style={{ backgroundColor: '#1F6D5A' }}
                          >
                            Add
                          </button>
                          <button
                            onClick={() => {
                              setShowAddAttribute(false);
                              setNewAttributeName('');
                            }}
                            className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          {/* + button matching the style from tags section */}
                          <button
                            onClick={() => setShowAddAttribute(true)}
                            className="px-3 py-1.5 bg-teal-100 text-teal-700 rounded-full text-xs font-medium whitespace-nowrap hover:bg-teal-200 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          
                          {/* Reset to default button */}
                          <button
                            onClick={resetToDefaultAttributes}
                            className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium whitespace-nowrap hover:bg-gray-200 transition-colors"
                            title="Reset to default attributes"
                          >
                            <div className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                              <span>Reset</span>
                            </div>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
              </div>
            </div>

            {/* Personal Notes */}
            <div className="mb-2 mt-2">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Your Notes</h3>
              <textarea
                ref={notesTextareaRef}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add your personal thoughts, memories, or additional notes..."
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-700 resize-none"
                rows={3}
                autoComplete="off"
                autoCorrect="on"
                autoCapitalize="sentences"
                spellCheck="true"
              />
              {/* Suggestions container - only show if AI provided suggestions */}
              {(hasSuggestions || isLoadingSuggestions) && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-3 h-3 text-gray-500" />
                    <span className="text-xs text-gray-500">
                      {isLoadingSuggestions ? 'Loading suggestions...' : (
                        <>
                          Tap to add • Double-tap for opposite 
                        </>
                      )}
                    </span>
                  </div>
                  <div className="p-2">
                    {isLoadingSuggestions ? (
                      <div className="flex gap-2 pb-1">
                        {/* Loading skeleton */}
                        <div className="px-3 py-2 rounded-lg bg-gray-100 animate-pulse h-7 w-16"></div>
                        <div className="px-3 py-2 rounded-lg bg-gray-100 animate-pulse h-7 w-20"></div>
                        <div className="px-3 py-2 rounded-lg bg-gray-100 animate-pulse h-7 w-14"></div>
                        <div className="px-3 py-2 rounded-lg bg-gray-100 animate-pulse h-7 w-18"></div>
                      </div>
                    ) : (
                      <HorizontalSuggestions
                        suggestions={availableSuggestions}
                        onTap={handleSuggestionTap}
                        rating={rating}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>



            {/* AI Summary & Details Section */}
            <div className="mb-6 mt-2">
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
                    <h4 className="text-xs font-medium text-gray-600 mb-2">AI Description</h4>
                    <textarea
                      value={qualityOverview}
                      onChange={(e) => setQualityOverview(e.target.value)}
                      placeholder={
                        isAIProcessing 
                          ? "AI is analyzing the image..." 
                          : "Describe this item..."
                      }
                      className="w-full text-sm text-gray-700 leading-relaxed bg-white border border-gray-200 rounded-lg p-3 outline-none focus:border-teal-700 resize-none"
                      rows={3}
                      autoComplete="off"
                      autoCorrect="on"
                      autoCapitalize="sentences"
                      spellCheck="true"
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

                  {/* Tags */}
                  <div>
                    <h4 className="text-xs font-medium text-gray-600 mb-2">Tags</h4>
                    <div className="flex gap-2 overflow-x-auto items-center">
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
                </div>
              </div>
              <div className="flex gap-3">
                {/* Place name (left) */}
                <div className="flex-1 relative" ref={placeDropdownRef}>
                  <input
                    ref={placeInputRef}
                    type="text"
                    value={place}
                    onChange={(e) => {
                      console.log('🔍 [Places Input] onChange triggered with value:', e.target.value);
                      setPlace(e.target.value);
                    }}
                    onFocus={() => setShowPlaceSearch(true)}
                    placeholder="Place name.."
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-teal-700"
                    autoComplete="off"
                    autoCorrect="on"
                    autoCapitalize="words"
                    spellCheck="true"
                  />
                  {showPlaceSearch && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-50">
                      <div className="bg-white rounded-lg shadow-xl border border-gray-200 min-w-[320px] max-w-[400px]">
                        {/* Header */}
                        <div className="p-3 border-b border-gray-100 flex items-center">
                          <span className="text-sm font-medium text-gray-700">Search places</span>
                          {isSearchingPlaces && (
                            <div className="ml-auto w-4 h-4 border-2 border-teal-700 border-t-transparent rounded-full animate-spin" />
                          )}
                        </div>
                        
                        {/* Results */}
                        <div className="max-h-64 overflow-y-auto">
                          {placeResults.length > 0 ? (
                            placeResults.map((result, idx) => (
                              <button
                                key={`place-${idx}`}
                                onClick={() => {
                                  setPlace(result.name);
                                  setSelectedPlaceCoords({ lat: result.lat, lng: result.lon });
                                  
                                  // Extract city and country from formatted address
                                  const addressParts = result.display.split(',').map(p => p.trim());
                                  let city = '';
                                  let country = '';
                                  
                                  if (addressParts.length >= 2) {
                                    // Try to extract city and country from address
                                    // Usually format is: Place Name, Street, City, State/Province, Country
                                    country = addressParts[addressParts.length - 1]; // Last part is usually country
                                    // City is usually 2nd or 3rd from the end
                                    if (addressParts.length >= 3) {
                                      city = addressParts[addressParts.length - 3] || addressParts[addressParts.length - 2];
                                    } else {
                                      city = addressParts[0]; // Fallback to first part
                                    }
                                  }
                                  
                                  const newLocation = [city, country].filter(Boolean).join(', ');
                                  if (newLocation && newLocation !== ', ') {
                                    setLocation(newLocation);
                                    setLocationManuallySet(true);
                                  }
                                  
                                  setShowPlaceSearch(false);
                                }}
                                className="w-full p-3 text-left hover:bg-gray-50 flex items-start gap-3"
                              >
                                <div className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0">
                                  {(() => {
                                    const types = result.types || [];
                                    const primaryType = result.primaryType || '';
                                    
                                    if (types.includes('restaurant') || primaryType === 'restaurant') return '🍽️';
                                    if (types.includes('cafe') || primaryType === 'cafe') return '☕';
                                    if (types.includes('bakery') || primaryType === 'bakery') return '🥖';
                                    if (types.includes('supermarket') || types.includes('grocery_store') || primaryType === 'supermarket') return '🛒';
                                    if (types.includes('meal_takeaway') || primaryType === 'meal_takeaway') return '🥡';
                                    return '📍'; // Default location icon
                                  })()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium text-gray-900 leading-tight break-words">
                                    {result.name}
                                  </div>
                                  <div className="text-xs text-gray-500 leading-tight break-words mt-1">
                                    {result.display}
                                  </div>
                                  {result.rating && (
                                    <div className="text-xs text-yellow-600 mt-1">
                                      ⭐ {result.rating}
                                    </div>
                                  )}
                                </div>
                              </button>
                            ))
                          ) : (
                            <div className="p-4 text-center text-sm text-gray-500">
                              {(place || '').trim().length < 2 ? 'Type to search places' : 'No places found'}
                            </div>
                          )}
                        </div>
                        
                        {/* Footer */}
                        <div className="p-3 border-t border-gray-100">
                          <button
                            onClick={() => setShowPlaceSearch(false)}
                            className="w-full px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Location with search (right) */}
                <div className="relative min-w-[200px]" ref={locationDropdownRef}>
                  {showLocationSearch ? (
                                          <div className="absolute right-0 top-0 w-full z-50">
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
                              autoComplete="on"
                              autoCorrect="on"
                              autoCapitalize="words"
                              spellCheck="true"
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
              <div className="flex items-center justify-between mb-3" ref={listsRef}>
                <h3 className={`text-sm font-medium ${
                  showValidationErrors && validationErrors.selectedLists 
                    ? 'text-red-600' 
                    : 'text-gray-900'
                }`}>
                  Select lists {showValidationErrors && validationErrors.selectedLists && '*'}
                </h3>
                <button
                  onClick={() => {
                    setShowListDropdown(!showListDropdown);
                    // Clear validation error when user interacts
                    if (showValidationErrors && validationErrors.selectedLists) {
                      setValidationErrors(prev => ({ ...prev, selectedLists: null }));
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm relative transition-colors ${
                    showValidationErrors && validationErrors.selectedLists
                      ? 'bg-rose-50 text-rose-700 border-2 border-rose-300'
                      : 'bg-gray-100'
                  }`}
                >
                  <span>{getSelectedListName()}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showListDropdown ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* List selection validation error */}
              {showValidationErrors && validationErrors.selectedLists && (
                <div className="mb-3 text-rose-600 text-sm font-medium">
                  {validationErrors.selectedLists}
                </div>
              )}

              {/* Dropdown */}
              {showListDropdown && (
                <>
                  {/* Click away overlay */}
                  <div 
                    className="fixed inset-0 bg-transparent z-10"
                    onClick={() => setShowListDropdown(false)}
                  />
                  <div className="relative">
                        <div className="absolute top-0 left-0 right-0 bg-white rounded-xl shadow-lg border border-gray-200 z-50 max-h-80 overflow-y-auto mb-4" style={{ maxHeight: 'min(80vh, 320px)', marginBottom: '100px' }}>
                      
                      {/* Header with Done button */}
                      <div className="flex items-center justify-between p-3 border-b border-gray-100">
                        <h4 className="text-sm font-medium text-gray-900">Select Lists</h4>
                        <button
                          onClick={() => setShowListDropdown(false)}
                          className="px-3 py-1 bg-teal-700 text-white text-xs rounded-lg font-medium hover:bg-teal-800 transition-colors"
                          style={{ backgroundColor: '#1F6D5A' }}
                        >
                          Done
                        </button>
                      </div>
                      
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

            {/* Public/Private Toggle */}
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-1">Share with community</h3>
                  <p className="text-xs text-gray-500">
                    {isPublic ? 'Others can see this in their feed' : 'Only you can see this item'}
                  </p>
                </div>
                <button
                  onClick={() => setIsPublic(!isPublic)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 ${
                    isPublic ? 'bg-teal-600' : 'bg-gray-200'
                  }`}
                  style={{ backgroundColor: isPublic ? '#1F6D5A' : undefined }}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                      isPublic ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Flying Animation Elements */}
            {flyingAnimations.map((animation) => {
              // Determine color based on rating and tap type (same logic as SuggestionButton)
              const isLowRating = rating <= 2;
              const singleTapColor = isLowRating ? 'red' : 'teal';
              const doubleTapColor = isLowRating ? 'teal' : 'red';
              const animationColor = animation.isDoubleTap ? doubleTapColor : singleTapColor;
              
              const colorClasses = animationColor === 'red' 
                ? 'bg-red-100 text-red-700 border border-red-200'
                : 'bg-teal-100 text-teal-800 border border-teal-200';
              
              return (
                <div
                  key={animation.id}
                  className="fixed pointer-events-none z-50"
                  style={{
                    left: animation.startX,
                    top: animation.startY,
                    transform: 'translate(-50%, -50%)',
                    animation: 'flyAndFade 0.6s ease-out forwards'
                  }}
                >
                  <div className={`px-2.5 py-2 rounded-lg text-sm font-medium whitespace-nowrap shadow-sm ${colorClasses}`}>
                    {animation.word}
                  </div>
                </div>
              );
            })}

            {/* Action Bar */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleSave}
                disabled={isAIProcessing || isSaving}
                className={`flex-1 h-13 rounded-full font-semibold text-base flex items-center justify-center gap-2 mr-4 transition-all duration-200 ${
                  !isAIProcessing && !isSaving
                    ? 'bg-teal-700 text-white hover:bg-teal-800 active:scale-95'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                style={{ 
                  backgroundColor: showSuccessAnimation ? '#10B981' : (!isAIProcessing && !isSaving ? '#1F6D5A' : undefined),
                  height: '52px',
                  transition: 'background-color 0.3s ease'
                }}
              >
                {isSaving ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : showSuccessAnimation ? (
                  <>
                    <div className="w-5 h-5 text-white">
                      <svg className="w-full h-full animate-bounce" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span>{successMessage}</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    <span>Save</span>
                  </>
                )}
              </button>



              <div className="text-right relative">
                {isEditingPrice ? (
                  <div className="flex items-center justify-end gap-2">
                    {/* Currency selector */}
                    <button
                      onClick={() => setShowCurrencySelector(true)}
                      className="text-sm text-teal-700 hover:bg-gray-50 px-2 py-1 rounded border border-teal-200 transition-colors flex-shrink-0"
                      style={{ color: '#1F6D5A', borderColor: '#1F6D5A' }}
                    >
                      {getCurrencyDisplay(currency)}
                    </button>
                    {/* Price input */}
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={editPrice}
                      onChange={(e) => setEditPrice(formatPriceInputLocal(e.target.value))}
                      onBlur={handlePriceSave}
                      onKeyDown={(e) => e.key === 'Enter' && handlePriceSave()}
                      autoComplete="off"
                      autoCorrect="off"
                      autoFocus
                      placeholder="0"
                      className="text-lg font-semibold text-gray-900 bg-transparent border-b border-gray-300 focus:border-teal-700 outline-none text-right w-20"
                    />
                  </div>
                ) : (
                  <div 
                    onClick={handlePriceEdit}
                    className="cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors text-right"
                  >
                    <div className={`text-lg ${editPrice ? 'font-semibold text-gray-900' : 'font-medium text-gray-400'}`}>
                      {editPrice ? `${editPrice} ${getCurrencyDisplay(currency)}` : 'Add price'}
                    </div>
                  </div>
                )}
                
                {/* Currency Selector Modal */}
                {showCurrencySelector && (
                  <>
                    <div 
                      className="fixed inset-0 bg-transparent z-10"
                      onClick={() => setShowCurrencySelector(false)}
                    />
                        <div className="fixed inset-x-4 top-20 bottom-20 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden flex flex-col">
                      {/* Recent currencies */}
                      {recentCurrencies.length > 0 && (
                        <>
                          <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                            Recent
                          </div>
                          {recentCurrencies.map((currencyCode) => {
                            const currencyInfo = getCurrencyInfo(currencyCode);
                            return (
                              <button
                                key={`recent-${currencyCode}`}
                                onClick={() => handleCurrencySelect(currencyCode)}
                                className="w-full p-3 text-left hover:bg-gray-50 flex items-center justify-between"
                              >
                                <div className="flex items-center gap-3">
                                  <span className="text-lg font-medium">{currencyInfo.symbol}</span>
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{currencyInfo.code}</div>
                                    <div className="text-xs text-gray-500">{currencyInfo.name}</div>
                                  </div>
                                </div>
                                {currency === currencyCode && (
                                  <div className="w-2 h-2 bg-teal-600 rounded-full"></div>
                                )}
                              </button>
                            );
                          })}
                          <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                            All currencies
                          </div>
                        </>
                      )}
                      
                      {/* Popular currencies first */}
                      <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                        Popular currencies
                      </div>
                      {allCurrencies.filter(c => c.popular).map((currencyInfo) => (
                        <button
                          key={currencyInfo.code}
                          onClick={() => handleCurrencySelect(currencyInfo.code)}
                          className="w-full p-3 text-left hover:bg-gray-50 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-medium">{currencyInfo.symbol}</span>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{currencyInfo.code}</div>
                              <div className="text-xs text-gray-500">{currencyInfo.name}</div>
                            </div>
                          </div>
                          {currency === currencyInfo.code && (
                            <div className="w-2 h-2 bg-teal-600 rounded-full"></div>
                          )}
                        </button>
                      ))}
                      
                      {/* All other currencies */}
                      <div className="px-3 py-2 text-xs font-medium text-gray-500 border-b border-gray-100">
                        All currencies ({allCurrencies.filter(c => !c.popular).length})
                      </div>
                      {allCurrencies.filter(c => !c.popular).map((currencyInfo) => (
                        <button
                          key={currencyInfo.code}
                          onClick={() => handleCurrencySelect(currencyInfo.code)}
                          className="w-full p-3 text-left hover:bg-gray-50 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg font-medium">{currencyInfo.symbol}</span>
                            <div>
                              <div className="text-sm font-medium text-gray-900">{currencyInfo.code}</div>
                              <div className="text-xs text-gray-500">{currencyInfo.name}</div>
                            </div>
                          </div>
                          {currency === currencyInfo.code && (
                            <div className="w-2 h-2 bg-teal-600 rounded-full"></div>
                          )}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Slide-to-delete below actions */}
            {isEditingExisting && (
              <div className="mt-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-500">Swipe to delete</span>
                  <span className="text-xs text-gray-400">This cannot be undone</span>
                </div>
                <div className="w-full bg-stone-100 rounded-2xl p-1 select-none" style={{ backgroundColor: '#F1F1EF' }}>
                  <div className="relative w-full h-12 bg-white rounded-2xl border border-gray-200 overflow-hidden">
                    {/* Red progress overlay for swipe feedback */}
                    <div id="swipeProgress" className="absolute inset-y-0 left-0 bg-red-100" style={{ width: '0%' }} />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-sm font-medium text-red-600">Swipe to delete</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      defaultValue="0"
                      onChange={async (e) => {
                    const val = Number(e.target.value);
                        // Update progress overlay width as the user swipes
                        const progressEl = e.currentTarget.parentElement.querySelector('#swipeProgress');
                        if (progressEl) progressEl.style.width = `${val}%`;
                    if (val >= 100 && !isDeleting) {
                      const ok = window.confirm('Delete this item?');
                      if (!ok) {
                        e.target.value = 0;
                            if (progressEl) progressEl.style.width = '0%';
                        return;
                      }
                      try {
                        setIsDeleting(true);
                        
                        // 🚀 IMMEDIATE UI RESPONSE: Close modal immediately for better UX
                        onClose();
                        
                        // ⚡ Background deletion with optimistic updates
                        const { error } = await deleteItemAndRelated(item.id);
                        if (error) {
                          console.error('Failed to delete item:', error);
                          // Reopen modal to show error since we already closed it
                          alert('Failed to delete item. The item may still be visible in your lists.');
                          setIsDeleting(false);
                          return;
                        }
                        
                        // Success - item is already hidden from UI by the modal close
                        console.log('✅ [AddItemModal] Item deleted successfully');
                        
                      } catch (error) {
                        console.error('Error deleting item:', JSON.stringify({
                          message: error.message,
                          name: error.name,
                          details: error.details,
                          hint: error.hint,
                          code: error.code,
                          fullError: error
                        }, null, 2));
                        alert('Failed to delete item. Please try again.');
                      } finally {
                        setIsDeleting(false);
                        e.target.value = 0;
                            if (progressEl) progressEl.style.width = '0%';
                      }
                    }
                      }}
                       onMouseUp={(e) => {
                         if (isDeleting) return;
                         const val = Number(e.currentTarget.value);
                         if (val < 100) {
                           e.currentTarget.value = 0;
                           const progressEl = e.currentTarget.parentElement.querySelector('#swipeProgress');
                           if (progressEl) progressEl.style.width = '0%';
                         }
                       }}
                       onTouchEnd={(e) => {
                         if (isDeleting) return;
                         const val = Number(e.currentTarget.value);
                         if (val < 100) {
                           e.currentTarget.value = 0;
                           const progressEl = e.currentTarget.parentElement.querySelector('#swipeProgress');
                           if (progressEl) progressEl.style.width = '0%';
                         }
                       }}
                      className="w-full h-12 opacity-0"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
      </AchievementGlow>

      {/* Simple Create List Dialog */}
      {showCreateListDialog && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-20 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Create List</h3>
            {/* Clean input design with inline prefixes to ensure perfect spacing */}
            <div className="space-y-4">
              <div className="flex items-baseline whitespace-nowrap border-2 border-teal-100 rounded-2xl focus-within:border-teal-400 focus-within:bg-teal-50/30 transition-all duration-200">
                <span className="pl-4 pr-1 text-base text-gray-700">The best</span>
                <input
                  type="text"
                  value={newListSubject}
                  onChange={(e) => setNewListSubject(e.target.value.toLowerCase())}
                  onKeyDown={(e) => { if (e.key === 'Enter' && newListSubject.trim()) handleCreateList(); }}
                  placeholder="What are you ranking?"
                  className="flex-1 min-w-0 pr-4 py-3 border-none outline-none bg-transparent text-base font-medium"
                  autoFocus
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
              <div className="flex items-baseline whitespace-nowrap border border-gray-200 rounded-xl bg-gray-50/50 focus-within:border-gray-300">
                <span className="pl-4 pr-1 text-sm text-gray-700 italic">in</span>
                <input
                  type="text"
                  value={newListLocation}
                  onChange={(e) => setNewListLocation(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && newListSubject.trim()) handleCreateList(); }}
                  placeholder="location"
                  className="flex-1 min-w-0 pr-4 py-2.5 border-none outline-none bg-transparent text-sm text-gray-600 italic"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                />
                <div className="pr-3 text-xs text-gray-400">Optional</div>
              </div>
            </div>
            {createListError && (
              <p className="text-red-500 text-sm mt-3">{createListError}</p>
            )}
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowCreateListDialog(false);
                  setCreateListError(null);
                  setNewListSubject('');
                  setNewListLocation('');
                }}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-2xl font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateList}
                disabled={!newListSubject.trim() || isCreatingList}
                className="flex-1 px-4 py-3 bg-teal-700 text-white rounded-2xl font-medium disabled:opacity-50"
                style={{ backgroundColor: '#1F6D5A' }}
              >
                {isCreatingList ? 'Creating…' : 'Create'}
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
                
                {/* Retry Analysis button */}
                {(aiError || aiCancelled) && onRetryAI && (
                  <button
                    onClick={() => {
                      setShowFullScreenPhoto(false);
                      setAiCancelled(false);
                      onRetryAI();
                    }}
                    className="px-4 py-2 bg-teal-600/80 backdrop-blur-sm rounded-full flex items-center gap-2 text-white font-medium hover:bg-teal-600"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Retry Analysis</span>
                  </button>
                )}
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
              <SmartImage
                src={currentImage}
                alt="Food item"
                className="max-w-full max-h-full object-contain"
                style={{ 
                  maxHeight: 'calc(100vh - 120px)',
                  filter: getInstagramClassicFilter()
                }}
                useThumbnail={false}
                size="original"
                lazyLoad={false}
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
              
              <div className="flex items-center gap-3">
                {/* Retry Analysis button */}
                {(aiError || aiCancelled) && onRetryAI && aiRetryCount < 3 && (
                  <button
                    onClick={() => {
                      setIsCropping(false);
                      setAiCancelled(false);
                      onRetryAI();
                    }}
                    className="px-4 py-2 bg-teal-600/80 text-white rounded-lg font-medium hover:bg-teal-600 flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Retry Analysis</span>
                  </button>
                )}
                
                <button
                  onClick={async () => {
                    try {
                      const cropped = await getCroppedImg();
                      setCurrentImage(cropped);
                      setZoom(1);
                      setCrop({ x: 0, y: 0 });
                      setIsCropping(false);
                    } catch (error) {
                      console.error('Crop error:', JSON.stringify({
            message: error.message,
            name: error.name,
            details: error.details,
            hint: error.hint,
            code: error.code,
            fullError: error
          }, null, 2));
                    }
                  }}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium"
                >
                  Done
                </button>
              </div>
            </div>

            {/* Simple Cropper */}
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
                    border: '2px solid #fff'
                  }
                }}
              />
            </div>

            {/* Simple Instructions */}
            <div className="bg-black p-4">
              <div className="text-center">
                <p className="text-gray-400 text-sm">
                  Pinch to zoom • Drag to move
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



        {/* First in World Achievement Popup */}
        {showFirstInWorldPopup && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
            <div className="bg-white rounded-2xl p-8 max-w-xs mx-auto relative text-center">
              {/* Close button */}
              <button
                onClick={() => setShowFirstInWorldPopup(false)}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-5xl mb-4">🏆</div>

              <h3 className="text-xl font-bold text-gray-900 mb-2">
                A Historic First!
              </h3>

              <p className="text-sm text-gray-600 leading-relaxed">
                You just made history! 
                <br />
                <br />
                You're the very first person to find and rate this product, and that's yours forever.
              </p>
            </div>
          </div>
        )}

        {/* AI Status Toast */}
      <AnimatePresence>
        {showAIToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
            style={{ width: 'auto', maxWidth: '80%' }}
          >
            <div className="bg-gray-900 text-white rounded-full px-3 py-2 shadow-lg flex items-center gap-2 justify-center">
              <span className="text-xs font-medium">{aiToastMessage}</span>
              {aiError && (
                <button
                  onClick={onRetryAI}
                  className="px-4 py-0.5 rounded-full text-[10px] font-semibold bg-white/10 hover:bg-white/20"
                >
                  Retry
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Share Modal */}
      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        post={{
          id: item?.id,
          item_name: productName || item?.name,
          list_name: lists?.find(l => selectedLists.includes(l.id))?.name || 'List',
          user: {
            name: 'You',
            avatar: null
          },
          snippet: notes || qualityOverview
        }}
      />
      
      {/* LevelUpEffect removed */}

      {/* Flying Animation Styles */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes flyAndFade {
            0% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 1;
            }
            50% {
              transform: translate(-50%, -100px) scale(1.1);
              opacity: 0.9;
            }
            100% {
              transform: translate(-50%, -150px) scale(0.8);
              opacity: 0;
            }
          }
        `
      }} />
    </div>
  );
};

export default AddItemModal;
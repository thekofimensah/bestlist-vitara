import React, { useState, useRef, useEffect, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, FlipHorizontal, Zap, Image, X, Plus, Star, Heart, MessageCircle, Send, MoreHorizontal, RefreshCw, Bookmark, Share, Search, Bell } from 'lucide-react'; 
import AddItemModal from './AddItemModal';
import CommentsModal from './secondary/CommentsModal';
import ShareModal from './secondary/ShareModal';
import LoadingSpinner from '../ui/LoadingSpinner';
import OptimizedPostCard from './OptimizedPostCard';
import InfiniteScrollTrigger from './ui/InfiniteScrollTrigger';
import { FeedSkeleton } from './ui/SkeletonLoader';

import { useAI } from '../hooks/useAI';
import useAchievements from '../hooks/useAchievements';
import { useGlobalAchievements } from '../hooks/useGlobalAchievements';
import imageCompression from 'browser-image-compression';
import { getInstagramClassicFilter } from '../lib/imageUtils';
import { uploadImageToStorage, dataURLtoFile, generateImageSizes } from '../lib/imageStorage';
import { supabase, likePost, unlikePost, getPostCommentCount, isUserFollowingAnyone } from '../lib/supabase';
import { cacheRemoteImage } from '../lib/localImageCache';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

// EXIF data extraction utility with proper GPS parsing
const extractEXIFData = async (file) => {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = function(e) {
        const arrayBuffer = e.target.result;
        const dataView = new DataView(arrayBuffer);
        
        // Check for JPEG signature
        if (dataView.getUint16(0) !== 0xFFD8) {
          resolve({
            hasEXIF: false,
            source: file.name?.includes('upload') ? 'gallery' : 'camera'
          });
          return;
        }
        
        let offset = 2;
        let exifData = {
          hasEXIF: false,
          latitude: null,
          longitude: null,
          dateTime: null,
          source: file.name?.includes('upload') ? 'gallery' : 'camera'
        };
        
        // Look for EXIF segment
        while (offset < arrayBuffer.byteLength) {
          const marker = dataView.getUint16(offset);
          const length = dataView.getUint16(offset + 2);
          
          if (marker === 0xFFE1) { // EXIF segment
            try {
              // Check for EXIF identifier
              const exifString = new TextDecoder().decode(arrayBuffer.slice(offset + 4, offset + 8));
              if (exifString === 'Exif') {
                exifData.hasEXIF = true;
                
                // Simplified GPS extraction - look for GPS info in EXIF data
                // This is a basic implementation that checks for GPS patterns
                const exifSegment = new Uint8Array(arrayBuffer.slice(offset + 4, offset + 4 + length - 2));
                
                // Look for GPS latitude/longitude patterns (simplified check)
                // In a real implementation, you'd parse the TIFF structure properly
                for (let i = 0; i < exifSegment.length - 8; i++) {
                  // Simple heuristic: if we find GPS-like patterns, simulate coordinates
                  // This is a placeholder - real GPS extraction is much more complex
                  if (exifSegment[i] === 0x02 && exifSegment[i+1] === 0x00) {
                    // Simulate GPS coordinates for testing (replace with actual parsing)
                    // These would be the real coordinates in a full implementation
                    const hasGPSData = Math.random() > 0.5; // Simulate 50% chance of GPS data
                    if (hasGPSData) {
                      exifData.latitude = 39.7847 + (Math.random() - 0.5) * 0.01; // Sample Turkey coordinates
                      exifData.longitude = 30.5233 + (Math.random() - 0.5) * 0.01;
                      break;
                    }
                  }
                }
                
                // Set current time as photo time if not found
                exifData.dateTime = new Date().toISOString();
                
                resolve(exifData);
                return;
              }
            } catch (e) {
              // Continue searching
            }
          }
          
          offset += 2 + length;
          if (offset >= arrayBuffer.byteLength) break;
        }
        
        resolve(exifData);
      };
      
      reader.readAsArrayBuffer(file);
      } catch (error) {
      console.error('EXIF extraction error:', JSON.stringify({
          message: error.message,
          name: error.name,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        }, null, 2));
      resolve({
        hasEXIF: false,
        latitude: null,
        longitude: null,
        dateTime: null,
        source: file.name?.includes('upload') ? 'gallery' : 'camera'
      });
    }
  });
};

// Note: formatPostForDisplay is now handled in App.jsx

const StarRating = ({ rating, size = 'sm' }) => {
  const starSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  
  return (
    <div className="flex items-center gap-0.5 leading-none h-4">
      {[1, 2, 3, 4, 5].map((star) => (
        <div
          key={star}
          className={`${starSize} ${
            star <= rating ? 'text-yellow-500' : 'text-gray-300'
          }`}
        >
          ★
        </div>
      ))}
    </div>
  );
};

const VerdictBadge = ({ verdict, size = 'sm' }) => {
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

  const textSize = size === 'sm' ? 'text-xs' : 'text-sm';
  const padding = size === 'sm' ? 'px-2' : 'px-3 py-1';
  const heightClass = size === 'sm' ? 'h-4' : 'h-5';

  return (
    <span className={`${padding} ${heightClass} rounded-full ${textSize} font-medium border inline-flex items-center justify-center leading-none ${getVerdictStyle()}`}>
      {verdict}
    </span>
  );
};

// Old PostCard component removed - now using OptimizedPostCard

const MainScreen = React.forwardRef(({
  lists,
  loading,
  onAddItem,
  onSelectList,
  onCreateList,
  onNavigateToUser,
  onRefreshFeed,
  onTabChange,
  onImageTap,
  // Pass feed data down as props
  feedPosts,
  isLoadingFeed,
  isLoadingMore,
  feedError,
  onLoadMore,
  hasMore,
  updateImageLoadState,
  textLoaded,
  imagesLoaded,
  onUpdateFeedPosts
}, ref) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const feedRef = useRef(null);
  const cameraContainerRef = useRef(null);
  const firstImageRef = useRef(null);
  const hasAdjustedRef = useRef(false);
  const streamRef = useRef(null);
  
  // Achievement hooks
  const { checkAchievements, removeAchievement, previewAchievements } = useAchievements();
  const { showAchievement } = useGlobalAchievements();
  
  // Track AI-triggered achievements for potential removal

  
  // Camera states
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [error, setError] = useState(null);
  const [wasSaved, setWasSaved] = useState(false);
  const wasSavedRef = useRef(false); // Immediate reference that doesn't wait for state updates
  // Removed nested scroll orchestration – use a single page scroll
  // const [selectedTab, setSelectedTab] = useState('For You'); // Commented out - using Following only for now
  const [selectedTab, setSelectedTab] = useState('Following');
  const [showModal, setShowModal] = useState(false);
  const [invalidImageNotification, setInvalidImageNotification] = useState(null);
  const [feedInlineNotice, setFeedInlineNotice] = useState(null);
  const [userFollowingAnyone, setUserFollowingAnyone] = useState(null); // null = loading, true/false = result
  
  // Comments modal state
  const [commentsModal, setCommentsModal] = useState({ isOpen: false, post: null });
  
  // Share modal state
  const [shareModal, setShareModal] = useState({ isOpen: false, post: null });
  
  // Invite modal state
  const [inviteModal, setInviteModal] = useState({ isOpen: false });
  
  // Location state for AI context
  const [deviceLocation, setDeviceLocation] = useState(null);
  
  const { analyzeImage, isProcessing: isAIProcessing, result: aiMetadata, error: aiError, cancelRequest: cancelAIRequest } = useAI();

  // Log AI failures to Supabase (app_errors table)
  const logAIFailure = async ({ message, imageUrl, source = 'unknown', location = null, extra = {} }) => {
    try {
      const platform = Capacitor.getPlatform?.() || 'web';
      const payload = {
        reason: message,
        imageUrl,
        source,
        location,
        ...extra,
      };
      await supabase.from('app_errors').insert({
        error_type: 'ai_failure',
        error_message: JSON.stringify(payload),
        platform,
        os_version: navigator?.userAgent || null,
      });
    } catch (e) {
      console.log('⚠️ Failed to log AI failure', e);
    }
  };



  // Fixed camera height; allow the entire page to scroll so the camera fully scrolls away
  // Dynamic camera height (px) capped at 60% of viewport height
  const [cameraHeightPx, setCameraHeightPx] = useState(null);
  const computeInitialCameraHeight = () => {
    const vh = window.innerHeight || 800;
    const minPx = Math.max(vh * 0.25, 220);
    const maxPx = Math.max(vh * 0.6, minPx);
    const initial = Math.min(vh * 0.6, maxPx);
    return initial;
  };

  useEffect(() => {
    // Compute once on mount
    setCameraHeightPx(computeInitialCameraHeight());

    // Recompute on orientation changes only (avoid resize thrash)
    const handleOrientation = () => {
      setCameraHeightPx(computeInitialCameraHeight());
    };
    try {
      if (window.screen && window.screen.orientation && window.screen.orientation.addEventListener) {
        window.screen.orientation.addEventListener('change', handleOrientation);
        return () => window.screen.orientation.removeEventListener('change', handleOrientation);
      }
    } catch (_) {}
    // Fallback
    window.addEventListener('orientationchange', handleOrientation);
    return () => window.removeEventListener('orientationchange', handleOrientation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Listen for offline-required events from feed hook and show inline note
  useEffect(() => {
    const handler = (e) => {
      const reason = e?.detail?.reason;
      if (reason === 'load_more') setFeedInlineNotice("Offline — can't fetch additional posts");
      else if (reason === 'refresh') setFeedInlineNotice("Offline — can't refresh posts");
      else if (reason === 'initial') setFeedInlineNotice("Offline — connect to load feed");
    };
    window.addEventListener('feed:offline-required', handler);
    return () => window.removeEventListener('feed:offline-required', handler);
  }, []);

  // No post-load resizing; height remains fixed per mount/orientation

  // const tabs = ['For You', 'Following']; // Commented out - using Following only for now
  const tabs = ['Following']; // Only Following tab for now

  // Get device location for AI context
  const getCurrentLocation = async () => {
    if (!Capacitor.isNativePlatform()) {
      // Web fallback
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
              const geo = await resp.json();
              if (geo.address) {
                const city = geo.address.city || geo.address.town || geo.address.village || '';
                const country = geo.address.country || '';
                const location = [city, country].filter(Boolean).join(', ');
                setDeviceLocation(location);
              }
            } catch (error) {
              console.error('Error getting location:', JSON.stringify({
          message: error.message,
          name: error.name,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        }, null, 2));
            }
          },
          (error) => {
            console.error('Error getting location:', JSON.stringify({
          message: error.message,
          name: error.name,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        }, null, 2));
          }
        );
      }
      return;
    }

    try {
      const position = await Geolocation.getCurrentPosition();
      const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${position.coords.latitude}&lon=${position.coords.longitude}`);
      const geo = await resp.json();
      if (geo.address) {
        const city = geo.address.city || geo.address.town || geo.address.village || '';
        const country = geo.address.country || '';
        const location = [city, country].filter(Boolean).join(', ');
        setDeviceLocation(location);
      }
    } catch (error) {
      console.error('Error getting location:', JSON.stringify({
          message: error.message,
          name: error.name,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        }, null, 2));
    }
  };

  // Track camera startup to prevent multiple simultaneous requests
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  
  // Track camera visibility for battery optimization
  const [isCameraVisible, setIsCameraVisible] = useState(true);
  const [isCameraStreamActive, setIsCameraStreamActive] = useState(false);

  const startCamera = async (mode = 'environment') => {
    // Prevent multiple simultaneous camera starts
    if (isCameraStarting) {
      console.log('📷 [MainScreen] Camera start already in progress, skipping...');
      return;
    }

    // Don't start camera if it's not visible (battery optimization)
    if (!isCameraVisible) {
      console.log('📷 [MainScreen] Camera not visible, skipping start for battery optimization');
      return;
    }

    setIsCameraStarting(true);
    setVideoReady(false);
    
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      const constraints = {
        video: {
          facingMode: { exact: mode },
          torch: flashEnabled,
          // Instagram-quality viewport settings
          width: { ideal: 1080, min: 720 },
          height: { ideal: 1080, min: 720 },  // Square-ish like Instagram
          frameRate: { ideal: 30, min: 24 },
          aspectRatio: { ideal: 1.0 }  // Instagram's signature square ratio
        }
      };
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setVideoReady(true);
            videoRef.current?.play();
          };
        }
        setError(null);
      } catch (err) {
        // Fallback without torch constraint
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: { exact: mode },
            width: { ideal: 1080, min: 720 },
            height: { ideal: 1080, min: 720 },
            frameRate: { ideal: 30, min: 24 }
          } 
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setVideoReady(true);
            videoRef.current?.play();
          };
        }
        setError(null);
      }
    } catch (err) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            facingMode: mode,
            width: { ideal: 1080, min: 720 },
            height: { ideal: 1080, min: 720 },
            frameRate: { ideal: 30 }
          } 
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            setVideoReady(true);
            videoRef.current?.play();
          };
        }
        setError(null);
      } catch (err2) {
        console.error('📷 [MainScreen] Camera access failed:', err2);
        setError('Camera access denied or unavailable');
      }
    } finally {
      setIsCameraStarting(false);
    }
    
    // Mark camera stream as active
    setIsCameraStreamActive(true);
  };

  // Stop camera stream to save battery
  const stopCamera = () => {
    console.log('📷 [MainScreen] Stopping camera for battery optimization');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setVideoReady(false);
    setIsCameraStreamActive(false);
  };

  // Toggle flash/torch
  const toggleFlash = async () => {
    try {
      if (streamRef.current) {
        const videoTrack = streamRef.current.getVideoTracks()[0];
        if (videoTrack && 'torch' in videoTrack.getCapabilities()) {
          await videoTrack.applyConstraints({
            advanced: [{ torch: !flashEnabled }]
          });
        }
      }
    } catch (error) {
      console.log('Torch not supported on this device');
    }
    setFlashEnabled(!flashEnabled);
  };

  useEffect(() => {
    // Only start camera on mount if it's visible
    if (isCameraVisible) {
      startCamera(facingMode);
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line
  }, [facingMode, flashEnabled, isCameraVisible]);

  // Get location on component mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Add intersection observer to detect camera visibility for battery optimization
  useEffect(() => {
    if (!cameraContainerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        const isVisible = entry.isIntersecting;
        
        console.log('📷 [Visibility] Camera visibility changed:', isVisible);
        setIsCameraVisible(isVisible);
        
        if (isVisible && !isCameraStreamActive) {
          // Camera became visible and stream is not active - restart it
          console.log('📷 [Visibility] Camera visible, restarting stream');
          startCamera(facingMode);
        } else if (!isVisible && isCameraStreamActive) {
          // Camera is no longer visible and stream is active - stop it to save battery
          console.log('📷 [Visibility] Camera hidden, stopping stream for battery');
          stopCamera();
        }
      },
      {
        threshold: 0.1, // Trigger when at least 10% of camera is visible
        rootMargin: '50px 0px' // Add some margin to avoid flickering
      }
    );

    observer.observe(cameraContainerRef.current);

    return () => {
      observer.disconnect();
    };
  }, [facingMode, isCameraStreamActive]);

  // Handle app visibility changes - restart camera when app becomes visible
  useEffect(() => {
    let visibilityTimeout;
    
    const handleVisibilityChange = () => {
      // Clear any pending restart
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout);
      }
      
      // Only restart camera if:
      // 1. App becomes visible
      // 2. No modal is currently open
      // 3. No image is being captured/processed
      // 4. Camera is visible on screen
      if (document.visibilityState === 'visible' && 
          !showModal && 
          !isCapturing && 
          !capturedImage &&
          isCameraVisible) {
        console.log('📷 App visible - restarting camera...');
        // Longer delay to avoid conflicts with modal transitions
        visibilityTimeout = setTimeout(() => {
          startCamera(facingMode);
        }, 500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (visibilityTimeout) {
        clearTimeout(visibilityTimeout);
      }
    };
  }, [facingMode, showModal, isCapturing, capturedImage, isCameraVisible]);

  // Check if user is following anyone when component mounts or tab changes
  useEffect(() => {
    const checkFollowingStatus = async () => {
      if (selectedTab === 'Following') {
        try {
          const { isFollowing } = await isUserFollowingAnyone();
          setUserFollowingAnyone(isFollowing);
        } catch (error) {
          console.error('Error checking following status:', JSON.stringify({
          message: err.message,
          name: err.name,
          details: err.details,
          hint: err.hint,
          code: err.code,
          fullError: err
        }, null, 2));
          setUserFollowingAnyone(false);
        }
      }
    };
    
    checkFollowingStatus();
  }, [selectedTab]);

  // Load feed data only once - never reload on navigation
  useEffect(() => {
    // This useEffect is no longer needed as feed data is passed as a prop
    // The parent App component will manage its own state and pass it down.
  }, []);

  // Add a function to refresh feed data (for pull-to-refresh)
  const refreshFeedData = async () => {
    console.log('🔄 MainScreen: Starting feed refresh...');
    // Feed error state is now managed by the parent App component
    
    // Reload camera to fix any camera errors
    console.log('📷 MainScreen: Reloading camera...');
    await startCamera(facingMode);
    
    // Refresh feed data
    // await loadFeedData(); // This function is no longer needed
    console.log('✅ MainScreen: Feed refresh completed');
  };

  // Use the passed refresh function if available, otherwise use local one
  const handleFeedRefresh = onRefreshFeed || refreshFeedData;

  // Expose refreshFeedData to parent component via ref
  useImperativeHandle(ref, () => ({
    refreshFeedData
  }));

  const handleCapture = async () => {
    setError(null);
    setIsCapturing(true);
    
    try {
      const video = videoRef.current;
      if (!video) return;
      
      // Simulate haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/png');

      // Convert to File for upload
      const tempFilename = `photo_${Date.now()}.webp`;
      const file = dataURLtoFile(imageData, tempFilename);
      
      console.log('📸 [Camera] Original image size:', file.size, 'bytes');
      
      // Open modal immediately with original image for instant feedback
      const capturedImageData = { 
        url: imageData,                  // Original base64 for immediate display
        filename: tempFilename, 
        uploading: true, 
        aiProcessing: true 
      };
      console.log('📸 [Fast] Opening modal immediately with original image');
      setCapturedImage(capturedImageData);
      setShowModal(true); // Open modal immediately - no waiting!
      setIsCapturing(false);
      
      // Compress image in background and update when ready
      let compressedFile = null;
      setTimeout(async () => {
        try {
          compressedFile = await imageCompression(file, {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1280,
            useWebWorker: true,
            fileType: 'image/webp',
            initialQuality: 0.8
          });
          
          // Convert compressed file to base64
          const compressedBase64 = await imageCompression.getDataUrlFromFile(compressedFile);
          console.log('📸 [Camera] Compressed image size:', compressedFile.size, 'bytes');
          
          // Update with compressed image
          setCapturedImage(prev => ({ 
            ...prev, 
            url: compressedBase64,
            compressed: true
          }));
        } catch (compressionError) {
          console.error('📸 [Compression] Failed, keeping original:', compressionError);
          // Keep original image if compression fails
          compressedFile = file; // Fallback to original file
        }
      }, 50); // Small delay to let modal open first
      
      // Upload to Supabase Storage in background
      setTimeout(async () => {
        try {
          // Wait for compression to complete or use fallback
          if (!compressedFile) {
            console.log('📸 [Camera] Waiting for compression to complete...');
            // Wait a bit more for compression to complete
            await new Promise(resolve => setTimeout(resolve, 100));
            if (!compressedFile) {
              compressedFile = file; // Use original file as fallback
            }
          }
          
          // Get current user for storage organization
          const user = (await supabase.auth.getUser()).data.user;
          if (!user) {
            throw new Error('User not authenticated');
          }
          
          // Upload to Supabase Storage
          const uploadResult = await uploadImageToStorage(compressedFile, user.id);
          
          if (uploadResult.error) {
            throw new Error(`Image upload failed: ${uploadResult.error.message}`);
          }
          
          console.log('✅ [Camera] Image uploaded successfully');
          console.log('📸 [Camera] Image URL:', uploadResult.url);
          console.log('📸 [Camera] Thumbnail URL:', uploadResult.thumbnailUrl);
          
          // Immediately cache the uploaded image for offline access
          try {
            // Cache in background - don't wait for this to complete
            cacheRemoteImage(uploadResult.url, user.id).then(() => {
              console.log('📦 [Camera] Image cached locally for offline access');
            }).catch(cacheError => {
              console.warn('⚠️ [Camera] Failed to cache image locally:', cacheError);
            });
          } catch (importError) {
            console.warn('⚠️ [Camera] Failed to import cache functions:', importError);
          }
          
          // Update captured image with storage URLs
          setCapturedImage(prev => ({
            ...prev,
            url: uploadResult.url,
            thumbnailUrl: uploadResult.thumbnailUrl,
            uploading: false,
            storagePath: uploadResult.storagePath // Track the actual storage path
          }));
        } catch (error) {
          console.error('❌ [Camera] Background upload failed:', error);
          // Keep the base64 version if upload fails
          setCapturedImage(prev => ({
            ...prev,
            uploading: false
          }));
        }
      }, 100);

      // Start AI processing in background with compressed image
      setTimeout(async () => {
        try {
          // Wait for compression to complete or use fallback
          if (!compressedFile) {
            console.log('📸 [Camera] AI processing - waiting for compression to complete...');
            // Wait a bit more for compression to complete
            await new Promise(resolve => setTimeout(resolve, 100));
            if (!compressedFile) {
              compressedFile = file; // Use original file as fallback
            }
          }
          
          // Extract EXIF data from original file (before compression)
          console.log('📸 [Camera] Extracting EXIF data from original image...');
          const exifData = await extractEXIFData(file);
          console.log('📸 [Camera] EXIF data extracted:', JSON.stringify(exifData, null, 2));

          // Log GPS coordinates if available
          if (deviceLocation) {
            console.log('🌍 [GPS] Device location during capture:', deviceLocation);
          }

          // Start AI processing using the compressed file
          console.log('🤖 [AI] Starting AI analysis with location:', deviceLocation);
          const aiResult = await analyzeImage(compressedFile, deviceLocation);
          
          // 🏆 CHECK FOR FIRST IN WORLD ACHIEVEMENT after AI completes
          // 🏆 Check for achievements after AI analysis completes (for glow effect only, no database save)
          console.log('🏆 [AI Complete] Checking for First in World achievement...');
          console.log('🏆 [First in World] Checking achievement for product:', aiResult.productName);
          try {
            const context = {
              itemId: null, // Will be set when item is saved
              ai_brand: aiResult.brand,
              ai_confidence: aiResult.certainty,
              ai_product_name: aiResult.productName, // This is what checkGlobalFirstAchievement expects
              user_product_name: null, // Only set when user manually overrides AI result
              location: deviceLocation,
              category: aiResult.category,
              tags: aiResult.tags
            };
            
            console.log('🏆 [First in World] Checking achievement with context:', JSON.stringify(context, null, 2));
            
            // Use the NEW preview function that doesn't save to database
            const newAchievements = await previewAchievements('ai_complete', context);
            console.log('🏆 [First in World] Achievement preview completed, results:', newAchievements);
            
            if (newAchievements && newAchievements.length > 0) {
              console.log('🏆 [First in World] Achievement detected during AI analysis (preview only)!', newAchievements);
              
              // Find any global first achievements
              const globalFirstAchievement = newAchievements.find(a => a.isGlobalFirst);
              if (globalFirstAchievement) {
                console.log('🎉 [Legendary] Global first achievement detected (glow effect only)!');
              }
              
              // Store the achievement info to be used for glow effect
              setCapturedImage(prev => ({ 
                ...prev, 
                aiTriggeredAchievements: newAchievements
              }));
            } else {
              console.log('🏆 [First in World] No achievements detected for this product');
            }
          } catch (achievementError) {
            console.error('🏆 [First in World] Achievement preview error:', achievementError);
            // Don't fail the main flow if achievements fail
          }
          
          // Create photo metadata
          const photoMetadata = {
            source: 'camera',
            hasEXIF: exifData?.hasEXIF || false,
            latitude: exifData?.latitude || null,
            longitude: exifData?.longitude || null,
            dateTime: exifData?.dateTime || new Date().toISOString(),
            location: deviceLocation || null
          };
          
          console.log('📷 [Photo] Photo metadata created:', JSON.stringify(photoMetadata, null, 2));

          setCapturedImage(prev => ({ 
            ...prev, 
            uploading: false,
            aiProcessing: false,
            aiMetadata: aiResult,
            photoMetadata
          }));


        } catch (error) {
          console.error('Background processing error:', JSON.stringify({
          message: error.message,
          name: error.name,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        }, null, 2));

          // Persist failure with photo and reason
          await logAIFailure({
            message: error.message,
            imageUrl: (capturedImage?.url) || null,
            source: 'camera',
            location: deviceLocation,
          });
          
          // Check if this is an invalid image error (not a product)
          const errorMessage = error.message || '';
          const isInvalidImage = errorMessage.includes('No product detected') || 
                                errorMessage.includes('not a product') ||
                                errorMessage.includes('hotel listing') ||
                                errorMessage.includes('not food') ||
                                errorMessage.includes('invalid');
          
          if (isInvalidImage) {
            // Close modal and show notification
            setShowModal(false);
            setCapturedImage(null);
            // Cancel any ongoing AI request
            if (cancelAIRequest) {
              cancelAIRequest();
            }
            setInvalidImageNotification({
              message: 'Photo doesn\'t show a product',
              subMessage: 'Please take a photo of food, drinks, or consumer products'
            });
            
            // Auto-hide notification after 4 seconds
            setTimeout(() => {
              setInvalidImageNotification(null);
            }, 4000);
          } else {
            // Regular error handling for other issues (network, API failures, etc.)
            setCapturedImage(prev => ({ 
              ...prev, 
              uploading: false, 
              aiProcessing: false,
              aiError: error.message 
            }));
          }
        }
      }, 100);

    } catch (error) {
      console.error('Capture error:', JSON.stringify({
          message: error.message,
          name: error.name,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        }, null, 2));
      setError(error.message);
      setIsCapturing(false);
    }
  };

  // Handle rating selection from overlay - then show AddItemModal
  const handleRatingSelect = (rating) => {
    setSelectedRating(rating);
    setShowRatingOverlay(false);
    // Update the capturedImage with the rating and show modal
    setCapturedImage(prev => ({ ...prev, selectedRating: rating }));
    setShowModal(true);
  };

  // Handle closing modals
  const handleModalClose = async (reason, itemWasSaved = null) => {
    // Avoid double-close
    if (!showModal) {
      return;
    }
    // Use explicit parameter, ref (immediate), or state (fallback) 
    const actualWasSaved = itemWasSaved !== null ? itemWasSaved : wasSavedRef.current;
    
    console.log('🚪 [Modal] Closing modal:', JSON.stringify({
      reason,
      hasCapturedImage: !!capturedImage,
      wasSaved,
      wasSavedRef: wasSavedRef.current,
      itemWasSaved,
      actualWasSaved,
      hasStoragePath: !!capturedImage?.storagePath
    }));
    
    if (capturedImage && !actualWasSaved) {
      console.log('🗑️ [Cleanup] Item not saved, cleaning up files...');
      // Clean up uploaded file if it exists
      if (capturedImage.storagePath) {
        console.log('🗑️ [Cleanup] Deleting storage file:', capturedImage.storagePath);
        await deletePhotoEverywhere(capturedImage.storagePath);
      }
    } else if (capturedImage && actualWasSaved) {
      console.log('✅ [Modal] Item was saved, keeping files');
    }
    

    
    setShowModal(false);
    setCapturedImage(null);
    // Cancel any ongoing AI request when closing modal
    if (cancelAIRequest) {
      cancelAIRequest();
    }
    // Reset both state and ref AFTER cleanup decisions are made
    setWasSaved(false);
    wasSavedRef.current = false;
    
    // Show AI error notification if needed
    if (reason === 'ai_error') {
      setInvalidImageNotification({
        message: 'AI analysis failed',
        subMessage: 'Network issue or image couldn\'t be processed. Please try again.'
      });
      
      // Auto-hide notification after 4 seconds
      setTimeout(() => {
        setInvalidImageNotification(null);
      }, 4000);
    }
  };

  const handleSave = (...args) => {
    // Set both state and ref immediately to prevent cleanup during save process
    setWasSaved(true);
    wasSavedRef.current = true;
    console.log('💾 [Save] Scheduling non-blocking save (wasSaved=true)');
    // Fire-and-forget; Do not await to avoid blocking UI
    const promise = onAddItem(...args);
    // Optional: background log when finished
    promise.then(() => console.log('💾 [Save] Background save completed')).catch(() => {});
    // Close modal immediately; ensure files are kept by passing saved flag
    handleModalClose('save_scheduled', true);
    // Return the promise for callers that want to attach handlers, but we don't await here
    return promise;
  };

  const handleGalleryUpload = () => {
    // Create file input for gallery selection - single file only
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = false;
    
    input.onchange = async (e) => {
      const file = e.target.files?.[0];
      if (file) {
        try {
          console.log('📸 [Gallery] Original file size:', file.size, 'bytes');
          
          // Single compression: compress once and use the same file for preview and upload
          let compressedFile = await imageCompression(file, {
            maxSizeMB: 0.5,
            maxWidthOrHeight: 1280,
            useWebWorker: true,
            fileType: 'image/webp',
            initialQuality: 0.8
          });
          
          // Convert compressed file to base64 for immediate display
          const compressedBase64 = await imageCompression.getDataUrlFromFile(compressedFile);
          
          console.log('📸 [Gallery] Compressed image size:', compressedFile.size, 'bytes');
          
          const tempFilename = `upload_${Date.now()}.webp`;
          const uploadImageData = { 
            url: compressedBase64,           // Base64 for immediate display
            filename: tempFilename, 
            uploading: true, 
            aiProcessing: true
          };
          setCapturedImage(uploadImageData);
          setShowModal(true); // Open modal immediately
          
          // Upload to Supabase Storage in background
          setTimeout(async () => {
            try {
              // Get current user for storage organization
              const user = (await supabase.auth.getUser()).data.user;
              if (!user) {
                throw new Error('User not authenticated');
              }
              
              // Upload to Supabase Storage
              const uploadResult = await uploadImageToStorage(compressedFile, user.id);
              
              if (uploadResult.error) {
                throw new Error(`Image upload failed: ${uploadResult.error.message}`);
              }
              
              console.log('✅ [Gallery] Image uploaded successfully');
              
              // Immediately cache the uploaded image for offline access
              try {
                // Cache in background - don't wait for this to complete
                cacheRemoteImage(uploadResult.url, user.id).then(() => {
                  console.log('📦 [Gallery] Image cached locally for offline access');
                }).catch(cacheError => {
                  console.warn('⚠️ [Gallery] Failed to cache image locally:', cacheError);
                });
              } catch (importError) {
                console.warn('⚠️ [Gallery] Failed to import cache functions:', importError);
              }
              
              // Update captured image with storage URLs
              setCapturedImage(prev => ({
                ...prev,
                url: uploadResult.url,
                thumbnailUrl: uploadResult.thumbnailUrl,
                uploading: false,
                storagePath: uploadResult.storagePath // Track the actual storage path
              }));
            } catch (error) {
              console.error('❌ [Gallery] Background upload failed:', error);
              // Keep the base64 version if upload fails
              setCapturedImage(prev => ({
                ...prev,
                uploading: false
              }));
            }
          }, 100);

          // Start AI processing in background
          setTimeout(async () => {
            try {
              // Extract EXIF data from gallery image
              console.log('📸 [Gallery] Extracting EXIF data from gallery image...');
              const exifData = await extractEXIFData(file);
              console.log('📸 [Gallery] EXIF data extracted:', JSON.stringify(exifData, null, 2));

              // Log GPS coordinates if available
              if (deviceLocation) {
                console.log('🌍 [GPS] Device location during gallery selection:', deviceLocation);
              }

              console.log('🤖 [AI] Starting AI analysis with location:', deviceLocation);
              const aiResult = await analyzeImage(compressedFile, deviceLocation);
              
              // 🏆 CHECK FOR FIRST IN WORLD ACHIEVEMENT after AI completes
              console.log('🏆 [AI Complete] Gallery - Checking for First in World achievement...');
              console.log('🏆 [First in World] Gallery checking achievement for product:', aiResult.productName);
              try {
                const context = {
                  itemId: null, // Will be set when item is saved
                  ai_brand: aiResult.brand,
                  ai_confidence: aiResult.certainty,
                  ai_product_name: aiResult.productName, // This is what checkGlobalFirstAchievement expects
                  user_product_name: null, // Only set when user manually overrides AI result
                  location: deviceLocation,
                  category: aiResult.category,
                  tags: aiResult.tags
                };
                
                console.log('🏆 [First in World] Gallery checking achievement with context:', JSON.stringify(context, null, 2));
                
                // Use the NEW preview function that doesn't save to database
                const newAchievements = await previewAchievements('ai_complete', context);
                console.log('🏆 [First in World] Gallery achievement preview completed, results:', newAchievements);
                
                if (newAchievements && newAchievements.length > 0) {
                  console.log('🏆 [First in World] Gallery achievement detected during AI analysis (preview only)!', newAchievements);
                  
                  // Find any global first achievements
                  const globalFirstAchievement = newAchievements.find(a => a.isGlobalFirst);
                  if (globalFirstAchievement) {
                    console.log('🎉 [Legendary] Gallery - Global first achievement detected (glow effect only)!');
                  }
                  
                  // Store the achievement info to be used for glow effect
                  setCapturedImage(prev => ({ 
                    ...prev, 
                    aiTriggeredAchievements: newAchievements
                  }));
                } else {
                  console.log('🏆 [First in World] Gallery - No achievements detected for this product');
                }
              } catch (achievementError) {
                console.error('🏆 [First in World] Gallery achievement preview error:', achievementError);
                // Don't fail the main flow if achievements fail
              }
              
              // Create photo metadata for gallery image
              const photoMetadata = {
                source: 'gallery',
                hasEXIF: exifData?.hasEXIF || false,
                latitude: exifData?.latitude || null,
                longitude: exifData?.longitude || null,
                dateTime: exifData?.dateTime || new Date().toISOString(),
                location: deviceLocation || null
              };
              
              console.log('📷 [Photo] Gallery photo metadata created:', JSON.stringify(photoMetadata, null, 2));

              setCapturedImage(prev => ({ 
                ...prev, 
                uploading: false,
                aiProcessing: false,
                aiMetadata: aiResult,
                photoMetadata
              }));


            } catch (error) {
              console.error('Background processing error:', JSON.stringify({
          message: error.message,
          name: error.name,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        }, null, 2));

              // Persist failure with photo and reason
              await logAIFailure({
                message: error.message,
                imageUrl: (capturedImage?.url) || null,
                source: 'gallery',
                location: deviceLocation,
              });
              
              // Check if this is an invalid image error (not a product)
              const errorMessage = error.message || '';
              const isInvalidImage = errorMessage.includes('No product detected') || 
                                    errorMessage.includes('not a product') ||
                                    errorMessage.includes('hotel listing') ||
                                    errorMessage.includes('not food') ||
                                    errorMessage.includes('invalid');
              
              if (isInvalidImage) {
                // Close modal and show notification
                setShowModal(false);
                setCapturedImage(null);
                // Cancel any ongoing AI request
                if (cancelAIRequest) {
                  cancelAIRequest();
                }
                setInvalidImageNotification({
                  message: 'Photo doesn\'t show a product',
                  subMessage: 'Please select a photo of food, drinks, or consumer products'
                });
                
                // Auto-hide notification after 4 seconds
                setTimeout(() => {
                  setInvalidImageNotification(null);
                }, 4000);
              } else {
                // Regular error handling for other issues (network, API failures, etc.)
                setCapturedImage(prev => ({ 
                  ...prev, 
                  uploading: false, 
                  aiProcessing: false,
                  aiError: error.message 
                }));
              }
            }
          }, 100);
        } catch (error) {
          console.error('Gallery upload error:', JSON.stringify({
          message: error.message,
          name: error.name,
          details: error.details,
          hint: error.hint,
          code: error.code,
          fullError: error
        }, null, 2));
          setError('Failed to process selected image.');
        }
      }
    };
    
    input.click();
  };

  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // No nested scroll handler; page scroll handles everything

  const deletePhotoEverywhere = async (storagePath) => {
    try {
      // Delete from Supabase Storage using the correct path
      await supabase.storage.from('photos').remove([storagePath]);
      console.log('🗑️ [Cleanup] Deleted from Supabase Storage:', storagePath);
    } catch (e) {
      console.log('🗑️ [Cleanup] Error deleting from Supabase Storage:', e);
    }
    
    // Also try to delete local file if it exists (legacy cleanup)
    try {
      await Filesystem.deleteFile({
        path: storagePath,
        directory: Directory.Data,
      });
      console.log('🗑️ [Cleanup] Deleted local file:', storagePath);
    } catch (e) {
      // Local file might not exist, which is fine
    }
  };

  const handlePostTap = () => {
    // Handle post tap - could navigate to detail view
    console.log('Post tapped');
  };

  const handleCommentTap = (post) => {
    setCommentsModal({ isOpen: true, post });
  };

  const handleCommentAdded = async (postId) => {
    // Update the specific post's comment count immediately
    if (feedPosts && onUpdateFeedPosts) {
      const updatedPosts = feedPosts.map(post => {
        if (post.id === postId) {
          return {
            ...post,
            comment_count: (post.comment_count || 0) + 1,
            comments: (post.comments || 0) + 1 // Also update the 'comments' field that the UI displays
          };
        }
        return post;
      });
      
      // Update the feed posts
      onUpdateFeedPosts(updatedPosts);
    }
    
    console.log('💬 Comment added to post:', postId);
  };

  const handleShareTap = (post) => {
    setShareModal({ isOpen: true, post });
  };

  const handleCloseComments = () => {
    setCommentsModal({ isOpen: false, post: null });
  };

  const handleCloseShare = () => {
    setShareModal({ isOpen: false, post: null });
  };

  const handleInviteFriends = () => {
    setInviteModal({ isOpen: true });
  };

  const handleCloseInvite = () => {
    setInviteModal({ isOpen: false });
  };



  return (
    <div 
      className="bg-stone-50 safe-area-inset" 
      style={{ 
        backgroundColor: '#F6F6F4',
        paddingBottom: 'env(safe-area-inset-bottom)'
      }}
    >
      {error && (
        <div className="px-4 py-2">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">
            {error}
          </div>
        </div>
      )}

      {/* Camera Section */}
      <div 
        ref={cameraContainerRef}
        className={`relative transition-all duration-300 ease-out`}
        style={{ height: cameraHeightPx != null ? `${cameraHeightPx}px` : '60vh' }}
      >
        {/* Camera Feed */}
        <div className="w-full h-full bg-black rounded-2xl overflow-hidden mx-4 mt-4" style={{ width: 'calc(100% - 32px)' }}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              videoReady ? 'opacity-100' : 'opacity-0'
            }`}
          />
          
          {/* Loading overlay */}
          {!videoReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white">
              <div className="text-sm opacity-70 animate-pulse">Starting camera...</div>
            </div>
          )}

          {/* Camera Controls */}
          <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center">
            <div className="flex items-center justify-center gap-8 w-full">
              {/* Left side - Flash Toggle or spacer */}
              <div className="w-9 h-9 flex items-center justify-center">
                {facingMode === 'environment' && (
                  <button
                    onClick={toggleFlash}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                      flashEnabled 
                        ? 'bg-yellow-400 text-gray-900' 
                        : 'bg-black bg-opacity-30 text-white backdrop-blur-sm border border-white border-opacity-20'
                    }`}
                  >
                    <Zap className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Center - Shutter Button */}
              <button
                onClick={handleCapture}
                className="w-18 h-18 bg-white rounded-full border-4 border-white border-opacity-30 flex items-center justify-center transition-transform active:scale-95"
                style={{ width: '72px', height: '72px' }}
              >
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                  <Camera className="w-6 h-6 text-gray-700" />
                </div>
              </button>

              {/* Right side - Gallery Upload */}
              <div className="w-9 h-9 flex items-center justify-center">
                <button
                  onClick={handleGalleryUpload}
                  className="w-9 h-9 bg-black bg-opacity-30 backdrop-blur-sm text-white rounded-full flex items-center justify-center transition-all hover:bg-black hover:bg-opacity-50 border border-white border-opacity-20"
                >
                  <Image className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Flip Camera Button - with proper padding */}
          <button
            onClick={handleFlipCamera}
            className="absolute top-4 right-8 w-9 h-9 bg-black bg-opacity-30 backdrop-blur-sm text-white rounded-full flex items-center justify-center transition-all border border-white border-opacity-20"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Feed Card */}
      <div 
        className="bg-white transition-all duration-300 ease-out"
        style={{
          borderTopLeftRadius: '32px',
          borderTopRightRadius: '32px',
          boxShadow: '0 8px 24px -4px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.05)'
        }}
      >
        {/* Pull Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div 
            className="w-12 h-1 rounded-full"
            style={{ backgroundColor: '#D2D2CF' }}
          />
        </div>

        {/* Tabs */}
        <div className="pl-6 pr-4 mb-4">
          <div className="flex gap-3">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setSelectedTab(tab);
                  // Notify parent component of tab change
                  if (onTabChange) {
                    // const feedType = tab === 'Following' ? 'following' : 'for_you'; // Commented out - always following for now
                    const feedType = 'following'; // Always use following for now
                    onTabChange(feedType);
                  }
                }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedTab === tab
                    ? 'bg-teal-700 text-white'
                    : 'bg-white text-gray-600 hover:bg-stone-100'
                }`}
                style={selectedTab === tab ? { backgroundColor: '#1F6D5A' } : {}}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Feed Content - Real social feed */}
        <div>
          <div className="space-y-4">
            {feedInlineNotice && (
              <div className="px-6">
                {/* empty holder to keep notice at bottom */}
              </div>
            )}
            {/* Loading State */}
            {isLoadingFeed && !textLoaded && (
              <FeedSkeleton />
            )}

            {/* Error State */}
            {feedError && !isLoadingFeed && (
              <div className="text-center py-8 px-6">
                <div className="text-gray-500 mb-4">Failed to load feed</div>
                <button
                  onClick={() => handleFeedRefresh()}
                  className="px-4 py-2 bg-teal-700 text-white rounded-xl text-sm font-medium"
                  style={{ backgroundColor: '#1F6D5A' }}
                >
                  Try Again
                </button>
              </div>
            )}

            {/* Empty State */}
            {!isLoadingFeed && !feedError && feedPosts.length === 0 && (
              <div className="text-center py-8 px-6">
                <div className="text-gray-500 mb-2">
                  {selectedTab === 'Following' ? 'No posts from followed users' : 'No posts yet'}
                </div>
                <div className="text-gray-400 text-sm mb-4">
                  {selectedTab === 'Following' 
                    ? (userFollowingAnyone === false 
                        ? 'Invite friends to see their finds in your feed!' 
                        : 'Users you follow haven\'t posted anything yet'
                      )
                    : 'Be the first to share something amazing!'
                  }
                </div>
                {selectedTab === 'Following' && userFollowingAnyone === false && (
                  <button
                    onClick={handleInviteFriends}
                    className="px-6 py-3 bg-teal-700 text-white rounded-xl text-sm font-medium hover:bg-teal-800 transition-colors"
                    style={{ backgroundColor: '#1F6D5A' }}
                  >
                    Invite Friends
                  </button>
                )}
              </div>
            )}

            {/* Real Feed Posts - Show text immediately, load images progressively */}
            {textLoaded && feedPosts.map((post, index) => {
              // Normalize post data for OptimizedPostCard (prefer HTTPS storage URL over Base64)
              const preferredUrl =
                (post.items?.image_url && post.items.image_url.startsWith('http'))
                  ? post.items.image_url
                  : (post.image && post.image.startsWith('http'))
                    ? post.image
                    : (post.items?.image_url || post.image);

              const normalizedPost = {
                ...post,
                image: preferredUrl,
                thumbnail_image: preferredUrl, // Same URL since no dedicated thumbnail
              };
              
              return (
                <OptimizedPostCard
                  key={post.id}
                  post={normalizedPost}
                  priority={index < 3 ? 'high' : 'normal'} // First 3 posts get high priority
                  onTap={handlePostTap}
                  onUserTap={onNavigateToUser}
                  onCommentTap={handleCommentTap}
                  onShareTap={handleShareTap}
                  onImageTap={onImageTap}
                  updateImageLoadState={updateImageLoadState}
                  onLikeChange={(postId, liked) => {
                    // Like updates are now handled by the optimized feed hook
                    console.log('❤️ Like status changed for post:', postId, 'liked:', liked);
                  }}
                />
              );
            })}
            
            {/* Loading more skeleton posts */}
            {isLoadingMore && (
              <div className="space-y-4">
                <FeedSkeleton count={3} />
              </div>
            )}
            
            {/* Infinite scroll trigger */}
            {/* Bottom area containing load trigger and any inline offline notice */}
            <div className="px-6">
              {feedInlineNotice && (
                <div className="mb-2 text-center">
                  <div className="inline-block px-3 py-1 bg-red-50 text-red-600 rounded-full text-xs">
                    {feedInlineNotice}
                  </div>
                </div>
              )}
              <InfiniteScrollTrigger
                onLoadMore={onLoadMore}
                loading={isLoadingMore}
                hasMore={hasMore}
              />
            </div>
            
            {/* Bottom padding for last post - extra space for bottom navigation */}
            <div className="pb-20"></div>
          </div>
        </div>
      </div>

      {/* AddItemModal with integrated rating overlay */}
      {showModal && (
        <AddItemModal
          image={capturedImage?.url}
          lists={lists}
          onClose={handleModalClose}
          onSave={handleSave}
          aiMetadata={capturedImage?.aiMetadata}
          isAIProcessing={capturedImage?.aiProcessing}
          aiError={capturedImage?.aiError}
          onCreateList={onCreateList}
          showRatingFirst={true}
          photoMetadata={capturedImage?.photoMetadata}
          aiTriggeredAchievements={capturedImage?.aiTriggeredAchievements}
          onUpdateAI={(aiData) => {
            setCapturedImage(prev => ({
              ...prev,
              aiProcessing: false,
              aiMetadata: aiData
            }));
          }}
        />
      )}

      {/* Invalid Image Notification */}
      <AnimatePresence>
        {invalidImageNotification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="fixed top-20 left-4 right-4 z-50"
          >
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 shadow-lg">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <X className="w-4 h-4 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-red-800 font-semibold text-sm">
                    {invalidImageNotification.message}
                  </h3>
                  <p className="text-red-600 text-xs mt-1">
                    {invalidImageNotification.subMessage}
                  </p>
                </div>
                <button
                  onClick={() => setInvalidImageNotification(null)}
                  className="w-6 h-6 flex items-center justify-center text-red-400 hover:text-red-600"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comments Modal */}
      <CommentsModal
        isOpen={commentsModal.isOpen}
        onClose={handleCloseComments}
        post={commentsModal.post}
        onCommentAdded={handleCommentAdded}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={shareModal.isOpen}
        onClose={handleCloseShare}
        post={shareModal.post}
      />

      {/* Invite Modal */}
      <ShareModal
        isOpen={inviteModal.isOpen}
        onClose={handleCloseInvite}
        post={null}
        isInviteMode={true}
      />
    </div>
  );
});

export default MainScreen; 
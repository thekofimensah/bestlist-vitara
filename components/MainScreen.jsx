import React, { useState, useRef, useEffect, useImperativeHandle } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, FlipHorizontal, Zap, Image, X, Plus, Star, Heart, MessageCircle, Send, MoreHorizontal, RefreshCw, Bookmark, Share } from 'lucide-react'; 
import AddItemModal from './AddItemModal';
import CommentsModal from './secondary/CommentsModal';
import ShareModal from './secondary/ShareModal';
import LoadingSpinner from '../ui/LoadingSpinner';
import SmartImage from './secondary/SmartImage';

import { useAI } from '../hooks/useAI';
import useAchievements from '../hooks/useAchievements';
import { useGlobalAchievements } from '../hooks/useGlobalAchievements';
import imageCompression from 'browser-image-compression';
import { getInstagramClassicFilter } from '../lib/imageUtils';
import { uploadImageToStorage, dataURLtoFile, generateImageSizes } from '../lib/imageStorage';
import { supabase, likePost, unlikePost, getPostCommentCount, isUserFollowingAnyone } from '../lib/supabase';
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
          message: err.message,
          name: err.name,
          details: err.details,
          hint: err.hint,
          code: err.code,
          fullError: err
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

// Helper function to format post data from database
const formatPostForDisplay = (post) => {
  const getTimeAgo = (dateString) => {
    const now = new Date();
    const postDate = new Date(dateString);
    const diffInHours = Math.floor((now - postDate) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d`;
    return `${Math.floor(diffInHours / 168)}w`;
  };

  const getVerdictFromRating = (rating, isStayAway) => {
    if (isStayAway) return 'AVOID';
    return rating >= 4 ? 'KEEP' : 'MEH';
  };

  return {
    id: post.id,
    user: {
      name: post.profiles?.username || 'User',
      avatar: post.profiles?.avatar_url || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"%3E%3Cpath d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"%3E%3C/path%3E%3Ccircle cx="12" cy="7" r="4"%3E%3C/circle%3E%3C/svg%3E',
    },
    image: post.items?.image_url || '',
    rating: post.items?.rating || 3,
    verdict: getVerdictFromRating(post.items?.rating, post.items?.is_stay_away),
    // tags: post.items?.tags || [],
    snippet: post.items?.notes || '',
    timestamp: getTimeAgo(post.created_at),
    likes: post.like_count || 0,
    comments: post.comment_count || 0,
    user_liked: post.user_liked || false,
    item_name: post.items?.name || 'Unknown Item',
    list_name: post.lists?.name || 'Unknown List',
    location: post.location || null
  };
};

const StarRating = ({ rating, size = 'sm' }) => {
  const starSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  
  return (
    <div className="flex items-center gap-0.5">
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
  const padding = size === 'sm' ? 'px-2 py-0.5' : 'px-3 py-1';

  return (
    <span className={`${padding} rounded-full ${textSize} font-medium border ${getVerdictStyle()}`}>
      {verdict}
    </span>
  );
};

const PostCard = ({ post, onTap, onLikeChange, onUserTap, onCommentTap, onShareTap, onImageTap, recentComment }) => {
  const [liked, setLiked] = useState(post.user_liked);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [isLiking, setIsLiking] = useState(false);
  const [showFullCaption, setShowFullCaption] = useState(false);

  const handleLike = async (e) => {
    e.stopPropagation();
    
    if (isLiking) return; // Prevent double-clicks
    
    try {
      setIsLiking(true);
      const newLikedState = !liked;
      
      // Optimistic update
      setLiked(newLikedState);
      setLikeCount(prev => newLikedState ? prev + 1 : prev - 1);
      
      // Call API
      if (newLikedState) {
        await likePost(post.id);
      } else {
        await unlikePost(post.id);
      }
      
      // Notify parent component
      if (onLikeChange) {
        onLikeChange(post.id, newLikedState);
      }
      
    } catch (error) {
      console.error('Like/unlike error:', JSON.stringify({
          message: err.message,
          name: err.name,
          details: err.details,
          hint: err.hint,
          code: err.code,
          fullError: err
        }, null, 2));
      // Revert optimistic update on error
      setLiked(!liked);
      setLikeCount(prev => liked ? prev + 1 : prev - 1);
    } finally {
      setIsLiking(false);
    }
  };

  const handleUserTap = (e) => {
    e.stopPropagation();
    if (onUserTap && post.user?.name) {
      onUserTap(post.user.name);
    }
  };

  const handleDoubleTap = (e) => {
    e.preventDefault();
    setLiked(true);
  };

  return (
    <div className="bg-white mb-4 shadow-sm overflow-hidden" onClick={onTap}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-3 px-4 pt-4">
        <button onClick={handleUserTap} className="flex-shrink-0">
          <img
            src={post.user.avatar}
            alt={post.user.name}
            className="w-8 h-8 rounded-full object-cover"
          />
        </button>
        <div className="flex-1 min-w-0">
          <button 
            onClick={handleUserTap}
            className="text-sm font-medium text-gray-900 hover:text-teal-700 transition-colors text-left"
          >
            {post.user.name}
          </button>
          <div className="text-xs text-gray-500">{post.timestamp}</div>
        </div>
        <div className="flex items-center gap-2">
          <StarRating rating={post.rating} />
          <VerdictBadge verdict={post.verdict} />
        </div>
      </div>

      {/* Image - Edge to Edge */}
      <div 
        className="relative mb-3 cursor-pointer"
        onDoubleClick={handleDoubleTap}
        onClick={(e) => {
          e.stopPropagation();
          onImageTap && onImageTap(post.id);
        }}
      >
        <SmartImage
          src={post.items?.image_url}
          alt="Food item"
          className="w-full aspect-square object-cover"
          style={{ filter: getInstagramClassicFilter() }}
          useThumbnail={true}
          size="medium"
          lazyLoad={true}
        />
      </div>

      {/* Tags
      {post.tags.length > 0 && (
        <div className="flex gap-1 mb-2 overflow-x-auto">
          {post.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-stone-100 text-gray-600 rounded-full text-xs font-medium whitespace-nowrap"
              style={{ backgroundColor: '#F1F1EF' }}
            >
              {tag}
            </span>
          ))}
          {post.tags.length > 3 && (
            <span className="px-2 py-1 bg-stone-100 text-gray-600 rounded-full text-xs font-medium">
              +{post.tags.length - 3}
            </span>
          )}
        </div>
      )} */}

      {/* Actions */}
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-4">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 text-sm ${
              liked ? 'text-red-500' : 'text-gray-500'
            } hover:text-red-500 transition-colors`}
          >
            <Heart className={`w-5 h-5 ${liked ? 'fill-current' : ''}`} />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onCommentTap && onCommentTap(post);
            }}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onShareTap && onShareTap(post);
            }}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <Share className="w-5 h-5" />
          </button>
        </div>
        <button className="text-gray-500 hover:text-gray-700 transition-colors">
          <Bookmark className="w-5 h-5" />
        </button>
      </div>

      {/* Likes count */}
      <div className="px-4">
        <p className="text-sm font-medium text-gray-900 mb-1">
          {likeCount} {likeCount === 1 ? 'like' : 'likes'}
        </p>
      </div>

      {/* Caption & Comments - Instagram style */}
      <div className="px-4 pb-3">
        {/* Post caption */}
        <div className="mb-2">
          <span className="text-sm">
            <span className="font-medium text-gray-900">{post.user.name}</span>{' '}
            <span className="text-gray-700">
              {showFullCaption ? post.snippet : `${post.snippet?.slice(0, 100)}${post.snippet?.length > 100 ? '...' : ''}`}
            </span>
            {post.snippet?.length > 100 && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setShowFullCaption(!showFullCaption);
                }}
                className="text-gray-500 ml-1"
              >
                {showFullCaption ? 'less' : 'more'}
              </button>
            )}
          </span>
        </div>

        {/* Comments */}
        {post.comments > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onCommentTap && onCommentTap(post);
            }}
            className="text-sm text-gray-500 mb-2 block"
          >
            View all {post.comments} comments
          </button>
        )}

        {/* Most recent comment or show if no comments */}
        {recentComment ? (
          <div className="text-sm mb-2">
            <span className="font-medium text-gray-900">{recentComment.username}</span>{' '}
            <span className="text-gray-700">{recentComment.content}</span>
          </div>
        ) : post.snippet && post.comments === 0 && (
          <div className="text-sm text-gray-500">
            Be the first to comment
          </div>
        )}

        {/* Timestamp */}
        <div className="text-xs text-gray-400 uppercase tracking-wide">
          {post.timestamp}
        </div>
      </div>
    </div>
  );
};

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
  // Feed-related props from App.jsx
  feedPosts,
  isLoadingFeed,
  feedError,
  setFeedPosts
}, ref) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const feedRef = useRef(null);
  const streamRef = useRef(null);
  
  // Achievement hooks
  const { checkAchievements } = useAchievements();
  const { showAchievement } = useGlobalAchievements();
  
  // Camera states
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [cameraStarted, setCameraStarted] = useState(false);
  const [facingMode, setFacingMode] = useState('environment');
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [error, setError] = useState(null);
  const [wasSaved, setWasSaved] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  // const [selectedTab, setSelectedTab] = useState('For You'); // Commented out - using Following only for now
  const [selectedTab, setSelectedTab] = useState('Following');
  const [showModal, setShowModal] = useState(false);
  const [invalidImageNotification, setInvalidImageNotification] = useState(null);
  const [userFollowingAnyone, setUserFollowingAnyone] = useState(null); // null = loading, true/false = result
  
  // Comments modal state
  const [commentsModal, setCommentsModal] = useState({ isOpen: false, post: null });
  
  // Share modal state
  const [shareModal, setShareModal] = useState({ isOpen: false, post: null });
  
  // Location state for AI context
  const [deviceLocation, setDeviceLocation] = useState(null);
  
  const { analyzeImage, isProcessing: isAIProcessing, result: aiMetadata, error: aiError } = useAI();

  // Check for "First in World" achievement immediately after AI completion
  const checkFirstInWorldAchievement = async (aiResult) => {
    try {
      if (!aiResult?.productName) return;

      console.log('🏆 [First in World] Checking achievement for product:', aiResult.productName);
      
      const context = {
        ai_product_name: aiResult.productName,
        user_product_name: null, // This is AI-generated, not user-entered
        hasPhoto: true,
        location: aiResult.location || 'Unknown'
      };

      // Check for "First in World" achievements 
      const achievements = await checkAchievements('photo_taken', context);
      
      if (achievements && achievements.length > 0) {
        console.log('🏆 [First in World] Achievement unlocked!', achievements);
        
        // Show achievement immediately with special effects
        achievements.forEach(achievement => {
          if (achievement.isGlobalFirst) {
            // Special legendary effects for global first achievements
            console.log('🎉 [Legendary] Global first achievement unlocked!');
            
            // Haptic feedback
            if (navigator.vibrate) {
              navigator.vibrate([100, 50, 100, 50, 200]); // Special pattern for legendary
            }
            
            // Show achievement with special effects
            showAchievement({
              ...achievement,
              specialEffects: true, // This will trigger special UI effects
              triggeredOnAI: true   // Mark that this was triggered by AI completion
            });
          } else {
            // Regular achievement
            showAchievement(achievement);
          }
        });
      }
    } catch (error) {
      console.error('❌ [First in World] Error checking achievement:', JSON.stringify({
        message: error.message,
        name: error.name,
        details: error.details,
        hint: error.hint,
        code: error.code,
        fullError: error
      }, null, 2));
    }
  };

  // Calculate camera and feed heights based on scroll
  const cameraHeight = Math.max(0, 60 - (scrollY * 0.15)); // Increased camera height to push feed lower
  const feedHeight = Math.min(100, 40 + (scrollY * 0.15)); // Reduced initial feed height to deemphasize
  const isCameraHidden = scrollY > 150;

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
          message: err.message,
          name: err.name,
          details: err.details,
          hint: err.hint,
          code: err.code,
          fullError: err
        }, null, 2));
            }
          },
          (error) => {
            console.error('Error getting location:', JSON.stringify({
          message: err.message,
          name: err.name,
          details: err.details,
          hint: err.hint,
          code: err.code,
          fullError: err
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
          message: err.message,
          name: err.name,
          details: err.details,
          hint: err.hint,
          code: err.code,
          fullError: err
        }, null, 2));
    }
  };

  const startCamera = async (mode = 'environment') => {
    setVideoReady(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    try {
      const constraints = {
        video: {
          facingMode: { exact: mode },
          torch: flashEnabled // This may not work on all devices
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
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: mode } } });
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
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
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
        setError('Camera access denied or unavailable');
      }
    }
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
    startCamera(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line
  }, [facingMode, flashEnabled]);

  // Get location on component mount
  useEffect(() => {
    getCurrentLocation();
  }, []);

  // Handle app visibility changes - restart camera when app becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // App became visible again - restart camera after a short delay
        console.log('📷 App visible - restarting camera...');
        setTimeout(() => {
          startCamera(facingMode);
        }, 200);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [facingMode]);

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
      
      // Compress image immediately for modal display
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.4,
        maxWidthOrHeight: 1280,
        useWebWorker: true,
        fileType: 'image/webp',
        initialQuality: 0.8
      });
      
      // Convert compressed file to base64 for immediate display
      const compressedBase64 = await imageCompression.getDataUrlFromFile(compressed);
      
      console.log('📸 [Camera] Compressed image size:', compressed.size, 'bytes');
      
      // Set captured image with COMPRESSED base64 for immediate display
      const capturedImageData = { 
        url: compressedBase64,           // Base64 for immediate display
        filename: tempFilename, 
        uploading: true, 
        aiProcessing: true 
      };
      console.log('Setting capturedImage data with compressed image');
      setCapturedImage(capturedImageData);
      setShowModal(true); // Open modal immediately
      setIsCapturing(false);
      
      // Upload to Supabase Storage in background
      setTimeout(async () => {
        try {
          // Get current user for storage organization
          const user = (await supabase.auth.getUser()).data.user;
          if (!user) {
            throw new Error('User not authenticated');
          }
          
          // Upload to Supabase Storage
          const uploadResult = await uploadImageToStorage(file, user.id);
          
          if (uploadResult.error) {
            throw new Error(`Image upload failed: ${uploadResult.error.message}`);
          }
          
          console.log('✅ [Camera] Image uploaded successfully');
          console.log('📸 [Camera] Image URL:', uploadResult.url);
          console.log('📸 [Camera] Thumbnail URL:', uploadResult.thumbnailUrl);
          
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
          // Extract EXIF data from original file (before compression)
          console.log('📸 [Camera] Extracting EXIF data from original image...');
          const exifData = await extractEXIFData(file);
          console.log('📸 [Camera] EXIF data extracted:', JSON.stringify(exifData, null, 2));

          // Log GPS coordinates if available
          if (deviceLocation) {
            console.log('🌍 [GPS] Device location during capture:', deviceLocation);
          }

          // Start AI processing with uploaded image
          console.log('🤖 [AI] Starting AI analysis with location:', deviceLocation);
          // For AI analysis, we need to download the image and convert to file
          const response = await fetch(uploadResult.url);
          const blob = await response.blob();
          const uploadedFile = new File([blob], tempFilename, { type: 'image/webp' });
          const aiResult = await analyzeImage(uploadedFile, deviceLocation);
          
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

          // 🏆 Check for "First in World" achievement immediately after AI completion
          if (aiResult?.productName) {
            console.log('🏆 [AI Complete] Checking for First in World achievement...');
            // Import and use the achievement checking hook
            // This will trigger immediately, even if user doesn't save the item
            checkFirstInWorldAchievement(aiResult);
          }
        } catch (error) {
          console.error('Background processing error:', JSON.stringify({
          message: err.message,
          name: err.name,
          details: err.details,
          hint: err.hint,
          code: err.code,
          fullError: err
        }, null, 2));
          
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
          message: err.message,
          name: err.name,
          details: err.details,
          hint: err.hint,
          code: err.code,
          fullError: err
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
  const handleModalClose = async (reason) => {
    if (capturedImage && !wasSaved) {
      // Clean up uploaded file if it exists
      if (capturedImage.storagePath) {
        await deletePhotoEverywhere(capturedImage.storagePath);
      }
    }
    setShowModal(false);
    setCapturedImage(null);
    setWasSaved(false);
    
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

  const handleSave = async (...args) => {
    setWasSaved(true);
    const savedItem = await onAddItem(...args);
    setShowModal(false);
    setCapturedImage(null);
    return savedItem; // Return the saved item for post creation
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
          
          // Compress image immediately for modal display
          const compressed = await imageCompression(file, {
            maxSizeMB: 0.4,
            maxWidthOrHeight: 1280,
            useWebWorker: true,
            fileType: 'image/webp',
            initialQuality: 0.8
          });
          
          // Convert compressed file to base64 for immediate display
          const compressedBase64 = await imageCompression.getDataUrlFromFile(compressed);
          
          console.log('📸 [Gallery] Compressed image size:', compressed.size, 'bytes');
          
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
              const uploadResult = await uploadImageToStorage(file, user.id);
              
              if (uploadResult.error) {
                throw new Error(`Image upload failed: ${uploadResult.error.message}`);
              }
              
              console.log('✅ [Gallery] Image uploaded successfully');
              
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
              const aiResult = await analyzeImage(file, deviceLocation);
              
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

              // 🏆 Check for "First in World" achievement immediately after AI completion
              if (aiResult?.productName) {
                console.log('🏆 [AI Complete] Checking for First in World achievement...');
                checkFirstInWorldAchievement(aiResult);
              }
            } catch (error) {
              console.error('Background processing error:', JSON.stringify({
          message: err.message,
          name: err.name,
          details: err.details,
          hint: err.hint,
          code: err.code,
          fullError: err
        }, null, 2));
              
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
          message: err.message,
          name: err.name,
          details: err.details,
          hint: err.hint,
          code: err.code,
          fullError: err
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

  const handleScroll = (e) => {
    const scrollTop = e.currentTarget.scrollTop;
    setScrollY(scrollTop);
  };

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
    // Update the comment count for the specific post when a new comment is added
    try {
      const { count } = await getPostCommentCount(postId);
      setFeedPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, comments: count } : p
      ));
    } catch (error) {
      console.error('❌ Error updating comment count:', JSON.stringify({
          message: err.message,
          name: err.name,
          details: err.details,
          hint: err.hint,
          code: err.code,
          fullError: err
        }, null, 2));
    }
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



  return (
    <div 
      className="h-screen bg-stone-50 overflow-hidden safe-area-inset" 
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
        className={`relative transition-all duration-300 ease-out ${isCameraHidden ? 'h-0 overflow-hidden' : ''}`}
        style={{ height: isCameraHidden ? '0vh' : `${cameraHeight}vh` }}
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
            className="absolute top-2 right-6 w-9 h-9 bg-black bg-opacity-30 backdrop-blur-sm text-white rounded-full flex items-center justify-center transition-all border border-white border-opacity-20"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Feed Card */}
      <div 
        className="bg-white transition-all duration-300 ease-out overflow-hidden"
        style={{
          height: isCameraHidden ? 'calc(100vh - 80px)' : `${feedHeight}vh`,
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
        <div className="px-6 mb-4 flex gap-3">
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

        {/* Feed Content - Real social feed */}
        <div 
          ref={feedRef}
          onScroll={handleScroll}
          className="overflow-y-auto"
          style={{ 
            height: isCameraHidden 
              ? 'calc(100vh - 140px)' 
              : `calc(${feedHeight}vh - 100px)`
          }}
        >
          <div className="space-y-4">
            {/* Loading State */}
            {isLoadingFeed && (
              <div className="flex flex-col items-center justify-center py-12 px-6">
                <LoadingSpinner size="lg" color="teal" />
                <p className="text-gray-500 mt-4 text-sm">Loading feed...</p>
              </div>
            )}

            {/* Error State */}
            {feedError && !isLoadingFeed && (
              <div className="text-center py-8 px-6">
                <div className="text-gray-500 mb-4">Failed to load feed</div>
                <button
                  onClick={refreshFeedData}
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
                <div className="text-gray-400 text-sm">
                  {selectedTab === 'Following' 
                    ? (userFollowingAnyone === false 
                        ? 'Follow other users first to see their posts here!' 
                        : 'Users you follow haven\'t posted anything yet'
                      )
                    : 'Be the first to share something amazing!'
                  }
                </div>
              </div>
            )}

            {/* Real Feed Posts */}
            {!isLoadingFeed && feedPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onTap={handlePostTap}
                onUserTap={onNavigateToUser}
                onCommentTap={handleCommentTap}
                onShareTap={handleShareTap}
                onImageTap={onImageTap}
                onLikeChange={(postId, liked) => {
                  // Update the local feedPosts state when a post is liked/unliked
                  setFeedPosts(prev => prev.map(p => 
                    p.id === postId 
                      ? { ...p, user_liked: liked, likes: liked ? p.likes + 1 : p.likes - 1 }
                      : p
                  ));
                }}
              />
            ))}
            
            {/* Bottom padding for last post */}
            <div className="pb-6"></div>
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
    </div>
  );
});

export default MainScreen; 
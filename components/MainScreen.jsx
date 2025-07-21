import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, FlipHorizontal, Zap, Image, X, Plus, Star, Heart, MessageCircle, Send, MoreHorizontal, RefreshCw, Bookmark, Share } from 'lucide-react'; 
import AddItemModal from './AddItemModal';

import { useAI } from '../hooks/useAI';
import imageCompression from 'browser-image-compression';
import { dataURLtoFile } from '../lib/imageUtils';
import { uploadPhotoWithOwner, supabase } from '../lib/supabase';
import { Filesystem, Directory } from '@capacitor/filesystem';

// Mock social feed data - matches MainScreen.tsx exactly
const mockPosts = [
  {
    id: '1',
    user: { name: 'chef_maria', avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100' },
    image: 'https://images.pexels.com/photos/4198019/pexels-photo-4198019.jpeg?auto=compress&cs=tinysrgb&w=400',
    rating: 4,
    verdict: 'KEEP',
    tags: ['Artisanal', 'Local'],
    snippet: 'Complex umami with perfect salt balance. Worth the premium price.',
    timestamp: '2h',
    likes: 24,
    comments: 8
  },
  {
    id: '2',
    user: { name: 'foodie_alex', avatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100' },
    image: 'https://images.pexels.com/photos/4110256/pexels-photo-4110256.jpeg?auto=compress&cs=tinysrgb&w=400',
    rating: 2,
    verdict: 'AVOID',
    tags: ['Organic', 'Expensive'],
    snippet: 'Overly bitter finish. Better options available at this price point.',
    timestamp: '4h',
    likes: 12,
    comments: 3
  },
  {
    id: '3',
    user: { name: 'taste_curator', avatar: 'https://images.pexels.com/photos/1181690/pexels-photo-1181690.jpeg?auto=compress&cs=tinysrgb&w=100' },
    image: 'https://images.pexels.com/photos/4198017/pexels-photo-4198017.jpeg?auto=compress&cs=tinysrgb&w=400',
    rating: 5,
    verdict: 'KEEP',
    tags: ['Single Origin', 'Premium'],
    snippet: 'Exceptional terroir expression. Notes of dark cherry and tobacco.',
    timestamp: '6h',
    likes: 45,
    comments: 15
  }
];

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

const PostCard = ({ post, onTap }) => {
  const [liked, setLiked] = useState(false);

  const handleLike = (e) => {
    e.stopPropagation();
    setLiked(!liked);
  };

  const handleDoubleTap = (e) => {
    e.preventDefault();
    setLiked(true);
  };

  return (
    <div className="bg-white rounded-2xl p-4 mb-4 shadow-sm" onClick={onTap}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <img
          src={post.user.avatar}
          alt={post.user.name}
          className="w-8 h-8 rounded-full object-cover"
        />
        <div className="flex-1">
          <div className="text-sm font-medium text-gray-900">{post.user.name}</div>
          <div className="text-xs text-gray-500">{post.timestamp}</div>
        </div>
        <div className="flex items-center gap-2">
          <StarRating rating={post.rating} />
          <VerdictBadge verdict={post.verdict} />
        </div>
      </div>

      {/* Image */}
      <div 
        className="relative mb-3 cursor-pointer"
        onDoubleClick={handleDoubleTap}
      >
        <img
          src={post.image}
          alt="Food item"
          className="w-full aspect-square object-cover rounded-2xl"
        />
      </div>

      {/* Tags */}
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
      )}

      {/* Snippet */}
      <p className="text-sm text-gray-700 mb-3 leading-relaxed">
        {post.snippet}
      </p>

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center gap-4">
          <button
            onClick={handleLike}
            className={`flex items-center gap-1 text-sm ${
              liked ? 'text-red-500' : 'text-gray-500'
            } hover:text-red-500 transition-colors`}
          >
            <Heart className={`w-4 h-4 ${liked ? 'fill-current' : ''}`} />
            <span>{post.likes + (liked ? 1 : 0)}</span>
          </button>
          <button className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            <MessageCircle className="w-4 h-4" />
            <span>{post.comments}</span>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button className="text-gray-500 hover:text-gray-700 transition-colors">
            <Bookmark className="w-4 h-4" />
          </button>
          <button className="text-gray-500 hover:text-gray-700 transition-colors">
            <Share className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const MainScreen = ({ lists, loading, onAddItem, onSelectList, onCreateList }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const feedRef = useRef(null);
  const streamRef = useRef(null);
  
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
  const [selectedTab, setSelectedTab] = useState('For You');
  const [showModal, setShowModal] = useState(false);
  

  
  const { analyzeImage, isProcessing: isAIProcessing, result: aiMetadata, error: aiError } = useAI();

  // Calculate camera and feed heights based on scroll
  const cameraHeight = Math.max(0, 45 - (scrollY * 0.15));
  const feedHeight = Math.min(100, 55 + (scrollY * 0.15));
  const isCameraHidden = scrollY > 150;

  const tabs = ['For You', 'Following'];

  const startCamera = async (mode = 'environment') => {
    setVideoReady(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    try {
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

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
    // eslint-disable-next-line
  }, [facingMode]);

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

      // Freeze frame effect - set captured image and open modal immediately
      const tempFilename = `photo_${Date.now()}.jpeg`;
      setCapturedImage({ url: imageData, filename: tempFilename, uploading: true, aiProcessing: true });
      setShowModal(true); // Open modal immediately
      setIsCapturing(false);

      // Start AI processing in background
      setTimeout(async () => {
        try {
          // Convert to File
          const file = dataURLtoFile(imageData, tempFilename);

          // Compress
          const compressed = await imageCompression(file, {
            maxSizeMB: 0.8,
            maxWidthOrHeight: 1024,
          });

          // Start AI processing
          const aiResult = await analyzeImage(compressed);
          setCapturedImage(prev => ({ 
            ...prev, 
            uploading: false,
            aiProcessing: false,
            aiMetadata: aiResult
          }));
        } catch (error) {
          console.error('Background processing error:', error);
          setCapturedImage(prev => ({ ...prev, uploading: false, aiProcessing: false }));
        }
      }, 100);

    } catch (error) {
      console.error('Capture error:', error);
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
  const handleModalClose = async () => {
    if (capturedImage?.filename && !wasSaved) {
      await deletePhotoEverywhere(capturedImage.filename);
    }
    setShowModal(false);
    setCapturedImage(null);
    setWasSaved(false);
  };

  const handleSave = (...args) => {
    setWasSaved(true);
    onAddItem(...args);
    setShowModal(false);
    setCapturedImage(null);
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
          // Convert file to data URL
          const reader = new FileReader();
          reader.onload = async (event) => {
            const imageData = event.target.result;
            
            // Set captured image and open modal immediately
            const tempFilename = `upload_${Date.now()}.jpeg`;
            setCapturedImage({ url: imageData, filename: tempFilename, uploading: true, aiProcessing: true });
            setShowModal(true); // Open modal immediately

            // Start AI processing in background
            setTimeout(async () => {
              try {
                // Compress and process
                const compressed = await imageCompression(file, {
                  maxSizeMB: 0.8,
                  maxWidthOrHeight: 1024
                });

                // Start AI processing
                const aiResult = await analyzeImage(compressed);
                setCapturedImage(prev => ({ 
                  ...prev, 
                  uploading: false,
                  aiProcessing: false,
                  aiMetadata: aiResult
                }));
              } catch (error) {
                console.error('Background processing error:', error);
                setCapturedImage(prev => ({ ...prev, uploading: false, aiProcessing: false }));
              }
            }, 100);
          };
          reader.readAsDataURL(file);
        } catch (error) {
          console.error('Gallery upload error:', error);
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

  const deletePhotoEverywhere = async (filename) => {
    try {
      await supabase.storage.from('photos').remove([filename]);
    } catch (e) {}
    try {
      await Filesystem.deleteFile({
        path: filename,
        directory: Directory.Data,
      });
    } catch (e) {}
  };

  const handlePostTap = () => {
    // Handle post tap - could navigate to detail view
    console.log('Post tapped');
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
            <div className="flex items-center gap-8">
              {/* Flash Toggle */}
              <button
                onClick={() => setFlashEnabled(!flashEnabled)}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                  flashEnabled 
                    ? 'bg-yellow-400 text-gray-900' 
                    : 'bg-black bg-opacity-30 text-white backdrop-blur-sm border border-white border-opacity-20'
                }`}
              >
                <Zap className="w-5 h-5" />
              </button>

              {/* Shutter Button */}
              <button
                onClick={handleCapture}
                className="w-18 h-18 bg-white rounded-full border-4 border-white border-opacity-30 flex items-center justify-center transition-transform active:scale-95"
                style={{ width: '72px', height: '72px' }}
              >
                <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center">
                  <Camera className="w-6 h-6 text-gray-700" />
                </div>
              </button>

              {/* Gallery Upload */}
              <button
                onClick={handleGalleryUpload}
                className="w-9 h-9 bg-black bg-opacity-30 backdrop-blur-sm text-white rounded-full flex items-center justify-center transition-all hover:bg-black hover:bg-opacity-50 border border-white border-opacity-20"
              >
                <Image className="w-5 h-5" />
              </button>
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
              onClick={() => setSelectedTab(tab)}
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

        {/* Feed Content - Always show social feed */}
        <div 
          ref={feedRef}
          onScroll={handleScroll}
          className="px-6 pb-6 overflow-y-auto"
          style={{ height: isCameraHidden ? 'calc(100vh - 160px)' : `calc(${feedHeight}vh - 120px)` }}
        >
          <div className="space-y-4">
            {/* Social Feed Posts */}
            {mockPosts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onTap={handlePostTap}
              />
            ))}
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
          onCreateList={onCreateList}
          showRatingFirst={true}
          onUpdateAI={(aiData) => {
            setCapturedImage(prev => ({
              ...prev,
              aiProcessing: false,
              aiMetadata: aiData
            }));
          }}
        />
      )}
    </div>
  );
};

export default MainScreen; 
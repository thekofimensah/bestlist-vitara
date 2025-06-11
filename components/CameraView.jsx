import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, Sparkles, Image as ImageIcon, RefreshCw, Plus } from 'lucide-react';
import AddItemModal from './AddItemModal';
import BulkImportModal from './BulkImportModal';
import { ListBox, ListGrid } from './Elements';

const CameraView = ({ lists, loading, onAddItem, onSelectList, onCreateList }) => {
  const [showModal, setShowModal] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [error, setError] = useState(null);
  const [facingMode, setFacingMode] = useState('environment');
  const [visibleCount, setVisibleCount] = useState(4);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Helper to start the camera with the desired facing mode
  const startCamera = async (mode = 'environment') => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { exact: mode } } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setError(null);
    } catch (err) {
      // Fallback: try without exact facingMode
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: mode } });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
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

  const handleCapture = () => {
    setError(null);
    try {
      const video = videoRef.current;
      if (!video) return;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/png');
      setCapturedImage({ url: imageData });
      setShowModal(true);
    } catch (err) {
      setError('Failed to capture photo from camera.');
    }
  };

  const handleBulkImport = () => {
    setShowBulkImport(true);
  };

  const handleListClick = (list) => {
    onSelectList(list);
  };

  const handleFlipCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Show more handler
  const handleShowMore = () => {
    setVisibleCount((prev) => prev + 4);
  };

  return (
    <div className="p-4 flex-1 min-h-0 flex flex-col">
      {error && (
        <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-xl">
          {error}
        </div>
      )}

      <motion.div
        className="relative bg-gradient-to-br from-gray-900 to-gray-700 rounded-3xl mb-3 overflow-hidden shadow-2xl flex items-center justify-center"
        style={{ height: '50vh', minHeight: 180, maxHeight: 400 }}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <video
          ref={videoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover rounded-3xl"
          style={{ background: '#222' }}
        />
        {/* Flip camera button */}
        <button
          onClick={handleFlipCamera}
          className="absolute top-4 left-4 bg-white/80 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg z-10"
          title="Flip camera"
        >
          <RefreshCw size={22} />
        </button>
        <motion.div
          className="absolute top-4 right-4"
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles className="text-yellow-300" size={20} />
        </motion.div>
        <motion.div
          className="absolute bottom-6 left-6"
          animate={{ rotate: -360 }}
          transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
        >
          <Sparkles className="text-pink-300" size={16} />
        </motion.div>
      </motion.div>

      <div className="flex justify-center items-center mb-4 relative">
        <div className="relative flex gap-4 items-center">
          <motion.button
            onClick={handleCapture}
            className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-pink-400 to-orange-400 rounded-full flex items-center justify-center shadow-lg"
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.1 }}
          >
            <Camera className="text-white" size={24} />
          </motion.button>
          <motion.button
            onClick={handleBulkImport}
            className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center shadow-lg"
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.1 }}
          >
            <ImageIcon className="text-white" size={16} />
          </motion.button>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <h3 className="text-lg font-bold text-gray-800 mb-3">Recent Lists</h3>
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="w-8 h-8 border-4 border-pink-400 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : lists.length === 0 ? (
          <button
            onClick={onCreateList}
            className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-2xl p-6 text-gray-400 bg-gray-50 hover:bg-gray-100 transition mb-4"
          >
            <Plus size={32} />
            <span className="mt-2 font-semibold">Create your first list</span>
          </button>
        ) : (
          <>
            <ListGrid className="mb-2">
              {lists.slice(0, visibleCount).map((list) => (
                <ListBox
                  key={list.id}
                  list={list}
                  selected={false}
                  onClick={() => handleListClick(list)}
                />
              ))}
            </ListGrid>
            {lists.length > visibleCount && (
              <button
                onClick={handleShowMore}
                className="w-full py-2 mt-2 rounded-xl border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 font-medium"
              >
                Show more
              </button>
            )}
          </>
        )}
      </div>

      {showModal && (
        <AddItemModal
          image={capturedImage?.url}
          lists={lists}
          onClose={() => setShowModal(false)}
          onSave={onAddItem}
        />
      )}

      {showBulkImport && (
        <BulkImportModal
          lists={lists}
          onClose={() => setShowBulkImport(false)}
          onSave={onAddItem}
        />
      )}
    </div>
  );
};

export default CameraView;
import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Camera, 
  Image as ImageIcon, 
  Star, 
  MapPin, 
  DollarSign,
  ChevronDown,
  Loader,
  Check,
  Edit3,
  Sparkles
} from 'lucide-react';
import { RatingOverlay } from './Elements';
import Cropper from 'react-easy-crop';
import FirstInWorldBanner from './gamification/FirstInWorldBanner';

// Mock currency data
const mockCurrencies = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' }
];

const AddItemModal = ({ 
  lists = [], 
  editingItem = null, 
  selectedList = null,
  onClose, 
  onSave 
}) => {
  const [step, setStep] = useState('capture');
  const [capturedImage, setCapturedImage] = useState(null);
  const [showRatingOverlay, setShowRatingOverlay] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showFirstInWorld, setShowFirstInWorld] = useState(false);
  
  // Form state
  const [selectedLists, setSelectedLists] = useState(selectedList ? [selectedList.id] : []);
  const [rating, setRating] = useState(editingItem?.rating || 0);
  const [notes, setNotes] = useState(editingItem?.notes || '');
  const [location, setLocation] = useState(editingItem?.location || '');
  const [price, setPrice] = useState(editingItem?.price || '');
  const [currency, setCurrency] = useState('USD');
  const [isPublic, setIsPublic] = useState(true);
  
  // AI state
  const [aiData, setAiData] = useState({
    productName: editingItem?.name || '',
    species: editingItem?.species || '',
    certainty: editingItem?.certainty || 0,
    tags: editingItem?.tags || [],
    productType: editingItem?.category || ''
  });
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [showAISection, setShowAISection] = useState(false);

  const fileInputRef = useRef(null);

  // Initialize editing mode
  React.useEffect(() => {
    if (editingItem) {
      setStep('details');
      setCapturedImage(editingItem.image_url || editingItem.image);
      setShowAISection(true);
    }
  }, [editingItem]);

  const handleTakePhoto = () => {
    // Mock camera capture
    const mockImage = 'https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?auto=compress&cs=tinysrgb&w=800';
    setCapturedImage(mockImage);
    setShowRatingOverlay(true);
  };

  const handleSelectFromGallery = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedImage(e.target.result);
        setShowRatingOverlay(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRatingSelect = (selectedRating) => {
    setRating(selectedRating);
    setShowRatingOverlay(false);
    
    // Mock AI processing
    setIsProcessingAI(true);
    setTimeout(() => {
      setAiData({
        productName: 'Artisan Sourdough Bread',
        species: 'Fresh baked bread with crispy crust',
        certainty: 85,
        tags: ['bakery', 'sourdough', 'artisan'],
        productType: 'Baked Goods'
      });
      setIsProcessingAI(false);
      setShowAISection(true);
      
      // Mock "First in World" achievement
      if (Math.random() > 0.7) {
        setShowFirstInWorld(true);
      }
    }, 2000);
    
    setStep('details');
  };

  const handleCropComplete = (croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleCropConfirm = () => {
    // Mock crop processing
    console.log('Mock: Crop confirmed', croppedAreaPixels);
    setShowCropper(false);
    setShowRatingOverlay(true);
  };

  const handleSave = () => {
    const item = {
      id: editingItem?.id,
      name: aiData.productName,
      image_url: capturedImage,
      rating: rating,
      notes: notes,
      location: location,
      price: price ? parseFloat(price) : null,
      currency_code: currency,
      is_public: isPublic,
      species: aiData.species,
      certainty: aiData.certainty,
      tags: aiData.tags,
      category: aiData.productType,
      created_at: editingItem?.created_at || new Date().toISOString()
    };

    onSave(selectedLists, item);
  };

  const renderCaptureStep = () => (
    <div className="flex flex-col items-center justify-center h-full p-6">
      <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center mb-6">
        <Camera className="w-12 h-12 text-teal-600" />
      </div>
      <h2 className="text-2xl font-semibold text-gray-900 mb-2">Capture Your Find</h2>
      <p className="text-gray-600 text-center mb-8">
        Take a photo or select from your gallery to get started
      </p>
      
      <div className="space-y-4 w-full max-w-sm">
        <button
          onClick={handleTakePhoto}
          className="w-full py-4 bg-teal-700 text-white rounded-2xl font-medium flex items-center justify-center gap-3"
          style={{ backgroundColor: '#1F6D5A' }}
        >
          <Camera className="w-5 h-5" />
          Take Photo
        </button>
        
        <button
          onClick={handleSelectFromGallery}
          className="w-full py-4 bg-gray-100 text-gray-700 rounded-2xl font-medium flex items-center justify-center gap-3"
        >
          <ImageIcon className="w-5 h-5" />
          Choose from Gallery
        </button>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );

  const renderDetailsStep = () => (
    <div className="h-full flex flex-col">
      {/* Image Preview */}
      <div className="relative h-64 bg-gray-100 flex-shrink-0">
        {capturedImage && (
          <img
            src={capturedImage}
            alt="Captured item"
            className="w-full h-full object-cover"
          />
        )}
        <button
          onClick={() => setShowCropper(true)}
          className="absolute top-4 right-4 w-10 h-10 bg-black bg-opacity-50 rounded-full flex items-center justify-center"
        >
          <Edit3 className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Form Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* AI Section */}
        {showAISection && (
          <div className="bg-gray-50 rounded-2xl p-4">
            <button
              onClick={() => setShowAISection(!showAISection)}
              className="w-full flex items-center justify-between mb-3"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span className="font-medium text-gray-900">AI Detection</span>
                {aiData.certainty > 0 && (
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    {aiData.certainty}% confident
                  </span>
                )}
              </div>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showAISection ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showAISection && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="space-y-3"
                >
                  {isProcessingAI ? (
                    <div className="flex items-center gap-3 py-4">
                      <Loader className="w-5 h-5 animate-spin text-purple-600" />
                      <span className="text-gray-600">Analyzing image...</span>
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Product Name</label>
                        <input
                          type="text"
                          value={aiData.productName}
                          onChange={(e) => setAiData(prev => ({ ...prev, productName: e.target.value }))}
                          className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700"
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium text-gray-700">Description</label>
                        <textarea
                          value={aiData.species}
                          onChange={(e) => setAiData(prev => ({ ...prev, species: e.target.value }))}
                          className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:border-teal-700 resize-none"
                          rows={2}
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700">Tags</label>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {aiData.tags.map((tag, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Rating */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Rating</label>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="transition-colors"
              >
                <Star
                  className={`w-8 h-8 ${
                    star <= rating
                      ? 'text-yellow-400 fill-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
            <span className="ml-2 text-gray-600">{rating}/5</span>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What did you think? Any details to remember..."
            className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:border-teal-700 resize-none"
            rows={3}
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
          <div className="relative">
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Where did you find this?"
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:border-teal-700"
            />
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>

        {/* Price */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Price (Optional)</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:border-teal-700"
                step="0.01"
              />
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            </div>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="px-4 py-3 border border-gray-200 rounded-2xl focus:outline-none focus:border-teal-700 bg-white"
            >
              {mockCurrencies.map((curr) => (
                <option key={curr.code} value={curr.code}>
                  {curr.code}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Privacy Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
          <div>
            <div className="font-medium text-gray-900">Make Public</div>
            <div className="text-sm text-gray-600">Share with the community</div>
          </div>
          <button
            onClick={() => setIsPublic(!isPublic)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              isPublic ? 'bg-teal-600' : 'bg-gray-300'
            }`}
          >
            <div
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                isPublic ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        {/* List Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">Add to Lists</label>
          <div className="space-y-2">
            {lists.map((list) => (
              <button
                key={list.id}
                onClick={() => {
                  setSelectedLists(prev => 
                    prev.includes(list.id) 
                      ? prev.filter(id => id !== list.id)
                      : [...prev, list.id]
                  );
                }}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-colors ${
                  selectedLists.includes(list.id)
                    ? 'border-teal-600 bg-teal-50'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: list.color }}
                />
                <span className="flex-1 text-left font-medium text-gray-900">
                  {list.name}
                </span>
                {selectedLists.includes(list.id) && (
                  <Check className="w-4 h-4 text-teal-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="p-6 border-t border-gray-100">
        <button
          onClick={handleSave}
          disabled={!aiData.productName || selectedLists.length === 0}
          className="w-full py-4 bg-teal-700 text-white rounded-2xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#1F6D5A' }}
        >
          {editingItem ? 'Update Item' : 'Save Item'}
        </button>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
      >
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="w-full bg-white rounded-t-3xl max-h-[90vh] flex flex-col relative"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="text-xl font-semibold text-gray-900">
              {editingItem ? 'Edit Item' : 'Add New Item'}
            </h2>
            <button
              onClick={onClose}
              className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Content */}
          {step === 'capture' ? renderCaptureStep() : renderDetailsStep()}

          {/* Rating Overlay */}
          {showRatingOverlay && (
            <RatingOverlay
              image={capturedImage}
              onRatingSelect={handleRatingSelect}
              isVisible={showRatingOverlay}
            />
          )}

          {/* Cropper Modal */}
          {showCropper && (
            <div className="absolute inset-0 bg-black z-50">
              <div className="relative h-full">
                <Cropper
                  image={capturedImage}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={handleCropComplete}
                />
                <div className="absolute bottom-6 left-6 right-6 flex gap-3">
                  <button
                    onClick={() => setShowCropper(false)}
                    className="flex-1 py-3 bg-gray-600 text-white rounded-2xl font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCropConfirm}
                    className="flex-1 py-3 bg-teal-600 text-white rounded-2xl font-medium"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* First in World Banner */}
          <FirstInWorldBanner
            isVisible={showFirstInWorld}
            productName={aiData.productName}
            onComplete={() => setShowFirstInWorld(false)}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default AddItemModal;
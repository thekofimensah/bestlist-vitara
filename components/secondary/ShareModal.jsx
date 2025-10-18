import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Link2 } from 'lucide-react';


// WhatsApp Icon Component (from Wikimedia Commons)
// Source: https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg
const WhatsAppIcon = ({ className }) => (
  <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" className={`${className} object-contain`} />
);

const ShareModal = ({ isOpen, onClose, post, list, isInviteMode = false }) => {
  // Use web URL for shareability (clickable in most apps)
  const webBaseUrl = 'https://bestlist.app';

  // Determine what we're sharing
  const isSharingList = !!list;
  const isSharingInvite = isInviteMode;
  
  // Get the appropriate URL for sharing
  const shareUrl = isSharingInvite 
    ? `${webBaseUrl}` || 'https://bestlist.app'
    : isSharingList 
      ? `${webBaseUrl}/list/${list?.id}`
      : `${webBaseUrl}/post/${post?.id}`;

  const handleWhatsAppShare = () => {
    const message = isSharingInvite 
      ? `Join me on curate!\n\nI'm using curate to discover and share amazing products. Join me!\n\n${shareUrl}`
      : `Check out this on curate!\n\n${shareUrl}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    onClose();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      
      // Show success feedback
      console.log('✅ Link copied to clipboard!');
      
      // Haptic feedback
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
      
      onClose();
    } catch (error) {
      console.error('❌ Failed to copy link:', error);
    }
  };



  const shareOptions = [
    {
      id: 'whatsapp',
      title: 'Share to WhatsApp',
      icon: WhatsAppIcon,
      color: 'bg-green-500',
      textColor: 'text-white',
      action: handleWhatsAppShare,
      iconSizeClass: 'w-12 h-12'
    },
    {
      id: 'copy',
      title: 'Copy Link',
      icon: Link2,
      color: 'bg-gray-100',
      textColor: 'text-gray-700',
      action: handleCopyLink
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: '100%' }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl"
          >
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-2">
              <div className="w-12 h-1 bg-gray-300 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4">
              <h2 className="text-lg font-semibold text-gray-900">
                {isSharingInvite ? 'Invite Friends' : 'Share'}
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>



            {/* Share Options */}
            <div className="px-6 py-6 space-y-3">
              {shareOptions.map((option) => {
                const IconComponent = option.icon;
                const iconClass = option.iconSizeClass || `w-5 h-5 ${option.textColor}`;
                return (
                  <button
                    key={option.id}
                    onClick={option.action}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all hover:scale-[0.98] ${option.color}`}
                    style={option.id === 'share' ? { backgroundColor: '#1F6D5A' } : {}}
                  >
                    <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center overflow-hidden">
                      <IconComponent className={iconClass} />
                    </div>
                    <span className={`font-medium ${option.textColor}`}>
                      {option.title}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Bottom padding for safe area */}
            <div className="pb-6" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ShareModal; 
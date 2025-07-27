import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Link2, Share, ExternalLink } from 'lucide-react';
import { appConfig, deepLinkUrl } from '../../lib/appConfig';

// WhatsApp Icon Component
const WhatsAppIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.787"/>
  </svg>
);

const ShareModal = ({ isOpen, onClose, post, list }) => {
  // Use deep link URL for direct app opening
  const appUrl = deepLinkUrl;

  // Determine if we're sharing a post or a list
  const isSharingList = !!list;
  
  const shareData = isSharingList ? {
    title: `${list?.name} by ${list?.user?.name || 'User'}`,
    text: `Check out this amazing list "${list?.name}" on ${appConfig.displayName}! ${list?.itemCount ? `Contains ${list.itemCount} items.` : ''}`,
    url: `${appUrl}/list/${list?.id}` // This will be the specific list URL
  } : {
    title: `${post?.item_name} from ${post?.list_name}`,
    text: `Check out this ${post?.verdict?.toLowerCase()} find: ${post?.item_name} from ${post?.user?.name}! ${post?.snippet ? `"${post.snippet}"` : ''}`,
    url: `${appUrl}/post/${post?.id}` // This will be the specific post URL
  };

  const handleWhatsAppShare = () => {
    const message = `Check out my post on ${appConfig.displayName}!\n\n${shareData.title}\n\n${shareData.text}\n\n${shareData.url}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    onClose();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareData.url);
      
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

  const handleNativeShare = async () => {
    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        // Fallback to copy
        await handleCopyLink();
      }
      onClose();
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('❌ Error sharing:', error);
      }
    }
  };

  const shareOptions = [
    {
      id: 'whatsapp',
      title: 'Share to WhatsApp',
      icon: WhatsAppIcon,
      color: 'bg-green-500',
      textColor: 'text-white',
      action: handleWhatsAppShare
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
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                Share {isSharingList ? 'List' : 'Post'}
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
              >
                <X className="w-4 h-4 text-gray-600" />
              </button>
            </div>

            {/* Content Preview */}
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="bg-gray-50 rounded-2xl p-4">
                {isSharingList ? (
                  // List Preview
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                      <span className="text-2xl">📋</span>
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 text-sm">
                        {list?.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {list?.itemCount || 0} items • by {list?.user?.name || 'User'}
                      </div>
                    </div>
                  </div>
                ) : (
                  // Post Preview
                  <div className="flex items-center gap-3 mb-3">
                    <img
                      src={post?.user?.avatar}
                      alt={post?.user?.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div>
                      <div className="font-medium text-gray-900 text-sm">
                        {post?.user?.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {post?.item_name} from {post?.list_name}
                      </div>
                    </div>
                  </div>
                )}
                {!isSharingList && post?.snippet && (
                  <p className="text-gray-700 text-sm">
                    "{post.snippet}"
                  </p>
                )}
              </div>
            </div>

            {/* Share Options */}
            <div className="px-6 py-6 space-y-3">
              {shareOptions.map((option) => {
                const IconComponent = option.icon;
                return (
                  <button
                    key={option.id}
                    onClick={option.action}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl transition-all hover:scale-[0.98] ${option.color}`}
                    style={option.id === 'share' ? { backgroundColor: '#1F6D5A' } : {}}
                  >
                    <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                      <IconComponent className={`w-5 h-5 ${option.textColor}`} />
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
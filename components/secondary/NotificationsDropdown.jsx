import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Heart, MessageSquare, UserPlus } from 'lucide-react';

// Helper function to log to Android Studio
const logToAndroid = (message, data = null) => {
  const logMessage = data ? `${message}: ${JSON.stringify(data)}` : message;
  console.log(logMessage);
  
  // Also try to use Capacitor's logging if available
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Console) {
    window.Capacitor.Plugins.Console.log({ message: logMessage });
  }
};

const NotificationItem = ({ notification, onMarkRead, onNavigateToPost }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'like':
        return <Heart className="w-4 h-4 text-red-500" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'follow':
        return <UserPlus className="w-4 h-4 text-green-500" />;
      default:
        return null;
    }
  };

  const getMessage = () => {
    const username = notification.profiles?.username || 'Someone';
    switch (notification.type) {
      case 'like':
        return `${username} liked your post`;
      case 'comment':
        return `${username} commented on your post`;
      case 'follow':
        return `${username} started following you`;
      default:
        return 'New notification';
    }
  };

  const handleClick = () => {
    // Mark as read first
    onMarkRead(notification.id);
    
    // Navigate to post if it's a like or comment notification
    if (notification.type === 'like' || notification.type === 'comment') {
      onNavigateToPost(notification.reference_id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`p-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer transition-colors ${
        !notification.read ? 'bg-teal-50' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex-shrink-0">
        {notification.profiles?.avatar_url ? (
          <img
            src={notification.profiles.avatar_url}
            alt={notification.profiles?.username}
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
            {getIcon()}
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 truncate">{getMessage()}</p>
        <p className="text-xs text-gray-500">
          {new Date(notification.created_at).toLocaleDateString()}
        </p>
      </div>
      {!notification.read && (
        <div className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0" />
      )}
    </motion.div>
  );
};

export const NotificationsDropdown = ({
  notifications,
  unreadCount,
  isOpen,
  onClose,
  onMarkRead,
  onMarkAllRead,
  onNavigateToPost
}) => {
  // Debug logging
  logToAndroid('🔔 NotificationsDropdown rendered with:', {
    isOpen,
    notificationsCount: notifications?.length || 0,
    unreadCount,
    notifications: notifications
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-25 z-40"
            onClick={onClose}
          />

          {/* Dropdown */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-2 top-14 w-96 max-w-[calc(100vw-1rem)] bg-white rounded-xl shadow-xl z-50 overflow-hidden"
          >
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                <p className="text-sm text-gray-500">
                  {unreadCount} unread ({notifications?.length || 0} total)
                </p>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllRead}
                    className="text-sm text-teal-600 hover:text-teal-700"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {notifications && notifications.length > 0 ? (
                <>
                  {logToAndroid('🔔 Rendering', notifications.length, 'notifications')}
                  {notifications.map((notification) => (
                    <NotificationItem
                      key={notification.id}
                      notification={notification}
                      onMarkRead={onMarkRead}
                      onNavigateToPost={onNavigateToPost}
                    />
                  ))}
                </>
              ) : (
                <>
                  {logToAndroid('🔔 No notifications to display')}
                  <div className="p-8 text-center text-gray-500">
                    <div className="mb-2">No notifications yet</div>
                    <div className="text-xs text-gray-400">
                      Debug: {notifications ? `Array with ${notifications.length} items` : 'notifications is null/undefined'}
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
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
            className="fixed inset-0 bg-gray-500 bg-opacity-20 z-40"
            onClick={onClose}
          />

          {/* Dropdown */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            role="dialog"
            aria-label="Notifications"
            className="fixed right-4 top-16 w-[420px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
          >
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Notifications</h3>
                <p className="text-xs text-gray-500">{unreadCount} unread · {notifications?.length || 0} total</p>
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={onMarkAllRead}
                    className="px-3 py-1 text-xs font-medium rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 hover:bg-gray-100 rounded-full"
                  aria-label="Close notifications"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto divide-y divide-gray-100">
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
                <div className="p-10 text-center">
                  <div className="text-sm text-gray-600 mb-1">No notifications yet</div>
                  <div className="text-xs text-gray-400">You're all caught up</div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
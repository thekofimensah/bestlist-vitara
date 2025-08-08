import React from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
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
  const controls = useAnimation();
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

  const handleDragEnd = async (_, info) => {
    const distance = info.offset.x;
    const velocity = info.velocity.x || 0;
    const threshold = 140;
    const fast = Math.abs(velocity) > 500;
    if (Math.abs(distance) > threshold || fast) {
      const direction = distance >= 0 ? 1 : -1;
      await controls.start({
        x: direction * ((typeof window !== 'undefined' ? window.innerWidth : 600) + 120),
        opacity: 0,
        transition: { type: 'spring', stiffness: 500, damping: 38 }
      });
      // slight pause before removing so list doesn't feel jumpy
      setTimeout(() => onMarkRead(notification.id), 120);
    } else {
      controls.start({ x: 0, opacity: 1, transition: { type: 'spring', stiffness: 600, damping: 35, bounce: 0.35 } });
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ layout: { duration: 0.2 } }}
    >
      {/* Simple white card (removed gradient background) */}
      <motion.div
        layout
        animate={controls}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        dragMomentum={true}
        whileTap={{ scale: 0.98 }}
        onDragEnd={handleDragEnd}
        className="rounded-xl bg-white p-3 flex items-center gap-3 cursor-pointer border border-gray-100 shadow-sm"
        onClick={handleClick}
      >
        <motion.div className="flex items-center gap-3 w-full" layout>
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
      </motion.div>
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

            {/* Staggered list so new rows pause briefly after a dismiss */}
            <motion.div className="max-h-[70vh] overflow-y-auto space-y-2 p-2"
              initial={false}
              variants={{}}
            >
              {notifications && notifications.length > 0 ? (
                <AnimatePresence initial={false}>
                  {logToAndroid('🔔 Rendering', notifications.length, 'notifications')}
                  {notifications.map((notification, index) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ delay: index === 0 ? 0 : 0.08, type: 'spring', stiffness: 250, damping: 22 }}
                    >
                      <NotificationItem
                        notification={notification}
                        onMarkRead={onMarkRead}
                        onNavigateToPost={onNavigateToPost}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              ) : (
                <div className="p-10 text-center">
                  <div className="text-sm text-gray-600 mb-1">No notifications yet</div>
                  <div className="text-xs text-gray-400">You're all caught up</div>
                </div>
              )}
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
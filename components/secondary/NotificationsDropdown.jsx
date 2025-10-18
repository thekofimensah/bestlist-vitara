import React, { useCallback, useMemo } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { Bell, X, Heart, MessageSquare, UserPlus } from 'lucide-react';

const NotificationItem = ({ notification, onMarkRead, onNavigateToPost, onNavigateToUser }) => {
  const controls = useAnimation();
  
  const icon = useMemo(() => {
    const icons = {
      'like': <Heart className="w-4 h-4 text-red-500" />,
      'comment': <MessageSquare className="w-4 h-4 text-blue-500" />,
      'follow': <UserPlus className="w-4 h-4 text-green-500" />
    };
    return icons[notification.type] || null;
  }, [notification.type]);

  const message = useMemo(() => {
    const username = notification.profiles?.username || 'Someone';
    const messages = {
      'like': `${username} liked your post`,
      'comment': `${username} commented on your post`,
      'follow': `${username} started following you`
    };
    return messages[notification.type] || 'New notification';
  }, [notification.type, notification.profiles?.username]);

  const handleClick = useCallback(() => {
    // Mark as read
    onMarkRead(notification.id);
    
    // Navigate based on type
    if (notification.type === 'like' || notification.type === 'comment') {
      onNavigateToPost(notification.reference_id, notification.type);
    } else if (notification.type === 'follow' && notification.profiles?.username) {
      onNavigateToUser(notification.profiles.username);
    }
  }, [notification, onMarkRead, onNavigateToPost, onNavigateToUser]);

  const handleDragEnd = useCallback(async (_, info) => {
    const threshold = 100;
    const velocity = Math.abs(info.velocity.x);
    const distance = Math.abs(info.offset.x);
    
    if (distance > threshold || velocity > 500) {
      // Animate out
      await controls.start({
        x: info.offset.x > 0 ? window.innerWidth : -window.innerWidth,
        opacity: 0,
        transition: { duration: 0.2 }
      });
      onMarkRead(notification.id);
    } else {
      // Snap back
      controls.start({ 
        x: 0, 
        opacity: 1, 
        transition: { type: 'spring', stiffness: 400, damping: 30 } 
      });
    }
  }, [controls, notification.id, onMarkRead]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ 
        layout: { duration: 0.2 },
        exit: { duration: 0.15 }
      }}
    >
      <motion.div
        animate={controls}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={handleDragEnd}
        className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors border-b border-gray-100"
        onClick={handleClick}
      >
        <div className="flex-shrink-0">
          {notification.profiles?.avatar_url ? (
            <img
              src={notification.profiles.avatar_url}
              alt={notification.profiles?.username}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              {icon}
            </div>
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 truncate">{message}</p>
          <p className="text-xs text-gray-500">
            {new Date(notification.created_at).toLocaleDateString()}
          </p>
        </div>
        
        {!notification.read && (
          <div className="w-2 h-2 bg-teal-500 rounded-full flex-shrink-0" />
        )}
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
  onNavigateToPost,
  onNavigateToUser
}) => {
  // Memoize filtered notifications to prevent re-renders
  const displayNotifications = useMemo(() => {
    if (!notifications) return [];
    
    // Additional client-side deduplication just in case
    const seen = new Set();
    return notifications.filter(n => {
      const key = `${n.type}-${n.actor_id}-${n.reference_id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [notifications]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-gray-500 bg-opacity-20 z-50"
        onClick={onClose}
      />

      {/* Dropdown */}
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="fixed top-16 left-1/2 -translate-x-1/2 w-[420px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-gray-900">Notifications</h3>
              <p className="text-xs text-gray-500">
                {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={onMarkAllRead}
                  className="px-3 py-1 text-xs font-medium rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button
                onClick={onClose}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="max-h-[60vh] overflow-y-auto">
          {displayNotifications.length > 0 ? (
            <AnimatePresence mode="popLayout">
              {displayNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onMarkRead={onMarkRead}
                  onNavigateToPost={onNavigateToPost}
                  onNavigateToUser={onNavigateToUser}
                />
              ))}
            </AnimatePresence>
          ) : (
            <div className="p-12 text-center">
              <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <div className="text-sm text-gray-600 mb-1">No notifications yet</div>
              <div className="text-xs text-gray-400">You're all caught up!</div>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
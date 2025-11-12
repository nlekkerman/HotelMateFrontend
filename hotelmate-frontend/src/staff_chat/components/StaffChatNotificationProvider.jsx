import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import PusherProvider from '../context/PusherProvider';
import useStaffChatNotifications from '../hooks/useStaffChatNotifications';
import useUnreadCount from '../hooks/useUnreadCount';

/**
 * Inner component that uses the hooks after PusherProvider is available
 */
const NotificationHandler = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();
  const hotelSlug = user?.hotel_slug;
  const staffId = user?.id;

  // Get current conversation ID if on staff chat page
  const getCurrentConversationId = () => {
    if (!location.pathname.includes('/staff-chat')) return null;
    const params = new URLSearchParams(location.search);
    const convId = params.get('conversation');
    return convId ? parseInt(convId) : null;
  };

  const currentConversationId = getCurrentConversationId();

  // Track unread count
  const { totalUnread, incrementUnread } = useUnreadCount(hotelSlug, 30000);

  // Enable notifications (will show toast + increment badge)
  useStaffChatNotifications({
    hotelSlug,
    staffId,
    currentConversationId,
    onNewMessage: (data) => {
      console.log('New message notification:', data);
    },
    onUnreadCountChange: (updater) => {
      // Increment the global unread count
      incrementUnread();
    }
  });

  return <>{children}</>;
};

/**
 * Staff Chat Notification Provider
 * Wraps the app to provide global staff chat notifications
 * - Shows toast notifications for new messages
 * - Updates unread badge in navigation
 * - Works on both desktop and mobile
 */
const StaffChatNotificationProvider = ({ children }) => {
  const { user } = useAuth();

  // Only enable if user is logged in and has Pusher credentials
  const pusherEnabled = Boolean(user?.hotel_slug);
  
  // Get Pusher credentials from environment or config
  const pusherAppKey = import.meta.env.VITE_PUSHER_APP_KEY || 'your-pusher-app-key';
  const pusherCluster = import.meta.env.VITE_PUSHER_CLUSTER || 'mt1';

  if (!pusherEnabled) {
    return <>{children}</>;
  }

  return (
    <PusherProvider
      appKey={pusherAppKey}
      cluster={pusherCluster}
      enabled={pusherEnabled}
    >
      <NotificationHandler>
        {children}
      </NotificationHandler>
    </PusherProvider>
  );
};

export default StaffChatNotificationProvider;

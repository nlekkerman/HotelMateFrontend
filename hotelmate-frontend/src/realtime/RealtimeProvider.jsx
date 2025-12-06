// src/realtime/RealtimeProvider.jsx
import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeBaseHotelChannels } from './channelRegistry';
import { NotificationsProviderWithCallback } from './stores/notificationsStore.jsx';
import { ChatProvider } from './stores/chatStore.jsx';
import { GuestChatProvider } from './stores/guestChatStore.jsx';
import { AttendanceProvider } from './stores/attendanceStore.jsx';
import { RoomServiceProvider } from './stores/roomServiceStore.jsx';
import { BookingProvider } from './stores/bookingStore.jsx';

/**
 * RealtimeProvider - Manages centralized realtime subscriptions
 * Reads hotelSlug and staffId from AuthContext and subscribes to channels
 */
function RealtimeManager({ children }) {
  const { user, selectedHotel } = useAuth();
  const cleanupRef = useRef(null);

  useEffect(() => {
    // Clean up previous subscriptions
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    // Determine hotel slug - can come from selectedHotel or user data
    let hotelSlug = null;
    if (selectedHotel?.slug) {
      hotelSlug = selectedHotel.slug;
    } else if (user?.hotel_slug) {
      hotelSlug = user.hotel_slug;
    } else if (user?.hotel?.slug) {
      hotelSlug = user.hotel.slug;
    }

    // Resolve staff ID (prefer dedicated staff_id, fallback to user id when flagged as staff)
    const staffId =
      user?.staff_id ??
      (user?.is_staff || user?.role === 'staff' || user?.isStaff ? user?.id : null);

    console.log('🔄 RealtimeProvider effect:', { 
      hotelSlug, 
      staffId, 
      hasUser: !!user,
      hasSelectedHotel: !!selectedHotel 
    });

    // Subscribe to channels if we have hotel info
    if (hotelSlug) {
      console.log('🚀 Starting realtime subscriptions for hotel:', hotelSlug);
      cleanupRef.current = subscribeBaseHotelChannels({ hotelSlug, staffId });
    } else {
      console.log('⚠️ No hotel slug available, skipping subscriptions');
    }

    // Cleanup on unmount or dependency change
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [user, selectedHotel]);

  return children;
}

/**
 * Complete RealtimeProvider with all domain stores
 * ✅ Provides unified realtime architecture with all 5 domain stores
 */
export function RealtimeProvider({ children }) {
  return (
    <NotificationsProviderWithCallback>
      <AttendanceProvider>
        <ChatProvider>
          <GuestChatProvider>
            <RoomServiceProvider>
              <BookingProvider>
                <RealtimeManager>
                  {children}
                </RealtimeManager>
              </BookingProvider>
            </RoomServiceProvider>
          </GuestChatProvider>
        </ChatProvider>
      </AttendanceProvider>
    </NotificationsProviderWithCallback>
  );
}

export default RealtimeProvider;
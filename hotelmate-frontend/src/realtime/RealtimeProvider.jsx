// src/realtime/RealtimeProvider.jsx
import React, { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { subscribeBaseHotelChannels } from './channelRegistry';
import { NotificationsProviderWithCallback } from './stores/notificationsStore.jsx';
import { ChatProvider } from './stores/chatStore.jsx';
import { GuestChatProvider } from './stores/guestChatStore.jsx';
import { AttendanceProvider } from './stores/attendanceStore.jsx';
import { RoomServiceProvider } from './stores/roomServiceStore.jsx';
import { ServiceBookingProvider } from './stores/serviceBookingStore.jsx';
import { RoomBookingProvider } from './stores/roomBookingStore.jsx';

/**
 * RealtimeProvider - Manages centralized realtime subscriptions
 * Reads hotelSlug and staffId from AuthContext and subscribes to channels
 */
function RealtimeManager({ children }) {
  const { user, selectedHotel } = useAuth();
  const cleanupRef = useRef(null);

  useEffect(() => {
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

    // Only subscribe if we don't already have an active subscription for this hotel/staff
    if (hotelSlug && !cleanupRef.current) {
      console.log('🚀 Starting realtime subscriptions for hotel:', hotelSlug);
      cleanupRef.current = subscribeBaseHotelChannels({ hotelSlug, staffId });
    } else if (!hotelSlug) {
      console.log('⚠️ No hotel slug available, skipping subscriptions');
      // Clean up if we had subscriptions but no longer have hotel info
      if (cleanupRef.current) {
        console.log('🧹 Cleaning up subscriptions - no hotel slug');
        cleanupRef.current();
        cleanupRef.current = null;
      }
    } else {
      console.log('📡 Realtime subscriptions already active for hotel:', hotelSlug);
    }

    // Cleanup on unmount only
    return () => {
      if (cleanupRef.current) {
        console.log('🧹 Component unmounting - cleaning up subscriptions');
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [selectedHotel?.slug, user?.hotel_slug, user?.staff_id, user?.id, user?.is_staff, user?.role, user?.isStaff]);

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
              <ServiceBookingProvider>
                <RoomBookingProvider>
                  <RealtimeManager>
                    {children}
                  </RealtimeManager>
                </RoomBookingProvider>
              </ServiceBookingProvider>
            </RoomServiceProvider>
          </GuestChatProvider>
        </ChatProvider>
      </AttendanceProvider>
    </NotificationsProviderWithCallback>
  );
}

export default RealtimeProvider;
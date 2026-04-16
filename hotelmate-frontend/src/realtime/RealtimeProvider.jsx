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
import { RoomsProvider } from './stores/roomsStore.jsx';
import { HousekeepingProvider } from './stores/housekeepingStore.jsx';
import { OverviewSignalsProvider } from './stores/overviewSignalsStore.jsx';

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
      (user?.is_staff ? user?.id : null);

    // Only subscribe if we don't already have an active subscription for this hotel/staff
    if (hotelSlug && !cleanupRef.current) {
      cleanupRef.current = subscribeBaseHotelChannels({ hotelSlug, staffId });
    } else if (!hotelSlug) {
      // Clean up if we had subscriptions but no longer have hotel info
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    }

    // Cleanup on unmount only
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    };
  }, [selectedHotel?.slug, user?.hotel_slug, user?.staff_id, user?.id, user?.is_staff]);

  return children;
}

/**
 * Complete RealtimeProvider with all domain stores
 * ✅ Provides unified realtime architecture with all 6 domain stores
 */
export function RealtimeProvider({ children }) {
  return (
    <>
      <OverviewSignalsProvider>
      <NotificationsProviderWithCallback>
        <AttendanceProvider>
          <ChatProvider>
            <GuestChatProvider>
              <RoomServiceProvider>
                <ServiceBookingProvider>
                  <HousekeepingProvider>
                    <RoomBookingProvider>
                      <RoomsProvider>
                        <RealtimeManager>
                          {children}
                        </RealtimeManager>
                      </RoomsProvider>
                    </RoomBookingProvider>
                  </HousekeepingProvider>
                </ServiceBookingProvider>
              </RoomServiceProvider>
            </GuestChatProvider>
          </ChatProvider>
        </AttendanceProvider>
      </NotificationsProviderWithCallback>
      </OverviewSignalsProvider>
    </>
  );
}

export default RealtimeProvider;
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { buildStaffURL } from '@/services/api';
import { toast } from 'react-toastify';
import { moveRoom } from '@/services/roomOperations.js';

const queryKeys = {
  staffRoomBooking: (hotelSlug, bookingId) => ['staff-room-booking', hotelSlug, bookingId],
  staffAvailableRooms: (hotelSlug, bookingId) => ['staff-available-rooms', hotelSlug, bookingId],
  staffRoomBookings: (hotelSlug, filtersHash) => ['staff-room-bookings', hotelSlug, filtersHash],
  staffRoomBookingsSafe: (hotelSlug, filtersHash) => ['staff-room-bookings-safe', hotelSlug, filtersHash],
};

export const useRoomBookingDetail = (hotelSlug, bookingId) => {
  return useQuery({
    queryKey: queryKeys.staffRoomBooking(hotelSlug, bookingId),
    queryFn: async () => {
      if (!bookingId) return null;
      const url = buildStaffURL(hotelSlug, 'room-bookings', `/${bookingId}/`);
      // Survey data is automatically included when it exists
      const response = await api.get(url);
      
      // Log the response to see the actual structure
      console.log('Booking detail response:', response.data);
      
      // Handle field mapping if needed (similar to list view)
      const booking = response.data;
      
      // Map field names if they're different from what the frontend expects
      const mappedBooking = {
        ...booking,
        // Ensure party is always available
        party: booking.party || booking.booking_party || booking.guests || null,
      };
      
      console.log('Mapped booking:', mappedBooking);
      
      return mappedBooking;
    },
    enabled: !!bookingId && !!hotelSlug,
  });
};

export const useAvailableRooms = (hotelSlug, bookingId) => {
  return useQuery({
    queryKey: queryKeys.staffAvailableRooms(hotelSlug, bookingId),
    queryFn: async () => {
      console.log('🏨 [ROOMS API] Fetching available rooms:', {
        hotelSlug,
        bookingId,
        endpoint: buildStaffURL(hotelSlug, 'room-bookings', `/${bookingId}/available-rooms/`)
      });
      
      const url = buildStaffURL(hotelSlug, 'room-bookings', `/${bookingId}/available-rooms/`);
      const response = await api.get(url);
      
      console.log('🏨 [ROOMS API] Response:', response.data);
      
      return response.data;
    },
    enabled: !!bookingId && !!hotelSlug,
    onError: (error) => {
      console.error('🏨 [ROOMS API] Error:', error);
    }
  });
};

export const useSafeAssignRoom = (hotelSlug) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ bookingId, roomId, assignmentNotes, booking, reason }) => {
      const isInHouse = !!booking?.checked_in_at && !booking?.checked_out_at;
      
      if (isInHouse) {
        // Move room for in-house guests
        return moveRoom({
          hotelSlug,
          bookingId,
          toRoomId: roomId,
          reason,
          notes: assignmentNotes
        });
      } else {
        // Reassign room for pre-checkin guests
        const url = buildStaffURL(hotelSlug, 'room-bookings', `/${bookingId}/safe-assign-room/`);
        const response = await api.post(url, {
          room_id: roomId,
          assignment_notes: assignmentNotes || '',
        });
        return response.data;
      }
    },
    onSuccess: (response, variables) => {
      const isInHouse = !!variables.booking?.checked_in_at && !variables.booking?.checked_out_at;
      const roomNumber = response.assigned_room?.room_number || variables.roomId;
      
      // Context-aware success messages
      if (isInHouse) {
        toast.success(`Guest moved to room ${roomNumber}`);
      } else {
        toast.success(`Room reassigned to ${roomNumber}`);
      }
      
      // Invalidate both list and detail queries
      queryClient.invalidateQueries({
        queryKey: ['staff-room-bookings', hotelSlug]
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.staffRoomBooking(hotelSlug, variables.bookingId)
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.staffAvailableRooms(hotelSlug, variables.bookingId)
      });
    },
    onError: (error, variables) => {
      const isInHouse = !!variables.booking?.checked_in_at && !variables.booking?.checked_out_at;
      const backendMessage = error.response?.data?.message || error.response?.data?.error?.message;
      
      if (backendMessage) {
        toast.error(backendMessage);
      } else {
        // Fallback messages
        toast.error(isInHouse ? 'Room move failed' : 'Room reassignment failed');
      }
    },
  });
};

export const useUnassignRoom = (hotelSlug) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ bookingId }) => {
      const url = buildStaffURL(hotelSlug, 'room-bookings', `/${bookingId}/unassign-room/`);
      const response = await api.post(url, {});
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['staff-room-bookings', hotelSlug]
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.staffRoomBooking(hotelSlug, variables.bookingId)
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.staffAvailableRooms(hotelSlug, variables.bookingId)
      });
      toast.success('Room unassigned successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to unassign room');
    },
  });
};

export const useSendPrecheckinLink = (hotelSlug) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ bookingId }) => {
      const url = buildStaffURL(hotelSlug, 'room-bookings', `/${bookingId}/send-precheckin-link/`);
      const response = await api.post(url, {});
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate detail query to refresh party status
      queryClient.invalidateQueries({
        queryKey: queryKeys.staffRoomBooking(hotelSlug, variables.bookingId)
      });
      // Show success toast with sent_to field from response
      const sentTo = data.sent_to || 'guest';
      toast.success(`Pre-check-in link sent to ${sentTo}`);
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to send pre-check-in link. Please try again.');
    },
  });
};

export const useCheckInBooking = (hotelSlug) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ bookingId, roomNumber }) => {
      // Use booking-centric check-in endpoint
      const url = buildStaffURL(hotelSlug, 'room-bookings', `/${bookingId}/check-in/`);
      const response = await api.post(url, {});
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['staff-room-bookings', hotelSlug]
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.staffRoomBooking(hotelSlug, variables.bookingId)
      });
      toast.success('Guest checked in successfully!');
    },
    onError: (error) => {
      // Handle 400 errors from backend with specific message
      const data = error.response?.data || {};
      const message = 
        data.detail || 
        data.message || 
        (typeof data.error === 'string' ? data.error : null) || 
        'Check-in failed';
      toast.error(message);
    },
  });
};
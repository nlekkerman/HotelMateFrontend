import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { buildStaffURL } from '@/services/api';
import { toast } from 'react-toastify';

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
      // Add query parameter to get detailed survey response
      const response = await api.get(`${url}?include_survey_response=true`);
      
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
    mutationFn: async ({ bookingId, roomId, assignmentNotes }) => {
      const url = buildStaffURL(hotelSlug, 'room-bookings', `/${bookingId}/safe-assign-room/`);
      const response = await api.post(url, {
        room_id: roomId,
        assignment_notes: assignmentNotes || '',
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
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
      toast.success('Room assigned successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to assign room');
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
      const message = error.response?.data?.message || error.response?.data?.error || 'Check-in failed';
      toast.error(message);
    },
  });
};
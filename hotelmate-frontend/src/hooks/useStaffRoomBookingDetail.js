import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { buildStaffURL } from '@/services/api';
import { toast } from 'react-toastify';

const queryKeys = {
  staffRoomBooking: (hotelSlug, bookingId) => ['staff-room-booking', hotelSlug, bookingId],
  staffRoomBookingAvailableRooms: (hotelSlug, bookingId) => ['staff-room-booking-available-rooms', hotelSlug, bookingId],
};

export const useRoomBookingDetail = (hotelSlug, bookingId) => {
  return useQuery({
    queryKey: queryKeys.staffRoomBooking(hotelSlug, bookingId),
    queryFn: async () => {
      if (!bookingId) return null;
      const url = buildStaffURL(hotelSlug, 'room-bookings', `/${bookingId}/`);
      const response = await api.get(url);
      
      // Log the response to see the actual structure
      console.log('Booking detail response:', response.data);
      
      // Handle field mapping if needed (similar to list view)
      const booking = response.data;
      
      // Map field names if they're different from what the frontend expects
      const mappedBooking = {
        ...booking,
        // Ensure party is always an array or null
        party: booking.party || booking.booking_party || booking.guests || null,
        // Map other fields as needed
        guest_name: booking.guest_name || booking.primary_guest_name,
      };
      
      console.log('Mapped booking:', mappedBooking);
      
      return mappedBooking;
    },
    enabled: !!bookingId && !!hotelSlug,
  });
};

export const useAvailableRooms = (hotelSlug, bookingId) => {
  return useQuery({
    queryKey: queryKeys.staffRoomBookingAvailableRooms(hotelSlug, bookingId),
    queryFn: async () => {
      const url = buildStaffURL(hotelSlug, 'room-bookings', `/${bookingId}/available-rooms/`);
      const response = await api.get(url);
      return response.data;
    },
    enabled: !!bookingId && !!hotelSlug,
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
        queryKey: queryKeys.staffRoomBookingAvailableRooms(hotelSlug, variables.bookingId)
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
        queryKey: queryKeys.staffRoomBookingAvailableRooms(hotelSlug, variables.bookingId)
      });
      toast.success('Room unassigned successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to unassign room');
    },
  });
};

export const useCheckInBooking = (hotelSlug) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ bookingId }) => {
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
      toast.success('Guest checked in successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Check-in failed');
    },
  });
};
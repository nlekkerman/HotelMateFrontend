import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { buildStaffURL } from '@/services/api';

/**
 * Custom hook for staff booking operations (room assignment + check-in)
 * Follows backend-driven approach with zero legacy dependencies
 */
export const useStaffBookings = (hotelSlug) => {
  const queryClient = useQueryClient();
  const [availableRoomsByBookingId, setAvailableRoomsByBookingId] = useState({});

  // Query Keys
  const queryKeys = {
    bookingDetail: (bookingId) => ['staffBookingDetail', hotelSlug, bookingId],
    bookingsList: (filters) => ['staffBookingsList', hotelSlug, filters],
  };

  // Get booking detail
  const getBookingDetail = useCallback(async (bookingId) => {
    if (!hotelSlug || !bookingId) return null;
    
    const url = buildStaffURL(hotelSlug, 'room-bookings', `/${bookingId}/`);
    const response = await api.get(url);
    return response.data;
  }, [hotelSlug]);

  // Fetch available rooms for assignment
  const fetchAvailableRooms = useCallback(async (bookingId) => {
    if (!hotelSlug || !bookingId) return [];
    
    const url = buildStaffURL(hotelSlug, 'room-bookings', `/${bookingId}/available-rooms/`);
    const response = await api.get(url);
    
    // Cache the results
    setAvailableRoomsByBookingId(prev => ({
      ...prev,
      [bookingId]: response.data
    }));
    
    return response.data;
  }, [hotelSlug]);

  // Safe assign room mutation
  const safeAssignRoom = useMutation({
    mutationFn: async ({ bookingId, roomId, notes }) => {
      if (!hotelSlug || !bookingId || !roomId) {
        throw new Error('Missing required parameters');
      }
      
      const url = buildStaffURL(hotelSlug, 'room-bookings', `/${bookingId}/safe-assign-room/`);
      const response = await api.post(url, { 
        room_id: roomId, 
        notes: notes || undefined 
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate booking detail and list queries
      queryClient.invalidateQueries({ queryKey: queryKeys.bookingDetail(variables.bookingId) });
      queryClient.invalidateQueries({ queryKey: ['staffBookingsList', hotelSlug] });
      
      // Clear available rooms cache for this booking
      setAvailableRoomsByBookingId(prev => {
        const updated = { ...prev };
        delete updated[variables.bookingId];
        return updated;
      });
    },
    onError: (error) => {
      console.error('Failed to assign room:', error);
    }
  });

  // Unassign room mutation
  const unassignRoom = useMutation({
    mutationFn: async (bookingId) => {
      if (!hotelSlug || !bookingId) {
        throw new Error('Missing required parameters');
      }
      
      const url = buildStaffURL(hotelSlug, 'room-bookings', `/${bookingId}/unassign-room/`);
      const response = await api.post(url);
      return response.data;
    },
    onSuccess: (data, bookingId) => {
      // Invalidate booking detail and list queries
      queryClient.invalidateQueries({ queryKey: queryKeys.bookingDetail(bookingId) });
      queryClient.invalidateQueries({ queryKey: ['staffBookingsList', hotelSlug] });
      
      // Clear available rooms cache for this booking
      setAvailableRoomsByBookingId(prev => {
        const updated = { ...prev };
        delete updated[bookingId];
        return updated;
      });
    },
    onError: (error) => {
      console.error('Failed to unassign room:', error);
    }
  });

  // Check-in booking mutation
  const checkInBooking = useMutation({
    mutationFn: async (bookingId) => {
      if (!hotelSlug || !bookingId) {
        throw new Error('Missing required parameters');
      }
      
      const url = buildStaffURL(hotelSlug, 'room-bookings', `/${bookingId}/check-in/`);
      const response = await api.post(url);
      return response.data;
    },
    onSuccess: (data, bookingId) => {
      // Invalidate booking detail and list queries
      queryClient.invalidateQueries({ queryKey: queryKeys.bookingDetail(bookingId) });
      queryClient.invalidateQueries({ queryKey: ['staffBookingsList', hotelSlug] });
      
      // Clear available rooms cache for this booking
      setAvailableRoomsByBookingId(prev => {
        const updated = { ...prev };
        delete updated[bookingId];
        return updated;
      });
    },
    onError: (error) => {
      console.error('Failed to check-in booking:', error);
    }
  });

  // Get cached available rooms for a booking
  const getCachedAvailableRooms = useCallback((bookingId) => {
    return availableRoomsByBookingId[bookingId] || null;
  }, [availableRoomsByBookingId]);

  // Clear available rooms cache for a booking
  const clearAvailableRoomsCache = useCallback((bookingId) => {
    setAvailableRoomsByBookingId(prev => {
      const updated = { ...prev };
      delete updated[bookingId];
      return updated;
    });
  }, []);

  return {
    // API Functions
    getBookingDetail,
    fetchAvailableRooms,
    
    // Mutations
    safeAssignRoom,
    unassignRoom,
    checkInBooking,
    
    // Cache management
    getCachedAvailableRooms,
    clearAvailableRoomsCache,
    
    // Query keys for external usage
    queryKeys,
    
    // Mutation states
    isAssigning: safeAssignRoom.isPending,
    isUnassigning: unassignRoom.isPending,
    isCheckingIn: checkInBooking.isPending,
    
    // Error states
    assignError: safeAssignRoom.error,
    unassignError: unassignRoom.error,
    checkInError: checkInBooking.error,
  };
};

export default useStaffBookings;
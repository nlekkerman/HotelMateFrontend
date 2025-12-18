import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api, { buildStaffURL, staffBookingService } from '@/services/api';
import { eventBus } from '@/realtime/eventBus';

const queryKeys = {
  staffRoomBookings: (hotelSlug, filtersHash) => ['staff-room-bookings', hotelSlug, filtersHash],
};

/**
 * Custom hook for managing hotel booking operations with TanStack Query
 * Handles fetching, filtering, confirming, and cancelling bookings
 */
export const useBookingManagement = (hotelSlug) => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Listen to real-time booking events and invalidate cache
  useEffect(() => {
    if (!hotelSlug) return;
    
    const handleRoomBookingEvent = () => {
      // Invalidate booking queries to refresh data from server
      queryClient.invalidateQueries({
        queryKey: ['staff-room-bookings', hotelSlug]
      });
    };
    
    // Subscribe to all room booking events
    eventBus.on('ROOM_BOOKING_CREATED', handleRoomBookingEvent);
    eventBus.on('ROOM_BOOKING_UPDATED', handleRoomBookingEvent);
    eventBus.on('ROOM_BOOKING_PARTY_UPDATED', handleRoomBookingEvent);
    eventBus.on('ROOM_BOOKING_CANCELLED', handleRoomBookingEvent);
    eventBus.on('ROOM_BOOKING_CHECKED_IN', handleRoomBookingEvent);
    eventBus.on('ROOM_BOOKING_CHECKED_OUT', handleRoomBookingEvent);
    
    return () => {
      // Cleanup event listeners
      eventBus.off('ROOM_BOOKING_CREATED', handleRoomBookingEvent);
      eventBus.off('ROOM_BOOKING_UPDATED', handleRoomBookingEvent);
      eventBus.off('ROOM_BOOKING_PARTY_UPDATED', handleRoomBookingEvent);
      eventBus.off('ROOM_BOOKING_CANCELLED', handleRoomBookingEvent);
      eventBus.off('ROOM_BOOKING_CHECKED_IN', handleRoomBookingEvent);
      eventBus.off('ROOM_BOOKING_CHECKED_OUT', handleRoomBookingEvent);
    };
  }, [hotelSlug, queryClient]);
  
  // Create filters hash from URL params for stable query key
  const filtersHash = useMemo(() => {
    const params = {};
    if (searchParams.has('filter')) {
      params.filter = searchParams.get('filter');
    }
    if (searchParams.has('page')) {
      params.page = searchParams.get('page');
    }
    return JSON.stringify(params);
  }, [searchParams]);
  
  // Build query string from URL params
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    
    if (searchParams.has('filter')) {
      const filterValue = searchParams.get('filter');
      switch (filterValue) {
        case 'pending':
          params.append('status', 'PENDING_PAYMENT');
          break;
        case 'confirmed':
          params.append('status', 'CONFIRMED');
          break;
        case 'cancelled':
          params.append('status', 'CANCELLED');
          break;
        case 'history':
          params.append('status', 'COMPLETED,CANCELLED');
          break;
        default:
          break;
      }
    }
    
    if (searchParams.has('page')) {
      params.append('page', searchParams.get('page'));
    }
    
    return params.toString();
  }, [searchParams]);
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.staffRoomBookings(hotelSlug, filtersHash),
    queryFn: async () => {
      const url = buildStaffURL(hotelSlug, 'room-bookings', queryString ? `/?${queryString}` : '/');
      const response = await api.get(url);
      
      // Debug: Log the raw response to see what we're getting
      console.log('Raw booking list response:', response.data);
      if (response.data && response.data.length > 0) {
        console.log('First booking raw data:', response.data[0]);
      }
      
      // Backend returns direct array, map fields for frontend compatibility
      const bookings = Array.isArray(response.data) ? response.data : [];
      
      const mappedResults = bookings.map(booking => {
        // Debug: Log each booking's data transformation
        const originalAmount = booking.total_amount;
        const parsedAmount = parseFloat(booking.total_amount) || 0;
        console.log(`Booking ${booking.booking_id}:`);
        console.log(`  - Amount: original="${originalAmount}", parsed=${parsedAmount}`);
        console.log(`  - Party:`, booking.party);
        console.log(`  - Primary email: ${booking.primary_email}`);
        console.log(`  - Booker email: ${booking.booker_email}`);
        console.log(`  - Party status: complete=${booking.party_complete}, missing=${booking.party_missing_count}`);
        
        return {
          ...booking,
          id: booking.booking_id, // Map booking_id to id for table key
          party: booking.party || null, // Ensure party is available
          guest_email: booking.primary_email || booking.booker_email || booking.guest_email || '',
          guest_phone: booking.primary_phone || booking.guest_phone || booking.booker_phone || '',
          room_type_name: booking.room_type_name || 'Standard Room',
          total_amount: parsedAmount,
          currency: booking.currency || 'EUR',
          // Add party status fields for easy access
          party_complete: booking.party_complete,
          party_missing_count: booking.party_missing_count,
          party_status_display: booking.party_status_display
        };
      });
      
      console.log('Mapped results:', mappedResults);
      
      return {
        results: mappedResults
      };
    },
    enabled: !!hotelSlug,
  });
  
  // Calculate statistics from data
  const statistics = useMemo(() => {
    if (!data?.results) {
      return {
        total: 0,
        pending: 0,
        confirmed: 0,
        cancelled: 0,
        completed: 0,
      };
    }
    
    const bookings = data.results;
    return {
      total: bookings.length,
      pending: bookings.filter(b => b.status === 'PENDING_PAYMENT').length,
      confirmed: bookings.filter(b => b.status === 'CONFIRMED').length,
      cancelled: bookings.filter(b => b.status === 'CANCELLED').length,
      completed: bookings.filter(b => b.status === 'COMPLETED').length,
    };
  }, [data]);

  // Confirm booking mutation
  const confirmBookingMutation = useMutation({
    mutationFn: async (bookingId) => {
      const url = buildStaffURL(hotelSlug, 'room-bookings', `/${bookingId}/confirm/`);
      const response = await api.post(url);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['staff-room-bookings', hotelSlug]
      });
    }
  });

  // Cancel booking mutation
  const cancelBookingMutation = useMutation({
    mutationFn: async ({ bookingId, reason = 'Cancelled by staff' }) => {
      const url = buildStaffURL(hotelSlug, 'room-bookings', `/${bookingId}/cancel/`);
      const response = await api.post(url, { reason });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['staff-room-bookings', hotelSlug]
      });
    }
  });

  // Send pre-check-in link mutation
  const sendPrecheckinLinkMutation = useMutation({
    mutationFn: async (bookingId) => {
      const url = buildStaffURL(hotelSlug, 'room-bookings', `/${bookingId}/send-precheckin-link/`);
      const response = await api.post(url);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['staff-room-bookings', hotelSlug]
      });
    }
  });

  // Accept booking mutation (approve and capture payment)
  const acceptBookingMutation = useMutation({
    mutationFn: async (bookingId) => {
      return await staffBookingService.acceptRoomBooking(hotelSlug, bookingId);
    },
    onSuccess: (updatedBooking) => {
      // Invalidate all booking queries to refresh the UI
      queryClient.invalidateQueries({
        queryKey: ['staff-room-bookings', hotelSlug]
      });
      toast.success('Booking approved, payment captured.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to approve booking');
    }
  });

  // Decline booking mutation (decline and release authorization)
  const declineBookingMutation = useMutation({
    mutationFn: async (bookingId) => {
      return await staffBookingService.declineRoomBooking(hotelSlug, bookingId);
    },
    onSuccess: (updatedBooking) => {
      // Invalidate all booking queries to refresh the UI
      queryClient.invalidateQueries({
        queryKey: ['staff-room-bookings', hotelSlug]
      });
      toast.success('Booking declined, authorization released.');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to decline booking');
    }
  });
  
  // URL filter management
  const setFilter = (filterType) => {
    const newParams = new URLSearchParams(searchParams);
    if (filterType && filterType !== 'all') {
      newParams.set('filter', filterType);
    } else {
      newParams.delete('filter');
    }
    newParams.delete('page'); // Reset page when changing filters
    setSearchParams(newParams);
  };
  
  const setPage = (page) => {
    const newParams = new URLSearchParams(searchParams);
    if (page > 1) {
      newParams.set('page', page.toString());
    } else {
      newParams.delete('page');
    }
    setSearchParams(newParams);
  };
  
  return {
    bookings: data?.results || [],
    pagination: data?.pagination || null,
    statistics,
    isLoading,
    error,
    refetch,
    currentFilter: searchParams.get('filter') || 'all',
    currentPage: parseInt(searchParams.get('page') || '1', 10),
    setFilter,
    setPage,
    
    // Mutations
    confirmBooking: confirmBookingMutation.mutateAsync,
    cancelBooking: cancelBookingMutation.mutateAsync,
    sendPrecheckinLink: sendPrecheckinLinkMutation.mutateAsync,
    acceptBooking: acceptBookingMutation.mutateAsync,
    declineBooking: declineBookingMutation.mutateAsync,
    isConfirming: confirmBookingMutation.isPending,
    isCancelling: cancelBookingMutation.isPending,
    isSendingPrecheckin: sendPrecheckinLinkMutation.isPending,
    isAccepting: acceptBookingMutation.isPending,
    isDeclining: declineBookingMutation.isPending,
    
    // Helpers
    hasBookings: (data?.results || []).length > 0,
    isEmpty: (data?.results || []).length === 0 && !isLoading,
  };
};

export default useBookingManagement;
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api, { buildStaffURL, staffBookingService } from '@/services/api';
import { useRoomBookingState } from '@/realtime/stores/roomBookingStore';

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
  const roomBookingState = useRoomBookingState();
  
  // Invalidate cache when room booking store updates (Pusher events)
  useEffect(() => {
    if (!hotelSlug || !roomBookingState) return;
    
    // Track previous booking list to detect changes
    const currentBookingIds = Object.keys(roomBookingState.byBookingId);
    
    // Simple change detection - if booking count or IDs change, invalidate cache
    const invalidateCache = () => {
      queryClient.invalidateQueries({
        queryKey: ['staff-room-bookings', hotelSlug]
      });
    };
    
    // Trigger cache invalidation when store state changes
    invalidateCache();
  }, [hotelSlug, queryClient, roomBookingState.byBookingId]);
  
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
          params.append('status', 'PENDING_PAYMENT,PENDING_APPROVAL');
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
    // Poll for bookings in transition states (payment authorization → approval)
    refetchInterval: (data) => {
      const bookings = data?.results ?? [];
      const hasTransitionBookings = bookings.some(
        b => b.status === 'PENDING_PAYMENT' || b.status === 'PENDING_APPROVAL'
      );
      // Poll every 3 seconds only while we have bookings waiting for status change
      return hasTransitionBookings ? 3000 : false;
    },
    // Refetch when window gains focus (helps with tab switching)
    refetchOnWindowFocus: true,
    // Keep data fresh
    staleTime: 30000 // 30 seconds
  });
  
  // Calculate statistics from data
  const statistics = useMemo(() => {
    if (!data?.results) {
      return {
        total: 0,
        pending: 0,
        pendingPayment: 0,
        pendingApproval: 0,
        confirmed: 0,
        cancelled: 0,
        completed: 0,
      };
    }
    
    const bookings = data.results;
    return {
      total: bookings.length,
      pending: bookings.filter(b => b.status === 'PENDING_PAYMENT' || b.status === 'PENDING_APPROVAL').length,
      pendingPayment: bookings.filter(b => b.status === 'PENDING_PAYMENT').length,
      pendingApproval: bookings.filter(b => b.status === 'PENDING_APPROVAL').length,
      confirmed: bookings.filter(b => b.status === 'CONFIRMED').length,
      cancelled: bookings.filter(b => b.status === 'CANCELLED').length,
      completed: bookings.filter(b => b.status === 'COMPLETED').length,
    };
  }, [data]);





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
    mutationKey: ['acceptBooking'],
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
    mutationKey: ['declineBooking'],
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
    sendPrecheckinLink: sendPrecheckinLinkMutation.mutateAsync,
    acceptBooking: acceptBookingMutation.mutate,
    declineBooking: declineBookingMutation.mutate,
    isSendingPrecheckin: sendPrecheckinLinkMutation.isPending,
    
    // Helper to check if specific booking is processing
    isBookingAccepting: (bookingId) => acceptBookingMutation.isPending && acceptBookingMutation.variables === bookingId,
    isBookingDeclining: (bookingId) => declineBookingMutation.isPending && declineBookingMutation.variables === bookingId,
    
    // Helpers
    hasBookings: (data?.results || []).length > 0,
    isEmpty: (data?.results || []).length === 0 && !isLoading,
  };
};

export default useBookingManagement;
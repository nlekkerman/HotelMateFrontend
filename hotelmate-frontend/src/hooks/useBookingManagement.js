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
    if (searchParams.has('bucket')) {
      params.bucket = searchParams.get('bucket');
    }
    if (searchParams.has('page')) {
      params.page = searchParams.get('page');
    }
    return JSON.stringify(params);
  }, [searchParams]);
  
  // Build query string from URL params
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    
    // Bucket parameter takes priority over status filters
    if (searchParams.has('bucket')) {
      params.append('bucket', searchParams.get('bucket'));
    } else if (searchParams.has('filter')) {
      const filterValue = searchParams.get('filter');
      switch (filterValue) {
        case 'pending':
          params.append('status', 'PENDING_PAYMENT,PENDING_APPROVAL');
          break;
        case 'confirmed':
          params.append('status', 'CONFIRMED');
          break;
        case 'completed':
          params.append('status', 'COMPLETED');
          break;
        case 'cancelled':
          params.append('status', 'CANCELLED');
          break;
        case 'history':
          params.append('status', 'COMPLETED,CANCELLED,CHECKED_OUT');
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
      
      // Handle both array format and paginated format with counts
      let bookings, counts = null;
      if (Array.isArray(response.data)) {
        bookings = response.data;
      } else if (response.data.results) {
        bookings = response.data.results;
        counts = response.data.counts; // Bucket counts from backend
      } else {
        bookings = [];
      }
      
      if (bookings.length > 0) {
        console.log('First booking raw data:', bookings[0]);
      }
      
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
        results: mappedResults,
        counts: counts // Bucket counts from backend (when available)
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
  
  // Calculate statistics from data - use backend counts when available
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
        arrivals: 0,
        in_house: 0,
        departures: 0,
        checked_out: 0,
      };
    }
    
    const bookings = data.results;
    
    // ALWAYS use backend bucket counts when available - these are total counts
    if (data.counts) {
      return {
        total: data.counts.total || 0,
        pending: (data.counts.pending_payment || 0) + (data.counts.pending_approval || 0),
        pendingPayment: data.counts.pending_payment || 0,
        pendingApproval: data.counts.pending_approval || 0,
        confirmed: data.counts.confirmed || 0,
        cancelled: data.counts.cancelled || 0,
        completed: data.counts.completed || 0,
        arrivals: data.counts.arrivals || 0,
        in_house: data.counts.in_house || 0,
        departures: data.counts.departures || 0,
        checked_out: data.counts.checked_out || 0,
      };
    }
    
    // Fallback: always calculate from current results (this will work for 'all' view)
    // The key is that button numbers should only be calculated when viewing ALL bookings
    return {
      total: bookings.length,
      pending: bookings.filter(b => b.status === 'PENDING_PAYMENT' || b.status === 'PENDING_APPROVAL').length,
      pendingPayment: bookings.filter(b => b.status === 'PENDING_PAYMENT').length,
      pendingApproval: bookings.filter(b => b.status === 'PENDING_APPROVAL').length,
      confirmed: bookings.filter(b => b.status === 'CONFIRMED').length,
      cancelled: bookings.filter(b => b.status === 'CANCELLED').length,
      completed: bookings.filter(b => b.status === 'COMPLETED' || b.checked_out_at != null).length,
      arrivals: bookings.filter(b => {
        const isToday = new Date(b.check_in).toDateString() === new Date().toDateString();
        return isToday && !b.checked_in_at && (b.status === 'CONFIRMED' || b.status === 'PENDING_APPROVAL');
      }).length,
      in_house: bookings.filter(b => b.checked_in_at && !b.checked_out_at).length,
      departures: bookings.filter(b => {
        const isToday = new Date(b.check_out).toDateString() === new Date().toDateString();
        return isToday && !b.checked_out_at;
      }).length,
      checked_out: bookings.filter(b => b.checked_out_at != null).length,
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
  const setFilter = (filterType, filterValue) => {
    const newParams = new URLSearchParams(searchParams);
    
    if (filterType === 'bucket') {
      // Clear existing filters when setting bucket
      newParams.delete('filter');
      if (filterValue) {
        newParams.set('bucket', filterValue);
      } else {
        newParams.delete('bucket');
      }
    } else if (filterType === 'filter' || typeof filterType === 'string') {
      // Legacy filter support - clear bucket when setting legacy filter
      newParams.delete('bucket');
      const legacyFilter = filterValue || filterType;
      if (legacyFilter && legacyFilter !== 'all') {
        newParams.set('filter', legacyFilter);
      } else {
        newParams.delete('filter');
      }
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
    currentBucket: searchParams.get('bucket') || null,
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
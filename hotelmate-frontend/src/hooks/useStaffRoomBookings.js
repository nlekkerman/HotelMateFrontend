import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { buildStaffURL } from '@/services/api';
import { 
  buildBookingListSearchParams, 
  parseBookingListFiltersFromSearchParams, 
  getCurrentPageFromSearchParams,
  defaultBookingListFilters,
  ALLOWED_BUCKETS
} from '@/types/bookingFilters';

/**
 * Custom hook for managing staff room bookings with the new canonical FilterSet
 * @param {string} hotelSlug - Hotel slug identifier
 * @returns {Object} Booking data and management functions
 */
export const useStaffRoomBookings = (hotelSlug) => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Parse current filters and page from URL
  const filters = useMemo(() => 
    parseBookingListFiltersFromSearchParams(searchParams), 
    [searchParams]
  );
  
  const page = useMemo(() => 
    getCurrentPageFromSearchParams(searchParams), 
    [searchParams]
  );

  // Create stable query key
  const queryKey = useMemo(() => {
    const params = buildBookingListSearchParams(filters, page);
    return ['staff-room-bookings', hotelSlug, params.toString()];
  }, [hotelSlug, filters, page]);

  // Main query for fetching bookings
  const {
    data,
    isLoading,
    error,
    refetch,
    isFetching
  } = useQuery({
    queryKey,
    queryFn: async () => {
      const params = buildBookingListSearchParams(filters, page);
      const url = buildStaffURL(hotelSlug, 'room-bookings', `/?${params.toString()}`);
      
      console.group('🔍 Booking List Query Debug');
      console.log('A) Request URL with query string:', url);
      console.log('B) Query Key:', queryKey);
      console.log('C) Current filters.bucket:', filters.bucket);
      console.log('D) Full filters object:', filters);
      console.log('E) Serialized params:', params.toString());
      console.groupEnd();
      
      const response = await api.get(url);
      
      console.log('Booking list response:', response.data);
      
      // Handle both array format and paginated format
      let bookings, pagination = null, bucketCounts = null;
      
      if (Array.isArray(response.data)) {
        bookings = response.data;
      } else if (response.data.results) {
        bookings = response.data.results;
        pagination = {
          count: response.data.count,
          next: response.data.next,
          previous: response.data.previous,
          total_pages: Math.ceil(response.data.count / (response.data.results?.length || 20))
        };
        bucketCounts = response.data.bucket_counts;
      } else {
        bookings = [];
      }

      // Ensure consistent booking data structure
      const processedBookings = bookings.map(booking => ({
        ...booking,
        id: booking.booking_id || booking.id,
        guest_email: booking.party?.primary?.email || booking.primary_email || booking.booker_email || booking.guest_email || '',
        guest_phone: booking.party?.primary?.phone || booking.primary_phone || booking.guest_phone || booking.booker_phone || '',
        guest_name: booking.party?.primary ? 
          `${booking.party.primary.first_name} ${booking.party.primary.last_name}`.trim() :
          booking.guest_name || '',
        room_type_name: booking.room_type_name || booking.room?.room_type_name || 'Standard Room',
        total_amount: parseFloat(booking.total_amount) || 0,
        currency: booking.currency || 'EUR'
      }));

      return {
        results: processedBookings,
        pagination,
        bucket_counts: bucketCounts || {}
      };
    },
    enabled: !!hotelSlug,
    // Poll for bookings in transition states
    refetchInterval: (data) => {
      const bookings = data?.results ?? [];
      const hasTransitionBookings = bookings.some(
        b => b.status === 'PENDING_PAYMENT' || b.status === 'PENDING_APPROVAL'
      );
      return hasTransitionBookings ? 3000 : false;
    },
    refetchOnWindowFocus: true,
    staleTime: 30000 // 30 seconds
  });

  // Helper functions for URL management
  const updateFilters = (newFilters) => {
    const mergedFilters = { ...filters, ...newFilters };
    const newParams = buildBookingListSearchParams(mergedFilters, 1); // Reset to page 1
    setSearchParams(newParams);
  };

  const updatePage = (newPage) => {
    const newParams = buildBookingListSearchParams(filters, newPage);
    setSearchParams(newParams);
  };

  const resetFilters = () => {
    const newParams = buildBookingListSearchParams(defaultBookingListFilters, 1);
    setSearchParams(newParams);
  };

  const setBucket = (bucket) => {
    updateFilters({ bucket });
  };

  const setSearch = (q) => {
    updateFilters({ q });
  };

  // Extract data with defaults
  const bookings = data?.results || [];
  const pagination = data?.pagination || null;
  const bucketCounts = data?.bucket_counts || {};

  // Calculate statistics for display
  const statistics = useMemo(() => {
    // Use bucket counts from backend when available and counts are enabled
    if (filters.include_counts && bucketCounts && Object.keys(bucketCounts).length > 0) {
      return {
        total: bucketCounts.all || 0,
        arrivals: bucketCounts.arrivals || 0,
        in_house: bucketCounts.in_house || 0,
        departures: bucketCounts.departures || 0,
        pending: bucketCounts.pending || 0,
        checked_out: bucketCounts.checked_out || 0,
        cancelled: bucketCounts.cancelled || 0,
        expired: bucketCounts.expired || 0,
        no_show: bucketCounts.no_show || 0,
        overdue_checkout: bucketCounts.overdue_checkout || 0
      };
    }

    // Fallback to current results count when viewing all or counts disabled
    return {
      total: bookings.length,
      arrivals: 0,
      in_house: 0,
      departures: 0,
      pending: 0,
      checked_out: 0,
      cancelled: 0,
      expired: 0,
      no_show: 0,
      overdue_checkout: 0
    };
  }, [bucketCounts, bookings.length, filters.include_counts]);

  return {
    // Data
    bookings,
    pagination,
    statistics,
    bucketCounts,
    
    // State
    filters,
    page,
    isLoading,
    isFetching,
    error,
    
    // Actions
    updateFilters,
    updatePage,
    resetFilters,
    setBucket,
    setSearch,
    refetch,
    
    // Computed helpers
    hasBookings: bookings.length > 0,
    isEmpty: bookings.length === 0 && !isLoading,
    isFiltered: Object.keys(filters).some(key => {
      const value = filters[key];
      const defaultValue = defaultBookingListFilters[key];
      if (Array.isArray(value)) {
        return value.length !== (defaultValue?.length || 0);
      }
      return value !== defaultValue;
    })
  };
};

export default useStaffRoomBookings;
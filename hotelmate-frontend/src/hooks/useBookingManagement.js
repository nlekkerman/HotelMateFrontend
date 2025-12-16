import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import api from '@/services/api';

/**
 * Custom hook for managing hotel booking operations
 * Handles fetching, filtering, confirming, and cancelling bookings
 */
export const useBookingManagement = (hotelSlug) => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [filters, setFilters] = useState({
    status: '',
    start_date: '',
    end_date: ''
  });

  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    confirmed: 0,
    cancelled: 0,
    completed: 0
  });

  // Fetch bookings from API
  const fetchBookings = useCallback(async () => {
    if (!hotelSlug) return;

    setLoading(true);
    setError(null);

    try {
      // Build query parameters
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);

      const queryString = params.toString();
      const endpoint = `/staff/hotel/${hotelSlug}/room-bookings/${queryString ? `?${queryString}` : ''}`;

      const response = await api.get(endpoint);
      
      if (response.data) {
        setBookings(response.data);
        
        // Calculate stats from fetched bookings
        const bookingStats = response.data.reduce((acc, booking) => {
          acc.total += 1;
          switch (booking.status) {
            case 'PENDING_PAYMENT':
              acc.pending += 1;
              break;
            case 'CONFIRMED':
              acc.confirmed += 1;
              break;
            case 'CANCELLED':
              acc.cancelled += 1;
              break;
            case 'COMPLETED':
              acc.completed += 1;
              break;
          }
          return acc;
        }, { total: 0, pending: 0, confirmed: 0, cancelled: 0, completed: 0 });

        setStats(bookingStats);
      }
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to fetch bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [hotelSlug, filters]);

  // Confirm a booking
  const confirmBooking = useCallback(async (bookingId) => {
    if (!hotelSlug || !bookingId) return false;

    try {
      const response = await api.post(`/staff/hotel/${hotelSlug}/room-bookings/${bookingId}/confirm/`);
      
      if (response.data) {
        // Refresh bookings after successful confirmation
        await fetchBookings();
        return { success: true, message: response.data.message };
      }
    } catch (err) {
      console.error('Error confirming booking:', err);
      const errorMessage = err.response?.data?.error || 'Failed to confirm booking';
      return { success: false, message: errorMessage };
    }

    return { success: false, message: 'Failed to confirm booking' };
  }, [hotelSlug, fetchBookings]);

  // Cancel a booking
  const cancelBooking = useCallback(async (bookingId, reason = 'Cancelled by staff') => {
    if (!hotelSlug || !bookingId) return false;

    try {
      const response = await api.post(`/staff/hotel/${hotelSlug}/room-bookings/${bookingId}/cancel/`, {
        reason
      });
      
      if (response.data) {
        // Refresh bookings after successful cancellation
        await fetchBookings();
        return { success: true, message: response.data.message };
      }
    } catch (err) {
      console.error('Error cancelling booking:', err);
      const errorMessage = err.response?.data?.error || 'Failed to cancel booking';
      return { success: false, message: errorMessage };
    }

    return { success: false, message: 'Failed to cancel booking' };
  }, [hotelSlug, fetchBookings]);

  // Update filters
  const updateFilter = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      status: '',
      start_date: '',
      end_date: ''
    });
  }, []);

  // Set filter from URL parameters
  const setFilterFromUrl = useCallback((urlParams) => {
    const newFilters = {
      status: '',
      start_date: '',
      end_date: ''
    };
    
    if (urlParams.has('filter')) {
      const filterValue = urlParams.get('filter');
      switch (filterValue) {
        case 'pending':
          newFilters.status = 'PENDING_PAYMENT';
          break;
        case 'confirmed':
          newFilters.status = 'CONFIRMED';
          break;
        case 'cancelled':
          newFilters.status = 'CANCELLED';
          break;
        case 'history':
          // Show completed and cancelled bookings
          newFilters.status = 'COMPLETED,CANCELLED';
          break;
        default:
          newFilters.status = '';
      }
    }

    if (urlParams.has('start_date')) {
      newFilters.start_date = urlParams.get('start_date');
    }

    if (urlParams.has('end_date')) {
      newFilters.end_date = urlParams.get('end_date');
    }

    setFilters(newFilters);
  }, []);

  // Fetch bookings when filters change
  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return {
    // State
    bookings,
    loading,
    error,
    filters,
    stats,
    
    // Actions
    fetchBookings,
    confirmBooking,
    cancelBooking,
    updateFilter,
    clearFilters,
    setFilterFromUrl,
    
    // Helpers
    hasBookings: bookings.length > 0,
    isEmpty: bookings.length === 0 && !loading,
  };
};

export default useBookingManagement;
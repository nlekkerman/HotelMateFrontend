import { useState, useEffect, useCallback } from 'react';
import { fetchStaffList } from '../services/staffChatApi';

/**
 * Custom hook to fetch and manage staff list
 * @param {string} hotelSlug - The hotel's slug identifier
 * @param {string} searchTerm - Search term for filtering
 * @param {string} ordering - Ordering field
 * @returns {Object} Staff list data and state
 */
const useStaffList = (hotelSlug, searchTerm = '', ordering = '') => {
  const [staffList, setStaffList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadStaffList = useCallback(async () => {
    if (!hotelSlug || searchTerm === null) {
      setStaffList([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchStaffList(hotelSlug, searchTerm, ordering);
      // Handle paginated response: { count, results: [...] } or direct array
      const staffArray = data?.results || data || [];
      setStaffList(staffArray);
    } catch (err) {
      setError(err.message);
      console.error('Error loading staff list:', err);
      setStaffList([]); // Ensure staffList is always an array even on error
    } finally {
      setLoading(false);
    }
  }, [hotelSlug, searchTerm, ordering]);

  useEffect(() => {
    loadStaffList();
  }, [loadStaffList]);

  const refetch = useCallback(() => {
    loadStaffList();
  }, [loadStaffList]);

  return {
    staffList,
    loading,
    error,
    refetch
  };
};

export default useStaffList;

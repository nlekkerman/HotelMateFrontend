import { useState, useCallback } from 'react';

/**
 * Custom hook to manage staff search state
 * @param {number} debounceDelay - Delay in ms for debouncing search
 * @returns {Object} Search state and handlers
 */
const useStaffSearch = (debounceDelay = 300) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);

  const handleSearchChange = useCallback((value) => {
    setSearchTerm(value);

    // Clear existing timeout
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Set new timeout for debounced search
    const timeout = setTimeout(() => {
      setDebouncedSearchTerm(value);
    }, debounceDelay);

    setSearchTimeout(timeout);
  }, [debounceDelay, searchTimeout]);

  const clearSearch = useCallback(() => {
    setSearchTerm('');
    setDebouncedSearchTerm('');
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
  }, [searchTimeout]);

  return {
    searchTerm,
    debouncedSearchTerm,
    handleSearchChange,
    clearSearch
  };
};

export default useStaffSearch;

import { useState, useEffect } from 'react';
import api from '@/services/api';

/**
 * Custom hook to fetch category totals for a stocktake
 * Uses the /api/stock_tracker/{hotel_id}/stocktakes/{stocktake_id}/category_totals/ endpoint
 */
export const useCategoryTotals = (hotelSlug, stocktakeId) => {
  const [categoryTotals, setCategoryTotals] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCategoryTotals = async (categoryCode = null) => {
    if (!hotelSlug || !stocktakeId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      let url = `/stock_tracker/${hotelSlug}/stocktakes/${stocktakeId}/category_totals/`;
      
      // If specific category requested, add query param
      if (categoryCode) {
        url += `?category=${categoryCode}`;
      }
      
      const res = await api.get(url);
      
      // If specific category, response is a single object
      // If all categories, response is an object with category codes as keys
      if (categoryCode) {
        setCategoryTotals({ [categoryCode]: res.data });
      } else {
        setCategoryTotals(res.data);
      }
      
      return res.data;
    } catch (err) {
      console.error('Error fetching category totals:', err);
      setError(err.message || 'Failed to fetch category totals');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Fetch all category totals on mount or when dependencies change
  useEffect(() => {
    if (hotelSlug && stocktakeId) {
      console.log('🔍 Fetching category totals for:', { hotelSlug, stocktakeId });
      fetchCategoryTotals().catch(err => {
        console.error('❌ Failed to fetch category totals:', err);
      });
    }
  }, [hotelSlug, stocktakeId]);

  return {
    categoryTotals,
    loading,
    error,
    fetchCategoryTotals,
    refetch: fetchCategoryTotals
  };
};

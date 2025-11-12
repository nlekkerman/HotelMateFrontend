import { useState, useEffect } from "react";
import api from "@/services/api";

export const useStocktakes = (hotelSlug) => {
  const [stocktakes, setStocktakes] = useState([]);
  const [currentStocktake, setCurrentStocktake] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch all stocktakes
  const fetchStocktakes = async (status = null) => {
    setLoading(true);
    setError(null);
    try {
      let url = `/stock_tracker/${hotelSlug}/stocktakes/`;
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (params.toString()) url += `?${params.toString()}`;
      
      const res = await api.get(url);
      // Backend returns plain array (no pagination)
      setStocktakes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching stocktakes:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch single stocktake with lines
  const fetchStocktake = async (stocktakeId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/stock_tracker/${hotelSlug}/stocktakes/${stocktakeId}/`);
      setCurrentStocktake(res.data);
      return res.data;
    } catch (err) {
      console.error("Error fetching stocktake:", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Create stocktake
  const createStocktake = async (stocktakeData) => {
    console.log('📦 Creating stocktake:', stocktakeData);
    try {
      const res = await api.post(`/stock_tracker/${hotelSlug}/stocktakes/`, stocktakeData);
      console.log('✅ Stocktake created:', {
        id: res.data.id,
        status: res.data.status,
        period_start: res.data.period_start,
        period_end: res.data.period_end
      });
      setStocktakes([res.data, ...stocktakes]);
      return res.data;
    } catch (err) {
      console.error("❌ Error creating stocktake:", err);
      console.error("Response:", err.response?.data);
      throw err;
    }
  };

  // Populate stocktake
  const populateStocktake = async (stocktakeId) => {
    console.log('🔄 Populating stocktake #' + stocktakeId);
    console.time('populate-duration');
    
    try {
      const res = await api.post(`/stock_tracker/${hotelSlug}/stocktakes/${stocktakeId}/populate/`);
      
      console.timeEnd('populate-duration');
      console.log('✅ Population complete:', {
        lines_created: res.data.lines_created,
        message: res.data.message
      });
      
      await fetchStocktake(stocktakeId); // Refresh data
      return res.data;
    } catch (err) {
      console.error("❌ Error populating stocktake:", err);
      console.error("Response:", err.response?.data);
      throw err;
    }
  };

  // Update stocktake line
  const updateLine = async (lineId, lineData) => {
    try {
      const res = await api.patch(`/stock_tracker/${hotelSlug}/stocktake-lines/${lineId}/`, lineData);
      // Update line in current stocktake
      if (currentStocktake) {
        const updatedLines = currentStocktake.lines.map(line => 
          line.id === lineId ? res.data : line
        );
        setCurrentStocktake({ ...currentStocktake, lines: updatedLines });
      }
      return res.data;
    } catch (err) {
      console.error("Error updating line:", err);
      throw err;
    }
  };

  // Get period summary (using new API endpoint)
  const getCategoryTotals = async (periodId) => {
    try {
      const res = await api.get(`/stock-tracker/${hotelSlug}/periods/${periodId}/summary/`);
      // API returns full summary object with categories array and totals
      // { period_id, period_name, total_items, total_stock_value, categories: [...] }
      return res.data;
    } catch (err) {
      console.error("Error fetching period summary:", err);
      throw err;
    }
  };

  // Approve stocktake
  const approveStocktake = async (stocktakeId, approvedBy) => {
    console.log('🔒 Approving stocktake #' + stocktakeId);
    console.log('   Approved by:', approvedBy);
    
    try {
      const res = await api.post(`/stock_tracker/${hotelSlug}/stocktakes/${stocktakeId}/approve/`, {
        approved_by: approvedBy
      });
      
      console.log('✅ Stocktake approved:', {
        status: res.data.stocktake?.status,
        approved_at: res.data.stocktake?.approved_at,
        adjustments_created: res.data.adjustments_created
      });
      
      await fetchStocktake(stocktakeId); // Refresh data
      return res.data;
    } catch (err) {
      console.error("❌ Error approving stocktake:", err);
      console.error("Response:", err.response?.data);
      throw err;
    }
  };

  useEffect(() => {
    if (hotelSlug) {
      fetchStocktakes();
    }
  }, [hotelSlug]);

  return {
    stocktakes,
    currentStocktake,
    loading,
    error,
    fetchStocktakes,
    fetchStocktake,
    createStocktake,
    populateStocktake,
    updateLine,
    getCategoryTotals,
    approveStocktake,
    refetch: fetchStocktakes
  };
};

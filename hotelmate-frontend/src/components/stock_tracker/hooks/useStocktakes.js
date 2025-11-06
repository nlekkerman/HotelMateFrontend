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
    try {
      const res = await api.post(`/stock_tracker/${hotelSlug}/stocktakes/`, stocktakeData);
      setStocktakes([res.data, ...stocktakes]);
      return res.data;
    } catch (err) {
      console.error("Error creating stocktake:", err);
      throw err;
    }
  };

  // Populate stocktake
  const populateStocktake = async (stocktakeId) => {
    try {
      const res = await api.post(`/stock_tracker/${hotelSlug}/stocktakes/${stocktakeId}/populate/`);
      await fetchStocktake(stocktakeId); // Refresh data
      return res.data;
    } catch (err) {
      console.error("Error populating stocktake:", err);
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

  // Get category totals
  const getCategoryTotals = async (stocktakeId) => {
    try {
      const res = await api.get(`/stock_tracker/${hotelSlug}/stocktakes/${stocktakeId}/category-totals/`);
      return res.data;
    } catch (err) {
      console.error("Error fetching category totals:", err);
      throw err;
    }
  };

  // Approve stocktake
  const approveStocktake = async (stocktakeId, approvedBy) => {
    try {
      const res = await api.post(`/stock_tracker/${hotelSlug}/stocktakes/${stocktakeId}/approve/`, {
        approved_by: approvedBy
      });
      await fetchStocktake(stocktakeId); // Refresh data
      return res.data;
    } catch (err) {
      console.error("Error approving stocktake:", err);
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

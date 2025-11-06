import { useState, useEffect } from "react";
import api from "@/services/api";

export const useMovements = (hotelSlug) => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch movements
  const fetchMovements = async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.item) params.append('item', filters.item);
      if (filters.movementType) params.append('movement_type', filters.movementType);
      if (filters.dateFrom) params.append('timestamp__gte', filters.dateFrom);
      if (filters.dateTo) params.append('timestamp__lte', filters.dateTo);

      const url = `/stock_tracker/${hotelSlug}/movements/?${params.toString()}`;
      const res = await api.get(url);
      // Backend returns plain array (no pagination)
      setMovements(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching movements:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Create movement
  const createMovement = async (movementData) => {
    try {
      const res = await api.post(`/stock_tracker/${hotelSlug}/movements/`, movementData);
      setMovements([res.data, ...movements]);
      return res.data;
    } catch (err) {
      console.error("Error creating movement:", err);
      throw err;
    }
  };

  useEffect(() => {
    if (hotelSlug) {
      fetchMovements();
    }
  }, [hotelSlug]);

  return {
    movements,
    loading,
    error,
    fetchMovements,
    createMovement,
    refetch: fetchMovements
  };
};

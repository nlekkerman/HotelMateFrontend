import { useState, useEffect } from "react";
import api from "@/services/api";

export const useRestaurants = (hotelSlug) => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRestaurants = async () => {
    if (!hotelSlug) return;
    setLoading(true);
    setError(null);
    try {
      // Use hotel-scoped endpoint as per RESTAURANT_API_GUIDE.md
      const res = await api.get(`/bookings/${hotelSlug}/restaurants/`);
      // Handle both array and paginated responses
      const data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setRestaurants(data);
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || "Failed to fetch restaurants";
      setError(errorMessage);
      console.error("Error fetching restaurants:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, [hotelSlug]);

  return { restaurants, setRestaurants, loading, error, fetchRestaurants };
};

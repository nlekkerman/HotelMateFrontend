import { useState, useEffect } from "react";
import api from "@/services/api";

export const useRestaurants = (hotelSlug) => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRestaurants = async () => {
    if (!hotelSlug) return;
    setLoading(true);
    try {
      const res = await api.get(`/bookings/restaurants/?hotel_slug=${hotelSlug}`);
      setRestaurants(res.data.results || []);
    } catch (err) {
      setError(err.message || "Failed to fetch restaurants");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, [hotelSlug]);

  return { restaurants, setRestaurants, loading, error, fetchRestaurants };
};

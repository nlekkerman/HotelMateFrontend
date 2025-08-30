// src/hooks/useRestaurantDetail.js
import { useState, useEffect } from "react";
import api from "@/services/api";

export const useRestaurantDetail = (hotelSlug, restaurantSlug) => {
  const [restaurant, setRestaurant] = useState(null);
  const [blueprint, setBlueprint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!hotelSlug || !restaurantSlug) return;

    const fetchRestaurantDetail = async () => {
      setLoading(true);
      try {
        // Fetch restaurant by slug
        const res = await api.get(`/bookings/restaurants/${restaurantSlug}/`);
        setRestaurant(res.data);

        // Fetch blueprint for this restaurant
        const bpRes = await api.get(`/bookings/${hotelSlug}/${restaurantSlug}/blueprint/`);
        setBlueprint(bpRes.data.results?.[0] || null);
      } catch (err) {
        console.error("Error fetching restaurant detail:", err);
        setError(err.response?.data?.detail || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurantDetail();
  }, [hotelSlug, restaurantSlug]);

  return { restaurant, blueprint, loading, error };
};

import { useState, useEffect } from "react";
import api from "@/services/api";

export const useRestaurants = (hotelSlug) => {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchRestaurants = async () => {
    if (!hotelSlug) {
      console.warn("⚠️ No hotelSlug provided to fetchRestaurants");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Use staff hotel-scoped endpoint for restaurant management
      const endpoint = `/staff/hotel/${hotelSlug}/service-bookings/restaurants/`;
      
      const res = await api.get(endpoint);
      
      // Handle both array and paginated responses
      let data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      
      // CLIENT-SIDE FILTERING: Filter restaurants by hotel_slug
      // This is a workaround for backend not filtering correctly
      const filteredData = data.filter(restaurant => {
        const matches = restaurant.hotel_slug === hotelSlug;
        if (!matches) {
          console.warn(`⚠️ Filtering out restaurant "${restaurant.name}" - hotel_slug: "${restaurant.hotel_slug}" (expected: "${hotelSlug}")`);
        }
        return matches;
      });
      
      setRestaurants(filteredData);
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || "Failed to fetch restaurants";
      setError(errorMessage);
      console.error("❌ Error fetching restaurants:", err);
      console.error("Response data:", err.response?.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, [hotelSlug]);

  return { restaurants, setRestaurants, loading, error, fetchRestaurants };
};

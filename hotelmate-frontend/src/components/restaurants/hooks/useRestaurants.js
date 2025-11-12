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
      // Use hotel-scoped endpoint as per RESTAURANT_API_GUIDE.md
      const endpoint = `/bookings/${hotelSlug}/restaurants/`;
      console.log("🔍 Fetching restaurants from:", endpoint);
      console.log("📍 Hotel Slug:", hotelSlug);
      
      const res = await api.get(endpoint);
      
      console.log("✅ API Response:", res.data);
      console.log("📊 Number of restaurants:", Array.isArray(res.data) ? res.data.length : res.data.results?.length || 0);
      
      // Handle both array and paginated responses
      let data = Array.isArray(res.data) ? res.data : (res.data.results || []);
      
      // Log hotel_slug for each restaurant to verify filtering
      console.log("🔍 Before filtering - Total restaurants:", data.length);
      data.forEach((restaurant, index) => {
        console.log(`Restaurant ${index + 1}:`, {
          name: restaurant.name,
          hotel_slug: restaurant.hotel_slug,
          hotel: restaurant.hotel
        });
      });
      
      // CLIENT-SIDE FILTERING: Filter restaurants by hotel_slug
      // This is a workaround for backend not filtering correctly
      const filteredData = data.filter(restaurant => {
        const matches = restaurant.hotel_slug === hotelSlug;
        if (!matches) {
          console.warn(`⚠️ Filtering out restaurant "${restaurant.name}" - hotel_slug: "${restaurant.hotel_slug}" (expected: "${hotelSlug}")`);
        }
        return matches;
      });
      
      console.log(`✅ After filtering - Restaurants for ${hotelSlug}:`, filteredData.length);
      
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

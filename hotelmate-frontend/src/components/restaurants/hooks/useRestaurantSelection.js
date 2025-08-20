import { useState, useEffect } from "react";
import { useRestaurants } from "@/components/restaurants/hooks/useRestaurants";

export const useRestaurantSelection = (hotelSlug) => {
  const { restaurants, fetchRestaurants, loading, error } = useRestaurants(hotelSlug);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);

  const selectRestaurant = (restaurant) => {
    setSelectedRestaurant(restaurant);
  };

  useEffect(() => {
    if (hotelSlug) {
      fetchRestaurants();
    }
  }, [hotelSlug]);



  return {
    restaurants,
    loading,
    error,
    selectedRestaurant,
    selectRestaurant,
  };
};

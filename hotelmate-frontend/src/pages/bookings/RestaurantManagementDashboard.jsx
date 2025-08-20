import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/context/AuthContext";
import { useRestaurantSelection } from "@/components/restaurants/hooks/useRestaurantSelection";
import RestaurantList from "@/components/restaurants/RestaurantList";

const RestaurantManagementDashboard = () => {
  const { user } = useAuth();
  const hotelSlug = user?.hotel_slug;
  const navigate = useNavigate();

  const {
    restaurants,
    loading,
    error,
    selectedRestaurant,
    selectRestaurant,
  } = useRestaurantSelection(hotelSlug);

  if (!hotelSlug) return <p>Loading user hotel info...</p>;

  const handleRestaurantClick = (restaurant) => {
    selectRestaurant(restaurant); // optional highlight
    navigate(`/hotels/${hotelSlug}/restaurants/${restaurant.slug}`);
  };

  return (
    <div className="container my-4">
      <h1 className="mb-4">Restaurant Management</h1>

      {loading && <div className="alert alert-info">Loading restaurants...</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="row">
        <div className="col-md-12">
          <RestaurantList
            restaurants={restaurants}
            selectedRestaurant={selectedRestaurant}
            onSelect={handleRestaurantClick}
          />
        </div>
      </div>
    </div>
  );
};

export default RestaurantManagementDashboard;

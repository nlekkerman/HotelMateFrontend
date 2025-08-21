import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { useParams } from "react-router-dom";
import api from "@/services/api";
import BlueprintFloorEditor from "@/components/restaurants/tables/BlueprintFloorEditor"; // <-- updated import

const Restaurant = () => {
  const { hotelSlug, restaurantSlug } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [blueprint, setBlueprint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError("");
      try {
        const restaurantRes = await api.get(`/bookings/restaurants/${restaurantSlug}/`);
        setRestaurant(restaurantRes.data);

        const blueprintRes = await api.get(
          `/bookings/${hotelSlug}/${restaurantSlug}/blueprint/`
        );
        setBlueprint(blueprintRes.data.results?.[0] || null);
      } catch (err) {
        setError(err.response?.data?.detail || err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [hotelSlug, restaurantSlug]);

  if (loading) return <p>Loading restaurant...</p>;
  if (error) return <p className="text-danger">{error}</p>;
  if (!restaurant) return <p>Restaurant not found.</p>;

  return (
    <div className="container my-4">
      <h1>{restaurant.name}</h1>
      <p><strong>Capacity:</strong> {restaurant.capacity}</p>
      <p><strong>Hours:</strong> {restaurant.opening_time} - {restaurant.closing_time}</p>
      {restaurant.description && <p><strong>Description:</strong> {restaurant.description}</p>}
      <p><strong>Active:</strong> {restaurant.is_active ? "Yes" : "No"}</p>

      {blueprint ? (
        <div className="blueprint-container">
          <BlueprintFloorEditor
            hotelSlug={hotelSlug}
            restaurantSlug={restaurantSlug}
            restaurantId={restaurant.id}
            blueprint={blueprint}
          />
        </div>
      ) : (
        <p>No blueprint available for this restaurant.</p>
      )}
    </div>
  );
};

export default Restaurant;

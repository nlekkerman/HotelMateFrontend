import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useRestaurantDetail } from "@/components/restaurants/hooks/useRestaurantDetail";
import { useEditRestaurant } from "@/components/restaurants/hooks/useEditRestaurant";
import RestaurantEditModal from "@/components/restaurants/modals/RestaurantEditModal";
import BlueprintFloorEditor from "@/components/restaurants/tables/BlueprintFloorEditor";
import { FaEdit } from "react-icons/fa";

const Restaurant = () => {
  const { hotelSlug, restaurantSlug } = useParams();
  const { restaurant: fetchedRestaurant, blueprint, loading, error } =
    useRestaurantDetail(hotelSlug, restaurantSlug);

  const { formData, handleChange, saveRestaurant, saving, error: saveError } =
    useEditRestaurant(restaurantSlug, fetchedRestaurant || {});

  const [restaurant, setRestaurant] = useState(fetchedRestaurant);
  const [showModal, setShowModal] = useState(false);
  const [currentField, setCurrentField] = useState(null);
  const [showBlueprint, setShowBlueprint] = useState(false);

  useEffect(() => {
    setRestaurant(fetchedRestaurant);
  }, [fetchedRestaurant]);

  const handleEditClick = (fieldKey) => {
    setCurrentField(fieldKey);
    setShowModal(true);
  };

  const handleSave = async () => {
    const result = await saveRestaurant();
    if (result.success) {
      setRestaurant((prev) => ({
        ...prev,
        [currentField]: formData[currentField],
      }));
      setShowModal(false);
      setCurrentField(null);
    } else {
      alert(result.error?.message || "Save failed!");
    }
  };

  if (loading) return <p>Loading restaurant...</p>;
  if (error) return <p className="text-danger">{error}</p>;
  if (!restaurant) return <p>Restaurant not found.</p>;

  const fields = [
    { label: "Capacity", key: "capacity" },
    { label: "Opening Time", key: "opening_time" },
    { label: "Closing Time", key: "closing_time" },
    { label: "Taking Bookings", key: "taking_bookings" }, // boolean
    { label: "Max Bookings per Hour", key: "max_bookings_per_hour" },
    { label: "Max Group Size", key: "max_group_size" },
  ];

  return (
    <div className="container my-4">
      <h1 className="mb-4 text-center">{restaurant.name}</h1>

      <div className="row row-cols-1 row-cols-md-2 g-3">
        {fields.map(({ label, key }) => (
          <div key={key} className="col">
            <div className="card shadow-sm h-100">
              <div className="card-body d-flex justify-content-between align-items-center">
                <span>
                  <strong>{label}:</strong>{" "}
                  {typeof restaurant[key] === "boolean"
                    ? restaurant[key] ? "Yes" : "No"
                    : restaurant[key]}
                </span>

                {/* Always show edit icon */}
                <FaEdit
                  className="text-primary"
                  style={{ cursor: "pointer" }}
                  onClick={() => handleEditClick(key)}
                  title={`Edit ${label}`}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Blueprint Toggle */}
      {blueprint && (
        <div className="text-center my-3">
          <button
            className="btn btn-outline-secondary"
            onClick={() => setShowBlueprint((prev) => !prev)}
          >
            {showBlueprint ? "Hide Blueprint" : "Show Blueprint"}
          </button>
        </div>
      )}

      {showBlueprint && blueprint && (
        <div className="mt-3 border rounded p-3">
          <BlueprintFloorEditor
            hotelSlug={hotelSlug}
            restaurantSlug={restaurantSlug}
            restaurantId={restaurant.id}
            blueprint={blueprint}
          />
        </div>
      )}

      {/* Generic modal for single-field edit */}
      {currentField && (
        <RestaurantEditModal
          show={showModal}
          onClose={() => setShowModal(false)}
          fieldKey={currentField}
          label={fields.find((f) => f.key === currentField).label}
          value={formData[currentField]}
          handleChange={handleChange}
          onSave={handleSave}
          saving={saving}
          error={saveError}
        />
      )}
    </div>
  );
};

export default Restaurant;

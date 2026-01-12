import { useState } from "react";
import api from "@/services/api";

export const useEditRestaurant = (hotelSlug, restaurantSlug, initialData = {}) => {
  const [formData, setFormData] = useState(initialData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const saveRestaurant = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await api.patch(`/staff/hotel/${hotelSlug}/service-bookings/restaurants/${restaurantSlug}/`, formData);
      setSaving(false);
      return { success: true, data: res.data };
    } catch (err) {
      setError(err.response?.data?.detail || err.message);
      setSaving(false);
      return { success: false, error: err };
    }
  };

  return {
    formData,
    setFormData,
    handleChange,
    saveRestaurant,
    saving,
    error,
  };
};

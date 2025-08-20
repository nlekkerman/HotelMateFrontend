import { useState } from "react";
import api from "@/services/api";

export const useBlueprint = (hotelSlug, restaurantSlug) => {
  const [blueprint, setBlueprint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const log = (...args) => console.log("[useBlueprint]", ...args);

  // Helper: fetch restaurant ID by slug
  const getRestaurantIdBySlug = async (slug) => {
    if (!slug) return null;
    try {
      const res = await api.get(`/restaurants/${slug}/`);
      return res.data.id;
    } catch (err) {
      log("Failed to fetch restaurant ID for slug", slug, err.response?.data || err.message);
      setError(err.response?.data || err.message);
      return null;
    }
  };

  // Fetch existing blueprint
  const fetchBlueprint = async () => {
    if (!hotelSlug || !restaurantSlug) {
      log("fetchBlueprint aborted: missing hotelSlug or restaurantSlug", { hotelSlug, restaurantSlug });
      return;
    }

    setLoading(true);
    try {
      log("Fetching blueprint for", hotelSlug, restaurantSlug);
      const res = await api.get(`/bookings/${hotelSlug}/${restaurantSlug}/blueprint/`);
      log("Fetch successful, response:", res.data);
      setBlueprint(res.data.results[0] || null);
    } catch (err) {
      const errData = err.response?.data || err.message;
      log("Fetch failed:", errData);
      setError(errData);
    } finally {
      setLoading(false);
    }
  };

  // Create blueprint with automatic slug -> ID resolution
  const createBlueprint = async (data, restaurant) => {
  const slug = restaurant?.slug || restaurantSlug;
  if (!hotelSlug || !slug) {
    console.error("[createBlueprint] Missing hotelSlug or restaurant slug", { hotelSlug, slug, restaurant });
    return alert("Select a valid restaurant");
  }

  const restaurantId = restaurant?.id || await getRestaurantIdBySlug(slug);
  if (!restaurantId) {
    console.error("[createBlueprint] Could not resolve restaurant ID for slug", slug);
    return alert("Could not resolve restaurant ID from slug.");
  }

  const formData = new FormData();
  formData.append("width", data.width);
  formData.append("height", data.height);
  formData.append("grid_size", data.grid_size);
  if (data.areas) formData.append("areas", JSON.stringify(data.areas));

  if (data.background_image) {
    if (data.background_image instanceof File || data.background_image instanceof Blob) {
      console.log("[createBlueprint] Attaching background image", data.background_image);
      formData.append("background_image", data.background_image);
    } else {
      console.warn("[createBlueprint] background_image is not a File/Blob", data.background_image);
    }
  } else {
    console.log("[createBlueprint] No background image provided");
  }

  try {
    console.log("[createBlueprint] Sending FormData to API", formData);
    const res = await api.post(
      `/bookings/${hotelSlug}/${slug}/blueprint/`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    );
    console.log("[createBlueprint] Blueprint creation successful", res.data);
    setBlueprint(res.data);
  } catch (err) {
    const errData = err.response?.data || err.message;
    console.error("[createBlueprint] Blueprint creation failed", errData);
    alert("Error creating blueprint. Check console for details.");
  }
};


  // Update existing blueprint
  const updateBlueprint = async (data) => {
    if (!blueprint) {
      log("updateBlueprint aborted: no blueprint loaded");
      return;
    }

    try {
      log("Updating blueprint", blueprint.id, "with data:", data);
      const res = await api.put(`/bookings/${hotelSlug}/${restaurantSlug}/blueprint/${blueprint.id}/`, data);
      log("Blueprint update successful:", res.data);
      setBlueprint(res.data);
    } catch (err) {
      const errData = err.response?.data || err.message;
      log("Blueprint update failed:", errData);
      alert("Error updating blueprint. Check console for details.");
    }
  };

  // Delete blueprint
  const deleteBlueprint = async () => {
    if (!blueprint) {
      log("deleteBlueprint aborted: no blueprint loaded");
      return;
    }

    try {
      log("Deleting blueprint", blueprint.id);
      await api.delete(`/bookings/${hotelSlug}/${restaurantSlug}/blueprint/${blueprint.id}/`);
      log("Blueprint deleted successfully");
      setBlueprint(null);
    } catch (err) {
      const errData = err.response?.data || err.message;
      log("Blueprint deletion failed:", errData);
      alert("Error deleting blueprint. Check console for details.");
    }
  };

  return {
    blueprint,
    loading,
    error,
    fetchBlueprint,
    createBlueprint,
    updateBlueprint,
    deleteBlueprint,
  };
};

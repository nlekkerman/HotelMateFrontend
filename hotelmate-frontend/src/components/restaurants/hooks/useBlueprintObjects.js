import { useState, useEffect } from "react";
import api from "@/services/api";

export function useBlueprintObjects(hotelSlug, restaurantSlug, blueprintId) {
  const [objects, setObjects] = useState([]);
  const [objectTypes, setObjectTypes] = useState([]);
  const [loadingObjects, setLoadingObjects] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [error, setError] = useState(null);

  const baseUrl = blueprintId
    ? `/staff/hotel/${hotelSlug}/service-bookings/${restaurantSlug}/blueprint/${blueprintId}/objects/`
    : null;

  // ✅ Always run effect, but guard inside
  useEffect(() => {
  if (!baseUrl) return;
  console.log("Fetching objects from:", baseUrl);
  api.get(baseUrl)
    .then(res => {
      console.log("Fetched objects:", res.data);
      setObjects(res.data.results || []); // <-- use results array
    })
    .catch(err => console.error("Error fetching blueprint objects:", err));
}, [baseUrl]);

  // ✅ Always run effect
  useEffect(() => {
    setLoadingTypes(true);
    api
      .get(`/bookings/blueprint-object-types/`)
      .then((res) => {
        const types = Array.isArray(res.data)
          ? res.data
          : res.data.results || [];
        setObjectTypes(types);
      })
      .catch((err) => console.error("Failed to fetch object types:", err))
      .finally(() => setLoadingTypes(false));
  }, []);

 // inside useBlueprintObjects.js
const createObject = async (obj) => {
  try {
    // 1. Send object to backend
    const response = await api.post(`/staff/hotel/${hotelSlug}/service-bookings/${restaurantSlug}/blueprint/${blueprintId}/objects/`, obj);
    const savedObject = response.data; // backend should return the object with id

    // 2. Update local state
    setObjects((prev) => [...prev, savedObject]);
    console.log("Object saved and added:", savedObject);
  } catch (err) {
    console.error("Failed to create object", err);
  }
};

const deleteObject = async (objectId) => {
  try {
    // 1. Send DELETE request to backend
    await api.delete(
      `/staff/hotel/${hotelSlug}/service-bookings/${restaurantSlug}/blueprint/${blueprintId}/objects/${objectId}/`
    );

    // 2. Remove the object from local state
    setObjects((prev) => prev.filter((obj) => obj.id !== objectId));
    console.log("Object deleted:", objectId);
  } catch (err) {
    console.error("Failed to delete object", err);
    setError(err);
  }
};


  const updateObject = async (objectId, payload) => {
  try {
    const res = await api.patch(
      `/staff/hotel/${hotelSlug}/service-bookings/${restaurantSlug}/blueprint/${blueprintId}/objects/${objectId}/`,
      payload
    );
    setObjects((prev) =>
      prev.map((obj) => (obj.id === objectId ? res.data : obj))
    );
    return res.data;
  } catch (err) {
    setError(err);
    throw err;
  }
};


  return {
    objects,
    objectTypes,
    createObject,
    updateObject,
    deleteObject,
    loadingObjects,
    loadingTypes,
    error,
  };
}

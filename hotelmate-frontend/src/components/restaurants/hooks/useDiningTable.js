import { useState, useEffect } from "react";
import api from "@/services/api";

/**
 * Hook for managing dining tables for a specific restaurant blueprint.
 * @param {string} hotelSlug
 * @param {string} restaurantSlug
 */
export function useDiningTable(hotelSlug, restaurantSlug) {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const baseUrl = `/bookings/${hotelSlug}/${restaurantSlug}/tables/`;

  // Fetch tables from backend
const fetchAllTables = async (url = baseUrl, collected = []) => {
  const res = await api.get(url);
  const data = Array.isArray(res.data) ? res.data : res.data.results || [];
  const allTables = [...collected, ...data];
  if (res.data.next) {
    return fetchAllTables(res.data.next, allTables);
  }
  return allTables;
};

const fetchTables = async () => {
  setLoading(true);
  try {
    const allTables = await fetchAllTables();
    console.log("Fetched all tables:", allTables);
    setTables(allTables);
  } catch (err) {
    console.error(err);
  } finally {
    setLoading(false);
  }
};

  // Create a new table and append to state
  const createTable = async (tableData) => {
    setLoading(true);
    try {
      // Ensure shape + geometry are provided
      const defaultData = {
        shape: "RECT",
        width: 100,
        height: 60,
        radius: null,
        rotation: 0,
        x: 0,
        y: 0,
        capacity: 2,
        joinable: true,
        join_group: "",
        is_active: true,
      };
      const payload = { ...defaultData, ...tableData };
      const res = await api.post(baseUrl, payload);
      setTables((prev) => [...prev, res.data]);
      setError(null);
      return res.data;
    } catch (err) {
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Update table position/geometry
  const updateTable = async (tableId, updatedData) => {
    try {
      const res = await api.patch(`${baseUrl}${tableId}/`, updatedData);
      setTables((prev) =>
        prev.map((t) => (t.id === tableId ? res.data : t))
      );
      return res.data;
    } catch (err) {
      setError(err);
      throw err;
    }
  };

  // Delete table
  const deleteTable = async (tableId) => {
    try {
      await api.delete(`${baseUrl}${tableId}/`);
      setTables((prev) => prev.filter((t) => t.id !== tableId));
    } catch (err) {
      setError(err);
      throw err;
    }
  };

  // Initialize
  useEffect(() => {
    fetchTables();
  }, [hotelSlug, restaurantSlug]);

  return {
    tables,
    loading,
    error,
    fetchTables,
    createTable,
    updateTable,
    deleteTable,
  };
}

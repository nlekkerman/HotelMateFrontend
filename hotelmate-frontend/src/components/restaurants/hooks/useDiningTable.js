import { useState, useEffect } from "react";
import api from "@/services/api";

/**
 * Hook for managing dining tables for a specific restaurant.
 * @param {string} hotelSlug
 * @param {string} restaurantSlug
 */
export function useDiningTable(hotelSlug, restaurantSlug) {
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const baseUrl = `/staff/hotel/${hotelSlug}/service-bookings/${restaurantSlug}/tables/`;

  // Fetch tables from backend
  const fetchTables = async () => {
    setLoading(true);
    try {
      const res = await api.get(baseUrl);
      // If the API returns an array directly (no pagination)
      setTables(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error(err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Create a new table
  const createTable = async (tableData) => {
    setLoading(true);
    try {
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
      const res = await api.post(baseUrl, { ...defaultData, ...tableData });
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

  // Update table
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

  // Load tables on mount or when hotel/restaurant changes
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

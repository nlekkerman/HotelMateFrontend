import { useState, useEffect } from "react";
import api from "@/services/api";

export const useStockItems = (hotelSlug) => {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const res = await api.get(`/stock_tracker/${hotelSlug}/categories/`);
      // Backend returns plain array (no pagination)
      setCategories(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching categories:", err);
      setError(err.message);
    }
  };

  // Fetch all items
  const fetchItems = async (categorySlug = null) => {
    setLoading(true);
    setError(null);
    try {
      let url = `/stock_tracker/${hotelSlug}/items/`;
      const params = new URLSearchParams();
      if (categorySlug) params.append('category', categorySlug);
      if (params.toString()) url += `?${params.toString()}`;
      
      const res = await api.get(url);
      // Backend returns plain array (no pagination)
      setItems(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Error fetching items:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Create item
  const createItem = async (itemData) => {
    try {
      console.log('useStockItems - createItem called');
      console.log('Hotel slug:', hotelSlug);
      console.log('URL:', `/stock_tracker/${hotelSlug}/items/`);
      console.log('Data being sent to server:', itemData);
      
      const res = await api.post(`/stock_tracker/${hotelSlug}/items/`, itemData);
      
      console.log('Server response:', res.data);
      setItems([...items, res.data]);
      return res.data;
    } catch (err) {
      console.error("Error creating item:", err);
      console.error("Error response:", err.response?.data);
      throw err;
    }
  };

  // Update item
  const updateItem = async (itemId, itemData) => {
    try {
      const res = await api.patch(`/stock_tracker/${hotelSlug}/items/${itemId}/`, itemData);
      setItems(items.map(item => item.id === itemId ? res.data : item));
      return res.data;
    } catch (err) {
      console.error("Error updating item:", err);
      throw err;
    }
  };

  // Delete item
  const deleteItem = async (itemId) => {
    try {
      await api.delete(`/stock_tracker/${hotelSlug}/items/${itemId}/`);
      setItems(items.filter(item => item.id !== itemId));
    } catch (err) {
      console.error("Error deleting item:", err);
      throw err;
    }
  };

  useEffect(() => {
    if (hotelSlug) {
      fetchCategories();
      fetchItems();
    }
  }, [hotelSlug]);

  return {
    items,
    categories,
    loading,
    error,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
    refetch: fetchItems
  };
};

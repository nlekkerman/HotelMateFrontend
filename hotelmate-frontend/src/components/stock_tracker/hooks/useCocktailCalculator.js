import { useState, useEffect } from "react";
import api from "@/services/api"; // your axios instance

export const useCocktailCalculator = () => {
  const [cocktails, setCocktails] = useState([]);
  const [consumptions, setConsumptions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch all cocktails
  const fetchCocktails = async (hotelSlug) => {
  if (!hotelSlug) return;
  setLoading(true);
  try {
    const res = await api.get(`/stock_tracker/${hotelSlug}/cocktails/`);
    // Handle both paginated (res.data.results) and direct array (res.data) responses
    const cocktailsData = Array.isArray(res.data) ? res.data : (res.data.results || []);
    console.log("Fetched cocktails:", cocktailsData);
    setCocktails(cocktailsData);
  } catch (err) {
    console.error("Error fetching cocktails:", err);
  } finally {
    setLoading(false);
  }
};


  // Create a new cocktail (recipe)
  const createCocktail = async (cocktail, hotelSlug) => {
  if (!hotelSlug) throw new Error("Hotel slug is required");
  try {
    const res = await api.post(`/stock_tracker/${hotelSlug}/cocktails/`, cocktail);
    setCocktails([...cocktails, res.data]); // res.data should be the new cocktail object
    return res.data;
  } catch (err) {
    console.error("Error creating cocktail:", err);
    throw err;
  }
};

  // Log how many cocktails were made
  const logConsumption = async (cocktailId, quantity, hotelSlug) => {
    if (!hotelSlug) throw new Error("Hotel slug is required");
    try {
      const res = await api.post(`/stock_tracker/${hotelSlug}/consumptions/`, {
        cocktail: cocktailId,
        quantity_made: quantity,
      });
      setConsumptions([...consumptions, res.data]);
      return res.data;
    } catch (err) {
      console.error("Error logging consumption:", err);
      throw err;
    }
  };

  // Calculate total ingredient usage from all consumptions
  const calculateTotals = () => {
    const totals = {};
    consumptions.forEach((c) => {
      if (!c.total_ingredient_usage) return;
      Object.entries(c.total_ingredient_usage).forEach(([name, qty]) => {
        totals[name] = (totals[name] || 0) + qty;
      });
    });
    return totals;
  };

  return {
    cocktails,
    consumptions,
    loading,
    fetchCocktails,
    createCocktail,
    logConsumption,
    calculateTotals,
    setCocktails,
    setConsumptions,
  };
};

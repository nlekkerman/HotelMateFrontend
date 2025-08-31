import { useState, useEffect } from "react";
import api from "@/services/api"; // your axios instance

export const useCocktailCalculator = () => {
  const [cocktails, setCocktails] = useState([]);
  const [consumptions, setConsumptions] = useState([]);
  const [loading, setLoading] = useState(false);

  // Fetch all cocktails
  const fetchCocktails = async () => {
  setLoading(true);
  try {
    const res = await api.get("/stock_tracker/cocktails/");
    setCocktails(res.data.results || []); // <--- grab results array
  } catch (err) {
    console.error("Error fetching cocktails:", err);
  } finally {
    setLoading(false);
  }
};


  // Create a new cocktail (recipe)
  const createCocktail = async (cocktail) => {
  try {
    const res = await api.post("/stock_tracker/cocktails/", cocktail);
    setCocktails([...cocktails, res.data]); // res.data should be the new cocktail object
    return res.data;
  } catch (err) {
    console.error("Error creating cocktail:", err);
    throw err;
  }
};

  // Log how many cocktails were made
  const logConsumption = async (cocktailId, quantity) => {
    try {
      const res = await api.post("/stock_tracker/consumptions/", {
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

  useEffect(() => {
    fetchCocktails();
  }, []);

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

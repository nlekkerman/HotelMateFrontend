import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CocktailCalculator } from "@/components/stock_tracker/CocktailCalculator";

export const CocktailsPage = () => {
  const navigate = useNavigate();
  const { hotel_slug } = useParams();

  return (
    <div>
      <div className="container mt-3">
        <button 
          className="btn btn-outline-secondary mb-3" 
          onClick={() => navigate(`/stock_tracker/${hotel_slug}`)}
        >
          <i className="bi bi-arrow-left"></i> Back to Stock Tracker
        </button>
      </div>
      <CocktailCalculator />
    </div>
  );
};

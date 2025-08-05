// src/pages/stock_tracker/StockDashboard.jsx
import React, { useEffect, useState } from "react";
import api from "@/services/api";
import { useParams, useNavigate } from "react-router-dom";

export default function StockDashboard() {
  const { hotel_slug } = useParams();
  const stored = localStorage.getItem("user");
  const user = stored ? JSON.parse(stored) : {};
  const hotel_name = user.hotel_name || "Unknown Hotel";
  const [hotelLogo, setHotelLogo] = useState(null);

  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [catsError, setCatsError] = useState(null);

  useEffect(() => {
    // 1) Define endpoint
    const endpoint = `stock_tracker/${hotel_slug}/stock-categories/`;
    

    api
      .get(endpoint)
      .then((res) => {
        setCategories(res.data.results || []);
      })
      .catch((err) => {
        console.error("[StockDashboard] Failed to load categories:", err);
        setCatsError(err.response?.data || err.message);
      })
      .finally(() => setLoadingCats(false));
  }, [hotel_slug]);

  if (loadingCats) return <p>Loading categories…</p>;
  if (catsError)
    return <p style={{ color: "red" }}>Error: {JSON.stringify(catsError)}</p>;

  return (
    <div>
      {hotelLogo && (
        <div className="text-center mb-4">
          <img
            src={hotelLogo}
            alt={`${hotelName} logo`}
            className="img-fluid rounded-pill mb-3 border shadow-sm"
            style={{
              maxHeight: "100px",
              objectFit: "contain",
            }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        </div>
      )}
      <h1 className="w-100 d-flex mt-5 title-container justify-content-center">
        Stock Dashboard
      </h1>
      <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
        {categories.map((cat) => (
  <div
    key={cat.id} // ✅ Correct placement
    className="button-container d-flex w-100 justify-content-center"
  >
    <button
      onClick={() => {
        navigate(`/stock_tracker/${hotel_slug}/${cat.slug}`);
      }}
      style={{ padding: ".5rem 1rem", cursor: "pointer" }}
      className="text-capitalize custom-button"
    >
      {cat.name}
    </button>
  </div>
))}

      </div>
    </div>
  );
}

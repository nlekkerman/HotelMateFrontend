// src/components/layout/LogoBanner.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import useHotel from "@/hooks/useHotel";

export default function LogoBanner() {
  const { hotelLogo, hotelName } = useHotel();
  const navigate = useNavigate();

  if (!hotelLogo) return null;

  return (
    <div className="hotel-logo-display">
      <img
        className="hotel-logo-main"
        src={hotelLogo}
        alt={`${hotelName || "Hotel"} logo`}
        onClick={() => navigate("/")}
        onError={(e) => {
          console.error("[LogoBanner] image load failed:", hotelLogo);
          e.currentTarget.style.display = "none";
        }}
      />
    </div>
  );
}

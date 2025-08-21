// src/components/layout/LogoBanner.jsx
import React from "react";
import useHotel from "@/hooks/useHotel";

export default function LogoBanner() {
  const { hotelLogo, hotelName } = useHotel();
  if (!hotelLogo) return null;

  return (
    <div className="hotel-logo-banner">
      <img
        className="hotel-logo-image rounded-pill p-2"
        src={hotelLogo}
        alt={`${hotelName || "Hotel"} logo`}
        onError={(e) => {
          console.error("[LogoBanner] image load failed:", hotelLogo);
          e.currentTarget.style.display = "none";
        }}
      />
    </div>
  );
}

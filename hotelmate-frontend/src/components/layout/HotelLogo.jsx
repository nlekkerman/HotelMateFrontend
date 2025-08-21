import React, { useEffect } from "react";
import useHotel from "@/hooks/useHotel";

export default function HotelLogo({ className = "", style = {} }) {
  const { hotelLogo, hotelName } = useHotel();

  // Optional: log for debugging
  useEffect(() => {
    console.log("[HotelLogo] hotelLogo:", hotelLogo, "hotelName:", hotelName);
  }, [hotelLogo, hotelName]);

  const handleImgError = (e) => {
    console.error("[HotelLogo] Image failed to load:", e.currentTarget.src);
    e.currentTarget.style.display = "none"; // hide broken image
  };

  return hotelLogo ? (
    <img
      src={hotelLogo}
      alt={`${hotelName || "Hotel"} logo`}
      onError={handleImgError}
      className={`hotel-logo ${className} main-bg rounded-pill p-2`}
      style={{ maxHeight: "60px", objectFit: "contain", ...style }}
    />
  ) : (
    <div
      className={`hotel-logo-placeholder ${className}`}
      style={{
        display: "inline-block",
        minHeight: "60px",
        minWidth: "60px",
        backgroundColor: "#eee",
        textAlign: "center",
        lineHeight: "60px",
        borderRadius: "8px",
        fontSize: "0.9rem",
        color: "#555",
        ...style,
      }}
    >
      {hotelName || "Hotel"}
    </div>
  );
}

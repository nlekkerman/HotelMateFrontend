import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import useHotel from "@/hooks/useHotel";
import CustomIcon from "@/components/utils/CustomIcon";

export default function HotelLogo({ className = "", style = {}, useHomeIcon = false }) {
  const { hotelLogo, hotelName } = useHotel();
  const navigate = useNavigate();

  // Optional: log for debugging
  useEffect(() => {
    console.log("[HotelLogo] hotelLogo:", hotelLogo, "hotelName:", hotelName);
  }, [hotelLogo, hotelName]);

  const handleImgError = (e) => {
    console.error("[HotelLogo] Image failed to load:", e.currentTarget.src);
    e.currentTarget.style.display = "none"; // hide broken image
  };

  // If useHomeIcon prop is true, use the custom home icon
  if (useHomeIcon) {
    return (
      <CustomIcon
        name="home"
        alt="Home"
        onClick={() => navigate("/")}
        className={`hotel-logo ${className}`}
        style={{ maxHeight: "60px", ...style }}
        size={60}
      />
    );
  }

  return hotelLogo ? (
    <img
      src={hotelLogo}
      alt={`${hotelName || "Hotel"} logo`}
      onError={handleImgError}
      onClick={() => navigate("/")}
      className={`hotel-logo ${className} main-bg rounded-pill p-2`}
      style={{ maxHeight: "60px", objectFit: "contain", cursor: "pointer", ...style }}
    />
  ) : (
    <div
      onClick={() => navigate("/")}
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
        cursor: "pointer",
        ...style,
      }}
    >
      {hotelName || "Hotel"}
    </div>
  );
}

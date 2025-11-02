// src/components/layout/LogoBanner.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import useHotel from "@/hooks/useHotel";

export default function LogoBanner() {
  const { hotelLogo, hotelName } = useHotel();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  if (!hotelLogo) return null;

  return (
    <div className="hotel-logo-banner position-relative">
      <img
        className="hotel-logo-image rounded-pill p-2"
        src={hotelLogo}
        alt={`${hotelName || "Hotel"} logo`}
        onError={(e) => {
          console.error("[LogoBanner] image load failed:", hotelLogo);
          e.currentTarget.style.display = "none";
        }}
      />
      
      {/* Auth buttons in top right corner */}
      <div className="position-absolute top-0 end-0 p-3 d-flex gap-2">
        {!user ? (
          <>
            <button 
              className="btn btn-outline-primary btn-sm"
              onClick={() => navigate("/login")}
            >
              <i className="bi bi-box-arrow-in-right me-1"></i>
              Login
            </button>
            <button 
              className="btn btn-primary btn-sm"
              onClick={() => navigate("/register")}
            >
              <i className="bi bi-person-plus me-1"></i>
              Register
            </button>
          </>
        ) : (
          <button 
            className="btn btn-outline-danger btn-sm"
            onClick={handleLogout}
          >
            <i className="bi bi-box-arrow-right me-1"></i>
            Logout
          </button>
        )}
      </div>
    </div>
  );
}

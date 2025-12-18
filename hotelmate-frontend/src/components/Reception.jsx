import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Search from "@/components/utils/Search";
import api from "@/services/api";
import { useTheme } from "@/context/ThemeContext";



const CLOUDINARY_BASE = "https://res.cloudinary.com/dg0ssec7u/";

const Reception = () => {
  const [hotelName, setHotelName] = useState("HotelMate");
  const [hotelLogo, setHotelLogo] = useState(null);
  const [hotelSlug, setHotelSlug] = useState(null);
  const navigate = useNavigate();

const { mainColor } = useTheme();
  useEffect(() => {
    async function fetchHotelInfo() {
      try {
        const { data } = await api.get("/staff/me/");
        // drill into the hotel object however your API returns it:
        const hotel = data.user?.staff_profile?.hotel;
        if (!hotel) return;

        if (hotel.name) {
          setHotelName(hotel.name);
        }
        if (hotel.slug) {
          setHotelSlug(hotel.slug);
        }
        if (hotel.logo) {
          // if it's already a full URL, use it; otherwise prefix the Cloudinary base
          const url = hotel.logo.startsWith("http")
            ? hotel.logo
            : CLOUDINARY_BASE + hotel.logo;
          setHotelLogo(url);
        }
      } catch (err) {
        console.error("❌ Reception fetch failed:", err);
      }
    }

    fetchHotelInfo();
  }, []);

  return (
    <div className="container py-5">
      <div className={`reception-container p-4 rounded ${
          mainColor ? "main-bg" : "bg-dark"
        }`}>
        <h1 className="mb-4 text-center fw-bold text-white">
          {hotelName} Reception
        </h1>
        <p className="text-center mb-4 fs-5 text-white">
          Manage rooms and guests from the reception dashboard.
        </p>
        <div className="custom-search-input-container p-4 d-flex justify-content-center">
          <Search 
            placeholder="Search rooms by number." 
            apiEndpoint={hotelSlug ? `/staff/hotel/${hotelSlug}/rooms/` : null}
          />
        </div>
      </div>
    </div>
  );
};

export default Reception;

import React, { useEffect, useState } from "react";
import Search from "@/components/utils/Search";
import api from "@/services/api";

const CLOUDINARY_BASE = "https://res.cloudinary.com/dg0ssec7u/";

const Reception = () => {
  const [hotelName, setHotelName] = useState("HotelMate");
  const [hotelLogo, setHotelLogo] = useState(null);

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
      {hotelLogo && (
        <div className="text-center mb-4">
          <img
            src={hotelLogo}
            alt={`${hotelName} logo`}
            className="img-fluid rounded-pill mb-3 border shadow-sm"
            style={{
              maxHeight: "100px",
              objectFit: "contain"
            }}
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        </div>
      )}
      <h1 className="mb-5 text-center fw-bold">{hotelName} Reception</h1>
      <p className="text-center text-secondary mb-5 fs-5">
        Manage rooms and guests from the reception dashboard.
      </p>
      <div className="border rounded p-4 shadow-sm bg-white mb-5">
        <Search placeholder="Search rooms by number, status, etc." />
      </div>
    </div>
  );
};

export default Reception;

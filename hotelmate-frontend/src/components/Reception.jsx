import React, { useEffect, useState } from "react";
import Search from "@/components/utils/Search";
import api from "@/services/api";

const Reception = () => {
  const [hotelName, setHotelName] = useState("HotelMate");

  useEffect(() => {
  async function fetchHotelInfo() {
    try {
      const response = await api.get("/staff/me/");
      console.log("[Reception] API response:", response.data);

      // Correct access path:
      const hotel = response.data.user?.staff_profile?.hotel;
      console.log("[Reception] Hotel object:", hotel);

      if (hotel?.name) {
        setHotelName(hotel.name);
        console.log("[Reception] Hotel name:", hotel.name);
      } else {
        console.warn("[Reception] Hotel name not found in response.");
      }
    } catch (error) {
      console.error("[Reception] Failed to fetch hotel info:", error);
    }
  }

  fetchHotelInfo();
}, []);


  return (
    <div className="container py-5">
      <h1 className="mb-5 text-center fw-bold">🏨<strong> asdasdasd{hotelName}  </strong> Reception</h1>
      <p className="text-center text-secondary mb-5 fs-5">
        Manage rooms and guests from the reception dashboard bro.
      </p>
      <div className="border rounded p-4 shadow-sm bg-white mb-5">
        <Search placeholder="Search rooms by number, status, etc." />
      </div>
    </div>
  );
};

export default Reception;

// src/hooks/useHotel.js
import { useEffect, useState } from "react";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";

export default function useHotel() {
  const { user } = useAuth();
  const [hotelId, setHotelId] = useState(null);
  const [hotel, setHotel] = useState(null);

  useEffect(() => {
    const fetchHotel = async () => {
      if (!user) return;

      try {
        const res = await api.get("/staff/me/");
        const hotelId = res.data.hotel;
        setHotelId(hotelId);

        if (hotelId) {
          const hotelRes = await api.get(`/hotel/hotels/${hotelId}/`);
          setHotel(hotelRes.data);
        }
      } catch (error) {
        console.error("Failed to load hotel data", error);
      }
    };

    fetchHotel();
  }, [user]);

  return { hotelId, hotel };
}

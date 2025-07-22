// src/hooks/useHotel.js
import { useEffect, useState } from "react";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";

const CLOUDINARY_BASE = "https://res.cloudinary.com/dg0ssec7u/";

export default function useHotel() {
  const { user } = useAuth();
  const [hotelId, setHotelId] = useState(null);
  const [hotel, setHotel] = useState(null);

  // new states for name + logo
  const [hotelName, setHotelName] = useState(null);
  const [hotelLogo, setHotelLogo] = useState(null);

  useEffect(() => {
    const fetchHotel = async () => {
      if (!user) return;

      try {
        // 1️⃣ get staff/me → hotel id
        const res = await api.get("/staff/me/");
        const _hotelId = res.data.user?.staff_profile?.hotel?.id;
        setHotelId(_hotelId);

        if (_hotelId) {
          // 2️⃣ get full hotel details
          const hotelRes = await api.get(`/hotel/hotels/${_hotelId}/`);
          const h = hotelRes.data;
          setHotel(h);

          // 3️⃣ pull out name
          if (h.name) {
            setHotelName(h.name);
          }

          // 4️⃣ normalize logo URL (prefix if needed)
          if (h.logo) {
            const url = h.logo.startsWith("http")
              ? h.logo
              : CLOUDINARY_BASE + h.logo;
            setHotelLogo(url);
          }
        }
      } catch (error) {
        console.error("useHotel: failed to load hotel data", error);
      }
    };

    fetchHotel();
  }, [user]);

  return {
    hotelId,
    hotel,
    hotelName,
    hotelLogo,
  };
}

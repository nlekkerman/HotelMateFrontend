import { useEffect, useState } from "react";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";

const CLOUDINARY_BASE = "https://res.cloudinary.com/dg0ssec7u/";

export default function useHotel() {
  const { user } = useAuth();
  const [hotelId, setHotelId] = useState(null);
  const [hotel, setHotel] = useState(null);
  const [hotelName, setHotelName] = useState(null);
  const [hotelLogo, setHotelLogo] = useState(null);

  useEffect(() => {
    const fetchHotel = async () => {
      if (!user?.hotel_slug) return;

      try {
        // ✅ use the hotel slug from the logged-in user
        const res = await api.get(`/staff/hotel/${user.hotel_slug}/me/`);
        const hotelData = res.data.user?.staff_profile?.hotel;

        if (hotelData) {
          setHotelId(hotelData.id);
          setHotel(hotelData);

          if (hotelData.name) setHotelName(hotelData.name);

          if (hotelData.logo) {
            const url = hotelData.logo.startsWith("http")
              ? hotelData.logo
              : CLOUDINARY_BASE + hotelData.logo;
            setHotelLogo(url);
          }
        }
      } catch (error) {
      }
    };

    fetchHotel();
  }, [user]);

  return { hotelId, hotel, hotelName, hotelLogo };
}

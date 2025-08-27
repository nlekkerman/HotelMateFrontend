import { useEffect, useState } from "react";
import api from "@/services/api";

const CLOUDINARY_BASE = "https://res.cloudinary.com/dg0ssec7u/";

export default function useHotelLogo(slug) {
  const [logoUrl, setLogoUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!slug) return;

    const fetchLogo = async () => {
      try {
        // Fetch hotel info using slug (public endpoint)
        const res = await api.get(`/hotels/${slug}/`);
        const hotel = res.data;

        if (hotel?.logo) {
          const url = hotel.logo.startsWith("http")
            ? hotel.logo
            : CLOUDINARY_BASE + hotel.logo;
          setLogoUrl(url);
        }
      } catch (err) {
        console.error("Failed to fetch hotel logo", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogo();
  }, [slug]);

  return { logoUrl, loading, error };
}

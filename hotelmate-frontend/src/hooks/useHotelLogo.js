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
      setLoading(true);
      setError(null);

      try {
        // Call the new public slug endpoint
        const res = await api.get(`/hotel/public/${slug}/`);
        const hotel = res.data;

        if (hotel?.logo_url) {
          const url = hotel.logo_url.startsWith("http")
            ? hotel.logo_url
            : CLOUDINARY_BASE + hotel.logo_url;
          setLogoUrl(url);
        } else {
        }
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogo();
  }, [slug]);

  return { logoUrl, loading, error };
}

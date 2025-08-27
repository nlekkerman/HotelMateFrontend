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
      console.log("[useHotelLogo] Fetching logo for slug:", slug);
      setLoading(true);
      setError(null);

      try {
        // Call the new public slug endpoint
        const res = await api.get(`/hotel/${slug}/`);
        const hotel = res.data;
        console.log("[useHotelLogo] Response data:", hotel);

        if (hotel?.logo) {
          const url = hotel.logo.startsWith("http")
            ? hotel.logo
            : CLOUDINARY_BASE + hotel.logo;
          console.log("[useHotelLogo] Logo URL:", url);
          setLogoUrl(url);
        } else {
          console.log("[useHotelLogo] No logo found for this hotel");
        }
      } catch (err) {
        console.error("[useHotelLogo] Failed to fetch hotel logo:", err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchLogo();
  }, [slug]);

  return { logoUrl, loading, error };
}

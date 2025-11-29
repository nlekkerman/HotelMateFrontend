import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Container, Spinner, Alert, Button } from "react-bootstrap";
import { useAuth } from "@/context/AuthContext";
import GuestHotelHome from "@/sections/GuestHotelHome";
import api from "@/services/api";
import useHotelTheme from "@/hooks/useHotelTheme";
import useHotelRealtime from "@/hooks/useHotelRealtime";

/**
 * HotelPortalPage - Public hotel page for guests
 * Displays hotel information, rooms, amenities, and booking options
 */
const HotelPortalPage = () => {
  const { hotelSlug } = useParams();
  const navigate = useNavigate();
  const { selectHotel, isStaff, user } = useAuth();

  const [hotel, setHotel] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Apply hotel theme from settings
  useHotelTheme(settings);

  // Real-time updates for settings changes
  useHotelRealtime(hotelSlug, (updatedData) => {
    console.log("[HotelPortal] 🔄 Real-time settings update received");
    console.log("[HotelPortal] 📸 Hero image:", updatedData.hero_image_display);
    
    // Update settings state directly from Pusher data
    setSettings(prev => ({
      ...prev,
      ...updatedData
    }));
  });

  useEffect(() => {
    fetchHotelData();
  }, [hotelSlug]);

  const fetchHotelData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log("[HotelPortal] 🔍 Fetching hotel data and settings...");

      // Fetch hotel details from public endpoint with full booking data
      const response = await api.get(`/public/hotel/${hotelSlug}/page/`);

      if (!response.data) {
        throw new Error("Hotel not found");
      }

      console.log("[HotelPortal] ✅ Hotel data received:", response.data);

      // Set hotel data
      setHotel(response.data);
      selectHotel(response.data); // Store in auth context

      // Extract settings/customizable properties from hotel data
      const extractedSettings = {
        hero_image: response.data.hero_image || null,
        hero_image_display: response.data.hero_image_display || null,
        welcome_message: response.data.welcome_message || null,
        gallery: response.data.gallery || [],
        amenities: response.data.amenities || [],
        // Add other settings properties as they exist in the hotel data
        theme_settings: response.data.theme_settings || null,
        custom_css: response.data.custom_css || null,
        primary_color: response.data.primary_color || null,
        secondary_color: response.data.secondary_color || null,
        // Include all hotel data as settings fallback
        ...response.data
      };
      
      console.log("[HotelPortal] 📸 Hero image:", extractedSettings.hero_image_display);
      console.log("[HotelPortal] 💬 Welcome message:", extractedSettings.welcome_message);
      console.log("[HotelPortal] 🖼️ Gallery:", extractedSettings.gallery);
      console.log("[HotelPortal] 🏨 Amenities:", extractedSettings.amenities);
      
      setSettings(extractedSettings);

    } catch (err) {
      console.error("[HotelPortal] ❌ Failed to fetch hotel data:", err);
      console.error("[HotelPortal] Error details:", err.response?.data || err.message);
      
      // More specific error messages based on status code
      if (err.response?.status === 404) {
        setError(`Hotel '${hotelSlug}' not found`);
      } else if (err.response?.status >= 500) {
        setError("Server error - please try again later");
      } else if (err.code === 'ERR_NETWORK') {
        setError("Network error - check your connection");
      } else {
        setError("Hotel not found or unavailable");
      }
      
      setSettings(null);
    } finally {
      setLoading(false);
    }
  };

  // Separate function to refresh hotel data (used by GuestHotelHome)
  const fetchHotelDetails = async () => {
    return fetchHotelData();
  };

  // Loading state
  if (loading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status" variant="primary">
          <span className="visually-hidden">Loading hotel...</span>
        </Spinner>
        <p className="text-muted mt-3">Loading hotel information...</p>
      </Container>
    );
  }

  // Error state
  if (error || !hotel) {
    return (
      <Container className="py-5">
        <Alert variant="danger" className="text-center">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error || "Hotel not found"}
        </Alert>
        <div className="text-center mt-4">
          <Link to="/" className="btn btn-primary">
            <i className="bi bi-arrow-left me-2"></i>
            Back to Hotels
          </Link>
        </div>
      </Container>
    );
  }

  return (
    <div className="hotel-portal-page">
      {/* Hotel Header with Navigation */}
      <header className="bg-white shadow-sm py-3 mb-4 sticky-top hotel-portal-header">
        <Container>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            {/* Hotel Info */}
            <div className="d-flex align-items-center gap-2 flex-grow-1 min-width-0">
              <Link
                to="/?view=all"
                className="btn btn-outline-secondary btn-sm flex-shrink-0"
              >
                <i className="bi bi-arrow-left me-1"></i>
                <span className="d-none d-sm-inline">All Hotels</span>
                <span className="d-sm-none">Back</span>
              </Link>
              <div className="min-width-0 flex-grow-1">
                <h5 className="mb-0 fw-bold text-truncate hotel-portal-title">{hotel.name}</h5>
                {(hotel.city || hotel.country) && (
                  <small className="text-muted d-block text-truncate">
                    <i className="bi bi-geo-alt me-1"></i>
                    {hotel.city && hotel.country
                      ? `${hotel.city}, ${hotel.country}`
                      : hotel.city || hotel.country}
                  </small>
                )}
              </div>
            </div>

            {/* View Toggle and Actions */}
            <div className="d-flex align-items-center gap-2 flex-shrink-0">
              {hotel.logo_url && (
                <img
                  src={hotel.logo_url}
                  alt={`${hotel.name} logo`}
                  className="hotel-portal-logo"
                  style={{
                    maxHeight: "40px",
                    maxWidth: "120px",
                    objectFit: "contain",
                  }}
                  onError={(e) => {
                    console.error("Logo failed to load:", hotel.logo_url);
                    e.currentTarget.style.display = "none";
                  }}
                />
              )}

              {/* Back to Staff Feed Button (Staff Only) */}
              {isStaff && user?.hotel_slug === hotelSlug && (
                <Button
                  variant="primary"
                  size="sm"
                  className="hotel-portal-staff-btn"
                  onClick={() => navigate(`/staff/${hotelSlug}/feed`)}
                >
                  <i className="bi bi-arrow-left me-1"></i>
                  <span className="d-none d-md-inline">Back to Staff Feed</span>
                  <span className="d-md-none">Staff</span>
                </Button>
              )}
            </div>
          </div>
        </Container>
      </header>

      {/* Render Public Guest View ONLY */}
      <GuestHotelHome
        hotel={hotel}
        settings={settings}
        editorMode="view"
        canEdit={false}
        user={user}
        onRefreshNeeded={fetchHotelDetails}
      />
    </div>
  );
};

export default HotelPortalPage;

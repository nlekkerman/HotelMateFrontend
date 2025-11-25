import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Container, Spinner, Alert, Button } from 'react-bootstrap';
import { useAuth } from '@/context/AuthContext';
import GuestHotelHome from '@/sections/GuestHotelHome';
import api, { getHotelPublicSettings } from '@/services/api';
import useHotelTheme from '@/hooks/useHotelTheme';

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

  useEffect(() => {
    fetchHotelDetails();
    fetchPublicSettings();
  }, [hotelSlug]);

  const fetchHotelDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch hotel details from public endpoint with full booking data
      const response = await api.get(`/hotel/public/page/${hotelSlug}/`);
      
      if (!response.data) {
        throw new Error('Hotel not found');
      }

      setHotel(response.data);
      selectHotel(response.data); // Store in auth context
    } catch (err) {
      console.error('[HotelPortal] Failed to fetch hotel:', err);
      setError('Hotel not found or unavailable');
    } finally {
      setLoading(false);
    }
  };

  const fetchPublicSettings = async () => {
    try {
      // Fetch public settings for customizable content
      const response = await getHotelPublicSettings(hotelSlug);
      console.log('[HotelPortal] ⭐ Full response object:', response);
      console.log('[HotelPortal] ⭐ Response.data:', response.data);
      console.log('[HotelPortal] Public settings fetched:', response.data);
      console.log('[HotelPortal] Hero image:', response.data?.hero_image);
      console.log('[HotelPortal] Welcome message:', response.data?.welcome_message);
      console.log('[HotelPortal] Gallery:', response.data?.gallery);
      console.log('[HotelPortal] Amenities:', response.data?.amenities);
      
      if (response && response.data) {
        console.log('[HotelPortal] ✅ Setting settings state with:', response.data);
        setSettings(response.data);
      } else {
        console.warn('[HotelPortal] ⚠️ Response or response.data is missing');
        setSettings(null);
      }
    } catch (err) {
      console.error('[HotelPortal] ❌ Failed to fetch public settings:', err);
      console.error('[HotelPortal] Error details:', err.response?.data || err.message);
      // Settings are optional - don't set error, just log it
      // Hotel can still render with default content
      setSettings(null);
    }
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
          {error || 'Hotel not found'}
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
      <header className="bg-white shadow-sm py-3 mb-4 sticky-top">
        <Container>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            {/* Hotel Info */}
            <div className="d-flex align-items-center gap-3">
              <Link to="/?view=all" className="btn btn-outline-secondary btn-sm">
                <i className="bi bi-arrow-left me-1"></i>
                All Hotels
              </Link>
              <div>
                <h5 className="mb-0 fw-bold">{hotel.name}</h5>
                {(hotel.city || hotel.country) && (
                  <small className="text-muted">
                    <i className="bi bi-geo-alt me-1"></i>
                    {hotel.city && hotel.country
                      ? `${hotel.city}, ${hotel.country}`
                      : hotel.city || hotel.country}
                  </small>
                )}
              </div>
            </div>

            {/* View Toggle and Actions */}
            <div className="d-flex align-items-center gap-3">
              {hotel.logo_url && (
                <img
                  src={hotel.logo_url}
                  alt={`${hotel.name} logo`}
                  style={{
                    maxHeight: '40px',
                    maxWidth: '120px',
                    objectFit: 'contain',
                  }}
                  onError={(e) => {
                    console.error('Logo failed to load:', hotel.logo_url);
                    e.currentTarget.style.display = 'none';
                  }}
                />
              )}
              
              {/* Back to Staff Feed Button (Staff Only) */}
              {isStaff && user?.hotel_slug === hotelSlug && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate(`/staff/${hotelSlug}/feed`)}
                >
                  <i className="bi bi-arrow-left me-1"></i>
                  Back to Staff Feed
                </Button>
              )}
            </div>
          </div>
        </Container>
      </header>

      {/* Render Public Guest View ONLY */}
      <GuestHotelHome hotel={hotel} settings={settings} editorMode="view" canEdit={false} user={user} />
    </div>
  );
};

export default HotelPortalPage;

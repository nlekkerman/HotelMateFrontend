import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Container, Spinner, Alert, Button, ButtonGroup } from 'react-bootstrap';
import { useAuth } from '@/context/AuthContext';
import GuestHotelHome from '@/sections/GuestHotelHome';
import StaffHotelHome from '@/sections/StaffHotelHome';
import api from '@/services/api';

/**
 * HotelPortalPage - Main hotel portal that displays guest or staff view
 * Staff can toggle between guest and staff views
 */
const HotelPortalPage = () => {
  const { hotelSlug } = useParams();
  const navigate = useNavigate();
  const { user, isStaff, viewMode, setViewMode, logout, selectHotel } = useAuth();

  const [hotel, setHotel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHotelDetails();
  }, [hotelSlug]);

  const fetchHotelDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch hotel details from public endpoint with full booking data
      const response = await api.get(`/api/hotels/${hotelSlug}/public/`);
      
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

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleViewToggle = (mode) => {
    setViewMode(mode);
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

  // Determine effective view mode (non-staff always see guest view)
  const effectiveViewMode = isStaff ? viewMode : 'guest';

  return (
    <div className="hotel-portal-page">
      {/* Hotel Header with Navigation */}
      <header className="bg-white shadow-sm py-3 mb-4 sticky-top">
        <Container>
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            {/* Hotel Info */}
            <div className="d-flex align-items-center gap-3">
              <Link to="/" className="btn btn-outline-secondary btn-sm">
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
              {/* View Mode Toggle (Staff Only) */}
              {isStaff && (
                <ButtonGroup size="sm">
                  <Button
                    variant={effectiveViewMode === 'guest' ? 'primary' : 'outline-primary'}
                    onClick={() => handleViewToggle('guest')}
                  >
                    <i className="bi bi-person me-1"></i>
                    Guest View
                  </Button>
                  <Button
                    variant={effectiveViewMode === 'staff' ? 'primary' : 'outline-primary'}
                    onClick={() => handleViewToggle('staff')}
                  >
                    <i className="bi bi-person-badge me-1"></i>
                    Staff View
                  </Button>
                </ButtonGroup>
              )}

              {/* Logout (Staff Only) */}
              {isStaff && (
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={handleLogout}
                >
                  <i className="bi bi-box-arrow-right me-1"></i>
                  Logout
                </Button>
              )}
            </div>
          </div>
        </Container>
      </header>

      {/* Render Guest or Staff View */}
      {effectiveViewMode === 'guest' ? (
        <GuestHotelHome hotel={hotel} />
      ) : (
        <StaffHotelHome hotel={hotel} />
      )}
    </div>
  );
};

export default HotelPortalPage;

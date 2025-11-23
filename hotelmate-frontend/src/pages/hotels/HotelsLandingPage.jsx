import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Spinner, Alert, Dropdown } from 'react-bootstrap';
import { useAuth } from '@/context/AuthContext';
import HotelCard from '@/components/hotels/HotelCard';
import { publicAPI } from '@/services/api';

const HotelsLandingPage = () => {
  const { user, isStaff, logout } = useAuth();
  const navigate = useNavigate();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Redirect logged-in staff to staff homepage
  useEffect(() => {
    if (user && isStaff) {
      // Redirect to staff feed with hotel slug if available
      const hotelSlug = user?.hotel_slug;
      if (hotelSlug) {
        navigate(`/staff/${hotelSlug}/feed`, { replace: true });
      } else {
        navigate('/staff/login', { replace: true });
      }
    }
  }, [user, isStaff, navigate]);

  useEffect(() => {
    fetchHotels();
  }, []);

  const fetchHotels = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch hotels from public API endpoint
      const response = await publicAPI.get('/hotel/public/');
      
      // Extract hotels from paginated response
      const hotelsData = response.data.results || response.data;
      
      // Filter only active hotels (if is_active field exists) and sort by sort_order
      const activeHotels = Array.isArray(hotelsData) 
        ? hotelsData
            .filter(hotel => hotel.is_active !== false)
            .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
        : [];
      
      setHotels(activeHotels);
    } catch (err) {
      console.error('[HotelsLanding] Failed to fetch hotels:', err);
      setError('Failed to load hotels. Please try again later.');
      
      // Fallback: If endpoint doesn't exist yet, show empty state
      setHotels([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  return (
    <div className="hotels-landing-page min-vh-100 bg-light">
      {/* Header */}
      <header className="bg-white shadow-sm py-3 mb-4 position-relative" style={{ zIndex: 1060 }}>
        <Container>
          <div className="d-flex justify-content-between align-items-center">
            {/* Brand */}
            <h1 className="mb-0 fw-bold text-primary">
              <i className="bi bi-building me-2"></i>
              HotelsMate
            </h1>

            {/* User Actions */}
            <div className="d-flex align-items-center gap-3">
              {/* Desktop View */}
              {isStaff && user ? (
                <div className="d-none d-md-flex align-items-center gap-3">
                  <span className="text-muted">
                    Welcome, <strong>{user.username}</strong>
                  </span>
                  <button
                    onClick={handleLogout}
                    className="btn btn-outline-secondary btn-sm"
                  >
                    <i className="bi bi-box-arrow-right me-1"></i>
                    Logout
                  </button>
                </div>
              ) : (
                <Link to="/login" className="btn btn-primary btn-sm d-none d-md-inline-flex">
                  <i className="bi bi-person-badge me-1"></i>
                  Staff Login
                </Link>
              )}

              {/* Mobile Hamburger Menu */}
              <div className="d-md-none">
                <button
                  className="btn btn-link text-primary p-0"
                  onClick={() => setMenuOpen(!menuOpen)}
                  style={{ fontSize: '1.8rem', lineHeight: 1 }}
                >
                  <i className="bi bi-list"></i>
                </button>
                
                {menuOpen && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="position-fixed top-0 start-0 w-100 h-100"
                      style={{ zIndex: 1040 }}
                      onClick={() => setMenuOpen(false)}
                    />
                    
                    {/* Menu */}
                    <div
                      className="position-absolute bg-white shadow-lg rounded"
                      style={{
                        top: '100%',
                        right: 0,
                        marginTop: '0.5rem',
                        minWidth: '200px',
                        zIndex: 1050,
                      }}
                    >
                      {isStaff && user ? (
                        <>
                          <div className="px-3 py-2 border-bottom text-muted small">
                            <i className="bi bi-person-circle me-2"></i>
                            {user.username}
                          </div>
                          <button
                            onClick={() => {
                              setMenuOpen(false);
                              handleLogout();
                            }}
                            className="btn btn-link text-decoration-none text-dark w-100 text-start px-3 py-2"
                          >
                            <i className="bi bi-box-arrow-right me-2"></i>
                            Logout
                          </button>
                        </>
                      ) : (
                        <Link
                          to="/login"
                          className="btn btn-link text-decoration-none text-dark w-100 text-start px-3 py-2"
                          onClick={() => setMenuOpen(false)}
                        >
                          <i className="bi bi-person-badge me-2"></i>
                          Staff Login
                        </Link>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </Container>
      </header>

      {/* Main Content */}
      <Container className="py-5">
        <Row className="mb-4">
          <Col>
            <h2 className="text-center fw-bold mb-2">Select Your Hotel</h2>
            <p className="text-center text-muted">
              Choose a hotel to view services, amenities, and information
            </p>
          </Col>
        </Row>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-5">
            <Spinner animation="border" role="status" variant="primary">
              <span className="visually-hidden">Loading hotels...</span>
            </Spinner>
            <p className="text-muted mt-3">Loading hotels...</p>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <Alert variant="danger" className="text-center">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        )}

        {/* Hotels Grid */}
        {!loading && !error && hotels.length > 0 && (
          <Row xs={1} sm={2} md={3} lg={4} className="g-4">
            {hotels.map((hotel) => (
              <Col key={hotel.id}>
                <HotelCard hotel={hotel} />
              </Col>
            ))}
          </Row>
        )}

        {/* Empty State */}
        {!loading && !error && hotels.length === 0 && (
          <div className="text-center py-5">
            <i className="bi bi-building-slash text-muted" style={{ fontSize: '4rem' }}></i>
            <h4 className="mt-3 text-muted">No Hotels Available</h4>
            <p className="text-muted">
              Please check back later or contact support.
            </p>
          </div>
        )}
      </Container>

      {/* Footer */}
      <footer className="bg-white border-top mt-auto py-4">
        <Container>
          <p className="text-center text-muted mb-0">
            &copy; {new Date().getFullYear()} HotelsMate. All rights reserved.
          </p>
        </Container>
      </footer>
    </div>
  );
};

export default HotelsLandingPage;

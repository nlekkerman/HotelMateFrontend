import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Container, Row, Col, Spinner, Alert } from 'react-bootstrap';
import { useAuth } from '@/context/AuthContext';
import HotelCard from '@/components/hotels/HotelCard';
import api from '@/services/api';

const HotelsLandingPage = () => {
  const { user, isStaff, logout } = useAuth();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchHotels();
  }, []);

  const fetchHotels = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to fetch hotels from API
      // Note: This endpoint may need to be created on backend
      const response = await api.get('/hotels/');
      
      // Filter only active hotels and sort by sort_order
      const activeHotels = response.data
        .filter(hotel => hotel.is_active)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      
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
      <header className="bg-white shadow-sm py-3 mb-4">
        <Container>
          <div className="d-flex justify-content-between align-items-center">
            {/* Brand */}
            <h1 className="mb-0 fw-bold text-primary">
              <i className="bi bi-building me-2"></i>
              HotelsMate
            </h1>

            {/* User Actions */}
            <div className="d-flex align-items-center gap-3">
              {isStaff && user ? (
                <>
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
                </>
              ) : (
                <Link to="/staff/login" className="btn btn-primary btn-sm">
                  <i className="bi bi-person-badge me-1"></i>
                  Staff Login
                </Link>
              )}
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

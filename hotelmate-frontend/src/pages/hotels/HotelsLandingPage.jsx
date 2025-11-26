import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Spinner, Alert, Dropdown } from 'react-bootstrap';
import { useAuth } from '@/context/AuthContext';
import HotelCard from '@/components/hotels/HotelCard';
import HotelsFiltersBar from '@/components/hotels/HotelsFiltersBar';
import HotelsList from '@/components/hotels/HotelsList';
import { publicHotelPageAPI } from '@/services/publicApi';
import heroImage from '@/assets/images/landing-page-hero.png';
import logo from '@/assets/images/hotels-logo.png';

const HotelsLandingPage = () => {
  const { user, isStaff, logout } = useAuth();
  const navigate = useNavigate();
  const [hotels, setHotels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState({
    q: '',
    city: '',
    country: '',
    hotel_type: '',
    sort: 'featured',
  });
  
  // Filter options from backend
  const [filterOptions, setFilterOptions] = useState({
    cities: [],
    countries: [],
    hotel_types: [],
  });

  // Redirect logged-in staff to staff feed ONLY if they didn't explicitly want to see all hotels
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const viewAllHotels = urlParams.get('view') === 'all';
    
    if (user && isStaff && !viewAllHotels) {
      // Redirect staff to their feed unless they explicitly want to view all hotels
      const hotelSlug = user?.hotel_slug;
      if (hotelSlug) {
        navigate(`/staff/${hotelSlug}/feed`, { replace: true });
      } else {
        navigate('/staff/login', { replace: true });
      }
    }
  }, [user, isStaff, navigate]);

  // Fetch filter options once on mount
  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // Fetch hotels when filters change
  useEffect(() => {
    console.log('[HotelsLanding] Filters changed:', filters);
    fetchHotels();
  }, [filters]);

  const fetchFilterOptions = async () => {
    try {
      const response = await publicHotelPageAPI.getFilterOptions();
      setFilterOptions({
        cities: response.cities || [],
        countries: response.countries || [],
        hotel_types: response.hotel_types || [],
      });
    } catch (err) {
      console.error('[HotelsLanding] Failed to fetch filter options:', err);
      // Fallback to empty arrays - filters will still work with manual input
    }
  };

  const fetchHotels = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Build query params object from filters
      const params = {};
      if (filters.q) params.q = filters.q;
      if (filters.city) params.city = filters.city;
      if (filters.country) params.country = filters.country;
      if (filters.hotel_type) params.hotel_type = filters.hotel_type;
      if (filters.sort && filters.sort !== 'featured') params.sort_by = filters.sort;
      
      console.log('[HotelsLanding] Fetching hotels with params:', params);
      
      // Fetch hotels from public API endpoint with filters
      const response = await publicHotelPageAPI.getHotels(params);
      
      // Extract hotels from response (backend handles filtering and sorting)
      const hotelsData = response.results || response;
      
      // Set hotels directly - backend does all the filtering and sorting
      const activeHotels = Array.isArray(hotelsData) 
        ? hotelsData.filter(hotel => hotel.is_active !== false)
        : [];
      
      setHotels(activeHotels);
      
    } catch (err) {
      console.error('[HotelsLanding] Failed to fetch hotels:', err);
      setError('Failed to load hotels. Please try again later.');
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
      <header className="bg-white shadow-sm mb-4 position-relative " style={{ zIndex: 1060 }}>
        <Container>
          <div className="position-relative" style={{ padding: '20px' }}>
            {/* Centered Logo */}
            <div className="d-flex justify-content-center">
              <img src={logo} alt="HotelsMate" style={{ height: '120px' }} />
            </div>

            {/* User Actions - Position Absolute Top Right */}
            <div className="position-absolute top-0 end-0 d-flex align-items-center gap-3" style={{ paddingTop: '20px', paddingRight: '20px' }}>
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

      {/* Hero Section */}
      <div 
        className="hero-section" 
        style={{
          backgroundImage: `url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          minHeight: '500px',
          marginBottom: '3rem'
        }}
      />

      {/* Main Content */}
      <Container className="py-4">
        <Row className="mb-4">
          <Col>
            <h2 className="text-center fw-bold mb-2">Select Your Hotel</h2>
            <p className="text-center text-muted">
              Choose a hotel to view services, amenities, and information
            </p>
          </Col>
        </Row>

        {/* Filters Bar - Positioned right below the header */}
        <HotelsFiltersBar
          filters={filters}
          onChange={setFilters}
          cities={filterOptions.cities}
          countries={filterOptions.countries}
          hotelTypes={filterOptions.hotel_types}
        />

        {/* Hotels List with Loading/Error States */}
        <HotelsList hotels={hotels} loading={loading} error={error} />
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

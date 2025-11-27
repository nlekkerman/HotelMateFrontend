import React, { useState, useEffect } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { useNavigate, useParams } from "react-router-dom";
import { Container, Row, Col, Spinner, Alert } from "react-bootstrap";

import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useRestaurantSelection } from "@/components/restaurants/hooks/useRestaurantSelection";
import RestaurantList from "@/components/restaurants/RestaurantList";
import CreateRestaurantModal from "@/components/restaurants/modals/CreateRestaurantModal";
import api from "@/services/api";

const RestaurantManagementDashboard = () => {
  const { user } = useAuth();
  const { mainColor } = useTheme();
  const { hotelSlug: urlHotelSlug } = useParams();
  const hotelSlug = urlHotelSlug || user?.hotel_slug;
  const navigate = useNavigate();
  const [showAddModal, setShowAddModal] = useState(false);

  console.log("🏨 RestaurantManagementDashboard - URL hotelSlug:", urlHotelSlug);
  console.log("🏨 RestaurantManagementDashboard - User hotelSlug:", user?.hotel_slug);
  console.log("🏨 RestaurantManagementDashboard - Final hotelSlug:", hotelSlug);

  const {
    restaurants,
    loading,
    error,
    selectedRestaurant,
    selectRestaurant,
  } = useRestaurantSelection(hotelSlug);

  if (!hotelSlug) {
    return (
      <Container className="mt-5 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading hotel information...</p>
      </Container>
    );
  }

  const handleRestaurantClick = (restaurant) => {
    selectRestaurant(restaurant);
    navigate(`/hotels/${hotelSlug}/restaurants/${restaurant.slug}`);
  };

  const handleAddRestaurant = () => {
    setShowAddModal(true);
  };

  const handleRestaurantCreated = (newRestaurant) => {
    setShowAddModal(false);
    // Refresh the restaurant list to show the new restaurant
    window.location.reload();
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (showAddModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAddModal]);

  return (
    <Container fluid className="py-4" style={{ maxWidth: '1400px' }}>
      {/* Header Section */}
      <Row className="mb-4">
        <Col>
          <div className="d-flex align-items-center justify-content-between">
            <div>
              <h1 className="mb-2 fw-bold" style={{ fontSize: '2.5rem', color: '#2c3e50' }}>
                <i className="bi bi-shop me-3" style={{ color: '#e74c3c' }}></i>
                Restaurant Management
              </h1>
              <p className="text-muted mb-0" style={{ fontSize: '1.1rem' }}>
                Manage your restaurant operations and bookings
              </p>
            </div>
          </div>
        </Col>
      </Row>

      {/* Mobile Quick Actions - Only show to authenticated users */}
      {user && (
        <div 
          className="d-lg-none position-fixed start-0 end-0"
          style={{
            top: "60px",
            zIndex: 1045,
            background: "transparent",
          }}
          >
            <div className="container-fluid contextual-actions-container">
              <div className="d-flex align-items-center justify-content-center gap-2 py-2 px-2 flex-wrap">
              <button className="contextual-action-btn" onClick={() => navigate(`/room_services/${hotelSlug}/orders`)} style={{ color: mainColor || '#3498db', boxShadow: `0 4px 15px ${mainColor ? `${mainColor}66` : 'rgba(52, 152, 219, 0.4)'}` }}>
                <i className="bi bi-receipt-cutoff" style={{ color: mainColor || '#3498db' }} />
                <span className="action-label" style={{ color: mainColor || '#3498db' }}>Room Service</span>
              </button>
              <button className="contextual-action-btn" onClick={() => navigate(`/room_services/${hotelSlug}/breakfast-orders`)} style={{ color: mainColor || '#3498db', boxShadow: `0 4px 15px ${mainColor ? `${mainColor}66` : 'rgba(52, 152, 219, 0.4)'}` }}>
                <i className="bi bi-egg-fried" style={{ color: mainColor || '#3498db' }} />
                <span className="action-label" style={{ color: mainColor || '#3498db' }}>Breakfast</span>
              </button>
              <button className="contextual-action-btn" onClick={() => navigate('/bookings')} style={{ color: mainColor || '#3498db', boxShadow: `0 4px 15px ${mainColor ? `${mainColor}66` : 'rgba(52, 152, 219, 0.4)'}` }}>
                <i className="bi bi-calendar3" style={{ color: mainColor || '#3498db' }} />
                <span className="action-label" style={{ color: mainColor || '#3498db' }}>Bookings</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" size="lg" />
          <p className="mt-3 text-muted">Loading restaurants...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="danger" className="mb-4">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          {error}
        </Alert>
      )}

      {/* Restaurant List */}
      {!loading && !error && (
        <RestaurantList
          restaurants={restaurants}
          selectedRestaurant={selectedRestaurant}
          onSelect={handleRestaurantClick}
          onAddRestaurant={handleAddRestaurant}
        />
      )}

      {/* Create Restaurant Modal */}
      <CreateRestaurantModal
        show={showAddModal}
        toggle={() => setShowAddModal(false)}
        onCreated={handleRestaurantCreated}
        api={api}
        hotelSlug={hotelSlug}
      />
    </Container>
  );
};

export default RestaurantManagementDashboard;

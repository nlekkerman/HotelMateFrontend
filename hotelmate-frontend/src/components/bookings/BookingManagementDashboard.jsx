import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import PrecheckinRequirementsConfig from './PrecheckinRequirementsConfig';
import SurveyRequirementsConfig from './SurveyRequirementsConfig';

/**
 * BookingManagementDashboard - Dashboard component for managing bookings
 * Includes pre-checkin requirements configuration
 */
const BookingManagementDashboard = ({ hotelSlug }) => {
  // Get hotel slug from props or localStorage as fallback
  const getHotelSlug = () => {
    if (hotelSlug) return hotelSlug;
    
    const storedUser = localStorage.getItem("user");
    if (!storedUser) return null;
    
    try {
      const userData = JSON.parse(storedUser);
      return userData.hotel_slug || null;
    } catch {
      return null;
    }
  };

  const currentHotelSlug = getHotelSlug();

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col>
          <h2>Booking Management Dashboard</h2>
          <p className="text-muted">Manage your hotel's booking settings and requirements.</p>
        </Col>
      </Row>
      
      <Row className=' justify-content-center p-1'>
        <Col lg={8}>
          {currentHotelSlug ? (
            <>
              <PrecheckinRequirementsConfig hotelSlug={currentHotelSlug} />
              <div className="mt-4">
                <SurveyRequirementsConfig hotelSlug={currentHotelSlug} />
              </div>
            </>
          ) : (
            <div className="alert alert-warning">
              <i className="bi bi-exclamation-triangle me-2"></i>
              Hotel information not found. Please ensure you are properly logged in.
            </div>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default BookingManagementDashboard;
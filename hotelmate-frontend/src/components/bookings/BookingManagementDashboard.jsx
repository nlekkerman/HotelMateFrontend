import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import PrecheckinRequirementsConfig from './PrecheckinRequirementsConfig';
import SurveyRequirementsConfig from './SurveyRequirementsConfig';
import CancellationPolicyControl from './CancellationPolicyControl';
import ApprovalCutoffConfig from './ApprovalCutoffConfig';
import CheckoutTimeConfig from './CheckoutTimeConfig';
import { useAuth } from '@/context/AuthContext';
import { useCan } from '@/rbac';

/**
 * BookingManagementDashboard - Dashboard component for managing bookings
 * Includes pre-checkin requirements configuration
 */
const BookingManagementDashboard = ({ hotelSlug }) => {
  const { user } = useAuth();
  // Backend RBAC: booking rules/config gated by `bookings.manage_rules`.
  const { can } = useCan();
  const canManageRules = can('bookings', 'manage_rules');
  // Get hotel slug from props or auth context as fallback
  const currentHotelSlug = hotelSlug || user?.hotel_slug || null;

  if (!canManageRules) {
    return (
      <Container fluid className="py-4">
        <Row className="justify-content-center">
          <Col lg={8}>
            <div className="alert alert-warning" role="alert">
              <i className="bi bi-shield-lock me-2"></i>
              You do not have permission to manage booking rules and configuration.
            </div>
          </Col>
        </Row>
      </Container>
    );
  }

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
              <div className="mt-4">
                <CancellationPolicyControl hotelSlug={currentHotelSlug} />
              </div>
              <div className="mt-4">
                <ApprovalCutoffConfig hotelSlug={currentHotelSlug} />
              </div>
              <div className="mt-4">
                <CheckoutTimeConfig hotelSlug={currentHotelSlug} />
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
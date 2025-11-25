import React from 'react';
import { Row, Col, Spinner, Alert } from 'react-bootstrap';
import HotelCard from './HotelCard';

/**
 * HotelsList - Displays grid of hotel cards with loading/error states
 */
const HotelsList = ({ hotels, loading, error }) => {
  // Loading State
  if (loading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" role="status" variant="primary" style={{ width: '3rem', height: '3rem' }}>
          <span className="visually-hidden">Loading hotels...</span>
        </Spinner>
        <p className="text-muted mt-3">Finding the perfect hotels for you...</p>
      </div>
    );
  }

  // Error State
  if (error) {
    return (
      <Alert variant="danger" className="text-center">
        <i className="bi bi-exclamation-triangle me-2"></i>
        {error}
      </Alert>
    );
  }

  // Empty State
  if (!hotels || hotels.length === 0) {
    return (
      <div className="text-center py-5">
        <i className="bi bi-building-slash text-muted" style={{ fontSize: '4rem' }}></i>
        <h4 className="mt-3 text-muted">No Hotels Found</h4>
        <p className="text-muted">
          Try adjusting your filters to see more results.
        </p>
      </div>
    );
  }

  // Hotels Grid
  return (
    <div className="hotels-list">
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <p className="text-muted mb-0">
          <i className="bi bi-building me-1"></i>
          Found <strong>{hotels.length}</strong> hotel{hotels.length !== 1 ? 's' : ''}
        </p>
      </div>
      
      <Row xs={1} sm={2} md={3} lg={4} className="g-4">
        {hotels.map((hotel) => (
          <Col key={hotel.id}>
            <HotelCard hotel={hotel} />
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default HotelsList;

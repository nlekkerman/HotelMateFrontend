import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';

/**
 * GuestHotelHome - Guest view of the hotel portal
 * Displays welcome message and guest-facing features
 */
const GuestHotelHome = ({ hotel }) => {
  if (!hotel) {
    return (
      <Container className="py-5">
        <p className="text-muted">Loading hotel information...</p>
      </Container>
    );
  }

  // Guest features to display
  const guestFeatures = [
    {
      title: 'Room Service',
      description: 'Order food and beverages directly to your room',
      icon: 'receipt-cutoff',
      color: '#28a745',
      // Will be linked in Phase 2
      path: null
    },
    {
      title: 'Breakfast',
      description: 'Pre-order your breakfast for tomorrow',
      icon: 'egg-fried',
      color: '#ffc107',
      path: null
    },
    {
      title: 'Restaurant Bookings',
      description: 'Reserve a table at our restaurants',
      icon: 'calendar-event',
      color: '#17a2b8',
      path: null
    },
    {
      title: 'Hotel Information',
      description: 'Learn about our facilities and services',
      icon: 'info-circle-fill',
      color: '#6f42c1',
      path: `/good_to_know/${hotel.slug}`
    },
    {
      title: 'Games & Entertainment',
      description: 'Play games and participate in tournaments',
      icon: 'controller',
      color: '#fd7e14',
      path: '/games'
    },
    {
      title: 'Requests & Support',
      description: 'Need something? Let us know!',
      icon: 'chat-dots-fill',
      color: '#dc3545',
      path: null
    }
  ];

  return (
    <div className="guest-hotel-home py-5 bg-light min-vh-100">
      <Container>
        {/* Welcome Section */}
        <Row className="mb-5">
          <Col>
            <div className="text-center">
              <h1 className="display-4 fw-bold mb-3">
                Welcome to {hotel.name}
              </h1>
              {hotel.short_description && (
                <p className="lead text-muted mb-4">
                  {hotel.short_description}
                </p>
              )}
              {(hotel.city || hotel.country) && (
                <p className="text-muted">
                  <i className="bi bi-geo-alt-fill me-2"></i>
                  {hotel.city && hotel.country
                    ? `${hotel.city}, ${hotel.country}`
                    : hotel.city || hotel.country}
                </p>
              )}
            </div>
          </Col>
        </Row>

        {/* Guest Services Grid */}
        <Row xs={1} md={2} lg={3} className="g-4 mb-5">
          {guestFeatures.map((feature, index) => (
            <Col key={index}>
              <Card 
                className={`h-100 shadow-sm ${feature.path ? 'hover-shadow-lg cursor-pointer' : 'opacity-75'}`}
                style={{ transition: 'all 0.3s ease' }}
              >
                {feature.path ? (
                  <Link to={feature.path} className="text-decoration-none text-dark">
                    <Card.Body className="text-center p-4">
                      <div
                        className="mb-3"
                        style={{
                          fontSize: '3rem',
                          color: feature.color
                        }}
                      >
                        <i className={`bi bi-${feature.icon}`}></i>
                      </div>
                      <h5 className="fw-bold mb-2">{feature.title}</h5>
                      <p className="text-muted small mb-0">
                        {feature.description}
                      </p>
                    </Card.Body>
                  </Link>
                ) : (
                  <Card.Body className="text-center p-4">
                    <div
                      className="mb-3"
                      style={{
                        fontSize: '3rem',
                        color: feature.color,
                        opacity: 0.5
                      }}
                    >
                      <i className={`bi bi-${feature.icon}`}></i>
                    </div>
                    <h5 className="fw-bold mb-2">{feature.title}</h5>
                    <p className="text-muted small mb-2">
                      {feature.description}
                    </p>
                    <small className="badge bg-secondary">Coming Soon</small>
                  </Card.Body>
                )}
              </Card>
            </Col>
          ))}
        </Row>

        {/* Additional Info */}
        <Row>
          <Col>
            <Card className="bg-primary text-white">
              <Card.Body className="text-center p-4">
                <h4 className="mb-3">
                  <i className="bi bi-wifi me-2"></i>
                  Need Help?
                </h4>
                <p className="mb-0">
                  Contact our reception desk for assistance or any special requests.
                  We're here to make your stay comfortable!
                </p>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default GuestHotelHome;

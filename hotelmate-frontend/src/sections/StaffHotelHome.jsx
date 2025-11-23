import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

/**
 * StaffHotelHome - Staff view of the hotel portal
 * Displays staff dashboard with quick access to management features
 */
const StaffHotelHome = ({ hotel }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!hotel) {
    return (
      <Container className="py-5">
        <p className="text-muted">Loading hotel information...</p>
      </Container>
    );
  }

  const hotelSlug = hotel.slug;

  // Staff dashboard sections
  const staffSections = [
    {
      title: 'Reception',
      description: 'Front desk operations and guest check-in/out',
      icon: 'building',
      color: '#007bff',
      path: '/reception'
    },
    {
      title: 'Rooms Management',
      description: 'View and manage room status',
      icon: 'door-open',
      color: '#28a745',
      path: '/rooms'
    },
    {
      title: 'Guests',
      description: 'Guest directory and information',
      icon: 'people-fill',
      color: '#17a2b8',
      path: `/${hotelSlug}/guests`
    },
    {
      title: 'Staff Management',
      description: 'Staff directory and roster',
      icon: 'person-badge',
      color: '#6f42c1',
      path: `/${hotelSlug}/staff`
    },
    {
      title: 'Roster & Scheduling',
      description: 'Manage staff schedules and attendance',
      icon: 'calendar-week',
      color: '#fd7e14',
      path: `/roster/${hotelSlug}`
    },
    {
      title: 'Restaurant Bookings',
      description: 'Manage table reservations',
      icon: 'calendar3',
      color: '#e83e8c',
      path: '/bookings'
    },
    {
      title: 'Room Service',
      description: 'View and manage room service orders',
      icon: 'receipt-cutoff',
      color: '#20c997',
      path: `/room_services/${hotelSlug}/orders`
    },
    {
      title: 'Restaurants',
      description: 'Restaurant management and menus',
      icon: 'cup-hot',
      color: '#ffc107',
      path: `/hotel-${hotelSlug}/restaurants`
    },
    {
      title: 'Stock Tracker',
      description: 'Inventory and stock management',
      icon: 'box-seam',
      color: '#6c757d',
      path: `/stock_tracker/${hotelSlug}`
    },
    {
      title: 'Hotel Information',
      description: 'Manage guest-facing hotel information',
      icon: 'info-circle-fill',
      color: '#17a2b8',
      path: `/hotel_info/${hotelSlug}`
    },
    {
      title: 'Maintenance',
      description: 'Track and manage maintenance tasks',
      icon: 'tools',
      color: '#dc3545',
      path: '/maintenance'
    },
    {
      title: 'Guest Chat',
      description: 'Communicate with guests',
      icon: 'chat-dots-fill',
      color: '#007bff',
      path: `/hotel/${hotelSlug}/chat`
    }
  ];

  return (
    <div className="staff-hotel-home py-5 bg-light min-vh-100">
      <Container>
        {/* Header */}
        <Row className="mb-5">
          <Col>
            <div className="text-center">
              <h1 className="display-5 fw-bold mb-3">
                <i className="bi bi-building me-3"></i>
                {hotel.name} - Staff Dashboard
              </h1>
              <p className="lead text-muted">
                Welcome back, <strong>{user?.username || 'Staff'}</strong>
              </p>
            </div>
          </Col>
        </Row>

        {/* Quick Stats (Placeholder for future) */}
        <Row className="mb-4">
          <Col md={3}>
            <Card className="bg-primary text-white shadow-sm">
              <Card.Body className="text-center">
                <h2 className="mb-1">--</h2>
                <p className="mb-0 small">Occupied Rooms</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="bg-success text-white shadow-sm">
              <Card.Body className="text-center">
                <h2 className="mb-1">--</h2>
                <p className="mb-0 small">Active Orders</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="bg-warning text-white shadow-sm">
              <Card.Body className="text-center">
                <h2 className="mb-1">--</h2>
                <p className="mb-0 small">Staff On Duty</p>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="bg-info text-white shadow-sm">
              <Card.Body className="text-center">
                <h2 className="mb-1">--</h2>
                <p className="mb-0 small">Today's Bookings</p>
              </Card.Body>
            </Card>
          </Col>
        </Row>

        {/* Staff Modules Grid */}
        <Row xs={1} md={2} lg={3} xl={4} className="g-4">
          {staffSections.map((section, index) => (
            <Col key={index}>
              <Link to={section.path} className="text-decoration-none">
                <Card 
                  className="h-100 shadow-sm hover-shadow-lg"
                  style={{ 
                    transition: 'all 0.3s ease',
                    cursor: 'pointer',
                    borderLeft: `4px solid ${section.color}`
                  }}
                >
                  <Card.Body className="d-flex flex-column align-items-center text-center p-3">
                    <div
                      className="mb-3"
                      style={{
                        fontSize: '2.5rem',
                        color: section.color
                      }}
                    >
                      <i className={`bi bi-${section.icon}`}></i>
                    </div>
                    <h6 className="fw-bold mb-2">{section.title}</h6>
                    <p className="text-muted small mb-0">
                      {section.description}
                    </p>
                  </Card.Body>
                </Card>
              </Link>
            </Col>
          ))}
        </Row>
      </Container>
    </div>
  );
};

export default StaffHotelHome;

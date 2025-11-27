import React from 'react';
import { Container, Row, Col, Card, Button, Badge, Alert } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import '@/styles/sections.css';

/**
 * RoomsSectionView - Public view for rooms section (auto-populated from PMS)
 * Displays all active room types with booking CTAs
 */
const RoomsSectionView = ({ section }) => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const { isStaff } = useAuth();
  const roomTypes = section.room_types || [];

  // Empty state handling
  if (roomTypes.length === 0) {
    // Hide section for public users
    if (!isStaff) {
      return null;
    }
    
    // Show message for staff users
    return (
      <section className="rooms-section-view py-5 bg-light">
        <Container>
          <h2 className="text-center mb-3">{section.name}</h2>
          {section.subtitle && (
            <p className="text-center text-muted mb-5">{section.subtitle}</p>
          )}
          <Alert variant="info" className="text-center" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <i className="bi bi-door-open fs-1 d-block mb-3"></i>
            <h5>No Active Room Types</h5>
            <p className="mb-0">No room types are currently available from the PMS system. Add room types in the PMS settings to display them here.</p>
          </Alert>
        </Container>
      </section>
    );
  }

  const handleBookNow = (roomTypeCode) => {
    navigate(`/hotels/${slug}/book?room_type_code=${roomTypeCode}`);
  };

  return (
    <section className="rooms-section-view py-5 bg-light">
      <Container>
        <h2 className="text-center mb-3">{section.name}</h2>
        {section.subtitle && (
          <p className="text-center text-muted mb-5">{section.subtitle}</p>
        )}
        
        <Row>
          {roomTypes.map((room) => (
            <Col key={room.id} xs={12} md={6} lg={4} className="mb-4">
              <Card className="h-100 shadow-sm hover-lift">
                {room.photo && (
                  <Card.Img 
                    variant="top" 
                    src={room.photo} 
                    alt={room.name}
                    style={{ height: '250px', objectFit: 'cover' }}
                  />
                )}
                <Card.Body className="d-flex flex-column">
                  <Card.Title className="mb-3">{room.name}</Card.Title>
                  
                  {/* Room details */}
                  <div className="mb-3">
                    <div className="d-flex align-items-center mb-2 text-muted">
                      <i className="bi bi-people me-2"></i>
                      <small>Up to {room.max_occupancy} guests</small>
                    </div>
                    {room.bed_setup && (
                      <div className="d-flex align-items-center mb-2 text-muted">
                        <i className="bi bi-moon me-2"></i>
                        <small>{room.bed_setup}</small>
                      </div>
                    )}
                  </div>
                  
                  {/* Description */}
                  {room.short_description && (
                    <Card.Text className="mb-3 text-muted">
                      {room.short_description}
                    </Card.Text>
                  )}
                  
                  {/* Price and availability */}
                  <div className="mt-auto">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                      <div>
                        <small className="text-muted d-block">From</small>
                        <h4 className="mb-0 text-primary">
                          {room.currency || '€'}{room.starting_price_from}
                          <small className="text-muted fs-6"> /night</small>
                        </h4>
                      </div>
                      {room.availability_message && (
                        <Badge bg="warning" text="dark">
                          {room.availability_message}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Book Now button */}
                    <Button 
                      variant="primary" 
                      className="w-100"
                      onClick={() => handleBookNow(room.code)}
                    >
                      <i className="bi bi-calendar-check me-2"></i>
                      Book Now
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>
    </section>
  );
};

export default RoomsSectionView;

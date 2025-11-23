import React from 'react';
import { Container, Row, Col, Card, Button, Badge } from 'react-bootstrap';
import { formatFromPrice } from '@/utils/formatCurrency';

/**
 * RoomTypesSection - Display room types with pricing and booking CTAs
 */
const RoomTypesSection = ({ hotel }) => {
  const roomTypes = hotel?.room_types || [];

  if (roomTypes.length === 0) return null;

  const bookingFallbackUrl = hotel?.booking_options?.primary_cta_url;

  return (
    <section className="room-types-section py-5 bg-white">
      <Container>
        <div className="text-center mb-5">
          <h2 className="display-5 fw-bold mb-2">Rooms & Suites</h2>
          <p className="text-muted">Choose from our selection of comfortable accommodations</p>
        </div>

        <Row xs={1} md={2} lg={3} className="g-4">
          {roomTypes.map((room) => (
            <Col key={room.id}>
              <Card className="h-100 shadow-sm hover-shadow-lg border-0" style={{ transition: 'all 0.3s ease' }}>
                {room.image_url && (
                  <Card.Img
                    variant="top"
                    src={room.image_url}
                    alt={room.name}
                    style={{ height: '200px', objectFit: 'cover' }}
                  />
                )}

                <Card.Body className="d-flex flex-column">
                  <div className="mb-auto">
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <Card.Title className="fw-bold mb-0">{room.name}</Card.Title>
                      {room.availability_message && (
                        <Badge bg="warning" text="dark" className="ms-2">
                          {room.availability_message}
                        </Badge>
                      )}
                    </div>

                    {room.short_description && (
                      <Card.Text className="text-muted mb-3">{room.short_description}</Card.Text>
                    )}

                    <div className="room-details text-muted small mb-3">
                      {room.max_occupancy && (
                        <div className="mb-1">
                          <i className="bi bi-people me-2"></i>
                          Up to {room.max_occupancy} {room.max_occupancy === 1 ? 'guest' : 'guests'}
                        </div>
                      )}
                      {room.bed_setup && (
                        <div>
                          <i className="bi bi-moon me-2"></i>
                          {room.bed_setup}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-top">
                    {room.starting_price_from && (
                      <div className="mb-3">
                        <strong className="text-primary fs-4">
                          {formatFromPrice(room.starting_price_from, room.currency)}
                        </strong>
                      </div>
                    )}

                    <Button
                      variant="primary"
                      className="w-100"
                      href={room.booking_url || bookingFallbackUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      disabled={!room.booking_url && !bookingFallbackUrl}
                    >
                      <i className="bi bi-calendar-check me-2"></i>
                      Book this room
                    </Button>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>

      <style jsx>{`
        .hover-shadow-lg:hover {
          transform: translateY(-5px);
          box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15) !important;
        }
      `}</style>
    </section>
  );
};

export default RoomTypesSection;

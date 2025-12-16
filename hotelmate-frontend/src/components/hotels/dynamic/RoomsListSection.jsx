import React from 'react';
import PropTypes from 'prop-types';
import { Container, Row, Col, Card } from 'react-bootstrap';

const RoomsListSection = ({ element }) => {
  const { title, subtitle, rooms: allRooms = [], settings = {} } = element;
  const { 
    show_price_from = true, 
    show_occupancy = true, 
    columns = 3 
  } = settings;

  // Group rooms by room type and get the one with the lowest price (starting price)
  const uniqueRooms = React.useMemo(() => {
    const roomsByType = {};
    
    allRooms.forEach(room => {
      const key = room.name || room.code;
      const currentPrice = parseFloat(room.starting_price_from || room.price || 0);
      
      if (!roomsByType[key] || currentPrice < parseFloat(roomsByType[key].starting_price_from || roomsByType[key].price || 0)) {
        roomsByType[key] = room;
      }
    });
    
    return Object.values(roomsByType);
  }, [allRooms]);
  
  const rooms = uniqueRooms;

  if (!rooms || rooms.length === 0) {
    return null;
  }

  return (
    <section className="rooms-list-section py-5 bg-light">
      <Container>
        {title && (
          <h2 className="text-center fw-bold mb-2">{title}</h2>
        )}
        
        {subtitle && (
          <p className="text-center text-muted mb-5">{subtitle}</p>
        )}
        
        <Row className={`g-4`}>
          {rooms.map((room) => {
            if (!room.is_active) return null;
            
            return (
              <Col key={room.id} xs={12} md={columns === 2 ? 6 : 4}>
                <Card className="h-100 shadow-sm hover-shadow-lg transition">
                  {room.photo && (
                    <Card.Img 
                      variant="top" 
                      src={room.photo} 
                      alt={room.name}
                      style={{ height: '250px', objectFit: 'cover' }}
                    />
                  )}
                  
                  <Card.Body className="d-flex flex-column">
                    <Card.Title className="fw-bold">{room.name}</Card.Title>
                    
                    {room.short_description && (
                      <Card.Text className="text-muted mb-3">
                        {room.short_description}
                      </Card.Text>
                    )}
                    
                    {room.bed_setup && (
                      <div className="mb-2">
                        <small className="text-muted">
                          <i className="bi bi-moon-stars me-2"></i>
                          {room.bed_setup}
                        </small>
                      </div>
                    )}
                    
                    {show_occupancy && room.max_occupancy && (
                      <div className="mb-2">
                        <small className="text-muted">
                          <i className="bi bi-people me-2"></i>
                          Up to {room.max_occupancy} guests
                        </small>
                      </div>
                    )}
                    
                    {show_price_from && room.starting_price_from && (
                      <div className="mt-auto">
                        <p className="h5 text-primary mb-3">
                          From {room.currency === 'EUR' ? '€' : '$'}{room.starting_price_from}/night
                        </p>
                      </div>
                    )}
                    
                    {room.availability_message && (
                      <small className="badge bg-warning text-dark mb-3">
                        {room.availability_message}
                      </small>
                    )}
                    
                    {room.booking_url && (
                      <a 
                        href={room.booking_url.replace('/public/booking/', '/booking/')} 
                        className="btn btn-primary w-100 mt-auto"
                      >
                        Book Now
                      </a>
                    )}
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      </Container>
    </section>
  );
};

RoomsListSection.propTypes = {
  element: PropTypes.shape({
    title: PropTypes.string,
    subtitle: PropTypes.string,
    rooms: PropTypes.arrayOf(
      PropTypes.shape({
        id: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
        code: PropTypes.string,
        short_description: PropTypes.string,
        max_occupancy: PropTypes.number,
        bed_setup: PropTypes.string,
        photo: PropTypes.string,
        starting_price_from: PropTypes.string,
        currency: PropTypes.string,
        booking_url: PropTypes.string,
        availability_message: PropTypes.string,
        is_active: PropTypes.bool,
      })
    ),
    settings: PropTypes.shape({
      show_price_from: PropTypes.bool,
      show_occupancy: PropTypes.bool,
      columns: PropTypes.number,
    }),
  }).isRequired,
};

export default RoomsListSection;

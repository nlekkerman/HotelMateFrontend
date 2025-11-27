import React from 'react';
import PropTypes from 'prop-types';
import { Card, Button, Badge } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';

/**
 * RoomCard Component
 * Universal room card component that adapts to preset configurations
 * 
 * @param {Object} props - Component props
 * @param {Object} props.room - Room type data
 * @param {Object} props.preset - Room card preset configuration
 */
const RoomCard = ({ room, preset }) => {
  const navigate = useNavigate();
  const { slug } = useParams();
  
  // Extract config with defaults
  const config = preset?.config || {};
  const {
    image_height = '250px',
    layout = 'vertical',
    image_width = '40%',
    show_occupancy = true,
    show_bed_setup = true,
    show_description = true,
    show_price = true,
    show_badge = true,
    button_style = 'primary',
    button_text = 'Book Now',
    button_icon = 'bi-calendar-check',
    hover_effect = 'lift',
    border = false,
    shadow = 'medium',
  } = config;

  // Build CSS classes
  const cardClasses = [
    'room-card',
    'card',
    'h-100',
    
    shadow === 'large' ? 'shadow-lg' : 'shadow-sm',
    hover_effect ? `hover-${hover_effect}` : '',
    layout === 'horizontal' ? 'flex-row' : '',
    border ? 'border' : '',
  ].filter(Boolean).join(' ');

  // Image style
  const imageStyle = layout === 'horizontal' 
    ? { height: '100%', width: image_width, objectFit: 'cover' }
    : { height: image_height, width: '100%', objectFit: 'cover' };

  // Image class
  const imageClass = layout === 'horizontal' ? 'card-img-left' : 'card-img-top';

  const handleBookNow = () => {
    if (room.booking_cta_url) {
      navigate(room.booking_cta_url);
    } else {
      navigate(`/booking/${slug}?room_type_code=${room.code}`);
    }
  };

  return (
    <Card className={cardClasses}>
      {room.photo && (
        <Card.Img 
          variant={layout === 'horizontal' ? undefined : 'top'}
          src={room.photo} 
          alt={room.name}
          className={imageClass}
          style={imageStyle}
        />
      )}
      
      <Card.Body className="d-flex flex-column">
        <Card.Title className="mb-3">{room.name}</Card.Title>
        
        {/* Room Details */}
        {(show_occupancy || show_bed_setup) && (
          <div className="mb-3">
            {show_occupancy && (
              <div className="d-flex align-items-center mb-2 text-muted">
                <i className="bi bi-people me-2"></i>
                <small>Up to {room.max_occupancy} guests</small>
              </div>
            )}
            {show_bed_setup && room.bed_setup && (
              <div className="d-flex align-items-center mb-2 text-muted">
                <i className="bi bi-moon me-2"></i>
                <small>{room.bed_setup}</small>
              </div>
            )}
          </div>
        )}
        
        {/* Description */}
        {show_description && room.short_description && (
          <Card.Text className="mb-3 text-muted">
            {room.short_description}
          </Card.Text>
        )}
        
        {/* Price and CTA */}
        <div className="mt-auto">
          {show_price && (
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <small className="text-muted d-block">From</small>
                <h4 className="mb-0 text-primary">
                  {room.currency || '€'}{room.starting_price_from}
                  <small className="text-muted fs-6"> /night</small>
                </h4>
              </div>
              {show_badge && room.availability_message && (
                <Badge bg="warning" text="dark">
                  {room.availability_message}
                </Badge>
              )}
            </div>
          )}
          
          <Button 
            variant={button_style}
            className={`w-100 room-card-book-button room-card-book-button--${button_style}`}
            onClick={handleBookNow}
          >
            {button_icon && <i className={`bi ${button_icon} me-2`}></i>}
            {button_text}
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

RoomCard.propTypes = {
  room: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    name: PropTypes.string.isRequired,
    photo: PropTypes.string,
    max_occupancy: PropTypes.number,
    bed_setup: PropTypes.string,
    short_description: PropTypes.string,
    starting_price_from: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    currency: PropTypes.string,
    availability_message: PropTypes.string,
    booking_cta_url: PropTypes.string,
    code: PropTypes.string,
  }).isRequired,
  preset: PropTypes.shape({
    key: PropTypes.string,
    name: PropTypes.string,
    config: PropTypes.object,
  }),
};

RoomCard.defaultProps = {
  preset: null,
};

export default RoomCard;

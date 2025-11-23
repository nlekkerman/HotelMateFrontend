import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from 'react-bootstrap';

/**
 * HotelCard - Reusable component for displaying hotel information
 * @param {Object} hotel - Hotel object with id, name, slug, logo_url, city, country, short_description
 */
const HotelCard = ({ hotel }) => {
  // Use logo_url directly from API response
  const logoUrl = hotel.logo_url || hotel.logo;
  const hotelInitials = hotel.name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <Link to={`/h/${hotel.slug}`} className="text-decoration-none">
      <Card className="hotel-card h-100 shadow-sm hover-shadow-lg transition-all">
        <Card.Body className="d-flex flex-column">
          {/* Hotel Logo */}
          <div className="text-center mb-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={hotel.name}
                className="hotel-card-logo"
                style={{
                  maxWidth: '120px',
                  maxHeight: '120px',
                  objectFit: 'contain'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="hotel-card-logo-placeholder"
              style={{
                display: logoUrl ? 'none' : 'flex',
                width: '120px',
                height: '120px',
                margin: '0 auto',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                fontSize: '2.5rem',
                fontWeight: 'bold',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {hotelInitials}
            </div>
          </div>

          {/* Hotel Name */}
          <h5 className="hotel-card-name text-center fw-bold mb-2">
            {hotel.name}
          </h5>

          {/* Location */}
          {(hotel.city || hotel.country) && (
            <p className="text-muted text-center small mb-2">
              <i className="bi bi-geo-alt-fill me-1"></i>
              {hotel.city && hotel.country
                ? `${hotel.city}, ${hotel.country}`
                : hotel.city || hotel.country}
            </p>
          )}

          {/* Short Description */}
          {hotel.short_description && (
            <p className="hotel-card-description text-center text-muted small flex-grow-1">
              {hotel.short_description}
            </p>
          )}

          {/* View Hotel Button */}
          <div className="text-center mt-3">
            <span className="btn btn-primary btn-sm">
              View Hotel <i className="bi bi-arrow-right ms-1"></i>
            </span>
          </div>
        </Card.Body>
      </Card>
    </Link>
  );
};

export default HotelCard;

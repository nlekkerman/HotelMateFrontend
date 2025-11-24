import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

/**
 * HotelCard - Modern magazine-style card for hotel listings
 * Uses theme colors from staff settings
 * @param {Object} hotel - Hotel object with id, name, slug, hero_image_url, logo_url, city, country, short_description
 */
const HotelCard = ({ hotel }) => {
  const logoUrl = hotel.logo_url || hotel.logo;
  const heroImage = hotel.hero_image_url;
  const hotelInitials = hotel.name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <Link to={`/${hotel.slug}`} className="text-decoration-none">
      <motion.div
        className="modern-hotel-card"
        whileHover={{ y: -10 }}
        transition={{ duration: 0.3 }}
      >
        {/* Hotel Image with Logo Overlay */}
        <div className="modern-hotel-card-image">
          {heroImage ? (
            <img
              src={heroImage}
              alt={hotel.name}
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <div
              style={{
                width: '100%',
                height: '100%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '4rem',
                fontWeight: 'bold',
                color: 'white',
              }}
            >
              {hotelInitials}
            </div>
          )}

          {/* Logo Overlay */}
          {logoUrl && heroImage && (
            <img
              src={logoUrl}
              alt={`${hotel.name} logo`}
              className="modern-hotel-logo-overlay"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          )}

          {/* Location Badge */}
          {(hotel.city || hotel.country) && (
            <div className="modern-hotel-location-badge">
              <i className="bi bi-geo-alt-fill"></i>
              {hotel.city && hotel.country
                ? `${hotel.city}, ${hotel.country}`
                : hotel.city || hotel.country}
            </div>
          )}
        </div>

        {/* Hotel Content */}
        <div className="modern-hotel-card-content">
          <h3 className="modern-hotel-name">{hotel.name}</h3>

          {hotel.short_description && (
            <p className="modern-hotel-description">
              {hotel.short_description}
            </p>
          )}

          {/* Explore Button */}
          <button className="modern-hotel-explore-btn">
            <span>Explore Hotel</span>
            <i className="bi bi-arrow-right"></i>
          </button>
        </div>
      </motion.div>
    </Link>
  );
};

export default HotelCard;

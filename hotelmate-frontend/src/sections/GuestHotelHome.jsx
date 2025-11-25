import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import HeroSection from '@/components/hotels/HeroSection';
import RoomTypesSection from '@/components/hotels/RoomTypesSection';
import OffersSection from '@/components/hotels/OffersSection';
import LeisureActivitiesSection from '@/components/hotels/LeisureActivitiesSection';
import LocationContactSection from '@/components/hotels/LocationContactSection';
import GuestPortalStub from '@/components/hotels/GuestPortalStub';
import GallerySection from '@/components/hotels/GallerySection';
import AmenitiesSection from '@/components/hotels/AmenitiesSection';

/**
 * GuestHotelHome - Guest view of the hotel portal
 * Displays public hotel page with booking functionality
 * @param {Object} hotel - Hotel data
 * @param {Object} settings - Public settings data
 * @param {String} editorMode - 'view' or 'edit' mode
 * @param {Boolean} canEdit - Whether user can edit settings
 */
const GuestHotelHome = ({ hotel, settings, editorMode = 'view', canEdit = false }) => {
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
    <div className="guest-hotel-home bg-light min-vh-100">
      {/* Hero Section with Booking CTAs */}
      <HeroSection hotel={hotel} settings={settings} />

      {/* Gallery from Settings */}
      {settings?.gallery && settings.gallery.length > 0 && (
        <GallerySection settings={settings} hotelName={hotel.name} />
      )}

      {/* Room Types with Pricing */}
      <RoomTypesSection hotel={hotel} />

      {/* Special Offers & Packages */}
      <OffersSection hotel={hotel} />

      {/* Amenities from Settings */}
      {settings?.amenities && settings.amenities.length > 0 && (
        <AmenitiesSection settings={settings} />
      )}

      {/* Leisure Activities & Facilities */}
      <LeisureActivitiesSection hotel={hotel} />

      {/* Location & Contact Information */}
      <LocationContactSection hotel={hotel} settings={settings} />

      {/* Legacy Guest Services Section (keep for internal guest features) - HIDDEN FOR NOW */}
      {false && <Container className="py-5">
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
            <Card className="bg-secondary text-white">
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
      </Container>}

      {/* Guest Portal Access Stub */}
      <GuestPortalStub hotel={hotel} />
    </div>
  );
};

export default GuestHotelHome;

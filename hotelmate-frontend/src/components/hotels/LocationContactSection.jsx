import React from 'react';
import { Row, Col } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

/**
 * LocationContactSection - Modern location, contact info, and CTA banner
 * Uses theme colors from staff settings
 */
const LocationContactSection = ({ hotel, settings }) => {
  const navigate = useNavigate();

  if (!hotel) return null;

  const { city, country, address, location, contact, booking_options, name, slug } = hotel;

  // Use settings contact info if available, fallback to hotel data
  const contactEmail = settings?.contact_email || contact?.email;
  const contactPhone = settings?.contact_phone || contact?.phone;
  const contactAddress = settings?.contact_address || formatAddress();

  function formatAddress() {
    if (!address) return null;
    return [
      address.street,
      address.street_2,
      `${address.postal_code || ''} ${city || ''}`.trim(),
      country,
    ]
      .filter(Boolean)
      .join(', ');
  }

  const getGoogleMapsUrl = () => {
    if (location?.latitude && location?.longitude) {
      return `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
    }
    return null;
  };

  const bookingLabel = booking_options?.primary_cta_label || 'Book Your Stay';

  const handleBookNow = () => {
    navigate(`/${slug}/book`);
  };

  return (
    <section className="modern-location-section">
      <div className="section-container">
        {/* Location & Contact Grid */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <Row className="g-4 mb-5">
            {/* Location Info */}
            <Col lg={6}>
              <div className="mb-4">
                <h3 className="section-heading mb-4">
                  <i className="bi bi-geo-alt me-2" style={{ color: 'var(--main-color, #3498db)' }}></i>
                  Location
                </h3>

                {(city || country) && (
                  <h5 className="mb-3 fw-bold" style={{ color: 'var(--text-dark, #1a202c)' }}>
                    {city}
                    {city && country && ', '}
                    {country}
                  </h5>
                )}

                {contactAddress && (
                  <p className="body-large mb-4" style={{ color: 'var(--text-gray, #4a5568)' }}>
                    {contactAddress}
                  </p>
                )}

                {getGoogleMapsUrl() && (
                  <a
                    href={getGoogleMapsUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hero-btn-secondary"
                    style={{ display: 'inline-flex', border: '2px solid var(--main-color, #3498db)', color: 'var(--main-color, #3498db)', background: 'transparent' }}
                  >
                    <i className="bi bi-map"></i>
                    View on Map
                  </a>
                )}
              </div>
            </Col>

            {/* Contact Cards */}
            <Col lg={6}>
              <h3 className="section-heading mb-4">
                <i className="bi bi-telephone me-2" style={{ color: 'var(--main-color, #3498db)' }}></i>
                Get in Touch
              </h3>

              <Row className="g-3">
                {contactPhone && (
                  <Col md={6}>
                    <motion.a
                      href={`tel:${contactPhone}`}
                      className="modern-contact-card text-decoration-none"
                      whileHover={{ y: -5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="modern-contact-icon">
                        <i className="bi bi-telephone-fill"></i>
                      </div>
                      <div className="modern-contact-title">Phone</div>
                      <div className="modern-contact-value">{contactPhone}</div>
                    </motion.a>
                  </Col>
                )}

                {contactEmail && (
                  <Col md={6}>
                    <motion.a
                      href={`mailto:${contactEmail}`}
                      className="modern-contact-card text-decoration-none"
                      whileHover={{ y: -5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="modern-contact-icon">
                        <i className="bi bi-envelope-fill"></i>
                      </div>
                      <div className="modern-contact-title">Email</div>
                      <div className="modern-contact-value" style={{ fontSize: '0.95rem' }}>
                        {contactEmail}
                      </div>
                    </motion.a>
                  </Col>
                )}

                {contact?.website_url && (
                  <Col md={12}>
                    <motion.a
                      href={contact.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="modern-contact-card text-decoration-none"
                      whileHover={{ y: -5 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="modern-contact-icon">
                        <i className="bi bi-globe"></i>
                      </div>
                      <div className="modern-contact-title">Website</div>
                      <div className="modern-contact-value">
                        Visit our website <i className="bi bi-box-arrow-up-right ms-2"></i>
                      </div>
                    </motion.a>
                  </Col>
                )}
              </Row>
            </Col>
          </Row>
        </motion.div>

        {/* Modern CTA Banner */}
        <motion.div
          className="modern-cta-banner"
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h3>Ready to experience {name}?</h3>
          <p>Book your stay today and enjoy our exceptional hospitality</p>
          <button className="modern-cta-btn" onClick={handleBookNow}>
            <i className="bi bi-calendar-check"></i>
            {bookingLabel}
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default LocationContactSection;

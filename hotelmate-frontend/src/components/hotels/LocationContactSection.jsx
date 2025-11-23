import React from 'react';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';

/**
 * LocationContactSection - Display location, contact info, and footer booking CTA
 */
const LocationContactSection = ({ hotel }) => {
  if (!hotel) return null;

  const { city, country, address, location, contact, booking_options, name } = hotel;

  const getGoogleMapsUrl = () => {
    if (location?.latitude && location?.longitude) {
      return `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
    }
    return null;
  };

  const formatAddress = () => {
    if (!address) return null;
    return [
      address.street,
      address.street_2,
      `${address.postal_code || ''} ${city || ''}`.trim(),
      country,
    ]
      .filter(Boolean)
      .join(', ');
  };

  const bookingUrl = booking_options?.primary_cta_url || contact?.booking_url;
  const bookingLabel = booking_options?.primary_cta_label || 'Book Your Stay';

  return (
    <section className="location-contact-section py-5" style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%)' }}>
      <Container>
        {/* Location & Contact */}
        <Row className="mb-5">
          <Col lg={6} className="mb-4 mb-lg-0">
            <h3 className="mb-4">
              <i className="bi bi-geo-alt me-2 text-primary"></i>
              Location
            </h3>

            {(city || country) && (
              <h5 className="mb-3 fw-bold">
                {city}
                {city && country && ', '}
                {country}
              </h5>
            )}

            {formatAddress() && <p className="text-muted mb-3">{formatAddress()}</p>}

            {getGoogleMapsUrl() && (
              <Button variant="outline-primary" href={getGoogleMapsUrl()} target="_blank" rel="noopener noreferrer">
                <i className="bi bi-map me-2"></i>
                View on Map
              </Button>
            )}
          </Col>

          <Col lg={6}>
            <h3 className="mb-4">
              <i className="bi bi-telephone me-2 text-primary"></i>
              Contact Us
            </h3>

            <div className="d-flex flex-column gap-3">
              {contact?.phone && (
                <Card className="border-0 bg-light">
                  <Card.Body>
                    <h6 className="mb-2">
                      <i className="bi bi-telephone-fill me-2 text-primary"></i>
                      Phone
                    </h6>
                    <a href={`tel:${contact.phone}`} className="text-decoration-none fs-5 text-dark">
                      {contact.phone}
                    </a>
                  </Card.Body>
                </Card>
              )}

              {contact?.email && (
                <Card className="border-0 bg-light">
                  <Card.Body>
                    <h6 className="mb-2">
                      <i className="bi bi-envelope-fill me-2 text-primary"></i>
                      Email
                    </h6>
                    <a href={`mailto:${contact.email}`} className="text-decoration-none fs-5 text-dark">
                      {contact.email}
                    </a>
                  </Card.Body>
                </Card>
              )}

              {contact?.website_url && (
                <Card className="border-0 bg-light">
                  <Card.Body>
                    <h6 className="mb-2">
                      <i className="bi bi-globe me-2 text-primary"></i>
                      Website
                    </h6>
                    <a
                      href={contact.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-decoration-none fs-5 text-dark"
                    >
                      Visit our website
                      <i className="bi bi-box-arrow-up-right ms-2 small"></i>
                    </a>
                  </Card.Body>
                </Card>
              )}
            </div>
          </Col>
        </Row>

        {/* Footer Booking CTA */}
        {bookingUrl && (
          <Row>
            <Col>
              <Card className="bg-primary text-white text-center border-0 shadow-lg">
                <Card.Body className="py-5 px-4">
                  <h2 className="mb-3 fw-bold">Ready to experience {name}?</h2>
                  <p className="lead mb-4">Book your stay today and enjoy our exceptional hospitality</p>
                  <Button
                    variant="light"
                    size="lg"
                    href={bookingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-5 py-3 fw-bold"
                  >
                    <i className="bi bi-calendar-check me-2"></i>
                    {bookingLabel}
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        )}
      </Container>
    </section>
  );
};

export default LocationContactSection;

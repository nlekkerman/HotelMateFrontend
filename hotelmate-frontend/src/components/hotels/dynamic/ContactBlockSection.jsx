import React from 'react';
import PropTypes from 'prop-types';
import { Container, Row, Col, Card } from 'react-bootstrap';

const ContactBlockSection = ({ element, hotel }) => {
  const { title, body, settings = {} } = element;
  const { 
    show_phone = true, 
    show_email = true, 
    show_address = true 
  } = settings;

  return (
    <section className="contact-block-section py-5 bg-light">
      <Container>
        {title && (
          <h2 className="text-center fw-bold mb-2">{title}</h2>
        )}
        
        {body && (
          <p className="text-center text-muted mb-5">{body}</p>
        )}
        
        <Row className="g-4">
          {/* Contact Information */}
          <Col xs={12} md={6}>
            <Card className="h-100 shadow-sm border-0">
              <Card.Body>
                <h4 className="mb-4">
                  <i className="bi bi-info-circle me-2 text-primary"></i>
                  Contact Information
                </h4>
                
                <div className="d-flex flex-column gap-3">
                  {show_phone && hotel.phone && (
                    <div className="d-flex align-items-center">
                      <i className="bi bi-telephone-fill text-primary me-3" style={{ fontSize: '1.5rem' }}></i>
                      <div>
                        <small className="text-muted d-block">Phone</small>
                        <a href={`tel:${hotel.phone}`} className="text-decoration-none fw-bold">
                          {hotel.phone}
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {show_email && hotel.email && (
                    <div className="d-flex align-items-center">
                      <i className="bi bi-envelope-fill text-primary me-3" style={{ fontSize: '1.5rem' }}></i>
                      <div>
                        <small className="text-muted d-block">Email</small>
                        <a href={`mailto:${hotel.email}`} className="text-decoration-none fw-bold">
                          {hotel.email}
                        </a>
                      </div>
                    </div>
                  )}
                  
                  {show_address && (
                    <div className="d-flex align-items-start">
                      <i className="bi bi-geo-alt-fill text-primary me-3" style={{ fontSize: '1.5rem' }}></i>
                      <div>
                        <small className="text-muted d-block">Address</small>
                        <address className="mb-0 fw-bold">
                          {hotel.address_line_1}
                          {hotel.address_line_2 && (
                            <>
                              <br />
                              {hotel.address_line_2}
                            </>
                          )}
                          <br />
                          {hotel.city}
                          {hotel.postal_code && `, ${hotel.postal_code}`}
                          <br />
                          {hotel.country}
                        </address>
                      </div>
                    </div>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
          
          {/* Map */}
          <Col xs={12} md={6}>
            <Card className="h-100 shadow-sm border-0 overflow-hidden">
              {hotel.latitude && hotel.longitude ? (
                <iframe
                  title="Hotel Location"
                  width="100%"
                  height="400"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  src={`https://www.google.com/maps/embed/v1/place?key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'YOUR_API_KEY'}&q=${hotel.latitude},${hotel.longitude}`}
                ></iframe>
              ) : (
                <Card.Body className="d-flex align-items-center justify-content-center text-muted">
                  <div className="text-center">
                    <i className="bi bi-map" style={{ fontSize: '3rem' }}></i>
                    <p className="mt-3">Map location not available</p>
                  </div>
                </Card.Body>
              )}
            </Card>
          </Col>
        </Row>
      </Container>
    </section>
  );
};

ContactBlockSection.propTypes = {
  element: PropTypes.shape({
    title: PropTypes.string,
    body: PropTypes.string,
    settings: PropTypes.shape({
      show_phone: PropTypes.bool,
      show_email: PropTypes.bool,
      show_address: PropTypes.bool,
    }),
  }).isRequired,
  hotel: PropTypes.shape({
    phone: PropTypes.string,
    email: PropTypes.string,
    address_line_1: PropTypes.string,
    address_line_2: PropTypes.string,
    city: PropTypes.string,
    postal_code: PropTypes.string,
    country: PropTypes.string,
    latitude: PropTypes.number,
    longitude: PropTypes.number,
  }).isRequired,
};

export default ContactBlockSection;

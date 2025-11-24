import React from 'react';
import { Container, Row, Col, Card, Badge, Button } from 'react-bootstrap';

/**
 * OffersSection - Display special offers and packages
 */
const OffersSection = ({ hotel }) => {
  const offers = hotel?.offers || [];

  if (offers.length === 0) return null;

  const formatDateRange = (validFrom, validTo) => {
    if (!validFrom || !validTo) return null;

    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const fromDate = new Date(validFrom).toLocaleDateString('en-US', options);
    const toDate = new Date(validTo).toLocaleDateString('en-US', options);

    return `Valid ${fromDate} - ${toDate}`;
  };

  const getBadgeVariant = (tag) => {
    const tagLower = tag?.toLowerCase() || '';
    if (tagLower.includes('popular')) return 'warning';
    if (tagLower.includes('limited')) return 'danger';
    if (tagLower.includes('new')) return 'success';
    if (tagLower.includes('best')) return 'primary';
    return 'info';
  };

  return (
    <section className="offers-section py-5" style={{ background: 'linear-gradient(135deg, #f5f7fa 0%, #e9ecef 100%)' }}>
      <Container>
        <div className="text-center mb-5">
          <h2 className="display-5 fw-bold mb-2">Special Offers & Packages</h2>
          <p className="text-muted">Discover our exclusive deals and packages</p>
        </div>

        <Row xs={1} md={2} className="g-4">
          {offers.map((offer) => (
            <Col key={offer.id}>
              <Card className="h-100 shadow-sm border-0 hover-lift" style={{ transition: 'all 0.3s ease' }}>
                {offer.photo_url && (
                  <Card.Img
                    variant="top"
                    src={offer.photo_url}
                    alt={offer.title}
                    style={{ height: '200px', objectFit: 'cover' }}
                  />
                )}
                <Card.Body className="d-flex flex-column p-4">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <Card.Title className="h4 mb-0 flex-grow-1">{offer.title}</Card.Title>
                    {offer.tag && (
                      <Badge bg={getBadgeVariant(offer.tag)} className="ms-2">
                        {offer.tag}
                      </Badge>
                    )}
                  </div>

                  {offer.short_description && (
                    <Card.Text className="text-muted flex-grow-1 mb-3">{offer.short_description}</Card.Text>
                  )}

                  {formatDateRange(offer.valid_from, offer.valid_to) && (
                    <div className="text-muted small mb-3">
                      <i className="bi bi-calendar-event me-2"></i>
                      {formatDateRange(offer.valid_from, offer.valid_to)}
                    </div>
                  )}

                  <Button
                    variant="success"
                    size="lg"
                    className="w-100 mt-auto"
                    disabled
                  >
                    <i className="bi bi-cart-check me-2"></i>
                    Book now (Coming Soon)
                  </Button>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>

      <style jsx>{`
        .hover-lift {
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }

        .hover-lift:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1) !important;
        }
      `}</style>
    </section>
  );
};

export default OffersSection;

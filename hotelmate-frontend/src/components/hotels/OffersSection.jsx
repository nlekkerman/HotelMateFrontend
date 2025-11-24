import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

/**
 * OffersSection - Modern display of special offers and packages
 * Uses theme colors from staff settings
 */
const OffersSection = ({ hotel }) => {
  const navigate = useNavigate();
  const offers = hotel?.offers || [];

  if (offers.length === 0) return null;

  const formatDateRange = (validFrom, validTo) => {
    if (!validFrom || !validTo) return null;

    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    const fromDate = new Date(validFrom).toLocaleDateString('en-US', options);
    const toDate = new Date(validTo).toLocaleDateString('en-US', options);

    return `${fromDate} - ${toDate}`;
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.15 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <section className="modern-offers-section">
      <Container>
        {/* Section Header */}
        <motion.div
          className="text-center mb-5"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="section-heading mb-3">Special Offers & Packages</h2>
          <p className="section-subheading">
            Discover our exclusive deals and limited-time offers
          </p>
        </motion.div>

        {/* Offers Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
        >
          <Row xs={1} md={2} className="g-4">
            {offers.map((offer) => (
              <Col key={offer.id}>
                <motion.div
                  className="modern-offer-card"
                  variants={itemVariants}
                  whileHover={{ y: -8 }}
                >
                  {/* Offer Image */}
                  <div className="modern-offer-image">
                    {offer.photo_url ? (
                      <img
                        src={offer.photo_url}
                        alt={offer.title}
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
                        }}
                      />
                    )}

                    {/* Offer Tag */}
                    {offer.tag && (
                      <div className="modern-offer-tag">{offer.tag}</div>
                    )}
                  </div>

                  {/* Offer Content */}
                  <div className="modern-offer-content">
                    <h3 className="modern-offer-title">{offer.title}</h3>

                    {offer.short_description && (
                      <p className="modern-room-description">
                        {offer.short_description}
                      </p>
                    )}

                    {/* Valid Dates */}
                    {formatDateRange(offer.valid_from, offer.valid_to) && (
                      <div className="modern-offer-dates">
                        <i className="bi bi-calendar-event"></i>
                        <span>{formatDateRange(offer.valid_from, offer.valid_to)}</span>
                      </div>
                    )}

                    {/* Book Button */}
                    <button
                      className="modern-room-cta mt-3"
                      onClick={() => navigate(`/${hotel.slug}/book`)}
                    >
                      <i className="bi bi-gift"></i>
                      Book This Offer
                    </button>
                  </div>
                </motion.div>
              </Col>
            ))}
          </Row>
        </motion.div>
      </Container>
    </section>
  );
};

export default OffersSection;

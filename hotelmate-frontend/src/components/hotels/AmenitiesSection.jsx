import React from 'react';
import { Row, Col, Badge } from 'react-bootstrap';
import { motion } from 'framer-motion';

/**
 * AmenitiesSection - Display hotel amenities from public settings
 */
const AmenitiesSection = ({ settings }) => {
  if (!settings?.amenities || settings.amenities.length === 0) {
    return null;
  }

  return (
    <section className="amenities-section py-5">
      <div className="section-container">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h3 className="section-heading text-center mb-4">
            <i className="bi bi-star me-2" style={{ color: 'var(--main-color, #3498db)' }}></i>
            Amenities
          </h3>

          <Row className="justify-content-center">
            <Col lg={10}>
              <div className="d-flex flex-wrap gap-3 justify-content-center">
                {settings.amenities.map((amenity, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                  >
                    <Badge 
                      bg="light" 
                      text="dark"
                      className="px-4 py-2"
                      style={{
                        fontSize: '1rem',
                        fontWeight: '500',
                        border: '2px solid var(--main-color, #3498db)',
                        color: 'var(--main-color, #3498db)',
                      }}
                    >
                      <i className="bi bi-check-circle-fill me-2"></i>
                      {amenity}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            </Col>
          </Row>
        </motion.div>
      </div>
    </section>
  );
};

export default AmenitiesSection;

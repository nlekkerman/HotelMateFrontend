import React, { useState } from 'react';
import { Container, Row, Col, Modal } from 'react-bootstrap';
import { motion } from 'framer-motion';

/**
 * GallerySection - Display hotel image gallery from public settings
 */
const GallerySection = ({ settings, hotelName }) => {
  const [selectedImage, setSelectedImage] = useState(null);

  if (!settings?.gallery || settings.gallery.length === 0) {
    return null;
  }

  return (
    <>
      <section className="gallery-section py-5 bg-light">
        <Container>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="section-heading text-center mb-5">
              <i className="bi bi-images me-2" style={{ color: 'var(--main-color, #3498db)' }}></i>
              Gallery
            </h3>

            <Row className="g-4">
              {settings.gallery.map((imageUrl, index) => (
                <Col key={index} xs={12} sm={6} md={4} lg={3}>
                  <motion.div
                    className="gallery-item"
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    whileHover={{ scale: 1.05 }}
                    onClick={() => setSelectedImage(imageUrl)}
                    style={{
                      cursor: 'pointer',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                      aspectRatio: '4/3',
                      position: 'relative',
                    }}
                  >
                    <img
                      src={imageUrl}
                      alt={`${hotelName} - Gallery ${index + 1}`}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                      onError={(e) => {
                        console.error('Gallery image failed to load:', imageUrl);
                        e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E';
                      }}
                    />
                    <div 
                      style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        background: 'linear-gradient(transparent, rgba(0,0,0,0.5))',
                        padding: '20px 10px 10px',
                        color: 'white',
                        opacity: 0,
                        transition: 'opacity 0.3s',
                      }}
                      className="gallery-item-overlay"
                    >
                      <i className="bi bi-arrows-fullscreen"></i>
                    </div>
                  </motion.div>
                </Col>
              ))}
            </Row>
          </motion.div>
        </Container>
      </section>

      {/* Lightbox Modal */}
      <Modal
        show={!!selectedImage}
        onHide={() => setSelectedImage(null)}
        size="xl"
        centered
        className="gallery-modal"
      >
        <Modal.Body className="p-0" style={{ backgroundColor: 'rgba(0,0,0,0.9)' }}>
          <button
            onClick={() => setSelectedImage(null)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              fontSize: '2rem',
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              cursor: 'pointer',
              zIndex: 10,
            }}
          >
            ×
          </button>
          {selectedImage && (
            <img
              src={selectedImage}
              alt={hotelName}
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '90vh',
                objectFit: 'contain',
              }}
            />
          )}
        </Modal.Body>
      </Modal>

      <style>{`
        .gallery-item:hover .gallery-item-overlay {
          opacity: 1 !important;
        }
      `}</style>
    </>
  );
};

export default GallerySection;

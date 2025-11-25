import React, { useState } from 'react';
import { Container, Row, Col, Modal } from 'react-bootstrap';
import { motion } from 'framer-motion';

/**
 * GallerySection - Display hotel image gallery from public settings
 */
const GallerySection = ({ settings, hotelName }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const scrollContainerRef = React.useRef(null);

  if (!settings?.gallery || settings.gallery.length === 0) {
    return null;
  }

  const scroll = (direction) => {
    if (scrollContainerRef.current) {
      const scrollAmount = 370; // 350px image width + 20px gap
      const newScrollPosition = scrollContainerRef.current.scrollLeft + (direction === 'left' ? -scrollAmount : scrollAmount);
      scrollContainerRef.current.scrollTo({
        left: newScrollPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <>
      <section className="gallery-section py-5 bg-light">
        <Container fluid>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h3 className="section-heading text-center mb-4">
              <i className="bi bi-images me-2" style={{ color: 'var(--main-color, #3498db)' }}></i>
              Gallery
            </h3>

            <div style={{ position: 'relative' }}>
              {/* Left Arrow */}
              <button
                onClick={() => scroll('left')}
                style={{
                  position: 'absolute',
                  left: '0',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 10,
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '50px',
                  height: '50px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  transition: 'all 0.3s',
                }}
                className="gallery-nav-btn"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                }}
              >
                <i className="bi bi-chevron-left" style={{ fontSize: '1.5rem', color: 'var(--main-color, #3498db)' }}></i>
              </button>

              {/* Right Arrow */}
              <button
                onClick={() => scroll('right')}
                style={{
                  position: 'absolute',
                  right: '0',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  zIndex: 10,
                  background: 'rgba(255, 255, 255, 0.9)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '50px',
                  height: '50px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  transition: 'all 0.3s',
                }}
                className="gallery-nav-btn"
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                }}
              >
                <i className="bi bi-chevron-right" style={{ fontSize: '1.5rem', color: 'var(--main-color, #3498db)' }}></i>
              </button>

              <div 
                ref={scrollContainerRef}
                style={{
                  display: 'flex',
                  overflowX: 'auto',
                  overflowY: 'hidden',
                  gap: '1rem',
                  padding: '1rem 2rem',
                  scrollBehavior: 'smooth',
                  WebkitOverflowScrolling: 'touch',
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'var(--main-color, #3498db) #f0f0f0'
                }}
                className="gallery-horizontal-scroll"
              >
              {settings.gallery.map((imageUrl, index) => (
                <motion.div
                  key={`gallery-${index}-${imageUrl.substring(imageUrl.lastIndexOf('/') + 1, imageUrl.lastIndexOf('/') + 10)}`}
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
                    minWidth: '350px',
                    height: '250px',
                    position: 'relative',
                    flexShrink: 0
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
              ))}
              </div>
            </div>
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
        
        .gallery-horizontal-scroll::-webkit-scrollbar {
          height: 8px;
        }
        
        .gallery-horizontal-scroll::-webkit-scrollbar-track {
          background: #f0f0f0;
          border-radius: 10px;
        }
        
        .gallery-horizontal-scroll::-webkit-scrollbar-thumb {
          background: var(--main-color, #3498db);
          border-radius: 10px;
        }
        
        .gallery-horizontal-scroll::-webkit-scrollbar-thumb:hover {
          background: #2980b9;
        }
      `}</style>
    </>
  );
};

export default GallerySection;

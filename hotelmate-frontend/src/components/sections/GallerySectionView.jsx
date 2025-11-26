import React, { useState } from 'react';
import { Container, Row, Col, Modal } from 'react-bootstrap';

/**
 * GallerySectionView - Public view for gallery section
 */
const GallerySectionView = ({ section }) => {
  const galleries = section.galleries || [];
  const [selectedImage, setSelectedImage] = useState(null);

  if (galleries.length === 0) {
    return null;
  }

  return (
    <section className="gallery-section-view py-5 bg-light">
      <Container>
        <h2 className="text-center mb-5">{section.name}</h2>
        
        {galleries.map((gallery) => (
          <div key={gallery.id} className="mb-5">
            {galleries.length > 1 && (
              <h3 className="mb-4">{gallery.name}</h3>
            )}
            
            {gallery.images && gallery.images.length > 0 ? (
              <Row>
                {gallery.images.map((image) => (
                  <Col key={image.id} xs={6} md={4} lg={3} className="mb-4">
                    <div 
                      className="gallery-image-wrapper"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedImage(image)}
                    >
                      <img
                        src={image.image_url}
                        alt={image.caption || 'Gallery image'}
                        className="w-100 rounded shadow-sm"
                        style={{
                          height: '200px',
                          objectFit: 'cover',
                          transition: 'transform 0.2s',
                        }}
                        onMouseEnter={(e) => e.target.style.transform = 'scale(1.05)'}
                        onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
                      />
                      {image.caption && (
                        <p className="text-center mt-2 small text-muted">
                          {image.caption}
                        </p>
                      )}
                    </div>
                  </Col>
                ))}
              </Row>
            ) : (
              <p className="text-muted text-center">No images in this gallery yet.</p>
            )}
          </div>
        ))}
      </Container>

      {/* Image Modal */}
      <Modal 
        show={!!selectedImage} 
        onHide={() => setSelectedImage(null)}
        size="xl"
        centered
      >
        <Modal.Body className="p-0">
          {selectedImage && (
            <>
              <img
                src={selectedImage.image_url}
                alt={selectedImage.caption || 'Gallery image'}
                className="w-100"
                style={{ maxHeight: '90vh', objectFit: 'contain' }}
              />
              {selectedImage.caption && (
                <div className="p-3 bg-dark text-white">
                  {selectedImage.caption}
                </div>
              )}
            </>
          )}
        </Modal.Body>
      </Modal>
    </section>
  );
};

export default GallerySectionView;

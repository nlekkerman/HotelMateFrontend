import React, { useState } from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { GALLERY_VARIANTS } from '@/types/presets';
import GalleryImageRenderer from './GalleryImageRenderer';

/**
 * GallerySectionPreset - Renders gallery section based on layout_preset.key
 * 
 * Supported variants:
 * - gallery_grid (default)
 * - gallery_masonry
 * - gallery_carousel
 * - gallery_grid_2col
 * - gallery_grid_4col
 */
const GallerySectionPreset = ({ section, onUpdate }) => {
  const variantKey = section.layout_preset?.key ?? GALLERY_VARIANTS.GRID;
  const galleries = section.galleries || [];
  const [selectedImage, setSelectedImage] = useState(null);

  if (galleries.length === 0) {
    return null;
  }

  const handleImageClick = (image) => {
    setSelectedImage(image);
  };

  const closeLightbox = () => {
    setSelectedImage(null);
  };

  // Masonry Layout
  if (variantKey === GALLERY_VARIANTS.MASONRY) {
    return (
      <section className={`gallery gallery--masonry ${section.is_active === false ? 'section-inactive' : ''}`}>
        <Container>
          <h2 className="gallery__title text-center mb-5">{section.name}</h2>
          {galleries.map((gallery) => (
            <div key={gallery.id} className="gallery__container mb-5">
              {gallery.name && <h3 className="gallery__subtitle mb-4">{gallery.name}</h3>}
              <div className="gallery__masonry-grid">
                {gallery.images?.map((image) => (
                  <div key={image.id} className="gallery__masonry-item">
                    <GalleryImageRenderer image={image} onClick={handleImageClick} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </Container>
        {selectedImage && renderLightbox(selectedImage, closeLightbox)}
      </section>
    );
  }

  // Carousel Layout
  if (variantKey === GALLERY_VARIANTS.CAROUSEL) {
    return (
      <section className={`gallery gallery--carousel ${section.is_active === false ? 'section-inactive' : ''}`}>
        <Container>
          <h2 className="gallery__title text-center mb-5">{section.name}</h2>
          {galleries.map((gallery) => (
            <div key={gallery.id} className="gallery__container mb-5">
              {gallery.name && <h3 className="gallery__subtitle mb-4">{gallery.name}</h3>}
              <div className="gallery__carousel-wrapper">
                <div className="gallery__carousel-track">
                  {gallery.images?.map((image) => (
                    <div key={image.id} className="gallery__carousel-item">
                      <GalleryImageRenderer image={image} onClick={handleImageClick} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </Container>
        {selectedImage && renderLightbox(selectedImage, closeLightbox)}
      </section>
    );
  }

  // 2 Column Grid
  if (variantKey === GALLERY_VARIANTS.GRID_2COL) {
    return (
      <section className={`gallery gallery--grid-2col ${section.is_active === false ? 'section-inactive' : ''}`}>
        <Container>
          <h2 className="gallery__title text-center mb-5">{section.name}</h2>
          {galleries.map((gallery) => (
            <div key={gallery.id} className="gallery__container mb-5">
              {gallery.name && <h3 className="gallery__subtitle mb-4">{gallery.name}</h3>}
              <Row className="g-4">
                {gallery.images?.map((image) => (
                  <Col key={image.id} xs={12} md={6}>
                    <GalleryImageRenderer image={image} onClick={handleImageClick} />
                  </Col>
                ))}
              </Row>
            </div>
          ))}
        </Container>
        {selectedImage && renderLightbox(selectedImage, closeLightbox)}
      </section>
    );
  }

  // 4 Column Grid
  if (variantKey === GALLERY_VARIANTS.GRID_4COL) {
    return (
      <section className={`gallery gallery--grid-4col ${section.is_active === false ? 'section-inactive' : ''}`}>
        <Container>
          <h2 className="gallery__title text-center mb-5">{section.name}</h2>
          {galleries.map((gallery) => (
            <div key={gallery.id} className="gallery__container mb-5">
              {gallery.name && <h3 className="gallery__subtitle mb-4">{gallery.name}</h3>}
              <Row className="g-3">
                {gallery.images?.map((image) => (
                  <Col key={image.id} xs={6} sm={4} md={3}>
                    <GalleryImageRenderer image={image} onClick={handleImageClick} />
                  </Col>
                ))}
              </Row>
            </div>
          ))}
        </Container>
        {selectedImage && renderLightbox(selectedImage, closeLightbox)}
      </section>
    );
  }

  // Default: 3 Column Grid
  return (
    <section className={`gallery gallery--grid ${section.is_active === false ? 'section-inactive' : ''}`}>
      <Container>
        <h2 className="gallery__title text-center mb-5">{section.name}</h2>
        {galleries.map((gallery) => (
          <div key={gallery.id} className="gallery__container mb-5">
            {gallery.name && <h3 className="gallery__subtitle mb-4">{gallery.name}</h3>}
            <Row className="g-4">
              {gallery.images?.map((image) => (
                <Col key={image.id} xs={12} sm={6} md={4}>
                  <GalleryImageRenderer image={image} onClick={handleImageClick} />
                </Col>
              ))}
            </Row>
          </div>
        ))}
      </Container>
      {selectedImage && renderLightbox(selectedImage, closeLightbox)}
    </section>
  );

  function renderLightbox(image, onClose) {
    return (
      <div className="gallery__lightbox" onClick={onClose}>
        <div className="gallery__lightbox-content" onClick={(e) => e.stopPropagation()}>
          <button className="gallery__lightbox-close" onClick={onClose}>
            <i className="bi bi-x-lg"></i>
          </button>
          <img 
            src={image.image_url} 
            alt={image.caption || image.alt_text || 'Gallery image'} 
            className="gallery__lightbox-image"
          />
          {image.caption && (
            <p className="gallery__lightbox-caption">{image.caption}</p>
          )}
        </div>
      </div>
    );
  }
};

export default GallerySectionPreset;

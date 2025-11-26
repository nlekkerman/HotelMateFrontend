import React from 'react';

/**
 * GalleryImageRenderer - Simple gallery image renderer
 * Styling is now controlled by parent section's style_variant via CSS
 */
const GalleryImageRenderer = ({ image, onClick, variant = 1 }) => {
  // Image renderer component
  // Simple image rendering - styling handled by CSS based on parent section variant
  return (
    <div 
      className={`gallery-image gallery-image--preset-${variant}`} 
      onClick={() => onClick?.(image)}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      <img 
        src={image.image_url} 
        alt={image.caption || image.alt_text || 'Gallery image'} 
        className="gallery-image__img"
      />
      {image.caption && (
        <p className="gallery-image__caption">{image.caption}</p>
      )}
    </div>
  );
};

export default GalleryImageRenderer;

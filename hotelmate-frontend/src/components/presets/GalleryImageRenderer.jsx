import React from 'react';
import { IMAGE_STYLES } from '@/types/presets';

/**
 * GalleryImageRenderer - Renders gallery images based on image_style_preset.key
 * 
 * Supported variants:
 * - img_borderless (default)
 * - img_rounded
 * - img_circle
 * - img_polaroid
 * - img_shadow
 * - img_frame
 * - img_zoom_hover
 */
const GalleryImageRenderer = ({ image, onClick }) => {
  const styleKey = image.image_style_preset?.key ?? IMAGE_STYLES.BORDERLESS;

  // Rounded Image
  if (styleKey === IMAGE_STYLES.ROUNDED) {
    return (
      <div className="gallery-image gallery-image--rounded" onClick={() => onClick?.(image)}>
        <img 
          src={image.image_url} 
          alt={image.caption || image.alt_text || 'Gallery image'} 
          className="img img--rounded"
        />
        {image.caption && (
          <p className="gallery-image__caption">{image.caption}</p>
        )}
      </div>
    );
  }

  // Circle Image
  if (styleKey === IMAGE_STYLES.CIRCLE) {
    return (
      <div className="gallery-image gallery-image--circle" onClick={() => onClick?.(image)}>
        <img 
          src={image.image_url} 
          alt={image.caption || image.alt_text || 'Gallery image'} 
          className="img img--circle"
        />
        {image.caption && (
          <p className="gallery-image__caption">{image.caption}</p>
        )}
      </div>
    );
  }

  // Polaroid Image
  if (styleKey === IMAGE_STYLES.POLAROID) {
    return (
      <div className="gallery-image gallery-image--polaroid" onClick={() => onClick?.(image)}>
        <div className="img-polaroid">
          <img 
            src={image.image_url} 
            alt={image.caption || image.alt_text || 'Gallery image'} 
          />
          {image.caption && (
            <p className="img-polaroid__caption">{image.caption}</p>
          )}
        </div>
      </div>
    );
  }

  // Shadow Image
  if (styleKey === IMAGE_STYLES.SHADOW) {
    return (
      <div className="gallery-image gallery-image--shadow" onClick={() => onClick?.(image)}>
        <img 
          src={image.image_url} 
          alt={image.caption || image.alt_text || 'Gallery image'} 
          className="img img--shadow"
        />
        {image.caption && (
          <p className="gallery-image__caption">{image.caption}</p>
        )}
      </div>
    );
  }

  // Frame Image
  if (styleKey === IMAGE_STYLES.FRAME) {
    return (
      <div className="gallery-image gallery-image--frame" onClick={() => onClick?.(image)}>
        <div className="img-frame">
          <img 
            src={image.image_url} 
            alt={image.caption || image.alt_text || 'Gallery image'} 
          />
        </div>
        {image.caption && (
          <p className="gallery-image__caption">{image.caption}</p>
        )}
      </div>
    );
  }

  // Zoom Hover Image
  if (styleKey === IMAGE_STYLES.ZOOM_HOVER) {
    return (
      <div className="gallery-image gallery-image--zoom-hover" onClick={() => onClick?.(image)}>
        <div className="img-zoom-wrapper">
          <img 
            src={image.image_url} 
            alt={image.caption || image.alt_text || 'Gallery image'} 
            className="img img--zoom-hover"
          />
        </div>
        {image.caption && (
          <p className="gallery-image__caption">{image.caption}</p>
        )}
      </div>
    );
  }

  // Default: Borderless Image
  return (
    <div className="gallery-image gallery-image--borderless" onClick={() => onClick?.(image)}>
      <img 
        src={image.image_url} 
        alt={image.caption || image.alt_text || 'Gallery image'} 
        className="img img--borderless"
      />
      {image.caption && (
        <p className="gallery-image__caption">{image.caption}</p>
      )}
    </div>
  );
};

export default GalleryImageRenderer;

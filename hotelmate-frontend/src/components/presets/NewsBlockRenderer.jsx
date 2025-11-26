import React from 'react';

/**
 * NewsBlockRenderer - Simple news block renderer
 * Styling is controlled by parent section's style_variant via CSS
 */
const NewsBlockRenderer = ({ block, variant = 1 }) => {
  // Text Block
  if (block.block_type === 'text') {
    return (
      <div className="news-block news-block--text">
        <p className="news-block__text">{block.body}</p>
      </div>
    );
  }

  // Image Block
  if (block.block_type === 'image') {
    return (
      <figure className="news-block news-block--image">
        <img 
          src={block.image_url} 
          alt={block.image_caption || 'News image'} 
          className="news-block__image"
        />
        {block.image_caption && (
          <figcaption className="news-block__caption">
            {block.image_caption}
          </figcaption>
        )}
      </figure>
    );
  }

  return null;
};

export default NewsBlockRenderer;

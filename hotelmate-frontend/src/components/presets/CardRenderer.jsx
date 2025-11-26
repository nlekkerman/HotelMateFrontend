import React from 'react';

/**
 * CardRenderer - Simple card renderer for list sections
 * Styling is controlled by parent section's style_variant via CSS
 */
const CardRenderer = ({ card, onCardClick, variant = 1 }) => {
  // Simple card rendering - styling handled by CSS based on parent section variant
  return (
    <div className="list-card" onClick={() => onCardClick?.(card)}>
      {card.image_url && (
        <div className="list-card__image-wrapper">
          <img 
            src={card.image_url} 
            alt={card.title}
            className="list-card__image"
          />
        </div>
      )}
      <div className="list-card__body">
        <h4 className={`list-card__title font-preset-${variant}-heading`}>{card.title}</h4>
        {card.subtitle && (
          <p className={`list-card__subtitle font-preset-${variant}-subtitle`}>
            {card.subtitle}
          </p>
        )}
        {card.description && (
          <p className={`list-card__description font-preset-${variant}-body`}>{card.description}</p>
        )}
      </div>
    </div>
  );
};

export default CardRenderer;

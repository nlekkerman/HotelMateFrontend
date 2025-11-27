import React from 'react';
import { useAuth } from '@/context/AuthContext';

/**
 * CardRenderer - Simple card renderer for list sections
 * Styling is controlled by parent section's style_variant via CSS
 */
const CardRenderer = ({ card, onCardClick, onEdit, onDelete, variant = 1 }) => {
  const { isStaff } = useAuth();
  
  // Simple card rendering - styling handled by CSS based on parent section variant
  return (
    <div className={`list-card card--preset-${variant}`}>
      {/* Staff Edit Overlay - Show on hover */}
      {isStaff && (
        <div className="list-card__edit-overlay">
          <button 
            className="card-edit-button"
            onClick={() => onEdit?.(card)}
            title="Edit card"
          >
            <i className="bi bi-pencil me-1"></i>
            Edit
          </button>
        </div>
      )}
      
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
        
        {/* Card action button - styled by preset */}
        {onCardClick && (
          <button 
            className="btn btn-hm btn-card mt-3"
            onClick={() => onCardClick(card)}
          >
            View Details
          </button>
        )}
      </div>
    </div>
  );
};

export default CardRenderer;

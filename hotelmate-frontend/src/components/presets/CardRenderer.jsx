import React from 'react';
import { Card } from 'react-bootstrap';
import { CARD_STYLES } from '@/types/presets';

/**
 * CardRenderer - Renders cards based on style_preset.key
 * 
 * Supported variants:
 * - card_image_top (default)
 * - card_text_only
 * - card_price_badge
 * - card_with_icon
 * - card_horizontal
 * - card_overlay
 * - card_minimal
 * - card_featured
 */
const CardRenderer = ({ card, onCardClick }) => {
  const styleKey = card.style_preset?.key ?? CARD_STYLES.IMAGE_TOP;

  // Text Only Card
  if (styleKey === CARD_STYLES.TEXT_ONLY) {
    return (
      <article className="card card--text-only" onClick={() => onCardClick?.(card)}>
        <Card className="h-100 shadow-sm hover-lift">
          <Card.Body>
            <Card.Title className="card__title">{card.title}</Card.Title>
            {card.subtitle && (
              <Card.Subtitle className="card__subtitle mb-3 text-muted">
                {card.subtitle}
              </Card.Subtitle>
            )}
            {card.description && (
              <Card.Text className="card__description">{card.description}</Card.Text>
            )}
          </Card.Body>
        </Card>
      </article>
    );
  }

  // Price Badge Card
  if (styleKey === CARD_STYLES.PRICE_BADGE) {
    return (
      <article className="card card--price-badge" onClick={() => onCardClick?.(card)}>
        <Card className="h-100 shadow-sm hover-lift">
          {card.image_url && (
            <div className="card__image-wrapper">
              <Card.Img variant="top" src={card.image_url} alt={card.title} />
              {card.subtitle && (
                <div className="card__price-badge">
                  {card.subtitle}
                </div>
              )}
            </div>
          )}
          <Card.Body>
            <Card.Title className="card__title">{card.title}</Card.Title>
            {card.description && (
              <Card.Text className="card__description">{card.description}</Card.Text>
            )}
          </Card.Body>
        </Card>
      </article>
    );
  }

  // With Icon Card
  if (styleKey === CARD_STYLES.WITH_ICON) {
    return (
      <article className="card card--with-icon" onClick={() => onCardClick?.(card)}>
        <Card className="h-100 shadow-sm hover-lift text-center">
          <Card.Body>
            <div className="card__icon-wrapper mb-3">
              {card.image_url ? (
                <img src={card.image_url} alt={card.title} className="card__icon" />
              ) : (
                <i className="bi bi-star-fill card__icon-placeholder"></i>
              )}
            </div>
            <Card.Title className="card__title">{card.title}</Card.Title>
            {card.subtitle && (
              <Card.Subtitle className="card__subtitle mb-3 text-muted">
                {card.subtitle}
              </Card.Subtitle>
            )}
            {card.description && (
              <Card.Text className="card__description">{card.description}</Card.Text>
            )}
          </Card.Body>
        </Card>
      </article>
    );
  }

  // Horizontal Card
  if (styleKey === CARD_STYLES.HORIZONTAL) {
    return (
      <article className="card card--horizontal" onClick={() => onCardClick?.(card)}>
        <Card className="shadow-sm hover-lift">
          <div className="card__horizontal-wrapper">
            {card.image_url && (
              <div className="card__horizontal-image">
                <Card.Img src={card.image_url} alt={card.title} />
              </div>
            )}
            <Card.Body className="card__horizontal-body">
              <Card.Title className="card__title">{card.title}</Card.Title>
              {card.subtitle && (
                <Card.Subtitle className="card__subtitle mb-3 text-muted">
                  {card.subtitle}
                </Card.Subtitle>
              )}
              {card.description && (
                <Card.Text className="card__description">{card.description}</Card.Text>
              )}
            </Card.Body>
          </div>
        </Card>
      </article>
    );
  }

  // Overlay Card
  if (styleKey === CARD_STYLES.OVERLAY) {
    return (
      <article className="card card--overlay" onClick={() => onCardClick?.(card)}>
        <Card className="h-100 shadow-sm hover-lift">
          <div className="card__overlay-wrapper">
            {card.image_url && (
              <Card.Img src={card.image_url} alt={card.title} className="card__overlay-image" />
            )}
            <div className="card__overlay-content">
              <Card.Title className="card__title-overlay">{card.title}</Card.Title>
              {card.subtitle && (
                <Card.Subtitle className="card__subtitle-overlay">
                  {card.subtitle}
                </Card.Subtitle>
              )}
              {card.description && (
                <Card.Text className="card__description-overlay">{card.description}</Card.Text>
              )}
            </div>
          </div>
        </Card>
      </article>
    );
  }

  // Minimal Card
  if (styleKey === CARD_STYLES.MINIMAL) {
    return (
      <article className="card card--minimal" onClick={() => onCardClick?.(card)}>
        <Card className="h-100 border-0 hover-lift">
          {card.image_url && (
            <Card.Img variant="top" src={card.image_url} alt={card.title} className="card__minimal-image" />
          )}
          <Card.Body className="px-0">
            <Card.Title className="card__title-minimal">{card.title}</Card.Title>
            {card.subtitle && (
              <Card.Subtitle className="card__subtitle-minimal text-muted">
                {card.subtitle}
              </Card.Subtitle>
            )}
            {card.description && (
              <Card.Text className="card__description-minimal">{card.description}</Card.Text>
            )}
          </Card.Body>
        </Card>
      </article>
    );
  }

  // Featured Card
  if (styleKey === CARD_STYLES.FEATURED) {
    return (
      <article className="card card--featured" onClick={() => onCardClick?.(card)}>
        <Card className="h-100 shadow-lg hover-lift">
          {card.image_url && (
            <Card.Img variant="top" src={card.image_url} alt={card.title} className="card__featured-image" />
          )}
          <Card.Body className="card__featured-body">
            {card.subtitle && (
              <div className="card__featured-badge mb-2">
                {card.subtitle}
              </div>
            )}
            <Card.Title className="card__title-featured">{card.title}</Card.Title>
            {card.description && (
              <Card.Text className="card__description-featured">{card.description}</Card.Text>
            )}
            <div className="card__featured-footer">
              <span className="card__featured-link">Learn More →</span>
            </div>
          </Card.Body>
        </Card>
      </article>
    );
  }

  // Default: Image Top Card
  return (
    <article className="card card--image-top" onClick={() => onCardClick?.(card)}>
      <Card className="h-100 shadow-sm hover-lift">
        {card.image_url && (
          <Card.Img 
            variant="top" 
            src={card.image_url} 
            alt={card.title}
            className="card__image"
          />
        )}
        <Card.Body>
          <Card.Title className="card__title">{card.title}</Card.Title>
          {card.subtitle && (
            <Card.Subtitle className="card__subtitle mb-3 text-muted">
              {card.subtitle}
            </Card.Subtitle>
          )}
          {card.description && (
            <Card.Text className="card__description">{card.description}</Card.Text>
          )}
        </Card.Body>
      </Card>
    </article>
  );
};

export default CardRenderer;

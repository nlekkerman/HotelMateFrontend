import React from 'react';
import { Row, Col } from 'react-bootstrap';
import { useAuth } from '@/context/AuthContext';
import NewsBlockRenderer from './NewsBlockRenderer';
import NewsArticleStructured from './NewsArticleStructured';

/**
 * NewsSectionPreset - Renders news section based on numeric style_variant (1-5)
 * 
 * Preset 1: Structured article layout (3 parts: top, middle, bottom)
 * Preset 2: Featured with large first item (Dark & Elegant)
 * Preset 3: Compact list (Minimal & Sleek)
 * Preset 4: Magazine grid layout (Vibrant & Playful)
 * Preset 5: Grid layout (Professional & Structured)
 */
const NewsSectionPreset = ({ section, onUpdate }) => {
  const { isStaff } = useAuth();
  const variant = section.style_variant ?? 1; // Default to Preset 1
  const newsItems = section.news_items || [];

  const handleAddArticle = () => {
    // TODO: Implement add article modal
    console.log('Add article clicked');
  };

  if (newsItems.length === 0) {
    return null;
  }

  // Preset 1: Structured Article - 3 Parts (TOP, MIDDLE, BOTTOM)
  if (variant === 1) {
    return (
      <section className={`news-section news-section--preset-1 ${section.is_active === false ? 'section-inactive' : ''}`}>
        <div className="section-container">
          <div className={`section-header section-header--preset-${variant}`}>
            <div className="section-header__content">
              <h2 className={`section-header__title font-preset-${variant}-heading`}>{section.name}</h2>
              {isStaff && (
                <button className="news-section-add-article" onClick={handleAddArticle}>
                  <i className="bi bi-plus-circle me-2"></i>
                  Add Article
                </button>
              )}
            </div>
          </div>
          {newsItems.map((newsItem) => (
            <NewsArticleStructured key={newsItem.id} newsItem={newsItem} onUpdate={onUpdate} />
          ))}
        </div>
      </section>
    );
  }

  // All Presets (2-5): Use same structured article layout as Preset 1
  if (variant >= 2 && variant <= 5) {
    return (
      <section className={`news-section news-section--preset-${variant} ${section.is_active === false ? 'section-inactive' : ''}`}>
        <div className="section-container">
          <div className={`section-header section-header--preset-${variant}`}>
            <div className="section-header__content">
              <h2 className={`section-header__title font-preset-${variant}-heading`}>{section.name}</h2>
              {isStaff && (
                <button className="news-section-add-article" onClick={handleAddArticle}>
                  <i className="bi bi-plus-circle me-2"></i>
                  Add Article
                </button>
              )}
            </div>
          </div>
          {newsItems.map((newsItem) => (
            <NewsArticleStructured key={newsItem.id} newsItem={newsItem} onUpdate={onUpdate} />
          ))}
        </div>
      </section>
    );
  }

  // Fallback to Preset 1 - Structured Article
  return (
    <section className={`news-section news-section--preset-1 ${section.is_active === false ? 'section-inactive' : ''}`}>
      <div className="section-container">
        <h2 className={`news-section__title text-center mb-5 font-preset-${variant}-heading`}>{section.name}</h2>
        {newsItems.map((newsItem) => (
          <NewsArticleStructured key={newsItem.id} newsItem={newsItem} onUpdate={onUpdate} />
        ))}
      </div>
    </section>
  );
};

export default NewsSectionPreset;

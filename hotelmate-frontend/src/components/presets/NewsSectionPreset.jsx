import React from 'react';
import { Row, Col } from 'react-bootstrap';
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
  const variant = section.style_variant ?? 1; // Default to Preset 1
  const newsItems = section.news_items || [];

  if (newsItems.length === 0) {
    return null;
  }

  // Preset 1: Structured Article - 3 Parts (TOP, MIDDLE, BOTTOM)
  if (variant === 1) {
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
  }

  // Preset 2: Dark & Elegant - Featured Layout
  if (variant === 2) {
    const [featuredItem, ...restItems] = newsItems;
    return (
      <section className={`news-section news-section--preset-2 ${section.is_active === false ? 'section-inactive' : ''}`}>
        <div className="section-container">
          <h2 className={`news-section__title text-center mb-5 font-preset-${variant}-heading`}>{section.name}</h2>
          
          {/* Featured Article */}
          {featuredItem && (
            <article className="news-article news-article--featured mb-5">
              <Row>
                <Col xs={12} md={6}>
                  {featuredItem.content_blocks?.find(b => b.block_type === 'image') && (
                    <div className="news-article__featured-image">
                      <img 
                        src={featuredItem.content_blocks.find(b => b.block_type === 'image').image_url}
                        alt={featuredItem.title}
                      />
                    </div>
                  )}
                </Col>
                <Col xs={12} md={6}>
                  <div className="news-article__featured-content">
                    <h3 className={`news-article__title-featured font-preset-${variant}-heading`}>{featuredItem.title}</h3>
                    <p className={`news-article__date font-preset-${variant}-body`}>{new Date(featuredItem.date).toLocaleDateString()}</p>
                    {featuredItem.summary && (
                      <p className={`news-article__summary-featured font-preset-${variant}-body`}>{featuredItem.summary}</p>
                    )}
                    <div className="news-article__content">
                      {featuredItem.content_blocks?.filter(b => b.block_type === 'text').slice(0, 2).map((block) => (
                        <NewsBlockRenderer key={block.id} block={block} />
                      ))}
                    </div>
                  </div>
                </Col>
              </Row>
            </article>
          )}

          {/* Rest of Articles */}
          {restItems.length > 0 && (
            <Row className="g-4">
              {restItems.map((newsItem) => (
                <Col key={newsItem.id} xs={12} sm={6} md={4}>
                  <article className="news-article news-article--card">
                    <h4 className={`news-article__title-small font-preset-${variant}-subtitle`}>{newsItem.title}</h4>
                    <p className={`news-article__date-small font-preset-${variant}-body`}>{new Date(newsItem.date).toLocaleDateString()}</p>
                    {newsItem.summary && (
                      <p className={`news-article__summary-small font-preset-${variant}-body`}>{newsItem.summary}</p>
                    )}
                  </article>
                </Col>
              ))}
            </Row>
          )}
        </div>
      </section>
    );
  }

  // Preset 3: Minimal & Sleek - Compact list
  if (variant === 3) {
    return (
      <section className={`news-section news-section--preset-3 ${section.is_active === false ? 'section-inactive' : ''}`}>
        <div className="section-container">
          <h2 className={`news-section__title text-center mb-5 font-preset-${variant}-heading`}>{section.name}</h2>
          <div className="news-article__compact-list">
            {newsItems.map((newsItem) => (
              <article key={newsItem.id} className="news-article news-article--compact">
                <div className="news-article__compact-header">
                  <h4 className={`news-article__title-compact font-preset-${variant}-subtitle`}>{newsItem.title}</h4>
                  <p className={`news-article__date-compact font-preset-${variant}-body`}>{new Date(newsItem.date).toLocaleDateString()}</p>
                </div>
                {newsItem.summary && (
                  <p className={`news-article__summary-compact font-preset-${variant}-body`}>{newsItem.summary}</p>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Preset 4: Vibrant & Playful - Magazine grid
  if (variant === 4) {
    return (
      <section className={`news-section news-section--preset-4 ${section.is_active === false ? 'section-inactive' : ''}`}>
        <div className="section-container">
          <h2 className={`news-section__title text-center mb-5 font-preset-${variant}-heading`}>{section.name}</h2>
          <Row className="g-4">
            {newsItems.map((newsItem, index) => {
              const colSize = index === 0 ? { xs: 12, md: 8 } : { xs: 12, md: 4 };
              return (
                <Col key={newsItem.id} {...colSize}>
                  <article className={`news-article news-article--magazine ${index === 0 ? 'news-article--magazine-main' : ''}`}>
                    {newsItem.content_blocks?.find(b => b.block_type === 'image') && (
                      <div className="news-article__magazine-image">
                        <img 
                          src={newsItem.content_blocks.find(b => b.block_type === 'image').image_url}
                          alt={newsItem.title}
                        />
                      </div>
                    )}
                    <div className="news-article__magazine-content">
                      <h3 className={`${index === 0 ? 'news-article__title-magazine-main' : 'news-article__title-magazine'} font-preset-${variant}-heading`}>
                        {newsItem.title}
                      </h3>
                      <p className={`news-article__date font-preset-${variant}-body`}>{new Date(newsItem.date).toLocaleDateString()}</p>
                      {newsItem.summary && (
                        <p className={`news-article__summary-magazine font-preset-${variant}-body`}>{newsItem.summary}</p>
                      )}
                    </div>
                  </article>
                </Col>
              );
            })}
          </Row>
        </div>
      </section>
    );
  }

  // Preset 5: Professional & Structured - Grid layout
  if (variant === 5) {
    return (
      <section className={`news-section news-section--preset-5 ${section.is_active === false ? 'section-inactive' : ''}`}>
      <div className="section-container">
        <h2 className={`news-section__title text-center mb-5 font-preset-${variant}-heading`}>{section.name}</h2>
        <Row className="g-4">
          {newsItems.map((newsItem) => (
            <Col key={newsItem.id} xs={12} md={6} lg={4}>
              <article className="news-article news-article--grid">
                <h3 className={`news-article__title font-preset-${variant}-heading`}>{newsItem.title}</h3>
                <p className={`news-article__date font-preset-${variant}-body`}>{new Date(newsItem.date).toLocaleDateString()}</p>
                {newsItem.summary && (
                  <p className={`news-article__summary font-preset-${variant}-body`}>{newsItem.summary}</p>
                )}
                <div className="news-article__content">
                  {newsItem.content_blocks?.map((block) => (
                    <NewsBlockRenderer key={block.id} block={block} />
                  ))}
                </div>
              </article>
            </Col>
          ))}
        </Row>
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

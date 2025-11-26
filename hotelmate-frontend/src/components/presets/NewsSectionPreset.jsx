import React from 'react';
import { Container, Row, Col } from 'react-bootstrap';
import { NEWS_VARIANTS } from '@/types/presets';
import NewsBlockRenderer from './NewsBlockRenderer';

/**
 * NewsSectionPreset - Renders news section based on layout_preset.key
 * 
 * Supported variants:
 * - news_timeline (default)
 * - news_grid
 * - news_featured
 * - news_compact
 * - news_magazine
 */
const NewsSectionPreset = ({ section, onUpdate }) => {
  const variantKey = section.layout_preset?.key ?? NEWS_VARIANTS.TIMELINE;
  const newsItems = section.news_items || [];

  if (newsItems.length === 0) {
    return null;
  }

  // Grid Layout
  if (variantKey === NEWS_VARIANTS.GRID) {
    return (
      <section className={`news-section news-section--grid ${section.is_active === false ? 'section-inactive' : ''}`}>
        <Container>
          <h2 className="news-section__title text-center mb-5">{section.name}</h2>
          <Row className="g-4">
            {newsItems.map((newsItem) => (
              <Col key={newsItem.id} xs={12} md={6} lg={4}>
                <article className="news-article news-article--grid">
                  <h3 className="news-article__title">{newsItem.title}</h3>
                  <p className="news-article__date">{new Date(newsItem.date).toLocaleDateString()}</p>
                  {newsItem.summary && (
                    <p className="news-article__summary">{newsItem.summary}</p>
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
        </Container>
      </section>
    );
  }

  // Featured Layout
  if (variantKey === NEWS_VARIANTS.FEATURED) {
    const [featuredItem, ...restItems] = newsItems;
    return (
      <section className={`news-section news-section--featured ${section.is_active === false ? 'section-inactive' : ''}`}>
        <Container>
          <h2 className="news-section__title text-center mb-5">{section.name}</h2>
          
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
                    <h3 className="news-article__title-featured">{featuredItem.title}</h3>
                    <p className="news-article__date">{new Date(featuredItem.date).toLocaleDateString()}</p>
                    {featuredItem.summary && (
                      <p className="news-article__summary-featured">{featuredItem.summary}</p>
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
                    <h4 className="news-article__title-small">{newsItem.title}</h4>
                    <p className="news-article__date-small">{new Date(newsItem.date).toLocaleDateString()}</p>
                    {newsItem.summary && (
                      <p className="news-article__summary-small">{newsItem.summary}</p>
                    )}
                  </article>
                </Col>
              ))}
            </Row>
          )}
        </Container>
      </section>
    );
  }

  // Compact Layout
  if (variantKey === NEWS_VARIANTS.COMPACT) {
    return (
      <section className={`news-section news-section--compact ${section.is_active === false ? 'section-inactive' : ''}`}>
        <Container>
          <h2 className="news-section__title text-center mb-5">{section.name}</h2>
          <div className="news-article__compact-list">
            {newsItems.map((newsItem) => (
              <article key={newsItem.id} className="news-article news-article--compact">
                <div className="news-article__compact-header">
                  <h4 className="news-article__title-compact">{newsItem.title}</h4>
                  <p className="news-article__date-compact">{new Date(newsItem.date).toLocaleDateString()}</p>
                </div>
                {newsItem.summary && (
                  <p className="news-article__summary-compact">{newsItem.summary}</p>
                )}
              </article>
            ))}
          </div>
        </Container>
      </section>
    );
  }

  // Magazine Layout
  if (variantKey === NEWS_VARIANTS.MAGAZINE) {
    return (
      <section className={`news-section news-section--magazine ${section.is_active === false ? 'section-inactive' : ''}`}>
        <Container>
          <h2 className="news-section__title text-center mb-5">{section.name}</h2>
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
                      <h3 className={index === 0 ? 'news-article__title-magazine-main' : 'news-article__title-magazine'}>
                        {newsItem.title}
                      </h3>
                      <p className="news-article__date">{new Date(newsItem.date).toLocaleDateString()}</p>
                      {newsItem.summary && (
                        <p className="news-article__summary-magazine">{newsItem.summary}</p>
                      )}
                    </div>
                  </article>
                </Col>
              );
            })}
          </Row>
        </Container>
      </section>
    );
  }

  // Default: Timeline Layout
  return (
    <section className={`news-section news-section--timeline ${section.is_active === false ? 'section-inactive' : ''}`}>
      <Container>
        <h2 className="news-section__title text-center mb-5">{section.name}</h2>
        <div className="news-timeline">
          {newsItems.map((newsItem) => (
            <article key={newsItem.id} className="news-article news-article--timeline">
              <div className="news-article__timeline-marker"></div>
              <div className="news-article__timeline-content">
                <p className="news-article__date-timeline">{new Date(newsItem.date).toLocaleDateString()}</p>
                <h3 className="news-article__title">{newsItem.title}</h3>
                {newsItem.summary && (
                  <p className="news-article__summary">{newsItem.summary}</p>
                )}
                <div className="news-article__content">
                  {newsItem.content_blocks?.map((block) => (
                    <NewsBlockRenderer key={block.id} block={block} />
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
};

export default NewsSectionPreset;

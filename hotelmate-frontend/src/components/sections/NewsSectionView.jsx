import React from 'react';
import { Container, Row, Col, Card } from 'react-bootstrap';

/**
 * NewsSectionView - Public view for news section
 */
const NewsSectionView = ({ section }) => {
  const newsItems = section.news_items || [];

  if (newsItems.length === 0) {
    return null;
  }

  const renderContentBlock = (block) => {
    if (block.block_type === 'text') {
      return (
        <p key={block.id} style={{ whiteSpace: 'pre-wrap' }}>
          {block.body}
        </p>
      );
    }

    if (block.block_type === 'image' && block.image_url) {
      const getImageStyle = () => {
        switch (block.image_position) {
          case 'full_width':
            return { width: '100%', height: 'auto', marginBottom: '1rem' };
          case 'left':
            return { float: 'left', maxWidth: '50%', marginRight: '1rem', marginBottom: '1rem' };
          case 'right':
            return { float: 'right', maxWidth: '50%', marginLeft: '1rem', marginBottom: '1rem' };
          case 'inline_grid':
            return { width: '100%', height: 'auto', marginBottom: '1rem' };
          default:
            return { width: '100%', height: 'auto', marginBottom: '1rem' };
        }
      };

      return (
        <div key={block.id} className={block.image_position === 'inline_grid' ? 'col-md-6' : ''}>
          <img
            src={block.image_url}
            alt={block.image_caption || 'News image'}
            className="rounded"
            style={getImageStyle()}
          />
          {block.image_caption && (
            <p className="text-muted small" style={{ fontStyle: 'italic' }}>
              {block.image_caption}
            </p>
          )}
        </div>
      );
    }

    return null;
  };

  return (
    <section className="news-section-view py-5 bg-light">
      <Container>
        <h2 className="text-center mb-5">{section.name}</h2>
        
        <Row>
          {newsItems.map((news) => (
            <Col key={news.id} xs={12} lg={6} className="mb-4">
              <Card className="h-100 shadow-sm">
                <Card.Body>
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <Card.Title as="h3">{news.title}</Card.Title>
                    <small className="text-muted text-nowrap ms-3">
                      <i className="bi bi-calendar me-1"></i>
                      {new Date(news.date).toLocaleDateString()}
                    </small>
                  </div>
                  
                  {news.summary && (
                    <Card.Subtitle className="mb-3 text-muted">
                      {news.summary}
                    </Card.Subtitle>
                  )}
                  
                  {news.content_blocks && news.content_blocks.length > 0 && (
                    <div className="news-content">
                      {news.content_blocks.map(renderContentBlock)}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      </Container>
    </section>
  );
};

export default NewsSectionView;

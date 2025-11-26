import React from 'react';
import { NEWS_BLOCK_STYLES } from '@/types/presets';

/**
 * NewsBlockRenderer - Renders news blocks based on block_preset.key
 * 
 * Supported variants:
 * - news_simple (default)
 * - news_compact
 * - news_banner
 * - news_highlight
 * - news_callout
 * - news_quote
 */
const NewsBlockRenderer = ({ block }) => {
  const presetKey = block.block_preset?.key ?? NEWS_BLOCK_STYLES.SIMPLE;

  // Text Block
  if (block.block_type === 'text') {
    // Compact Style
    if (presetKey === NEWS_BLOCK_STYLES.COMPACT) {
      return (
        <div className="news-block news-block--compact">
          <p className="news-block__text-compact">{block.body}</p>
        </div>
      );
    }

    // Banner Style
    if (presetKey === NEWS_BLOCK_STYLES.BANNER) {
      return (
        <div className="news-block news-block--banner">
          <div className="news-block__banner-content">
            <p className="news-block__text-banner">{block.body}</p>
          </div>
        </div>
      );
    }

    // Callout Style
    if (presetKey === NEWS_BLOCK_STYLES.CALLOUT) {
      return (
        <div className="news-block news-block--callout">
          <div className="news-block__callout-icon">
            <i className="bi bi-info-circle-fill"></i>
          </div>
          <p className="news-block__text-callout">{block.body}</p>
        </div>
      );
    }

    // Quote Style
    if (presetKey === NEWS_BLOCK_STYLES.QUOTE) {
      return (
        <blockquote className="news-block news-block--quote">
          <div className="news-block__quote-mark">&ldquo;</div>
          <p className="news-block__text-quote">{block.body}</p>
        </blockquote>
      );
    }

    // Default Simple Style
    return (
      <div className="news-block news-block--simple">
        <p className="news-block__text-simple">{block.body}</p>
      </div>
    );
  }

  // Image Block
  if (block.block_type === 'image') {
    // Highlight Style
    if (presetKey === NEWS_BLOCK_STYLES.HIGHLIGHT) {
      return (
        <figure className="news-block news-block--highlight">
          <div className="news-block__image-highlight-wrapper">
            <img 
              src={block.image_url} 
              alt={block.image_caption || 'News image'} 
              className="news-block__image-highlight"
            />
          </div>
          {block.image_caption && (
            <figcaption className="news-block__caption-highlight">
              {block.image_caption}
            </figcaption>
          )}
        </figure>
      );
    }

    // Banner Style (full-width)
    if (presetKey === NEWS_BLOCK_STYLES.BANNER) {
      return (
        <figure className="news-block news-block--banner-image">
          <img 
            src={block.image_url} 
            alt={block.image_caption || 'News image'} 
            className="news-block__image-banner"
          />
          {block.image_caption && (
            <figcaption className="news-block__caption-banner">
              {block.image_caption}
            </figcaption>
          )}
        </figure>
      );
    }

    // Compact Style
    if (presetKey === NEWS_BLOCK_STYLES.COMPACT) {
      return (
        <figure className="news-block news-block--compact-image">
          <img 
            src={block.image_url} 
            alt={block.image_caption || 'News image'} 
            className="news-block__image-compact"
          />
          {block.image_caption && (
            <figcaption className="news-block__caption-compact">
              {block.image_caption}
            </figcaption>
          )}
        </figure>
      );
    }

    // Default Simple Image Style
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

/**
 * Type definitions for Preset System
 * Backend provides preset keys, frontend handles all styling
 */

/**
 * @typedef {Object} LayoutPreset
 * @property {number} id
 * @property {string} key - Preset key for frontend rendering (e.g., "hero_classic_centered", "gallery_grid")
 * @property {string} name - Human-readable name
 * @property {string} [description] - Optional description
 */

/**
 * @typedef {Object} StylePreset
 * @property {number} id
 * @property {string} key - Card style key (e.g., "card_image_top", "card_price_badge")
 * @property {string} name - Human-readable name
 * @property {string} [description] - Optional description
 */

/**
 * @typedef {Object} ImageStylePreset
 * @property {number} id
 * @property {string} key - Image style key (e.g., "img_rounded", "img_polaroid")
 * @property {string} name - Human-readable name
 * @property {string} [description] - Optional description
 */

/**
 * @typedef {Object} BlockPreset
 * @property {number} id
 * @property {string} key - News block style key (e.g., "news_simple", "news_banner")
 * @property {string} name - Human-readable name
 * @property {string} [description] - Optional description
 */

/**
 * @typedef {Object} PageThemePreset
 * @property {number} id
 * @property {string} key - Theme key (e.g., "theme_modern", "theme_classic")
 * @property {string} name - Human-readable name
 * @property {string} [description] - Optional description
 */

/**
 * Section with layout preset
 * @typedef {Object} PresetSection
 * @property {number} id
 * @property {string} section_type
 * @property {LayoutPreset} [layout_preset]
 * @property {number} position
 * @property {boolean} is_active
 * @property {string} name
 */

/**
 * Card with style preset
 * @typedef {Object} PresetCard
 * @property {number} id
 * @property {string} title
 * @property {string} [subtitle]
 * @property {string} [description]
 * @property {string|null} [image_url]
 * @property {StylePreset} [style_preset]
 * @property {number} sort_order
 */

/**
 * Gallery image with style preset
 * @typedef {Object} PresetGalleryImage
 * @property {number} id
 * @property {string} image_url
 * @property {string} [caption]
 * @property {string} [alt_text]
 * @property {ImageStylePreset} [image_style_preset]
 * @property {number} sort_order
 */

/**
 * News block with preset
 * @typedef {Object} PresetNewsBlock
 * @property {number} id
 * @property {'text'|'image'} block_type
 * @property {string} [body]
 * @property {string|null} [image_url]
 * @property {BlockPreset} [block_preset]
 * @property {number} sort_order
 */

/**
 * Hero Layout Variants
 */
export const HERO_VARIANTS = {
  CLASSIC_CENTERED: 'hero_classic_centered',
  SPLIT_IMAGE_LEFT: 'hero_split_image_left',
  SPLIT_IMAGE_RIGHT: 'hero_split_image_right',
  IMAGE_BACKGROUND: 'hero_image_background',
  FULLSCREEN_VIDEO: 'hero_fullscreen_video',
  MINIMAL: 'hero_minimal',
  SPLIT_DIAGONAL: 'hero_split_diagonal',
};

/**
 * Gallery Layout Variants
 */
export const GALLERY_VARIANTS = {
  GRID: 'gallery_grid',
  MASONRY: 'gallery_masonry',
  CAROUSEL: 'gallery_carousel',
  LIGHTBOX: 'gallery_lightbox',
  GRID_2COL: 'gallery_grid_2col',
  GRID_4COL: 'gallery_grid_4col',
};

/**
 * List/Cards Layout Variants
 */
export const LIST_VARIANTS = {
  GRID_3COL: 'list_grid_3col',
  GRID_2COL: 'list_grid_2col',
  GRID_4COL: 'list_grid_4col',
  HORIZONTAL_SCROLL: 'list_horizontal_scroll',
  VERTICAL_LIST: 'list_vertical_list',
  FEATURED_GRID: 'list_featured_grid',
};

/**
 * News Layout Variants
 */
export const NEWS_VARIANTS = {
  TIMELINE: 'news_timeline',
  GRID: 'news_grid',
  FEATURED: 'news_featured',
  COMPACT: 'news_compact',
  MAGAZINE: 'news_magazine',
};

/**
 * Card Style Variants
 */
export const CARD_STYLES = {
  IMAGE_TOP: 'card_image_top',
  TEXT_ONLY: 'card_text_only',
  PRICE_BADGE: 'card_price_badge',
  WITH_ICON: 'card_with_icon',
  HORIZONTAL: 'card_horizontal',
  OVERLAY: 'card_overlay',
  MINIMAL: 'card_minimal',
  FEATURED: 'card_featured',
};

/**
 * Image Style Variants
 */
export const IMAGE_STYLES = {
  BORDERLESS: 'img_borderless',
  ROUNDED: 'img_rounded',
  CIRCLE: 'img_circle',
  POLAROID: 'img_polaroid',
  SHADOW: 'img_shadow',
  FRAME: 'img_frame',
  ZOOM_HOVER: 'img_zoom_hover',
};

/**
 * News Block Style Variants
 */
export const NEWS_BLOCK_STYLES = {
  SIMPLE: 'news_simple',
  COMPACT: 'news_compact',
  BANNER: 'news_banner',
  HIGHLIGHT: 'news_highlight',
  CALLOUT: 'news_callout',
  QUOTE: 'news_quote',
};

// Empty export to make this a module
export {};

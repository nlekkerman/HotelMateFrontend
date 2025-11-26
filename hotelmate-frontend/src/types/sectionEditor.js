/**
 * Type definitions for Section-Based Page Editor
 * Using JSDoc comments for type checking in JavaScript
 */

/**
 * @typedef {Object} Hotel
 * @property {number} id
 * @property {string} name
 * @property {string} slug
 * @property {string} [tagline]
 * @property {string} [city]
 * @property {string} [country]
 */

/**
 * @typedef {Object} HeroData
 * @property {number} id
 * @property {string} hero_title
 * @property {string} hero_text
 * @property {string|null} hero_image_url
 * @property {string|null} hero_logo_url
 */

/**
 * @typedef {Object} GalleryImage
 * @property {number} id
 * @property {number} gallery
 * @property {string} image_url
 * @property {string} [caption]
 * @property {string} [alt_text]
 * @property {number} sort_order
 */

/**
 * @typedef {Object} GalleryContainer
 * @property {number} id
 * @property {number} section
 * @property {string} name
 * @property {number} sort_order
 * @property {GalleryImage[]} [images]
 */

/**
 * @typedef {Object} Card
 * @property {number} id
 * @property {number} list_container
 * @property {string} title
 * @property {string} [subtitle]
 * @property {string} [description]
 * @property {string|null} [image_url]
 * @property {number} sort_order
 */

/**
 * @typedef {Object} ListContainer
 * @property {number} id
 * @property {number} section
 * @property {string} title
 * @property {number} sort_order
 * @property {Card[]} [cards]
 */

/**
 * @typedef {Object} ContentBlock
 * @property {number} id
 * @property {number} news_item
 * @property {'text'|'image'} block_type
 * @property {string} [body] - For text blocks
 * @property {string|null} [image_url] - For image blocks
 * @property {'full_width'|'left'|'right'|'inline_grid'} [image_position]
 * @property {string} [image_caption]
 * @property {number} sort_order
 */

/**
 * @typedef {Object} NewsItem
 * @property {number} id
 * @property {number} section
 * @property {string} title
 * @property {string} date
 * @property {string} [summary]
 * @property {number} sort_order
 * @property {ContentBlock[]} [content_blocks]
 */

/**
 * @typedef {Object} Section
 * @property {number} id
 * @property {number} hotel
 * @property {number} position
 * @property {boolean} is_active
 * @property {string} name
 * @property {'hero'|'gallery'|'list'|'news'} section_type
 * @property {HeroData} [hero_data]
 * @property {GalleryContainer[]} [galleries]
 * @property {ListContainer[]} [lists]
 * @property {NewsItem[]} [news_items]
 */

/**
 * @typedef {Object} PageData
 * @property {Hotel} hotel
 * @property {Section[]} sections
 */

// Empty export to make this a module
export {};

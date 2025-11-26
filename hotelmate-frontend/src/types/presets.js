/**
 * Type definitions for Style Variant System
 * Backend provides numeric style_variant (1-5), frontend handles all styling
 * Each variant number represents a cohesive design family across ALL section types
 */

/**
 * Section with style variant
 * @typedef {Object} StyledSection
 * @property {number} id
 * @property {string} section_type - 'hero', 'gallery', 'list', 'news', 'footer'
 * @property {number} style_variant - Numeric style variant (1-5)
 * @property {number} position
 * @property {boolean} is_active
 * @property {string} name
 */

/**
 * Page data with global style variant
 * @typedef {Object} PageData
 * @property {number} [global_style_variant] - Global style variant for entire page (1-5)
 * @property {StyledSection[]} sections - Array of sections with their style variants
 */

/**
 * Style Variant Constants
 * Each number (1-5) represents a cohesive design family
 */
export const STYLE_VARIANTS = {
  PRESET_1: 1, // Light, rounded, blue accent, clean
  PRESET_2: 2, // Dark, gold accent, elegant
  PRESET_3: 3, // Minimal, monochrome, modern
  PRESET_4: 4, // Colorful, playful, rounded
  PRESET_5: 5, // Professional, grid-based, structured
};

/**
 * Style Variant Names for UI
 */
export const STYLE_VARIANT_NAMES = {
  1: 'Preset 1 - Clean & Modern',
  2: 'Preset 2 - Dark & Elegant',
  3: 'Preset 3 - Minimal & Sleek',
  4: 'Preset 4 - Vibrant & Playful',
  5: 'Preset 5 - Professional & Structured',
};

/**
 * Design System per Preset
 * 
 * PRESET 1: Light, Rounded, Blue
 * - Light backgrounds (#f8f9fa)
 * - Rounded corners (border-radius: 12px)
 * - Primary color: blue (#007bff)
 * - Hero: centered with image below
 * - Gallery: 3-column grid
 * - List: 3 cards with shadows
 * - News: timeline layout
 * - Footer: simple centered
 * 
 * PRESET 2: Dark, Gold, Elegant
 * - Dark backgrounds (#1a1a1a, #2d2d2d)
 * - Gold accents (#d4af37)
 * - Hero: full-width background image
 * - Gallery: masonry layout
 * - List: vertical stacked with borders
 * - News: featured with large first item
 * - Footer: 3-column dark
 * 
 * PRESET 3: Minimal, Monochrome
 * - White/light gray (#ffffff, #fafafa)
 * - Black text (#000000)
 * - Thin borders (1px)
 * - Hero: minimal text-only
 * - Gallery: 2-column grid with spacing
 * - List: horizontal scroll
 * - News: compact list
 * - Footer: minimal single line
 * 
 * PRESET 4: Vibrant, Playful
 * - Bright colors (multi-color palette)
 * - Heavy rounded corners (border-radius: 20px)
 * - Hero: split with diagonal
 * - Gallery: 4-column colorful grid
 * - List: 4-column with overlays
 * - News: magazine grid layout
 * - Footer: colorful boxes
 * 
 * PRESET 5: Professional, Structured
 * - Corporate blue/gray (#2c3e50, #34495e)
 * - Sharp edges (border-radius: 4px)
 * - Hero: split left/right
 * - Gallery: structured 4-column
 * - List: featured grid (large + small)
 * - News: grid layout
 * - Footer: structured 4-column
 */

// Empty export to make this a module
export {};

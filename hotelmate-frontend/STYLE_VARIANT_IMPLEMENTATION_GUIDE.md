# Style Variant System - Implementation Guide

## Overview

The frontend now uses a **numeric style_variant system (1-5)** where each number represents a cohesive design family across ALL section types. This replaces the previous preset key-based system.

## Key Concept

- **One variant number = One design family across all sections**
- When `style_variant = 3`, every section type (hero, gallery, list, news, footer) uses its "Preset 3" style
- This ensures visual consistency across the entire page

## Data Structure

### From Backend API

```javascript
{
  "global_style_variant": 2,  // Optional: page-level default
  "sections": [
    {
      "id": 1,
      "section_type": "hero",
      "position": 0,
      "style_variant": 2,  // 1-5
      "is_active": true,
      "hero_data": { ... }
    },
    {
      "id": 2,
      "section_type": "gallery",
      "position": 1,
      "style_variant": 2,  // 1-5
      "galleries": [ ... ]
    }
    // ... more sections
  ]
}
```

## Design System - 5 Preset Families

### Preset 1: Clean & Modern
- **Theme**: Light, rounded, blue accent
- **Colors**: Light backgrounds (#f8f9fa), Primary blue (#007bff)
- **Style**: Rounded corners (12px), shadows
- **Hero**: Centered with image below
- **Gallery**: 3-column grid
- **List**: 3 cards with shadows
- **News**: Timeline layout
- **Footer**: Simple centered

### Preset 2: Dark & Elegant
- **Theme**: Dark, sophisticated, gold accents
- **Colors**: Dark backgrounds (#1a1a1a, #2d2d2d), Gold (#d4af37)
- **Style**: Elegant borders, shadows
- **Hero**: Full-width background image
- **Gallery**: Masonry layout
- **List**: Vertical stacked with borders
- **News**: Featured with large first item
- **Footer**: 3-column dark

### Preset 3: Minimal & Sleek
- **Theme**: Monochrome, minimal, spacious
- **Colors**: White/light gray (#ffffff, #fafafa), Black text
- **Style**: Thin borders (1px), lots of whitespace
- **Hero**: Minimal text-only
- **Gallery**: 2-column grid with spacing
- **List**: Horizontal scroll
- **News**: Compact list
- **Footer**: Minimal single line

### Preset 4: Vibrant & Playful
- **Theme**: Colorful, fun, rounded
- **Colors**: Multi-color palette, bright colors
- **Style**: Heavy rounded corners (20px), overlays
- **Hero**: Split with diagonal
- **Gallery**: 4-column colorful grid
- **List**: 4-column with overlays
- **News**: Magazine grid layout
- **Footer**: Colorful boxes

### Preset 5: Professional & Structured
- **Theme**: Corporate, structured, organized
- **Colors**: Corporate blue/gray (#2c3e50, #34495e)
- **Style**: Sharp edges (4px radius), grids
- **Hero**: Split left/right
- **Gallery**: Structured 4-column
- **List**: Featured grid (large + small)
- **News**: Grid layout
- **Footer**: Structured 4-column

## Component Implementation

### Pattern for All Section Components

```javascript
const SectionPreset = ({ section, ...props }) => {
  const variant = section.style_variant ?? 1; // Default to Preset 1

  // Preset 1
  if (variant === 1) {
    return (
      <section className="section section--preset-1">
        {/* Preset 1 implementation */}
      </section>
    );
  }

  // Preset 2
  if (variant === 2) {
    return (
      <section className="section section--preset-2">
        {/* Preset 2 implementation */}
      </section>
    );
  }

  // ... Presets 3, 4, 5 ...

  // Fallback to Preset 1
  return <Preset1Component />;
};
```

## Available Components

### Section Renderers
Located in `/src/components/presets/`

- `HeroSectionPreset.jsx` - Hero sections with 5 variants
- `GallerySectionPreset.jsx` - Gallery sections with 5 variants
- `ListSectionPreset.jsx` - List/cards sections with 5 variants
- `NewsSectionPreset.jsx` - News sections with 5 variants
- `FooterSectionPreset.jsx` - Footer sections with 5 variants

### Sub-Components
- `CardRenderer.jsx` - Renders individual cards (used by ListSection)
- `GalleryImageRenderer.jsx` - Renders gallery images
- `NewsBlockRenderer.jsx` - Renders news content blocks

## Usage in Pages

### HotelPublicPage

```javascript
import {
  HeroSectionPreset,
  GallerySectionPreset,
  ListSectionPreset,
  NewsSectionPreset,
  FooterSectionPreset
} from '@/components/presets';

const renderSection = (section) => {
  switch (section.section_type) {
    case 'hero':
      return <HeroSectionPreset section={section} hotel={hotel} />;
    case 'gallery':
      return <GallerySectionPreset section={section} />;
    case 'list':
      return <ListSectionPreset section={section} />;
    case 'news':
      return <NewsSectionPreset section={section} />;
    case 'footer':
      return <FooterSectionPreset section={section} hotel={hotel} />;
    default:
      return null;
  }
};
```

## CSS Classes Structure

Each preset uses BEM naming with preset numbers:

```css
/* Hero Preset 1 */
.hero--preset-1 { /* Clean & Modern styles */ }

/* Hero Preset 2 */
.hero--preset-2 { /* Dark & Elegant styles */ }

/* Gallery Preset 1 */
.gallery--preset-1 { /* Clean & Modern styles */ }

/* Gallery Preset 2 */
.gallery--preset-2 { /* Dark & Elegant styles */ }

/* ... and so on */
```

## Staff UI Features (To Be Implemented)

### Page-Level Style Selector

```javascript
// Apply style to entire page
POST /api/public-page/apply-page-style/
{
  "style_variant": 3
}
```

This sets `style_variant = 3` on all sections, giving consistent look.

### Section-Level Override

```javascript
// Override individual section
PATCH /api/sections/{section_id}/
{
  "style_variant": 4
}
```

Allows fine-tuning while maintaining page-level defaults.

### UI Component Example

```jsx
<Form.Select 
  value={pageData.global_style_variant || 1}
  onChange={(e) => applyPageStyle(e.target.value)}
>
  <option value="1">Preset 1 - Clean & Modern</option>
  <option value="2">Preset 2 - Dark & Elegant</option>
  <option value="3">Preset 3 - Minimal & Sleek</option>
  <option value="4">Preset 4 - Vibrant & Playful</option>
  <option value="5">Preset 5 - Professional & Structured</option>
</Form.Select>
```

## Type Definitions

Located in `/src/types/presets.js`

```javascript
export const STYLE_VARIANTS = {
  PRESET_1: 1,
  PRESET_2: 2,
  PRESET_3: 3,
  PRESET_4: 4,
  PRESET_5: 5,
};

export const STYLE_VARIANT_NAMES = {
  1: 'Preset 1 - Clean & Modern',
  2: 'Preset 2 - Dark & Elegant',
  3: 'Preset 3 - Minimal & Sleek',
  4: 'Preset 4 - Vibrant & Playful',
  5: 'Preset 5 - Professional & Structured',
};
```

## Benefits

1. **Consistency**: One number = one design language across entire page
2. **Simplicity**: Easy to understand and maintain
3. **Flexibility**: Can override individual sections when needed
4. **Scalability**: Easy to add new section types
5. **No Backend Logic**: Backend only stores numbers, all styling in frontend

## Next Steps

### CSS Implementation (Tomorrow)
- Create comprehensive CSS file for all 5 presets
- Implement BEM naming for each variant
- Ensure responsive design for all presets
- Add transitions and animations

### Staff UI Implementation
- Page-level style selector
- Section-level override controls
- Preview functionality
- Style variant management interface

## File Structure

```
src/
├── components/
│   └── presets/
│       ├── index.js (exports all components)
│       ├── HeroSectionPreset.jsx
│       ├── GallerySectionPreset.jsx
│       ├── ListSectionPreset.jsx
│       ├── NewsSectionPreset.jsx
│       ├── FooterSectionPreset.jsx
│       ├── CardRenderer.jsx
│       ├── GalleryImageRenderer.jsx
│       └── NewsBlockRenderer.jsx
├── types/
│   └── presets.js (constants and type definitions)
└── pages/
    └── hotels/
        └── HotelPublicPage.jsx (uses preset components)
```

## Testing Checklist

- [ ] All 5 presets render correctly for hero sections
- [ ] All 5 presets render correctly for gallery sections
- [ ] All 5 presets render correctly for list sections
- [ ] All 5 presets render correctly for news sections
- [ ] All 5 presets render correctly for footer sections
- [ ] Default fallback to Preset 1 works
- [ ] Mixed variants on same page work (e.g., hero=2, gallery=3)
- [ ] Responsive design works for all presets
- [ ] Staff can change page-level style
- [ ] Staff can override individual section styles

## Notes

- CSS styling will be implemented tomorrow
- All components are JavaScript/JSX ready
- Backend only needs to provide `style_variant` as a number (1-5)
- Frontend handles all visual rendering logic

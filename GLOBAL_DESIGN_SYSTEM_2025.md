# Global Design System 2025 - Implementation Complete

## Overview
Modern 2025 hotel-tech UI with clean, sharp, minimal aesthetics. Consistent spacing, motion, and depth across all 5 presets.

---

## 1. Corner Radius Rules ✅

### Cards (Room cards, news cards, list cards)
- **Border-radius:** `8px` or `10px` max
- **Variable:** `var(--radius-card)` = `8px`
- **NEVER use:** `16px`, `20px`, `24px`, or `999px` on cards

### Sections & Panels
- **Border-radius:** `10px–12px`
- **Variables:**
  - `var(--radius-section)` = `10px` (standard sections)
  - `var(--radius-panel)` = `12px` (modals, special panels)
- **Hero panels:** Can go to `14px` max for special cases

### Buttons
- **Primary/Secondary/CTA:** `border-radius: var(--radius-pill)` = `999px` (pill shape)
- **Alternative actions:** `var(--radius-button-alt)` = `10px`
- **Chips/Tags:** Can use `var(--radius-pill)` = `999px`

### Inputs
- **Border-radius:** `var(--radius-input)` = `8px` (neat, not pill)

---

## 2. Spacing & Layout ✅

### Spacing Variables (Unchanged)
```css
--space-xs: 0.25rem;   /* 4px */
--space-sm: 0.5rem;    /* 8px */
--space-md: 1rem;      /* 16px */
--space-lg: 2rem;      /* 32px */
--space-xl: 3rem;      /* 48px */
--space-2xl: 4rem;     /* 64px */
```

### Section Padding
```css
padding-block: var(--space-2xl);           /* 4rem */
padding-inline: clamp(1.5rem, 4vw, 4rem);  /* Responsive */
```

### Card Padding
- **Main cards:** `padding: var(--space-lg)` (2rem)
- **Compact cards:** `padding: var(--space-md)` (1rem)
- **Gap between elements:** `var(--space-sm)` to `var(--space-md)`

---

## 3. Typography ✅

### Existing Font Families
| Preset | Heading | Subtitle | Body |
|--------|---------|----------|------|
| **1. Clean** | Inter | Inter | Inter |
| **2. Elegant** | Playfair Display | Inter | Inter |
| **3. Minimal** | Poppins | Poppins | Poppins |
| **4. Playful** | Baloo 2 | Poppins | Poppins |
| **5. Pro** | Roboto Condensed | Inter | Inter |

### Weight Rules
- **Card titles:** 600–700
- **Body text:** 400
- **Section titles:** 700
- **Preset 5 titles:** 700 + uppercase + letter-spacing: 0.08em

---

## 4. Shadows & Depth ✅

### Modern Shadow System (Tight & Clean)
```css
--shadow-soft: 0 2px 8px rgba(0, 0, 0, 0.15);
--shadow-card: 0 4px 12px rgba(0, 0, 0, 0.25);
--shadow-card-hover: 0 6px 18px rgba(0, 0, 0, 0.35);
--shadow-mid: 0 8px 24px rgba(0, 0, 0, 0.3);
--shadow-strong: 0 12px 32px rgba(0, 0, 0, 0.4);
```

### Cards & Panels
- **Base:** `var(--shadow-card)`
- **Hover:** `var(--shadow-card-hover)` + `translateY(-2px to -3px)`
- **No inner shadows** (unless very subtle)

---

## 5. Motion & Transitions ✅

### Transition Variables
```css
--transition-fast: 0.15s ease;
--transition-base: 0.3s ease;
--transition-slow: 0.5s ease;
--transition-properties: transform, box-shadow, background-color, color, border-color, opacity;
```

### Hover Effects
- **Cards/Buttons:** `transform: translateY(-2px to -3px)` OR `scale(1.02)` max
  - **Not both together everywhere**
- **Active/Click:** `transform: scale(0.97–0.98)`

### Rotation Rules
- **Preset 4 only:** Tiny rotations (`max 1deg`)
- **All other presets:** `0deg` rotation

---

## 6. Buttons (Shared Across Presets) ✅

### Base Button Classes
```css
.btn, .btn-primary, .btn-secondary {
  font-weight: 600;
  padding-inline: 1.1rem–1.4rem;
  padding-block: 0.6rem–0.8rem;
  letter-spacing: 0.02em;
}
```

### Primary Buttons
- **Border-radius:** `var(--radius-pill)` (999px) for CTAs
- **Background:** Preset primary color
- **Hover:** `scale(1.02–1.04)` + stronger shadow

### Secondary Buttons
- **Style:** Outline or subtle fill
- **Radius:** Same as primary

### Ghost/Tertiary
- **Background:** Transparent
- **Text:** Colored
- **Hover:** Subtle background

---

## 7. Placeholders ("Add card/list/gallery/news") ✅

### All Placeholder Tiles
```css
border-radius: var(--radius-card);  /* 8px */
border: 2px dashed [preset accent color];
background: [slightly tinted section background];
```

### Hover Effects
```css
transform: translateY(-2px) scale(1.03);
border-color: [stronger accent];
box-shadow: var(--shadow-card);
```

### Implementation
- File: `modals-placeholders.css`
- Classes: `.placeholder-tile`, `.placeholder-tile--preset-{1-5}`
- Variants: `.add-card-placeholder`, `.add-list-placeholder`, `.add-gallery-placeholder`, `.add-news-placeholder`

---

## 8. Modals ✅

### Overlay
```css
position: fixed;
background: rgba(0, 0, 0, 0.55);
backdrop-filter: blur(6px);  /* with fallback */
```

### Modal Panel
```css
max-width: 640px (default) | 800px (large) | 480px (small);
border-radius: var(--radius-panel);  /* 12px */
padding: var(--space-xl);
box-shadow: var(--shadow-strong);
```

### Animation
```css
/* Overlay */
opacity: 0 → 1;

/* Panel */
opacity: 0 → 1;
transform: scale(0.96) → scale(1);
timing: var(--transition-base);
```

### Close Button
```css
width: 32px;
height: 32px;
border-radius: var(--radius-pill);  /* Pill shape */
```

---

## 9. Sections & Cards Alignment ✅

### Color Consistency Rules
- All sections within a preset use the same palette family (same "temperature")
- All cards, headers, buttons, placeholders, and modals use that preset's colors:
  - Primary
  - Secondary
  - Neutral tones
- **No mixing** of other presets' colors

---

## 10. Don'ts (Critical) ⛔

### Border-Radius
- ❌ NO large radius (`16px+`, `24px`, `32px`) on cards/sections
- ❌ NO `border-radius: 999px` on cards or panels
- ✅ Only buttons/chips/badges can be pill-shaped

### Colors
- ❌ NO mixing random neon or unrelated colors between presets
- ✅ Stick to preset's palette

### Animations
- ❌ NO aggressive animations (big bounces, large rotations, long transitions)
- ❌ NO wild rotations (except Preset 4: max 1deg)
- ✅ Keep transforms subtle and smooth

---

## Implementation Files

### Updated Files
1. **`base.css`** - Border radius variables, shadow system, transitions
2. **`buttons.css`** - Pill shapes, padding, hover effects
3. **`component-presets.css`** - Cards, room cards, images, news blocks
4. **`section-presets.css`** - Hero, gallery, list, news, footer sections
5. **`modals-placeholders.css`** - ✨ NEW: Modals and placeholder tiles

### Import Order
```css
@import url('./base.css');                    /* Variables, utilities */
@import url('./section-presets.css');         /* Section styling */
@import url('./component-presets.css');       /* Component styling */
@import url('./header-presets.css');          /* Headers */
@import url('./theme-presets.css');           /* Page themes */
@import url('./buttons.css');                 /* Buttons */
@import url('./modals-placeholders.css');     /* Modals & placeholders */
```

---

## Usage Examples

### Card
```jsx
<div className="card card--preset-1">
  <img className="card-img-top" src="..." alt="..." />
  <div className="card-body">
    <h5 className="card-title">Title</h5>
    <p className="card-text">Description</p>
  </div>
</div>
```

### Button (Primary CTA)
```jsx
<button className="room-card-book-button room-card-book-button--primary">
  Book Now
</button>
```

### Modal
```jsx
<div className="modal-overlay">
  <div className="modal-panel modal-panel--preset-1">
    <div className="modal-header">
      <h2 className="modal-title">Modal Title</h2>
      <button className="modal-close-btn">×</button>
    </div>
    <div className="modal-body">
      Modal content here...
    </div>
    <div className="modal-footer">
      <button className="btn btn-secondary">Cancel</button>
      <button className="btn btn-primary">Confirm</button>
    </div>
  </div>
</div>
```

### Placeholder Tile
```jsx
<div className="placeholder-tile placeholder-tile--preset-1">
  <div className="placeholder-icon">+</div>
  <h3 className="placeholder-text">Add New Card</h3>
  <p className="placeholder-subtitle">Click to create</p>
</div>
```

---

## Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- `backdrop-filter` with fallback for older browsers
- CSS custom properties (CSS variables)
- CSS Grid & Flexbox
- Reduced motion support via `@media (prefers-reduced-motion: reduce)`

---

## Accessibility ✅
- Focus states on all interactive elements
- Proper ARIA attributes for modals
- Keyboard navigation support
- Color contrast ratios meet WCAG 2.1 AA standards
- Reduced motion support

---

## Next Steps
1. ✅ All CSS files updated with new design system
2. ✅ Modals and placeholder components created
3. ✅ Import structure updated
4. 🔄 **Test in browser** to verify visual consistency
5. 🔄 Update React components to use new classes (if needed)
6. 🔄 Update documentation in Storybook/design docs

---

## Quick Reference Card

| Element | Border-Radius | Padding | Shadow |
|---------|--------------|---------|--------|
| **Card** | 8px | var(--space-lg) | var(--shadow-card) |
| **Section** | 10px | var(--space-2xl) | var(--shadow-soft) |
| **Modal** | 12px | var(--space-xl) | var(--shadow-strong) |
| **Button** | 999px (pill) | 0.7rem / 1.3rem | var(--shadow-card) |
| **Input** | 8px | - | - |
| **Placeholder** | 8px | var(--space-xl) | var(--shadow-card) |

---

**Status:** ✅ Implementation Complete
**Date:** November 27, 2025
**Version:** 1.0.0

# Custom Button Styling Guide for HotelMate

## Overview
All button styles have been added to `/src/styles/presets.css`. These styles are preset-aware and change based on the `style_variant` (1-5) of each section.

---

## Button Class System

### Base Class
All custom buttons should include:
- `btn` (Bootstrap base)
- `btn-hm` (HotelMate custom base)
- Plus ONE role class (see below)

**Example:**
```jsx
<button className="btn btn-hm btn-hero">Book Now</button>
```

---

## Button Role Classes

### 1. **Hero Buttons** (`.btn-hero`)
**Use in:** Hero sections (main page CTA)
**Parent selector:** `.hero--preset-{1-5}`

**Visual by Preset:**
- **Preset 1:** Blue gradient, heavy shadow
- **Preset 2:** Gold gradient, elegant shadow
- **Preset 3:** Transparent with border
- **Preset 4:** Pink-orange gradient, playful
- **Preset 5:** Green gradient, professional

**Example:**
```jsx
// In HeroSectionPreset.jsx
<button className="btn btn-hm btn-hero">
  Book Your Stay
</button>
```

---

### 2. **Gallery Buttons** (`.btn-gallery`)
**Use in:** Gallery sections (filters, "View all")
**Parent selector:** `.gallery--preset-{1-5}`

**Visual by Preset:**
- **Preset 1:** Transparent with white border
- **Preset 2:** Gold-tinted background
- **Preset 3:** Underlined link style
- **Preset 4:** Blue-tinted background
- **Preset 5:** Subtle transparent border

**Example:**
```jsx
// In GallerySectionPreset.jsx
<button className="btn btn-hm btn-gallery">
  View Full Gallery
</button>
```

---

### 3. **List Buttons** (`.btn-list`)
**Use in:** List/Cards sections (main section actions)
**Parent selector:** `.list-section--preset-{1-5}` or `.list--preset-{1-5}`

**Visual by Preset:**
- **Preset 1:** Solid blue
- **Preset 2:** Gold outline
- **Preset 3:** Dark with subtle border
- **Preset 4:** Gradient pink-orange
- **Preset 5:** Green outline

**Example:**
```jsx
// In ListSectionPreset.jsx - section header
<button className="btn btn-hm btn-list">
  Add List
</button>
```

---

### 4. **Card Buttons** (`.btn-card`)
**Use in:** Inside individual cards (card-level actions)
**Parent selector:** `.list-section--preset-{1-5}` or `.list--preset-{1-5}`

**Visual by Preset:**
- **Preset 1:** Dark background, subtle border
- **Preset 2:** Gold outline, transparent
- **Preset 3:** Underlined link style
- **Preset 4:** Pink-tinted background
- **Preset 5:** Green outline

**Example:**
```jsx
// In CardRenderer.jsx
<button className="btn btn-hm btn-card">
  View Details
</button>
```

---

### 5. **News Buttons** (`.btn-news`)
**Use in:** News sections ("Read more" links)
**Parent selector:** `.news-section--preset-{1-5}`

**Visual by Preset:**
- **Preset 1, 3, 5:** Blue link style
- **Preset 2:** Gold link style
- **Preset 4:** Pink pill button

**Example:**
```jsx
// In NewsSectionPreset.jsx or NewsArticleStructured.jsx
<button className="btn btn-hm btn-news">
  Read Full Article
</button>
```

---

### 6. **Footer Buttons** (`.btn-footer`)
**Use in:** Footer sections (links, CTAs)
**Parent selector:** `.footer--preset-{1-5}`

**Visual by Preset:**
- **Preset 1, 3:** Subtle text link
- **Preset 2:** Gold text link
- **Preset 4:** Dark pill button
- **Preset 5:** Green solid button

**Example:**
```jsx
// In FooterSectionPreset.jsx
<button className="btn btn-hm btn-footer">
  Contact Us
</button>
```

---

### 7. **Editor Buttons** (`.btn-hm-editor`)
**Use in:** Staff-only "Add" buttons (universal)
**Parent:** Any section (not preset-specific)

**Visual:** Dashed border, muted text, becomes gold on hover

**Example:**
```jsx
// In ListSectionPreset.jsx - Add Card placeholder
<button className="btn btn-hm btn-hm-editor">
  <i className="bi bi-plus-circle me-2"></i>
  Add Card
</button>
```

---

### 8. **Primary CTA** (`.btn-hm-primary`)
**Use in:** Main call-to-action (universal)
**Parent:** Any section (not preset-specific)

**Visual:** Gold gradient with strong shadow

**Example:**
```jsx
// In HeroSectionPreset.jsx or any main CTA
<button className="btn btn-hm btn-hm-primary">
  Book Now
</button>
```

---

### 9. **Section CTA** (`.btn-hm-section`)
**Use in:** Section headers (universal)
**Parent:** Any section (not preset-specific)

**Visual:** Transparent with white border

**Example:**
```jsx
// In any section header
<button className="btn btn-hm btn-hm-section">
  View All
</button>
```

---

## Implementation Checklist

### ✅ Components That Need Button Updates

#### 1. **ListSectionPreset.jsx**
- [ ] "Add List" buttons → `.btn btn-hm btn-hm-editor`
- [ ] "Add Card" placeholder → Keep as is (it's a div with custom styling)
- [ ] Modal "Create List" button → `.btn btn-hm btn-hm-primary`
- [ ] Modal "Create Card" button → `.btn btn-hm btn-hm-primary`

#### 2. **CardRenderer.jsx**
- [ ] Add action buttons inside cards → `.btn btn-hm btn-card`
  ```jsx
  <button className="btn btn-hm btn-card">View Offer</button>
  ```

#### 3. **HeroSectionPreset.jsx**
- [ ] Add main CTA button → `.btn btn-hm btn-hero`
  ```jsx
  <button className="btn btn-hm btn-hero">Book Your Stay</button>
  ```

#### 4. **GallerySectionPreset.jsx**
- [ ] "View Full Gallery" button → `.btn btn-hm btn-gallery`
- [ ] Filter buttons → `.btn btn-hm btn-gallery`

#### 5. **NewsSectionPreset.jsx**
- [ ] "Read more" links → `.btn btn-hm btn-news`

#### 6. **NewsArticleStructured.jsx**
- [ ] "Read more" or "Continue reading" → `.btn btn-hm btn-news`

#### 7. **FooterSectionPreset.jsx** (if exists)
- [ ] Footer links/buttons → `.btn btn-hm btn-footer`

---

## Key Principles

1. **Always use both `btn` and `btn-hm`** together
2. **Add ONE role class** (btn-hero, btn-list, btn-card, etc.)
3. **Parent section class determines the look** (e.g., `.hero--preset-2 .btn-hero`)
4. **Editor buttons are universal** (`.btn-hm-editor` doesn't change per preset)
5. **No positioning styles** - buttons only control appearance, not layout

---

## Quick Reference Table

| Component | Button Location | Classes |
|-----------|----------------|---------|
| Hero | Main CTA | `btn btn-hm btn-hero` |
| Gallery | Section header | `btn btn-hm btn-gallery` |
| List Section | Section header | `btn btn-hm btn-list` |
| Card (inside List) | Card footer | `btn btn-hm btn-card` |
| News | Read more link | `btn btn-hm btn-news` |
| Footer | Footer links | `btn btn-hm btn-footer` |
| Staff Add buttons | Anywhere | `btn btn-hm btn-hm-editor` |
| Main CTAs | Anywhere | `btn btn-hm btn-hm-primary` |
| Section CTAs | Anywhere | `btn btn-hm btn-hm-section` |

---

## Testing

After applying button classes, test each preset (1-5) to verify:
1. Buttons change appearance per preset
2. Hover states work correctly
3. Colors align with section theme
4. No layout/positioning issues

---

## Notes

- All styles are in `/src/styles/presets.css`
- Button styles respect the `--preset-{1-5}` parent class
- Editor buttons (`.btn-hm-editor`) look the same across all presets
- Primary/Section CTAs (`.btn-hm-primary`, `.btn-hm-section`) are universal

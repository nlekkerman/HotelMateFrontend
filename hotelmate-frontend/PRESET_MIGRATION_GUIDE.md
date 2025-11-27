# Preset System Migration Guide

## 🎯 Quick Start

### Option 1: Use New System Immediately (Recommended)
```javascript
// src/main.jsx
- import "./styles/presets.css";
+ import "./styles/presets/index.css";
```

### Option 2: Gradual Migration (Safest)
```javascript
// Keep both during transition
import "./styles/presets.css"; // Old (for components not yet migrated)
import "./styles/presets/index.css"; // New (for migrated components)
```

## 📋 Component Migration Checklist

### Step 1: Identify Components Using Presets

**Search for:**
- `data-preset="1"`
- `data-preset="2"`
- `data-preset="3"`
- `data-preset="4"`
- `data-preset="5"`

### Step 2: Convert to BEM Classes

| Old Syntax | New Syntax |
|-----------|-----------|
| `<div data-preset="1" className="hero">` | `<div className="hero hero--preset-1">` |
| `<section data-preset="2" className="gallery">` | `<section className="gallery gallery--preset-2">` |
| `<div data-preset="3" className="list">` | `<div className="list list--preset-3">` |
| `<section data-preset="4" className="news-section">` | `<section className="news-section news-section--preset-4">` |
| `<footer data-preset="5">` | `<footer className="footer footer--preset-5">` |

### Step 3: Update Component Files

## 📦 Component-by-Component Migration

### HeroSectionView.jsx

**Before:**
```jsx
<section 
  className="hero" 
  data-preset={section.style_variant || "1"}
  style={...}
>
  <div className="hero__content-centered">
    <h1 className="hero__title">{section.title}</h1>
  </div>
</section>
```

**After:**
```jsx
<section 
  className={`hero hero--preset-${section.style_variant || "1"}`}
>
  <div className="hero__content-centered">
    <h1 className="hero__title">{section.title}</h1>
  </div>
</section>
```

### GallerySectionView.jsx

**Before:**
```jsx
<section 
  className="gallery" 
  data-preset={section.style_variant}
>
  <div className="gallery-image">
    <img src={image.url} className="gallery-image__img" />
  </div>
</section>
```

**After:**
```jsx
<section 
  className={`gallery gallery--preset-${section.style_variant || "1"}`}
>
  <div className="gallery-image">
    <img src={image.url} className="gallery-image__img" />
  </div>
</section>
```

### ListSectionView.jsx

**Before:**
```jsx
<section 
  className="list" 
  data-preset={section.style_variant}
>
  <div className="card">
    {/* Card content */}
  </div>
</section>
```

**After (with optional component preset):**
```jsx
<section 
  className={`list list--preset-${section.style_variant || "1"}`}
>
  {/* Option 1: Inherit section preset */}
  <div className="card">
    {/* Card content */}
  </div>
  
  {/* Option 2: Override with component preset */}
  <div className={`card card--preset-${card.cardPreset || section.style_variant}`}>
    {/* Card content - uses component-specific styling */}
  </div>
</section>
```

### NewsSectionView.jsx

**Before:**
```jsx
<section 
  className="news-section" 
  data-preset={section.style_variant}
>
  <div className="news-article" data-preset={section.style_variant}>
    {/* Article content */}
  </div>
</section>
```

**After:**
```jsx
<section 
  className={`news-section news-section--preset-${section.style_variant || "1"}`}
>
  {/* Option 1: Use news-article (inherits from section) */}
  <div className="news-article">
    {/* Article content */}
  </div>
  
  {/* Option 2: Use news-block preset (component-level override) */}
  <div className={`news-block news-block--preset-${article.blockPreset || section.style_variant}`}>
    {/* Article content - uses component-specific styling */}
  </div>
</section>
```

### FooterSectionView.jsx

**Before:**
```jsx
<footer data-preset={section.style_variant}>
  <a href="/rooms" className="footer-link-rooms">Rooms</a>
</footer>
```

**After:**
```jsx
<footer className={`footer footer--preset-${section.style_variant || "1"}`}>
  <a href="/rooms" className="footer-link-rooms">Rooms</a>
</footer>
```

### RoomsSectionView.jsx

**Before:**
```jsx
<section className="rooms-section-view">
  {rooms.map(room => (
    <RoomCard key={room.id} room={room} preset={cardPreset} />
  ))}
</section>
```

**After:**
```jsx
<section className="rooms-section-view">
  {rooms.map(room => (
    <RoomCard 
      key={room.id} 
      room={room} 
      className={`room-card--preset-${cardPreset.config.preset || "1"}`}
    />
  ))}
</section>
```

### RoomCard.jsx

**Before:**
```jsx
const RoomCard = ({ room, preset }) => {
  return (
    <Card className="room-card">
      {/* Card content */}
      <button className="room-card-book-button">Book Now</button>
    </Card>
  );
};
```

**After:**
```jsx
const RoomCard = ({ room, preset, className = "" }) => {
  const buttonStyle = preset?.config?.button_style || "primary";
  const hoverEffect = preset?.config?.hover_effect || "lift";
  
  return (
    <Card className={`room-card ${className} hover-${hoverEffect}`}>
      {/* Card content */}
      <button className={`room-card-book-button room-card-book-button--${buttonStyle}`}>
        Book Now
      </button>
    </Card>
  );
};
```

### SectionHeader.jsx

**Before:**
```jsx
const SectionHeader = ({ title, subtitle, preset }) => {
  return (
    <div className="section-header">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
  );
};
```

**After:**
```jsx
const SectionHeader = ({ title, subtitle, preset }) => {
  const config = preset?.config || {};
  const {
    text_alignment = 'center',
    title_size = 'large',
    show_subtitle = true,
    show_divider = false,
    divider_style = 'solid',
  } = config;
  
  const presetClass = preset?.key ? `section-header--preset-${preset.key.split('_')[1]}` : '';
  const alignmentClass = text_alignment === 'left' ? 'section-header--left' : '';
  const titleSizeClass = `section-title--${title_size}`;
  
  return (
    <header className={`section-header ${presetClass} ${alignmentClass}`}>
      <h2 className={`section-header__title ${titleSizeClass}`}>
        {title}
      </h2>
      {show_subtitle && subtitle && (
        <p className="section-header__subtitle">{subtitle}</p>
      )}
      {show_divider && (
        <div className={`section-header__divider section-divider--${divider_style}`}></div>
      )}
    </header>
  );
};
```

## 🔍 Testing After Migration

### Visual Testing Checklist

For each migrated component:

1. **Load the page** with preset 1
   - [ ] Layout matches original design
   - [ ] Colors are correct
   - [ ] Fonts are applied properly
   - [ ] Spacing is preserved

2. **Switch to preset 2**
   - [ ] Styling changes correctly
   - [ ] No layout breaks
   - [ ] Buttons update colors

3. **Repeat for presets 3, 4, 5**

4. **Test hover effects**
   - [ ] Cards lift on hover
   - [ ] Images zoom correctly
   - [ ] Buttons show feedback

5. **Test responsive behavior**
   - [ ] Mobile (< 576px)
   - [ ] Tablet (< 768px)
   - [ ] Desktop (> 992px)

6. **Test component overrides**
   - [ ] Component preset class overrides section preset
   - [ ] Example: `.room-card--preset-3` wins over `.rooms--preset-1 .room-card`

### Automated Testing

```javascript
// Test preset class application
describe('Preset System Migration', () => {
  it('applies BEM preset classes correctly', () => {
    const { container } = render(
      <HeroSection section={{ style_variant: "2" }} />
    );
    
    const hero = container.querySelector('.hero');
    expect(hero).toHaveClass('hero--preset-2');
  });
  
  it('component preset overrides section preset', () => {
    const { container } = render(
      <section className="rooms--preset-1">
        <RoomCard className="room-card--preset-3" room={mockRoom} />
      </section>
    );
    
    const card = container.querySelector('.room-card');
    expect(card).toHaveClass('room-card--preset-3');
    
    // Check computed styles to ensure component preset wins
    const cardStyle = window.getComputedStyle(card);
    // Add assertions based on preset-3 specific styles
  });
});
```

## 🚨 Common Migration Issues

### Issue 1: Styles Not Applying

**Problem:**
```jsx
<div className="hero hero--preset-2" /> // No styles
```

**Causes:**
1. Forgot to import new system: `import "./styles/presets/index.css"`
2. Wrong import order (base must come before sections)
3. Typo in preset number

**Solution:**
```javascript
// Check main.jsx or component imports
import "./styles/presets/index.css"; // Correct
// NOT: import "./styles/preset/index.css" (typo)
```

### Issue 2: Component Preset Not Overriding

**Problem:**
```jsx
<section className="rooms--preset-1">
  <div className="room-card room-card--preset-3">
    {/* Looks like preset-1, not preset-3 */}
  </div>
</section>
```

**Causes:**
1. Import order wrong (component-presets.css must come after section-presets.css)
2. More specific selector in section preset
3. Using `!important` in section styles

**Solution:**
```css
/* Check import order in index.css */
@import url('./section-presets.css');    /* First */
@import url('./component-presets.css');  /* Second (wins) */
```

### Issue 3: Old data-preset Still in Code

**Problem:**
```jsx
<div data-preset="1" className="hero hero--preset-1">
  {/* Conflicting preset definitions */}
</div>
```

**Solution:**
```jsx
// Remove data-preset attribute entirely
<div className="hero hero--preset-1">
  {/* Clean BEM only */}
</div>
```

### Issue 4: Dynamic Preset Numbers

**Problem:**
```jsx
// This doesn't work with template literals
className="hero hero--preset-{section.style_variant}"
```

**Solution:**
```jsx
// Use template literals correctly
className={`hero hero--preset-${section.style_variant || "1"}`}

// Or build string
const presetClass = `hero hero--preset-${section.style_variant || "1"}`;
```

## 📊 Migration Progress Tracking

Create a spreadsheet or issue to track:

| Component | File | Status | Tester | Notes |
|-----------|------|--------|--------|-------|
| Hero | HeroSectionView.jsx | ✅ Done | Alice | All 5 presets tested |
| Gallery | GallerySectionView.jsx | ⏳ In Progress | Bob | Preset 3 has spacing issue |
| List | ListSectionView.jsx | ❌ Not Started | - | - |
| News | NewsSectionView.jsx | ❌ Not Started | - | - |
| Footer | FooterSectionView.jsx | ✅ Done | Alice | Tested on mobile |
| Rooms | RoomsSectionView.jsx | ✅ Done | Carol | Component overrides working |
| Room Card | RoomCard.jsx | ✅ Done | Carol | Button styles perfect |
| Section Header | SectionHeader.jsx | ⏳ In Progress | Bob | Divider animation needed |

## ✅ Final Validation

Before removing old `presets.css`:

1. **All components migrated** - No more `data-preset` attributes in codebase
2. **Visual regression tests pass** - Screenshots match original design
3. **No console errors** - Check browser console for CSS errors
4. **Performance stable** - Bundle size didn't increase significantly
5. **Accessibility maintained** - Focus states, reduced motion still work
6. **Cross-browser tested** - Chrome, Firefox, Safari, Edge
7. **Mobile tested** - iOS and Android devices
8. **Staff admin works** - Preset selector and live preview functional

## 🎉 Post-Migration Cleanup

### Remove Old File
```javascript
// main.jsx - After migration complete
- import "./styles/presets.css"; // REMOVE THIS LINE
+ import "./styles/presets/index.css"; // Already imported
```

### Optional: Delete Old File
```bash
# After confirming everything works
rm src/styles/presets.css
```

### Update Documentation
- [ ] Update README with new import path
- [ ] Update Storybook stories with new classes
- [ ] Update component prop types if changed
- [ ] Update design system documentation

---

## 🆘 Need Help?

**Issue:** Can't find what preset class to use  
**Solution:** Check `PRESET_SYSTEM_COMPLETE.md` - section "Usage Guide"

**Issue:** Styles look broken after migration  
**Solution:** Check browser DevTools computed styles, verify import order

**Issue:** Component preset not overriding section  
**Solution:** Check CSS specificity, ensure component-presets.css imported after section-presets.css

**Issue:** Don't know which file to edit  
**Solution:** See file descriptions in `PRESET_SYSTEM_COMPLETE.md`

---

**Happy Migrating! 🚀**

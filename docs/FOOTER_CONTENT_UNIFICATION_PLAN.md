# Footer Content Unification Plan

## Problem: Each preset renders a different subset of data with different class names

Every preset was built independently, so they diverge on three axes:  
1. **What data they show** — some presets omit email, phone, country, or social links entirely  
2. **What HTML class names they use** — the same concept (e.g. "heading") has four different class names  
3. **What the copyright line says** — three different phrasings  

The CSS was written to match those inconsistent class names, so fixing one preset doesn't help the others and adding a new shared rule is hard.

---

## Current state: data shown per preset

| Field | P1 Clean | P2 Dark | P3 Minimal | P4 Vibrant | P5 Structured |
|---|---|---|---|---|---|
| Hotel name | ✅ | ✅ | ✅ | ✅ | ✅ |
| City | ✅ | ✅ | ✅ | ✅ | ✅ |
| Country | ✅ | ✅ | ❌ | ❌ | ✅ |
| Email | ❌ | ✅ | ❌ | ✅ | ✅ |
| Phone | ❌ | ✅ | ❌ | ✅ | ✅ |
| Social links | ❌ | 3 (FB/IG/TW) | ❌ | ❌ | 4 (FB/IG/TW/LI) |
| Quick links (hardcoded) | ❌ | ❌ | ❌ | ❌ | ✅ |
| Copyright year only | — | — | ✅ | — | — |
| Copyright full phrase | ✅ | ✅ | — | partial | ✅ |

### Missing data problems
- **Preset 1** shows no contact info at all — guests cannot reach the hotel
- **Preset 3** shows only name + city — missing country, email, phone, social
- **Preset 4** shows email + phone but drops country and social icons
- **Preset 2** has LinkedIn missing vs Preset 5 (inconsistent social set)
- **Quick links** in Preset 5 are hardcoded strings ("Home", "Rooms", "Facilities", "Contact") not real routes — they all point to `href="#"` and are not connected to actual page anchors

---

## Current state: class name fragmentation

The same semantic concept has a different class name in every preset:

| Concept | P1 | P2 | P3 | P4 | P5 |
|---|---|---|---|---|---|
| Column/section heading | `footer__hotel-name` | `footer__section-title` | *(none)* | `footer__box-title` | `footer__heading` |
| Body text | `footer__location` | `footer__text` | `footer__minimal-text` | `footer__box-text` | `footer__text` / `footer__text-small` |
| Copyright text | `footer__copyright` | `footer__copyright` | `footer__minimal-copyright` | `footer__copyright` | `footer__copyright-small` |
| Bottom divider bar | *(none)* | `footer__bottom` | *(none)* | `footer__bottom-colorful` | `footer__bottom-structured` |
| Social link element | *(none)* | `footer__social-link` | *(none)* | *(none)* | `footer__social-btn` |

Result: the CSS file must define rules for **9 different class names** to cover concepts that should need **5**. Every new shared rule requires listing all variants. Each time a preset is edited, there is a risk of breaking only the CSS that targets its unique class names.

---

## Current state: copyright text divergence

| Preset | Copyright output |
|---|---|
| 1 | `© 2026 Hotel Name. All rights reserved.` |
| 2 | `© 2026 Hotel Name. All rights reserved.` |
| 3 | `© 2026` (year only — hotel name omitted) |
| 4 | `© 2026 Hotel Name` (no "All rights reserved.") |
| 5 | `© 2026 Hotel Name. All rights reserved.` |

---

## Current state: layout structure divergence

| Preset | Layout | Columns | Bootstrap used |
|---|---|---|---|
| 1 | Centered single block | 1 | No |
| 2 | 3-column grid | 3 (md=4 each) | Yes (Row/Col) |
| 3 | Single inline line | 1 (flex) | No |
| 4 | 4 colored icon boxes | 4 (sm=6/md=3) | Yes (Row/Col) |
| 5 | 4-column text grid | 4 (md=3 each) | Yes (Row/Col) |

Layout differences are **intentional and fine** — they define the visual personality of each preset. The problem is the content and class names differ, not the layout.

---

## Suggested unification

### 1. Canonical data surface (same fields rendered in all 5 presets)

Every preset should consume and render the same data:

```
hotelName      — always shown
hotelCity      — always shown
hotelCountry   — always shown (currently missing in P3, P4)
hotelEmail     — always shown (currently missing in P1, P3)
hotelPhone     — always shown (currently missing in P1, P3)
socialLinks    — [facebook, instagram, twitter, linkedin] — shown in all (currently only P2, P5)
copyright      — "© YEAR hotelName. All rights reserved." — same phrasing in all
```

**Quick links (Preset 5)**: Either connect them to real in-page anchors or remove them. Hardcoded `href="#"` links that go nowhere are misleading on live hotel pages.

### 2. Unified class names

Adopt one set of class names. The preset-specific modifier class (`footer--preset-N`) handles all visual differences via CSS; the element class names should be stable across all presets:

| Current mess | Proposed unified name |
|---|---|
| `footer__hotel-name` / `footer__section-title` / `footer__box-title` / `footer__heading` | **`footer__heading`** |
| `footer__location` / `footer__text` / `footer__box-text` | **`footer__text`** |
| `footer__text-small` | **`footer__text-small`** (keep — used for secondary detail) |
| `footer__minimal-text` | merge into **`footer__text`** |
| `footer__copyright` / `footer__minimal-copyright` / `footer__copyright-small` | **`footer__copyright`** |
| `footer__bottom` / `footer__bottom-colorful` / `footer__bottom-structured` | **`footer__bottom`** |
| `footer__social-link` / `footer__social-btn` | **`footer__social-link`** |

With unified names the shared CSS rules in `section-presets.css` collapse from ~50 multi-selector lines to ~10, and each preset's block becomes clean overrides only.

### 3. Unified copyright string

All presets should use the same output:
```
© {year} {hotelName}. All rights reserved.
```

### 4. Social link parity

Preset 2 has 3 social icons (FB, IG, TW); Preset 5 has 4 (+ LinkedIn). All presets that display social links should use the same 4:
```
Facebook  •  Instagram  •  Twitter  •  LinkedIn
```

### 5. Minimal preset (P3) — recommendation

Preset 3 is intentionally minimal (single line). Its single-line layout cannot show all fields without breaking the design. Suggested approach: keep the one-line layout but surface email and phone in a subtle second line below the divider, or add a tooltip/popover on hover. Country can be appended after city with a comma (one character change, no layout impact).

---

## Suggested unified JSX structure (concept only — not a code change)

Each preset block would receive the same data, rendered in layout-appropriate positions:

```
// Shared data (all presets read identical fields)
name, city, country, email, phone, socialLinks[4], copyright

// Per-preset layout decides WHERE each piece appears:
// P1: name → location (city, country) → copyright (centered)
// P2: col1(name, location) | col2(email, phone) | col3(social) → bottom(copyright)
// P3: name • city, country | divider | copyright (single line)
// P4: box(name) | box(city,country) | box(email) | box(phone) → bottom(copyright) + social row
// P5: col(name,location) | col(links) | col(email,phone) | col(social) → bottom(copyright)
```

---

## Impact of unification

| Area | Before | After |
|---|---|---|
| CSS rules for footer headings | 4 separate selectors | 1 selector (`.footer__heading`) |
| CSS rules for bottom bar | 3 separate selectors | 1 selector (`.footer__bottom`) |
| CSS rules for copyright | 3 separate selectors | 1 selector (`.footer__copyright`) |
| CSS rules for social elements | 2 separate selectors | 1 selector (`.footer__social-link`) |
| Presets missing contact info | P1, P3 | none |
| Presets missing social links | P1, P3, P4 | none |
| Copyright phrasing variants | 3 | 1 |


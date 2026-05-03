# Glassmorphism Style Plan — HotelMate Frontend

A practical, suggestion-only roadmap for applying a consistent glassmorphism (frosted glass) aesthetic across the entire app. No code changes — this is a design + rollout strategy.

---

## 1. What "Glassmorphism" Means Here

A visual language built on **five core ingredients**:

1. **Translucent surfaces** — semi-transparent backgrounds (`rgba` with 0.4–0.7 alpha).
2. **Backdrop blur** — `backdrop-filter: blur(...)` to frost what's behind.
3. **Soft borders** — 1px hairline borders with low-opacity white/black.
4. **Layered shadows** — gentle, diffused shadows for floating depth.
5. **Vivid backgrounds** — colorful gradients or imagery behind the glass so the blur has something to reveal.

Without #5, glass looks flat. So the rollout must include the **page background layer** as well as the glass surface itself.

---

## 2. Pre-Flight Audit (do this before any styling)

Because the app uses **Bootstrap 5 + React-Bootstrap + custom CSS**, identify what surfaces will become "glass":

- [ ] List every recurring surface type: `Card`, `Modal`, `Offcanvas`, `Navbar`, `Sidebar`, `Dropdown`, `Toast`, `Tooltip`, `Popover`, form inputs, table headers, tab strips, chat bubbles.
- [ ] Identify "always-glass" vs "never-glass" surfaces. Suggested **never-glass**: dense data tables, PDF exports, print views, charts/canvas, login OTP fields (legibility), critical confirm modals (destructive actions).
- [ ] Catalog current background colors / theme tokens in `src/index.css` and any SCSS overrides.
- [ ] Note dark-mode state — glassmorphism must be designed for **both** light and dark backgrounds.

---

## 3. Design Tokens (the foundation)

Define a single token layer (CSS custom properties on `:root`) so every component reads from one source. Suggested token groups:

### Surface tokens
- `--glass-bg-light` — e.g. `rgba(255,255,255,0.55)`
- `--glass-bg-medium` — `rgba(255,255,255,0.35)`
- `--glass-bg-strong` — `rgba(255,255,255,0.75)` (for modals/forms needing legibility)
- `--glass-bg-dark` — `rgba(20,20,30,0.45)` (dark mode)

### Blur tokens
- `--glass-blur-sm` — `blur(8px)`
- `--glass-blur-md` — `blur(16px)`
- `--glass-blur-lg` — `blur(24px)`

### Border tokens
- `--glass-border-light` — `1px solid rgba(255,255,255,0.25)`
- `--glass-border-dark` — `1px solid rgba(255,255,255,0.08)`

### Shadow tokens
- `--glass-shadow-sm` — soft, low-spread shadow
- `--glass-shadow-md` — medium float
- `--glass-shadow-lg` — modal/elevated

### Radius tokens
- `--glass-radius-sm` — 8px
- `--glass-radius-md` — 16px
- `--glass-radius-lg` — 24px

### Background tokens (page-level)
- `--glass-page-gradient` — multi-stop brand gradient
- `--glass-page-mesh` — optional radial blob mesh
- Hotel-tenant override hook so each hotel can theme its own gradient.

> **Suggestion**: place all tokens in a single new file like `src/styles/glass-tokens.css` and import once from `main.jsx`. Keeps tokens out of component CSS.

---

## 4. Utility Classes (recommended over per-component CSS)

Instead of editing every component, define a small utility set so any element can opt in:

- `.glass` — base translucent + blur + border + shadow + radius.
- `.glass-strong` — high-opacity variant for forms/modals.
- `.glass-subtle` — for nav strips and toolbars.
- `.glass-card` — equivalent of `.card` with glass.
- `.glass-input` — semi-transparent form inputs.
- `.glass-hover` — adds lift + brightness on hover (good for action cards).

Bootstrap interop strategy:
- Layer utilities **after** Bootstrap CSS so they win the cascade.
- Avoid overriding `.card`, `.modal-content`, etc. globally on day one — opt-in via additional class names. This prevents regressions on tables/PDF/auth flows.

---

## 5. Page Background Layer

Glass surfaces look dull on flat backgrounds. Two approaches:

### Approach A — Single global gradient (fastest)
- Apply a soft brand gradient on `body` or a top-level `<App>` wrapper.
- Add a fixed-position decorative layer with 2–3 large blurred color blobs (`filter: blur(120px)`) behind content.

### Approach B — Per-section ambience (richer)
- Dashboard: cool blue/teal mesh.
- Bookings: warm amber/peach.
- Chat: violet/pink.
- Reports: neutral gray-blue.

Recommendation: **start with A**, evolve to B once tokens are stable.

Performance note: blobs should be `position: fixed`, `pointer-events: none`, `z-index: -1`, and **GPU-promoted** with `will-change: transform`.

---

## 6. Component-by-Component Rollout Order

Recommended phased rollout to minimize risk:

### Phase 1 — Foundations (1 PR)
1. Add tokens file + utility classes.
2. Add page background gradient/blobs.
3. No component changes yet — verify nothing regresses.

### Phase 2 — Chrome (high-visibility, low-risk)
4. Top navbar / app header → `.glass-subtle`.
5. Sidebar / drawer → `.glass`.
6. Footer / bottom action bars.

### Phase 3 — Containers
7. Generic `Card` wrappers on dashboards.
8. Stat / KPI tiles.
9. Empty-state panels.

### Phase 4 — Overlays
10. Modals → `.glass-strong` (legibility critical).
11. Offcanvas drawers.
12. Dropdowns, popovers, toasts, tooltips.

### Phase 5 — Inputs & Interactive
13. Form controls (`input`, `select`, `textarea`).
14. Buttons — secondary/ghost variants only; keep primary CTAs solid.
15. Tabs, pills, segmented controls.

### Phase 6 — Feature surfaces
16. Chat bubbles (guest + staff).
17. Booking cards.
18. Amenity cards (already have an image system — glass overlay works well over imagery).
19. Notification center.

### Phase 7 — Excluded by design
- Data tables, charts, PDF exports, print views, OTP/auth screens — keep solid.

---

## 7. Accessibility & Legibility

This is where most glass UIs fail. Mandatory rules:

- **Contrast**: text on glass surfaces must meet WCAG AA (4.5:1). Use `color-contrast()` checks or `.glass-strong` whenever text is primary content.
- **Text shadow**: avoid; instead increase surface opacity for text-heavy areas.
- **Reduced transparency**: respect `@media (prefers-reduced-transparency)` — fall back to opaque tokens.
- **Reduced motion**: hover lifts and gradient animation must respect `prefers-reduced-motion`.
- **Focus rings**: ensure visible focus on translucent surfaces (use a high-contrast outline, not a subtle box-shadow).
- **Disabled states**: do not rely on opacity alone — combine with reduced saturation + cursor change.

---

## 8. Performance Considerations

`backdrop-filter` is GPU-expensive. Guardrails:

- Limit nested glass layers to **2 deep** (e.g. modal-on-glass, not modal-on-glass-on-glass).
- Avoid `backdrop-filter` on long scroll lists — apply it to the container, not each row.
- Test on lower-end Android (Capacitor build is shipped via `@capacitor/android`). Some older WebViews need `-webkit-backdrop-filter` fallback.
- Provide a feature-detect fallback: if `backdrop-filter` unsupported → fall back to higher-opacity solid color.
- Watch out for charts (Chart.js, ECharts, Recharts, Victory) — keep them on solid backgrounds; the GPU compositing fights with canvas redraws.

---

## 9. Dark Mode Strategy

Glassmorphism behaves very differently in dark mode:

- Do not invert opacity blindly — use **separate tokens** (`--glass-bg-dark-*`).
- Page gradient should shift to deep navy / plum, not pure black.
- Borders flip to low-opacity white (`rgba(255,255,255,0.08)`).
- Shadows become almost invisible — replace with subtle inner highlight (`inset 0 1px 0 rgba(255,255,255,0.06)`).

---

## 10. Multi-Tenant Theming (HotelMate-specific)

Since each hotel can have brand colors:

- Expose a per-hotel theme token (`--hotel-accent`, `--hotel-gradient-start`, `--hotel-gradient-end`) loaded after auth.
- Glass surfaces stay neutral; only the **page background gradient** and accent borders pick up hotel colors.
- This keeps tenant theming cheap and avoids re-skinning every component.

---

## 11. Testing Checklist Before Each Phase Ships

- [ ] Visual regression on dashboard, bookings, chat, settings.
- [ ] Light + dark mode screenshots.
- [ ] Mobile (Capacitor Android build) smoke test.
- [ ] PDF export / print view unaffected.
- [ ] Lighthouse performance budget — no regression > 5 points.
- [ ] Keyboard focus visible on all glass overlays.
- [ ] `prefers-reduced-transparency` and `prefers-reduced-motion` honored.
- [ ] Charts and data tables remain crisp (no blur bleed).

---

## 12. Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Bootstrap defaults override glass | Load utilities after Bootstrap; opt-in classes only. |
| Legibility on photos (amenity cards) | Use `.glass-strong` overlay or dark-tint scrim. |
| Android WebView blur jank | Feature-detect fallback to solid surface. |
| Inconsistent rollout across features | Enforce via tokens + utility classes, not ad-hoc CSS. |
| Designers diverge over time | Document tokens in Storybook or a single design page. |

---

## 13. Suggested Deliverables

1. `src/styles/glass-tokens.css` — tokens.
2. `src/styles/glass-utilities.css` — utility classes.
3. `src/styles/glass-background.css` — page gradient + blobs.
4. A demo route (e.g. `/dev/glass-preview`) showcasing all surface variants in light + dark.
5. Updated contribution note: "use `.glass*` utilities — do not write new translucent CSS inline."

---

## 14. Quick "Do / Don't" Summary

**Do**
- Centralize tokens.
- Use utility classes.
- Keep modals/forms high-opacity.
- Always ship a vivid page background.
- Respect reduced-motion / reduced-transparency.

**Don't**
- Apply glass to data tables, charts, PDFs, OTP forms.
- Stack more than 2 blur layers.
- Rely on opacity alone for disabled states.
- Skip dark-mode tokens.
- Override Bootstrap globals on day one.

---

*End of plan — this document is a roadmap only. Implementation should follow the phased rollout to keep risk low.*

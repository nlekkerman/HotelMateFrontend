# Hotels Landing Page – Frontend Implementation Spec

Context:
- Tech stack: React (or React + Vite), TypeScript preferred but optional.
- This page consumes the API described in `hotels_landing_filters.md`:
  - `GET /api/public/hotels/`
  - Query params: `q`, `city`, `country`, `tags`, `sort`.

Goal:
- Implement a **Hotels Landing Page** with:
  - A filter bar at the top.
  - A hotel cards grid underneath.
  - All filters controlled from the frontend and synced with the backend via query params.

---

## 1. High-level Component Structure

Recommended component tree:

- `<HotelsLandingPage />` (page container)
  - `<HotelsFiltersBar />`
  - `<HotelsList />`
  - `<HotelsEmptyState />` (optional, shown when no results / loading errors)

### 1.1 `<HotelsLandingPage />`

Responsibilities:
- Owns the **filter state** and **hotels data state**.
- Builds the query string and calls `/api/public/hotels/`.
- Passes:
  - `filters` and `onFiltersChange` to `<HotelsFiltersBar />`
  - `hotels`, `loading`, `error` to `<HotelsList />`

Key states:

```ts
type HotelTag = 'family' | 'spa' | 'business' | 'resort' | string;

interface HotelFilters {
  q: string;
  city: string;        // "" = All towns
  country: string;     // "" = All countries
  tags: HotelTag[];    // e.g. ['spa', 'family']
  sort: 'featured' | 'name_asc';
}

interface HotelCard {
  id: number | string;
  slug: string;
  name: string;
  city: string;
  country: string;
  thumbnailUrl: string;
  shortDescription: string;
  tags: HotelTag[];
  isFeatured: boolean;
}
```

Local state example:

```ts
const [filters, setFilters] = useState<HotelFilters>({
  q: '',
  city: '',
  country: '',
  tags: [],
  sort: 'featured',
});

const [hotels, setHotels] = useState<HotelCard[]>([]);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

---

## 2. Data Fetching Logic

Use `useEffect` to fetch hotels whenever filters change.

Pseudo-code:

```ts
useEffect(() => {
  const controller = new AbortController();
  const params = new URLSearchParams();

  if (filters.q) params.set('q', filters.q);
  if (filters.city) params.set('city', filters.city);
  if (filters.country) params.set('country', filters.country);
  if (filters.tags.length > 0) params.set('tags', filters.tags.join(','));
  if (filters.sort && filters.sort !== 'featured') params.set('sort', filters.sort);

  const url = `/api/public/hotels/?${params.toString()}`;

  setLoading(true);
  setError(null);

  fetch(url, { signal: controller.signal })
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHotels(data.results || data); // support both {results: []} and [] shapes
    })
    .catch((err) => {
      if (err.name === 'AbortError') return;
      setError(err.message || 'Failed to load hotels');
      setHotels([]);
    })
    .finally(() => setLoading(false));

  return () => controller.abort();
}, [filters]);
```

(Adjust base URL and data shape to match the real backend.)

Optional:
- Sync filters with the URL query string so the page is shareable and back/forward friendly.

---

## 3. Filters Bar Component

### 3.1 `<HotelsFiltersBar />` props

```ts
interface HotelsFiltersBarProps {
  filters: HotelFilters;
  onChange: (next: HotelFilters) => void;
  cities: string[];    // e.g. ['Killarney', 'Dublin']
  countries: string[]; // optional
}
```

### 3.2 UI elements

- **Search input**
  - Placeholder: `"Search by hotel name or town..."`.
  - On change, update `filters.q`.
  - Consider debouncing (300ms) before triggering `onChange`.

- **City dropdown**
  - First option: `"All towns"` with value `""`.
  - Options: `cities` prop.
  - On change, update `filters.city`.

- **Country dropdown (optional)**
  - First option: `"All countries"` with value `""`.
  - On change, update `filters.country`.

- **Tag chips** (optional)
  - Hard-coded or config-driven: e.g. `['family', 'spa', 'business', 'resort']`.
  - Each chip toggles membership in `filters.tags`.
  - Example toggle:

    ```ts
    const toggleTag = (tag: HotelTag) => {
      const hasTag = filters.tags.includes(tag);
      const nextTags = hasTag
        ? filters.tags.filter(t => t !== tag)
        : [...filters.tags, tag];
      onChange({ ...filters, tags: nextTags });
    };
    ```

- **Sort dropdown**
  - Options:
    - `"Featured"` → `featured`
    - `"Name A–Z"` → `name_asc`
  - On change, update `filters.sort`.

---

## 4. Hotels List and Card Components

### 4.1 `<HotelsList />` props

```ts
interface HotelsListProps {
  hotels: HotelCard[];
  loading: boolean;
  error: string | null;
}
```

### 4.2 Behavior

- If `loading`:
  - Show a loading spinner / skeleton cards.
- If `error`:
  - Show an error message.
- If **not loading** and `hotels.length === 0`:
  - Show `<HotelsEmptyState />` with text like `"No hotels found for your filters."`.
- Otherwise:
  - Render a responsive grid of `<HotelCard />` components.

### 4.3 `<HotelCard />` props

```ts
interface HotelCardProps {
  hotel: HotelCard;
}
```

### 4.4 Hotel card content

- Thumbnail image (fallback image if missing).
- Hotel name.
- City, country.
- Short description (clamped to 2–3 lines).
- Tags (small badges).
- Optional **Featured** badge if `hotel.isFeatured` is true.
- Click on card:
  - Navigate to hotel public page, e.g. `/hotels/{hotel.slug}`.

---

## 5. Optional: Preloading city / country options

You can get the list of available cities/countries either:

1. From the backend in a dedicated endpoint:

   - `GET /api/public/hotels/filters/`
   - Returns something like:

   ```json
   {
     "cities": ["Killarney", "Dublin"],
     "countries": ["Ireland"]
   }
   ```

2. Or compute on the frontend from the hotels list:
   - Fetch all hotels once, derive unique city/country lists.
   - For larger datasets, option 1 is better.

---

## 6. Minimal Example JSX Skeleton (React)

```tsx
// HotelsLandingPage.tsx
import React, { useEffect, useState } from 'react';
import { HotelsFiltersBar } from './HotelsFiltersBar';
import { HotelsList } from './HotelsList';

export const HotelsLandingPage: React.FC = () => {
  const [filters, setFilters] = useState<HotelFilters>({
    q: '',
    city: '',
    country: '',
    tags: [],
    sort: 'featured',
  });

  const [hotels, setHotels] = useState<HotelCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cities, setCities] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);

  // TODO: optionally fetch cities/countries from backend

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();

    if (filters.q) params.set('q', filters.q);
    if (filters.city) params.set('city', filters.city);
    if (filters.country) params.set('country', filters.country);
    if (filters.tags.length > 0) params.set('tags', filters.tags.join(','));
    if (filters.sort && filters.sort !== 'featured') params.set('sort', filters.sort);

    const url = `/api/public/hotels/?${params.toString()}`;

    setLoading(true);
    setError(null);

    fetch(url, { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setHotels(data.results || data);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError(err.message || 'Failed to load hotels');
        setHotels([]);
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [filters]);

  return (
    <div className="hotels-landing-page">
      <HotelsFiltersBar
        filters={filters}
        onChange={setFilters}
        cities={cities}
        countries={countries}
      />
      <HotelsList hotels={hotels} loading={loading} error={error} />
    </div>
  );
};
```

(You can let Copilot fill in `HotelsFiltersBar` and `HotelsList` based on this spec.)

---

This spec should be enough for Copilot / any dev to implement the **frontend side** of the hotels landing page filters, fully compatible with the backend spec in `hotels_landing_filters.md`.

# HotelMate Frontend Services Layer Analysis

**Analysis Date:** December 15, 2025  
**Status:** Current Implementation (Legacy State)

---

## PHASE 1 — Current State Analysis (No Changes)

## 1. Core API Configuration (`src/services/api.js`)

### baseURL Resolution Logic
- **Dynamic resolution based on environment:**
  - `isNative` (Capacitor): `"https://hotel-porter-d25ad83b12cf.herokuapp.com/api/"`
  - `VITE_API_URL` set: Uses environment variable
  - Local development: `"http://localhost:8000/api/"`
  - Fallback production: `"https://hotel-porter-d25ad83b12cf.herokuapp.com/api"`

### Interceptors and Header Injection
- **Request interceptor** injects headers from `localStorage.getItem("user")`:
  - `Authorization`: `Token ${token}`
  - `X-Hotel-ID`: `hotelId.toString()`
  - `X-Hotel-Slug`: `hotelSlug`
- **Response interceptor** handles CORS and network errors
- **Two axios instances created:**
  - `api` (authenticated with interceptors)  
  - `publicAPI` (no authentication headers)

### URL Helper Functions
- **buildStaffURL(hotelSlug, app, path)**: Returns `/staff/hotel/${hotelSlug}${appPath}${cleanPath}`
- **getHotelSlug()**: Extracts `hotel_slug` from localStorage user data
- **getHotelPublicPage(hotelSlug)**: Uses publicAPI for `/public/hotel/${slug}/page/`

### Legacy/Forbidden Helpers
- **Slug inference from localStorage**: Uses stored user data as source of truth
- **Manual hotel_id conversion**: `hotelId.toString()` for X-Hotel-ID header

---

## 2. All Services Files Analysis

### `src/services/apiWithHotel.js` (LEGACY)
- **Uses:** axios
- **baseURL:** Hardcoded conditional - `localhost` check + `VITE_API_URL`
- **Creates:** New axios instance (duplicate of main api)
- **Domain:** STAFF/GUEST (mixed usage)
- **Headers:** `Authorization`, `X-Hotel-ID`, **`X-Hotel-Identifier`** (legacy pattern)
- **Pattern:** Uses `currentHotelIdentifier` variable instead of localStorage
- **Status:** Legacy - different header pattern from main API

### `src/services/publicApi.js`
- **Uses:** Imports `publicAPI` from `api.js` (reuses instance)
- **baseURL:** Uses centralized `publicAPI`
- **Creates:** No new axios instance
- **Domain:** PUBLIC
- **Endpoints:**
  - `/public/hotels/` (hotels list)
  - `/public/hotels/filters/` (filter options)
  - `/public/hotel/${slug}/page/` (hotel page data)
  - `/public/presets/` (preset configurations)
  - `/public/presets/${key}/` (single preset)

### `src/services/staffApi.js`
- **Uses:** Imports `api` and `buildStaffURL` from main api
- **baseURL:** Uses centralized api instance
- **Creates:** No new axios instance  
- **Domain:** STAFF
- **Endpoints:**
  - `buildStaffURL(hotelSlug, 'hotel', 'public-page-builder/')` (page builder)
  - `/staff/hotel/${hotelSlug}/public-sections/` (section management)
  - Staff-specific endpoints using consistent URL pattern

### `src/services/analytics.js`
- **Uses:** Imports `api` from main api
- **baseURL:** Uses centralized api instance
- **Creates:** No new axios instance
- **Domain:** STAFF
- **Endpoints:**
  - `/staff/hotel/${hotelSlug}/attendance/roster-analytics/kpis/`
  - `/staff/hotel/${hotelSlug}/attendance/roster-analytics/staff-summary/`
  - `/staff/hotel/${hotelSlug}/attendance/roster-analytics/department-summary/`
  - `/staff/hotel/${hotelSlug}/attendance/roster-analytics/shifts-summary/`
  - `/staff/hotel/${hotelSlug}/attendance/roster-analytics/hourly-breakdown/`

### `src/services/FirebaseService.js`
- **Uses:** No axios/fetch for main API calls
- **baseURL:** `VITE_API_BASE_URL` or `http://localhost:8000` (different from main API)
- **Creates:** No axios instance (uses Firebase SDK)
- **Domain:** OTHER (push notifications)
- **Pattern:** Uses `api` import for FCM token registration

### `src/services/memoryGameAPI.js`
- **Uses:** Imports both `api` and `publicAPI` from main api
- **baseURL:** Uses `this.baseURL = '/entertainment'`  
- **Creates:** No new axios instance
- **Domain:** OTHER (entertainment/games)
- **Endpoints:**
  - `/entertainment/memory-cards/for-game/`
  - `/entertainment/memory-sessions/practice/`
  - `/entertainment/memory-sessions/`
  - `/entertainment/memory-sessions/my-stats/`
  - `/entertainment/memory-sessions/leaderboard/`
  - `/entertainment/achievements/`
  - `/entertainment/dashboard/stats/`
  - `/entertainment/tournaments/active_for_hotel/?hotel=${hotelSlug}`

### `src/services/quizGameAPI.js`
- **Uses:** Imports `api` from main api
- **baseURL:** Uses `this.baseURL = 'entertainment'`
- **Creates:** No new axios instance
- **Domain:** OTHER (entertainment/games)
- **Pattern:** Similar to memoryGameAPI, uses entertainment endpoints

### `src/services/presetsService.js`
- **Uses:** Native `fetch()` API
- **baseURL:** Hardcoded conditional logic (duplicates api.js logic)
  - `localhost`: `"http://127.0.0.1:8000/api/"`
  - Fallback: `VITE_API_URL` or production URL
- **Creates:** No axios instance (uses fetch)
- **Domain:** PUBLIC  
- **Endpoints:** `/public/presets/`
- **Issue:** Duplicates baseURL resolution logic from api.js

### `src/services/sectionEditorApi.js`
- **Uses:** Imports `api` and `buildStaffURL` from main api
- **baseURL:** Uses centralized api instance
- **Creates:** No new axios instance
- **Domain:** STAFF
- **Helper:** `buildSectionURL(hotelSlug, path)` - returns `/staff/hotel/${hotelSlug}/${cleanPath}`
- **Pattern:** Consistent with staff URL patterns

### `src/services/shiftLocations.js`
- **Uses:** Imports `api` from main api
- **baseURL:** Uses centralized api instance
- **Creates:** No new axios instance
- **Domain:** STAFF
- **Endpoints:**
  - `/staff/hotel/${hotelSlug}/attendance/shift-locations/`
  - CRUD operations on shift locations

### `src/services/themeService.js`
- **Uses:** Native `fetch()` API
- **baseURL:** `VITE_API_URL` or production fallback (no /api/ suffix)
- **Creates:** No axios instance (uses fetch)
- **Domain:** STAFF
- **Endpoints:** `/staff/hotel/${hotelSlug}/settings/`
- **Headers:** Manual `Authorization: Token ${authToken}` header injection

### `src/services/salesAnalytics.js`
- **Uses:** Imports `api` from main api
- **baseURL:** Uses centralized api instance  
- **Creates:** No new axios instance
- **Domain:** STAFF
- **Pattern:** Complex analytics endpoints for sales data

### `src/services/stockAnalytics.js`
- **Uses:** Imports `api` from main api
- **baseURL:** Uses centralized api instance
- **Creates:** No new axios instance
- **Domain:** STAFF
- **Pattern:** Complex analytics endpoints for inventory/stocktake data

---

## 3. Summary of Current Architecture Issues

### Multiple HTTP Approaches
- **3 different HTTP methods:** axios (main), axios (legacy apiWithHotel), fetch (2 services)
- **2 axios instances:** `api` (authenticated) + `publicAPI` (public)
- **Duplicated baseURL logic:** presetsService.js replicates api.js resolution logic

### Inconsistent Header Patterns  
- **Main API:** `X-Hotel-Slug`, `X-Hotel-ID`
- **Legacy API:** `X-Hotel-Identifier` (apiWithHotel.js)
- **Manual headers:** themeService.js manually adds Authorization

### Mixed Domain Patterns
- **PUBLIC:** publicApi.js, presetsService.js
- **STAFF:** staffApi.js, analytics.js, sectionEditorApi.js, shiftLocations.js, themeService.js, salesAnalytics.js, stockAnalytics.js  
- **GUEST:** apiWithHotel.js (mixed with staff)
- **OTHER:** memoryGameAPI.js, quizGameAPI.js, FirebaseService.js

### URL Construction Inconsistencies
- **buildStaffURL()** helper: Used consistently by staff services
- **Custom URL builders:** sectionEditorApi.js has `buildSectionURL()` 
- **Hardcoded patterns:** Direct string templates in analytics services
- **Entertainment baseURL:** Separate `/entertainment` prefix pattern

### Legacy Technical Debt
- **apiWithHotel.js:** Completely separate axios instance with different headers
- **presetsService.js:** Duplicates baseURL resolution + uses fetch instead of axios
- **themeService.js:** Uses fetch + manual auth headers instead of interceptors
- **Multiple authentication patterns:** Interceptors vs manual header injection

---

## 4. Current Working Patterns (Not Recommended for New Code)

### Centralized API Usage (Recommended Current Pattern)
```javascript
// ✅ Most services follow this pattern
import api, { buildStaffURL } from './api';
// Uses shared axios instance + interceptors + consistent headers
```

### Legacy Patterns (Avoid)
```javascript  
// ❌ Creates separate axios instance
import axios from 'axios';
const api = axios.create({ baseURL: '...' });

// ❌ Uses fetch with manual baseURL resolution
const baseURL = window.location.hostname === 'localhost' ? '...' : '...';
await fetch(`${baseURL}/endpoint`);

// ❌ Manual header injection
headers: { 'Authorization': `Token ${token}` }
```

---

**Next Phase:** Backend alignment and unified HTTP client implementation to eliminate inconsistencies and technical debt.
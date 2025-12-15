# HotelMate Frontend Legacy Architecture Analysis

**Analysis Date:** December 15, 2025  
**Status:** Current Implementation (Legacy - Not Aligned with Backend)

---

## PHASE 1 — How It Works Right Now

This document explains the current API architecture and data flows in the HotelMate frontend based on the existing code.

## 1. HTTP Layer Analysis

### Main API Client Configuration

**File:** `src/services/api.js`

```javascript
// Dynamic baseURL determination
const baseURL = (() => {
  if (isNative) {
    return "https://hotel-porter-d25ad83b12cf.herokuapp.com/api/";
  }
  
  // If VITE_API_URL is set in .env, always use it (for both dev and prod)
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  const isLocal = window.location.hostname === "localhost" || 
                  window.location.hostname === "127.0.0.1";
  const isDev = import.meta.env.DEV;

  if (isLocal && isDev) {
    return "http://localhost:8000/api/";
  }

  // Fallback to production URL
  return "https://hotel-porter-d25ad83b12cf.herokuapp.com/api";
})();
```

### Authentication Headers & Interceptors

**File:** `src/services/api.js`

```javascript
api.interceptors.request.use((config) => {
  const storedUser = localStorage.getItem("user");
  const userData = storedUser ? JSON.parse(storedUser) : null;

  const token = userData?.token || null;
  const hotelId = userData?.hotel_id || null;
  const hotelSlug = userData?.hotel_slug || null;

  if (token) {
    config.headers["Authorization"] = `Token ${token}`;
  }
  
  if (hotelId) {
    config.headers["X-Hotel-ID"] = hotelId.toString();
  }
  
  if (hotelSlug) {
    config.headers["X-Hotel-Slug"] = hotelSlug;
  }
  
  return config;
});
```

### Public API Instance

**File:** `src/services/api.js`

```javascript
export const publicAPI = axios.create({
  baseURL,
  timeout: 30000,
});
// No authentication headers - used for public endpoints
```

### Alternative API Client (Legacy)

**File:** `src/services/apiWithHotel.js`

```javascript
// Legacy API client with dynamic hotel identifier
const baseURL = window.location.hostname === 'localhost'
  ? 'http://localhost:8000/api/'
  : import.meta.env.VITE_API_URL;

// Uses X-Hotel-Identifier header instead of X-Hotel-Slug
```

### Error Handling

**File:** `src/services/api.js`

- Basic CORS and network error handling
- No global error interceptor
- Component-level error handling

## 2. Hotel Identity Management

### Source of Truth: localStorage

**File:** `src/context/AuthContext.jsx`

```javascript
const [user, setUser] = useState(() => {
  const stored = localStorage.getItem('user');
  return stored ? JSON.parse(stored) : null;
});
```

### Hotel Slug Extraction Utility

**File:** `src/services/api.js`

```javascript
export function getHotelSlug() {
  const storedUser = localStorage.getItem("user");
  const userData = storedUser ? JSON.parse(storedUser) : null;
  return userData?.hotel_slug || null;
}
```

### Multiple Hotel Identification Patterns

1. **Route Parameters:** `/:hotelSlug`, `/:hotelIdentifier`
2. **localStorage:** `user.hotel_slug`, `user.hotel_id`  
3. **Headers:** `X-Hotel-Slug`, `X-Hotel-ID`, `X-Hotel-Identifier`

### Main Entry Point Hotel Detection

**File:** `src/main.jsx`

```javascript
function getHotelSlug() {
  const stored = localStorage.getItem("user");
  if (!stored) return null;
  try {
    return JSON.parse(stored).hotel_slug;
  } catch {
    return null;
  }
}
```

## 3. Endpoint Construction

### Staff URL Builder

**File:** `src/services/api.js`

```javascript
export function buildStaffURL(hotelSlug, app, path = "") {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const appPath = app ? `/${app}` : "";
  return `/staff/hotel/${hotelSlug}${appPath}${cleanPath}`;
}
```

### Public Hotel Page Endpoint

**File:** `src/services/api.js`

```javascript
export async function getHotelPublicPage(hotelSlug) {
  return publicAPI.get(`/public/hotel/${hotelSlug}/page/`);
}
```

### Legacy Endpoint Patterns

Found throughout components:

- `/api/hotel/${hotelSlug}/` (legacy)
- `/staff/${hotelSlug}/me/`
- `/room_services/${hotelSlug}/room/${roomNumber}/menu/`
- `/bookings/${hotelSlug}/${restaurantSlug}/tables/`

### Staff Chat URL Builder

**File:** `src/staff_chat/services/staffChatApi.js`

```javascript
const buildChatURL = (hotelSlug, path = '') => {
  return buildStaffURL(hotelSlug, 'staff_chat', path);
}
```

## 4. Data Flow Architecture

### Public Pages Data Flow

**File:** `src/pages/hotels/HotelPublicPage.jsx`

```
URL: /hotel/:slug
↓
getPublicHotelPage(slug) → publicAPI.get('/public/hotel/${slug}/page/')
↓
Response includes: hotel data, sections, room_types, offers, gallery
↓
Renders dynamic sections based on section_type
```

### Guest Zone Data Flow

**File:** `src/pages/HotelPortalPage.jsx`

```
URL: /:hotelSlug
↓ 
api.get('/public/hotel/${hotelSlug}/page/')
↓
setHotel(response.data) + selectHotel(response.data)
↓
GuestHotelHome component with hotel data
```

### Staff Data Flows

#### Room Service Management

**File:** `src/components/menus/MenusManagement.jsx`

```javascript
// Staff endpoint
buildStaffURL(hotelSlug, '', 'room-service-items/')
// Fallback guest endpoint  
'/room_services/${hotelSlug}/room/1/menu/'
```

#### Staff Profile/Hotel Data

**File:** `src/hooks/useHotel.js`

```javascript
const res = await api.get(`/staff/${user.hotel_slug}/me/`);
const hotelData = res.data.user?.staff_profile?.hotel;
```

### Guest Service Data Flows

#### Room Service (Guest)

**File:** `src/components/rooms/RoomService.jsx`

```
URL: /room_services/:hotelIdentifier/room/:roomNumber/menu
↓
api.get('/room_services/${hotelIdentifier}/room/${roomNumber}/menu/')
↓
Guest menu items + current orders
```

#### Restaurant Bookings

**File:** `src/components/bookings/BookingsGrid.jsx`

```javascript
api.get(`/bookings/${hotelSlug}/${restaurantSlug}/tables/`);
api.get(`/bookings/guest-booking/${hotelSlug}/restaurant/${restaurantSlug}/`);
```

## 5. Routing Architecture

### Route Patterns

**File:** `src/App.jsx`

```javascript
// Public Routes
<Route path="/" element={<HotelsLandingPage />} />
<Route path="/hotel/:slug" element={<HotelPublicPage />} />

// Staff Routes (Protected)
<Route path="/staff/:hotelSlug/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

// Guest Routes (PIN Protected)
<Route path="/room_services/:hotelIdentifier/room/:roomNumber/menu" 
       element={<RequirePin><RoomService /></RequirePin>} />

// Catch-all Hotel Portal
<Route path="/:hotelSlug" element={<HotelPortalPage />} />
```

### Guest Route Detection

**File:** `src/App.jsx`

```javascript
const GUEST_ROUTE_PATTERNS = [
  "/room_services/:hotelIdentifier/room/:roomNumber/menu",
  "/room_services/:hotelIdentifier/room/:roomNumber/breakfast",
  // ... other guest patterns
];
```

## 6. State Management

### Authentication Context

**File:** `src/context/AuthContext.jsx`

- Stores user data in localStorage
- Manages view mode (guest/staff)
- Hotel selection for multi-hotel

### Hook-Based Data Fetching

**Files:**

- `src/hooks/useAxios.js` - Basic GET requests
- `src/hooks/useAxiosPost.js` - POST operations
- `src/hooks/useHotel.js` - Hotel-specific data

### React Query Integration

**File:** `src/App.jsx`

- QueryClient provider wraps entire app
- Used selectively in components like RoomList

## 7. Environment Configuration

### Environment Variables Used

```
VITE_API_URL - Main API base URL
VITE_CLOUDINARY_BASE - Image assets
VITE_PUSHER_KEY - Real-time updates  
VITE_PUSHER_CLUSTER - Pusher configuration
VITE_FIREBASE_VAPID_KEY - Push notifications
```

## 8. Legacy Patterns & Technical Debt

### Multiple HTTP Clients

- `api` (main authenticated)
- `publicAPI` (unauthenticated)
- `apiWithHotel` (legacy with X-Hotel-Identifier)

### Inconsistent Hotel Identification

- Some routes use `hotelSlug`, others `hotelIdentifier`
- Multiple header patterns (`X-Hotel-Slug`, `X-Hotel-ID`, `X-Hotel-Identifier`)

### Mixed Data Fetching Patterns

- Direct axios calls in components
- Custom hooks (useAxios)
- React Query (limited usage)
- Context-based state management

### URL Construction Approaches

- String concatenation: `'/api/hotel/' + hotelSlug + '/menu'`
- Template literals: \`/staff/${hotelSlug}/me/\`
- Helper functions: `buildStaffURL(hotelSlug, app, path)`

## 9. Key Components & Their Data Sources

### Public Components

- **HotelPublicPage** (`src/pages/hotels/HotelPublicPage.jsx`)
  - Uses: `getPublicHotelPage()` → `/public/hotel/${slug}/page/`
  - Renders: Dynamic sections, gallery, offers, room types

- **HotelsLandingPage** (`src/pages/HotelsLandingPage.jsx`)
  - Uses: Direct API calls to list hotels
  - Renders: Hotel cards with basic info

### Staff Components

- **Settings** (`src/pages/Settings.jsx`)
  - Uses: `buildStaffURL()` for various staff endpoints
  - Manages: Hotel configuration, staff profiles

- **MenusManagement** (`src/components/menus/MenusManagement.jsx`)
  - Uses: Mix of staff and guest endpoints
  - Manages: Room service menu items

### Guest Components

- **RoomService** (`src/components/rooms/RoomService.jsx`)
  - Uses: `/room_services/${hotelIdentifier}/room/${roomNumber}/menu/`
  - Renders: Guest menu ordering interface

- **BookingsGrid** (`src/components/bookings/BookingsGrid.jsx`)
  - Uses: Restaurant booking endpoints
  - Renders: Table booking interface

## 10. Real-time Features

### Pusher Integration

**File:** `src/realtime/pusher.js`

- Channels: Hotel-specific and user-specific
- Events: Message notifications, booking updates
- Authentication: Token-based channel authentication

### Firebase Messaging

**File:** `src/firebase.js`

- Push notifications for mobile/web
- Service worker: `public/firebase-messaging-sw.js`

---

## Summary

This architecture reflects a legacy system that has evolved over time, with multiple patterns coexisting for similar functionality. The codebase contains:

- **3 different HTTP clients** with varying configurations
- **Multiple hotel identification patterns** (slug vs identifier, different headers)
- **Mixed data fetching approaches** (hooks, direct calls, React Query)
- **Inconsistent URL construction** (string concatenation, templates, helpers)

The system works but would benefit from standardization around:
1. Single HTTP client with consistent configuration
2. Unified hotel identification approach
3. Consistent data fetching patterns
4. Standardized URL construction utilities

**Next Phase:** Backend alignment and frontend refactoring to eliminate technical debt and create a unified, maintainable architecture.
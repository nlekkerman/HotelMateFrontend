# HotelMate Frontend

React frontend for a multi-tenant hotel operations platform, covering public hotel pages, guest flows, staff dashboards, and realtime operational UI.

## Overview

HotelMate is a hotel-scoped React SPA that serves two audiences: **guests** (room booking, room service ordering, pre-check-in, chat, surveys) and **hotel staff** (reception, housekeeping, rooms, bookings, attendance, stock management, restaurant operations). Every route, realtime channel, and theme is resolved per hotel slug. The frontend consumes a Django REST API and receives live operational updates through Pusher.

## Core Responsibilities

- **Public hotel pages** — filterable hotel listing, per-hotel public pages built from backend-managed sections, restaurant menus, and "Good to Know" guest info
- **Guest flows** — room booking with confirmation/payment/status tracking, room service and breakfast ordering, restaurant booking, pre-check-in forms, post-stay surveys, and a session-based guest chat portal
- **Staff operations** — permission-gated dashboards for reception, rooms, guests, housekeeping, maintenance, bookings (service + room), room service orders, restaurant management, menus, hotel info, and staff-to-guest chat
- **Stock tracker** — inventory items, movements, stocktakes, period snapshots with comparison, cocktail recipes, sales entry, and sales analytics with chart-based reporting
- **Attendance & HR** — attendance dashboards, department rosters, analytics, face-recognition clock-in (webcam + face-api.js), staff management, and registration package distribution
- **Realtime UI** — live updates across attendance, room service, bookings, room status, housekeeping, and chat via Pusher channels and Firebase Cloud Messaging, routed through a centralized event bus into domain-specific stores
- **Games** — Whack-a-Mole, Memory Match (tournaments, leaderboards), and Quiz Game behind auth; an AR shooting game (A-Frame/Three.js) on a public route
- **Settings & admin** — per-hotel theming, section-based public page editor, hotel provisioning, and super user management

## Frontend Architecture

- **Route config + two-layer protection** — routes are declared as config objects across five files (`authRoutes`, `publicRoutes`, `guestRoutes`, `staffRoutes`, `gameRoutes`) and assembled by `buildRoutes()`. `ProtectedRoute` enforces authentication (Layer 1) and optionally validates the user's `allowed_navs` against a path-to-slug policy (Layer 2), gated by a feature flag
- **Hotel-scoped everything** — staff routes carry `:hotelSlug` params; auth context resolves the active hotel; Axios interceptors inject `X-Hotel-ID` and `X-Hotel-Slug` headers on every request; theming and realtime channels are all per-hotel
- **Token-aware guest flows** — guest pages skip login entirely; identity comes from URL query tokens (`?token=...`) persisted to localStorage, with booking-scoped tokens to prevent cross-hotel reuse
- **Dual Pusher realtime** — `realtimeClient.js` (staff: singleton, env-var config, token auth) and `guestRealtimeClient.js` (guest: per-session, backend-provided config, session-header auth). A `channelRegistry` subscribes hotel channels and a centralized `eventBus` dispatches events to nine domain stores (attendance, chat, guest chat, room service, service bookings, room bookings, rooms, housekeeping, notifications)
- **Service layer** — Axios instances for authenticated (`api`), public (`publicAPI`), and guest (`guestAPI`) requests, with a module-level `authStore` bridge so interceptors and Pusher auth work outside the React tree
- **Provider composition** — `AppProviders` nests Router → React Query → Auth → RealtimeProvider (all domain stores) → Chat → Messenger → Theme → Chart Preferences → Staff Chat → Notification providers
- **Backend-authoritative permissions** — `usePermissions` reads `allowed_navs` from the user payload; `staffAccessPolicy.js` maps URL paths to nav slugs; navigation categories (Front Office, F&B, Staff, Guest Relations) filter the sidebar accordingly

## Main UI Areas

**Public** — Hotel listing with filters, section-based hotel pages, restaurant views, Good-to-Know pages.

**Guest** — Room service / breakfast ordering by room number, restaurant booking, room booking (confirm → payment → status), pre-check-in, surveys, and a guest chat portal. All token-authenticated, no login required.

**Staff** — Reception, room list/detail, guest management, housekeeping with status workflows, maintenance, room service order management, restaurant dashboard, menu editor, booking dashboards (service + room), hotel info editor, Good-to-Know console, staff chat, and a persistent staff messenger overlay.

**Stock & Analytics** — Stock dashboard, items with profitability, movements, stocktakes, period snapshots/comparison, cocktails, sales entry/list/analysis, and configurable chart views.

**Attendance & HR** — Attendance and roster dashboards, enhanced analytics, face registration and face clock-in kiosk pages (public for tablet use), staff CRUD, profile self-service.

**Games** — Whack-a-Mole, Memory Match (practice + tournaments + leaderboards), Quiz Game (play + results + tournaments), and ShootAR.

**Admin** — Hotel settings (admin-gated), section editor for public pages, hotel provisioning, super user view.

## Tech Stack

| Category | Technology |
|---|---|
| Framework | React 19, Vite 6 |
| Routing | React Router DOM 7 |
| Styling | Bootstrap 5, React Bootstrap, custom CSS, Framer Motion |
| State / Data Fetching | React Context, TanStack React Query 5, Axios |
| Realtime | Pusher (pusher-js) — dual client architecture (staff + guest) |
| Push Notifications | Firebase Cloud Messaging (firebase) |
| Charts & Visualization | Recharts, Chart.js (react-chartjs-2), ECharts (echarts-for-react), Victory |
| PDF Generation | jsPDF, jspdf-autotable, html2canvas |
| Date Handling | date-fns, Day.js |
| Drag & Drop | @hello-pangea/dnd |
| Face Recognition | face-api.js, react-webcam |
| AR / 3D | A-Frame, AR.js, Three.js |
| QR Codes | qrcode |
| Icons | Lucide React, React Icons, Bootstrap Icons |
| Animations | Framer Motion, Lottie (lottie-react), canvas-confetti |
| Toasts | react-toastify |
| Mobile | Capacitor (Android target) |
| Deployment | Netlify (SPA redirect, Node 18) |

## Local Development

```bash
# Navigate to the frontend directory
cd hotelmate-frontend

# Install dependencies
npm install

# Start the dev server (runs on port 5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run linting
npm run lint
```

The dev server proxies `/api` requests to `http://localhost:8000` (the Django backend). Set `VITE_API_URL` in a `.env` file to override the backend URL. Pusher requires `VITE_PUSHER_KEY` and `VITE_PUSHER_CLUSTER` environment variables. Firebase push notifications require `VITE_FIREBASE_VAPID_KEY`. The `VITE_API_BASE_URL` variable is used for the Pusher auth endpoint.

## Notes

This frontend is one layer of a larger hotel operations platform. The Django backend is the authoritative source for permissions (`allowed_navs`), hotel scoping, booking state, and realtime event dispatch. The frontend does not grant permissions client-side — it reads them from the authenticated user payload and enforces route access accordingly.

Realtime updates flow from the backend through Pusher channels into domain-specific stores via a centralized event bus. Guest authentication is token-based and sessionless — tokens are issued by the backend, resolved from URLs, and persisted locally per booking. The system is designed for multi-hotel operation where each hotel has its own slug, theme, staff, rooms, and operational data.

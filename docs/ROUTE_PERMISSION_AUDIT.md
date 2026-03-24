# Route Permission Audit

> Generated: 2026-03-24 | Covers all route modules in `src/routes/`

## Architecture

| Layer | Mechanism | Scope |
|---|---|---|
| **Layer 1 (Auth)** | `ProtectedRoute mode="auth"` | Must have `user` in AuthContext |
| **Layer 2 (Permission)** | `ProtectedRoute mode="staff"` → `staffAccessPolicy.canAccessStaffPath()` | Checks `user.allowed_navs` against `requiredSlug` or pathname auto-mapping |
| **Feature Flag** | `ENABLE_ROUTE_PERMISSIONS` (currently `true`) | Kill-switch for Layer 2 |
| **Guest Auth** | `RequirePin` / `RequireDinnerPin` / `RequireChatPin` | Separate PIN-based auth |
| **Admin Gate** | `ADMIN_ONLY_ROUTES` in staffAccessPolicy | Requires `super_staff_admin` access level |

### requiredSlug precedence

Route config `requiredSlug` takes precedence over `PATH_TO_NAV_MAPPING` auto-mapping.
If neither exists, the route is **denied by default** (security-first).

---

## Auth Routes (`authRoutes.jsx`) — No protection

| Route | Protected | Mode | Slug | Notes |
|---|---|---|---|---|
| `/login` | — | — | — | Public |
| `/logout` | — | — | — | Public |
| `/register` | — | — | — | Token-guarded in component |
| `/registration-success` | — | — | — | Public |
| `/forgot-password` | — | — | — | Public |
| `/reset-password/:uid/:token/` | — | — | — | Public |
| `/no-internet` | — | — | — | Public |

## Public Routes (`publicRoutes.jsx`) — No protection

| Route | Protected | Mode | Slug | Notes |
|---|---|---|---|---|
| `/` | — | — | — | Hotels landing |
| `/hotel/:slug` | — | — | — | Hotel public page |
| `/hotel/:slug/sections` | — | — | — | Section-based public page |
| `/hotels/:hotelSlug/restaurants/:restaurantSlug` | — | — | — | Restaurant public view |
| `/good_to_know/:hotel_slug/:slug` | — | — | — | Guest info public view |
| `/shootar` | — | — | — | AR feature |
| `/:hotelSlug` | — | — | — | Hotel portal (catch-all) |
| `*` | — | — | — | Not found |

## Staff Routes (`staffRoutes.jsx`) — Layer 1 + Layer 2

| Route | Protected | Mode | requiredSlug | Notes |
|---|---|---|---|---|
| `/staff/:hotelSlug/feed` | ✅ | auth | — | Auth-only: every staff member needs feed access |
| `/staff/:hotelSlug/section-editor` | ✅ | staff | — | Maps to `home` via auto-mapping. TODO: consider admin-only |
| `/reception` | ✅ | staff | `reception` | |
| `/staff/:hotelSlug/settings` | ✅ | staff | — | Gated by `ADMIN_ONLY_ROUTES` (requires `super_staff_admin`) |
| `/super-user` | ✅ | staff | — | No PATH mapping = deny for non-superusers; superuser bypass |
| `/maintenance` | ✅ | staff | `maintenance` | |
| `/:hotelSlug/staff` | ✅ | staff | `staff_management` | |
| `/:hotelSlug/staff/create` | ✅ | staff | `staff_management` | |
| `/:hotelSlug/staff/:id` | ✅ | staff | `staff_management` | |
| `/:hotelSlug/staff/me` | ✅ | auth | — | Auth-only: own profile is self-service |
| `/attendance/:hotelSlug` | ✅ | staff | `attendance` | |
| `/roster/:hotelSlug` | ✅ | staff | `attendance` | Legacy alias |
| `/department-roster/:hotelSlug` | ✅ | staff | `department_roster` | |
| `/enhanced-attendance/:hotelSlug` | ✅ | staff | `management_analytics` | |
| `/face/:hotelSlug/register` | ✅ | staff | `attendance` | Face registration setup |
| `/hotel-:hotelSlug/restaurants` | ✅ | staff | `restaurants` | |
| `/:hotelSlug/:restaurantSlug` | ✅ | staff | `restaurants` | |
| `/rooms` | ✅ | staff | `rooms` | |
| `/room-management/:hotelIdentifier/room/:roomNumber` | ✅ | staff | `rooms` | |
| `/rooms/:roomNumber/add-guest` | ✅ | staff | `rooms` | |
| `/room_services/:hotelIdentifier/orders` | ✅ | staff | `room_service` | |
| `/room_services/:hotelIdentifier/orders-summary` | ✅ | staff | `room_service` | |
| `/room_services/:hotelIdentifier/orders-management` | ✅ | staff | `room_service` | |
| `/room_services/:hotelIdentifier/breakfast-orders` | ✅ | staff | `breakfast` | |
| `/menus_management/:hotelSlug` | ✅ | staff | `menus_management` | |
| `/:hotelIdentifier/guests` | ✅ | staff | `guests` | |
| `/:hotelIdentifier/guests/:guestId/edit` | ✅ | staff | `guests` | |
| `/bookings` | ✅ | staff | `bookings` | |
| `/staff/hotel/:hotelSlug/room-bookings` | ✅ | staff | `room_bookings` | |
| `/staff/hotel/:hotelSlug/booking-management` | ✅ | staff | `room_bookings` | |
| `/staff/hotel/:hotelSlug/housekeeping` | ✅ | staff | `housekeeping` | |
| `/staff/hotel/:hotelSlug/housekeeping/rooms/:roomNumber` | ✅ | staff | `housekeeping` | |
| `/hotel_info/:hotel_slug` | ✅ | staff | `hotel_info` | |
| `/hotel_info/:hotel_slug/:category` | ✅ | staff | `hotel_info` | |
| `/good_to_know_console/:hotel_slug` | ✅ | staff | `good_to_know` | |
| `/stock_tracker/:hotel_slug` | ✅ | staff | `stock_tracker` | |
| `/stock_tracker/:hotel_slug/*` (13 sub-routes) | ✅ | staff | — | Auto-maps to `stock_tracker` |
| `/stock_tracker/:hotel_slug/sales-report` | — | — | — | Redirect to `../sales/analysis` |
| `/stock_tracker/:hotel_slug/sales` | — | — | — | Redirect to `./entry` |
| `/hotel/:hotelSlug/chat` | ✅ | staff | `chat` | |

## Guest Routes (`guestRoutes.jsx`) — PIN auth / public

| Route | Protected | Mode | Slug | Notes |
|---|---|---|---|---|
| PIN validation routes (3) | — | — | — | Own PIN auth mechanism |
| PIN-protected services (5) | — | — | — | `RequirePin`/`RequireDinnerPin`/`RequireChatPin` wrappers |
| `/face/:hotelSlug/clock-in` | — | — | — | **INTENTIONALLY PUBLIC** — face recognition is the auth |
| `/camera-clock-in/:hotelSlug` | — | — | — | **INTENTIONALLY PUBLIC** — face recognition is the auth |
| Guest booking/precheckin/survey (9) | — | — | — | Public guest flows |

## Game Routes (`gameRoutes.jsx`) — Auth-only

| Route | Protected | Mode | Slug | Notes |
|---|---|---|---|---|
| `/games` | ✅ | auth | — | Entertainment for authenticated users |
| `/games/*` (14 sub-routes) | ✅ | auth | — | Auth-only — not staff operational |

---

## Backend Nav Slugs Referenced

`reception`, `maintenance`, `staff_management`, `attendance`, `department_roster`,
`management_analytics`, `restaurants`, `rooms`, `room_service`, `breakfast`,
`menus_management`, `guests`, `bookings`, `room_bookings`, `housekeeping`,
`hotel_info`, `good_to_know`, `stock_tracker`, `chat`, `games`, `home`

Ensure these slugs exist as `NavigationItem.slug` values in the backend.

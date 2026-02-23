# 35 — UI Breakdown by Route

> Every section below corresponds to a route registered in `src/App.jsx`.
> For each route: file path, responsibility, visual structure, data dependencies, realtime, control flow, side effects, permissions, failure handling, and risks.

---

## PUBLIC ROUTES

---

### ROUTE: `/`
**FILE:** `src/pages/hotels/HotelsLandingPage.jsx`

**A) Responsibility:** Public hotel directory with search and filtering. Redirects authenticated staff to their hotel feed.

**B) Visual structure:**
- Header with logo, user menu (desktop + mobile hamburger)
- Hero image banner
- `HotelsFiltersBar` (`src/components/hotels/HotelsFiltersBar`)
- `HotelsList` (`src/components/hotels/HotelsList`)
- Footer

**C) Data dependencies:**
- `publicAPI.get('/public/hotel-filters/')` — filter facets
- `publicAPI.get('/public/hotels/')` — hotel list (with query params)
- `useAuth()` → `user` from `src/context/AuthContext.jsx`

**D) Realtime dependencies:** None.

**E) Control flow:**
- Staff redirect: if `user?.hotel_slug` → navigates to `/staff/{slug}/feed` (bypass with `?browse=true`)
- Loading/error passed to `HotelsList`
- Client-side filtering

**F) Side effects:**
- `useEffect([])` — fetch filters on mount
- `useEffect([filters])` — fetch hotels on filter change
- Staff redirect check on mount

**G) Permissions model:** Public. Staff auto-redirected.

**H) Failure handling:** Filter errors silently fall back to empty arrays. Hotel fetch sets error string.

**I) Risks/tech-debt:**
- 🔴 Hardcoded "NOT OPERATIONAL / FAKE HOTELS" warning banners with `!important` inline styles — staging artifact
- 🟡 No debounce on filter text input — re-fetches on every keystroke
- 🟡 `console.log` spam at render time

---

### ROUTE: `/hotel/:slug`
**FILE:** `src/pages/hotels/HotelPublicPage.jsx`

**A) Responsibility:** Dynamic section-based hotel public page with inline page builder for staff. Uses preset/variant-based theming.

**B) Visual structure:**
- Loading / Error / NoData / EmptyNonStaff states
- `PresetSelector` + `PresetVariantSelector` (staff only) from `src/components/presets/`
- Dynamic section rendering via switch: `HeroSectionPreset`, `GallerySectionPreset`, `ListSectionPreset`, `NewsSectionPreset`, `ContentBlockSectionPreset`
- Fixed "All Hotels" back button

**C) Data dependencies:**
- `fetchPublicPage(slug)` from `src/services/sectionEditorApi.js`
- `applyPageStyle()` from same service
- `useAuth()` → `user`

**D) Realtime dependencies:** None.

**E) Control flow:**
- Loading spinner → Error (404 / network / generic) → Empty sections gate
- Inactive sections skipped
- Unknown section types: staff sees debug card, guests see nothing

**F) Side effects:**
- `useEffect([slug, isStaff])` — fetch page data

**G) Permissions model:** Public. Staff sees builder controls via `isStaff` check.

**H) Failure handling:** 404 → "Hotel not found"; `ERR_NETWORK` → network error message; generic fallback.

**I) Risks/tech-debt:**
- 🔴 Massive `console.log` spam including full JSON API response dumps
- 🔴 `debugRoomTypes()` called on every page load — makes extra API calls
- 🟡 Duplicate of `SectionBasedPublicPage` with different component set — consolidation needed

---

### ROUTE: `/hotel/:slug/sections`
**FILE:** `src/pages/sections/SectionBasedPublicPage.jsx`

**A) Responsibility:** Read-only section-based hotel public page renderer. Simpler alternative to `HotelPublicPage`.

**B) Visual structure:**
- Navbar with "All Hotels" link, hotel name/tagline, staff "Edit Sections" link
- Dynamic sections: `HeroSectionView`, `GallerySectionView`, `ListSectionView`, `NewsSectionView`, `ContentBlockSectionView`
- Footer

**C) Data dependencies:**
- `fetchPublicPage(slug)` from `src/services/sectionEditorApi.js`
- `useAuth()` → `user`

**D) Realtime dependencies:** None.

**E) Control flow:** Loading → Error (404/generic) → No data warning → Empty sections → Normal.

**F) Side effects:** `useEffect([slug])` — fetch page data.

**G) Permissions model:** Public. "Edit Sections" link shown to staff only.

**H) Failure handling:** 404 → specific message; generic → "Failed to load hotel page". No retry.

**I) Risks/tech-debt:**
- 🟡 Likely duplicate of `HotelPublicPage` — uses `*SectionView` vs `*SectionPreset` components

---

### ROUTE: `/:hotelSlug`
**FILE:** `src/pages/HotelPortalPage.jsx`

**A) Responsibility:** Guest-facing hotel portal. Fetches hotel data, applies theming, subscribes to realtime settings updates.

**B) Visual structure:**
- Sticky header with hotel name, location, logo, "All Hotels" back link
- Staff-only "Back to Staff Feed" button
- `GuestHotelHome` (`src/sections/GuestHotelHome.jsx`) in read-only mode

**C) Data dependencies:**
- `publicAPI.get('/public/hotel/${hotelSlug}/page/')` — hotel data + settings
- `useAuth()` → `user`
- `useHotelTheme()` from `src/hooks/useHotelTheme.js`

**D) Realtime dependencies:**
- `useHotelRealtime()` from `src/hooks/useHotelRealtime.js` — Pusher subscription for live settings changes (hero image, welcome message)

**E) Control flow:** Loading spinner → Error/null hotel → Normal with header + `GuestHotelHome`.

**F) Side effects:**
- `useEffect([hotelSlug])` — fetch hotel data, store in AuthContext
- `useHotelRealtime()` — Pusher subscription

**G) Permissions model:** Public. Staff "Back to Feed" button gated by `user`.

**H) Failure handling:** 404 → hotel-specific error; 500+ → "Server error"; `ERR_NETWORK` → "Network error".

**I) Risks/tech-debt:**
- 🟡 `setCurrentHotel()` stores entire hotel response in AuthContext — context bloat
- 🟡 Realtime callback merges partial data without shape validation

---

### ROUTE: `/:hotelSlug/book` and `/booking/:hotelSlug`
**FILE:** `src/pages/bookings/GuestRoomBookingPage.jsx`

**A) Responsibility:** 4-step guest room booking flow: Dates → Room Selection → Guest Details → Payment.

**B) Visual structure:**
- Header with Back/Cancel, hotel name, progress stepper (steps 1–4)
- Step 1: Date picker, guest count, "Check Availability"
- Step 2: Room cards with pricing, discounts, availability badges
- Step 3: Booker type (SELF/THIRD_PARTY), guest form, companions, promo code, special requests
- Step 4: Booking summary, countdown timer, cancellation policy, Stripe payment button
- `BookingExpiredModal` (`src/components/modals/BookingExpiredModal`)

**C) Data dependencies:**
- `publicAPI.get('/hotel/${hotelSlug}/page/')` — hotel info + room types
- `publicAPI.get('/hotel/${hotelSlug}/availability/')` — check availability
- `publicAPI.post('/hotel/${hotelSlug}/pricing/quote/')` — price quote
- `publicAPI.post('/hotel/${hotelSlug}/bookings/')` — create booking
- `publicAPI.post('.../payment/session/')` — create Stripe session
- `publicAPI.get('.../room-bookings/${bookingId}/')` — hold rehydration
- `useCountdownTimer()` from `src/hooks/useCountdownTimer.js`
- `useExpiredBookingHandler()` from `src/hooks/useExpiredBookingHandler.js`
- `bookingHoldStorage` utilities from `src/utils/bookingHoldStorage.js`

**D) Realtime dependencies:** None — HTTP-first design.

**E) Control flow:**
- Loading gate (hotel data)
- Step-based conditional rendering (`currentStep`)
- Booking hold rehydration from localStorage
- Expired booking → modal → redirect

**F) Side effects:**
- `useEffect([hotelSlug])` — fetch hotel data
- `useEffect([])` — rehydrate booking hold
- `useEffect([numAdults])` — build companion slots

**G) Permissions model:** Fully public, no auth required.

**H) Failure handling:** API errors extract `error`/`detail` from response. Expired bookings handled via modal + redirect.

**I) Risks/tech-debt:**
- 🟡 Currency hardcoded as `€` throughout
- 🟡 Guest count limits (6/4/8) are client-only
- 🟡 No way to return to step 2 without losing quote

---

### ROUTE: `/booking/confirmation/:bookingId`
**FILE:** `src/pages/bookings/BookingConfirmation.jsx`

**A) Responsibility:** Static booking confirmation display.

**B) Visual structure:** Success check icon, booking details card, "What's Next?" card, action links.

**C) Data dependencies:** All data from React Router `location.state` — no API calls.

**D) Realtime dependencies:** None.

**E) Control flow:** Missing `state` → warning alert.

**F) Side effects:** None.

**G) Permissions model:** None.

**H) Failure handling:** Only guards against missing state.

**I) Risks/tech-debt:**
- 🔴 Page refresh loses all data — relies entirely on `location.state`
- 🟡 Currency hardcoded as `€`

---

### ROUTE: `/booking/status/:hotelSlug/:bookingId`
**FILE:** `src/pages/bookings/BookingStatusPage.jsx`

**A) Responsibility:** Token-based booking management page for guests. Status display, check-in window, room service, breakfast, chat, cancellation.

**B) Visual structure:**
- Sticky service bar (Room Service / Breakfast / Chat) for checked-in guests
- `RoomService`, `Breakfast` from `src/components/rooms/` inline
- Booking details panel, status header, cancellation section with fee preview, hotel contact card, cancellation modal

**C) Data dependencies:**
- `publicAPI.get('/hotel/${hotelSlug}/room-bookings/${bookingId}/?token=...')` — booking details
- `publicAPI.get('.../chat/${hotelSlug}/guest/chat/context/')` — guest permissions
- `publicAPI.post('.../cancel/')` — cancellation
- `useRoomBookingState()` from `src/realtime/stores/roomBookingStore.js`
- `guestBookingTokens` utilities from `src/utils/guestBookingTokens.js`

**D) Realtime dependencies:**
- `useRoomBookingState()` — canonical store for realtime booking updates (Pusher-backed). Merges into local state. Triggers toasts for check-in/check-out events.

**E) Control flow:**
- Loading / Error / No booking gates
- Status display via `getStatusDisplay()` mapping (~10 statuses)
- Check-in window calculator (interval every 60s)
- Token-scoped permissions: `canChat`, `canRoomService`, `canBreakfast`
- Cancellation gated by `canCancel && !isCheckedIn`

**F) Side effects:**
- `useEffect([])` — fetch booking status
- `useEffect([booking?.id])` — fetch guest context
- `useEffect([booking?.guest_token])` — direct chat enablement for checked-in guests
- `useEffect([bookingId, roomBookingState])` — merge realtime updates
- `useEffect([booking])` — check-in window calculator (interval 60s)

**G) Permissions model:** Token-based: `?token=` query parameter from booking email. 401/403 → "Invalid or expired access token".

**H) Failure handling:**
- 404 → "Booking not found"
- 401/403 → "Invalid or expired access token"
- Guest context failures: `contextError` but keeps page usable; fallback permissions for checked-in guests
- Max 1 retry for guest context

**I) Risks/tech-debt:**
- 🔴 Massive `console.log` spam
- 🔴 Multiple competing effects set `guestContext` — potential state oscillation
- 🟡 Check-in window hardcodes 8:00 AM — testing artifact comment found
- 🟡 Token resolution logic spread across 3 utilities and multiple effects

---

### ROUTE: `/booking/:hotelSlug/payment/success` and `/booking/payment/success`
**FILE:** `src/pages/bookings/BookingPaymentSuccess.jsx`

**A) Responsibility:** Stripe payment redirect handler. Verifies payment, polls for status, displays dynamic status UI.

**B) Visual structure:**
- Loading card → Error alert → Status-specific header (confirmed/pending/declined)
- Booking details grid, action buttons, help section, `BookingExpiredModal`

**C) Data dependencies:**
- `publicAPI.post('.../payment/verify/')` — verify Stripe session
- `publicAPI.get('.../room-bookings/${bookingId}/')` — booking details
- `clearHold()` from `src/utils/bookingHoldStorage.js`
- `useExpiredBookingHandler()`

**D) Realtime dependencies:** None — HTTP polling (every 3s, up to 100 attempts for `PENDING_APPROVAL`).

**E) Control flow:**
- Loading → Error → No booking → Status-based rendering (CONFIRMED / PENDING_APPROVAL / DECLINED / PENDING_PAYMENT)
- Polling up to 20 attempts for PENDING_PAYMENT, 100 for PENDING_APPROVAL

**F) Side effects:**
- `useEffect([stopPolling])` — cleanup interval
- `useEffect([bookingId, sessionId])` — verify + fetch + poll

**G) Permissions model:** Public. Relies on `bookingId` + `sessionId` URL params.

**H) Failure handling:** Verification failure → error message. Polling errors increment counter, stop after 20 failures.

**I) Risks/tech-debt:**
- 🟡 "My Bookings" navigates to `/my-bookings` — route may not exist
- 🟡 Polling 3s × 100 = 5 minutes for PENDING_APPROVAL — resource drain
- 🟡 Currency hardcoded as `€`

---

### ROUTE: `/booking/:hotelSlug/payment/cancel` and `/booking/payment/cancel`
**FILE:** `src/pages/bookings/BookingPaymentCancel.jsx`

**A) Responsibility:** Static page for Stripe payment cancellation.

**B) Visual structure:** Warning icon, "Payment Cancelled" heading, navigation buttons.

**C) Data dependencies:** Only reads `booking_id` from URL search params.

**D–I)** Minimal — no API calls, no realtime, no auth. Risk: `window.history.back()` may return to Stripe instead of booking page.

---

### ROUTE: `/guest/hotel/:hotelSlug/precheckin`
**FILE:** `src/pages/guest/GuestPrecheckinPage.jsx`

**A) Responsibility:** Token-based guest pre-check-in form. Collects guest info, companions, hotel-configurable extras.

**B) Visual structure:**
- `PrecheckinHeader` (`src/components/guest/PrecheckinHeader.jsx`)
- `BookingContactCard` (`src/components/guest/BookingContactCard.jsx`)
- `PrimaryGuestCard`, `CompanionsSection`, `ExtrasSection`, `SubmitBar`

**C) Data dependencies:**
- `publicAPI.get('/hotel/${hotelSlug}/precheckin/?token=...')` — config, booking, party, field registry
- `publicAPI.post('/hotel/${hotelSlug}/precheckin/submit/?token=...')` — submit

**D) Realtime dependencies:** None.

**E) Control flow:** Missing token → error. Loading → Error (401 → "Invalid/expired link") → Success → Form with dynamic fields.

**F) Side effects:** `useEffect([])` — load precheckin data.

**G) Permissions model:** Token-based from email link.

**H) Failure handling:** 401 → specific message. 400 with field errors → mapped to form. Generic → toast.

**I) Risks/tech-debt:**
- 🟡 Token sent in both query param AND POST body — redundant
- 🟡 Extensive console logging

---

### ROUTE: `/guest/hotel/:hotelSlug/survey`
**FILE:** `src/pages/guest/GuestSurveyPage.jsx`

**A) Responsibility:** Token-based guest survey form with dynamic fields.

**B) Visual structure:** Loading / Invalid / Expired / Completed states. Survey header, dynamic form fields (rating, textarea, checkbox, etc.), submit button.

**C) Data dependencies:**
- `useSurveyData()` from `src/hooks/useSurveyData.js`
- `useSurveyForm()` from `src/hooks/useSurveyForm.js`

**D) Realtime dependencies:** None.

**E) Control flow:** Loading → isInvalid → isExpired → isSubmitted → isReady → Fallback error with retry.

**G) Permissions model:** Token-based from email link.

**I) Risks/tech-debt:** Rating radio buttons lack accessibility labels.

---

### ROUTE: `/guest/chat`
**FILE:** `src/pages/GuestChatPortal.jsx`

**A) Responsibility:** Full-page guest chat portal. Validates URL params and renders `GuestChatWidget`.

**B) Visual structure:** Error card (if missing params) or `GuestChatWidget` (`src/components/guest/GuestChatWidget`) at max 450×600px.

**C) Data dependencies:** None directly — reads `hotelSlug` and `token` from URL search params.

**D) Realtime dependencies:** Delegated to `GuestChatWidget` (Pusher-based).

**G) Permissions model:** Token-based from query params.

---

### ROUTE: `/guest-booking/:hotelSlug/restaurant/:restaurantSlug/`
**FILE:** `src/components/bookings/DinnerBookingList.jsx`

**A) Responsibility:** Staff-facing list of dinner bookings per restaurant with restaurant selector.

**B) Visual structure:** Restaurant dropdown, dark-themed booking table (ID, Date, Time, Restaurant, Seats, etc.).

**C) Data dependencies:**
- `api.get('/staff/hotel/${hotelSlug}/restaurants/')` — restaurant list
- `api.get('/staff/hotel/${hotelSlug}/bookings/${restaurantSlug}/')` — bookings
- `useServiceBookingState()` / `useServiceBookingDispatch()` from `src/realtime/stores/serviceBookingStore.jsx`

**D) Realtime dependencies:** Store bookings from `serviceBookingStore` computed but **never rendered** — local `bookings` state used instead.

**E) Control flow:** Loading restaurants → Error → No restaurants → Loading bookings → No bookings → Normal.

**I) Risks/tech-debt:**
- 🟡 Store bookings computed but unused — dead code
- 🟡 API paths missing leading `/`
- 🟡 Error display bug: `.response.data.error` called on string error state

---

### ROUTE: `/guest-booking/:hotelSlug/restaurant/:restaurantSlug/room/:roomNumber/`
**FILE:** `src/components/bookings/DinnerBookingForm.jsx`
**Auth Gate:** `RequireDinnerPin`

**A) Responsibility:** Guest-facing dinner booking form (date, time slot, guest counts, voucher code).

**B) Visual structure:** HotelLogo header, DatePicker, time-slot select, guest inputs, voucher, SuccessModal.

**C) Data dependencies:** `api.post('/guest-booking/${hotelSlug}/restaurant/${restaurantSlug}/room/${roomNumber}/')` — create booking.

**D) Realtime dependencies:** None.

**I) Risks/tech-debt:**
- 🟡 Hard-coded time-slot range 17:30–21:15
- 🟡 No loading/disabled state on submit button during network call

---

### ROUTE: `/hotels/:hotelSlug/restaurants/:restaurantSlug`
**FILE:** `src/components/restaurants/Restaurant.jsx`

**A) Responsibility:** Single restaurant detail view with editable fields and optional floor-plan blueprint.

**B) Visual structure:** Restaurant name, field cards (Capacity, Times, Bookings config), BlueprintFloorEditor, RestaurantEditModal.

**C) Data dependencies:**
- `useRestaurantDetail()` — hook for restaurant data
- `useRestaurantMutations()` — hook for save/update

**D) Realtime dependencies:** None.

**I) Risks/tech-debt:** Local state duplicates hook data — potential desync. `window.alert` for errors.

---

### ROUTE: `/good_to_know/:hotel_slug/:slug`
**FILE:** `src/components/hotel_info/GoodToKnow.jsx`

**A) Responsibility:** Public read-only detail view for a single "Good To Know" entry.

**B) Visual structure:** Loading spinner → Error alert → Warning (no data) → Card with title + content.

**C) Data dependencies:** `api.get('/good_to_know/${slug}/')`.

**D–I)** Minimal. Public, no realtime, no auth.

---

## PIN-AUTHENTICATED ROUTES

---

### ROUTE: `/room_services/:hotelIdentifier/room/:roomNumber/menu`
**FILE:** `src/components/rooms/RoomService.jsx`
**Auth Gate:** `RequirePin`

**A) Responsibility:** Guest-facing room service menu & ordering with realtime order tracking.

**B) Visual structure:**
- Header (room number, availability badge)
- Active orders with progress steps (Received → Preparing → Ready)
- Order history modal
- Menu grid with quantity controls + Add to Cart
- Floating cart → Order panel (review items, instructions, place order)
- `DeletionModal` (`src/components/modals/DeletionModal`)

**C) Data dependencies:**
- `api.get('/room_services/${hotelIdentifier}/rooms/${roomNumber}/menu/')` — menu items
- `api.get('/room_services/${hotelIdentifier}/rooms/${roomNumber}/orders/')` — previous orders
- `api.post('/room_services/${hotelIdentifier}/rooms/${roomNumber}/orders/')` — place order
- `useRoomServiceState()` / `useRoomServiceDispatch()` from `src/realtime/stores/roomServiceStore.jsx`
- `subscribeToRoomChannels()` from `src/realtime/channelRegistry.js`

**D) Realtime dependencies:**
- `roomServiceStore` — order tracking + toast on status changes within 10s
- Pusher channels via `subscribeToRoomChannels()`
- Window events: `roomServiceOrderUpdate`, `roomServiceNewOrder`, `roomServiceStatusChange`

**E) Control flow:** Loading during menu fetch, out-of-stock disabled, cart-gated floating button.

**F) Side effects:** 5+ `useEffect` hooks for order tracking, room sync, Pusher subscription, window listeners, initial fetch.

**G) Permissions model:** PIN-validated via `RequirePin` gate.

**I) Risks/tech-debt:**
- 🔴 **1166 lines** — monolith
- 🟡 Duplicate toast notifications from multiple realtime effects
- 🟡 Store init dispatches N `ORDER_CREATED` events — should use bulk action

---

### ROUTE: `/room_services/:hotelIdentifier/room/:roomNumber/breakfast/`
**FILE:** `src/components/rooms/Breakfast.jsx`
**Auth Gate:** `RequirePin`

**A) Responsibility:** Guest-facing breakfast ordering with time-slot selection and realtime tracking.

**B) Visual structure:** Header, time-slot selector, category filter, item list with steppers, sticky cart bar, review bottom sheet, policy modal, success banner.

**C) Data dependencies:**
- `api.get('/room_services/${hotelIdentifier}/rooms/${roomNumber}/breakfast/')` — items
- `api.post(...)` — submit order
- `useRoomServiceState()` from `src/realtime/stores/roomServiceStore.jsx`

**D) Realtime dependencies:** `roomServiceStore` — monitors breakfast order status, toasts within 30s window.

**I) Risks/tech-debt:**
- 🟡 Missing `hotelIdentifier` dependency in menu fetch `useEffect`
- 🟡 `window.alert` for errors instead of toast
- 🟡 Hardcoded pricing in policy modal ("17.50 Euro")
- 🟡 No loading state for initial menu fetch

---

### ROUTE: `/chat/:hotelSlug/conversations/:conversationId/messages/send`
**FILE:** `src/components/chat/ChatWindow.jsx`
**Auth Gate:** `RequireChatPin`

### ROUTE: `/chat/:hotelSlug/conversations/:conversationId/messages`
**FILE:** `src/components/chat/ChatWindow.jsx`

**A) Responsibility:** Full-featured real-time chat window supporting both staff and guest modes. Text + file attachments via Cloudinary, replies, delete, share, read receipts, Pusher, FCM, emoji picker, infinite scroll.

**B) Visual structure:**
- Header: back button, hotel logo (guest), guest/staff name, handler info
- Scrollable message list with system markers, reply previews, attachment rendering
- Footer: emoji picker, reply preview, file preview, text input, send button
- `ConfirmationModal`, `SuccessModal`

**C) Data dependencies:**
- `api.get('/staff/hotel/${slug}/chat/conversations/${id}/messages/')` — paginated messages
- `api.post('.../messages/send/')` — send message
- `api.post('.../upload-attachment/')` — file upload (uses raw `axios`)
- `api.post('.../assign-staff/')` — staff auto-assignment
- `api.post('.../mark-read/')` — read receipts
- `useChatStore()` / `useChatDispatch()` from `src/realtime/stores/chatStore.jsx`
- `ChatContext` from `src/context/ChatContext.jsx`

**D) Realtime dependencies:**
- `chatStore` for staff conversations
- Pusher via centralized `RealtimeProvider` (guests) and `chatStore` sync (staff)
- FCM `onMessage` for foreground push
- Service Worker notifications for tab-hidden
- `IntersectionObserver` for message-seen tracking

**E) Control flow:** `isGuest` branch controls auth payload, message source, Pusher path, mark-read behavior. Deleted messages → placeholder. System messages → centered pill. Own vs other → left/right.

**F) Side effects:** 14+ `useEffect` hooks (conversation init, staff assign, fetch messages, Pusher setup, store sync, FCM listener, IntersectionObserver, auto mark-read, emoji click-outside, infinite scroll, etc.).

**G) Permissions model:** `isGuest` — no `user`; staff via Token auth; guest via `guest_token`.

**H) Failure handling:** Send fail → toast + "failed" message with retry. Fetch fail → toast. FCM/assign/mark-read fail → console only.

**I) Risks/tech-debt:**
- 🔴 **2405 lines** — extremely large component
- 🔴 50+ `console.log/warn/error` in production
- 🟡 Raw `axios` for file upload instead of `api` instance — duplicates auth logic
- 🟡 Multiple message sources create complex merge/dedup logic
- 🟡 `window.alert` for errors

---

## STAFF-PROTECTED ROUTES

---

### ROUTE: `/staff/:hotelSlug/feed`
**FILE:** `src/pages/home/Home.jsx`

**A) Responsibility:** Minimal wrapper rendering the `Feed` component (`src/components/home/Feed`).

**B) Visual structure:** Container wrapping `Feed`.

**C–I)** All logic delegated to `Feed`. Pure passthrough wrapper.

---

### ROUTE: `/staff/:hotelSlug/section-editor`
**FILE:** `src/pages/sections/SectionEditorPage.jsx`

**A) Responsibility:** Staff admin page for managing hotel public page sections — CRUD, drag-and-drop reorder, toggle active.

**B) Visual structure:**
- Header with "Preview Page" and "Add Section" buttons
- `DragDropContext`/`Droppable`/`Draggable` from `@hello-pangea/dnd`
- Per-section: card with drag handle, active toggle, delete, inline editor
- Add Section Modal

**C) Data dependencies:**
- `fetchSections()`, `createSection()`, `deleteSection()`, `updateSection()` from `src/services/sectionEditorApi.js`
- `useAuth()` → `user`
- `usePermissions()` → `isSuperAdmin()`

**E) Control flow:** Permission gate → Loading → Error with retry → Empty → Normal.

**G) Permissions model:** Hard gate on `isSuperAdmin()`. Non-super-admins redirected to home.

**I) Risks/tech-debt:**
- 🟡 Reorder sends N parallel `updateSection()` calls — should use batch endpoint
- 🟡 `window.confirm` for delete

---

### ROUTE: `/reception`
**FILE:** `src/components/Reception.jsx`

**A) Responsibility:** Reception dashboard landing — hotel name, logo, room search bar.

**B) Visual structure:** Header with hotel name + logo, `Search` component (`src/components/utils/Search`).

**C) Data dependencies:** `api.get('/me/')` — staff profile.

**I) Risks/tech-debt:** Silent error swallowing on fetch failure. CDNURL hardcoded.

---

### ROUTE: `/staff/:hotelSlug/settings`
**FILE:** `src/components/utils/Settings.jsx`

**A) Responsibility:** Staff settings page — theme configuration and staff registration.

**B) Visual structure:**
- Permission denied alert (two tiers)
- `SectionThemeSettings`, `SectionStaffRegistration`

**C) Data dependencies:** `useAuth()` → `user`. `usePermissions()` → `hasPermission`, `isSuperAdmin`.

**G) Permissions model:** ✅ **Strongest in codebase:** Must be authenticated, belong to URL hotel, be superuser OR `super_staff_admin`.

---

### ROUTE: `/super-user`
**FILE:** `src/pages/SuperUser.jsx`

**A) Responsibility:** Super-admin panel — create hotels with full bootstrap, maintenance tools for existing hotels.

**B) Visual structure:**
- Access denied gate
- Hotel Management card (create form)
- Hotel Maintenance card (bootstrap public page, setup nav icons)
- System Administration card (Django admin link)
- User Information card

**C) Data dependencies:**
- `api.post('/staff/hotels/')` — create hotel
- `api.post('/staff/hotel/${slug}/hotel/public-page-builder/bootstrap-default/')` — bootstrap
- `api.post('/staff/hotel/${slug}/hotel/public-page-builder/')` — fallback
- `api.post('/staff/hotel/${slug}/room-types/create-defaults/')` — room types
- `api.post('/staff/hotel/${slug}/navigation-items/')` — nav items

**G) Permissions model:** `is_superuser` check — renders access-denied for non-superusers.

**I) Risks/tech-debt:**
- 🟡 `document.getElementById` anti-pattern
- 🟡 Sequential API calls for 15 nav items — should batch
- 🟡 Hardcoded default room types/prices

---

### ROUTE: `/rooms`
**FILE:** `src/components/rooms/RoomList.jsx`

**A) Responsibility:** Paginated, searchable, filterable room list using API + realtime store data.

**B) Visual structure:** Search + status filter + "Live" badge, room card grid (`RoomCard`), pagination.

**C) Data dependencies:**
- React Query `useQuery('rooms')` → `api.get('/staff/hotel/${slug}/rooms/dashboard/')`
- `useRoomsState()` / `useRoomsDispatch()` from `src/realtime/stores/roomsStore.jsx`

**D) Realtime dependencies:** `roomsStore` data preferred over API when available. `lastUpdated` shows "Live" badge.

**I) Risks/tech-debt:**
- 🟡 `JSON.parse(localStorage.getItem('user'))` called in render body
- 🟡 Three copies of room data (React Query cache, roomsStore, local state) can drift
- 🟡 `keepPreviousData` deprecated in React Query v5

---

### ROUTE: `/room-management/:hotelIdentifier/room/:roomNumber`
**FILE:** `src/components/rooms/RoomDetails.jsx`

**A) Responsibility:** Detailed room view with operational status, turnover workflow actions, status overrides, guest context, tabbed notes/history.

**B) Visual structure:**
- Sticky header: room number + status pill + action buttons
- Left: Operational Status, Turnover Actions, Quick Status Override
- Right: Guest & Booking Context, Tabs (Notes, History, Turnover, Maintenance)
- Modals: Status Override, Inspection

**C) Data dependencies:**
- `api.get('/staff/hotel/${slug}/housekeeping/rooms/${roomId}/')` — room details
- `startCleaning()`, `markCleaned()`, `inspectRoom()` from `src/services/roomOperations.js`
- `useRoomsState()` from `src/realtime/stores/roomsStore.jsx`

**D) Realtime dependencies:** `roomsStore` preferred over static API data.

**G) Permissions model:** Role-based: `housekeepingRoles = ['housekeeping', 'admin', 'manager']`. Manager override for status overrides.

**I) Risks/tech-debt:**
- 🔴 **1103 lines** — monolith
- 🟡 Notes/History/Turnover tabs are stub placeholders
- 🟡 Race condition: realtime merge could overwrite fresh API data

---

### ROUTE: `/room_services/:hotelIdentifier/orders`
**FILE:** `src/components/room_service/RoomServiceOrders.jsx`

**A) Responsibility:** Staff-facing room service orders list (excluding breakfast) with status transitions.

**B) Visual structure:** Mobile quick action bar, order cards with status badge, status transition buttons.

**C) Data dependencies:**
- React Query `useQuery` → orders fetch
- `api.patch(...)` — status update
- `useRoomServiceState()` / `useRoomServiceDispatch()` from `src/realtime/stores/roomServiceStore.jsx`
- `useRoomServiceNotification()` from `src/context/RoomServiceNotificationContext.jsx`

**D) Realtime dependencies:** Orders derived from `roomServiceStore`. Notification triggers re-fetch.

**I) Risks/tech-debt:**
- 🔴 **Critical bug:** `setOrders()` called on store-derived data — function doesn't exist
- 🟡 Hardcoded €5 tray charge

---

### ROUTE: `/room_services/:hotelIdentifier/breakfast-orders`
**FILE:** `src/components/room_service/BreakfastRoomService.jsx`

**A) Responsibility:** Staff-facing breakfast orders list with status transitions.

**C) Data dependencies:** Same pattern as `RoomServiceOrders` but filtered to breakfast.

**I) Risks/tech-debt:**
- 🔴 Same `setOrders()` bug as `RoomServiceOrders`
- 🔴 `fetchOrders` called on success but **function doesn't exist** (undefined)
- 🟡 `window.alert` for errors

---

### ROUTE: `/room_services/:hotelIdentifier/orders-summary`
**FILE:** `src/components/room_service/OrdersSummary.jsx`

**A) Responsibility:** Read-only dashboard of all orders with status breakdown, filtering, pagination.

**B) Visual structure:** Status breakdown badges, filter card, order card grid, pagination.

**C) Data dependencies:** `api.get(...)` with query params. Initializes `roomServiceStore` with data.

**I) Risks/tech-debt:**
- 🟡 `roomServiceOrders` from store declared but unused in render
- 🟡 Status filter doesn't include "completed" or "cancelled"

---

### ROUTE: `/room_services/:hotelIdentifier/orders-management`
**FILE:** `src/components/room_service/RoomServiceOrdersManagement.jsx`

**A) Responsibility:** Dual-view orders management — Active (100% realtime) and History (paginated API).

**B) Visual structure:** Active/History toggle, status breakdown, filters (history), order cards, pagination (history).

**C) Data dependencies:**
- `api.get(...)` — initial store seed + history
- `api.patch(...)` — status update
- `subscribeToRoomChannels()` from `src/realtime/channelRegistry.js`

**D) Realtime dependencies:** Active view derived purely from `roomServiceStore` (Pusher-backed). Backup `ORDER_UPDATED` dispatch + CustomEvent on status change.

**I) Risks/tech-debt:**
- 🟡 No workflow validation on status change (unlike `RoomServiceOrders`)
- 🟡 Backup dispatch + CustomEvent = workaround for unreliable Pusher

---

### ROUTE: `/menus_management/:hotelSlug`
**FILE:** `src/components/menus/MenusManagement.jsx`

**A) Responsibility:** CRUD management for room service and breakfast menu items.

**B) Visual structure:** Menu type selector, category filter pills, menu item card grid, create/edit modals.

**C) Data dependencies:**
- `api.get(...)` — paginated item fetch (loops all pages)
- `api.post/put/delete(...)` — CRUD with `multipart/form-data`
- Fallback to guest endpoint (room 1) if staff endpoint fails

**I) Risks/tech-debt:**
- 🔴 **1217 lines** — monolith
- 🟡 Fallback to guest endpoint hardcodes room number 1
- 🟡 `URL.createObjectURL` memory leak (no cleanup on unmount)
- 🟡 Stock toggle button has no `onClick` handler — non-functional UI

---

### ROUTE: `/:hotelSlug/staff`
**FILE:** `src/components/staff/Staff.jsx`

**A) Responsibility:** Staff directory with face registration stats and clocked-in toggle.

**B) Visual structure:** Face Registration Stats card, face filter buttons, `StaffByDepartment`, `ClockedInTicker`.

**C) Data dependencies:**
- `api.get('/staff/hotel/${hotelSlug}/staff/')` — staff list
- `api.get('/staff/hotel/${hotelSlug}/attendance/logs/')` — clocked-in logs

**I) Risks/tech-debt:**
- 🟡 `window.refreshStaffList` global function — non-React-idiomatic
- 🟡 No pagination

---

### ROUTE: `/:hotelSlug/staff/create`
**FILE:** `src/components/staff/StaffCreate.jsx`

**A) Responsibility:** Create staff profiles from pending user registrations.

**B) Visual structure:** Pending registrations list, modal form (department, role, access level, nav permissions).

**C) Data dependencies:**
- `api.get(...)` — pending users, departments, roles, nav items
- `api.post(...)` — create staff

**I) Risks/tech-debt:**
- 🟡 `window.location.reload()` as fallback navigation
- 🟡 No double-submit guard on create button

---

### ROUTE: `/:hotelSlug/staff/:id`
**FILE:** `src/components/staff/StaffDetails.jsx`

**A) Responsibility:** Individual staff profile with face registration management, roster analytics, navigation permission management.

**B) Visual structure:** Profile image, details grid, face management section, `StaffRosterAnalytics`, `NavigationPermissionManager` (super_admin only).

**C) Data dependencies:**
- `api.get(...)` — staff details
- `useFaceAdminApi()`, `useHotelFaceConfig()` — face registration hooks
- React Query for cache invalidation

**G) Permissions model:** Face management: `staff_admin`/`super_staff_admin`/`manager`. Nav permissions: `super_staff_admin` only.

---

### ROUTE: `/:hotelSlug/staff/me`
**FILE:** `src/components/staff/StaffProfile.jsx`

**A) Responsibility:** Thin re-export wrapper for `src/features/staffProfile/StaffProfilePage.jsx`.

---

### ROUTE: `/:hotelIdentifier/guests`
**FILE:** `src/components/guests/GuestList.jsx`

**A) Responsibility:** Searchable list of in-house hotel guests with room numbers.

**C) Data dependencies:** `api.get('/staff/hotel/${hotelSlug}/guests/')`.

**I) Risks/tech-debt:**
- 🟡 No pagination
- 🟡 Check-out date label mismatch between mobile and desktop
- 🟡 Zebra striping ternary is a no-op (both branches use `bg-light`)

---

### ROUTE: `/:hotelIdentifier/guests/:guestId/edit`
**FILE:** `src/components/guests/GuestEdit.jsx`

**A) Responsibility:** Edit form for guest profile fields.

**C) Data dependencies:** `api.get(...)` fetch, `api.put(...)` update.

**I) Risks/tech-debt:** No form validation. `hotelIdentifier` missing from `useEffect` deps.

---

### ROUTE: `/rooms/:roomNumber/add-guest`
**FILE:** `src/components/guests/AssignGuestForm.jsx`

**A) Responsibility:** Form to assign a new guest to a room.

**C) Data dependencies:** `api.get(...)` room details, `api.post(...)` assign guest.

**I) Risks/tech-debt:** Cancel navigates to `/rooms/rooms` (likely wrong path).

---

### ROUTE: `/bookings`
**FILE:** `src/components/bookings/Bookings.jsx`

**A) Responsibility:** Booking categories page — shows restaurant category cards.

**C) Data dependencies:**
- `api.get(...)` — categories
- `useBookingNotification()`, `useTheme()`

**I) Risks/tech-debt:**
- 🟡 `console.log` and `console.error` in render loop
- 🟡 Error display bug: `.error` accessed on string

---

### ROUTE: `/staff/hotel/:hotelSlug/room-bookings`
**FILE:** `src/pages/staff/BookingManagementPage.jsx`

**A) Responsibility:** Wrapper rendering `BookingList` (`src/components/staff/bookings/BookingList`).

**C) Data dependencies:** `useAuth()`. All data delegated to `BookingList`.

---

### ROUTE: `/staff/hotel/:hotelSlug/booking-management`
**FILE:** `src/components/bookings/BookingManagementDashboard.jsx`

**A) Responsibility:** Staff dashboard for booking configuration (pre-checkin, survey, cancellation policy, approval cutoff, checkout time).

**B) Visual structure:** Stacked config components: `PrecheckinRequirementsConfig`, `SurveyRequirementsConfig`, `CancellationPolicyControl`, `ApprovalCutoffConfig`, `CheckoutTimeConfig`.

**C) Data dependencies:** `hotelSlug` from URL or localStorage.

---

### ROUTE: `/staff/hotel/:hotelSlug/housekeeping`
**FILE:** `src/pages/housekeeping/` (barrel → `HousekeepingRooms`)

**A) Responsibility:** Real-time housekeeping dashboard — all rooms by status, staff can filter and change states.

**B) Visual structure:** `HousekeepingDashboard` → `HousekeepingStatusBar` → `HousekeepingRoomGrid`.

**C) Data dependencies:**
- `api.get('/staff/hotel/${slug}/housekeeping/rooms/dashboard/')` — room data
- `useRoomsState()` / `useRoomsDispatch()` from `src/realtime/stores/roomsStore.jsx`
- `roomOperations` from `src/services/roomOperations.js`

**D) Realtime dependencies:** `roomsStore` — WebSocket-backed, auto re-renders on status push.

---

### ROUTE: `/hotel-:hotelSlug/restaurants` and `/:hotelSlug/:restaurantSlug`
**FILE:** `src/pages/bookings/RestaurantManagementDashboard.jsx`

**A) Responsibility:** Staff dashboard for viewing and creating restaurants.

**B) Visual structure:** Mobile quick action buttons, `RestaurantList`, `CreateRestaurantModal`.

**C) Data dependencies:** `useRestaurantSelection(hotelSlug)` hook.

**I) Risks/tech-debt:**
- 🔴 `window.location.reload()` after restaurant creation
- 🟡 No role/permission check

---

### ROUTE: `/hotel_info/:hotel_slug` and `/hotel_info/:hotel_slug/:category`
**FILE:** `src/pages/hotel_info/HotelInfo.jsx`

**A) Responsibility:** Hotel information management — category navigation, event/info cards, QR codes, create/edit modals.

**B) Visual structure:** Category pills, mobile quick actions, date-grouped event card grid, modals.

**C) Data dependencies:**
- `api.get(...)` — categories, info items, QR codes
- `useAuth()`, `useTheme()`
- Window events: `openCreateCategory`, `openCreateInfo`, `downloadAllQRs`

**I) Risks/tech-debt:**
- 🟡 Silent error swallowing in QR download
- 🟡 `window.confirm` for UX flow
- 🟡 598-line component

---

### ROUTE: `/good_to_know_console/:hotel_slug`
**FILE:** `src/components/hotel_info/GoodToKnowConsole.jsx`

**A) Responsibility:** Staff CRUD console for "Good To Know" entries with QR PDF export.

**C) Data dependencies:** `api.get(...)` paginated, `usePdfExporter()`.

**I) Risks/tech-debt:** Pagination division-by-zero if results empty.

---

### ROUTE: `/hotel/:hotelSlug/chat`
**FILE:** `src/pages/chat/ChatHomePage.jsx`

**A) Responsibility:** Chat landing page — sidebar + chat window arrangement, responsive toggle.

**B) Visual structure:** `ChatSidebar`, `ChatWindow`, mobile toggle.

**C) Data dependencies:** `ChatContext` → conversations, `useAuth()`.

**D) Realtime dependencies:** Conversations from `ChatContext` — reactively updated. `markConversationRead()` on selection.

---

### ROUTE: `/maintenance`
**FILE:** `src/pages/maintenance/Maintenance.jsx`

**A) Responsibility:** Maintenance center — submission form + requests list.

**B) Visual structure:** `SubmitMaintenanceRequest`, `MaintenanceRequests`.

**I) Risks/tech-debt:**
- 🟡 Refresh callback wired via `let` variable — fragile
- 🟡 No permission check

---

### ROUTE: `/attendance/:hotelSlug` (and legacy `/roster/:hotelSlug`)
**FILE:** `src/features/attendance/pages/AttendanceDashboard.jsx`

**A) Responsibility:** Primary attendance dashboard — clocked-in staff, roster/log merging, period management, alerts, kiosk mode, CSV/XLSX export.

**B) Visual structure:** Header (date picker, department filter, period selector, kiosk toggle), `ClockedInList`, `AttendanceAlerts`, period table/roster views, `PeriodFinalizeModal`, `ExportModal`, `AttendanceAnalytics`.

**C) Data dependencies:**
- `useAttendanceData()`, `useAttendancePeriods()`, `useStaffMetadata()` hooks
- `useHotelRealtime()` — Pusher events

**D) Realtime dependencies:** `useHotelRealtime()` — handles `clock-status-updated`, `unrostered-request`, etc.

**G) Permissions model:** Kiosk toggle shown only for `super_staff_admin`.

**I) Risks/tech-debt:**
- 🔴 **822 lines** — large file
- 🟡 CSS injected via `<style>` element at module scope
- 🟡 `JSON.parse(localStorage)` inline in JSX

---

### ROUTE: `/department-roster/:hotelSlug`
**FILE:** `src/features/attendance/pages/DepartmentRosterDashboard.jsx`

**A) Responsibility:** Department-focused roster management within selected periods.

**D) Realtime dependencies:** `useHotelRealtime()` — refreshes on `attendance_update`.

**I) Risks/tech-debt:** `PeriodSelector` rendered twice. `useAttendanceData` fetched but never used.

---

### ROUTE: `/enhanced-attendance/:hotelSlug`
**FILE:** `src/features/attendance/components/EnhancedAttendanceDashboard.jsx`

**A) Responsibility:** Enhanced analytics view — performance metrics, staff summary, department analytics, individual rosters.

**B) Visual structure:** Period selector, department/status filters, 4 metric cards, 3 nav tabs.

---

### ROUTE: `/face/:hotelSlug/register`
**FILE:** `src/features/faceAttendance/pages/FaceRegisterPage.jsx`

**A) Responsibility:** Multi-step face registration wizard: Staff ID → Camera capture → Face encoding → Backend registration.

**B) Visual structure:** 3-step state machine: ID input → `CameraCapture` + preview → Processing spinner.

**C) Data dependencies:** `useFaceApi()`, `useHotelFaceConfig()`, `useFaceAdminApi()`.

---

### ROUTE: `/face/:hotelSlug/clock-in` and `/camera-clock-in/:hotelSlug`
**FILE:** `src/features/faceAttendance/pages/FaceClockInPage.jsx`

**A) Responsibility:** Face-based clock in/out — kiosk and personal modes. Capture face → encode → match → clock action.

**B) Visual structure:** 6-phase state machine: inactive → camera → processing → unrostered → options → done.

**C) Data dependencies:** `useFaceApi()`, `useHotelFaceConfig()`, camera hooks.

**D) Realtime dependencies:** Dispatches `refreshAttendanceStatus` window event.

**I) Risks/tech-debt:**
- 🔴 **1082 lines** — very large
- 🟡 Legacy function stubs kept for "backwards compatibility"

---

## STOCK TRACKER ROUTES

---

### ROUTE: `/stock_tracker/:hotel_slug`
**FILE:** `src/pages/stock_tracker/StockDashboard.jsx`

**A) Responsibility:** Stock tracker landing — quick action cards and stock-value report for latest period.

**I) Risks/tech-debt:**
- 🔴 **Bug:** `error` state is set but **never rendered** — user sees infinite spinner on failure

---

### ROUTE: `/stock_tracker/:hotel_slug/analytics`
**FILE:** `src/pages/stock_tracker/Analytics.jsx`

**A) Responsibility:** Analytics dashboard orchestrator — 16+ chart sub-components, PDF export.

**I) Risks/tech-debt:**
- 🔴 **1230 lines** with massive inline styles for 16 toggle buttons
- 🟡 Export uses arbitrary `setTimeout` waits for chart rendering

---

### ROUTE: `/stock_tracker/:hotel_slug/items`
**FILE:** `src/components/stock_tracker/stock_items/StockItemsResponsive.jsx`

**A) Responsibility:** Responsive wrapper — renders `StockItemsList` (desktop) or `StockItemsListMobile` (<768px).

---

### ROUTE: `/stock_tracker/:hotel_slug/profitability`
**FILE:** `src/components/stock_tracker/stock_items/StockItemProfitability.jsx`

**A) Responsibility:** Profitability analysis table — GP%, markup%, pour cost% with industry benchmarks.

**C) Data dependencies:** `getItemProfitability()` from `src/services/stockAnalytics.js`.

---

### ROUTE: `/stock_tracker/:hotel_slug/movements`
**FILE:** `src/components/stock_tracker/movements/MovementsList.jsx`

**A) Responsibility:** Stock movements list with filters and record modal.

**C) Data dependencies:** `useStockItems()`, `useStockMovements()` hooks.

**I) Risks/tech-debt:** `JSON.parse(localStorage)` at render time. O(n²) item lookup per row.

---

### ROUTE: `/stock_tracker/:hotel_slug/stocktakes`
**FILE:** `src/components/stock_tracker/stocktakes/StocktakesList.jsx`

**A) Responsibility:** Stocktake listing with status filter and create button.

---

### ROUTE: `/stock_tracker/:hotel_slug/stocktakes/:id`
**FILE:** `src/components/stock_tracker/stocktakes/StocktakeDetail.jsx`

**A) Responsibility:** Full stocktake detail — line items with inline editing, Pusher realtime updates, approval workflow.

**D) Realtime dependencies:** **Direct Pusher SDK** (not via centralized eventBus) — subscribes to line updates, status changes.

**I) Risks/tech-debt:**
- 🔴 **1397 lines** — very large
- 🔴 Pusher initialized directly instead of centralized realtime (noted as TODO)
- 🟡 Movement + PATCH are not atomic — partial failure possible

---

### ROUTE: `/stock_tracker/:hotel_slug/periods`
**FILE:** `src/components/stock_tracker/periods/PeriodSnapshots.jsx`

**A) Responsibility:** Period listing — create, reopen (superuser), delete (superuser), auto-create stocktakes.

**G) Permissions model:** Superuser-only: delete and reopen buttons.

**I) Risks/tech-debt:**
- 🟡 `handlePeriodClick` is ~120 lines doing 3 sequential API calls — should be a service
- 🟡 Superuser check from `localStorage` is spoofable

---

### ROUTE: `/stock_tracker/:hotel_slug/periods/:id`
**FILE:** `src/components/stock_tracker/periods/PeriodSnapshotDetail.jsx`

**A) Responsibility:** Single period snapshot — opening/closing stock per item, category summaries.

---

### ROUTE: `/stock_tracker/:hotel_slug/comparison`
**FILE:** `src/components/stock_tracker/periods/PeriodsComparison.jsx`

**A) Responsibility:** Side-by-side comparison of two closed periods.

**I) Risks/tech-debt:** Status filter checks `status === 'closed'` (string) vs `is_closed` (boolean) inconsistency.

---

### ROUTE: `/stock_tracker/:hotel_slug/sales/analysis`
**FILE:** `src/pages/stock_tracker/SalesReport.jsx`

**A) Responsibility:** Month-based sales analysis — revenue, cost, profit, GP% by category.

**C) Data dependencies:** `getMonthlySalesSummary()`, `fetchAllSalesForMonth()`, `getAvailableMonths()` from `src/services/salesAnalytics.js`.

**I) Risks/tech-debt:** Hardcoded category definitions duplicated across sales files.

---

### ROUTE: `/stock_tracker/:hotel_slug/sales/entry`
**FILE:** `src/pages/stock_tracker/SalesEntry.jsx`

**A) Responsibility:** Sales data entry form with calculated revenue/COGS/profit.

**I) Risks/tech-debt:** All revenue/cost calculations client-side — could drift from backend.

---

### ROUTE: `/stock_tracker/:hotel_slug/sales/list`
**FILE:** `src/pages/stock_tracker/SalesListView.jsx`

**A) Responsibility:** All sale records grouped by month with drill-down accordion.

**I) Risks/tech-debt:** No pagination — fetches ALL sales in one call.

---

### ROUTE: `/stock_tracker/:hotel_slug/operations`
**FILE:** `src/pages/stock_tracker/StockOperations.jsx`

**A) Responsibility:** Navigation hub — links to Cocktails and Stocktake Downloads.

---

### ROUTE: `/stock_tracker/:hotel_slug/cocktails`
**FILE:** `src/pages/stock_tracker/CocktailsPage.jsx`

**A) Responsibility:** Wrapper for `CocktailCalculator` component.

---

## GAMES ROUTES

---

### ROUTE: `/games`
**FILE:** `src/games/GamesDashboard.jsx`

**A) Responsibility:** Games hub — navigation cards for Whack-a-Mole, Memory Match, Quiz.

**I) Risks/tech-debt:** Card clicks use inline `navigate()` — should use `<Link>` for accessibility.

---

### ROUTE: `/games/whack-a-mole`
**FILE:** `src/games/whack-a-mole/pages/GamePage.jsx`

### ROUTE: `/games/memory-match`
**FILE:** `src/games/memory-match/pages/MemoryMatchDashboard.jsx`

### ROUTE: `/games/memory-match/practice`
**FILE:** `src/games/memory-match/pages/MemoryGame.jsx` (practiceMode=true)

### ROUTE: `/games/memory-match/tournament/:tournamentId`
**FILE:** `src/games/memory-match/pages/MemoryGame.jsx`

### ROUTE: `/games/memory-match/tournament/:tournamentId/winners`
**FILE:** `src/games/memory-match/pages/TournamentWinners.jsx`

### ROUTE: `/games/memory-match/tournaments`
**FILE:** `src/games/memory-match/pages/TournamentDashboard.jsx`

### ROUTE: `/games/memory-match/leaderboard`
**FILE:** `src/games/memory-match/pages/Leaderboard.jsx`

### ROUTE: `/games/memory-match/stats`
**FILE:** `src/games/memory-match/pages/PersonalStats.jsx`

### ROUTE: `/games/quiz`
**FILE:** `src/games/quiz-game/pages/QuizStartScreen.jsx`

### ROUTE: `/games/quiz/play`
**FILE:** `src/games/quiz-game/pages/QuizPlayScreen.jsx`

### ROUTE: `/games/quiz/results`
**FILE:** `src/games/quiz-game/pages/QuizResultsScreen.jsx`

### ROUTE: `/games/quiz/leaderboard`
**FILE:** `src/games/quiz-game/pages/QuizLeaderboard.jsx`

### ROUTE: `/games/quiz/tournaments`
**FILE:** `src/games/quiz-game/pages/QuizTournaments.jsx`

> **Note:** Games data dependencies are handled by `src/services/memoryGameAPI.js` and `src/services/quizGameAPI.js`. Both use the authenticated `api` instance for staff endpoints and a `publicAPI` fallback for anonymous guest tournament play. The Memory Match API is 936 lines with offline sync queue support.

---

### ROUTE: `*`
**FILE:** `src/components/offline/NotFound.jsx`

**A) Responsibility:** 404 catch-all page.

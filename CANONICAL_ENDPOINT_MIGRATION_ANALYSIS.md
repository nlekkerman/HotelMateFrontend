# HotelMate Frontend - Canonical Endpoint Migration Analysis

## 🎯 OBJECTIVE
Refactor frontend to use ONLY canonical endpoints. Backend is final. No backend edits allowed.
This document shows the current state and planned changes for each step.

**⚡ BASEURL CLARIFICATION:** 
The axios baseURL (`https://hotel-porter-d25ad83b12cf.herokuapp.com/api`) handles the `/api/` prefix.
Endpoints are written as `/public/hotel/...`, `/guest/hotels/...`, `/staff/hotel/...` (no double `/api/api`).

---

## 📊 CURRENT ENDPOINT ANALYSIS

### ✅ ALREADY CANONICAL (No Changes Needed)

#### Public Page Endpoints (Already Correct)
All these are already using the canonical pattern `/public/hotel/{hotelSlug}/...`:

1. **publicApi.js** - `getHotelPage`: `/public/hotel/${slug}/page/`
2. **api.js** - `getHotelPublicPage`: `/public/hotel/${hotelSlug}/page/`
3. **sectionEditorApi.js** - `getPublicHotelPage`: `/public/hotel/${slug}/page/`
4. **HotelPortalPage.jsx** - `api.get('/public/hotel/${hotelSlug}/page/')`
5. **BookingPage.jsx** - `api.get('/public/hotel/${hotelSlug}/page/')`
6. **ThemeContext.jsx** - `api.get('/public/hotel/${hotelSlug}/page/')`

#### Public Hotel List Endpoints (Already Correct)
1. **publicApi.js** - `getHotels`: `/public/hotels/` 
2. **publicApi.js** - `getFilterOptions`: `/public/hotels/filters/`

#### Public Presets Endpoints (Already Correct)
1. **publicApi.js** - `getPresets`: `/public/presets/`
2. **publicApi.js** - `getPreset`: `/public/presets/${key}/`

---

## 🔧 REQUIRED MIGRATIONS

### STEP 1 — Public Migration (Critical Fixes Only)

#### ❌ NON-CANONICAL PUBLIC ENDPOINTS (Need Fixing)

**BookingPage.jsx** - Missing `/api/public/hotel/` prefix:
```javascript
// CURRENT (Line 81)
api.get(`/hotel/${hotelSlug}/availability/`)

// CURRENT (Line 120)  
api.post(`/hotel/${hotelSlug}/pricing/quote/`)

// CURRENT (Line 142)
api.post(`/hotel/${hotelSlug}/bookings/`)

// CURRENT (Line 179)
api.post(`/hotel/${hotelSlug}/bookings/${bookingData.booking_id}/payment/`)
```

**CANONICAL FIXES NEEDED:**
```javascript
// FIX TO (baseURL provides /api/ prefix):
publicAPI.get(`/public/hotel/${hotelSlug}/availability/`)
publicAPI.post(`/public/hotel/${hotelSlug}/pricing/quote/`)  
publicAPI.post(`/public/hotel/${hotelSlug}/bookings/`)
publicAPI.post(`/public/hotel/${hotelSlug}/room-bookings/${bookingData.booking_id}/payment/`)
```

**Note:** Payment endpoint explicitly uses `/room-bookings/{booking_id}/payment/` structure under public hotel namespace.

**Files to Change:**
- `src/pages/bookings/BookingPage.jsx` (4 endpoint fixes)

---

### STEP 2 — Guest Migration (New Implementation)

#### 🆕 GUEST URL BUILDER NEEDED

**Current State:** No guest endpoints found in current codebase.

**Implementation Required:**
1. Add `buildGuestURL()` helper to `api.js`:
   ```javascript
   export function buildGuestURL(hotelSlug, path = "") {
     const cleanPath = path.startsWith("/") ? path.slice(1) : path;
     return `/guest/hotels/${hotelSlug}/${cleanPath}`;
   }
   ```

2. No existing guest endpoints to migrate (clean state).

**Files to Change:**
- `src/services/api.js` (add buildGuestURL helper)

---

### STEP 3 — Staff Split: Room vs Service Bookings

#### 🔄 STAFF BOOKING ENDPOINTS (Classification Required)

**Current Staff Booking Endpoints:**

1. **useBookingManagement.js** (Line 42):
   ```javascript
   // CURRENT
   `/staff/hotel/${hotelSlug}/bookings/`
   
   // CLASSIFICATION: ROOM_STAY
   // FIX TO: `/staff/hotel/${hotelSlug}/room-bookings/`
   ```

2. **useBookingManagement.js** (Line 85):
   ```javascript
   // CURRENT  
   `/staff/hotel/${hotelSlug}/bookings/${bookingId}/confirm/`
   
   // CLASSIFICATION: ROOM_STAY
   // FIX TO: `/staff/hotel/${hotelSlug}/room-bookings/${bookingId}/confirm/`
   ```

3. **BookingManagementPage.jsx** (Lines 59, 68, 77, 86, 95):
   ```javascript
   // CURRENT (all instances)
   `/staff/hotel/${hotelSlug}/bookings`
   `/staff/hotel/${hotelSlug}/bookings?filter=pending`
   `/staff/hotel/${hotelSlug}/bookings?filter=confirmed`
   `/staff/hotel/${hotelSlug}/bookings?filter=cancelled`  
   `/staff/hotel/${hotelSlug}/bookings?filter=history`
   
   // CLASSIFICATION: ROOM_STAY (hotel accommodation bookings)
   // FIX TO: `/staff/hotel/${hotelSlug}/room-bookings/` (with same filters)
   ```

**Files to Change:**
- `src/hooks/useBookingManagement.js` (2 endpoint fixes)
- `src/pages/staff/BookingManagementPage.jsx` (5 endpoint fixes)

#### 🔍 SERVICE BOOKING ENDPOINTS

**Search Results:** No current `/bookings/` endpoints found that should be `/service-bookings/`.

**Current Analysis:** All staff booking endpoints found are related to hotel room stays, not restaurant/service bookings.

---

## 📋 STEP-BY-STEP EXECUTION PLAN

### STEP 1 - Public Migration Changes

**Files to Edit:**
```
src/pages/bookings/BookingPage.jsx
├── Line ~81: /hotel/${hotelSlug}/availability/ → /public/hotel/${hotelSlug}/availability/
├── Line ~120: /hotel/${hotelSlug}/pricing/quote/ → /public/hotel/${hotelSlug}/pricing/quote/  
├── Line ~142: /hotel/${hotelSlug}/bookings/ → /public/hotel/${hotelSlug}/bookings/
└── Line ~179: /hotel/${hotelSlug}/bookings/${bookingData.booking_id}/payment/ → /public/hotel/${hotelSlug}/room-bookings/${bookingData.booking_id}/payment/
```

**Import Changes:**
- Change from `import api` to `import { publicAPI }`
- Update all `api.get()` and `api.post()` calls to `publicAPI.get()` and `publicAPI.post()`

### STEP 2 - Guest Migration Changes  

**Files to Edit:**
```
src/services/api.js
└── Add buildGuestURL() helper function
```

**New Function:**
```javascript
export function buildGuestURL(hotelSlug, path = "") {
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;
  return `/guest/hotels/${hotelSlug}/${cleanPath}`;
}
```

### STEP 3 - Staff Split Changes

**Files to Edit:**
```
src/hooks/useBookingManagement.js
├── Line ~42: /staff/hotel/${hotelSlug}/bookings/ → /staff/hotel/${hotelSlug}/room-bookings/
└── Line ~85: /staff/hotel/${hotelSlug}/bookings/${bookingId}/confirm/ → /staff/hotel/${hotelSlug}/room-bookings/${bookingId}/confirm/

src/pages/staff/BookingManagementPage.jsx  
├── Line ~59: /staff/hotel/${hotelSlug}/bookings?filter=pending → /staff/hotel/${hotelSlug}/room-bookings/?filter=pending
├── Line ~68: /staff/hotel/${hotelSlug}/bookings?filter=confirmed → /staff/hotel/${hotelSlug}/room-bookings/?filter=confirmed
├── Line ~77: /staff/hotel/${hotelSlug}/bookings?filter=cancelled → /staff/hotel/${hotelSlug}/room-bookings/?filter=cancelled
├── Line ~86: /staff/hotel/${hotelSlug}/bookings → /staff/hotel/${hotelSlug}/room-bookings/
└── Line ~95: /staff/hotel/${hotelSlug}/bookings?filter=history → /staff/hotel/${hotelSlug}/room-bookings/?filter=history
```

---

## 🎯 VALIDATION COMMANDS

After completing all steps, run these PowerShell commands to verify:

```powershell
# Forbidden forever: old /hotel/ public endpoints
Select-String -Path "src\**\*" -Pattern "/hotel/\$\{hotelSlug\}/"

# Staff legacy bookings namespace (should be gone after Step 3)
Select-String -Path "src\**\*" -Pattern "/staff/hotel/\$\{hotelSlug\}/bookings"

# Canonical presence
Select-String -Path "src\**\*" -Pattern "/public/hotel/"
Select-String -Path "src\**\*" -Pattern "/guest/hotels/"
Select-String -Path "src\**\*" -Pattern "/room-bookings/"
Select-String -Path "src\**\*" -Pattern "/service-bookings/"
```

---

## 🏁 COMPLETION CRITERIA

### STEP 1 Success:
- [ ] All public endpoints use `/api/public/hotel/${hotelSlug}/...`
- [ ] Payment endpoints use `/room-bookings/` structure
- [ ] No `/hotel/${hotelSlug}/` patterns remain in public code
- [ ] BookingPage.jsx uses publicAPI instance

### STEP 2 Success:  
- [ ] buildGuestURL() helper exists in api.js
- [ ] Function returns `/guest/hotels/${hotelSlug}/...` format
- [ ] No guest endpoint migrations needed (clean state)

### STEP 3 Success:
- [ ] All staff booking endpoints use `/room-bookings/`
- [ ] No legacy `/staff/hotel/.../bookings/` patterns remain  
- [ ] All room booking operations work correctly
- [ ] No service booking endpoints to migrate (none exist)

---

## ⚠️ SAFETY NOTES

- **DO NOT** change business logic or function signatures
- **DO NOT** change return data shapes or processing
- **ONLY** change endpoint URL strings and API instance usage
- Keep all error handling and response processing identical
- Maintain all existing axios configuration and interceptors

---

## 📊 IMPACT SUMMARY

**Total Files to Change: 3**
- 1 file for public endpoints (BookingPage.jsx)
- 1 file for guest helper (api.js)  
- 2 files for staff endpoints (useBookingManagement.js, BookingManagementPage.jsx)

**Total Endpoint Changes: 12**
- 4 public endpoint fixes
- 1 guest helper addition
- 7 staff endpoint migrations

**Risk Level: LOW** - Only URL string changes, no logic modifications
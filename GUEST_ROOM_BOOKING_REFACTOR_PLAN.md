# GuestRoomBookingPage Refactor Implementation Plan

**Created**: December 16, 2025  
**Target**: src/pages/bookings/GuestRoomBookingPage.jsx  
**Objective**: Fix API consistency, update payment endpoints, standardize error handling

## Critical Issues Identified

### ❌ **MAJOR PROBLEMS WITH THIS PLAN**

1. **Payment Endpoint Mismatch**: 
   - Plan assumes `/public/hotel/.../bookings/.../payment/session/` 
   - Backend documents `/api/bookings/<booking_id>/payment/session/`
   - **Result**: Frontend will 404 on payment calls

2. **booking_id Type Assumption**:
   - Plan uses `<int:booking_id>` in URL patterns
   - Actual booking IDs are strings like "BK-ABC123" 
   - **Result**: URL routing will fail

3. **Backend Routes Don't Exist**:
   - Payment endpoints referenced but not wired in urls.py
   - Frontend can't verify endpoints that don't exist
   - **Result**: Complete payment flow broken

### 🔧 **IMMEDIATE ACTION REQUIRED**
**Don't assume public/hotel path exists—match whatever backend URL is actually wired.**

## Current State Analysis

### ✅ What's Already Correct
- **HTTP-first architecture**: No realtime subscriptions or store imports
- **Proper endpoint patterns**: Most public API calls use correct `/public/hotel/${hotelSlug}/` structure
- **4-step booking flow**: Availability → Room Selection → Guest Details → Payment
- **URL parameter support**: `room_type_code` preselection working
- **Error handling framework**: Try-catch blocks exist across all API calls

### ❌ Issues Identified
1. **API client inconsistency**: Line 53 uses `api.get()` instead of `publicAPI.get()`
2. **Payment endpoint mismatch**: Uses incorrect `/room-bookings/` path instead of `/bookings/`
3. **Error message inconsistency**: Not all calls prioritize `detail` field from backend responses

## Implementation Phases

---

## Phase A: Frontend Fixes (IMMEDIATE)

### 1. Fix API Client Consistency
**File**: [src/pages/bookings/GuestRoomBookingPage.jsx](hotelmate-frontend/src/pages/bookings/GuestRoomBookingPage.jsx#L53)

**Change**:
```javascript
// BEFORE (Line 53)
const response = await api.get(`/public/hotel/${hotelSlug}/page/`);

// AFTER
const response = await publicAPI.get(`/public/hotel/${hotelSlug}/page/`);
```

**Impact**: Ensures all public endpoints use the same API client for consistency.

### 2. Update Payment Endpoint Path ❌ **CORRECTION NEEDED**
**File**: [src/pages/bookings/GuestRoomBookingPage.jsx](hotelmate-frontend/src/pages/bookings/GuestRoomBookingPage.jsx#L184)

**ISSUE IDENTIFIED**: 
- Current implementation uses `/public/hotel/${hotelSlug}/bookings/${booking_id}/payment/session/`
- Backend `CreatePaymentSessionView` documents `/api/bookings/<booking_id>/payment/session/`
- No public alias route exists in current backend urls.py

**Required Fix**:
```javascript
// BEFORE (INCORRECT)
const response = await publicAPI.post(
  `/public/hotel/${hotelSlug}/room-bookings/${bookingData.booking_id}/payment/`,
  paymentData
);

// AFTER (CORRECT - publicAPI has /api/ in baseURL)
const response = await publicAPI.post(
  `/bookings/${bookingData.booking_id}/payment/session/`,
  paymentData
);
```

**Critical Notes**: 
- `booking_id` is a string (e.g., "BK-ABC123"), not integer
- `publicAPI` client has `/api/` in baseURL, so use `/bookings/...` not `/api/bookings/...`
- Backend route must be wired in urls.py before frontend can use it

### 3. Standardize Error Handling
**Files**: All API calls in GuestRoomBookingPage.jsx

**Pattern**:
```javascript
// BEFORE (Inconsistent error handling)
catch (error) {
  console.error('Error:', error);
  setError('Something went wrong');
}

// AFTER (Standardized error handling)
catch (error) {
  console.error('API Error:', error);
  const errorMessage = error.response?.data?.detail 
    || error.response?.data?.error 
    || 'An unexpected error occurred';
  setError(errorMessage);
}
```

**Impact**: Consistent display of backend error messages across all API interactions.

### 4. Verify Room Preselection
**Test Cases**:
- URL with `?room_type_code=DELUXE` should highlight Deluxe room
- Auto-quote should trigger if room is available
- Proper fallback if room type not found in availability results

---

## Phase B: Backend Implementation (REQUIRED FOR FULL FUNCTIONALITY)

### 1. Payment Session Endpoint ❌ **BACKEND ROUTE MISSING**
**Current Documentation**: `POST /api/bookings/<booking_id>/payment/session/`
**Status**: View exists but route not wired in urls.py

**Critical Issues**:
- Frontend assumes `/public/hotel/` path but backend documents `/api/bookings/`
- `booking_id` is string format "BK-ABC123", not integer
- Route not registered in current urls.py

### 2. Webhook and Verification Endpoints ❌ **NOT IMPLEMENTED**
**Required**:
- `POST /api/webhooks/stripe/` (StripeWebhookView) - **Missing**
- `GET /api/bookings/<str:booking_id>/payment/verify/` (VerifyPaymentView) - **Missing**

### 3. Booking Persistence Fix ⚠️ **NEEDS UPDATE**
**Current Issue**: `HotelBookingCreateView` returns data without saving to database
**Required Fix**: Update to create actual `RoomBooking` model instances with `PENDING_PAYMENT` status

### 4. URL Configuration ❌ **CRITICAL BLOCKER**
**Current Reality**: Payment endpoints not wired in urls.py
**Frontend Impact**: All payment calls will 404 until backend routes exist

**Required URL Patterns** (with correct types):
```python
urlpatterns = [
    # Existing public booking routes (if any)
    path('api/public/hotel/<str:hotel_slug>/bookings/', HotelBookingCreateView.as_view()),
    
    # Payment routes (MUST MATCH FRONTEND EXPECTATIONS)
    path('api/bookings/<str:booking_id>/payment/session/', CreatePaymentSessionView.as_view()),
    path('api/webhooks/stripe/', StripeWebhookView.as_view()),
    path('api/bookings/<str:booking_id>/payment/verify/', VerifyPaymentView.as_view()),
]
```

**⚠️ FRONTEND-BACKEND MISMATCH**: Frontend expects public hotel path structure but backend uses direct `/api/bookings/` pattern.

---

## Testing Strategy

### Frontend Testing
1. **API Consistency**: Verify all public calls use `publicAPI`
2. **Payment Flow**: Test booking creation → payment session → Stripe redirect
3. **Error Handling**: Trigger API errors, verify `detail` field display
4. **Room Preselection**: Test URL params for room highlighting and auto-quote

### Integration Testing
1. **End-to-End Flow**: Complete booking from availability to payment
2. **Error Scenarios**: Invalid dates, unavailable rooms, payment failures
3. **URL Parameters**: Various `room_type_code` values and edge cases

### Backend Testing (When Implemented)
1. **Payment Session Creation**: Verify Stripe session generation
2. **Webhook Processing**: Test payment success/failure handling
3. **Booking Persistence**: Confirm `RoomBooking` records created correctly

---

## Acceptance Criteria

### ✅ Frontend (Phase A) - **PARTIAL COMPLETION**
- [x] All public API calls use `publicAPI` client consistently
- [x] Error messages display backend `detail` field with proper fallbacks  
- [x] Room preselection via URL params works correctly
- [ ] ❌ Payment endpoint matches actual backend route (BLOCKED - need backend confirmation)

### ✅ Backend (Phase B) - **REQUIRED BEFORE FRONTEND WORKS**
- [ ] ❌ Payment session endpoint wired in urls.py with correct path
- [ ] ❌ Webhook endpoints implemented and registered
- [ ] ❌ Booking creation persists to database
- [ ] ❌ URL patterns use `<str:booking_id>` not `<int:booking_id>`

### ✅ Integration - **BLOCKED UNTIL BACKEND COMPLETE**
- [ ] ❌ Complete guest booking flow (payment will 404)
- [x] No realtime subscriptions in guest page
- [x] Proper error handling for all failure scenarios
- [ ] ❌ Payment redirects (blocked by missing backend routes)

---

## Risk Mitigation

### Frontend Changes
- **Low Risk**: Changes are isolated to single file
- **Backwards Compatible**: API endpoint updates align with backend expectations
- **Rollback Plan**: Git commit allows easy revert if issues arise

### Backend Dependencies
- **High Risk**: Payment flow depends on backend implementation
- **Mitigation**: Frontend changes prepare for correct backend integration
- **Timeline**: Backend implementation is prerequisite for full functionality

---

## Implementation Priority

1. **IMMEDIATE**: Phase A frontend fixes (can be done now)
2. **NEXT**: Backend payment endpoint implementation (blocks payment flow)
3. **FINAL**: End-to-end testing and validation

**Estimated Time**: 
- Phase A (Frontend): 30 minutes
- Phase B (Backend): 2-3 hours  
- Integration Testing: 1 hour
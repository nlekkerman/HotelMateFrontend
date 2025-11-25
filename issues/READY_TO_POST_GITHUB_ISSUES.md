# GitHub Issues - Ready to Post

Use these templates to create GitHub issues. Copy/paste the markdown into GitHub.

---

## Issue #9: Implement Staff Bookings Dashboard

**Labels:** `enhancement`, `high-priority`, `phase-1`

**Assignees:** (your team)

**Milestone:** Phase 1 - Bookings Management

### Description

Create a comprehensive staff bookings management dashboard that allows hotel staff to view, filter, and manage all bookings for their hotel.

### Backend API
- `GET /api/staff/hotels/{hotel_slug}/bookings/`
- Supports filters: `status`, `start_date`, `end_date`

### Requirements

**Features:**
- [ ] Display bookings in table (desktop) / cards (mobile)
- [ ] Filter by status (PENDING_PAYMENT, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW)
- [ ] Filter by date range (check-in/check-out dates)
- [ ] Sort by date, guest name, amount
- [ ] Show booking status badges
- [ ] Loading states and error handling
- [ ] Empty state when no bookings
- [ ] Responsive design

**Components to Create:**
- `BookingsListPage.jsx`
- `BookingsTable.jsx`
- `BookingCard.jsx`
- `BookingsFilters.jsx`
- `BookingStatusBadge.jsx`

### Acceptance Criteria
- Staff can view all bookings for their hotel
- Filters apply correctly
- Mobile responsive
- Permission check prevents unauthorized access
- Clicking booking opens detail view (Issue #10)

### Estimated Effort
4-6 hours

### Related Issues
- #10 Booking Detail
- #11 Confirmation Feedback

### Reference
See detailed spec: `issues/09_staff_bookings_list.md`

---

## Issue #10: Implement Booking Detail View & Confirmation

**Labels:** `enhancement`, `high-priority`, `phase-1`

**Assignees:** (your team)

**Milestone:** Phase 1 - Bookings Management

**Depends on:** #9

### Description

Create detailed view for individual bookings and implement booking confirmation flow for staff.

### Backend API
- `POST /api/staff/hotel/{hotel_slug}/bookings/{booking_id}/confirm/`

### Requirements

**Booking Detail View:**
- [ ] Guest information (name, email, phone, special requests)
- [ ] Booking details (ID, confirmation number, status, dates)
- [ ] Stay information (hotel, room, check-in/out, guests)
- [ ] Pricing breakdown (subtotal, taxes, total, payment info)
- [ ] Internal notes section (staff only)

**Confirmation Flow:**
- [ ] "Confirm Booking" button (conditional visibility)
- [ ] Confirmation dialog with details
- [ ] Loading state during API call
- [ ] Success message with email notification
- [ ] Error handling (already confirmed, cancelled, etc.)
- [ ] Update UI after confirmation

**Components to Create:**
- `BookingDetailModal.jsx`
- `ConfirmBookingButton.jsx`
- `ConfirmBookingDialog.jsx`

### Acceptance Criteria
- Detail modal opens from bookings list
- All information displayed correctly
- Confirm button only shows for confirmable bookings
- Success message includes email confirmation
- Booking list updates after confirmation
- Error states handled gracefully

### Estimated Effort
4-5 hours

### Related Issues
- #9 Bookings List (required)
- #11 Confirmation Feedback

### Reference
See detailed spec: `issues/10_booking_detail_confirm.md`

---

## Issue #11: Enhance Booking Confirmation Experience

**Labels:** `enhancement`, `medium-priority`, `phase-1`, `ux`

**Assignees:** (your team)

**Milestone:** Phase 1 - Bookings Management

**Depends on:** #9, #10

### Description

Improve user experience around booking confirmation with clear visual feedback, status indicators, and helpful information.

### Requirements

**Enhanced Status Indicators:**
- [ ] Visual badges with icons and animations
- [ ] Status tooltips
- [ ] Recent confirmation indicator
- [ ] Status change animations

**Confirmation Feedback:**
- [ ] Custom success toast with detailed info
- [ ] Confirmation animation
- [ ] "Confirmed by" and "Confirmed at" labels
- [ ] Email status indicator (sent/failed/pending)

**Edge Cases:**
- [ ] Already confirmed message
- [ ] Cannot confirm cancelled bookings
- [ ] Email failure handling with retry

**Components to Create:**
- `ConfirmationSuccessToast.jsx`
- `EmailStatusIndicator.jsx`
- `BookingActivityTimeline.jsx` (optional)

### Acceptance Criteria
- Status badges clear and professional
- Success toast shows all relevant info
- Email status clearly indicated
- Animations smooth and subtle
- Edge cases handled gracefully
- Mobile-friendly notifications

### Estimated Effort
3-4 hours

### Related Issues
- #9 Bookings List (required)
- #10 Booking Detail (required)

### Reference
See detailed spec: `issues/11_confirmation_feedback.md`

---

## Summary Issue: Phase 1 Frontend Implementation Status

**Labels:** `documentation`, `phase-1`

**Title:** Phase 1 - Hotel Settings & Bookings Management Status

### Description

Tracking issue for Phase 1 frontend implementation.

### ✅ Completed: Hotel Settings System

**Issues Completed:** #2, #5, #6, #7, #8

**What Was Built:**
- Complete hotel settings page refactor
- 8 modular section components
- Dual API integration (settings + theme)
- Permission-based access control
- Live previews and responsive design

**Files:**
- `Settings.jsx` (refactored - 359 lines)
- 8 section components in `settings-sections/`

**Status:** ✅ Ready for testing

### ⏳ Pending: Bookings Management

**Issues Pending:** #9, #10, #11

**Estimated Total Effort:** 11-15 hours

**Components to Create:**
- Bookings list/table/cards
- Booking detail modal
- Confirmation flow
- Status badges and feedback

**Status:** Ready to start (backend APIs available)

### 🔄 Modified Approach

**Issues #3 & #4:** Changed from mode toggle to separate pages
- **Rationale:** Better UX, cleaner code
- **Implementation:** Settings page + Public page navigation

### Documentation

See detailed documentation:
- `issues/PHASE1_IMPLEMENTATION_STATUS.md` - Complete implementation details
- `issues/GITHUB_ISSUES_SUMMARY.md` - Quick reference
- `issues/09_staff_bookings_list.md` - Bookings list spec
- `issues/10_booking_detail_confirm.md` - Confirmation spec
- `issues/11_confirmation_feedback.md` - UX enhancements spec

### Next Steps

1. Create issues #9, #10, #11 from templates above
2. Begin implementation with #9 (Bookings List)
3. Test settings system in staging
4. Complete bookings system

---

## How to Create These Issues on GitHub

1. Go to your repository on GitHub
2. Click "Issues" tab
3. Click "New Issue"
4. Copy/paste each template above
5. Add appropriate labels and assignees
6. Link related issues in description
7. Add to Phase 1 milestone

**Suggested Labels:**
- `enhancement` - New features
- `high-priority` - Critical for Phase 1
- `medium-priority` - Important but not blocking
- `phase-1` - Part of Phase 1 work
- `ux` - User experience improvements
- `documentation` - Documentation updates

**Suggested Milestones:**
- "Phase 1 - Hotel Settings" (completed)
- "Phase 1 - Bookings Management" (pending)

## Description

Create detailed view for individual bookings and implement booking confirmation flow for staff.

## Backend API
- `POST /api/staff/hotel/{hotel_slug}/bookings/{booking_id}/confirm/`

## Requirements

**Booking Detail View:**
- [ ] Guest information (name, email, phone, special requests)
- [ ] Booking details (ID, confirmation number, status, dates)
- [ ] Stay information (hotel, room, check-in/out, guests)
- [ ] Pricing breakdown (subtotal, taxes, total, payment info)
- [ ] Internal notes section (staff only)

**Confirmation Flow:**
- [ ] Confirm Booking button (conditional visibility)
- [ ] Confirmation dialog with details
- [ ] Loading state during API call
- [ ] Success message with email notification
- [ ] Error handling (already confirmed, cancelled, etc.)
- [ ] Update UI after confirmation

**Components to Create:**
- `BookingDetailModal.jsx`
- `ConfirmBookingButton.jsx`
- `ConfirmBookingDialog.jsx`

## Acceptance Criteria
- Detail modal opens from bookings list
- All information displayed correctly
- Confirm button only shows for confirmable bookings
- Success message includes email confirmation
- Booking list updates after confirmation
- Error states handled gracefully

## Estimated Effort
4-5 hours

## Dependencies
Requires Issue #37 to be completed first

## Related Issues
- #32, #35 (existing booking issues)
- #37 (Bookings List - required)
- #38 (Confirmation Feedback)

## Reference
See detailed spec: `issues/10_booking_detail_confirm.md`

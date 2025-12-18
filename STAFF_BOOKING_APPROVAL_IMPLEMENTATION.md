# Staff Room Booking Approval Implementation

**Status:** Implementation Ready  
**Date:** December 18, 2025  
**Scope:** Add approve/decline functionality for PENDING_APPROVAL room bookings

## Requirements Summary

### What to Show
- In staff Room Bookings table/detail modal
- If `status === "PENDING_APPROVAL"` show buttons:
  - **Approve & Capture**
  - **Decline & Release**

### API Endpoints
- **Accept:** `POST /api/staff/hotel/${hotelSlug}/room-bookings/${bookingId}/accept/`
- **Decline:** `POST /api/staff/hotel/${hotelSlug}/room-bookings/${bookingId}/decline/`

### State Updates
- On success: update booking row with returned booking payload
- **No optimistic UI** - disable buttons while loading, refetch on success
- Toast messages:
  - Approve: "Booking confirmed, payment captured."
  - Decline: "Booking declined, authorization released."
- On error: show toast with backend error detail

### UX Guardrails
Confirmation modals:
- **Approve:** "This will charge the guest now."
- **Decline:** "This will cancel the authorization (guest won't be charged)."

## Implementation Details

### 1. Backend Requirements (Assumed Complete)
- `POST /accept/` captures `payment_intent_id`, sets `CONFIRMED`, sets `paid_at`
- `POST /decline/` cancels `payment_intent_id`, sets `DECLINED`
- Idempotent operations (approve confirmed = 200, decline declined = 200)
- Authentication + `can_manage_bookings` permission required

### 2. Frontend Implementation Plan

#### API Service Layer
**File:** `src/services/api.js` or dedicated staff service

```javascript
// Add to staff API service
export const staffBookingService = {
  approveRoomBooking: async (hotelSlug, bookingId) => {
    const url = buildStaffURL(hotelSlug, 'room-bookings', `/${bookingId}/accept/`);
    const response = await api.post(url);
    return response.data;
  },
  
  declineRoomBooking: async (hotelSlug, bookingId) => {
    const url = buildStaffURL(hotelSlug, 'room-bookings', `/${bookingId}/decline/`);
    const response = await api.post(url);
    return response.data;
  }
};
```

#### Hook Layer
**File:** `src/hooks/useBookingManagement.js`

```javascript
// Add mutations
const approveMutation = useMutation({
  mutationFn: async (bookingId) => {
    return await staffBookingService.approveRoomBooking(hotelSlug, bookingId);
  },
  onSuccess: (updatedBooking) => {
    // Update cache with response payload
    queryClient.setQueryData(
      ['staff-room-bookings', hotelSlug],
      (oldData) => updateBookingInList(oldData, updatedBooking)
    );
    toast.success('Booking confirmed, payment captured.');
  },
  onError: (error) => {
    toast.error(error.response?.data?.message || 'Failed to approve booking');
  }
});

const declineMutation = useMutation({
  mutationFn: async (bookingId) => {
    return await staffBookingService.declineRoomBooking(hotelSlug, bookingId);
  },
  onSuccess: (updatedBooking) => {
    queryClient.setQueryData(
      ['staff-room-bookings', hotelSlug],
      (oldData) => updateBookingInList(oldData, updatedBooking)
    );
    toast.success('Booking declined, authorization released.');
  },
  onError: (error) => {
    toast.error(error.response?.data?.message || 'Failed to decline booking');
  }
});
```

#### UI Components
**File:** `src/components/staff/bookings/BookingActions.jsx`

```javascript
// Add conditional buttons for PENDING_APPROVAL status
{booking.status === 'PENDING_APPROVAL' && (
  <>
    <button 
      className="btn btn-success btn-sm me-2"
      onClick={() => handleApproveClick(booking)}
      disabled={approveMutation.isPending || declineMutation.isPending}
    >
      {approveMutation.isPending ? (
        <>
          <span className="spinner-border spinner-border-sm me-1"></span>
          Processing...
        </>
      ) : (
        <>
          <i className="bi bi-check-circle me-1"></i>
          Approve & Capture
        </>
      )}
    </button>
    
    <button 
      className="btn btn-outline-warning btn-sm"
      onClick={() => handleDeclineClick(booking)}
      disabled={approveMutation.isPending || declineMutation.isPending}
    >
      {declineMutation.isPending ? (
        <>
          <span className="spinner-border spinner-border-sm me-1"></span>
          Processing...
        </>
      ) : (
        <>
          <i className="bi bi-x-circle me-1"></i>
          Decline & Release
        </>
      )}
    </button>
  </>
)}
```

#### Confirmation Modal Presets
**File:** `src/components/staff/modals/StaffConfirmationModal.jsx`

```javascript
// Add new presets
approve_booking: {
  title: 'Approve Booking',
  message: 'This will charge the guest now.',
  icon: 'credit-card',
  iconColor: '#28a745',
  confirmVariant: 'success',
  confirmText: 'Approve & Capture',
  cancelText: 'Cancel'
},

decline_booking: {
  title: 'Decline Booking',
  message: 'This will cancel the authorization (guest won\'t be charged).',
  icon: 'x-circle',
  iconColor: '#ffc107',
  confirmVariant: 'warning',
  confirmText: 'Decline & Release',
  cancelText: 'Cancel'
}
```

### 3. Status Validation
- **Hide buttons** unless `booking.status === 'PENDING_APPROVAL'`
- Backend enforces status validation as final authority
- Optional: Show explanation badge if not eligible

### 4. Permission Checks
- **Backend:** Require authenticated staff + `can_manage_bookings` permission
- **Frontend:** Hide buttons if `!permissions.canApproveBookings` (backend is real guard)

### 5. Error Handling
- All API errors displayed via toast with backend detail
- Loading states prevent double-clicks
- Mutation pending states disable both buttons

### 6. Important Notes
- **Payment Reference:** Use `booking.payment_intent_id` only for approve/decline operations
- **No Changes to CreatePaymentSessionView** - out of scope, would mix concerns
- **No Optimistic Updates** - money operations require server confirmation
- **Cache Strategy:** Use response payload to update booking in list cache

## Files to Modify

1. `src/services/api.js` - Add accept/decline methods
2. `src/hooks/useBookingManagement.js` - Add mutations
3. `src/components/staff/bookings/BookingActions.jsx` - Add conditional buttons
4. `src/components/staff/modals/StaffConfirmationModal.jsx` - Add presets

## Implementation Order

1. API service methods
2. Hook layer mutations  
3. Confirmation modal presets
4. BookingActions component updates
5. Integration testing

## Success Criteria
- ✅ Buttons only visible for PENDING_APPROVAL status
- ✅ Confirmation modals warn about charging/canceling
- ✅ Loading states prevent double operations
- ✅ Success/error feedback via toast
- ✅ Booking list updates with server response
- ✅ Payment operations use payment_intent_id only
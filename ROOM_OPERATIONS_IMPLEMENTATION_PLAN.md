# Room Operations Implementation Plan - Frontend Source of Truth

**Date**: December 29, 2025  
**Scope**: Frontend-only changes - NO backend modifications  
**Goal**: Transform existing "Change Room" functionality into context-aware "Reassign Room" (pre-checkin) and "Move Room" (in-house) operations

## Overview

Implement two distinct room operations based on guest status:
- **Reassign Room**: For guests not checked in (`checked_in_at` is null)
- **Move Room**: For in-house guests (`checked_in_at` exists AND `checked_out_at` is null)

## Business Logic Rules

### Guest Status Detection
```javascript
const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
const isPreCheckin = !booking.checked_in_at;
const isCheckedOut = !!booking.checked_out_at;
```

### Button Visibility & Labels
- **Pre-checkin**: Show "Reassign Room" button
- **In-house**: Show "Move Room" button  
- **Checked out**: Hide/disable room operation buttons

### API Routing
- **Pre-checkin**: Call existing `safeAssignRoom()` → `POST /safe-assign-room/`
- **In-house**: Call new `moveRoom()` → `POST /move-room/`

---

## Implementation Details

### 1. API Layer (`services/roomOperations.js`)

#### New Function to Add
```javascript
export const moveRoom = async ({ hotelSlug, bookingId, toRoomId, reason, notes }) => {
  const response = await api.post(
    `/api/staff/hotel/${hotelSlug}/room-bookings/${bookingId}/move-room/`,
    {
      to_room_id: toRoomId,
      reason,
      notes
    }
  );
  return response.data;
};
```

#### API Payload Specifications
- **Reassign Room**: `{ room_id: number, notes?: string }`
- **Move Room**: `{ to_room_id: number, reason: string, notes?: string }`

---

### 2. Modal Component (`BookingDetailsModal.jsx`)

#### Status Detection Logic
```javascript
const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
const isCheckedOut = !!booking.checked_out_at;
const canChangeRoom = !isCheckedOut; // Allow reassign even without assigned room
```

#### Button Label Logic
```javascript
const roomActionLabel = isInHouse ? "Move Room" : "Reassign Room";
```

#### Modal Form Fields

**Always Show**:
- Room selection dropdown (existing)
- Notes field (optional, existing)

**Move Mode Only**:
- Reason input field (required)
- Inline validation error for empty reason

#### Form Validation Rules
```javascript
// Validation logic
const validateForm = () => {
  if (isInHouse && !reason.trim()) {
    setReasonError("Reason is required for room moves");
    return false;
  }
  setReasonError("");
  return true;
};
```

#### UI States
- **Disabled/Hidden**: When `isCheckedOut = true`
- **Required Field**: Reason field only in Move mode
- **Error Display**: Inline error under reason field

---

### 3. Hook Layer (`hooks/useStaffRoomBookingDetail.js`)

#### Mutation Logic Enhancement
```javascript
const roomAssignmentMutation = useMutation({
  mutationFn: async ({ roomId, notes, reason }) => {
    const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
    
    if (isInHouse) {
      return moveRoom({
        hotelSlug,
        bookingId: booking.id,
        toRoomId: roomId,
        reason,
        notes
      });
    } else {
      return safeAssignRoom(hotelSlug, booking.id, roomId, notes);
    }
  },
  onSuccess: (response, variables) => {
    const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
    const roomNumber = response.assigned_room?.room_number || variables.roomId;
    
    // Context-aware success messages
    if (isInHouse) {
      toast.success(`Guest moved to room ${roomNumber}`);
    } else {
      toast.success(`Room reassigned to ${roomNumber}`);
    }
    
    closeModal();
    // Rely on realtime refresh
  },
  onError: (error) => {
    const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
    const backendMessage = error.response?.data?.message || error.response?.data?.error?.message;
    
    if (backendMessage) {
      toast.error(backendMessage);
    } else {
      // Fallback messages
      toast.error(isInHouse ? "Room move failed" : "Room reassignment failed");
    }
  }
});
```

#### Success Message Patterns
- **Reassign**: "Room reassigned to {room_number}"
- **Move**: "Guest moved to {room_number}"

#### Error Handling Hierarchy
1. **Backend message**: `error.response.data.message`
2. **Backend error detail**: `error.response.data.error.message`
3. **Fallback**: Context-aware generic message

---

### 4. List Component (`BookingActions.jsx`)

#### Button Rendering Logic
```javascript
const renderRoomOperationButton = () => {
  const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
  const isCheckedOut = !!booking.checked_out_at;
  
  if (isCheckedOut) return null; // Only hide if checked out
  
  const label = isInHouse ? "Move Room" : "Reassign Room";
  const icon = isInHouse ? "bi-house-door" : "bi-arrow-repeat";
  
  return (
    <Button 
      variant="outline-warning" 
      size="sm" 
      onClick={handleRoomAction}
    >
      <i className={`bi ${icon} me-1`}></i>
      {label}
    </Button>
  );
};
```

#### Optional Enhancement: Move Badge
```javascript
const renderMoveBadge = () => {
  if (!booking.room_moved_at) return null;
  
  return (
    <Badge bg="info" className="ms-1">
      Moved
    </Badge>
  );
};
```

---

## Validation Matrix

| Booking State | Button Label | Required Fields | API Endpoint | Success Message |
|---------------|--------------|-----------------|--------------|------------------|
| `checked_in_at` is null | Reassign Room | room_id, notes? | /safe-assign-room/ | "Room reassigned to X" |
| `checked_in_at` exists, `checked_out_at` is null | Move Room | to_room_id, reason, notes? | /move-room/ | "Guest moved to X" |
| `checked_out_at` exists | (hidden/disabled) | N/A | N/A | N/A |

---

## Error Scenarios & Handling

### Frontend Validation Errors
- **Missing reason in Move mode**: Show inline error "Reason is required for room moves"
- **No room selected**: Existing validation (already handled)

### Backend API Errors
- **Guest already checked out**: "Cannot move checked-out guest"
- **Room occupied**: "Target room is not available" 
- **Invalid room**: "Room not found or not available"
- **Hotel mismatch**: "Room does not belong to this hotel"

### Network/Generic Errors
- **Move failure**: "Room move failed"
- **Reassign failure**: "Room reassignment failed"

---

## UI Styling Consistency

### Button Variants
- **Primary action**: `variant="outline-warning"` with `size="sm"`
- **Icons**: Bootstrap Icons (`bi-arrow-repeat` for reassign, `bi-house-door` for move)

### Form Elements
- **Reason input**: Standard Bootstrap form-control
- **Error display**: `text-danger` class for inline validation
- **Loading states**: Existing spinner pattern with disabled buttons

### Badge Styling
- **Move indicator**: `<Badge bg="info">Moved</Badge>`

---

## Testing Checklist

### Pre-checkin Booking
- [ ] Shows "Reassign Room" button
- [ ] Reason field is hidden
- [ ] Notes field is optional
- [ ] Calls `safeAssignRoom()` API
- [ ] Shows "Room reassigned to X" toast

### In-house Booking
- [ ] Shows "Move Room" button  
- [ ] Reason field is visible and required
- [ ] Notes field is optional
- [ ] Validates reason before submission
- [ ] Calls `moveRoom()` API
- [ ] Shows "Guest moved to X" toast

### Checked-out Booking
- [ ] Room operation buttons are hidden/disabled
- [ ] No API calls possible for room operations

### Error Handling
- [ ] Backend errors display properly
- [ ] Fallback messages work
- [ ] Validation errors show inline
- [ ] Loading states prevent double-submission

---

## File Change Summary

### Files to Modify
1. **`services/roomOperations.js`**: Add `moveRoom()` function
2. **`BookingDetailsModal.jsx`**: Add status logic, conditional UI, validation
3. **`hooks/useStaffRoomBookingDetail.js`**: Route to correct API, update messages
4. **`BookingActions.jsx`**: Conditional labels, move badge

### No Changes Needed
- Backend endpoints (already exist)
- Database schema
- Existing `safeAssignRoom()` function
- Overall component structure
- Styling/theme

---

## Implementation Constraints

### Must Keep
- Existing component names and structure
- Current UI styling and Bootstrap classes  
- Existing success/error handling patterns
- Realtime refresh behavior
- Modal close behavior

### Must Add
- Context-aware button labels
- Reason field validation for moves
- Proper API routing based on guest status
- Enhanced error messages
- Move operation audit badge

### Must NOT Do
- Modify backend code or APIs
- Change existing endpoint signatures  
- Rename components or major refactoring
- Add new dependencies
- Modify database or realtime logic

This implementation plan ensures minimal, focused changes that enhance the existing room assignment functionality with proper guest status awareness while maintaining all existing behavior and styling patterns.
# HotelMate Frontend: Guest Pre-Check-in and Check-in Processes

## Overview

This document details the complete guest pre-check-in and check-in workflow processes in the HotelMate frontend, including assignment workflows, display logic, and regulation mechanisms based on code analysis.

## 1. Guest Pre-Check-in Process

### 1.1 Pre-Check-in Link Generation (Staff Side)

**Location**: `BookingActions.jsx`, `BookingDetailsModal.jsx`

**Triggering Conditions**:
- Booking status is `CONFIRMED`
- Booking has guest email (checked in priority: `guest_email` → `primary_email` → `booker_email`)

**Staff Actions**:
```javascript
// In BookingActions.jsx
const canSendPrecheckin = booking.status === 'CONFIRMED' && 
  (booking.guest_email || booking.primary_email || booking.booker_email);

// Send link via API
useSendPrecheckinLink(hotelSlug)
  .mutateAsync({ bookingId })
```

**API Endpoint**: `/staff/hotel/{slug}/room-bookings/{bookingId}/send-precheckin-link/`

**Display Logic**:
- If `precheckin_submitted_at` is `null`: Shows "Send Pre-Check-In" button (red)
- If `precheckin_submitted_at` exists: Shows "View Pre-Check-In" button (green)

### 1.2 Pre-Check-in Completion Status Detection

**Status Fields**:
```javascript
// Completion detection
const isComplete = booking?.precheckin_submitted_at != null;

// Data availability checks
const hasPrecheckinPayload = !!booking?.precheckin_payload;
const hasPartyPrimaryPrecheckin = !!booking?.party?.primary?.precheckin_payload;
const hasAnyPrecheckinData = !!(
  booking?.precheckin_payload && Object.keys(booking.precheckin_payload).length > 0 ||
  booking?.party?.primary?.precheckin_payload && Object.keys(booking.party.primary.precheckin_payload).length > 0 ||
  booking?.party?.companions?.some(c => c.precheckin_payload && Object.keys(c.precheckin_payload).length > 0)
);
```

### 1.3 Guest Pre-Check-in Page Workflow

**Location**: `GuestPrecheckinPage.jsx`

**URL Pattern**: `/hotel/{hotelSlug}/precheckin/?token={encryptedToken}`

**Data Loading Process**:
1. Extract hotel slug and token from URL parameters
2. Fetch precheckin data from public API: `/hotel/{hotelSlug}/precheckin/?token={token}`
3. Normalize data using `normalizePrecheckinData()` function

**Data Normalization Logic**:
```javascript
const normalizePrecheckinData = (data) => {
  const booking = data.booking;
  const party = data.party || {};
  
  // Primary guest data merging
  const primaryBase = party.primary || { first_name: '', last_name: '', email: '', phone: '', is_staying: true };
  const primary = {
    ...primaryBase,
    ...(primaryBase.precheckin_payload || {}) // Flatten precheckin_payload into primary object
  };
  
  // Guest calculation logic
  const expectedGuests = booking.expected_guests || 0;
  const maxCompanions = Math.max(0, expectedGuests - 1); // Primary takes one slot
  const companionSlots = padCompanionSlots(party.companions || [], maxCompanions);
  
  // Booker type determination
  let bookingContact;
  if (booking.booker_type === 'SELF') {
    bookingContact = {
      name: `${primary.first_name} ${primary.last_name}`,
      email: primary.email,
      phone: primary.phone,
      isPrimary: true,
      badge: 'Booking contact & staying guest'
    };
  } else {
    bookingContact = {
      name: `${booking.booker_first_name || ''} ${booking.booker_last_name || ''}`.trim(),
      email: booking.booker_email || '',
      phone: booking.booker_phone || '',
      isPrimary: false,
      badge: 'Booking contact'
    };
  }
  
  return {
    booking, bookingContact, primary, companionSlots, expectedGuests, maxCompanions,
    precheckin_field_registry: data.precheckin_field_registry || {},
    precheckin_config: data.precheckin_config || { enabled: {}, required: {} }
  };
};
```

**Form Components Structure**:
- `PrecheckinHeader`: Hotel branding and booking info
- `BookingContactCard`: Displays booking contact info (read-only)  
- `PrimaryGuestCard`: Primary guest form fields
- `CompanionsSection`: Dynamic companion slots based on expected guests
- `ExtrasSection`: Booking-scoped extra fields (ETA, special requests, etc.)
- `SubmitBar`: Form validation and submission

**Field Scope Logic**:
- **Guest-scoped fields**: `nationality`, `country_of_residence`, `date_of_birth`, `id_document_type`, `id_document_number`, `address_line_1`, `city`, `postcode`, `postal_code`
- **Booking-scoped fields**: `eta`, `special_requests`, `consent_checkbox`, etc.

**Payload Building**:
```javascript
const buildPayload = () => {
  const payload = {
    party: {
      primary: {
        first_name: partyPrimary.first_name,
        last_name: partyPrimary.last_name,
        email: partyPrimary.email,
        phone: partyPrimary.phone,
        is_staying: partyPrimary.is_staying !== false
      },
      companions: companionSlots
        .filter(companion => companion.first_name?.trim() && companion.last_name?.trim())
        .map(companion => ({ ...companion }))
    }
  };
  
  // Guest-scoped fields go directly to guest objects (not nested)
  addGuestScopedFields(payload.party.primary, partyPrimary);
  
  // Booking-scoped fields go to root level
  Object.entries(registry)
    .filter(([fieldKey, meta]) => config.enabled[fieldKey] === true && (meta.scope || 'booking') === 'booking')
    .forEach(([fieldKey]) => {
      if (extrasValues[fieldKey] !== undefined && extrasValues[fieldKey] !== '') {
        payload[fieldKey] = extrasValues[fieldKey]; // Direct to root, not nested in extras
      }
    });
  
  return payload;
};
```

**Submission Endpoint**: `/hotel/{hotelSlug}/precheckin/submit/`

## 2. Room Assignment Process

### 2.1 Room Assignment Prerequisites

**Location**: `BookingDetailsModal.jsx`

**Prerequisites Check**:
```javascript
const handleAssignRoom = async () => {
  if (!selectedRoomId) {
    toast.error('Please select a room');
    return;
  }
  
  try {
    await safeAssignMutation.mutateAsync({
      bookingId,
      roomId: selectedRoomId,
      assignmentNotes,
    });
  } catch (error) {
    if (error.response?.data?.code === 'PARTY_INCOMPLETE') {
      toast.error('Cannot assign room. Missing guest information. Send pre-check-in link first.');
      return;
    }
  }
};
```

### 2.2 Available Rooms Fetching

**API Endpoint**: `/staff/hotel/{slug}/room-bookings/{bookingId}/available-rooms/`

**Logic**: Returns rooms that are:
- Available for the booking period
- Match the room type requirements
- Appropriate for the party size

### 2.3 Safe Assignment Process

**Endpoint**: `/staff/hotel/{slug}/room-bookings/{bookingId}/safe-assign-room/`

**Payload**:
```javascript
{
  room_id: selectedRoomId,
  assignment_notes: assignmentNotes || ''
}
```

**Error Handling**:
- `PARTY_INCOMPLETE`: Missing guest information
- Room not available
- Room type mismatch
- Other business rule violations

### 2.4 Assignment Status Display

**Assignment Badge Logic** (in `BookingStatusBadges.jsx`):
```javascript
const getAssignmentStatusBadge = () => {
  const assignedRoom = booking?.assigned_room;
  const assignedRoomId = booking?.assigned_room_id;
  const assignedRoomNumber = booking?.assigned_room_number;
  
  const isAssigned = assignedRoom || assignedRoomId || assignedRoomNumber;
  
  if (isAssigned) {
    let roomNumber = null;
    if (assignedRoom?.room_number) {
      roomNumber = assignedRoom.room_number;
    } else if (assignedRoomNumber) {
      roomNumber = assignedRoomNumber;
    }
    
    const label = roomNumber ? `Assigned Room ${roomNumber}` : 'Assigned';
    
    return <Badge bg="info">{label}</Badge>;
  } else {
    return <Badge bg="warning" text="dark">Unassigned</Badge>;
  }
};
```

## 3. Check-in Process

### 3.1 Check-in Prerequisites

**Location**: `BookingDetailsModal.jsx`

**Prerequisites Validation**:
```javascript
const handleCheckIn = async () => {
  // Check if booking has assigned room
  const assignedRoom = booking?.assigned_room || booking?.room;
  if (!assignedRoom) {
    toast.error('Assign a room first');
    setShowRoomAssignment(true);
    return;
  }
  
  try {
    await checkInMutation.mutateAsync({ 
      bookingId,
      roomNumber: assignedRoom.room_number 
    });
  } catch (error) {
    // Error handled by mutation
  }
};
```

### 3.2 Check-in API Process

**Endpoint**: `/staff/hotel/{slug}/room-bookings/{bookingId}/check-in/`

**Method**: `POST` with empty body `{}`

**Success Actions**:
- Invalidates booking list queries
- Invalidates booking detail query
- Shows success toast
- Updates realtime state via `booking_checked_in` event

### 3.3 Check-in Status Display

**In-House Status Logic** (in `BookingStatusBadges.jsx`):
```javascript
const getInHouseStatusBadge = () => {
  const checkedInAt = booking?.checked_in_at;
  const checkedOutAt = booking?.checked_out_at;
  
  // Source of Truth Logic: Use only checked_in_at and checked_out_at timestamps
  if (checkedInAt !== null && checkedInAt !== undefined && checkedOutAt === null) {
    // In-house: checked_in_at !== null && checked_out_at === null
    return <Badge bg="success">In-house</Badge>;
  } else if (checkedOutAt !== null && checkedOutAt !== undefined) {
    // Checked-out: checked_out_at !== null
    return <Badge bg="dark">Checked-out</Badge>;
  } else {
    // Not arrived: checked_in_at === null
    return <Badge bg="light" text="dark">Not arrived</Badge>;
  }
};
```

## 4. Display and Regulation Logic

### 4.1 Booking Table Display

**Location**: `BookingTable.jsx`

**Status Column Components**:
- Uses `BookingStatusBadges` component
- Shows 3-badge system: Payment/Admin | Assignment | In-House status

**Pre-check-in Completion Badge** (in table):
```javascript
const isPrecheckinComplete = booking?.precheckin_submitted_at != null;
return (
  <span className={`badge ${isPrecheckinComplete ? 'bg-info' : 'bg-secondary'}`}>
    {isPrecheckinComplete ? (
      <>
        <i className="bi bi-check-circle me-1"></i>Pre-Check-In Complete
      </>
    ) : (
      <>
        <i className="bi bi-clock me-1"></i>Pre-Check-In Pending
      </>
    )}
  </span>
);
```

### 4.2 Action Button Regulation

**Location**: `BookingActions.jsx`

**Button Visibility Rules**:
```javascript
const canApprove = booking.status === 'PENDING_APPROVAL';
const canDecline = booking.status === 'PENDING_APPROVAL';
const canSendPrecheckin = booking.status === 'CONFIRMED' && 
  (booking.guest_email || booking.primary_email || booking.booker_email);
const isPrecheckinComplete = booking?.precheckin_submitted_at != null;
```

**Dynamic Button Behavior**:
- Pre-check-in incomplete: "Send Pre-Check-In" (red button)
- Pre-check-in complete: "View Pre-Check-In" (green button)
- Loading states with spinners during API calls
- Error handling with toast messages

### 4.3 Modal and Form Regulation

**Booking Details Modal Sections**:
1. **Basic Info**: Always visible
2. **Room Assignment**: Only if not checked in
3. **Pre-check-in Summary**: Shows completion status and data
4. **Check-in Actions**: Only if assigned and not checked in
5. **Party Information**: Shows guest data from precheckin

**Form State Management**:
- Real-time validation with field-level error states
- Progressive disclosure based on booking status
- Confirmation modals for destructive actions

## 5. Realtime Updates

### 5.1 Realtime Event Integration

**Relevant Events**:
- `booking_checked_in`: Updates `checked_in_at` timestamp
- `booking_checked_out`: Updates `checked_out_at` timestamp
- `room_status_changed`: Updates room status for assigned rooms

**Store Integration**:
- `roomBookingStore` handles booking lifecycle events
- Automatic badge updates via timestamp-based logic
- No manual refresh required

### 5.2 Query Invalidation Strategy

**After Mutations**:
```javascript
// After successful operations
queryClient.invalidateQueries(['staff-room-bookings', hotelSlug]);
queryClient.invalidateQueries(['staff-room-booking', hotelSlug, bookingId]);
queryClient.invalidateQueries(['staff-available-rooms', hotelSlug, bookingId]);
```

## 6. Error Handling and Validation

### 6.1 Form Validation

**Pre-check-in Validation**:
- Required field checking based on `precheckin_config.required`
- Guest-scoped vs booking-scoped field validation
- Companion slot validation (all slots must be filled if any are)

### 6.2 API Error Handling

**Common Error Patterns**:
- `PARTY_INCOMPLETE`: Missing guest information
- `room_not_ready`: Room status not Ready For Guest
- `already_checked_in`: Guest already checked in
- Token validation errors for precheckin

### 6.3 User Feedback

**Toast Messages**:
- Success notifications for completed actions
- Error messages with specific business rule violations
- Loading states during API operations
- Confirmation modals for destructive actions

## 7. Data Flow Summary

1. **Staff sends precheckin link** → Guest receives email with token URL
2. **Guest completes precheckin** → Party data saved, `precheckin_submitted_at` set
3. **Staff assigns room** → Room assignment validated against party completeness
4. **Staff checks in guest** → `checked_in_at` timestamp set, realtime events fired
5. **All connected tabs update** → Badge states change via timestamp logic

This comprehensive workflow ensures data integrity, proper validation, and real-time synchronization across all frontend interfaces.
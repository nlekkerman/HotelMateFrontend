# Precheckin Data Flow - Detailed Analysis

**Created:** December 18, 2025  
**Status:** Complete Implementation Analysis  
**Scope:** Full precheckin system data transmission and processing

## Overview

This document provides a comprehensive analysis of what data is sent, received, and processed in the HotelMate precheckin system, covering both staff-initiated precheckin link sending and guest precheckin form submission.

## 1. Staff-Initiated Precheckin Link Sending

### 1.1 Trigger Location
- **Component**: [BookingActions.jsx](hotelmate-frontend/src/components/staff/bookings/BookingActions.jsx#L29)
- **Trigger**: Staff clicks "Pre-Check-In" button
- **Condition**: `booking.status === 'CONFIRMED'` and not already pre-checked-in

### 1.2 Data Sent to Backend
**API Endpoint**: `POST /api/staff/hotel/{hotelSlug}/room-bookings/{bookingId}/send-precheckin-link/`

**HTTP Request Details**:
```javascript
// From useBookingManagement.js line 179
const url = buildStaffURL(hotelSlug, 'room-bookings', `/${bookingId}/send-precheckin-link/`);
const response = await api.post(url);
```

**Request Payload**: 
- **Body**: Empty (action triggered by endpoint + bookingId in URL)
- **Headers**: Standard authentication headers for staff user
- **URL Parameters**: 
  - `hotelSlug`: Hotel identifier
  - `bookingId`: Specific booking to send precheckin for

### 1.3 User Confirmation Data
**Modal Display** ([BookingActions.jsx](hotelmate-frontend/src/components/staff/bookings/BookingActions.jsx#L124)):
```javascript
message={`Send pre-check-in link for booking ${booking.booking_id}?\n\nEmail will be sent to: ${booking.guest_email || booking.primary_email || booking.booker_email}`}
```

**User Sees**:
- Booking ID being processed
- Target email address for precheckin link
- Confirmation dialog with send/cancel options

## 2. Guest Precheckin Data Flow

### 2.1 Initial Data Fetch (GET)
**API Endpoint**: `/api/public/hotel/{hotelSlug}/precheckin/?token=${encodeURIComponent(token)}`

**Request Details**:
```javascript
// From GuestPrecheckinPage.jsx line 114
const response = await publicAPI.get(
  `/hotel/${hotelSlug}/precheckin/?token=${encodeURIComponent(token)}`
);
```

**Data Received from Backend**:
```json
{
  "precheckin_config": {
    "enabled": { "field_key": true/false },
    "required": { "field_key": true/false }
  },
  "precheckin_field_registry": {
    "field_key": {
      "label": "Field Display Name",
      "description": "Optional description",
      "type": "text|textarea|select|checkbox",
      "order": 100
    }
  },
  "booking": {
    "booking_id": "string",
    "adults": 2,
    "children": 0,
    "total_amount": "150.00",
    "currency": "EUR",
    "check_in_date": "2025-12-20",
    "check_out_date": "2025-12-22",
    "room_type_name": "Deluxe Room",
    "booker_first_name": "John",
    "booker_last_name": "Doe",
    "booker_email": "john@example.com",
    "primary_email": "john@example.com",
    "party_complete": false,
    "party_missing_count": 1
  },
  "party": {
    "primary": [
      {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com",
        "phone": "+1234567890",
        "is_staying": true
      }
    ],
    "companions": []
  },
  "hotel": {
    "name": "Hotel Example",
    "preset": 1,
    "public_settings": {
      "preset": 1
    }
  }
}
```

### 2.2 Data Processing and State Management
**Data Normalization** ([GuestPrecheckinPage.jsx](hotelmate-frontend/src/pages/guest/GuestPrecheckinPage.jsx#L27)):

```javascript
// Party data normalization
const normalizePartyData = (responseData) => {
  if (responseData.party) {
    const primaryGuests = responseData.party.primary || [];
    const primary = primaryGuests.length > 0 ? primaryGuests[0] : {};
    const companions = responseData.party.companions || [];
    return { primary, companions };
  }
  
  // Fallback extraction from booking data
  const primary = {
    first_name: responseData.booker_first_name || '',
    last_name: responseData.booker_last_name || '',
    email: responseData.booker_email || responseData.primary_email || '',
    phone: responseData.booker_phone || responseData.primary_phone || '',
    is_staying: true
  };
  
  return { primary, companions: [] };
};
```

### 2.3 Dynamic Form Generation
**Active Fields Calculation** ([GuestPrecheckinPage.jsx](hotelmate-frontend/src/pages/guest/GuestPrecheckinPage.jsx#L187)):

```javascript
const getActiveFields = () => {
  // Only render fields that are enabled in backend config
  const activeFields = Object.entries(registry).filter(([k]) => enabled[k] === true);
  
  // Stable ordering by registry.order or label
  activeFields.sort((a, b) => {
    const [keyA, metaA] = a;
    const [keyB, metaB] = b;
    
    if (metaA.order && metaB.order) {
      return metaA.order - metaB.order;
    }
    
    return (metaA.label || keyA).localeCompare(metaB.label || keyB);
  });
  
  return activeFields;
};
```

**Field Types Supported**:
- `text`: Standard text input
- `textarea`: Multi-line text input (3 rows)
- `select`: Dropdown selection (future)
- `checkbox`: Boolean toggle (future)

## 3. Guest Form Submission (POST)

### 3.1 Data Sent to Backend
**API Endpoint**: `/api/public/hotel/{hotelSlug}/precheckin/?token=${encodeURIComponent(token)}`

**Payload Structure** ([GuestPrecheckinPage.jsx](hotelmate-frontend/src/pages/guest/GuestPrecheckinPage.jsx#L310)):

```javascript
// Modern structure (party + extras domains)
const payload = {
  party: {
    primary: {
      first_name: partyPrimary.first_name,
      last_name: partyPrimary.last_name,
      email: partyPrimary.email,
      phone: partyPrimary.phone,
      is_staying: true
    },
    companions: partyCompanions.map(companion => ({
      first_name: companion.first_name,
      last_name: companion.last_name,
      email: companion.email || '',
      phone: companion.phone || '',
      is_staying: companion.is_staying !== false
    }))
  },
  extras: extrasPayload
};

// Backward compatibility (flat extras at root)
if (SEND_EXTRAS_FLAT) {
  Object.assign(payload, extrasPayload);
}
```

### 3.2 Extras Data Processing
**Active Fields Only** ([GuestPrecheckinPage.jsx](hotelmate-frontend/src/pages/guest/GuestPrecheckinPage.jsx#L283)):

```javascript
const buildExtrasPayload = () => {
  const extrasPayload = {};
  activeFields.forEach(([fieldKey]) => {
    extrasPayload[fieldKey] = values[fieldKey] || '';
  });
  return extrasPayload;
};
```

**Example Extras Data**:
```json
{
  "dietary_requirements": "Vegetarian",
  "special_requests": "Late check-in after 10 PM",
  "vehicle_license_plate": "ABC-123",
  "emergency_contact_name": "Jane Doe",
  "emergency_contact_phone": "+0987654321"
}
```

### 3.3 Validation Logic
**Required Field Validation** ([GuestPrecheckinPage.jsx](hotelmate-frontend/src/pages/guest/GuestPrecheckinPage.jsx#L242)):

```javascript
const validateExtras = () => {
  const errors = {};
  activeFields.forEach(([fieldKey, meta]) => {
    if (required[fieldKey] === true && !values[fieldKey]?.trim()) {
      errors[fieldKey] = `${meta.label} is required`;
    }
  });
  return errors;
};
```

**Party Validation**:
```javascript
const validateParty = () => {
  const errors = {};
  
  // Primary guest validation
  if (!partyPrimary.first_name?.trim()) {
    errors.primary_first_name = 'First name is required';
  }
  if (!partyPrimary.last_name?.trim()) {
    errors.primary_last_name = 'Last name is required';
  }
  
  // Companions validation
  partyCompanions.forEach((companion, index) => {
    if (!companion.first_name?.trim()) {
      errors[`companion_${index}_first_name`] = 'First name is required';
    }
    if (!companion.last_name?.trim()) {
      errors[`companion_${index}_last_name`] = 'Last name is required';
    }
  });
  
  return errors;
};
```

## 4. Error Handling and Response Processing

### 4.1 Backend Error Mapping
**Field-Level Error Handling** ([GuestPrecheckinPage.jsx](hotelmate-frontend/src/pages/guest/GuestPrecheckinPage.jsx#L318)):

```javascript
} catch (err) {
  console.error('Failed to submit precheckin:', err);
  
  // Map backend field errors to frontend validation
  if (err.response?.status === 400 && err.response?.data?.field_errors) {
    setFieldErrors(err.response.data.field_errors);
  }
  
  // Handle token/auth errors
  if (err.response?.status === 401) {
    setError('Invalid or expired precheckin link. Please contact the hotel for a new link.');
  } else {
    toast.error(err.response?.data?.detail || 'Failed to submit precheckin. Please try again.');
  }
}
```

### 4.2 Success Response Processing
**Success State** ([GuestPrecheckinPage.jsx](hotelmate-frontend/src/pages/guest/GuestPrecheckinPage.jsx#L315)):

```javascript
// Success response triggers UI state change
toast.success('Pre-check-in completed successfully!');
setSuccess(true); // Shows success card, hides form
```

## 5. Real-time Updates and Staff Notification

### 5.1 Staff Dashboard Refresh
**Query Invalidation** ([useBookingManagement.js](hotelmate-frontend/src/hooks/useBookingManagement.js#L182)):

```javascript
// After precheckin link sent
onSuccess: () => {
  queryClient.invalidateQueries({
    queryKey: ['staff-room-bookings', hotelSlug]
  });
}
```

### 5.2 Pusher Integration (If Implemented)
**Expected Pusher Events**:
- `precheckin-link-sent`: Notify when link is sent to guest
- `precheckin-submitted`: Notify when guest completes precheckin
- `party-updated`: Notify when party information changes

## 6. Security and Data Validation

### 6.1 Token Security
**Token Encoding** (Critical for special characters):
```javascript
// Always encode token in URL parameters
const token = searchParams.get('token');
const url = `/hotel/${hotelSlug}/precheckin/?token=${encodeURIComponent(token)}`;
```

### 6.2 Data Sanitization
**Frontend Constraints**:
- Required ⊆ Enabled constraint enforced
- Empty values converted to empty strings
- Only active enabled fields included in payload
- Party data structure normalized before submission

### 6.3 Backend Validation
**Expected Backend Checks**:
- Token validation and expiration
- Field constraint validation (required ⊆ enabled)
- Guest authorization (token matches booking)
- Data type validation per field registry
- Party structure validation

## 7. Configuration Management

### 7.1 Field Registry Structure
**Registry Definition**:
```json
{
  "field_key": {
    "label": "Human-readable field name",
    "description": "Optional help text",
    "type": "text|textarea|select|checkbox",
    "order": 100,
    "options": ["option1", "option2"] // For select fields
  }
}
```

### 7.2 Configuration Constraints
**Business Rules**:
- Fields can only be required if they are enabled
- Configuration changes apply to new precheckin sessions
- Field registry defines available fields, config controls visibility
- Order determines render sequence in guest form

## 8. User Experience Flow

### 8.1 Staff Workflow
1. Staff views confirmed booking in dashboard
2. Clicks "Pre-Check-In" button
3. Confirms email address in modal
4. System sends email with precheckin link to guest
5. Booking status updates to show precheckin sent

### 8.2 Guest Workflow
1. Guest receives email with precheckin link
2. Clicks link, loads precheckin page with token
3. System fetches configuration and booking data
4. Form renders dynamically based on hotel configuration
5. Guest fills required and optional fields
6. Guest adds/edits party member information
7. Form validates all required fields completed
8. Guest submits precheckin
9. Success confirmation displayed

## 9. Data Storage and Persistence

### 9.1 Backend Data Storage
**Expected Database Updates**:
- Booking extras fields updated with precheckin data
- Party information updated/created
- Precheckin completion timestamp recorded
- Email tracking for precheckin link sending

### 9.2 Frontend State Persistence
**Session Management**:
- Form data persists during session (until submission or page close)
- Token required for all API operations
- No local storage of sensitive data
- Success state prevents form resubmission

## 10. Integration Points

### 10.1 Email Service Integration
**Precheckin Link Email**:
- Triggered by staff action
- Contains secure token for guest authentication
- Links to public precheckin page with hotel branding
- Includes booking details and check-in instructions

### 10.2 Booking Management Integration
**Dashboard Updates**:
- Real-time booking list refresh after precheckin operations
- Party completion status indicators
- Precheckin submission timestamps
- Guest contact information updates

## Summary

The precheckin system handles two primary data flows:

1. **Staff-to-Guest**: Staff triggers precheckin link sending with minimal data (just booking ID), system generates secure token and emails guest
2. **Guest-to-System**: Guest submits comprehensive form data including party details and configurable extras fields

The implementation emphasizes security (token-based auth), flexibility (config-driven form generation), and user experience (validation, error handling, success states). All data transmission uses appropriate encoding and follows established API patterns for consistent behavior across the HotelMate system.
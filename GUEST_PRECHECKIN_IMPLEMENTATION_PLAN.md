# Guest Precheckin Page Implementation Plan

## Overview

Implement a universal guest pre-check-in page that fetches configuration first, builds forms dynamically from backend registry, and handles validation/submission following established frontend patterns.

## Backend Contract (DO NOT CHANGE)

**Route**: `/guest/:hotelSlug/precheckin?token=...`

**GET Endpoint**: `/api/public/hotel/{hotelSlug}/precheckin/?token=${encodeURIComponent(token)}`
**POST Endpoint**: `/api/public/hotel/{hotelSlug}/precheckin/?token=${encodeURIComponent(token)}`

**GET Response**:
```json
{
  "precheckin_config": { 
    "enabled": { "field_key": true/false }, 
    "required": { "field_key": true/false } 
  },
  "precheckin_field_registry": { 
    "field_key": { 
      "label": "Field Label", 
      "description": "Optional description",
      "type": "text|textarea|select|checkbox",
      "order": 100
    } 
  },
  "booking": { /* booking data */ },
  "party": { /* party info */ }
}
```

**POST Body**: Flat JSON object of `field_key → value` for active fields only.

## Implementation Requirements

### 1. Route Addition
**File**: `hotelmate-frontend/src/App.jsx`
**Action**: Insert route following existing guest booking patterns
```jsx
<Route path="/guest/:hotelSlug/precheckin" element={<GuestPrecheckinPage />} />
```

### 2. Page Structure
**File**: `hotelmate-frontend/src/pages/guest/GuestPrecheckinPage.jsx`
**Pattern**: Follow `GuestRoomBookingPage.jsx` structure with public page wrapper

### 3. Fetch-First Logic
- Use `useParams()` for `hotelSlug`
- Use `URLSearchParams(location.search).get("token")` for token
- **CRITICAL**: Always use `encodeURIComponent(token)` in API calls
- API call: `publicAPI.get(`/hotel/${hotelSlug}/precheckin/?token=${encodeURIComponent(token)})`
- Handle loading states and token validation errors following `PinAuth.jsx` patterns

### 4. Dynamic Form Building

**CRITICAL - Never hardcode field keys**: Render from `precheckin_field_registry` only. Do NOT assume any specific keys exist.

**Active Fields Calculation**:
```javascript
const activeFields = Object.entries(registry).filter(([k]) => enabled[k] === true);
```

**Stable Render Order**:
```javascript
activeFields.sort((a, b) => {
  const [keyA, metaA] = a;
  const [keyB, metaB] = b;
  
  // If registry meta has order, sort by it
  if (metaA.order && metaB.order) {
    return metaA.order - metaB.order;
  }
  
  // Else sort by label
  return (metaA.label || keyA).localeCompare(metaB.label || keyB);
});
```

**Field Type Switching**:
Implement text + textarea now; add a switch on meta.type with a default fallback to text:
```javascript
const renderField = (fieldKey, meta) => {
  switch (meta.type) {
    case 'textarea':
      return <Form.Control as="textarea" rows={3} />;
    case 'text':
    default:
      return <Form.Control type="text" />;
  }
};
```

**No Additional Details Branch**:
```javascript
if (activeFields.length === 0) {
  return (
    <Card className="border-success mb-4">
      <Card.Body className="text-center py-4">
        <i className="bi bi-check-circle text-success mb-3" style={{ fontSize: '3rem' }}></i>
        <h4>No additional details required</h4>
        <p className="text-muted">Your precheckin is already complete.</p>
        <Button variant="success">Done</Button>
      </Card.Body>
    </Card>
  );
}
```

### 5. Validation & Submission

**CRITICAL - Required ⊆ Enabled Constraint**: 
- Disable required toggles when field not enabled
- Auto-clear required when enabled is turned off  
- Sanitize payload before POST to ensure constraint

**Required Field Validation**:
```javascript
const validateForm = () => {
  const errors = {};
  activeFields.forEach(([fieldKey, meta]) => {
    if (required[fieldKey] === true && !values[fieldKey]?.trim()) {
      errors[fieldKey] = `${meta.label} is required`;
    }
  });
  return errors;
};
```

**Payload Construction** (Active fields only):
```javascript
const buildPayload = () => {
  const payload = {};
  activeFields.forEach(([fieldKey]) => {
    payload[fieldKey] = values[fieldKey] || '';
  });
  return payload;
};
```

**Backend 400 Field Error Mapping**:
```javascript
try {
  await publicAPI.post(`/hotel/${hotelSlug}/precheckin/?token=${encodeURIComponent(token)}`, payload);
  // Success handling
} catch (err) {
  if (err.response?.status === 400 && err.response?.data?.field_errors) {
    setFieldErrors(err.response.data.field_errors);
  }
  toast.error(err.response?.data?.detail || 'Submission failed');
}
```

### 6. UI Components & Styling
**Public Page Wrapper**:
```jsx
<div className="hotel-public-page page-style-public" style={{ minHeight: '100vh' }}>
  <Container className="py-5">
    {/* Content */}
  </Container>
</div>
```

**Card Layout** (Following `BookingConfirmation.jsx`):
```jsx
<Card className="shadow-sm">
  <Card.Header style={{ borderLeft: `4px solid ${themeColor}` }}>
    <h5 className="mb-1">Pre-Check-In Details</h5>
    <small className="text-muted">Please complete the required information</small>
  </Card.Header>
  <Card.Body>
    {/* Dynamic form fields */}
  </Card.Body>
  <Card.Footer className="d-flex justify-content-between">
    <Button variant="outline-secondary" disabled={loading}>
      Cancel
    </Button>
    <Button variant="primary" disabled={loading} onClick={handleSubmit}>
      {loading && <Spinner animation="border" size="sm" className="me-2" />}
      Submit
    </Button>
  </Card.Footer>
</Card>
```

**Success State** (In-place):
```jsx
<Card className="border-success mb-4">
  <Card.Body className="text-center py-5">
    <div className="text-success mb-3">
      <i className="bi bi-check-circle" style={{ fontSize: '4rem' }}></i>
    </div>
    <h2 className="mb-3">Pre-check-in Complete!</h2>
    <p className="lead text-muted">Your information has been successfully submitted.</p>
  </Card.Body>
</Card>
```

## Key Dependencies
- React Bootstrap (`Container`, `Card`, `Form`, `Button`, `Alert`, `Spinner`)
- `react-toastify` for notifications
- `publicAPI` service from established patterns
- Bootstrap Icons (`bi bi-check-circle`, `bi bi-exclamation-triangle`)

## Validation Checklist
- [ ] Route `/guest/:hotelSlug/precheckin?token=...` no longer 404s
- [ ] Form only appears after GET returns config+registry
- [ ] Form adapts to backend config instantly
- [ ] Required fields cannot be submitted empty
- [ ] Token encoding prevents special character issues
- [ ] Field order is stable and predictable
- [ ] Payload contains only active enabled fields
- [ ] Backend field errors map to inline validation feedback
- [ ] Success/error states follow established UX patterns

## Non-Goals
- Do NOT edit party names or booking details
- Do NOT change party_complete logic  
- Do NOT touch backend endpoints
- Do NOT assume field types beyond text/textarea initially
- Do NOT hardcode any field keys or configurations
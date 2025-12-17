# Guest Precheckin Party Management Enhancement Plan

## Overview
Enhance the existing [GuestPrecheckinPage.jsx](hotelmate-frontend/src/pages/guest/GuestPrecheckinPage.jsx) to collect **Party details** (primary + companions) and **Extras** (config-driven fields) in a unified interface with one submit action.

## Core Requirements

### State Management Enhancement
- **Party Domain**: `partyPrimary` (object) + `partyCompanions` (array)  
- **Extras Domain**: `extrasValues` (object) - existing implementation
- **Configuration**: Keep existing `registry`, `enabled`, `required`, `booking`, `hotel` state

### Data Flow Strategy
- **GET normalization**: Handle mixed backend response shapes
- **POST compatibility**: Send both structured and flat payload formats
- **Validation**: Unified validation across party + extras domains
- **UI**: Separate sections with consistent hotel theming

---

## Implementation Steps

### 1. Extend GuestPrecheckinPage State

**Current State (keep existing)**:
```jsx
const [values, setValues] = useState({}); // for extras
const [registry, setRegistry] = useState({});
const [enabled, setEnabled] = useState({});
const [required, setRequired] = useState({});
```

**Add Party State**:
```jsx
const [partyPrimary, setPartyPrimary] = useState({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  is_staying: true
});

const [partyCompanions, setPartyCompanions] = useState([]);
const [missingCount, setMissingCount] = useState(0);
```

### 2. Data Normalization Strategy

**Problem**: Backend returns mixed shapes:
- Sometimes `data.party.primary` + `data.party.companions`
- Sometimes `primary_guest`, `in_house`, etc.

**Solution**: Create normalizer function
```jsx
const normalizePartyData = (responseData) => {
  // Prefer structured party data
  if (responseData.party) {
    return {
      primary: responseData.party.primary || {},
      companions: responseData.party.companions || []
    };
  }
  
  // Fallback to legacy fields
  const primary = responseData.primary_guest || {};
  const companions = responseData.guests || responseData.companions || [];
  
  return { primary, companions };
};

const computeMissingCount = (adults, partyCount) => {
  return Math.max(0, adults - partyCount);
};
```

### 3. PartyDetailsSection Component

**New Component**: `src/components/guest/PartyDetailsSection.jsx`

**Props**:
```jsx
{
  primary: partyPrimary,
  companions: partyCompanions,
  onPrimaryChange: setPartyPrimary,
  onCompanionsChange: setPartyCompanions,
  maxCompanions: adults - 1,
  missingCount: number,
  errors: fieldErrors.party || {},
  hotel: hotelData // for theming
}
```

**Features**:
- Primary guest form (always present)
- Companions list with Add/Remove buttons
- Missing guests badge: `"Missing {missingCount} guest name(s)"`
- Companion limits: `maxCompanions = max(0, adults - 1)`
- Hotel theming integration

### 4. Unified Validation System

**Structure**:
```jsx
const fieldErrors = {
  party: {
    primary: { first_name: "", last_name: "", email: "", phone: "" },
    companions: [
      { first_name: "", last_name: "", email: "", phone: "" }
    ]
  },
  extras: { eta: "", nationality: "", special_requests: "" }
}
```

**Validation Logic**:
```jsx
const validateForm = () => {
  const errors = { party: { primary: {}, companions: [] }, extras: {} };
  
  // Party validation
  if (!partyPrimary.first_name?.trim()) {
    errors.party.primary.first_name = "First name is required";
  }
  if (!partyPrimary.last_name?.trim()) {
    errors.party.primary.last_name = "Last name is required";
  }
  
  // Companions validation
  partyCompanions.forEach((companion, index) => {
    const companionErrors = {};
    if (!companion.first_name?.trim()) {
      companionErrors.first_name = "First name is required";
    }
    if (!companion.last_name?.trim()) {
      companionErrors.last_name = "Last name is required";
    }
    if (Object.keys(companionErrors).length > 0) {
      errors.party.companions[index] = companionErrors;
    }
  });
  
  // Extras validation (use existing registry-based logic)
  activeFields.forEach(([fieldKey, meta]) => {
    if (required[fieldKey] && !values[fieldKey]?.trim()) {
      errors.extras[fieldKey] = `${meta.label} is required`;
    }
  });
  
  return errors;
};
```

### 5. Payload Compatibility Strategy

**Implementation Flag**:
```jsx
// TODO: Remove once backend unified serializer is deployed
const SEND_EXTRAS_FLAT = true;
```

**Payload Construction**:
```jsx
const buildPayload = () => {
  const payload = {
    party: {
      primary: partyPrimary,
      companions: partyCompanions
    },
    extras: values // config-driven extras only
  };
  
  // Compatibility: also send extras flattened at root
  if (SEND_EXTRAS_FLAT) {
    Object.keys(values).forEach(key => {
      payload[key] = values[key];
    });
  }
  
  return payload;
};
```

### 6. UI Layout Enhancement

**Structure**:
```jsx
return (
  <Container className="guest-precheckin-page">
    {/* Booking Summary Header */}
    <BookingSummaryCard booking={booking} missingCount={missingCount} />
    
    {/* Party Details Section */}
    <Card className="mb-4">
      <Card.Header>
        <h5>Party Details</h5>
      </Card.Header>
      <Card.Body>
        <PartyDetailsSection 
          primary={partyPrimary}
          companions={partyCompanions}
          onPrimaryChange={setPartyPrimary}
          onCompanionsChange={setPartyCompanions}
          maxCompanions={Math.max(0, adults - 1)}
          missingCount={missingCount}
          errors={fieldErrors.party || {}}
          hotel={hotel}
        />
      </Card.Body>
    </Card>
    
    {/* Extra Details Section */}
    <Card className="mb-4">
      <Card.Header>
        <h5>Additional Information</h5>
      </Card.Header>
      <Card.Body>
        {/* Existing dynamic extras fields */}
        {activeFields.map(([fieldKey, meta]) => (
          <DynamicField key={fieldKey} ... />
        ))}
      </Card.Body>
    </Card>
    
    {/* Single Submit Button */}
    <div className="text-center">
      <Button 
        variant="primary" 
        size="lg"
        onClick={handleSubmit}
        disabled={submitting}
        className="submit-precheckin-btn"
      >
        {submitting ? 'Submitting...' : 'Complete Pre-Check-in'}
      </Button>
    </div>
  </Container>
);
```

### 7. Unified Submit Handler

**Implementation**:
```jsx
const handleSubmit = async () => {
  try {
    setSubmitting(true);
    
    // Validate both domains
    const errors = validateForm();
    const hasErrors = Object.keys(errors.party.primary).length > 0 ||
                      errors.party.companions.some(c => Object.keys(c).length > 0) ||
                      Object.keys(errors.extras).length > 0;
    
    if (hasErrors) {
      setFieldErrors(errors);
      return;
    }
    
    // Build unified payload
    const payload = buildPayload();
    
    // Submit to backend
    await publicApiHelpers.submitPrecheckin(hotelSlug, token, payload);
    
    // Success feedback
    toast.success('Pre-check-in completed successfully!');
    setShowSuccessView(true);
    
  } catch (err) {
    console.error('Failed to submit prechecin:', err);
    
    // Handle field errors from backend
    if (err.response?.status === 400 && err.response?.data?.field_errors) {
      // Map backend errors to our structure
      const mappedErrors = mapBackendErrors(err.response.data.field_errors);
      setFieldErrors(mappedErrors);
    }
    
    const errorMessage = err.response?.data?.detail || 
                        'Failed to submit pre-check-in. Please try again.';
    toast.error(errorMessage);
    
  } finally {
    setSubmitting(false);
  }
};
```

---

## File Structure

### New/Modified Files
- **[hotelmate-frontend/src/pages/guest/GuestPrecheckinPage.jsx](hotelmate-frontend/src/pages/guest/GuestPrecheckinPage.jsx)** - Main component enhancement
- **[hotelmate-frontend/src/components/guest/PartyDetailsSection.jsx](hotelmate-frontend/src/components/guest/PartyDetailsSection.jsx)** - New party management component  
- **[hotelmate-frontend/src/components/guest/BookingSummaryCard.jsx](hotelmate-frontend/src/components/guest/BookingSummaryCard.jsx)** - New booking header component
- **[hotelmate-frontend/src/services/publicApiHelpers.js](hotelmate-frontend/src/services/publicApiHelpers.js)** - Update payload handling

### Styling Integration
- Use existing **React Bootstrap** components (Card, Button, Form, Badge)
- Apply **hotel theming** via CSS variables (`--main-color`)
- Utilize existing **preset system** (1-5 variants)
- Maintain **responsive design** patterns

---

## Validation Rules

### Party Fields
- **Primary Guest**: `first_name` + `last_name` required
- **Companions**: `first_name` + `last_name` required for each companion
- **Optional Fields**: `email` + `phone` (unless backend config specifies otherwise)
- **Companion Limit**: `adults - 1` maximum

### Extras Fields  
- **Dynamic**: Only validate `enabled` fields from `precheckin_field_registry`
- **Required**: Enforce `required` fields as non-empty
- **Types**: Handle text, select, checkbox, textarea validation appropriately

### Error Display
- **Inline**: Show field errors under respective inputs
- **Toast**: Show general success/failure messages  
- **Badge**: Show missing guest count in party section

---

## Compatibility Strategy

### Immediate Implementation
✅ **Frontend Ready**: Implement both payload formats now  
✅ **Backward Compatible**: Existing extras-only flow continues to work  
✅ **Future Proof**: Structured party + extras ready for backend unification

### Backend Transition Plan
1. **Phase 1**: Frontend sends both structured + flat payload
2. **Phase 2**: Backend accepts structured payload, ignores flat  
3. **Phase 3**: Remove `SEND_EXTRAS_FLAT = true` flag from frontend

### Risk Mitigation
- **Graceful Degradation**: If party data missing, show extras-only mode
- **Error Boundaries**: Handle malformed backend responses  
- **Fallback Values**: Provide sensible defaults for missing configuration

---

## Success Criteria

### User Experience
- ✅ Single page collects party + extras information
- ✅ One submit action for complete pre-check-in
- ✅ Clear missing guest indicators  
- ✅ Intuitive add/remove companion workflow
- ✅ Consistent hotel branding and theming

### Technical Quality  
- ✅ No hardcoded extras field keys
- ✅ Registry-driven dynamic field rendering
- ✅ Structured error handling across domains
- ✅ Backward-compatible API payload
- ✅ Maintainable component separation

### Performance
- ✅ Efficient state updates (avoid unnecessary re-renders)
- ✅ Optimistic UI updates during submission
- ✅ Proper loading states and error recovery
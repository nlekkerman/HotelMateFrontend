# Frontend Pre-Check-In Implementation Plan
**FINAL • VERIFIED BACKEND • NO FALLBACKS • NO STAFF TOKENS • READ-ONLY STAFF**

## 🚨 SOURCE OF TRUTH
- Backend staff serializers VERIFIED ✅
- Frontend must comply with strict API contracts
- NO backend changes - frontend implementation only

## 🔒 HARD RULES (NON-NEGOTIABLE)

### 1. Completion Detection (ONLY RULE)
```javascript
// ✅ ONLY allowed completion check
const isPrecheckinComplete = (booking) => booking?.precheckin_submitted_at != null;

// ❌ FORBIDDEN - No heuristics, payload checks, or other flags
```

### 2. Staff API Separation
- ✅ Staff uses `/api/staff/bookings/` endpoints ONLY
- ❌ Staff NEVER calls `/api/public/*/precheckin/*` endpoints
- ❌ Staff NEVER uses tokens

### 3. Data Scope Rules
- **Booking-scoped**: `booking.precheckin_payload.*`
- **Guest-scoped**: `guest.precheckin_payload.*`
- ❌ Never merge/sync/copy between scopes in staff UI
- ✅ Staff only DISPLAYS data (read-only)

### 4. Guest Payload Nesting (STRICT)
```javascript
// ✅ REQUIRED guest submit structure
{
  party: {
    primary: { 
      first_name, last_name, email, phone, is_staying,
      precheckin_payload: { nationality, country_of_residence, ... }
    },
    companions: [{ 
      first_name, last_name, email, phone, is_staying,
      precheckin_payload: { nationality, country_of_residence, ... }
    }]
  },
  extras: { special_requests, eta, consent_checkbox, ... }
}
```

## 📡 API CONTRACTS (VERIFIED)

### Staff Booking List Response
```json
{
  "results": [
    {
      "booking_id": "BK-2025-0012",
      "precheckin_submitted_at": "2025-12-19T11:05:46Z",
      "party_complete": true,
      "party_missing_count": 0,
      "primary_guest_name": "Nikola Simic"
    }
  ]
}
```

### Staff Booking Detail Response  
```json
{
  "booking_id": "BK-2025-0012",
  "precheckin_submitted_at": "2025-12-19T11:05:46Z",
  "precheckin_payload": {
    "special_requests": "Early check-in please",
    "eta": "14:00",
    "consent_checkbox": true
  },
  "party": {
    "primary": {
      "id": 123,
      "first_name": "Nikola",
      "last_name": "Simic",
      "precheckin_payload": {
        "nationality": "Afghanistan",
        "country_of_residence": "Serbia"
      }
    },
    "companions": [{
      "id": 124,
      "first_name": "Sanja", 
      "last_name": "Majsec",
      "precheckin_payload": {
        "nationality": "Afghanistan",
        "country_of_residence": "Belarus"
      }
    }]
  }
}
```

### Guest Precheckin Response (Token-Based)
```json
{
  "booking": {
    "precheckin_submitted_at": "2025-12-19T11:05:46Z",
    "precheckin_payload": {
      "special_requests": "Early check-in please",
      "eta": "14:00"
    }
  },
  "party": {
    "primary": {
      "first_name": "Nikola",
      "precheckin_payload": {
        "nationality": "Afghanistan",
        "country_of_residence": "Serbia"
      }
    }
  },
  "precheckin_field_registry": {
    "nationality": {
      "label": "Nationality",
      "type": "select", 
      "scope": "guest",
      "choices": ["Afghanistan", "Albania", "..."]
    }
  }
}
```

## 🎯 IMPLEMENTATION TASKS

### A) STAFF BOOKING LIST - Precheckin Badges
**Files**: `src/components/staff/bookings/BookingTable.jsx`

**Current Logic** (Lines 191-211):
```jsx
// Uses party_status_display and party_complete
{booking.party_status_display ? (
  <span className={`badge ${booking.party_complete ? 'bg-success' : 'bg-warning text-dark'}`}>
    {booking.party_status_display}
  </span>
) : /* fallback logic */ }
```

**Required Changes**:
1. **Add precheckin completion badge**:
   ```jsx
   // NEW: Precheckin badge using timestamp only
   const isPrecheckinComplete = booking?.precheckin_submitted_at != null;
   
   <span className={`badge ${isPrecheckinComplete ? 'bg-info' : 'bg-secondary'}`}>
     {isPrecheckinComplete ? (
       <>
         <i className="bi bi-check-circle me-1"></i>Pre-Check-In
       </>
     ) : (
       <>
         <i className="bi bi-clock me-1"></i>Pre-Check-In Pending  
       </>
     )}
   </span>
   ```

2. **Keep existing party badges** (unchanged - use `party_complete`/`party_missing_count`)
3. **Layout**: Display both badges side-by-side or stacked

### B) STAFF BOOKING DETAIL - Read-Only Precheckin Summary  
**Files**: `src/components/staff/bookings/BookingDetailsModal.jsx`

**Current Structure**: Room assignment, party info, booking actions

**Required Changes**:
1. **Add new precheckin section** (before or after room assignment):
   ```jsx
   {/* NEW: Pre-Check-In Summary Section */}
   <Card className="mb-3">
     <Card.Header>
       <h5 className="mb-0">
         <i className="bi bi-clipboard-check me-2"></i>
         Pre-Check-In Status
       </h5>
     </Card.Header>
     <Card.Body>
       <StaffPrecheckinSummary booking={booking} />
     </Card.Body>
   </Card>
   ```

2. **Create `StaffPrecheckinSummary` component**:
   ```jsx
   const StaffPrecheckinSummary = ({ booking }) => {
     const isComplete = booking?.precheckin_submitted_at != null;
     
     if (!isComplete) {
       return (
         <Alert variant="warning">
           <Alert.Heading>⏳ Pre-check-in Pending</Alert.Heading>
           <p>Guest has not completed pre-check-in yet.</p>
         </Alert>
       );
     }
     
     return (
       <Alert variant="success">
         <Alert.Heading>✅ Pre-check-in Completed</Alert.Heading>
         <p><strong>Submitted:</strong> {new Date(booking.precheckin_submitted_at).toLocaleString()}</p>
         
         {/* Booking-level data */}
         <h6>Booking Information:</h6>
         {booking.precheckin_payload ? (
           <ul>
             {Object.entries(booking.precheckin_payload).map(([key, value]) => (
               <li key={key}>
                 <strong>{key.replace('_', ' ')}:</strong> {
                   typeof value === 'boolean' ? (value ? '✅ Yes' : '❌ No') : (value || '—')
                 }
               </li>
             ))}
           </ul>
         ) : (
           <p>No booking-level pre-check-in data.</p>
         )}
         
         {/* Guest-level data */}
         <h6>Guest Information:</h6>
         <Row>
           <Col md={6}>
             <strong>Primary Guest:</strong> {booking.party?.primary?.first_name} {booking.party?.primary?.last_name}
             {booking.party?.primary?.precheckin_payload && (
               <ul>
                 {Object.entries(booking.party.primary.precheckin_payload).map(([key, value]) => (
                   <li key={key}><strong>{key}:</strong> {value || '—'}</li>
                 ))}
               </ul>
             )}
           </Col>
           <Col md={6}>
             {booking.party?.companions?.map((companion, index) => (
               <div key={companion.id || index}>
                 <strong>Companion {index + 1}:</strong> {companion.first_name} {companion.last_name}
                 {companion.precheckin_payload && (
                   <ul>
                     {Object.entries(companion.precheckin_payload).map(([key, value]) => (
                       <li key={key}><strong>{key}:</strong> {value || '—'}</li>
                     ))}
                   </ul>
                 )}
               </div>
             ))}
           </Col>
         </Row>
       </Alert>
     );
   };
   ```

3. **NO form inputs, dropdowns, or validation** - display only

### C) STAFF BOOKING ACTIONS - Send vs View Logic
**Files**: `src/components/staff/bookings/BookingActions.jsx`

**Current Logic**: Shows "Send Pre-Check-In" button

**Required Changes**:
1. **Conditional button logic**:
   ```jsx
   const isPrecheckinComplete = booking?.precheckin_submitted_at != null;
   
   {isPrecheckinComplete ? (
     <Button 
       variant="outline-info"
       size="sm"
       onClick={() => {
         // Scroll to precheckin section in modal
         const precheckinSection = document.querySelector('[data-precheckin-summary]');
         precheckinSection?.scrollIntoView({ behavior: 'smooth' });
       }}
     >
       <i className="bi bi-eye me-1"></i>
       View Pre-Check-In
     </Button>
   ) : (
     <Button 
       variant="outline-primary"
       size="sm" 
       onClick={() => mutation.mutate(booking.booking_id)}
       disabled={mutation.isPending}
     >
       <i className="bi bi-envelope me-1"></i>
       {mutation.isPending ? 'Sending...' : 'Send Pre-Check-In'}
     </Button>
   )}
   ```

2. **NO token fetching or public endpoint calls**
3. **Keep existing send precheckin mutation** (unchanged)

### D) GUEST PRECHECKIN PAGE - Nested Payload Structure
**Files**: `src/pages/guest/GuestPrecheckinPage.jsx`

**Current Payload Building**: May have flat guest fields

**Required Verification/Changes**:
1. **Check current `buildPayload` function** - ensure guest-scoped fields go to `party.*.precheckin_payload`
2. **Split fields by scope**:
   ```javascript
   const buildPayload = (partyPrimary, companionSlots, extrasValues, registry, config) => {
     const guestScopedFields = {};
     const bookingScopedFields = {};
     
     // Split enabled fields by scope
     Object.entries(registry).forEach(([fieldKey, meta]) => {
       if (!config.enabled[fieldKey]) return;
       
       if (meta.scope === 'guest') {
         // Will be nested under each party member's precheckin_payload
       } else {
         // Goes to extras (booking-scoped)
         if (extrasValues[fieldKey] !== undefined) {
           bookingScopedFields[fieldKey] = extrasValues[fieldKey];
         }
       }
     });
     
     // Build party with nested precheckin_payload
     const primary = {
       first_name: partyPrimary.first_name,
       last_name: partyPrimary.last_name,
       email: partyPrimary.email,
       phone: partyPrimary.phone,
       is_staying: partyPrimary.is_staying,
       precheckin_payload: {}
     };
     
     // Add guest-scoped fields to primary's precheckin_payload
     Object.entries(registry).forEach(([fieldKey, meta]) => {
       if (config.enabled[fieldKey] && meta.scope === 'guest') {
         if (partyPrimary[fieldKey] !== undefined) {
           primary.precheckin_payload[fieldKey] = partyPrimary[fieldKey];
         }
       }
     });
     
     // Same for companions
     const companions = companionSlots.map(companion => ({
       first_name: companion.first_name,
       last_name: companion.last_name,
       email: companion.email,
       phone: companion.phone,
       is_staying: companion.is_staying,
       precheckin_payload: Object.fromEntries(
         Object.entries(registry)
           .filter(([fieldKey, meta]) => config.enabled[fieldKey] && meta.scope === 'guest')
           .map(([fieldKey, meta]) => [fieldKey, companion[fieldKey]])
           .filter(([fieldKey, value]) => value !== undefined)
       )
     }));
     
     return {
       party: { primary, companions },
       extras: bookingScopedFields
     };
   };
   ```

3. **Verify form pre-population** reads from nested structure
4. **NO changes to API endpoints** (already use public endpoints with tokens)

### E) SELECT FIELD OPTIONS NORMALIZATION
**Files**: Guest precheckin form components

**Issue**: Handle both `meta.choices` (string[]) and `meta.options` (object[])

**Required Helper**:
```javascript
// Utility function for normalizing select options
const normalizeSelectOptions = (meta) => {
  if (meta.choices) {
    // String array format
    return meta.choices.map(choice => ({ value: choice, label: choice }));
  } else if (meta.options) {
    // Already object array format or needs conversion
    return meta.options.map(option => 
      typeof option === 'string' 
        ? { value: option, label: option }
        : { value: option.value, label: option.label || option.value }
    );
  }
  return [];
};

// Usage in form rendering
const options = normalizeSelectOptions(meta);
return (
  <Form.Select>
    <option value="">-- Select {meta.label} --</option>
    {options.map(option => (
      <option key={option.value} value={option.value}>
        {option.label}
      </option>
    ))}
  </Form.Select>
);
```

## 🚫 FORBIDDEN PATTERNS

### ❌ Staff UI Anti-Patterns
```javascript
// BANNED: Fallback completion detection
const complete = hasData || hasFlag || hasTimestamp;

// BANNED: Staff token usage  
fetchPrecheckinData(booking.precheckin_token);

// BANNED: Deprecated boolean field
if (booking.precheckin_complete) { /* DELETED */ }

// BANNED: Direct field access
if (booking.special_requests) { /* Use precheckin_payload.special_requests */ }

// BANNED: Form inputs in staff precheckin display
<Form.Control value={booking.eta} onChange={...} />

// BANNED: Helper reshaping functions
const extractGuestData = (booking) => { /* FORBIDDEN */ };
const normalizeBookingData = (payload) => { /* FORBIDDEN */ };
// No normalization helpers; do not reshape booking/party data
```

### ❌ Guest UI Anti-Patterns
```javascript
// BANNED: Flat guest fields in payload
{
  party: {
    primary: { first_name, last_name, nationality } // nationality should be in precheckin_payload
  }
}
```

## 📋 TESTING & VERIFICATION

### 1. Staff List Badge Verification
- [ ] Precheckin completed bookings show "✅ Pre-Check-In" badge
- [ ] Pending bookings show "⏳ Pre-Check-In Pending" badge  
- [ ] Party badges still work (separate from precheckin)
- [ ] Only `precheckin_submitted_at` timestamp used for completion

### 2. Staff Detail Summary Verification
- [ ] Completed precheckin shows formatted timestamp
- [ ] Booking-level data displays from `booking.precheckin_payload.*`
- [ ] Guest nationality shows from `guest.precheckin_payload.nationality`
- [ ] Individual companion data displays correctly
- [ ] Missing data shows "—" placeholder (no fallbacks)
- [ ] NO form inputs anywhere in staff precheckin section

### 3. Staff Actions Verification
- [ ] "Send Pre-Check-In" shows for pending bookings
- [ ] "View Pre-Check-In" shows for completed bookings  
- [ ] View button scrolls to precheckin section
- [ ] NO token fetching from staff actions

### 4. Guest Payload Verification
```javascript
// Console log payload structure before submit
console.log('🎯 Guest payload structure:', {
  party: {
    primary: {
      precheckin_payload: { /* guest-scoped fields here */ }
    },
    companions: [
      { precheckin_payload: { /* guest-scoped fields here */ }}
    ]
  },
  extras: { /* booking-scoped fields here */ }
});
```

### 5. API Response Verification
```javascript
// Verify staff booking detail has expected structure
console.log('📡 Staff API - Precheckin payload:', booking.precheckin_payload);
console.log('📡 Staff API - Guest nationality:', booking.party.primary?.precheckin_payload?.nationality);
```

## 🎯 SUCCESS CRITERIA

### Staff UI Requirements ✅
- ✅ Completion detection uses `precheckin_submitted_at != null` ONLY
- ✅ Staff never calls public endpoints or uses tokens
- ✅ Guest nationality visible from `party.*.precheckin_payload.nationality`
- ✅ Booking data visible from `booking.precheckin_payload.*`  
- ✅ Read-only display (no form inputs)

### Guest UI Requirements ✅
- ✅ Guest-scoped fields nested in `party.*.precheckin_payload`
- ✅ Booking-scoped fields in `extras`
- ✅ Form pre-population from token-based API
- ✅ Select field options normalized

### Integration Requirements ✅
- ✅ Staff list shows precheckin badges
- ✅ Staff detail shows comprehensive precheckin summary
- ✅ Staff actions conditional on completion status
- ✅ Guest payload structure complies with backend contract
- ✅ App builds and runs without errors

## 🚀 EXPECTED USER EXPERIENCE

### For Staff (Booking Management) 
- **List View**: Clear precheckin status badges alongside party completion badges
- **Detail View**: Comprehensive read-only summary of all precheckin data
- **Actions**: Contextual "Send" vs "View" precheckin options
- **Data Integrity**: All precheckin info displayed from backend payload

### For Guests (Precheckin Form)
- **Form Building**: Dynamic fields from backend registry
- **Pre-population**: Existing data loads for editing  
- **Data Persistence**: Guest-scoped fields stored per individual
- **Validation**: Field-level validation with clear error messages

---

**IMPLEMENTATION STATUS**: Ready for execution  
**BACKEND DEPENDENCY**: ✅ Complete - No backend changes required  
**FRONTEND SCOPE**: Staff + Guest precheckin compliance with verified API contracts

**Next Step**: Await "go" command to begin implementation of tasks A-E
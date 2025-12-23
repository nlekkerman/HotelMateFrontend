# Guest Survey Frontend Implementation Plan (Canonical)

**Created:** December 23, 2025  
**Status:** Implementation Ready  
**Architecture:** Pre-check-in Pattern Mirror  

## 🎯 Implementation Principles

**CRITICAL**: Frontend survey implementation must strictly mirror pre-check-in patterns, reusing layouts, hooks, validation rules, and token-based flows. No new UX paradigms or hardcoded field logic is permitted.

## 1️⃣ Staff Survey Configuration Component

### Component: `SurveyRequirementsConfig.jsx`

**Location:** `hotelmate-frontend/src/components/bookings/SurveyRequirementsConfig.jsx`

**Mirror Pattern:** Identical to `PrecheckinRequirementsConfig.jsx` behavior

### API Integration
- **GET:** `/api/staff/hotel/{hotelSlug}/survey-config/`
- **POST:** `/api/staff/hotel/{hotelSlug}/survey-config/`

### Expected Response Shape
```json
{
  "enabled": {},
  "required": {},
  "send_mode": "AUTO_DELAYED",
  "delay_hours": 24,
  "field_registry": {}
}
```

### UI Rules (Explicit - No Guessing)

#### Dynamic Field Registry Rendering
- **Field Source:** ALL fields from `field_registry` response (never hardcoded)
- **Registry Treatment:** `field_registry` is the **complete catalog** of available fields (not a subset)
- **UI Requirement:** Render **ALL** registry fields in configuration UI (regardless of enabled status)
- **Registry Rule:** Registry = what CAN be enabled, Config = what IS enabled
- **Field Types:** `rating`, `textarea`, `checkbox`, `select`, `text`, `date` (as provided by registry)
- **No Hardcoding:** Do not hardcode fields like `overall_rating`/`comment`/`contact_permission`
- **No Optimization:** Never filter registry fields in UI - show complete catalog always

#### Field Configuration UI
- **Enabled/Required:** Switches (not checkboxes) for each registry field
- **Hard Rule:** Required ⊆ Enabled (required toggle disabled when enabled is false)
- **State Enforcement:** Setting enabled to false auto-clears required
- **Default State:** Most fields initially disabled (from backend default config)
- **Expansion:** Staff can enable additional fields per hotel

#### Field List Management
- **Search Box:** "Filter fields…" input for long field lists
- **Grouping:** By category if registry provides it (optional), else alphabetical
- **Stable Sorting:** 
  - Primary: `registry[field].order` if available
  - Fallback: `registry[field].label` or `fieldKey` alphabetically
- **Prevents:** "Fields jump around" behavior

#### Send Policy Configuration  
- **send_mode:** Radio buttons (not dropdown)
  - `AUTO_IMMEDIATE` - Send immediately after checkout
  - `AUTO_DELAYED` - Send after delay
  - `MANUAL_ONLY` - Staff send only

#### Delay Configuration
- **delay_hours:** Number input
- **Visibility Rule:** Only visible when `send_mode === "AUTO_DELAYED"`
- **Combined Save:** Posts enabled/required + send settings together to `/survey-config/`

### UI Grouping Structure
```
┌─────────────────────────────────┐
│ Survey Field Configuration      │
│ • Search box ("Filter fields…") │
│ • Dynamic field rows from       │
│   field_registry (never hardcd) │
│ • Enabled/Required switches     │
│ • Stable sorting by order/label │
└─────────────────────────────────┘
┌─────────────────────────────────┐
│ Survey Sending Policy           │
│ • Radio buttons (send_mode)     │
│ • Number input (delay_hours)    │
│ • Combined save with fields     │
└─────────────────────────────────┘
```

## 2️⃣ Dashboard Integration

### Modify: `BookingManagementDashboard.jsx`

**Integration Rules:**
- Render `SurveyRequirementsConfig` **AFTER** `PrecheckinRequirementsConfig`
- Components are **siblings**, not nested
- Each panel has its **own save action** (no shared state)
- Both panels use same `Col lg={8}` wrapper pattern

## 3️⃣ Booking Actions - Send Survey

### Modify: `BookingActions.jsx`

#### Frontend Guards (Hard Rules)
Show button only if:
- `booking.status === "COMPLETED"`
- AND `!booking.survey_completed`

#### Button States
- **Send Survey** → if never sent
- **Resend Survey** → if sent but not completed

#### UX Rules
- Always show recipient email in confirmation modal
- Disable button while request is in flight
- Toast success/failure (no custom logic)

#### API
- **POST:** `/api/staff/hotel/{hotelSlug}/room-bookings/{booking_id}/send-survey-link/`

## 4️⃣ Guest Survey Page & Routing

### Component: `GuestSurveyPage.jsx`

**Location:** `hotelmate-frontend/src/pages/guest/GuestSurveyPage.jsx`  
**Route:** `/guest/hotel/:hotelSlug/survey?token=...`

#### Layout Rule (Critical)
- **Must be layout-identical to `GuestPrecheckinPage`**
- Only content differs
- Same responsive structure, same styling patterns
- Same success/error state presentations

#### Why This Matters
- Consistent mental model for guests
- Less CSS drift
- Easier maintenance

## 5️⃣ Survey Data Loading

### Hook: `useSurveyData.js`

**Location:** `hotelmate-frontend/src/hooks/useSurveyData.js`  
**Mirror Pattern:** Identical to `usePrecheckinData.js` structure

#### API
- **GET:** `/api/public/hotel/{hotelSlug}/survey/validate-token/?token=...`

#### Required Return: `survey_state`
Must return one of these states:
- `"loading"` - Initial data fetch
- `"invalid"` - Invalid token format/signature
- `"expired"` - Expired token timestamp
- `"completed"` - Already submitted (no resubmission)
- `"ready"` - Ready for form rendering

#### Response Data Structure
```json
{
  "survey_state": "ready",
  "survey_config": {
    "enabled": { "fieldKey": true/false },
    "required": { "fieldKey": true/false }
  },
  "field_registry": {
    "fieldKey": {
      "label": "Field Display Name",
      "type": "rating|textarea|checkbox|select|text|date",
      "order": 100,
      "category": "optional"
    }
  },
  "booking": { "hotel_name": "...", "dates": "..." }
}
```

#### State Handling
- **Invalid token:** Show error screen with hotel contact info
- **Expired token:** Show specific expired message with contact option
- **Already completed:** Show thank-you screen (block resubmission)
- **Ready:** Render form with configuration snapshot

## 6️⃣ Survey Form Rendering & Submission

### Hook: `useSurveyForm.js`

**Location:** `hotelmate-frontend/src/hooks/useSurveyForm.js`  
**Mirror Pattern:** Identical to `usePrecheckinForm.js` validation logic

#### Frontend Rules (Locked)
1. **Render ONLY enabled fields** where `survey_config.enabled[fieldKey] === true`
2. **Render fields sorted by order** from registry (order → label → key fallback)
3. **Validate ONLY required fields** from `survey_config.required[fieldKey] === true`
4. **Submit ONLY enabled fields** (payload filtering - never send disabled fields)
5. **Disable submit button after success** (hard stop - no retries)

#### Dynamic Field Type Rendering
Based on `field_registry[fieldKey].type`:
- **rating (1–5):** Radio group or star interface (values: 1,2,3,4,5 numeric)
- **textarea:** Multi-line text input with proper sizing
- **checkbox:** Boolean toggle with clear labeling
- **select:** Dropdown with options from registry
- **text:** Single-line text input
- **date:** Date picker or date input

**Critical:** Never hardcode field types - always use registry type property

#### Field Rendering Logic
```javascript
// Only render enabled fields
const enabledFields = Object.entries(fieldRegistry)
  .filter(([fieldKey]) => surveyConfig.enabled[fieldKey] === true)
  .sort((a, b) => {
    const [keyA, metaA] = a;
    const [keyB, metaB] = b;
    // Sort by order, then label, then key
    if (metaA.order && metaB.order) return metaA.order - metaB.order;
    return (metaA.label || keyA).localeCompare(metaB.label || keyB);
  });
```

#### Validation Rules
- **Required Field Validation:** Only check `required[fieldKey] === true` fields
- **Rating Validation:** Must select 1-5 if required
- **Checkbox Validation:** Only validate if `required[fieldKey] === true`
- **Text/Textarea:** Must have `.trim()` content if required
- **No Universal Requirements:** Fields only required if config says so

#### API
- **POST:** `/api/public/hotel/{hotelSlug}/survey/submit/`

#### Submission Payload Rules
```javascript
// Only include enabled fields in payload
const payload = {
  token: surveyToken,
  survey_data: {}
};

// Filter: only send enabled fields with values
Object.entries(surveyData).forEach(([fieldKey, value]) => {
  if (surveyConfig.enabled[fieldKey] === true && value != null && value !== '') {
    payload.survey_data[fieldKey] = value;
  }
});
```

#### Pre-Submit Validation
- Check ONLY `required[fieldKey] === true` fields
- Rating fields: Must have numeric value 1-5 if required
- Text/Textarea: Must have `.trim()` content if required  
- Checkbox: Must be checked (true) if required
- **Block submission** if any required field missing
- **Allow submission** with partial data for non-required fields

#### Post-Submit States
- **Success:** Show thank-you screen, disable all further submission attempts
- **Validation Error:** Show field-specific errors, allow retry
- **Server Error:** Show generic error with retry option
- **No Retries After Success:** Hard stop once successfully submitted

## 7️⃣ Success/Thank You Screen

### Design Rules
- **Match pre-check-in styling exactly**
- **Change copy only** (not layout/components)
- **Block All Further Access:** No retry buttons, no form access after success

### Approved Copy
```
Thank you for your feedback.
Your response helps us improve our service.
```

### Completion State Enforcement
- **One-time only:** Token becomes invalid after successful submission
- **No re-access:** Accessing with completed token shows thank-you (not form)
- **No retry UI:** Remove all submission buttons and form elements

### What NOT to Include
- ❌ Rating summary display
- ❌ Analytics data  
- ❌ Staff survey viewer links
- ❌ New design elements
- ❌ "Submit another response" options

## 8️⃣ Send Timing UI Specification

### Placement: Visible but Compact
- `send_mode` radio buttons → **visible** (not hidden)
- `delay_hours` input → **inline, conditional** (not modal/drawer)
- Wrap both in **"Survey Sending Policy"** card

### Visual Hierarchy
```
Survey Sending Policy
○ Send immediately after checkout (AUTO_IMMEDIATE)  
○ Send after delay (AUTO_DELAYED) [24] hours
○ Manual sending only (MANUAL_ONLY)
```

## 9️⃣ Component Architecture Mirror

### Required Components (Mirror Pre-check-in)
```
GuestSurveyPage/
├── SurveyHeader (mirrors PrecheckinHeader)
├── BookingContextCard (mirrors BookingContactCard)  
├── SurveyFormSection (mirrors form sections)
├── SurveySubmitBar (mirrors SubmitBar)
└── SurveySuccessCard (mirrors success state)
```

### State Management Pattern
```javascript
// Mirror usePrecheckinForm.js state structure
const [surveyData, setSurveyData] = useState({}); // Only enabled field values
const [fieldErrors, setFieldErrors] = useState({}); // Field-specific validation errors
const [surveyState, setSurveyState] = useState('loading'); // loading|invalid|expired|completed|ready
const [loading, setLoading] = useState(true); // Initial data loading
const [submitting, setSubmitting] = useState(false); // Form submission in progress
const [success, setSuccess] = useState(false); // Successfully submitted
```

### Token State Handling Components
```javascript
// Invalid Token State
if (surveyState === 'invalid') {
  return <InvalidTokenScreen hotelContactInfo={hotelInfo} />;
}

// Expired Token State  
if (surveyState === 'expired') {
  return <ExpiredTokenScreen hotelContactInfo={hotelInfo} />;
}

// Already Completed State
if (surveyState === 'completed' || success) {
  return <SurveyCompletedScreen />; // No form, no retry options
}

// Ready State - Render Form
if (surveyState === 'ready') {
  return <SurveyFormRenderer />;
}
```

## 🔒 Implementation Constraints

### What is REQUIRED
✅ Mirror pre-check-in architecture exactly  
✅ Reuse existing layouts and styling  
✅ Token-based validation flow  
✅ **Dynamic field rendering from registry** (never hardcode fields)
✅ **Registry-driven configuration** (registry = what CAN be enabled)
✅ Enabled/Required constraint enforcement (Required ⊆ Enabled)
✅ One-time submission prevention with hard stops
✅ **Stable field sorting** (order → label → key fallback)
✅ **Search/filtering for long field lists**
✅ **Complete token state handling** (invalid/expired/completed/ready)
✅ **Payload filtering** (only submit enabled fields)

### What is FORBIDDEN
❌ New UX paradigms or design patterns  
❌ **Hardcoded field logic or field keys** (everything from registry)
❌ Analytics dashboard components  
❌ Survey results viewing interfaces  
❌ Auth-protected guest routes  
❌ Custom styling beyond existing patterns  
❌ Backend API modifications
❌ **Retry mechanisms after successful submission**
❌ **Universal field requirements** (only required[] fields are required)  

## 📋 Acceptance Criteria

### Staff Dashboard
- [ ] Survey config shows ALL fields from field_registry dynamically
- [ ] Search box filters long field lists effectively
- [ ] Fields display in stable, deterministic order (order → label → key)
- [ ] Required ⊆ Enabled rule enforced in UI (required disabled when enabled false)
- [ ] Send timing controls visible and functional in same component
- [ ] Configuration saves enabled/required + send settings together
- [ ] No hardcoded field assumptions (everything from registry)

### Staff Booking Actions
- [ ] Survey send button appears for COMPLETED bookings only
- [ ] Button states reflect survey completion status correctly
- [ ] Confirmation modal shows recipient email address
- [ ] Toast notifications for success/failure states

### Guest Experience  
- [ ] Token validation handles all states: invalid/expired/completed/ready
- [ ] Guest survey form renders ONLY enabled fields dynamically
- [ ] Field types render correctly: rating/textarea/checkbox/select/text/date
- [ ] Validation uses ONLY required[] configuration (no universal requirements)
- [ ] One-time submission enforced with hard stops (no retry after success)
- [ ] Layout identical to pre-check-in experience
- [ ] Proper state screens for each token condition

### Technical
- [ ] Payload includes ONLY enabled fields (disabled fields filtered out)
- [ ] Form validation uses configuration snapshot (not live config)
- [ ] Error handling mirrors existing patterns exactly
- [ ] API integration follows established contracts  
- [ ] Success states prevent all further access/resubmission

## 🚀 Ready for Implementation

This plan is **implementation-ready** and **approved for handoff to development**. All architectural decisions are locked, UI patterns are specified, and technical constraints are defined.

**No additional planning or backend changes required.**
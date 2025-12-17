# PrecheckinRequirementsConfig Component - Source of Truth

**Implementation Status:** 🚧 IN PROGRESS  
**Created:** December 17, 2025  
**Last Updated:** December 17, 2025

## Overview

Build a standalone configuration component for pre-check-in requirements that integrates into BookingManagementDashboard using existing HotelMate patterns for API handling, styling, and state management.

## Locked Decisions

### Theme Color Priority
Use `var(--main-color)` if present; else `useTheme().mainColor`; else Bootstrap primary.

### Placement
Render as an inline Card section in BookingManagementDashboard (not modal/tab).

### Persistence
Manual Save only (no auto-save). Unsaved changes reset on reload.

## Backend Contract (MUST MATCH EXACTLY)

### GET Endpoint
```
GET /api/staff/hotel/{hotelSlug}/precheckin-config/
```

**Response Shape:**
```json
{
  "enabled": {
    "field_key_1": true,
    "field_key_2": false,
    ...
  },
  "required": {
    "field_key_1": false,
    "field_key_2": false,
    ...
  },
  "field_registry": {
    "field_key_1": {
      "label": "Field Display Name",
      "description": "Optional field description"
    },
    "field_key_2": {
      "label": "Another Field Name"
    },
    ...
  }
}
```

### POST Endpoint
```
POST /api/staff/hotel/{hotelSlug}/precheckin-config/
```

**Payload Shape:**
```json
{
  "enabled": {
    "field_key_1": true,
    "field_key_2": false,
    ...
  },
  "required": {
    "field_key_1": false,
    "field_key_2": false,
    ...
  }
}
```

## Implementation Requirements

### Component Structure

**File Location:** `src/components/bookings/PrecheckinRequirementsConfig.jsx`

**Props:**
- `hotelSlug` (string, required) - The hotel slug for API endpoints

**State Management:**
```javascript
const [config, setConfig] = useState({ enabled: {}, required: {} });
const [originalConfig, setOriginalConfig] = useState({ enabled: {}, required: {} });
const [fieldRegistry, setFieldRegistry] = useState({});
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);
const [saving, setSaving] = useState(false);
const [isDirty, setIsDirty] = useState(false);
```

### UI Layout Structure

```jsx
<div className="card shadow-sm">
  <div className="card-header" style={{ borderLeft: `4px solid ${themeColor}` }}>
    <h5 className="mb-0">Pre-check-in Requirements</h5>
    <small className="text-muted">Choose what guests must provide before arrival.</small>
  </div>
  
  <div className="card-body">
    {loading && <LoadingSpinner />}
    {error && <ErrorDisplay />}
    {!loading && !error && <FieldsTable />}
  </div>
  
  <div className="card-footer d-flex justify-content-between">
    <button className="btn btn-outline-secondary" onClick={handleReset} disabled={!isDirty}>
      Reset
    </button>
    <button 
      className="btn btn-primary" 
      style={{ backgroundColor: themeColor }}
      onClick={handleSave} 
      disabled={!isDirty || saving}
    >
      {saving ? <Spinner /> : 'Save Changes'}
    </button>
  </div>
</div>
```

### Dynamic Field Rendering

**Table Structure:**
```jsx
<div className="table-responsive">
  <table className="table table-hover">
    <thead>
      <tr>
        <th>Field</th>
        <th className="text-center">Enabled</th>
        <th className="text-center">Required</th>
      </tr>
    </thead>
    <tbody>
      {Object.entries(fieldRegistry).map(([key, fieldInfo]) => (
        <FieldRow key={key} fieldKey={key} fieldInfo={fieldInfo} />
      ))}
    </tbody>
  </table>
</div>
```

**Field Row Components:**
```jsx
<tr>
  <td>
    <div>
      <strong>{fieldInfo.label}</strong>
      {fieldInfo.description && (
        <div className="text-muted small">{fieldInfo.description}</div>
      )}
    </div>
  </td>
  <td className="text-center">
    <Form.Check
      type="switch"
      checked={config.enabled[fieldKey] || false}
      onChange={(e) => handleEnabledChange(fieldKey, e.target.checked)}
    />
  </td>
  <td className="text-center">
    <Form.Check
      type="switch"
      checked={config.required[fieldKey] || false}
      onChange={(e) => handleRequiredChange(fieldKey, e.target.checked)}
      disabled={!config.enabled[fieldKey]}
    />
  </td>
</tr>
```

## Hard Rules (NON-NEGOTIABLE)

### Rule 1: Dynamic Field Rendering Only
- **NEVER** hardcode field keys like `"id_document"`, `"credit_card"`, etc.
- **ALWAYS** render from `fieldRegistry` returned by backend
- **NEVER** assume which fields exist - iterate through `Object.entries(fieldRegistry)`

### Rule 2: Required ⊆ Enabled Constraint
- **NEVER** allow `required[key] = true` if `enabled[key] = false`
- **UI Enforcement:** Required toggle disabled when enabled is false
- **State Enforcement:** Setting enabled to false must auto-clear required
- **Payload Enforcement:** Validate payload before POST to ensure constraint

### Rule 3: Conditional Description Rendering
- **NEVER** assume `fieldRegistry[key].description` exists
- **ALWAYS** check if description exists before rendering
- Render description only if `fieldInfo.description` is truthy

## API Integration Pattern

### Initial Load
```javascript
useEffect(() => {
  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(`/staff/hotel/${hotelSlug}/precheckin-config/`);
      const { enabled, required, field_registry } = response.data;
      
      setConfig({ enabled, required });
      setOriginalConfig({ enabled, required });
      setFieldRegistry(field_registry);
      setIsDirty(false);
    } catch (err) {
      setError('Failed to load configuration. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  if (hotelSlug) loadConfig();
}, [hotelSlug]);
```

### Save Operation
```javascript
const handleSave = async () => {
  try {
    setSaving(true);
    
    // Enforce constraint before sending
    const sanitizedPayload = {
      enabled: config.enabled,
      required: Object.fromEntries(
        Object.entries(config.required).filter(
          ([key, value]) => value && config.enabled[key]
        )
      )
    };
    
    await api.post(`/staff/hotel/${hotelSlug}/precheckin-config/`, sanitizedPayload);
    
    setOriginalConfig(config);
    setIsDirty(false);
    toast.success('Configuration saved successfully!');
  } catch (err) {
    toast.error('Failed to save configuration. Please try again.');
  } finally {
    setSaving(false);
  }
};
```

## State Change Handlers

### Enabled Toggle Handler
```javascript
const handleEnabledChange = (fieldKey, isEnabled) => {
  setConfig(prev => {
    const newConfig = {
      ...prev,
      enabled: { ...prev.enabled, [fieldKey]: isEnabled }
    };
    
    // If disabling, also clear required
    if (!isEnabled) {
      newConfig.required = { ...prev.required, [fieldKey]: false };
    }
    
    return newConfig;
  });
  setIsDirty(true);
};
```

### Required Toggle Handler
```javascript
const handleRequiredChange = (fieldKey, isRequired) => {
  // Only allow if enabled
  if (!config.enabled[fieldKey] && isRequired) return;
  
  setConfig(prev => ({
    ...prev,
    required: { ...prev.required, [fieldKey]: isRequired }
  }));
  setIsDirty(true);
};
```

## Theme Integration

### Theme Color Resolution
```javascript
const getThemeColor = () => {
  // Priority 1: CSS variable
  const cssVar = getComputedStyle(document.documentElement)
    .getPropertyValue('--main-color').trim();
  if (cssVar) return cssVar;
  
  // Priority 2: Theme context
  const { mainColor } = useTheme();
  if (mainColor) return mainColor;
  
  // Priority 3: Bootstrap fallback
  return '#0d6efd'; // Bootstrap primary
};
```

## Integration into BookingManagementDashboard

### Import and Usage
```javascript
// Add to imports
import PrecheckinRequirementsConfig from './PrecheckinRequirementsConfig';

// Add to render method (as card section)
<div className="row">
  <div className="col-12">
    <PrecheckinRequirementsConfig hotelSlug={hotelSlug} />
  </div>
</div>
```

### Requirements
- Pass existing `hotelSlug` prop from BookingManagementDashboard
- Do NOT modify any existing booking logic
- Maintain clean separation of concerns

## Error States and Loading

### Loading State
```jsx
if (loading) {
  return (
    <div className="card shadow-sm">
      <div className="card-body text-center py-5">
        <div className="spinner-border text-primary mb-3" role="status" />
        <p className="mb-0">Loading configuration...</p>
      </div>
    </div>
  );
}
```

### Error State
```jsx
if (error) {
  return (
    <div className="card shadow-sm">
      <div className="card-body text-center py-5">
        <div className="text-danger mb-3">
          <i className="bi bi-exclamation-triangle" style={{ fontSize: '2rem' }}></i>
        </div>
        <p className="text-danger mb-3">{error}</p>
        <button className="btn btn-outline-primary" onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    </div>
  );
}
```

## Toast Notifications

### Success
```javascript
toast.success('Configuration saved successfully!');
```

### Error
```javascript
toast.error('Failed to save configuration. Please try again.');
```

## Validation Requirements

### Pre-save Validation
- Ensure no `required[key] = true` when `enabled[key] = false`
- Sanitize payload to remove invalid required entries
- Validate hotelSlug exists before API calls

### UI Validation
- Disable required toggle when enabled is false
- Show visual feedback for dirty state
- Disable save button when no changes or saving in progress

---

**Implementation Notes:**
- Follow existing HotelMate component patterns
- Use React Bootstrap components for consistency
- Implement comprehensive error handling
- Ensure responsive design
- Test all constraint enforcement thoroughly

**Dependencies:**
- `react-bootstrap` for UI components
- `react-toastify` for notifications
- `@/services/api` for HTTP requests
- `@/context/ThemeContext` for theming

---

This document serves as the complete specification for the PrecheckinRequirementsConfig component implementation. All decisions are locked and should not be changed without updating this source of truth.
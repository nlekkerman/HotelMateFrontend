# Frontend Face Attendance System Documentation

## Overview

The Face Attendance System provides comprehensive face recognition capabilities for hotel staff management, including registration, clock-in functionality, and manager oversight tools.

## Architecture

### Core Components

#### 1. Face Registration System
- **StaffFaceRegistrationCTA**: Context-aware registration button for staff profiles
- **FaceRegistrationPage**: Complete face registration workflow with image capture
- **Configuration Integration**: Respects hotel and department-specific face settings

#### 2. Kiosk Clock-In Interface  
- **FaceClockInPage**: Professional kiosk-style interface for staff attendance
- **Safety Features**: Session warnings, roster validation, error handling
- **UX Polish**: Auto-reset, countdown timers, clear status feedback

#### 3. Manager Controls
- **Staff Directory Enhancement**: Face status filtering and statistics
- **StaffDetails Integration**: Face lifecycle management (revoke, re-register)
- **Permission-Gated Access**: Manager-only administrative functions

#### 4. Configuration System
- **useHotelFaceConfig**: Hotel-specific face attendance settings
- **Dynamic Restrictions**: Department and role-based face access control
- **Real-time Updates**: Configuration changes reflect immediately

## Component Reference

### StaffFaceRegistrationCTA
```jsx
// Usage in staff profiles
<StaffFaceRegistrationCTA 
  staffData={staff}
  showButton={!staff.has_registered_face}
/>
```

**Props:**
- `staffData`: Staff object with registration status
- `showButton`: Controls button visibility

**Behavior:**
- Shows registration CTA when face data missing
- Respects hotel face configuration
- Navigates to registration page with pre-filled staff ID

### FaceClockInPage  
```jsx
// Kiosk-style clock-in interface
<Route path="/face/:hotelSlug/clock-in" element={<FaceClockInPage />} />
```

**Features:**
- State-driven interface (ready → capture → process → result)
- Location selection integration
- Session duration warnings
- Auto-reset with countdown
- Comprehensive error handling

**States:**
- `ready`: Initial state with location selection
- `captured`: Image captured, awaiting confirmation  
- `processing`: Clock-in request in progress
- `success`/`error`: Result states with auto-reset

### useHotelFaceConfig Hook
```jsx
const { 
  config, 
  isLoading, 
  canStaffUseFace,
  isFaceAvailable 
} = useHotelFaceConfig();
```

**Returns:**
- `config`: Hotel face attendance configuration
- `isLoading`: Configuration loading state
- `canStaffUseFace(staff)`: Check if staff can use face features
- `isFaceAvailable`: Whether face is enabled for hotel

## Integration Patterns

### Staff Profile Integration
```jsx
// Show registration button conditionally
{!staff.has_registered_face && canStaffUseFace(staff) && (
  <StaffFaceRegistrationCTA staffData={staff} />
)}
```

### Manager Controls Pattern
```jsx
// Permission-gated face management
{hasPermission('manage_staff') && (
  <FaceManagementSection staff={staff} />
)}
```

### Configuration-Aware Components
```jsx
// Respect face configuration
const { isFaceAvailable, canStaffUseFace } = useHotelFaceConfig();

if (!isFaceAvailable) {
  return <FaceDisabledMessage />;
}
```

## Styling System

### Kiosk CSS (`faceKiosk.css`)
Professional kiosk interface styling with:
- Large touch-friendly buttons (min 48px)
- High contrast color scheme
- Clear typography hierarchy
- Responsive grid layouts
- Accessibility compliance

### Status Badges
- **Face OK** (success): Green badge for registered staff
- **No Face** (warning): Orange badge for unregistered staff  
- **Restricted** (muted): Gray badge for configuration restrictions

## API Integration

### Face Registration
```javascript
// Register face data
POST /api/face/register
{
  staff_id: "string",
  image_data: "base64",
  hotel_id: "string"
}
```

### Face Clock-In
```javascript  
// Clock in with face recognition
POST /api/face/clock-in
{
  image_data: "base64",
  location_id: "string",
  hotel_id: "string"
}
```

### Face Management
```javascript
// Manager revoke face data
DELETE /api/face/staff/{staffId}
{
  reason: "string (optional)"
}
```

## Configuration Schema

### Hotel Face Settings
```json
{
  "face_attendance_enabled": boolean,
  "restricted_departments": ["string"],
  "restricted_roles": ["string"],
  "require_roster_for_clockin": boolean,
  "session_warnings": {
    "break_hours": 6,
    "long_hours": 10, 
    "severe_hours": 12
  }
}
```

## Error Handling

### Common Error Scenarios
1. **Face Not Recognized**: Clear retry instructions
2. **Not Rostered**: Manager contact suggestion
3. **Configuration Disabled**: Informational messages
4. **Network Issues**: Offline state handling
5. **Permission Denied**: Graceful access restriction

### Error Response Format
```json
{
  "success": false,
  "error_code": "FACE_NOT_RECOGNIZED",
  "message": "Face not recognized. Please try again.",
  "details": {}
}
```

## State Management

### Face Configuration State
- Cached per hotel for performance
- Invalidated on configuration changes
- Shared across components via custom hook

### Face Status State  
- Optimistic updates for better UX
- Synchronized with backend on actions
- Real-time updates via polling/websockets

## Security Considerations

### Face Data Protection
- Images processed but not permanently stored on frontend
- Secure transmission to backend APIs
- No face data in browser dev tools/logs

### Permission Validation
- Manager actions require explicit permission checks
- Face configuration respects role hierarchies  
- Audit trails for face management actions

## Testing Strategy

### Unit Testing
- Component rendering with various props
- Hook behavior with different configurations
- Utility function correctness

### Integration Testing  
- End-to-end registration workflow
- Manager face management flows
- Configuration change propagation

### Manual Testing
- Cross-browser compatibility
- Touch device interaction
- Accessibility compliance
- Performance under load

## Performance Optimization

### Code Splitting
- Face components loaded on-demand
- Separate bundles for kiosk vs admin interfaces

### Caching Strategy
- Face configuration cached with TTL
- Staff face status cached and invalidated
- Image processing optimized for mobile

### Bundle Size
- Camera utilities loaded conditionally  
- Face recognition libraries optimized
- CSS-in-JS for component-specific styling

## Future Enhancements

### Planned Features
1. **Bulk Face Management**: Mass registration/revocation tools
2. **Face Analytics**: Registration rates and usage metrics  
3. **Advanced Restrictions**: Time-based face access controls
4. **Mobile App Integration**: Native face recognition capabilities
5. **Biometric Alternatives**: Fingerprint and badge integration

### Technical Debt
- Migrate to TypeScript for better type safety
- Implement comprehensive error boundary system
- Add unit test coverage for all face components
- Optimize camera preview performance
- Standardize configuration validation

## Troubleshooting

### Common Issues
1. **Camera Not Working**: Browser permission checks
2. **Poor Face Recognition**: Image quality guidelines  
3. **Configuration Not Loading**: Network and caching issues
4. **Permission Errors**: Role and permission validation

### Debug Tools
- Face configuration inspector
- Image quality validator  
- Permission checker utility
- Network request monitor

---

For additional support or feature requests, refer to the main HotelMate documentation or contact the development team.
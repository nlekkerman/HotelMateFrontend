# API Endpoint Fixes Summary

This document summarizes all the API endpoint corrections made to align the frontend with the HotelMate Backend API guide.

## ✅ Fixed Endpoints

### 1. Face Recognition Endpoints
**File**: `src/features/faceAttendance/hooks/useFaceApi.js`

#### Changes Made:
- **BEFORE**: `/api/staff/hotel/{hotelSlug}/attendance/clock-logs/register-face/` (deprecated)
- **AFTER**: `/api/staff/hotel/{hotelSlug}/attendance/face-management/register-face/` (enhanced)

- **BEFORE**: `/api/staff/hotel/{hotelSlug}/attendance/clock-logs/face-clock-in/` (deprecated)  
- **AFTER**: `/api/staff/hotel/{hotelSlug}/attendance/face-management/face-clock-in/` (enhanced)

#### New Parameters Added:
- `encoding`: 128-dimensional face encoding array (required)
- `consent_given`: Explicit consent for face processing (default: true)
- `force_action`: Optional force action parameter

#### New Functions Added:
- `checkFaceStatus({ hotelSlug })`: Check user's face registration status
- `listRegisteredFaces({ hotelSlug, activeOnly, staffId })`: List registered faces (admin)

### 2. Face Admin Endpoints  
**File**: `src/features/faceAttendance/hooks/useFaceAdminApi.js`

#### Changes Made:
- **BEFORE**: `/staff/{hotelSlug}/{staffId}/revoke-face/`
- **AFTER**: `/staff/hotel/{hotelSlug}/attendance/face-management/revoke-face/`

#### New Functions Added:
- `getFaceAuditLogs({ hotelSlug, staffId, action, startDate, endDate, page, pageSize })`: Get face lifecycle audit logs

### 3. Attendance Data Endpoints
**File**: `src/features/attendance/hooks/useAttendanceData.js`

#### Changes Made:
- **BEFORE**: `/api/attendance/{hotelSlug}/roster`
- **AFTER**: `/api/staff/hotel/{hotelSlug}/attendance/shifts/`

- **BEFORE**: `/api/attendance/{hotelSlug}/clock-logs`
- **AFTER**: `/api/staff/hotel/{hotelSlug}/attendance/clock-logs/`

### 4. Roster Period Endpoints
**File**: `src/features/attendance/hooks/useRosterPeriods.js`

#### Changes Made:
- **BEFORE**: `/attendance/{hotelSlug}/periods/`
- **AFTER**: `/staff/hotel/{hotelSlug}/attendance/periods/`

### 5. Analytics Endpoints
**File**: `src/services/analytics.js`

#### Changes Made:
- **BEFORE**: `/attendance/{hotelSlug}/roster-analytics/*`
- **AFTER**: `/api/staff/hotel/{hotelSlug}/attendance/roster-analytics/*`

All analytics endpoints now use the proper staff/hotel prefix:
- KPIs endpoint
- Staff summary endpoint  
- Department summary endpoint
- Daily totals endpoint
- Weekly totals endpoint

### 6. Shift Locations Endpoints
**File**: `src/services/shiftLocations.js`

#### Changes Made:
- **BEFORE**: `/attendance/{hotelSlug}/shift-locations/`
- **AFTER**: `/staff/hotel/{hotelSlug}/attendance/shift-locations/`

All CRUD operations (GET, POST, PUT, DELETE) updated.

### 7. Roster Management Endpoints
**File**: `src/hooks/useRoster.js`

#### Changes Made:
- **BEFORE**: `/attendance/{hotelSlug}/periods/{id}/`
- **AFTER**: `/staff/hotel/{hotelSlug}/attendance/periods/{id}/`

- **BEFORE**: `/attendance/{hotelSlug}/shifts/{id}/`
- **AFTER**: `/staff/hotel/{hotelSlug}/attendance/shifts/{id}/`

- **BEFORE**: `/attendance/{hotelSlug}/shifts/bulk-save/`
- **AFTER**: `/staff/hotel/{hotelSlug}/attendance/shifts/bulk-save/`

### 8. Clock Logs Management
**Files**: Various components

#### Changes Made:
- `src/components/staff/Staff.jsx`:
  - **BEFORE**: `/attendance/clock-logs/currently-clocked-in/`
  - **AFTER**: `/staff/hotel/{hotelSlug}/attendance/clock-logs/currently-clocked-in/`

- `src/features/attendance/pages/AttendanceDashboard.jsx`:
  - **BEFORE**: `/attendance/{hotelSlug}/clock-logs/{id}/stay-clocked-in/`
  - **AFTER**: `/api/staff/hotel/{hotelSlug}/attendance/clock-logs/{id}/stay-clocked-in/`
  
  - **BEFORE**: `/attendance/{hotelSlug}/clock-logs/{id}/force-clock-out/`
  - **AFTER**: `/api/staff/hotel/{hotelSlug}/attendance/clock-logs/{id}/force-clock-out/`
  
  - **BEFORE**: `/attendance/{hotelSlug}/periods/{id}/finalize/`
  - **AFTER**: `/api/staff/hotel/{hotelSlug}/attendance/periods/{id}/finalize/`

- `src/features/attendance/components/AttendanceRowActions.jsx`:
  - **BEFORE**: `/attendance/{hotelSlug}/clock-logs/{id}/approve/`
  - **AFTER**: `/api/staff/hotel/{hotelSlug}/attendance/clock-logs/{id}/approve/`
  
  - **BEFORE**: `/attendance/{hotelSlug}/clock-logs/{id}/reject/`
  - **AFTER**: `/api/staff/hotel/{hotelSlug}/attendance/clock-logs/{id}/reject/`

## 🔄 Impact on Frontend Implementation

### Face Recognition Updates Required
Components using face recognition will need to be updated to:

1. **Provide face encoding arrays**: The enhanced API requires 128-dimensional face encoding vectors
2. **Handle consent**: Ensure explicit user consent is obtained and passed
3. **Update error handling**: New error codes and response structures
4. **Use new status checking**: Leverage `checkFaceStatus()` before attempting operations

### Example Usage Updates Needed:

#### Before (Deprecated):
```javascript
await registerFace({
  hotelSlug,
  staffId,
  imageBase64
});
```

#### After (Enhanced):
```javascript
await registerFace({
  hotelSlug,
  staffId,  
  imageBase64,
  encoding: faceEncodingArray, // Required: 128-dimensional array
  consentGiven: true           // Required: explicit consent
});
```

#### Before (Deprecated):
```javascript
await clockInWithFace({
  hotelSlug,
  imageBase64,
  locationNote
});
```

#### After (Enhanced):
```javascript
await clockInWithFace({
  hotelSlug,
  imageBase64,
  encoding: faceEncodingArray, // Required: 128-dimensional array
  locationNote,
  forceAction: "clock_in"      // Optional: force specific action
});
```

## 📋 Next Steps Required

1. **Update Face Recognition Components**: 
   - Add face encoding extraction logic
   - Implement consent collection UI
   - Update error handling for new error codes

2. **Test All Endpoints**:
   - Verify all attendance dashboard functions
   - Test face registration flow
   - Confirm analytics data loading
   - Validate roster management operations

3. **Update Documentation**:
   - Component-level documentation
   - API integration examples
   - Error handling guides

## 🚨 Breaking Changes

1. **Face Recognition**: All face recognition operations now require encoding arrays
2. **API Paths**: All attendance-related endpoints now use `/api/staff/hotel/{hotelSlug}/attendance/` prefix
3. **Parameters**: Some endpoints now require additional or differently named parameters
4. **Response Structure**: Enhanced face management endpoints return richer response data

## 🔒 Security & Privacy Enhancements

The enhanced face management system includes:
- **Cloudinary Integration**: Secure cloud storage for face images
- **Audit Trails**: Complete lifecycle logging with IP addresses
- **Consent Management**: Explicit consent required and tracked
- **Privacy Controls**: Staff can revoke face data at any time
- **Access Control**: Role-based access to face management functions

All endpoints now properly enforce authentication and hotel access permissions.
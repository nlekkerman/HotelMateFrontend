# 📊 Login Data Analysis - User Context and Storage

## Overview
This document analyzes what data is saved during login processes for both staff and guest users, and provides context for authentication, session management, and data persistence in the HotelMate Frontend system.

---

## 🏢 Staff User Login Data Storage

### Primary Storage Location
- **localStorage key**: `'user'`
- **Context**: AuthContext (`src/context/AuthContext.jsx`)
- **Login Hook**: `useLogin()` (`src/hooks/useLogin.js`)

### Staff User Data Structure
When a staff member logs in successfully, the following data is stored in localStorage:

```javascript
{
  // User Identity
  id: data.staff_id,                    // Staff ID (primary identifier)
  staff_id: data.staff_id,             // Duplicate for profile edit logic
  token: data.token,                   // Authentication token
  username: data.username,             // Staff username
  
  // Hotel Context
  hotel_id: data.hotel_id,             // Hotel database ID
  hotel_name: data.hotel_name,         // Hotel display name
  hotel_slug: data.hotel_slug,         // Hotel URL slug
  
  // Permissions & Role
  is_staff: data.is_staff,             // Staff member flag
  is_superuser: data.is_superuser,     // Superuser privileges
  access_level: data.access_level,     // Role-based access level
  isAdmin: calculated,                 // Admin flag (derived)
  
  // Department & Role Details
  department: data.department,         // Department info
  role: data.role,                     // Role details
  
  // Navigation & UI Permissions
  allowed_navs: data.allowed_navs || [],      // Allowed navigation items
  navigation_items: data.navigation_items || [], // Full navigation structure
  
  // Profile Information
  profile_image_url: profileImageUrl,  // Cloudinary profile image URL
  
  // Hotel Object (nested)
  hotel: {
    id: data.hotel_id,
    name: data.hotel_name,
    slug: data.hotel_slug,
  }
}
```

### Authentication Headers
After login, all API requests automatically include:
```javascript
// From api.js interceptor
{
  "Authorization": "Token <user_token>",
  "X-Hotel-ID": "<hotel_id>",
  "X-Hotel-Slug": "<hotel_slug>",
  "Content-Type": "application/json"
}
```

---

## 👥 Guest User Session Data

### Guest Chat Sessions
- **localStorage key**: `'hotelmate_guest_chat_session'`
- **Manager Class**: `GuestChatSession` (`src/utils/guestChatSession.js`)

### Guest Session Data Structure
```javascript
{
  // Session Identity
  session_id: string,           // Unique session identifier
  session_token: string,        // Session authentication token
  
  // Location Context
  hotel_slug: string,           // Hotel identifier
  room_number: string,          // Guest room number
  
  // Communication
  conversation_id: string,      // Chat conversation ID
  pusher_channel: string,       // Real-time messaging channel
  
  // Staff Assignment
  current_staff_handler: object, // Assigned staff member details
  
  // Guest Information
  guest_name: string,           // Guest display name
  
  // Metadata
  lastUpdated: ISO_string       // Session last update timestamp
}
```

### Guest Session Methods
```javascript
// Session lifecycle
await guestSession.initialize(pin, fcmToken);  // Create new session
await guestSession.validate();                 // Validate existing session
guestSession.clearSession();                   // Logout/clear session

// Data access
guestSession.getSessionId();
guestSession.getToken();
guestSession.getConversationId();
guestSession.getCurrentStaffHandler();
guestSession.getPusherChannel();
guestSession.getHotelSlug();
guestSession.getRoomNumber();
guestSession.getGuestName();
```

---

## 🎮 Gaming & Tournament Data

### Player Token System
- **localStorage keys**: 
  - `'tournament_player_token'` - Unique player identifier
  - `'player_name'` - Stored player name
  - `'room_number'` - Stored room number
- **Manager**: `PlayerTokenManager` (`src/utils/playerToken.js`)

### Player Data Structure
```javascript
{
  token: "player_<timestamp>_<random>",  // Unique player token
  name: string,                          // Player display name
  room: string,                          // Player room number
}
```

---

## 🔧 Additional Storage Context

### View Mode Management
- **localStorage key**: `'viewMode'`
- **Values**: `'guest'` | `'staff'`
- **Purpose**: UI mode switching for staff users

### Selected Hotel (Multi-hotel Support)
- **localStorage key**: `'selectedHotel'`
- **Purpose**: Hotel selection for users with multi-hotel access

### FCM (Push Notifications)
- **localStorage key**: `'fcm_token'`
- **Purpose**: Firebase Cloud Messaging token for notifications

### Session Storage (Temporary)
- **sessionStorage keys**:
  - `pin_ok_<roomNumber>` - Dinner PIN validation status
  - Various temporary authentication states

---

## 🔍 Authentication Context Analysis

### AuthContext State
```javascript
// Available in useAuth() hook
{
  user: object,           // Full user data object
  login: function,        // Login method
  loginAsStaff: function, // Staff-specific login
  logout: function,       // Logout and cleanup
  isStaff: boolean,       // Staff status derived from user
  viewMode: string,       // Current view mode
  setViewMode: function,  // View mode setter
  selectedHotel: object,  // Multi-hotel selection
  selectHotel: function   // Hotel selector
}
```

### Permission Detection
```javascript
// From usePermissions() hook
{
  canAccessNav: function,    // Navigation permission checker
  allowedNavs: array,        // Allowed navigation items
  isSuperUser: boolean,      // Superuser status
  accessLevel: string        // Role-based access level
}
```

---

## 🚨 Security & Data Protection

### Token Management
- **Format**: `Token <token_value>` (Django REST Framework standard)
- **Storage**: localStorage (persistent across browser sessions)
- **Automatic Inclusion**: All API requests via axios interceptor

### Session Validation
- **Staff Sessions**: Token-based authentication with backend validation
- **Guest Sessions**: PIN-based with session tokens and validation endpoints
- **Automatic Cleanup**: Invalid tokens trigger logout and data cleanup

### Data Persistence Strategy
1. **Critical Auth Data**: localStorage for persistence across browser sessions
2. **Temporary States**: sessionStorage for single-session data
3. **Real-time Context**: In-memory state management via React Context

---

## 📋 Data Flow Summary

### Staff Login Flow
1. Username/password → Backend authentication
2. Backend returns comprehensive user data + token
3. Frontend stores complete user object in localStorage
4. AuthContext loads and manages user state
5. API interceptor adds authentication headers
6. FCM token requested for notifications

### Guest Session Flow
1. Room PIN → Backend validation
2. Backend creates guest session + conversation
3. Frontend stores session data in localStorage
4. Real-time chat connection via Pusher channels
5. FCM token for guest notifications

### Logout Flow
1. Clear all localStorage user data
2. Clear sessionStorage temporary data
3. Reset AuthContext state
4. Remove FCM tokens from backend
5. Redirect to appropriate login page

---

## 🔧 Development Context

### Debug Information
- **UserDebugInfo Component**: Comprehensive debugging for auth issues
- **Console Logging**: Extensive login/session debugging in development
- **Data Inspection**: Browser dev tools for localStorage/sessionStorage analysis

### Configuration
- **API Base URL**: Dynamic based on environment (dev/prod)
- **Authentication Headers**: Automatic injection via axios interceptors
- **Error Handling**: Comprehensive error states and user feedback

This analysis covers all login-related data storage, session management, and authentication context in the HotelMate Frontend system.
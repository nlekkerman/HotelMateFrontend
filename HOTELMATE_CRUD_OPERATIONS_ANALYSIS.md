# HotelMate Frontend CRUD Operations Analysis

## Executive Summary

This document provides a comprehensive analysis of all CRUD (Create, Read, Update, Delete) operations currently implemented in the HotelMate Frontend application, identifies where they're performed, and provides recommendations for improvement and standardization.

## Current CRUD Operations Inventory

### 1. **Stock Management System**

#### Stock Items (`/src/components/stock_tracker/`)
**Location**: `src/components/stock_tracker/hooks/useStockItems.js`
- **CREATE**: `POST /stock_tracker/{hotelSlug}/items/` - Create new stock item
- **READ**: `GET /stock_tracker/{hotelSlug}/items/` - Fetch all stock items with pagination
- **UPDATE**: `PATCH /stock_tracker/{hotelSlug}/items/{itemId}/` - Update existing stock item
- **DELETE**: `DELETE /stock_tracker/{hotelSlug}/items/{itemId}/` - Delete stock item

#### Stocktakes (`/src/components/stock_tracker/hooks/useStocktakes.js`)
- **CREATE**: `POST /stock_tracker/{hotelSlug}/stocktakes/` - Create new stocktake
- **READ**: `GET /stock_tracker/{hotelSlug}/stocktakes/` - List all stocktakes
- **READ**: `GET /stock_tracker/{hotelSlug}/stocktakes/{id}/` - Fetch single stocktake with lines
- **UPDATE**: `PATCH /stock_tracker/{hotelSlug}/stocktake-lines/{lineId}/` - Update stocktake line
- **CREATE**: `POST /stock_tracker/{hotelSlug}/stocktakes/{id}/populate/` - Populate stocktake with items
- **CREATE**: `POST /stock_tracker/{hotelSlug}/stocktakes/{id}/approve/` - Approve stocktake

#### Stock Movements
- **CREATE**: `POST /stock_tracker/{hotelSlug}/movements/` - Record stock movements
- **READ**: `GET /stock_tracker/{hotelSlug}/movements/` - List stock movements

#### Sales Analytics (`/src/services/salesAnalytics.js`)
- **CREATE**: `POST /stock_tracker/{hotelSlug}/sales/` - Create individual sale
- **CREATE**: `POST /stock_tracker/{hotelSlug}/sales/bulk-create/` - Bulk create sales
- **READ**: `GET /stock_tracker/{hotelSlug}/sales/{saleId}/` - Get specific sale
- **UPDATE**: `PATCH /stock_tracker/{hotelSlug}/sales/{saleId}/` - Update sale record
- **DELETE**: `DELETE /stock_tracker/{hotelSlug}/sales/{saleId}/` - Delete sale record

### 2. **Staff Chat System**

#### Chat Conversations (`/src/staff_chat/services/staffChatApi.js`)
- **CREATE**: `POST /staff/hotel/{hotelSlug}/staff_chat/conversations/` - Create new conversation
- **READ**: `GET /staff/hotel/{hotelSlug}/staff_chat/conversations/` - Fetch conversations
- **READ**: `GET /staff/hotel/{hotelSlug}/staff_chat/conversations/{id}/messages/` - Get messages
- **CREATE**: `POST /staff/hotel/{hotelSlug}/staff_chat/conversations/{id}/messages/` - Send message
- **UPDATE**: `PATCH /staff/hotel/{hotelSlug}/staff_chat/messages/{id}/` - Edit message
- **DELETE**: `DELETE /staff/hotel/{hotelSlug}/staff_chat/messages/{id}/` - Delete message

#### Message Operations
- **CREATE**: `POST /staff/hotel/{hotelSlug}/staff_chat/messages/{id}/reactions/` - Add reaction
- **DELETE**: `DELETE /staff/hotel/{hotelSlug}/staff_chat/messages/{id}/reactions/` - Remove reaction
- **CREATE**: `POST /staff/hotel/{hotelSlug}/staff_chat/conversations/{id}/forward/` - Forward message

### 3. **Section Editor (Page Builder)**

#### Sections (`/src/services/sectionEditorApi.js`)
- **CREATE**: `POST /staff/hotel/{hotelSlug}/sections/` - Create new section
- **READ**: `GET /staff/hotel/{hotelSlug}/sections/` - List sections
- **UPDATE**: `PATCH /staff/hotel/{hotelSlug}/sections/{id}/` - Update section
- **DELETE**: `DELETE /staff/hotel/{hotelSlug}/sections/{id}/` - Delete section

#### Gallery Management
- **CREATE**: `POST /staff/hotel/{hotelSlug}/gallery-containers/` - Create gallery container
- **READ**: `GET /staff/hotel/{hotelSlug}/gallery-containers/` - List galleries
- **UPDATE**: `PATCH /staff/hotel/{hotelSlug}/gallery-containers/{id}/` - Update gallery
- **DELETE**: `DELETE /staff/hotel/{hotelSlug}/gallery-containers/{id}/` - Delete gallery
- **CREATE**: `POST /staff/hotel/{hotelSlug}/gallery-containers/{id}/images/bulk-upload/` - Upload images
- **UPDATE**: `PATCH /staff/hotel/{hotelSlug}/gallery-images/{id}/` - Update image
- **DELETE**: `DELETE /staff/hotel/{hotelSlug}/gallery-images/{id}/` - Delete image

#### List/Cards Management
- **CREATE**: `POST /staff/hotel/{hotelSlug}/list-containers/` - Create list container
- **READ**: `GET /staff/hotel/{hotelSlug}/list-containers/` - List containers
- **UPDATE**: `PATCH /staff/hotel/{hotelSlug}/list-containers/{id}/` - Update container
- **DELETE**: `DELETE /staff/hotel/{hotelSlug}/list-containers/{id}/` - Delete container
- **CREATE**: `POST /staff/hotel/{hotelSlug}/cards/` - Create card
- **UPDATE**: `PATCH /staff/hotel/{hotelSlug}/cards/{id}/` - Update card
- **DELETE**: `DELETE /staff/hotel/{hotelSlug}/cards/{id}/` - Delete card

#### News Management
- **CREATE**: `POST /staff/hotel/{hotelSlug}/news-items/` - Create news item
- **READ**: `GET /staff/hotel/{hotelSlug}/news-items/` - List news items
- **UPDATE**: `PATCH /staff/hotel/{hotelSlug}/news-items/{id}/` - Update news item
- **DELETE**: `DELETE /staff/hotel/{hotelSlug}/news-items/{id}/` - Delete news item

### 4. **Room Service Management**

#### Menu Items (`/src/components/menus/MenusManagement.jsx`)
- **CREATE**: `POST /staff/hotel/{hotelSlug}/room-service-items/` - Create menu item
- **READ**: `GET /staff/hotel/{hotelSlug}/room-service-items/` - List menu items
- **UPDATE**: `PATCH /staff/hotel/{hotelSlug}/room-service-items/{id}/` - Update menu item
- **DELETE**: `DELETE /staff/hotel/{hotelSlug}/room-service-items/{id}/` - Delete menu item

#### Order Management
- **READ**: `GET /staff/hotel/{hotelSlug}/room-service-orders/` - List orders
- **UPDATE**: `PATCH /staff/hotel/{hotelSlug}/room-service-orders/{id}/` - Update order status

### 5. **Guest Management**

#### Guest Records (`/src/components/guests/GuestEdit.jsx`)
- **READ**: `GET /guests/{hotelIdentifier}/guests/{guestId}/` - Get guest details
- **UPDATE**: `PUT /guests/{hotelIdentifier}/guests/{guestId}/` - Update guest information

### 6. **Staff Management**

#### Staff Records (`/src/services/staffApi.js`)
- **CREATE**: `POST /staff/hotel/{hotelSlug}/public-sections/` - Create section
- **READ**: `GET /staff/hotel/{hotelSlug}/public-sections/` - List sections
- **UPDATE**: `PATCH /staff/hotel/{hotelSlug}/public-sections/{id}/` - Update section
- **DELETE**: `DELETE /staff/hotel/{hotelSlug}/public-sections/{id}/` - Delete section

#### Shift Locations (`/src/services/shiftLocations.js`)
- **CREATE**: `POST /staff/hotel/{hotelSlug}/attendance/shift-locations/` - Create shift location
- **READ**: `GET /staff/hotel/{hotelSlug}/attendance/shift-locations/` - List locations
- **UPDATE**: `PUT /staff/hotel/{hotelSlug}/attendance/shift-locations/{id}/` - Update location
- **DELETE**: `DELETE /staff/hotel/{hotelSlug}/attendance/shift-locations/{id}/` - Delete location

### 7. **Room Operations**

#### Room Status Management (`/src/services/roomOperations.js`)
- **UPDATE**: `POST /staff/hotel/{hotelSlug}/housekeeping/rooms/{roomId}/status/` - Update room status
- **READ**: `GET /staff/hotel/{hotelSlug}/housekeeping/rooms/{roomId}/status-history/` - Get status history

#### Turnover Workflow Operations
- **CREATE**: `POST /staff/hotel/{hotelSlug}/rooms/{roomNumber}/start-cleaning/` - Start cleaning
- **CREATE**: `POST /staff/hotel/{hotelSlug}/rooms/{roomNumber}/mark-cleaned/` - Mark cleaned
- **CREATE**: `POST /staff/hotel/{hotelSlug}/rooms/{roomNumber}/inspect/` - Inspect room
- **CREATE**: `POST /staff/hotel/{hotelSlug}/rooms/{roomNumber}/mark-maintenance/` - Mark maintenance
- **CREATE**: `POST /staff/hotel/{hotelSlug}/rooms/{roomNumber}/complete-maintenance/` - Complete maintenance

#### Guest Operations
- **CREATE**: `POST /staff/hotel/{hotelSlug}/rooms/checkin/` - Check in guest
- **CREATE**: `POST /staff/hotel/{hotelSlug}/rooms/checkout/` - Check out guest

### 8. **Booking Management**

#### Room Bookings (`/src/services/api.js`)
- **CREATE**: `POST /guest/hotels/{hotelSlug}/booking/` - Create booking (guest)
- **READ**: `GET /staff/hotel/{hotelSlug}/room-bookings/` - List bookings (staff)
- **UPDATE**: `POST /staff/hotel/{hotelSlug}/room-bookings/{id}/approve/` - Approve booking
- **UPDATE**: `POST /staff/hotel/{hotelSlug}/room-bookings/{id}/decline/` - Decline booking
- **UPDATE**: `POST /staff/hotel/{hotelSlug}/room-bookings/{id}/check-in/` - Check in booking

#### Hotel Settings
- **READ**: `GET /public/hotels/{hotelSlug}/settings/` - Get public settings
- **UPDATE**: `PATCH /staff/hotel/{hotelSlug}/settings/` - Update hotel settings

#### Cancellation Policies
- **READ**: `GET /staff/hotel/{hotelSlug}/cancellation-policies/` - List policies
- **CREATE**: `POST /staff/hotel/{hotelSlug}/cancellation-policies/` - Create policy
- **UPDATE**: `PATCH /staff/hotel/{hotelSlug}/cancellation-policies/{id}/` - Update policy

### 9. **Entertainment/Games**

#### Memory Game (`/src/services/memoryGameAPI.js`)
- **READ**: `GET /entertainment/memory-cards/for-game/` - Get game cards
- **CREATE**: `POST /entertainment/memory-sessions/practice/` - Create practice session
- **CREATE**: `POST /entertainment/memory-sessions/` - Create game session
- **READ**: `GET /entertainment/memory-sessions/my-stats/` - Get player stats
- **READ**: `GET /entertainment/memory-sessions/leaderboard/` - Get leaderboard

#### Quiz Game (`/src/services/quizGameAPI.js`)
- **READ**: `GET /entertainment/quiz-questions/` - Get quiz questions
- **CREATE**: `POST /entertainment/quiz-sessions/` - Create quiz session
- **READ**: `GET /entertainment/quiz-sessions/{id}/` - Get session details

### 10. **Room Conversations**

#### Guest Chat (`/src/services/roomConversationsAPI.js`)
- **READ**: `GET /staff/hotel/{hotelSlug}/chat/conversations/` - List conversations
- **READ**: `GET /staff/hotel/{hotelSlug}/chat/conversations/{id}/messages/` - Get messages
- **CREATE**: `POST /staff/hotel/{hotelSlug}/chat/conversations/{id}/messages/` - Send message
- **CREATE**: `POST /staff/hotel/{hotelSlug}/chat/conversations/{id}/mark-read/` - Mark as read

#### Guest Chat (Guest API) (`/src/services/guestChatAPI.js`)
- **READ**: `GET /guest/hotel/{hotelSlug}/chat/context` - Get chat context
- **READ**: `GET /guest/hotel/{hotelSlug}/chat/messages` - Get messages
- **CREATE**: `POST /guest/hotel/{hotelSlug}/chat/messages` - Send message

## Current Architecture Patterns

### 1. **API Client Configuration**
- **Main API**: Uses Axios with base URL from environment variables
- **Public API**: Separate instance for public endpoints
- **Guest API**: Dedicated instance for guest-facing operations
- **Authentication**: JWT tokens in headers via interceptors

### 2. **URL Building Patterns**
- **Staff URLs**: `buildStaffURL(hotelSlug, app, path)` → `/staff/hotel/{hotelSlug}/{app}/{path}`
- **Guest URLs**: `buildGuestURL(hotelSlug, path)` → `/guest/hotels/{hotelSlug}/{path}`
- **Public URLs**: Direct pattern → `/public/hotels/{hotelSlug}/{path}`

### 3. **Service Layer Organization**
- **Dedicated service files** for major features (stockAnalytics, salesAnalytics, etc.)
- **Hooks pattern** for React integration (useStockItems, useStocktakes)
- **Centralized API client** with consistent error handling

### 4. **Error Handling**
- **Try-catch blocks** in service functions
- **Console logging** for debugging
- **Error state management** in React hooks
- **Toast notifications** for user feedback

## Identified Issues and Areas for Improvement

### 1. **Inconsistent URL Patterns**
**Problem**: Multiple URL building approaches across different services
```javascript
// Inconsistent patterns found:
`/stock_tracker/${hotelSlug}/items/`           // Direct string interpolation
buildStaffURL(hotelSlug, 'staff_chat', path)   // Helper function
`/guests/${hotelIdentifier}/guests/${guestId}/` // Legacy pattern
```

**Recommendation**: Standardize all URL building using helper functions

### 2. **Missing CRUD Operations**

#### **High Priority Missing Operations**:
1. **Staff Management**
   - CREATE: Add new staff members
   - UPDATE: Edit staff profiles and permissions
   - DELETE: Remove staff members

2. **Guest Management** 
   - CREATE: Add new guests manually
   - DELETE: Remove guest records

3. **Room Inventory Management**
   - CREATE: Add new rooms
   - UPDATE: Edit room details
   - DELETE: Remove rooms

4. **Booking Modifications**
   - UPDATE: Modify existing booking details
   - UPDATE: Change booking dates/guests

#### **Medium Priority Missing Operations**:
1. **Menu Category Management**
   - Full CRUD for menu categories
   - Reordering and organization

2. **Hotel Configuration**
   - CREATE/UPDATE/DELETE: Room types
   - CREATE/UPDATE/DELETE: Service offerings
   - CREATE/UPDATE/DELETE: Leisure activities

3. **Inventory Categories**
   - CREATE/UPDATE/DELETE: Stock categories
   - Category hierarchy management

### 3. **Inconsistent Error Handling**
**Problem**: Different error handling patterns across services
```javascript
// Pattern 1: Simple throw
throw error;

// Pattern 2: Enhanced error with context
console.error('❌ Error creating sale:', error);
throw error;

// Pattern 3: Custom error messages
const message = data.detail || data.message || 'Operation failed';
toast.error(message);
```

**Recommendation**: Implement centralized error handling service

### 4. **Limited Bulk Operations**
**Current**: Only bulk operations are in sales analytics and some stock operations
**Missing**: 
- Bulk staff operations
- Bulk guest operations  
- Bulk room status updates
- Bulk booking operations

### 5. **Inconsistent Response Handling**
**Problem**: Different response unwrapping patterns
```javascript
// Pattern 1: Direct data access
response.data

// Pattern 2: Unwrapping helper
const unwrap = (res) => res?.data?.data ?? res?.data;

// Pattern 3: Manual checking  
response.data.results || response.data
```

## Recommended Improvements

### 1. **Standardize URL Building**
Create a centralized URL builder service:

```javascript
// src/services/urlBuilder.js
export const buildAPIURL = (type, hotelSlug, app, path = '') => {
  switch (type) {
    case 'staff':
      return `/staff/hotel/${hotelSlug}/${app}/${path}`;
    case 'guest':
      return `/guest/hotels/${hotelSlug}/${path}`;
    case 'public':
      return `/public/hotels/${hotelSlug}/${path}`;
    default:
      throw new Error(`Unknown URL type: ${type}`);
  }
};
```

### 2. **Implement Missing CRUD Operations**

#### **Staff Management API Service**
```javascript
// src/services/staffManagement.js
export const staffService = {
  // CREATE
  createStaff: (hotelSlug, staffData) => 
    api.post(buildStaffURL(hotelSlug, 'staff', '/'), staffData),
  
  // READ  
  listStaff: (hotelSlug, filters = {}) =>
    api.get(buildStaffURL(hotelSlug, 'staff', '/'), { params: filters }),
    
  getStaff: (hotelSlug, staffId) =>
    api.get(buildStaffURL(hotelSlug, 'staff', `/${staffId}/`)),
  
  // UPDATE
  updateStaff: (hotelSlug, staffId, staffData) =>
    api.patch(buildStaffURL(hotelSlug, 'staff', `/${staffId}/`), staffData),
  
  // DELETE
  deleteStaff: (hotelSlug, staffId) =>
    api.delete(buildStaffURL(hotelSlug, 'staff', `/${staffId}/`))
};
```

#### **Room Inventory Management**
```javascript
// src/services/roomInventory.js  
export const roomInventoryService = {
  // CREATE
  createRoom: (hotelSlug, roomData) =>
    api.post(buildStaffURL(hotelSlug, 'rooms', '/'), roomData),
    
  // READ
  listRooms: (hotelSlug, filters = {}) =>
    api.get(buildStaffURL(hotelSlug, 'rooms', '/'), { params: filters }),
    
  getRoom: (hotelSlug, roomId) =>
    api.get(buildStaffURL(hotelSlug, 'rooms', `/${roomId}/`)),
  
  // UPDATE
  updateRoom: (hotelSlug, roomId, roomData) =>
    api.patch(buildStaffURL(hotelSlug, 'rooms', `/${roomId}/`), roomData),
  
  // DELETE
  deleteRoom: (hotelSlug, roomId) =>
    api.delete(buildStaffURL(hotelSlug, 'rooms', `/${roomId}/`)),
    
  // Special operations
  generateGuestPin: (hotelSlug, roomId) =>
    api.post(buildStaffURL(hotelSlug, 'rooms', `/${roomId}/generate-pin/`)),
    
  generateQRCode: (hotelSlug, roomId, qrType) =>
    api.post(buildStaffURL(hotelSlug, 'rooms', `/${roomId}/generate-qr/`), { type: qrType })
};
```

### 3. **Centralized Error Handling Service**
```javascript
// src/services/errorHandler.js
export class APIError extends Error {
  constructor(message, statusCode, details = null) {
    super(message);
    this.name = 'APIError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const handleAPIError = (error, context = '') => {
  const status = error.response?.status;
  const data = error.response?.data;
  
  let message = 'An unexpected error occurred';
  
  if (status === 400) {
    message = data?.detail || data?.message || 'Invalid request';
  } else if (status === 401) {
    message = 'Authentication required';
  } else if (status === 403) {
    message = 'Access denied';
  } else if (status === 404) {
    message = 'Resource not found';
  } else if (status === 500) {
    message = 'Server error';
  }
  
  console.error(`❌ ${context} Error:`, { status, message, details: data });
  
  return new APIError(message, status, data);
};
```

### 4. **Implement Bulk Operations Service**
```javascript
// src/services/bulkOperations.js
export const bulkOperationsService = {
  // Bulk staff operations
  bulkUpdateStaff: (hotelSlug, staffUpdates) =>
    api.patch(buildStaffURL(hotelSlug, 'staff', '/bulk-update/'), { updates: staffUpdates }),
    
  bulkDeleteStaff: (hotelSlug, staffIds) =>
    api.delete(buildStaffURL(hotelSlug, 'staff', '/bulk-delete/'), { data: { ids: staffIds } }),
  
  // Bulk room operations
  bulkUpdateRoomStatus: (hotelSlug, roomUpdates) =>
    api.patch(buildStaffURL(hotelSlug, 'rooms', '/bulk-status/'), { updates: roomUpdates }),
  
  // Bulk booking operations
  bulkBookingAction: (hotelSlug, bookingIds, action) =>
    api.post(buildStaffURL(hotelSlug, 'bookings', '/bulk-action/'), { ids: bookingIds, action })
};
```

### 5. **Standardized Response Handler**
```javascript
// src/services/responseHandler.js
export const unwrapResponse = (response) => {
  // Handle different response patterns
  if (response?.data?.data) {
    return response.data.data;
  }
  
  if (response?.data?.results) {
    return {
      results: response.data.results,
      count: response.data.count,
      next: response.data.next,
      previous: response.data.previous
    };
  }
  
  return response?.data || response;
};

export const extractErrorMessage = (error) => {
  const data = error.response?.data;
  
  if (typeof data === 'string') return data;
  if (data?.detail) return data.detail;
  if (data?.message) return data.message;
  if (data?.error) return data.error;
  
  return 'An unexpected error occurred';
};
```

### 6. **Enhanced Service Layer Pattern**
```javascript
// src/services/baseService.js
export class BaseService {
  constructor(baseURL, hotelSlug) {
    this.baseURL = baseURL;
    this.hotelSlug = hotelSlug;
  }
  
  async create(data) {
    try {
      const response = await api.post(this.baseURL, data);
      return unwrapResponse(response);
    } catch (error) {
      throw handleAPIError(error, 'Create');
    }
  }
  
  async list(params = {}) {
    try {
      const response = await api.get(this.baseURL, { params });
      return unwrapResponse(response);
    } catch (error) {
      throw handleAPIError(error, 'List');
    }
  }
  
  async get(id) {
    try {
      const response = await api.get(`${this.baseURL}${id}/`);
      return unwrapResponse(response);
    } catch (error) {
      throw handleAPIError(error, 'Get');
    }
  }
  
  async update(id, data) {
    try {
      const response = await api.patch(`${this.baseURL}${id}/`, data);
      return unwrapResponse(response);
    } catch (error) {
      throw handleAPIError(error, 'Update');
    }
  }
  
  async delete(id) {
    try {
      const response = await api.delete(`${this.baseURL}${id}/`);
      return unwrapResponse(response);
    } catch (error) {
      throw handleAPIError(error, 'Delete');
    }
  }
}
```

## Implementation Priority Matrix

### **Phase 1: Critical Missing CRUD (Immediate - 2-3 weeks)**
1. **Staff Management CRUD** - Essential for hotel operations
2. **Room Inventory CRUD** - Core hotel functionality
3. **Standardized Error Handling** - Improves user experience

### **Phase 2: Enhanced Operations (Short-term - 4-6 weeks)**
1. **Bulk Operations Implementation** - Efficiency improvements
2. **URL Building Standardization** - Technical debt reduction
3. **Response Handler Standardization** - Code consistency

### **Phase 3: Advanced Features (Medium-term - 8-10 weeks)**
1. **Guest Management Enhancement** - Complete guest lifecycle
2. **Booking Modification System** - Advanced booking operations
3. **Menu/Category Management** - Content management improvements

### **Phase 4: Optimization (Long-term - 12+ weeks)**
1. **Caching Layer Implementation** - Performance optimization
2. **Real-time CRUD Synchronization** - Enhanced real-time features
3. **API Documentation Generation** - Developer experience

## Conclusion

The HotelMate Frontend application has a solid foundation of CRUD operations across major domains (stock management, chat, page building, room operations). However, there are significant gaps in core hotel management areas like staff management, room inventory, and guest operations.

The recommended improvements focus on:
1. **Standardization** of existing patterns
2. **Completion** of missing CRUD operations  
3. **Enhancement** of error handling and user experience
4. **Optimization** for scalability and maintainability

Implementing these recommendations will create a more robust, consistent, and feature-complete hotel management system.
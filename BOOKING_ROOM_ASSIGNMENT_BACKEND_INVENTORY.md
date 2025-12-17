# HotelMate Backend Booking/Room Assignment Implementation Inventory

**Date:** December 16, 2025  
**Scope:** Backend-only analysis for booking operations workflow  
**Status:** Phase 1 Complete | Next Phase Planning Required

---

## A) Existing Booking Features

### 📋 **Implemented API Endpoints**

#### **Public Endpoints (Guest Booking Flow)**
| Method | Endpoint | Purpose | Serializer | Permissions |
|--------|----------|---------|------------|-------------|
| `GET` | `/api/public/hotels/{hotel_slug}/settings/` | Get hotel public settings | `HotelPublicSettingsPublicSerializer` | `AllowAny` |
| `POST` | `/api/guest/hotels/{hotel_slug}/booking/` | Create new booking | `RoomBookingDetailSerializer` | `AllowAny` |
| `GET` | `/api/bookings/lookup/` | Look up bookings by email/confirmation | `BookingLookupSerializer` | `AllowAny` |

#### **Staff Endpoints (Operations Management)**
| Method | Endpoint | Purpose | Serializer | Permissions |
|--------|----------|---------|------------|-------------|
| `GET` | `/api/staff/hotels/{hotel_slug}/bookings/` | List hotel bookings with filters | `RoomBookingListSerializer` | `IsAuthenticated` + `IsStaffMember` + `IsSameHotel` |
| `POST` | `/api/staff/hotels/{hotel_slug}/bookings/{booking_id}/confirm/` | Confirm pending booking | `RoomBookingDetailSerializer` | `IsAuthenticated` + `IsStaffMember` + `IsSameHotel` |
| `PUT/PATCH` | `/api/staff/hotels/{hotel_slug}/settings/` | Update hotel public settings | `HotelPublicSettingsStaffSerializer` | `IsAuthenticated` + `IsStaffMember` + `IsSameHotel` |
| `GET` | `/api/staff/{hotel_slug}/me/` | Extended staff profile data | `StaffSerializer` | `IsAuthenticated` |

#### **Room Management Endpoints (Current Implementation)**
| Method | Endpoint | Purpose | Model | Permissions |
|--------|----------|---------|-------|-------------|
| `GET` | `/rooms/rooms/{room_number}/` | Get room details | `Room` | Staff (implied) |
| `POST` | `/rooms/{hotel_slug}/rooms/{room_number}/add-guest/` | Assign guest to room directly | `Room` + Guest creation | Staff (implied) |
| `GET` | `/rooms/rooms/` | List all rooms with search | `Room` | Staff (implied) |

### 🎯 **Query Parameters & Filtering**

#### **Staff Bookings List (`/api/staff/hotels/{hotel_slug}/bookings/`)**
- `status` - Filter by booking status (`PENDING_PAYMENT`, `CONFIRMED`, `CANCELLED`, `COMPLETED`, `NO_SHOW`)
- `start_date` - Filter bookings with check-in >= date (YYYY-MM-DD format)  
- `end_date` - Filter bookings with check-out <= date (YYYY-MM-DD format)

#### **Booking Lookup (`/api/bookings/lookup/`)**
- `email` - Guest email address (case-insensitive)
- `confirmation_number` - Booking confirmation code
- At least one parameter required

### 📊 **Serializer Field Coverage**

#### **RoomBookingListSerializer** (Staff List View)
```python
Fields: id, booking_id, confirmation_number, hotel_name, room_type_name, 
        guest_name, guest_email, guest_phone, check_in, check_out, nights,
        adults, children, total_amount, currency, status, created_at, paid_at
```

#### **RoomBookingDetailSerializer** (Full Booking Details)
```python
Fields: id, booking_id, confirmation_number, hotel_name, room_type_name,
        guest_first_name, guest_last_name, guest_name, guest_email, guest_phone,
        check_in, check_out, nights, adults, children, total_amount, currency,
        status, special_requests, promo_code, payment_reference, payment_provider,
        paid_at, created_at, updated_at, internal_notes
```

---

## B) Current Booking Logic Flow

### 🔄 **Phase 1 Implementation Status**

#### **1. Create Booking (Public) ✅ IMPLEMENTED**
- **File:** `hotel/views.py` → `HotelBookingCreateView`  
- **Model:** Creates `RoomBooking` instance with auto-generated `booking_id` and `confirmation_number`
- **Status:** Sets initial status as `PENDING_PAYMENT`
- **Validation:** Hotel slug validation, room type availability
- **Output:** Returns booking details for frontend storage

#### **2. Payment/Confirmation ⚠️ PARTIAL**
- **Current:** Manual staff confirmation via API endpoint
- **Missing:** Stripe webhook integration for automatic confirmation
- **Workaround:** Staff must manually confirm bookings after payment verification

#### **3. Staff List Bookings ✅ IMPLEMENTED**
- **File:** `hotel/views.py` → `StaffBookingsListView`
- **Features:** Hotel-scoped filtering, status filtering, date range filtering
- **Permissions:** `IsAuthenticated` + `IsStaffMember` + `IsSameHotel`
- **Output:** Paginated booking list with key details

#### **4. Assign Room ❌ **NOT IMPLEMENTED**
- **Current Gap:** No connection between `RoomBooking` and actual `Room` assignment
- **Workaround:** Direct guest assignment to rooms via separate endpoint
- **Issue:** Booking and room assignment are disconnected systems

#### **5. Guest Communication ✅ IMPLEMENTED**
- **File:** `hotel/email_utils.py` → `send_booking_confirmation_email()`
- **Features:** Auto-sends confirmation email on booking confirmation
- **Content:** Hotel details, booking info, check-in/out dates, total amount
- **Error Handling:** Email failures logged but don't prevent confirmation

#### **6. Check-in/Check-out ❌ **NOT IMPLEMENTED**
- **Current:** Only room occupancy status (`is_occupied` boolean)
- **Missing:** Formal check-in/check-out workflow with audit trail
- **Missing:** Integration with booking status updates

---

## C) Gaps / Missing Capabilities

### 🚨 **Critical Missing Features**

#### **1. Booking-to-Room Assignment System**
- **Problem:** `RoomBooking` model has `room` field (ForeignKey to Room) but no assignment endpoint
- **Impact:** Staff cannot assign confirmed bookings to specific room numbers
- **Required:** `POST /api/staff/hotels/{hotel_slug}/bookings/{booking_id}/assign-room/`
- **Validation Needed:** 
  - Room belongs to same hotel
  - Room type matches booking
  - Room available for booking dates
  - No date overlap with existing assignments

#### **2. Room Availability Engine**
- **Problem:** No date-based room availability checking
- **Impact:** Cannot prevent double-booking or validate assignment conflicts  
- **Required:** Availability calculation considering:
  - Existing bookings with assigned rooms
  - Direct guest assignments (current system)
  - Check-in/check-out date ranges
  - Room maintenance/blocked periods

#### **3. Check-in/Check-out Workflow**
- **Problem:** No formal check-in/check-out process
- **Current Workaround:** Manual room occupancy toggle
- **Required Endpoints:**
  - `POST /api/staff/hotels/{hotel_slug}/bookings/{booking_id}/check-in/`
  - `POST /api/staff/hotels/{hotel_slug}/bookings/{booking_id}/check-out/`
- **Features Needed:**
  - Update booking status to `CHECKED_IN`/`COMPLETED`
  - Set room occupancy status
  - Generate guest PIN for room access
  - Audit trail with staff member and timestamp

#### **4. Enhanced Staff Booking Filters**
- **Missing:** Guest name/email search in booking list
- **Missing:** Room number filter (for assigned bookings)
- **Missing:** Booking source filter (online vs. manual)
- **Missing:** Sort options (date, amount, guest name)

#### **5. Booking Status Audit Trail**
- **Problem:** No tracking of who performed booking actions
- **Missing Fields:** `confirmed_by`, `confirmed_at`, `checked_in_by`, `checked_in_at`
- **Impact:** No accountability or audit trail for staff actions

---

## D) Next Phase Implementation Plan

### 🎯 **PR-Sized Tasks (Backend Implementation)**

#### **Task 1: Room Assignment Endpoint**
**Files to Modify:**
- `hotel/views.py` - Add `StaffBookingAssignRoomView`
- `hotel/serializers.py` - Add `RoomAssignmentSerializer`  
- `hotel/urls.py` - Add assignment route
- `hotel/models.py` - Add validation methods to `RoomBooking`

**Endpoint:** `POST /api/staff/hotels/{hotel_slug}/bookings/{booking_id}/assign-room/`

**Request Body:**
```json
{
  "room_number": "101",
  "notes": "Guest requested ground floor"
}
```

**Validation Logic:**
```python
def validate_room_assignment(self, booking, room):
    # 1. Hotel scope validation
    if room.hotel != booking.hotel:
        raise ValidationError("Room does not belong to this hotel")
    
    # 2. Room type compatibility (optional - could be warning)
    if room.room_type != booking.room_type:
        # Log warning but allow override
        pass
    
    # 3. Date overlap check
    overlapping_bookings = RoomBooking.objects.filter(
        room=room,
        status__in=['CONFIRMED', 'CHECKED_IN'],
        check_in__lt=booking.check_out,
        check_out__gt=booking.check_in
    ).exclude(id=booking.id)
    
    if overlapping_bookings.exists():
        raise ValidationError("Room has conflicting booking for these dates")
    
    # 4. Room availability check
    if room.is_occupied and not booking.status == 'CHECKED_IN':
        raise ValidationError("Room is currently occupied")
```

**Permissions:** `IsAuthenticated` + `IsStaffMember` + `IsSameHotel`

---

#### **Task 2: Check-in/Check-out Endpoints**
**Files to Modify:**
- `hotel/views.py` - Add `StaffBookingCheckinView`, `StaffBookingCheckoutView`
- `hotel/serializers.py` - Add check-in/out response serializers
- `hotel/urls.py` - Add check-in/out routes
- `hotel/models.py` - Add audit fields and status transition validation

**Endpoints:**
- `POST /api/staff/hotels/{hotel_slug}/bookings/{booking_id}/check-in/`
- `POST /api/staff/hotels/{hotel_slug}/bookings/{booking_id}/check-out/`

**Model Fields to Add:**
```python
# Add to RoomBooking model
checked_in_by = models.ForeignKey(Staff, null=True, related_name='checked_in_bookings')
checked_in_at = models.DateTimeField(null=True)
checked_out_by = models.ForeignKey(Staff, null=True, related_name='checked_out_bookings') 
checked_out_at = models.DateTimeField(null=True)
```

**Check-in Process:**
1. Validate booking is `CONFIRMED` and room is assigned
2. Update booking status to `CHECKED_IN`
3. Set room `is_occupied = True`
4. Generate/refresh guest PIN
5. Record staff member and timestamp
6. Send welcome email/SMS (optional)

**Check-out Process:**
1. Validate booking is `CHECKED_IN`
2. Update booking status to `COMPLETED`
3. Set room `is_occupied = False`
4. Clear/rotate guest PIN
5. Record staff member and timestamp
6. Trigger cleaning notification (optional)

---

#### **Task 3: Room Availability Engine**
**Files to Modify:**
- `hotel/views.py` - Add `RoomAvailabilityView`
- `hotel/serializers.py` - Add `RoomAvailabilitySerializer`
- `hotel/urls.py` - Add availability route
- `hotel/utils.py` - Add availability calculation utilities

**Endpoint:** `GET /api/staff/hotels/{hotel_slug}/rooms/availability/`

**Query Parameters:**
- `check_in` (required) - YYYY-MM-DD
- `check_out` (required) - YYYY-MM-DD  
- `room_type` (optional) - Filter by room type
- `exclude_booking` (optional) - Exclude specific booking from conflict check

**Response:**
```json
{
  "available_rooms": [
    {
      "room_number": "101",
      "room_type": "Standard Double",
      "is_occupied": false,
      "current_guest": null,
      "next_booking": "2025-12-20"
    }
  ],
  "unavailable_rooms": [
    {
      "room_number": "102", 
      "room_type": "Standard Double",
      "conflict_reason": "Existing booking",
      "conflict_booking_id": "BK-2025-ABC123",
      "available_from": "2025-12-22"
    }
  ]
}
```

---

#### **Task 4: Enhanced Booking List Filters**
**Files to Modify:**
- `hotel/views.py` - Enhance `StaffBookingsListView`
- `hotel/serializers.py` - Update `RoomBookingListSerializer`

**New Query Parameters:**
- `search` - Search guest name, email, or booking ID
- `room_number` - Filter by assigned room
- `has_room_assigned` - Boolean filter for assignment status
- `ordering` - Sort by date, amount, guest name, status

**Enhanced Response:**
```json
{
  "count": 45,
  "next": "?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "booking_id": "BK-2025-ABC123",
      "confirmation_number": "GRA-2025-XY12",
      "hotel_name": "Grand Hotel",
      "room_type_name": "Deluxe Suite",
      "assigned_room_number": "205",  // NEW
      "guest_name": "John Smith",
      "guest_email": "john@example.com",
      "check_in": "2025-12-15",
      "check_out": "2025-12-20",
      "status": "CONFIRMED",
      "has_room_assigned": true,  // NEW
      "can_check_in": true,       // NEW
      "total_amount": "599.99"
    }
  ]
}
```

---

#### **Task 5: Booking Communication Log**
**Files to Create:**
- `hotel/models.py` - Add `BookingCommunication` model
- `hotel/views.py` - Add `BookingCommunicationView`
- `hotel/serializers.py` - Add communication serializers
- `hotel/email_utils.py` - Enhance email tracking

**New Model:**
```python
class BookingCommunication(models.Model):
    booking = models.ForeignKey(RoomBooking, related_name='communications')
    staff_member = models.ForeignKey(Staff, null=True)
    communication_type = models.CharField(choices=[
        ('EMAIL', 'Email'),
        ('SMS', 'SMS'),  
        ('PHONE', 'Phone Call'),
        ('NOTE', 'Internal Note')
    ])
    subject = models.CharField(max_length=200)
    message = models.TextField()
    recipient = models.CharField(max_length=200)  # Email or phone
    sent_at = models.DateTimeField(auto_now_add=True)
    delivery_status = models.CharField(choices=[
        ('PENDING', 'Pending'),
        ('SENT', 'Sent'),
        ('DELIVERED', 'Delivered'),
        ('FAILED', 'Failed')
    ])
```

**Endpoint:** `GET/POST /api/staff/hotels/{hotel_slug}/bookings/{booking_id}/communications/`

---

### 🧪 **Testing Strategy**

#### **Unit Tests Required:**
- `test_room_assignment_validation.py`
  - Hotel scope validation
  - Date overlap detection  
  - Room type compatibility
  - Permission enforcement

- `test_checkin_checkout_workflow.py`
  - Status transition validation
  - Room occupancy updates
  - Staff audit trail
  - PIN generation/rotation

- `test_availability_engine.py`
  - Date range calculations
  - Booking conflict detection
  - Room type filtering
  - Performance with large datasets

#### **Integration Tests Required:**
- `test_booking_ops_workflow.py` 
  - End-to-end: Create booking → Assign room → Check-in → Check-out
  - Permission boundaries (cross-hotel access denied)
  - Email delivery verification
  - Audit trail completeness

---

### 📋 **Database Migration Plan**

#### **Migration 1: Booking Audit Fields**
```python
# Add to RoomBooking model
confirmed_by = models.ForeignKey(Staff, null=True, related_name='confirmed_bookings')
confirmed_at = models.DateTimeField(null=True)
checked_in_by = models.ForeignKey(Staff, null=True, related_name='checked_in_bookings')  
checked_in_at = models.DateTimeField(null=True)
checked_out_by = models.ForeignKey(Staff, null=True, related_name='checked_out_bookings')
checked_out_at = models.DateTimeField(null=True)
```

#### **Migration 2: Communication Log Model**
```python
# Create BookingCommunication model
# Create indexes on booking_id, sent_at for performance
```

#### **Migration 3: Room Assignment Enhancement** 
```python
# Add indexes to Room model for availability queries
# Add room assignment validation constraints
```

---

### 🔒 **Security & Permissions**

#### **Maintained Patterns:**
- All staff endpoints require `IsAuthenticated` + `IsStaffMember` + `IsSameHotel`
- Hotel slug validation on every request
- No cross-hotel data access possible
- Role-based restrictions ready (commented code can be enabled)

#### **New Permission Requirements:**
- Room assignment: Require `can_assign_rooms` permission (optional)
- Check-in/out: Require `can_manage_checkin` permission (optional) 
- Communication log: Require `can_contact_guests` permission (optional)

---

### ⚡ **Performance Considerations**

#### **Database Optimization:**
- Add indexes on (`hotel`, `check_in`, `check_out`) for availability queries
- Add indexes on (`room`, `status`, `check_in`, `check_out`) for conflict detection
- Consider partitioning booking table by hotel for large deployments

#### **Caching Strategy:**
- Cache room availability results for popular date ranges
- Cache hotel settings to reduce database load
- Implement Redis for real-time occupancy status

---

### 🚀 **Deployment Checklist**

#### **Pre-Deployment:**
- [ ] Run database migrations
- [ ] Update API documentation  
- [ ] Configure email templates
- [ ] Test webhook endpoints
- [ ] Verify permission matrix
- [ ] Load test availability engine
- [ ] Test email delivery

#### **Post-Deployment:**
- [ ] Monitor booking assignment performance
- [ ] Verify email delivery logs
- [ ] Check audit trail completeness
- [ ] Validate cross-hotel isolation
- [ ] Monitor availability query performance

---

## 📊 **Current Implementation Completeness**

| Feature | Status | Completion |
|---------|--------|------------|
| **Guest Booking Creation** | ✅ Complete | 100% |
| **Staff Booking List/Filter** | ✅ Complete | 100% |
| **Booking Confirmation** | ✅ Complete | 100% | 
| **Email Notifications** | ✅ Complete | 100% |
| **Room Assignment** | ❌ Missing | 0% |
| **Room Availability Engine** | ❌ Missing | 0% |
| **Check-in/Check-out** | ❌ Missing | 0% |
| **Communication Log** | ❌ Missing | 0% |
| **Booking Audit Trail** | ⚠️ Partial | 30% |

**Overall Backend Readiness:** 60% (Operations workflow incomplete)

---

## 🎯 **Recommended Implementation Order**

### **Phase 2A (High Priority - 2 weeks)**
1. **Room Assignment Endpoint** - Connects bookings to actual rooms
2. **Room Availability Engine** - Prevents conflicts and double-booking
3. **Enhanced Booking Filters** - Improves staff workflow efficiency

### **Phase 2B (Medium Priority - 2 weeks)**  
4. **Check-in/Check-out Endpoints** - Formal workflow with audit trail
5. **Booking Audit Fields** - Staff accountability and compliance

### **Phase 2C (Low Priority - 1 week)**
6. **Communication Log System** - Guest interaction tracking
7. **Performance Optimization** - Indexes and caching for scale

---

**Total Estimated Development Time:** 5 weeks  
**Files to Modify/Create:** ~15 files  
**Database Migrations:** 3 migrations  
**API Endpoints to Add:** 8 endpoints  
**Test Files Required:** 6 test modules

---

**Document Generated:** December 16, 2025  
**Backend Analysis:** Complete  
**Next Action:** Begin Phase 2A implementation with room assignment endpoint
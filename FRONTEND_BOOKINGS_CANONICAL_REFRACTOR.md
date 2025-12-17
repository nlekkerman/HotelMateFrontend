# SOURCE OF TRUTH — FRONTEND STAFF BOOKINGS

This document is the single authoritative specification for the
staff booking system frontend.

If implementation code conflicts with this document,
THE DOCUMENT WINS.

No legacy behavior, routes, hooks, or components are allowed
outside what is defined here.

Backend behavior is read-only and must not be changed.

---

# Frontend Booking System Canonical Refactor Plan

## Overview

Consolidate duplicated staff booking systems into a single canonical implementation:
- **Keep**: System 1's BookingManagementPage.jsx as the only staff bookings page
- **Upgrade**: System 1 with System 2's advanced modal, TanStack Query, and booking operations
- **Remove**: System 2 completely (StaffBookingsPage.jsx and related files)
- **Route**: Ensure http://localhost:5173/staff/hotel/hotel-killarney/bookings works with new logic

## Hard Stop Rules (Non-Negotiable)

- Do NOT recreate, reference, or partially reuse System 2.
- Do NOT introduce compatibility layers or adapters.
- Do NOT keep commented legacy code.
- If a file is listed under "Files Deleted", it must not exist.
- If unsure, follow this document over existing code.

## Target Architecture

### Final File Structure
```
✅ KEEP & UPGRADE:
- src/pages/staff/BookingManagementPage.jsx (enhanced with TanStack Query)
- src/components/staff/bookings/BookingDetailsModal.jsx (upgraded to canonical modal)
- src/hooks/useBookingManagement.js (migrated to TanStack Query, list-only)

✅ CREATE NEW:
- src/hooks/useStaffRoomBookingDetail.js (extracted from System 2)

❌ DELETE (System 2):
- src/pages/bookings/StaffBookingsPage.jsx
- src/components/bookings/BookingDetailModal.jsx
- src/hooks/useStaffBookings.js
```

### Canonical API Contract (Staff Zone)
All endpoints include `{hotelSlug}` scoping:

```javascript
// List bookings
GET /api/staff/hotel/{hotelSlug}/room-bookings/

// Booking detail
GET /api/staff/hotel/{hotelSlug}/room-bookings/{bookingId}/

// Room assignment flow
GET /api/staff/hotel/{hotelSlug}/room-bookings/{bookingId}/available-rooms/
POST /api/staff/hotel/{hotelSlug}/room-bookings/{bookingId}/safe-assign-room/
POST /api/staff/hotel/{hotelSlug}/room-bookings/{bookingId}/unassign-room/

// Check-in
POST /api/staff/hotel/{hotelSlug}/room-bookings/{bookingId}/check-in/
```

### TanStack Query Keys (Standardized)
```javascript
const queryKeys = {
  // List with filters hash from URL params
  staffRoomBookings: (hotelSlug, filtersHash) => ['staff-room-bookings', hotelSlug, filtersHash],
  
  // Individual booking detail
  staffRoomBooking: (hotelSlug, bookingId) => ['staff-room-booking', hotelSlug, bookingId],
  
  // Available rooms for assignment
  staffRoomBookingAvailableRooms: (hotelSlug, bookingId) => ['staff-room-booking-available-rooms', hotelSlug, bookingId],
};
```

## Implementation Steps

### Phase 1: Remove System 2 Routes & Navigation

#### File: hotelmate-frontend/src/App.jsx
**Action**: Remove System 2 route
```javascript
// DELETE THIS ROUTE:
<Route path="/staff/hotel/:hotelSlug/bookings2" element={<StaffBookingsPage />} />

// KEEP THIS ROUTE (System 1):
<Route path="/staff/hotel/:hotelSlug/bookings" element={<BookingManagementPage />} />
```

#### File: hotelmate-frontend/src/hooks/useNavigation.js  
**Action**: Remove System 2 navigation item
```javascript
// DELETE THIS NAV ITEM:
{ slug: 'room_bookings2', name: 'Room Bookings 2', path: '/staff/hotel/{hotelSlug}/bookings2', icon: 'bed-fill' }

// KEEP THIS NAV ITEM (System 1):
{ slug: 'room_bookings', name: 'Room Bookings', path: '/staff/hotel/{hotelSlug}/bookings', icon: 'bed', hasDropdown: true }
```

### Phase 2: Create Canonical Detail Hook

#### File: hotelmate-frontend/src/hooks/useStaffRoomBookingDetail.js (NEW)
**Action**: Create new hook extracted from System 2's useStaffBookings.js

```javascript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api, { buildStaffURL } from '@/services/api';
import { toast } from 'react-toastify';

const queryKeys = {
  staffRoomBooking: (hotelSlug, bookingId) => ['staff-room-booking', hotelSlug, bookingId],
  staffRoomBookingAvailableRooms: (hotelSlug, bookingId) => ['staff-room-booking-available-rooms', hotelSlug, bookingId],
};

export const useRoomBookingDetail = (hotelSlug, bookingId) => {
  return useQuery({
    queryKey: queryKeys.staffRoomBooking(hotelSlug, bookingId),
    queryFn: async () => {
      if (!bookingId) return null;
      const url = buildStaffURL(hotelSlug, 'room-bookings', `/${bookingId}/`);
      const response = await api.get(url);
      return response.data;
    },
    enabled: !!bookingId && !!hotelSlug,
  });
};

export const useAvailableRooms = (hotelSlug, bookingId) => {
  return useQuery({
    queryKey: queryKeys.staffRoomBookingAvailableRooms(hotelSlug, bookingId),
    queryFn: async () => {
      const url = buildStaffURL(hotelSlug, 'room-bookings', `/${bookingId}/available-rooms/`);
      const response = await api.get(url);
      return response.data;
    },
    enabled: !!bookingId && !!hotelSlug,
  });
};

export const useSafeAssignRoom = (hotelSlug) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ bookingId, roomId, assignmentNotes }) => {
      const url = buildStaffURL(hotelSlug, 'room-bookings', `/${bookingId}/safe-assign-room/`);
      const response = await api.post(url, {
        room_id: roomId,
        assignment_notes: assignmentNotes || '',
      });
      return response.data;
    },
    onSuccess: (data, variables) => {
      // Invalidate both list and detail queries
      queryClient.invalidateQueries({
        queryKey: ['staff-room-bookings', hotelSlug]
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.staffRoomBooking(hotelSlug, variables.bookingId)
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.staffRoomBookingAvailableRooms(hotelSlug, variables.bookingId)
      });
      toast.success('Room assigned successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to assign room');
    },
  });
};

export const useUnassignRoom = (hotelSlug) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ bookingId }) => {
      const url = buildStaffURL(hotelSlug, 'room-bookings', `/${bookingId}/unassign-room/`);
      const response = await api.post(url, {});
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['staff-room-bookings', hotelSlug]
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.staffRoomBooking(hotelSlug, variables.bookingId)
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.staffRoomBookingAvailableRooms(hotelSlug, variables.bookingId)
      });
      toast.success('Room unassigned successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Failed to unassign room');
    },
  });
};

export const useCheckInBooking = (hotelSlug) => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ bookingId }) => {
      const url = buildStaffURL(hotelSlug, 'room-bookings', `/${bookingId}/check-in/`);
      const response = await api.post(url, {});
      return response.data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['staff-room-bookings', hotelSlug]
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.staffRoomBooking(hotelSlug, variables.bookingId)
      });
      toast.success('Guest checked in successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || 'Check-in failed');
    },
  });
};
```

### Phase 3: Upgrade useBookingManagement to TanStack Query

#### File: hotelmate-frontend/src/hooks/useBookingManagement.js
**Action**: Migrate from manual state management to TanStack Query while preserving URL filtering

```javascript
import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import api, { buildStaffURL } from '@/services/api';

const queryKeys = {
  staffRoomBookings: (hotelSlug, filtersHash) => ['staff-room-bookings', hotelSlug, filtersHash],
};

export const useBookingManagement = (hotelSlug) => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Create filters hash from URL params for stable query key
  const filtersHash = useMemo(() => {
    const params = {};
    if (searchParams.has('filter')) {
      params.filter = searchParams.get('filter');
    }
    if (searchParams.has('page')) {
      params.page = searchParams.get('page');
    }
    return JSON.stringify(params);
  }, [searchParams]);
  
  // Build query string from URL params
  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    
    if (searchParams.has('filter')) {
      const filterValue = searchParams.get('filter');
      switch (filterValue) {
        case 'pending':
          params.append('status', 'PENDING_PAYMENT');
          break;
        case 'confirmed':
          params.append('status', 'CONFIRMED');
          break;
        case 'cancelled':
          params.append('status', 'CANCELLED');
          break;
        case 'history':
          params.append('status', 'COMPLETED,CANCELLED');
          break;
        default:
          break;
      }
    }
    
    if (searchParams.has('page')) {
      params.append('page', searchParams.get('page'));
    }
    
    return params.toString();
  }, [searchParams]);
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.staffRoomBookings(hotelSlug, filtersHash),
    queryFn: async () => {
      const url = buildStaffURL(hotelSlug, 'room-bookings', queryString ? `/?${queryString}` : '/');
      const response = await api.get(url);
      return response.data;
    },
    enabled: !!hotelSlug,
  });
  
  // Calculate statistics from data
  const statistics = useMemo(() => {
    if (!data?.results) {
      return {
        total: 0,
        pending: 0,
        confirmed: 0,
        cancelled: 0,
        completed: 0,
      };
    }
    
    const bookings = data.results;
    return {
      total: bookings.length,
      pending: bookings.filter(b => b.status === 'PENDING_PAYMENT').length,
      confirmed: bookings.filter(b => b.status === 'CONFIRMED').length,
      cancelled: bookings.filter(b => b.status === 'CANCELLED').length,
      completed: bookings.filter(b => b.status === 'COMPLETED').length,
    };
  }, [data]);
  
  // URL filter management
  const setFilter = (filterType) => {
    const newParams = new URLSearchParams(searchParams);
    if (filterType && filterType !== 'all') {
      newParams.set('filter', filterType);
    } else {
      newParams.delete('filter');
    }
    newParams.delete('page'); // Reset page when changing filters
    setSearchParams(newParams);
  };
  
  const setPage = (page) => {
    const newParams = new URLSearchParams(searchParams);
    if (page > 1) {
      newParams.set('page', page.toString());
    } else {
      newParams.delete('page');
    }
    setSearchParams(newParams);
  };
  
  return {
    bookings: data?.results || [],
    pagination: data?.pagination || null,
    statistics,
    isLoading,
    error,
    refetch,
    currentFilter: searchParams.get('filter') || 'all',
    currentPage: parseInt(searchParams.get('page') || '1', 10),
    setFilter,
    setPage,
  };
};
```

### Phase 4: Upgrade BookingDetailsModal

#### File: hotelmate-frontend/src/components/staff/bookings/BookingDetailsModal.jsx
**Action**: Replace with canonical modal implementation

```javascript
import React, { useState, useEffect } from 'react';
import { Modal, Button, Spinner, Alert, Card, Badge, Form, Row, Col } from 'react-bootstrap';
import { 
  useRoomBookingDetail, 
  useAvailableRooms, 
  useSafeAssignRoom, 
  useUnassignRoom, 
  useCheckInBooking 
} from '@/hooks/useStaffRoomBookingDetail';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

const BookingDetailsModal = ({ show, onClose, bookingId, hotelSlug }) => {
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [showRoomAssignment, setShowRoomAssignment] = useState(false);
  
  // Fetch booking detail
  const { 
    data: booking, 
    isLoading: isLoadingBooking, 
    error: bookingError 
  } = useRoomBookingDetail(hotelSlug, bookingId);
  
  // Fetch available rooms (only when needed)
  const { 
    data: availableRooms, 
    isLoading: isLoadingRooms 
  } = useAvailableRooms(hotelSlug, bookingId, {
    enabled: showRoomAssignment && !!bookingId
  });
  
  // Mutations
  const safeAssignMutation = useSafeAssignRoom(hotelSlug);
  const unassignMutation = useUnassignRoom(hotelSlug);
  const checkInMutation = useCheckInBooking(hotelSlug);
  
  // Reset form when modal opens/closes
  useEffect(() => {
    if (!show) {
      setSelectedRoomId('');
      setAssignmentNotes('');
      setShowRoomAssignment(false);
    }
  }, [show]);
  
  const handleAssignRoom = async () => {
    if (!selectedRoomId) {
      toast.error('Please select a room');
      return;
    }
    
    try {
      await safeAssignMutation.mutateAsync({
        bookingId,
        roomId: selectedRoomId,
        assignmentNotes,
      });
      setSelectedRoomId('');
      setAssignmentNotes('');
      setShowRoomAssignment(false);
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  const handleUnassignRoom = async () => {
    try {
      await unassignMutation.mutateAsync({ bookingId });
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  const handleCheckIn = async () => {
    try {
      await checkInMutation.mutateAsync({ bookingId });
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  const renderStatusBadge = (status) => {
    const statusConfig = {
      'PENDING_PAYMENT': { variant: 'warning', text: 'Pending Payment' },
      'CONFIRMED': { variant: 'success', text: 'Confirmed' },
      'CANCELLED': { variant: 'danger', text: 'Cancelled' },
      'COMPLETED': { variant: 'info', text: 'Completed' },
      'NO_SHOW': { variant: 'secondary', text: 'No Show' },
    };
    
    const config = statusConfig[status] || { variant: 'secondary', text: status };
    return <Badge bg={config.variant}>{config.text}</Badge>;
  };
  
  const renderBookingParty = (party) => {
    if (!party || party.length === 0) return null;
    
    const primaryGuest = party.find(p => p.role === 'PRIMARY') || party[0];
    const companions = party.filter(p => p.role === 'COMPANION');
    
    return (
      <Card className="mt-3">
        <Card.Header>
          <h6 className="mb-0">Booking Party ({party.length} guests)</h6>
        </Card.Header>
        <Card.Body>
          <div className="mb-2">
            <strong>Primary Guest:</strong><br />
            {primaryGuest.first_name} {primaryGuest.last_name}
            {primaryGuest.email && <><br /><small>{primaryGuest.email}</small></>}
            {primaryGuest.phone && <><br /><small>{primaryGuest.phone}</small></>}
          </div>
          
          {companions.length > 0 && (
            <div>
              <strong>Companions:</strong>
              {companions.map((companion, index) => (
                <div key={index} className="ms-2">
                  • {companion.first_name} {companion.last_name}
                </div>
              ))}
            </div>
          )}
        </Card.Body>
      </Card>
    );
  };
  
  const renderRoomAssignmentSection = () => {
    const flags = booking?.flags || {};
    
    if (booking?.assigned_room) {
      // Room is assigned
      return (
        <Card className="mt-3">
          <Card.Header>
            <h6 className="mb-0">Room Assignment</h6>
          </Card.Header>
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <strong>Room {booking.assigned_room.room_number}</strong>
                <br />
                <small className="text-muted">
                  Assigned on {format(new Date(booking.room_assigned_at), 'MMM dd, yyyy HH:mm')}
                </small>
              </div>
              {flags.can_unassign_room && (
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={handleUnassignRoom}
                  disabled={unassignMutation.isPending}
                >
                  {unassignMutation.isPending ? 'Unassigning...' : 'Unassign'}
                </Button>
              )}
            </div>
          </Card.Body>
        </Card>
      );
    } else {
      // No room assigned
      if (!flags.can_assign_room) return null;
      
      return (
        <Card className="mt-3">
          <Card.Header>
            <h6 className="mb-0">Room Assignment</h6>
          </Card.Header>
          <Card.Body>
            {!showRoomAssignment ? (
              <Button
                variant="primary"
                onClick={() => setShowRoomAssignment(true)}
              >
                Assign Room
              </Button>
            ) : (
              <div>
                <Form.Group className="mb-3">
                  <Form.Label>Select Room</Form.Label>
                  <Form.Select
                    value={selectedRoomId}
                    onChange={(e) => setSelectedRoomId(e.target.value)}
                    disabled={isLoadingRooms}
                  >
                    <option value="">
                      {isLoadingRooms ? 'Loading rooms...' : 'Choose a room...'}
                    </option>
                    {availableRooms?.map(room => (
                      <option key={room.id} value={room.id}>
                        Room {room.room_number} - {room.room_type_name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
                
                <Form.Group className="mb-3">
                  <Form.Label>Assignment Notes (Optional)</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={assignmentNotes}
                    onChange={(e) => setAssignmentNotes(e.target.value)}
                    placeholder="Add any notes about this room assignment..."
                  />
                </Form.Group>
                
                <div className="d-flex gap-2">
                  <Button
                    variant="success"
                    onClick={handleAssignRoom}
                    disabled={!selectedRoomId || safeAssignMutation.isPending}
                  >
                    {safeAssignMutation.isPending ? 'Assigning...' : 'Assign Room'}
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowRoomAssignment(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </Card.Body>
        </Card>
      );
    }
  };
  
  const renderCheckInSection = () => {
    const flags = booking?.flags || {};
    
    if (!flags.can_check_in || booking?.checked_in_at) return null;
    
    return (
      <Card className="mt-3">
        <Card.Header>
          <h6 className="mb-0">Check-In</h6>
        </Card.Header>
        <Card.Body>
          <Button
            variant="info"
            onClick={handleCheckIn}
            disabled={checkInMutation.isPending}
          >
            {checkInMutation.isPending ? 'Checking In...' : 'Check In Guest'}
          </Button>
        </Card.Body>
      </Card>
    );
  };
  
  if (isLoadingBooking) {
    return (
      <Modal show={show} onHide={onClose} size="lg" centered>
        <Modal.Body className="text-center py-5">
          <Spinner animation="border" role="status" />
          <div className="mt-2">Loading booking details...</div>
        </Modal.Body>
      </Modal>
    );
  }
  
  if (bookingError) {
    return (
      <Modal show={show} onHide={onClose} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Error</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="danger">
            Failed to load booking details: {bookingError.message}
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }
  
  if (!booking) {
    return (
      <Modal show={show} onHide={onClose} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>Booking Not Found</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            Booking details could not be found.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    );
  }
  
  return (
    <Modal show={show} onHide={onClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          Booking Details - {booking.booking_id}
        </Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        {/* Booking Status and IDs */}
        <Card>
          <Card.Body>
            <Row>
              <Col md={8}>
                <h5>
                  {booking.primary_first_name} {booking.primary_last_name}
                  <span className="ms-2">{renderStatusBadge(booking.status)}</span>
                </h5>
                <div className="text-muted">
                  Booking ID: {booking.booking_id}<br />
                  Confirmation: {booking.confirmation_number}
                </div>
              </Col>
              <Col md={4} className="text-end">
                <div>
                  <strong>{booking.room_type_name}</strong><br />
                  <small className="text-muted">
                    {format(new Date(booking.check_in), 'MMM dd')} - {format(new Date(booking.check_out), 'MMM dd, yyyy')}
                    <br />
                    {booking.nights} nights, {booking.adults} adults
                    {booking.children > 0 && `, ${booking.children} children`}
                  </small>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
        
        {/* Guest Information */}
        <Card className="mt-3">
          <Card.Header>
            <h6 className="mb-0">Guest Information</h6>
          </Card.Header>
          <Card.Body>
            <Row>
              <Col md={6}>
                <div>
                  <strong>Primary Guest:</strong><br />
                  {booking.primary_first_name} {booking.primary_last_name}
                  {booking.primary_email && <><br />Email: {booking.primary_email}</>}
                  {booking.primary_phone && <><br />Phone: {booking.primary_phone}</>}
                </div>
              </Col>
              {booking.booker_type !== 'SELF' && (
                <Col md={6}>
                  <div>
                    <strong>Booker:</strong><br />
                    {booking.booker_first_name} {booking.booker_last_name}
                    {booking.booker_email && <><br />Email: {booking.booker_email}</>}
                    {booking.booker_company && <><br />Company: {booking.booker_company}</>}
                  </div>
                </Col>
              )}
            </Row>
          </Card.Body>
        </Card>
        
        {/* Booking Party */}
        {renderBookingParty(booking.party)}
        
        {/* Room Assignment Section */}
        {renderRoomAssignmentSection()}
        
        {/* Check-In Section */}
        {renderCheckInSection()}
        
        {/* Pricing */}
        <Card className="mt-3">
          <Card.Header>
            <h6 className="mb-0">Pricing</h6>
          </Card.Header>
          <Card.Body>
            <div className="d-flex justify-content-between">
              <span>Total Amount:</span>
              <strong>{booking.total_amount} {booking.currency}</strong>
            </div>
          </Card.Body>
        </Card>
        
        {/* Special Requests */}
        {booking.special_requests && (
          <Card className="mt-3">
            <Card.Header>
              <h6 className="mb-0">Special Requests</h6>
            </Card.Header>
            <Card.Body>
              <div className="text-muted">{booking.special_requests}</div>
            </Card.Body>
          </Card>
        )}
      </Modal.Body>
      
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default BookingDetailsModal;
```

### Phase 5: Update Modal Trigger Pattern

#### File: hotelmate-frontend/src/pages/staff/BookingManagementPage.jsx
**Action**: Update modal trigger to pass only bookingId and hotelSlug

```javascript
// CURRENT PATTERN (System 1):
const handleBookingClick = (booking) => {
  setSelectedBooking(booking);  // ❌ Remove - don't pass full object
  setShowDetailsModal(true);
};

<BookingDetailsModal
  show={showDetailsModal}
  booking={selectedBooking}     // ❌ Remove - don't pass full object
  onClose={handleCloseModal}
  // ... other props
/>

// NEW PATTERN (Canonical):
const [selectedBookingId, setSelectedBookingId] = useState(null);

const handleBookingClick = (booking) => {
  setSelectedBookingId(booking.booking_id);  // ✅ Use booking_id only
  setShowDetailsModal(true);
};

<BookingDetailsModal
  show={showDetailsModal}
  bookingId={selectedBookingId}  // ✅ Pass ID only
  hotelSlug={hotelSlug}          // ✅ Add hotelSlug
  onClose={handleCloseModal}
/>
```

### Phase 6: Add TanStack Query Dependencies

#### File: hotelmate-frontend/src/pages/staff/BookingManagementPage.jsx
**Action**: Update imports and integrate with new hooks

```javascript
// Add TanStack Query imports
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Update hook usage
import { useBookingManagement } from '@/hooks/useBookingManagement';

// Update component to use new hook API
const BookingManagementPage = () => {
  const { hotelSlug } = useParams();
  const {
    bookings,
    pagination,
    statistics,
    isLoading,
    error,
    currentFilter,
    currentPage,
    setFilter,
    setPage,
  } = useBookingManagement(hotelSlug);
  
  // ... rest of component logic
};
```

### Phase 7: Delete System 2 Files

#### Files to Delete:
1. `hotelmate-frontend/src/pages/bookings/StaffBookingsPage.jsx`
2. `hotelmate-frontend/src/components/bookings/BookingDetailModal.jsx`  
3. `hotelmate-frontend/src/hooks/useStaffBookings.js`

#### Update Import References:
Search and replace any remaining imports of deleted files throughout the codebase.

## Route Configuration Verification

### Target Route Structure:
```javascript
// App.jsx - ONLY keep System 1 route
<Route path="/staff/hotel/:hotelSlug/bookings" element={<BookingManagementPage />} />

// Navigation - ONLY keep System 1 nav item
{ slug: 'room_bookings', name: 'Room Bookings', path: '/staff/hotel/{hotelSlug}/bookings', icon: 'bed' }
```

### Route Testing:
- ✅ http://localhost:5173/staff/hotel/hotel-killarney/bookings should load BookingManagementPage
- ❌ http://localhost:5173/staff/hotel/hotel-killarney/bookings2 should return 404 (deleted)

## Query Invalidation Strategy

### After Any Mutation (assign/unassign/check-in):

```javascript
// Invalidate list query (all variations)
queryClient.invalidateQueries({
  queryKey: ['staff-room-bookings', hotelSlug]
});

// Invalidate specific booking detail
queryClient.invalidateQueries({
  queryKey: ['staff-room-booking', hotelSlug, bookingId]
});

// Invalidate available rooms (if room assignment changed)
queryClient.invalidateQueries({
  queryKey: ['staff-room-booking-available-rooms', hotelSlug, bookingId]
});
```

## Identifier Standardization

### Decision: Use `booking_id` (String) Consistently
- Backend API expects `{bookingId}` parameter in URLs
- Frontend should use `booking.booking_id` for all API calls
- Display can show both `booking_id` and `confirmation_number` but use `booking_id` for operations

### Implementation:
```javascript
// Consistent API call pattern
const url = buildStaffURL(hotelSlug, 'room-bookings', `/${booking.booking_id}/`);

// Modal trigger pattern  
setSelectedBookingId(booking.booking_id);

// Query key pattern
['staff-room-booking', hotelSlug, booking.booking_id]
```

## Statistics Dashboard Preservation

### System 1's Statistics Integration:
```javascript
// Calculate from list query results
const statistics = useMemo(() => {
  if (!data?.results) return { total: 0, pending: 0, confirmed: 0, cancelled: 0, completed: 0 };
  
  const bookings = data.results;
  return {
    total: bookings.length,
    pending: bookings.filter(b => b.status === 'PENDING_PAYMENT').length,
    confirmed: bookings.filter(b => b.status === 'CONFIRMED').length,
    cancelled: bookings.filter(b => b.status === 'CANCELLED').length,
    completed: bookings.filter(b => b.status === 'COMPLETED').length,
  };
}, [data]);
```

## Error Handling & Loading States

### Pattern for All Queries:
```javascript
const { data, isLoading, error } = useQuery({
  // ... query config
});

// Component rendering
if (isLoading) return <Spinner />;
if (error) return <Alert variant="danger">Error: {error.message}</Alert>;
if (!data) return <Alert variant="warning">No data available</Alert>;
```

### Mutation Error Handling:
```javascript
useMutation({
  onSuccess: () => {
    toast.success('Operation completed successfully');
  },
  onError: (error) => {
    toast.error(error.response?.data?.message || 'Operation failed');
  },
});
```

## Implementation Checklist

### Pre-Implementation:
- [ ] Backup current working System 1 and System 2 files
- [ ] Verify current route http://localhost:5173/staff/hotel/hotel-killarney/bookings works
- [ ] Document current API endpoints being used

### Implementation Order:
1. [ ] Create useStaffRoomBookingDetail.js hook
2. [ ] Update useBookingManagement.js to TanStack Query
3. [ ] Upgrade BookingDetailsModal.jsx to canonical version
4. [ ] Update BookingManagementPage.jsx modal trigger pattern
5. [ ] Remove System 2 routes from App.jsx
6. [ ] Remove System 2 navigation from useNavigation.js
7. [ ] Delete System 2 files (StaffBookingsPage.jsx, BookingDetailModal.jsx, useStaffBookings.js)
8. [ ] Update any remaining imports/references

### Post-Implementation Testing:
- [ ] List page loads with proper URL filtering
- [ ] Statistics dashboard shows correct counts
- [ ] Modal opens and fetches booking detail
- [ ] Room assignment works (if flags allow)
- [ ] Check-in works (if flags allow)
- [ ] Room unassignment works (if flags allow)
- [ ] Cache invalidation works after mutations
- [ ] No System 2 routes accessible
- [ ] No console errors
- [ ] Build passes without unused imports

## Files Summary

### Files Created:
1. `hotelmate-frontend/src/hooks/useStaffRoomBookingDetail.js` (New canonical detail hook)

### Files Modified:
1. `hotelmate-frontend/src/hooks/useBookingManagement.js` (Migrate to TanStack Query)
2. `hotelmate-frontend/src/components/staff/bookings/BookingDetailsModal.jsx` (Upgrade to canonical)
3. `hotelmate-frontend/src/pages/staff/BookingManagementPage.jsx` (Update modal trigger)
4. `hotelmate-frontend/src/App.jsx` (Remove System 2 route)
5. `hotelmate-frontend/src/hooks/useNavigation.js` (Remove System 2 nav item)

### Files Deleted:
1. `hotelmate-frontend/src/pages/bookings/StaffBookingsPage.jsx`
2. `hotelmate-frontend/src/components/bookings/BookingDetailModal.jsx`
3. `hotelmate-frontend/src/hooks/useStaffBookings.js`

---

**Ready for Implementation**: This plan provides complete file-by-file changes needed to consolidate the booking systems into a single canonical implementation while preserving all existing System 1 features and adding System 2's advanced capabilities.
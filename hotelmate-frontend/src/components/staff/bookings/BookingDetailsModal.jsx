import React, { useState, useEffect } from 'react';
import { Modal, Button, Spinner, Alert, Card, Badge, Form, OverlayTrigger, Tooltip, Row, Col } from 'react-bootstrap';
import { 
  useRoomBookingDetail, 
  useAvailableRooms, 
  useSafeAssignRoom, 
  useUnassignRoom, 
  useCheckInBooking,
  useCheckOutBooking,
  useSendPrecheckinLink 
} from '@/hooks/useStaffRoomBookingDetail';
import { format } from 'date-fns';
import { toast } from 'react-toastify';
import BookingStatusBadges from './BookingStatusBadges';
import BookingDetailsPartySection from './BookingDetailsPartySection';
import BookingDetailsRoomAssignmentSection from './BookingDetailsRoomAssignmentSection';
import BookingDetailsCheckinSection from './BookingDetailsCheckinSection';
import BookingDetailsCheckoutSection from './BookingDetailsCheckoutSection';
import BookingDetailsPrecheckinSummary from './BookingDetailsPrecheckinSummary';
import BookingDetailsSurveyStatus from './BookingDetailsSurveyStatus';
import BookingDetailsTimeControlsSection from './BookingDetailsTimeControlsSection';
import { useBookingTimeWarnings } from '@/hooks/useBookingTimeWarnings';
import { staffOverstayAPI } from '@/services/staffApi';
import StaffConfirmationModal from '../modals/StaffConfirmationModal';

import AcknowledgeOverstayForm from '../modals/AcknowledgeOverstayForm';
import { useRoomBookingState } from '@/realtime/stores/roomBookingStore';

/**
 * Canonical Booking Details Modal Component
 * Features room assignment, check-in, and flags-driven actions
 */
const BookingDetailsModal = ({ show, onClose, bookingId, hotelSlug, staffProfile }) => {
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [showRoomAssignment, setShowRoomAssignment] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  
  // Overstay state management
  const [overstayStatus, setOverstayStatus] = useState(null);
  const [isLoadingOverstayStatus, setIsLoadingOverstayStatus] = useState(false);
  const [overstayStatusError, setOverstayStatusError] = useState(false);
  const [showAcknowledgeModal, setShowAcknowledgeModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  const [acknowledgeNote, setAcknowledgeNote] = useState('');
  const [dismissOverstay, setDismissOverstay] = useState(false);
  const [extendIdempotencyKey, setExtendIdempotencyKey] = useState(null);
  const [extendMode, setExtendMode] = useState('nights'); // 'nights' or 'date'
  const [extendNights, setExtendNights] = useState(1);
  const [extendDate, setExtendDate] = useState('');
  const [extendValidationError, setExtendValidationError] = useState('');
  const [extendConflictError, setExtendConflictError] = useState(null);
  
  // Fetch booking detail
  const { 
    data: booking, 
    isLoading: isLoadingBooking, 
    error: bookingError 
  } = useRoomBookingDetail(hotelSlug, bookingId);
  
  // Fetch available rooms (only when needed)
  const { 
    data: availableRooms, 
    isLoading: isLoadingRooms,
    error: roomsError
  } = useAvailableRooms(hotelSlug, bookingId);
  
  // Debug available rooms
  console.log('🏨 Available rooms debug:', {
    availableRooms,
    isLoadingRooms,
    roomsError,
    hotelSlug,
    bookingId,
    isArray: Array.isArray(availableRooms),
    availableRoomsKeys: availableRooms ? Object.keys(availableRooms) : null,
    availableRoomsStructure: availableRooms
  });
  
  // Mutations
  const safeAssignMutation = useSafeAssignRoom(hotelSlug);
  const unassignMutation = useUnassignRoom(hotelSlug);
  const checkInMutation = useCheckInBooking(hotelSlug);
  const checkOutMutation = useCheckOutBooking(hotelSlug);
  const sendPrecheckinLinkMutation = useSendPrecheckinLink(hotelSlug);
  
  // Get booking time warnings (must be at top level)
  const bookingWarnings = useBookingTimeWarnings(booking);
  
  // Listen for realtime booking updates to refresh overstay status
  const roomBookingState = useRoomBookingState();
  
  // Fetch overstay status when booking data is available
  useEffect(() => {
    const fetchOverstayStatus = async () => {
      if (!booking?.booking_id || !hotelSlug) return;
      
      console.log('[BookingDetailsModal] Fetching overstay status for:', booking.booking_id);
      setIsLoadingOverstayStatus(true);
      setOverstayStatusError(false);
      try {
        const response = await staffOverstayAPI.staffOverstayStatus(hotelSlug, booking.booking_id);
        console.log('[BookingDetailsModal] Overstay status response:', response.data);
        setOverstayStatus(response.data);
        setOverstayStatusError(false);
      } catch (error) {
        console.warn('[BookingDetailsModal] Failed to fetch overstay status:', error);
        console.warn('[BookingDetailsModal] Error response:', error.response?.data);
        setOverstayStatusError(true);
        // Don't toast error for overstay status - it's supplementary data
      } finally {
        setIsLoadingOverstayStatus(false);
      }
    };
    
    fetchOverstayStatus();
  }, [booking?.booking_id, hotelSlug]);
  
  // Function to refresh overstay status (used by realtime events)
  const refreshOverstayStatus = async () => {
    if (!booking?.booking_id || !hotelSlug) return;
    
    setOverstayStatusError(false);
    try {
      const response = await staffOverstayAPI.staffOverstayStatus(hotelSlug, booking.booking_id);
      setOverstayStatus(response.data);
      setOverstayStatusError(false);
    } catch (error) {
      console.warn('[BookingDetailsModal] Failed to refresh overstay status:', error);
      setOverstayStatusError(true);
    }
  };
  
  // Listen for realtime overstay events to refresh status
  useEffect(() => {
    if (!booking?.booking_id) return;
    
    const handleOverstayRefresh = (event) => {
      if (event.detail?.bookingId === booking.booking_id) {
        // Refresh overstay status when realtime events occur
        refreshOverstayStatus();
      }
    };
    
    window.addEventListener('overstayStatusRefresh', handleOverstayRefresh);
    
    return () => {
      window.removeEventListener('overstayStatusRefresh', handleOverstayRefresh);
    };
  }, [booking?.booking_id, hotelSlug]);
  
  
  const handleAssignRoom = async () => {
    if (!selectedRoomId) {
      toast.error('Please select a room');
      return;
    }
    
    // Determine operation mode
    const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
    
    // Validate reason for move operations
    if (isInHouse && !reason.trim()) {
      setReasonError('Reason is required for room moves');
      return;
    }
    setReasonError('');
    
    try {
      await safeAssignMutation.mutateAsync({
        bookingId,
        roomId: selectedRoomId,
        assignmentNotes,
        booking,
        reason: reason.trim(),
      });
      setSelectedRoomId('');
      setAssignmentNotes('');
      setReason('');
      setReasonError('');
      setShowRoomAssignment(false);
    } catch (error) {
      // Check for PARTY_INCOMPLETE specific error
      if (error.response?.data?.code === 'PARTY_INCOMPLETE') {
        toast.error('Cannot assign room. Missing guest information. Send pre-check-in link first.');
        // Keep modal open for user to fix the issue
        return;
      }
      // Other errors handled by mutation
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
    // Check if booking has assigned room
    const assignedRoom = booking?.assigned_room || booking?.room;
    if (!assignedRoom) {
      toast.error('Assign a room first');
      setShowRoomAssignment(true);
      return;
    }
    
    try {
      await checkInMutation.mutateAsync({ 
        bookingId,
        roomNumber: assignedRoom.room_number 
      });
    } catch (error) {
      // Error handled by mutation
    }
  };
  
  const handleSendPrecheckinLink = async () => {
    try {
      await sendPrecheckinLinkMutation.mutateAsync({ bookingId });
    } catch (error) {
      // Error handled by mutation
    }
  };

  const handleCheckOut = async () => {
    if (!booking?.booking_id) return;
    
    try {
      await checkOutMutation.mutateAsync({ 
        bookingId: booking.booking_id 
      });
    } catch (error) {
      // Error handling is done in the mutation
      console.error('Check-out failed:', error);
    }
  };
  
  // Overstay action handlers
  const generateIdempotencyKey = () => {
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0') +
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0') +
      now.getSeconds().toString().padStart(2, '0');
    const rand4 = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ext_${booking?.booking_id}_${timestamp}_${rand4}`;
  };
  
  const handleOpenExtendModal = () => {
    setExtendIdempotencyKey(generateIdempotencyKey());
    setExtendMode('nights');
    setExtendNights(1);
    setExtendDate('');
    setExtendValidationError('');
    setExtendConflictError(null);
    setShowExtendModal(true);
  };
  
  const handleAcknowledgeOverstay = async (note = '', dismiss = false) => {
    if (!booking?.booking_id) return;
    
    setIsAcknowledging(true);
    try {
      await staffOverstayAPI.staffOverstayAcknowledge(hotelSlug, booking.booking_id, {
        note: note || '',
        dismiss: dismiss || false
      });
      toast.success('Overstay acknowledged successfully');
      
      // Immediate refresh after success
      await refreshOverstayStatus();
      
      // Reset state and close modal
      setIsAcknowledging(false);
      setShowAcknowledgeModal(false);
      setAcknowledgeNote('');
      setDismissOverstay(false);
    } catch (error) {
      toast.error('Failed to acknowledge overstay: ' + (error.response?.data?.message || error.message));
      setIsAcknowledging(false);
    }
  };
  
  const handleExtendStay = async () => {
    if (!booking?.booking_id) return;
    
    // Debug logging to help diagnose the issue
    console.log('[BookingDetailsModal] Extend stay debug info:', {
      booking_id: booking.booking_id,
      status: booking.status,
      checked_in_at: booking.checked_in_at,
      checked_out_at: booking.checked_out_at,
      assigned_room: booking.assigned_room,
      room: booking.room,
      isInHouse: !!booking.checked_in_at && !booking.checked_out_at,
      is_checked_in: !!booking.checked_in_at && !booking.checked_out_at,
      current_status: booking.checked_in_at ? (booking.checked_out_at ? 'checked-out' : 'checked-in') : 'not-checked-in',
      booking_status_field: booking.status,
      check_in_date: booking.check_in,
      check_out_date: booking.check_out,
      extendMode,
      extendNights,
      extendDate
    });
    console.log('[BookingDetailsModal] Full booking object:', booking);
    console.log('[BookingDetailsModal] Full booking object:', booking);
    
    // Validate exactly one of add_nights or new_checkout_date
    const hasNights = extendMode === 'nights' && extendNights > 0;
    const hasDate = extendMode === 'date' && extendDate.trim();
    
    if (!hasNights && !hasDate) {
      setExtendValidationError('Must specify either additional nights or new checkout date');
      return;
    }
    
    setExtendValidationError('');
    setExtendConflictError(null);
    
    const payload = extendMode === 'nights' 
      ? { add_nights: extendNights }
      : { new_checkout_date: extendDate };
      
    console.log('[BookingDetailsModal] Sending extend request:', {
      hotelSlug,
      bookingId: booking.booking_id,
      payload,
      idempotencyKey: extendIdempotencyKey
    });
      
    setIsExtending(true);
    try {
      const response = await staffOverstayAPI.staffOverstayExtend(hotelSlug, booking.booking_id, payload, {
        idempotencyKey: extendIdempotencyKey
      });
      console.log('[BookingDetailsModal] Extend response:', response.data);
      toast.success('Stay extended successfully');
      setShowExtendModal(false);
      
      // Immediate refresh after success
      await refreshOverstayStatus();
    } catch (error) {
      console.error('[BookingDetailsModal] Extend error:', error);
      console.error('[BookingDetailsModal] Error response data:', error.response?.data);
      console.error('[BookingDetailsModal] Error status:', error.response?.status);
      console.error('[BookingDetailsModal] Error message:', error.message);
      
      if (error.response?.status === 409) {
        // Handle room conflicts - use the exact backend response structure
        const errorData = error.response?.data;
        console.log('[BookingDetailsModal] 409 conflict data:', errorData);
        
        // Check if this is a check-in status issue
        if (errorData?.detail?.includes('not checked-in')) {
          console.warn('[BookingDetailsModal] Backend reports booking not checked-in, but frontend shows:', {
            frontend_checked_in_at: booking.checked_in_at,
            frontend_checked_out_at: booking.checked_out_at,
            frontend_status: booking.status,
            backend_error: errorData?.detail
          });
          toast.error(`Cannot extend stay: ${errorData?.detail}\n\nPlease refresh the page and try again.`);
        } else {
          setExtendConflictError({
            detail: errorData?.detail || 'Room conflict detected',
            conflicts: errorData?.conflicts || [],
            suggested_rooms: errorData?.suggested_rooms || []
          });
        }
      } else {
        toast.error('Failed to extend stay: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      setIsExtending(false);
    }
  };
  
  const renderPartyStatusBanner = () => {
    const partyComplete = booking?.party_complete ?? false;
    const partyMissingCount = booking?.party_missing_count; // NO fallback - use actual backend value
    
    if (partyComplete) {
      return null; // No banner needed when party is complete
    }
    
    return (
      <Alert variant="warning" className="mt-3 party-status-banner">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <i className="bi bi-exclamation-triangle me-2"></i>
            Missing {partyMissingCount == null ? '—' : partyMissingCount} guest name(s). Request guest details.
          </div>
          <Button 
            variant="outline-warning" 
            size="sm"
            onClick={handleSendPrecheckinLink}
            disabled={sendPrecheckinLinkMutation.isPending}
          >
            {sendPrecheckinLinkMutation.isPending ? (
              <>
                <Spinner animation="border" size="sm" className="me-1" />
                Sending...
              </>
            ) : (
              'Request guest details'
            )}
          </Button>
        </div>
      </Alert>
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
    <>
      <Modal 
        show={show} 
        onHide={onClose} 
        size="lg" 
        centered
      >
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
                </h5>
                <div className="mb-2">
                  <BookingStatusBadges booking={booking} />
                </div>
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
                    {booking.nights} nights
                    <br />
                    Expected: {booking.adults != null && booking.children != null ? (booking.adults + booking.children) : '—'} guests | Recorded: {booking.party?.total_count != null ? booking.party.total_count : '—'}
                    {booking.party_missing_count != null && booking.party_missing_count > 0 && (
                      <span className="text-warning"> | Missing: {booking.party_missing_count}</span>
                    )}
                  </small>
                </div>
              </Col>
            </Row>
          </Card.Body>
        </Card>
        
        {/* Staff Seen Information Section */}
        <Card className="mb-3">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <strong className="text-muted">Staff View Status:</strong>
                <div className="mt-1">
                  <span className="me-3">
                    <i className="bi bi-eye me-1"></i>
                    Seen: {booking.staff_seen_at 
                      ? format(new Date(booking.staff_seen_at), 'MMM dd, yyyy HH:mm')
                      : <span className="text-warning">Not seen yet</span>
                    }
                  </span>
                  {booking.staff_seen_at && (
                    <span>
                      <i className="bi bi-person me-1"></i>
                      Seen first by: {(() => {
                        try {
                          const seenBy = booking.staff_seen_by_display || booking.staff_seen_by;
                          if (!seenBy) return '—';
                          
                          // Handle both string and object formats
                          if (typeof seenBy === 'string') {
                            return seenBy;
                          }
                          
                          // Handle object format with improved field priority
                          if (seenBy.full_name) return seenBy.full_name;
                          if (seenBy.name) return seenBy.name;
                          if (seenBy.first_name && seenBy.last_name) {
                            return `${seenBy.first_name} ${seenBy.last_name}`;
                          }
                          if (seenBy.email) return seenBy.email;
                          
                          return String(seenBy);
                        } catch (error) {
                          // Graceful degradation - dev warning only
                          if (process.env.NODE_ENV !== 'production') {
                            console.warn('[BookingDetailsModal] Error processing staff_seen_by:', error);
                          }
                          return '—';
                        }
                      })()} 
                    </span>
                  )}
                </div>
              </div>
            </div>
          </Card.Body>
        </Card>
        
        {/* Party Status Banner */}
        {renderPartyStatusBanner()}
        
        {/* Time Controls Section */}
        <BookingDetailsTimeControlsSection 
          booking={booking}
          bookingWarnings={bookingWarnings}
          overstayState={{
            overstayStatus,
            isLoadingOverstayStatus,
            overstayStatusError,
            isAcknowledging,
            isExtending
          }}
          acknowledgeForm={{
            showAcknowledgeModal,
            setShowAcknowledgeModal,
            acknowledgeNote,
            setAcknowledgeNote,
            dismissOverstay,
            setDismissOverstay,
            onConfirm: handleAcknowledgeOverstay
          }}
          onAcknowledgeOverstay={() => setShowAcknowledgeModal(!showAcknowledgeModal)}
          onExtendStay={handleOpenExtendModal}
          onRetryOverstayStatus={refreshOverstayStatus}
        />
        
        {/* Pre-Check-In Summary Section */}
        <Card className="mb-3" data-precheckin-summary>
          <Card.Header>
            <h5 className="mb-0">
              <i className="bi bi-clipboard-check me-2"></i>
              Pre-Check-In Status
            </h5>
          </Card.Header>
          <Card.Body>
            <BookingDetailsPrecheckinSummary booking={booking} />
          </Card.Body>
        </Card>

        {/* Survey Status Section */}
        <Card className="mb-3" data-survey-summary>
          <Card.Header>
            <h5 className="mb-0">
              <i className="bi bi-chat-square-heart me-2"></i>
              Survey Status
            </h5>
          </Card.Header>
          <Card.Body>
            <BookingDetailsSurveyStatus booking={booking} />
          </Card.Body>
        </Card>
        
        {/* Party Information */}
        <BookingDetailsPartySection booking={booking} />
        
        {/* Room Assignment Section */}
        <BookingDetailsRoomAssignmentSection 
          booking={booking}
          roomAssignment={{
            selectedRoomId,
            setSelectedRoomId,
            assignmentNotes,
            setAssignmentNotes,
            showRoomAssignment,
            reason,
            setReason,
            reasonError,
            setReasonError
          }}
          availableRooms={availableRooms}
          isLoadingRooms={isLoadingRooms}
          onAssignRoom={handleAssignRoom}
          onUnassignRoom={handleUnassignRoom}
          onShowAssignment={() => setShowRoomAssignment(true)}
          onHideAssignment={() => setShowRoomAssignment(false)}
          mutations={{
            safeAssignMutation,
            unassignMutation
          }}
        />
        
        {/* Check-In Section */}
        <BookingDetailsCheckinSection 
          booking={booking}
          onCheckIn={handleCheckIn}
          onShowRoomAssignment={() => setShowRoomAssignment(true)}
          checkInMutation={checkInMutation}
        />

        {/* Check-Out Section */}
        <BookingDetailsCheckoutSection 
          booking={booking}
          onCheckOut={handleCheckOut}
          checkOutMutation={checkOutMutation}
        />
        
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
    
    {/* Overstay Action Modals */}
      
      <StaffConfirmationModal
        show={showExtendModal}
        title="Extend Stay"
        style={{ zIndex: 1060 }}
        message={
          <>
            <div className="mb-3 text-center">
              Extend stay for booking <strong>{booking?.booking_id}</strong>
            </div>
            
            <Form>
              <Form.Group className="mb-3">
                <Form.Check
                  type="radio"
                  name="extendMode"
                  id="extendModeNights"
                  label="Add additional nights"
                  checked={extendMode === 'nights'}
                  onChange={() => {
                    setExtendMode('nights');
                    setExtendValidationError('');
                    setExtendConflictError(null);
                  }}
                />
                {extendMode === 'nights' && (
                  <div className="mt-2 ms-4">
                    <div className="d-flex align-items-center">
                      <Button 
                        variant="outline-secondary" 
                        size="sm" 
                        onClick={() => setExtendNights(Math.max(1, extendNights - 1))}
                        disabled={extendNights <= 1}
                      >
                        -
                      </Button>
                      <span className="mx-3 fw-bold">{extendNights} night{extendNights !== 1 ? 's' : ''}</span>
                      <Button 
                        variant="outline-secondary" 
                        size="sm" 
                        onClick={() => setExtendNights(Math.min(14, extendNights + 1))}
                        disabled={extendNights >= 14}
                      >
                        +
                      </Button>
                    </div>
                    <Form.Text className="text-muted">Choose 1-14 additional nights</Form.Text>
                  </div>
                )}
              </Form.Group>
              
              <Form.Group className="mb-3">
                <Form.Check
                  type="radio"
                  name="extendMode"
                  id="extendModeDate"
                  label="Pick new checkout date"
                  checked={extendMode === 'date'}
                  onChange={() => {
                    setExtendMode('date');
                    setExtendValidationError('');
                    setExtendConflictError(null);
                  }}
                />
                {extendMode === 'date' && (
                  <div className="mt-2 ms-4">
                    <Form.Control
                      type="date"
                      value={extendDate}
                      onChange={(e) => {
                        setExtendDate(e.target.value);
                        setExtendValidationError('');
                        setExtendConflictError(null);
                      }}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                )}
              </Form.Group>
            </Form>
            
            {extendValidationError && (
              <Alert variant="danger" className="mt-2">
                {extendValidationError}
              </Alert>
            )}
            
            {extendConflictError && (
              <Alert variant="warning" className="mt-2">
                <Alert.Heading>Room Conflict Detected</Alert.Heading>
                <p>{extendConflictError.detail}</p>
                
                {extendConflictError.conflicts && extendConflictError.conflicts.length > 0 ? (
                  <>
                    <p><strong>Conflicting bookings:</strong></p>
                    <ul className="mb-3">
                      {extendConflictError.conflicts.map((conflict, index) => (
                        <li key={index}>
                          <strong>{conflict.booking_id}</strong> in Room {conflict.room_number} 
                          ({new Date(conflict.start_date).toLocaleDateString()} - {new Date(conflict.end_date).toLocaleDateString()})
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-muted">No specific conflict details available.</p>
                )}
                
                {extendConflictError.suggested_rooms && extendConflictError.suggested_rooms.length > 0 ? (
                  <>
                    <p><strong>Suggested alternative rooms:</strong></p>
                    <ul className="mb-3">
                      {extendConflictError.suggested_rooms.map((room, index) => (
                        <li key={index}>
                          Room {room.room_number} ({room.room_type})
                        </li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="text-muted">No room suggestions available.</p>
                )}
                
                <div className="d-flex gap-2 mt-3">
                  <Button 
                    variant="outline-secondary" 
                    size="sm"
                    onClick={() => {
                      setShowExtendModal(false);
                      setExtendConflictError(null);
                    }}
                  >
                    Close (Handle Manually)
                  </Button>
                  {/* TODO: Add Room Move flow if available */}
                </div>
                
                <p className="text-muted mt-2 mb-0">
                  <small>Consider assigning the guest to a different room or handling the conflict manually.</small>
                </p>
              </Alert>
            )}
          </>
        }
        confirmText={isExtending ? 'Extending...' : 'Extend Stay'}
        confirmVariant="primary"
        onConfirm={handleExtendStay}
        onCancel={() => setShowExtendModal(false)}
      />
    </>
  );
};

export default BookingDetailsModal;
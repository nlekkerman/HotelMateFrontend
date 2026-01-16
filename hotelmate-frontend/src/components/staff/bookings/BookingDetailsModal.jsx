import React, { useState, useEffect } from 'react';
import { Modal, Button, Spinner, Alert, Card, Badge, Form, Row, Col, OverlayTrigger, Tooltip } from 'react-bootstrap';
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

/**
 * Canonical Booking Details Modal Component
 * Features room assignment, check-in, and flags-driven actions
 */
const BookingDetailsModal = ({ show, onClose, bookingId, hotelSlug }) => {
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [showRoomAssignment, setShowRoomAssignment] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState('');
  
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
  
  const renderPrecheckinSummary = () => {
    const isComplete = booking?.precheckin_submitted_at != null;
    
    // Debug logging to verify canonical contract compliance
    console.log('🔍 [CANONICAL CONTRACT] Booking detail response:', {
      booking_id: booking?.booking_id,
      adults: booking?.adults,
      children: booking?.children,
      party_complete: booking?.party_complete,
      party_missing_count: booking?.party_missing_count,
      party_total_count: booking?.party?.total_count,
      precheckin_submitted_at: booking?.precheckin_submitted_at,
      has_precheckin_payload: !!booking?.precheckin_payload,
      has_party_primary: !!booking?.party?.primary,
      has_party_primary_precheckin: !!booking?.party?.primary?.precheckin_payload
    });
    
    // EXPANDED DEBUG: Check individual precheckin payload data
    console.log('🔬 [PRECHECKIN PAYLOAD DEBUG] Detailed breakdown:');
    console.log('Booking-level precheckin_payload:', booking?.precheckin_payload);
    console.log('Primary guest precheckin_payload:', booking?.party?.primary?.precheckin_payload);
    console.log('Primary guest nationality:', booking?.party?.primary?.precheckin_payload?.nationality);
    
    if (booking?.party?.companions) {
      booking.party.companions.forEach((companion, index) => {
        console.log(`Companion ${index + 1} precheckin_payload:`, companion.precheckin_payload);
        console.log(`Companion ${index + 1} nationality:`, companion.precheckin_payload?.nationality);
      });
    }
    
    // Check if any precheckin data exists anywhere
    const hasAnyPrecheckinData = !!(
      booking?.precheckin_payload && Object.keys(booking.precheckin_payload).length > 0 ||
      booking?.party?.primary?.precheckin_payload && Object.keys(booking.party.primary.precheckin_payload).length > 0 ||
      booking?.party?.companions?.some(c => c.precheckin_payload && Object.keys(c.precheckin_payload).length > 0)
    );
    console.log('🚨 [DATA CHECK] Has ANY precheckin data?', hasAnyPrecheckinData);
    
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
        <p><strong>Submitted:</strong> {format(new Date(booking.precheckin_submitted_at), 'MMM dd, yyyy HH:mm')}</p>
        
        {/* Booking-level data */}
        <h6>Booking Information:</h6>
        {booking.precheckin_payload && Object.keys(booking.precheckin_payload).length > 0 ? (
          <ul>
            {Object.entries(booking.precheckin_payload).map(([key, value]) => (
              <li key={key}>
                <strong>{key.replace(/_/g, ' ')}:</strong> {
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
            {(() => {
              const primary = booking.party?.primary;
              const guestFields = ['nationality', 'country_of_residence', 'date_of_birth', 'id_document_type', 'id_document_number', 'address_line_1', 'city', 'postcode', 'postal_code'];
              const hasGuestData = guestFields.some(field => primary?.[field]);
              const hasPayloadData = primary?.precheckin_payload && Object.keys(primary.precheckin_payload).length > 0;
              
              if (hasGuestData || hasPayloadData) {
                return (
                  <ul>
                    {/* Direct guest fields */}
                    {guestFields.map(field => {
                      if (primary?.[field]) {
                        return <li key={field}><strong>{field.replace(/_/g, ' ')}:</strong> {primary[field]}</li>;
                      }
                      return null;
                    })}
                    {/* Legacy precheckin_payload fields */}
                    {hasPayloadData && Object.entries(primary.precheckin_payload).map(([key, value]) => (
                      <li key={key}><strong>{key.replace(/_/g, ' ')}:</strong> {value || '—'}</li>
                    ))}
                  </ul>
                );
              }
              return <p className="text-muted">No pre-check-in data for primary guest.</p>;
            })()}
          </Col>
          <Col md={6}>
            {booking.party?.companions && booking.party.companions.length > 0 ? (
              booking.party.companions.map((companion, index) => {
                const guestFields = ['nationality', 'country_of_residence', 'date_of_birth', 'id_document_type', 'id_document_number', 'address_line_1', 'city', 'postcode', 'postal_code'];
                const hasGuestData = guestFields.some(field => companion?.[field]);
                const hasPayloadData = companion.precheckin_payload && Object.keys(companion.precheckin_payload).length > 0;
                
                return (
                  <div key={companion.id || index} className="mb-2">
                    <strong>Companion {index + 1}:</strong> {companion.first_name} {companion.last_name}
                    {hasGuestData || hasPayloadData ? (
                      <ul>
                        {/* Direct guest fields */}
                        {guestFields.map(field => {
                          if (companion?.[field]) {
                            return <li key={field}><strong>{field.replace(/_/g, ' ')}:</strong> {companion[field]}</li>;
                          }
                          return null;
                        })}
                        {/* Legacy precheckin_payload fields */}
                        {hasPayloadData && Object.entries(companion.precheckin_payload).map(([key, value]) => (
                          <li key={key}><strong>{key.replace(/_/g, ' ')}:</strong> {value || '—'}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted small">No pre-check-in data.</p>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-muted">No companions.</p>
            )}
          </Col>
        </Row>
      </Alert>
    );
  };

  const renderSurveyStatus = () => {
    // Check if booking is eligible (COMPLETED status)
    if (booking?.status !== 'COMPLETED') {
      return (
        <Alert variant="secondary">
          <Alert.Heading>— Survey</Alert.Heading>
          <p>Survey will be available after checkout.</p>
        </Alert>
      );
    }

    const surveyScheduledAt = booking?.survey_send_at;
    const surveySentAt = booking?.survey_sent_at;
    const surveyCompleted = booking?.survey_completed;
    const surveyResponse = booking?.survey_response;
    const surveyLastSentTo = booking?.survey_last_sent_to;

    // State 5: Completed
    if (surveyCompleted) {
      const surveyResponse = booking?.survey_response;
      const surveyPayload = surveyResponse?.payload;
      const submittedAt = surveyResponse?.submitted_at;
      const overallRating = surveyResponse?.overall_rating || booking?.survey_rating;

      // Debug logging to see what survey data we have
      console.log('🔍 Survey Response Debug:', {
        surveyResponse,
        surveyPayload, 
        overallRating,
        bookingSurveyRating: booking?.survey_rating
      });

      return (
        <Alert variant="success">
          <Alert.Heading>✅ Survey completed</Alert.Heading>
          {submittedAt ? (
            <p><strong>Submitted:</strong> {format(new Date(submittedAt), 'MMM dd, yyyy HH:mm')}</p>
          ) : surveySentAt && (
            <p><strong>Completed after:</strong> {format(new Date(surveySentAt), 'MMM dd, yyyy HH:mm')}</p>
          )}
          {overallRating && (
            <p><strong>Overall rating:</strong> {overallRating}/5</p>
          )}
          
          {/* Survey Response Information */}
          <h6>Survey Information</h6>
          {surveyPayload && Object.keys(surveyPayload).length > 0 ? (
            // Expected structure: survey_response.payload contains all fields
            <ul>
              {Object.entries(surveyPayload).map(([key, value]) => {
                // Skip if value is null/empty
                if (value == null || value === '') return null;
                
                return (
                  <li key={key}>
                    <strong>{key.replace(/_/g, ' ')}:</strong> {
                      (key.includes('_rating') || key === 'overall_rating') && value ? `${value}/5` :
                      key === 'contact_permission' ? (value ? '✅ Yes' : '❌ No') :
                      key === 'recommend_hotel' ? (value ? '✅ Yes' : '❌ No') :
                      typeof value === 'boolean' ? (value ? '✅ Yes' : '❌ No') : 
                      value
                    }
                  </li>
                );
              })}
            </ul>
          ) : surveyResponse && Object.keys(surveyResponse).length > 0 ? (
            // Fallback: if no payload, try to display response fields directly
            <ul>
              {Object.entries(surveyResponse).map(([key, value]) => {
                // Skip internal fields and already displayed fields
                if (['submitted_at', 'overall_rating'].includes(key) || value == null || value === '') return null;
                
                return (
                  <li key={key}>
                    <strong>{key.replace(/_/g, ' ')}:</strong> {
                      (key.includes('_rating') || key === 'overall_rating') && value ? `${value}/5` :
                      key === 'contact_permission' ? (value ? '✅ Yes' : '❌ No') :
                      key === 'recommend_hotel' ? (value ? '✅ Yes' : '❌ No') :
                      typeof value === 'boolean' ? (value ? '✅ Yes' : '❌ No') : 
                      value
                    }
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>Survey completed - detailed response data will appear here once backend provides survey_response.payload</p>
          )}
        </Alert>
      );
    }

    // State 4: Sent
    if (surveySentAt) {
      return (
        <Alert variant="info">
          <Alert.Heading>📨 Survey sent</Alert.Heading>
          <p><strong>Sent:</strong> {format(new Date(surveySentAt), 'MMM dd, yyyy HH:mm')}</p>
          {surveyLastSentTo && (
            <p><strong>Sent to:</strong> {surveyLastSentTo}</p>
          )}
        </Alert>
      );
    }

    // State 3: Scheduled
    if (surveyScheduledAt) {
      return (
        <Alert variant="warning">
          <Alert.Heading>🕒 Survey scheduled</Alert.Heading>
          <p><strong>Scheduled:</strong> {format(new Date(surveyScheduledAt), 'MMM dd, yyyy HH:mm')}</p>
        </Alert>
      );
    }

    // State 2: Eligible but not scheduled/sent
    return (
      <Alert variant="secondary">
        <Alert.Heading>⏳ Survey not scheduled</Alert.Heading>
        <p>Survey is eligible to be sent but has not been scheduled.</p>
      </Alert>
    );
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
  
  const renderPrimaryGuest = () => {
    const party = booking?.party;
    let primaryGuest = null;
    
    // Use party.primary if available, fallback to primary_* fields
    if (party?.primary) {
      primaryGuest = party.primary;
    } else if (booking?.primary_first_name || booking?.primary_last_name) {
      primaryGuest = {
        first_name: booking.primary_first_name,
        last_name: booking.primary_last_name,
        full_name: `${booking.primary_first_name || ''} ${booking.primary_last_name || ''}`.trim(),
        email: booking.primary_email,
        phone: booking.primary_phone
      };
    }
    
    if (!primaryGuest) {
      return (
        <Card className="mt-3">
          <Card.Header>
            <h6 className="mb-0">Primary Guest</h6>
          </Card.Header>
          <Card.Body>
            <div className="text-muted">Not provided yet</div>
          </Card.Body>
        </Card>
      );
    }
    
    return (
      <Card className="mt-3">
        <Card.Header>
          <h6 className="mb-0">Primary Guest</h6>
        </Card.Header>
        <Card.Body>
          <div>
            <strong>{primaryGuest.full_name || `${primaryGuest.first_name || ''} ${primaryGuest.last_name || ''}`.trim()}</strong>
            {primaryGuest.email && (
              <div className="text-muted">Email: {primaryGuest.email}</div>
            )}
            {primaryGuest.phone && (
              <div className="text-muted">Phone: {primaryGuest.phone}</div>
            )}
          </div>
        </Card.Body>
      </Card>
    );
  };
  
  const renderBooker = () => {
    const hasBooker = booking?.booker_first_name || booking?.booker_last_name || booking?.booker_email;
    
    if (!hasBooker || booking?.booker_type === 'SELF') {
      return null; // Don't show booker section if it's self-booking or no booker data
    }
    
    return (
      <Card className="mt-3">
        <Card.Header>
          <h6 className="mb-0">Booker</h6>
        </Card.Header>
        <Card.Body>
          <div>
            <strong>{booking.booker_first_name} {booking.booker_last_name}</strong>
            {booking.booker_email && (
              <div className="text-muted">Email: {booking.booker_email}</div>
            )}
            {booking.booker_company && (
              <div className="text-muted">Company: {booking.booker_company}</div>
            )}
          </div>
        </Card.Body>
      </Card>
    );
  };
  
  const renderCompanions = () => {
    const companions = booking?.party?.companions || [];
    const totalPartySize = booking?.party?.total_count;
    
    if (companions.length === 0 && !totalPartySize) {
      return null;
    }
    
    return (
      <Card className="mt-3">
        <Card.Header>
          <h6 className="mb-0">
            Booking Party
            {totalPartySize && (
              <span className="text-muted ms-2">({totalPartySize} guests total)</span>
            )}
          </h6>
        </Card.Header>
        <Card.Body>
          {companions.length > 0 ? (
            <div>
              <strong>Companions:</strong>
              {companions.map((companion, index) => (
                <div key={index} className="ms-2 mt-1">
                  • {companion.full_name || `${companion.first_name || ''} ${companion.last_name || ''}`.trim()}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-muted">No companions added yet</div>
          )}
        </Card.Body>
      </Card>
    );
  };
  
  const renderRoomAssignmentSection = () => {
    const flags = booking?.flags || {};
    
    // Debug: Check what room assignment fields are available
    console.log('🏨 Room assignment debug:', {
      booking,
      assigned_room: booking?.assigned_room,
      room: booking?.room,
      room_number: booking?.room_number,
      room_assigned_at: booking?.room_assigned_at,
      allBookingKeys: booking ? Object.keys(booking) : null
    });
    
    if (booking?.assigned_room || booking?.room) {
      // Room is assigned
      const assignedRoom = booking?.assigned_room || booking?.room;
      console.log('🔧 Rendering assigned room section:', {
        showRoomAssignment,
        assignedRoomNumber: assignedRoom?.room_number,
        booking: booking?.booking_id
      });
      
      return (
        <Card className="mt-3">
          <Card.Header>
            <h6 className="mb-0">Room Assignment</h6>
          </Card.Header>
          <Card.Body>
            {!showRoomAssignment ? (
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <strong>Room {assignedRoom?.room_number}</strong>
                  <br />
                  {booking?.room_assigned_at && (
                    <small className="text-muted">
                      Assigned on {format(new Date(booking.room_assigned_at), 'MMM dd, yyyy HH:mm')}
                    </small>
                  )}
                </div>
                <div className="d-flex gap-2">
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
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => {
                      console.log('🔧 Change Room button clicked!');
                      console.log('🔧 Current showRoomAssignment:', showRoomAssignment);
                      console.log('🔧 Booking status:', {
                        checked_in_at: booking?.checked_in_at,
                        checked_out_at: booking?.checked_out_at,
                        isInHouse: !!booking.checked_in_at && !booking.checked_out_at
                      });
                      
                      setReason('');
                      setReasonError('');
                      setShowRoomAssignment(true);
                      
                      console.log('🔧 Set showRoomAssignment to true');
                    }}
                    disabled={!!booking?.checked_out_at}
                  >
                    {(() => {
                      if (booking?.checked_out_at) return 'Cannot Change (Checked Out)';
                      const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
                      return isInHouse ? 'Move Room' : 'Reassign Room';
                    })()}
                  </Button>
                </div>
              </div>
            ) : (
              /* Room assignment form - shown when showRoomAssignment is true */
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
                    {(() => {
                      // Handle API response structure: { available_rooms: [...] }
                      let roomsArray = [];
                      
                      if (Array.isArray(availableRooms)) {
                        // Direct array format
                        roomsArray = availableRooms;
                      } else if (availableRooms?.available_rooms && Array.isArray(availableRooms.available_rooms)) {
                        // API format: { available_rooms: [...] }
                        roomsArray = availableRooms.available_rooms;
                      }
                      
                      return roomsArray.map(room => (
                        <option key={room.id} value={room.id}>
                          Room {room.room_number} - {room.room_type}
                        </option>
                      ));
                    })()}
                  </Form.Select>
                </Form.Group>
                
                {/* Reason field - only show for in-house guests (Move Room mode) */}
                {(() => {
                  const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
                  if (!isInHouse) return null;
                  
                  return (
                    <Form.Group className="mb-3">
                      <Form.Label>Reason for Move <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        value={reason}
                        onChange={(e) => {
                          setReason(e.target.value);
                          if (e.target.value.trim()) setReasonError('');
                        }}
                        placeholder="Why is this guest being moved? (e.g., guest complaint, maintenance issue, upgrade)"
                        isInvalid={!!reasonError}
                      />
                      {reasonError && (
                        <Form.Control.Feedback type="invalid">
                          {reasonError}
                        </Form.Control.Feedback>
                      )}
                    </Form.Group>
                  );
                })()}
                
                <Form.Group className="mb-3">
                  <Form.Label>
                    {(() => {
                      const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
                      return isInHouse ? 'Additional Notes (Optional)' : 'Assignment Notes (Optional)';
                    })()}
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={assignmentNotes}
                    onChange={(e) => setAssignmentNotes(e.target.value)}
                    placeholder={(() => {
                      const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
                      return isInHouse 
                        ? "Any additional notes, compensation offered, etc..." 
                        : "Add any notes about this room assignment...";
                    })()}
                  />
                </Form.Group>
                
                <div className="d-flex gap-2">
                  {(() => {
                    const partyComplete = booking?.party_complete ?? true; // Default to true if not present
                    const partyMissingCount = booking?.party_missing_count; // NO fallback
                    const isPartyIncomplete = !partyComplete;
                    const isDisabled = !selectedRoomId || safeAssignMutation.isPending || isPartyIncomplete;
                    
                    const button = (
                      <Button
                        variant="success"
                        onClick={handleAssignRoom}
                        disabled={isDisabled}
                        className={isPartyIncomplete ? 'party-gated-button' : ''}
                      >
                        {(() => {
                          if (safeAssignMutation.isPending) {
                            const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
                            return isInHouse ? 'Moving...' : 'Assigning...';
                          }
                          
                          const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
                          return isInHouse ? 'Confirm & Move' : 'Confirm & Reassign';
                        })()}
                      </Button>
                    );
                    
                    if (isPartyIncomplete) {
                      return (
                        <OverlayTrigger
                          placement="top"
                          overlay={
                            <Tooltip>
                              Missing {partyMissingCount == null ? '—' : partyMissingCount} guest name(s). Send pre-check-in link first.
                            </Tooltip>
                          }
                        >
                          <span className="d-inline-block">{button}</span>
                        </OverlayTrigger>
                      );
                    }
                    
                    return button;
                  })()}
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
    } else {
      // No room assigned - always show if showRoomAssignment is true (triggered from check-in)
      if (!flags.can_assign_room && !showRoomAssignment) return null;
      
      return (
        <Card className="mt-3">
          <Card.Header>
            <h6 className="mb-0">Room Assignment</h6>
          </Card.Header>
          <Card.Body>
            {!showRoomAssignment ? (
              (() => {
                const partyComplete = booking?.party_complete ?? true; // Default to true if not present
                const partyMissingCount = booking?.party_missing_count; // NO fallback
                const isDisabled = !partyComplete;
                
                const button = (
                  <Button
                    variant="primary"
                    onClick={() => {
                      setReason('');
                      setReasonError('');
                      setShowRoomAssignment(true);
                    }}
                    disabled={isDisabled || !!booking?.checked_out_at}
                    className={isDisabled ? 'party-gated-button' : ''}
                  >
                    {(() => {
                      if (booking?.checked_out_at) return 'Cannot Assign (Checked Out)';
                      const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
                      return isInHouse ? 'Move Room' : 'Assign Room';
                    })()}
                  </Button>
                );
                
                if (isDisabled) {
                  return (
                    <OverlayTrigger
                      placement="top"
                      overlay={
                        <Tooltip>
                          Missing {partyMissingCount == null ? '—' : partyMissingCount} guest name(s). Send pre-check-in link first.
                        </Tooltip>
                      }
                    >
                      <span className="d-inline-block">{button}</span>
                    </OverlayTrigger>
                  );
                }
                
                return button;
              })()
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
                    {(() => {
                      // Handle API response structure: { available_rooms: [...] }
                      let roomsArray = [];
                      
                      if (Array.isArray(availableRooms)) {
                        // Direct array format
                        roomsArray = availableRooms;
                      } else if (availableRooms?.available_rooms && Array.isArray(availableRooms.available_rooms)) {
                        // API format: { available_rooms: [...] }
                        roomsArray = availableRooms.available_rooms;
                      }
                      
                      return roomsArray.map(room => (
                        <option key={room.id} value={room.id}>
                          Room {room.room_number} - {room.room_type}
                        </option>
                      ));
                    })()}
                  </Form.Select>
                </Form.Group>
                
                {/* Reason field - only show for in-house guests (Move Room mode) */}
                {(() => {
                  const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
                  if (!isInHouse) return null;
                  
                  return (
                    <Form.Group className="mb-3">
                      <Form.Label>Reason for Move <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        value={reason}
                        onChange={(e) => {
                          setReason(e.target.value);
                          if (e.target.value.trim()) setReasonError('');
                        }}
                        placeholder="Why is this guest being moved? (e.g., guest complaint, maintenance issue, upgrade)"
                        isInvalid={!!reasonError}
                      />
                      {reasonError && (
                        <Form.Control.Feedback type="invalid">
                          {reasonError}
                        </Form.Control.Feedback>
                      )}
                    </Form.Group>
                  );
                })()}
                
                <Form.Group className="mb-3">
                  <Form.Label>
                    {(() => {
                      const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
                      return isInHouse ? 'Additional Notes (Optional)' : 'Assignment Notes (Optional)';
                    })()}
                  </Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={assignmentNotes}
                    onChange={(e) => setAssignmentNotes(e.target.value)}
                    placeholder={(() => {
                      const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
                      return isInHouse 
                        ? "Any additional notes, compensation offered, etc..." 
                        : "Add any notes about this room assignment...";
                    })()}
                  />
                </Form.Group>
                
                <div className="d-flex gap-2">
                  {(() => {
                    const partyComplete = booking?.party_complete ?? true; // Default to true if not present
                    const partyMissingCount = booking?.party_missing_count; // NO fallback
                    const isPartyIncomplete = !partyComplete;
                    const isDisabled = !selectedRoomId || safeAssignMutation.isPending || isPartyIncomplete;
                    
                    const button = (
                      <Button
                        variant="success"
                        onClick={handleAssignRoom}
                        disabled={isDisabled}
                        className={isPartyIncomplete ? 'party-gated-button' : ''}
                      >
                        {(() => {
                          if (safeAssignMutation.isPending) {
                            const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
                            return isInHouse ? 'Moving...' : 'Assigning...';
                          }
                          
                          const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
                          return isInHouse ? 'Confirm & Move' : 'Confirm & Assign';
                        })()}
                      </Button>
                    );
                    
                    if (isPartyIncomplete) {
                      return (
                        <OverlayTrigger
                          placement="top"
                          overlay={
                            <Tooltip>
                              Missing {partyMissingCount == null ? '—' : partyMissingCount} guest name(s). Send pre-check-in link first.
                            </Tooltip>
                          }
                        >
                          <span className="d-inline-block">{button}</span>
                        </OverlayTrigger>
                      );
                    }
                    
                    return button;
                  })()}
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
    const assignedRoom = booking?.assigned_room || booking?.room;
    
    if (booking?.checked_in_at) return null;
    
    return (
      <Card className="mt-3">
        <Card.Header>
          <h6 className="mb-0">Check-In</h6>
        </Card.Header>
        <Card.Body>
          {!assignedRoom ? (
            <div>
              <p className="text-muted mb-3">Room assignment required before check-in.</p>
              <Button
                variant="warning"
                onClick={() => {
                  console.log('Assign Room First clicked, setting showRoomAssignment to true');
                  setShowRoomAssignment(true);
                }}
              >
                Assign Room First
              </Button>
            </div>
          ) : (
            <div>
              <p className="text-success mb-3">✅ Ready to check in to Room {assignedRoom.room_number}</p>
              <Button
                variant="success"
                onClick={handleCheckIn}
                disabled={checkInMutation.isPending || (booking?.flags?.can_check_in === false)}
                size="lg"
              >
                {checkInMutation.isPending ? 'Checking In...' : 'Check In Guest'}
              </Button>
            </div>
          )}
        </Card.Body>
      </Card>
    );
  };

  const renderCheckOutSection = () => {
    // TASK D: Use checked_in_at/checked_out_at logic instead of status
    const isInHouse = !!booking?.checked_in_at && !booking?.checked_out_at;
    
    if (!isInHouse) return null;
    
    return (
      <Card className="mt-3">
        <Card.Header>
          <h6 className="mb-0">Check-Out</h6>
        </Card.Header>
        <Card.Body>
          <div>
            <p className="text-info mb-3">✅ Guest is checked in to Room {booking?.assigned_room_number || booking?.assigned_room?.room_number}</p>
            <Button
              variant="warning"
              onClick={handleCheckOut}
              disabled={checkOutMutation.isPending}
              size="lg"
            >
              {checkOutMutation.isPending ? 'Checking Out...' : 'Check Out Guest'}
            </Button>
          </div>
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
        
        {/* Party Status Banner */}
        {renderPartyStatusBanner()}
        
        {/* Pre-Check-In Summary Section */}
        <Card className="mb-3" data-precheckin-summary>
          <Card.Header>
            <h5 className="mb-0">
              <i className="bi bi-clipboard-check me-2"></i>
              Pre-Check-In Status
            </h5>
          </Card.Header>
          <Card.Body>
            {renderPrecheckinSummary()}
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
            {renderSurveyStatus()}
          </Card.Body>
        </Card>
        
        {/* Primary Guest */}
        {renderPrimaryGuest()}
        
        {/* Booker */}
        {renderBooker()}
        
        {/* Companions */}
        {renderCompanions()}
        
        {/* Room Assignment Section */}
        {renderRoomAssignmentSection()}
        
        {/* Check-In Section */}
        {renderCheckInSection()}

        {/* Check-Out Section */}
        {renderCheckOutSection()}
        
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
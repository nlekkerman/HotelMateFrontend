import React from 'react';
import { Alert, Row, Col } from 'react-bootstrap';
import { format } from 'date-fns';

const BookingDetailsPrecheckinSummary = ({ booking }) => {
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

export default BookingDetailsPrecheckinSummary;
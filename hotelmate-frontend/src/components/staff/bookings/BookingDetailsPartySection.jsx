import React from 'react';
import { Card } from 'react-bootstrap';
import { format } from 'date-fns';

const BookingDetailsPartySection = ({ booking }) => {
  const renderPrimaryGuest = () => {
    if (!booking?.party?.primary) {
      return (
        <Card className="mt-3">
          <Card.Header>
            <h6 className="mb-0">Primary Guest</h6>
          </Card.Header>
          <Card.Body>
            <div className="text-muted">No primary guest information available</div>
          </Card.Body>
        </Card>
      );
    }

    const primary = booking.party.primary;
    const precheckinPayload = primary.precheckin_payload;

    return (
      <Card className="mt-3">
        <Card.Header>
          <h6 className="mb-0">Primary Guest</h6>
        </Card.Header>
        <Card.Body>
          <div><strong>Name:</strong> {primary.first_name} {primary.last_name}</div>
          <div><strong>Email:</strong> {primary.email}</div>
          {primary.phone && <div><strong>Phone:</strong> {primary.phone}</div>}
          {precheckinPayload?.nationality && (
            <div><strong>Nationality:</strong> {precheckinPayload.nationality}</div>
          )}
          {precheckinPayload?.date_of_birth && (
            <div><strong>Date of Birth:</strong> {format(new Date(precheckinPayload.date_of_birth), 'MMM dd, yyyy')}</div>
          )}
        </Card.Body>
      </Card>
    );
  };

  const renderBooker = () => {
    if (!booking?.party?.booker || booking.party.booker.email === booking?.party?.primary?.email) {
      return null;
    }

    const booker = booking.party.booker;
    
    return (
      <Card className="mt-3">
        <Card.Header>
          <h6 className="mb-0">Booker (Third Party)</h6>
        </Card.Header>
        <Card.Body>
          <div><strong>Name:</strong> {booker.first_name} {booker.last_name}</div>
          <div><strong>Email:</strong> {booker.email}</div>
          {booker.phone && <div><strong>Phone:</strong> {booker.phone}</div>}
        </Card.Body>
      </Card>
    );
  };

  const renderCompanions = () => {
    if (!booking?.party?.companions || booking.party.companions.length === 0) {
      return null;
    }

    return (
      <Card className="mt-3">
        <Card.Header>
          <h6 className="mb-0">Companions ({booking.party.companions.length})</h6>
        </Card.Header>
        <Card.Body>
          {booking.party.companions.map((companion, index) => (
            <div key={index} className={index > 0 ? 'mt-2 pt-2 border-top' : ''}>
              <div><strong>Name:</strong> {companion.first_name} {companion.last_name}</div>
              {companion.email && <div><strong>Email:</strong> {companion.email}</div>}
              {companion.phone && <div><strong>Phone:</strong> {companion.phone}</div>}
            </div>
          ))}
        </Card.Body>
      </Card>
    );
  };

  return (
    <>
      {renderPrimaryGuest()}
      {renderBooker()}
      {renderCompanions()}
    </>
  );
};

export default BookingDetailsPartySection;
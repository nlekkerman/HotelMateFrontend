import React from 'react';
import { Card, Badge } from 'react-bootstrap';

const BookingContactCard = ({ bookingContact }) => {
  if (!bookingContact) return null;
  
  return (
    <Card className="shadow-sm mb-4">
      <Card.Header className="bg-light">
        <div className="d-flex justify-content-between align-items-center">
          <h6 className="mb-0">Booking Contact</h6>
          <Badge bg={bookingContact.isPrimary ? 'success' : 'info'}>
            {bookingContact.badge}
          </Badge>
        </div>
      </Card.Header>
      <Card.Body>
        <div className="mb-2">
          <strong>{bookingContact.name}</strong>
        </div>
        {bookingContact.email && (
          <div className="text-muted small mb-1">
            <i className="bi bi-envelope me-2"></i>
            {bookingContact.email}
          </div>
        )}
        {bookingContact.phone && (
          <div className="text-muted small">
            <i className="bi bi-phone me-2"></i>
            {bookingContact.phone}
          </div>
        )}
        <small className="text-muted d-block mt-2">
          <i className="bi bi-info-circle me-1"></i>
          This information cannot be changed during pre-check-in
        </small>
      </Card.Body>
    </Card>
  );
};

export default BookingContactCard;
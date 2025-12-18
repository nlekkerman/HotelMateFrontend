import React from 'react';
import { Card, Row, Col, Badge } from 'react-bootstrap';

const PrecheckinHeader = ({ booking, expectedGuests, missingCount }) => {
  if (!booking) return null;
  
  return (
    <Card className="shadow-sm mb-4">
      <Card.Body>
        <Row className="align-items-center">
          <Col>
            <h6 className="mb-1">Booking #{booking.booking_id}</h6>
            <div className="text-muted small">
              {booking.check_in && booking.check_out && (
                <span>{booking.check_in} - {booking.check_out}</span>
              )}
              {expectedGuests && (
                <span className="ms-3">{expectedGuests} guest(s) expected</span>
              )}
            </div>
            {missingCount > 0 && (
              <Badge bg="warning" className="mt-2">
                Missing {missingCount} guest name(s)
              </Badge>
            )}
          </Col>
          <Col xs="auto">
            {booking.room_type && (
              <Badge bg="primary">{booking.room_type}</Badge>
            )}
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
};

export default PrecheckinHeader;
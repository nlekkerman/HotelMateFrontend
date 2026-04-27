import React from 'react';
import { Card, Button } from 'react-bootstrap';
import { getAssignedRoomNumber } from '@/utils/bookingDisplayHelpers';
import { useCan } from '@/rbac';

const BookingDetailsCheckoutSection = ({ 
  booking,
  onCheckOut,
  checkOutMutation
}) => {
  // TASK D: Use checked_in_at/checked_out_at logic instead of status
  const isInHouse = !!booking?.checked_in_at && !booking?.checked_out_at;
  // Backend RBAC: check-out action gated by `bookings.checkout`.
  const { can } = useCan();
  const canCheckOut = can('bookings', 'checkout');
  
  if (!isInHouse) return null;
  
  return (
    <Card className="mt-3">
      <Card.Header>
        <h6 className="mb-0">Check-Out</h6>
      </Card.Header>
      <Card.Body>
        <div>
          <p className="text-info mb-3">✅ Guest is checked in to Room {getAssignedRoomNumber(booking) || '—'}</p>
          <Button
            variant="warning"
            onClick={onCheckOut}
            disabled={!canCheckOut || checkOutMutation.isPending}
            size="lg"
          >
            {checkOutMutation.isPending ? 'Checking Out...' : 'Check Out Guest'}
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default BookingDetailsCheckoutSection;
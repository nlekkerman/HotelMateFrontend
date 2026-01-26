import React from 'react';
import { Card, Button } from 'react-bootstrap';

const BookingDetailsCheckinSection = ({ 
  booking, 
  onCheckIn,
  onShowRoomAssignment,
  checkInMutation
}) => {
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
                onShowRoomAssignment();
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
              onClick={onCheckIn}
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

export default BookingDetailsCheckinSection;
import React from 'react';
import { Badge } from 'react-bootstrap';

/**
 * BookingStatusBadges - 3-Badge System for Staff Booking Status
 * Shows: Payment/Admin | Assignment | In-House status
 */
const BookingStatusBadges = ({ booking, size = 'sm' }) => {
  // Badge 1: Payment/Admin Status (from booking.status)
  const getPaymentStatusBadge = () => {
    if (!booking?.status) return null;
    
    const label = booking.status
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
    
    return (
      <Badge bg="secondary" className="me-1">
        {label}
      </Badge>
    );
  };

  // Badge 2: Assignment Status
  const getAssignmentStatusBadge = () => {
    // Check for assigned room in multiple possible fields
    const assignedRoom = booking?.assigned_room;
    const assignedRoomId = booking?.assigned_room_id;
    const assignedRoomNumber = booking?.assigned_room_number;
    
    // Determine if room is assigned
    const isAssigned = assignedRoom || assignedRoomId || assignedRoomNumber;
    
    if (isAssigned) {
      // Try to get room number for display
      let roomNumber = null;
      if (assignedRoom?.room_number) {
        roomNumber = assignedRoom.room_number;
      } else if (assignedRoomNumber) {
        roomNumber = assignedRoomNumber;
      }
      
      const label = roomNumber ? `Assigned Room ${roomNumber}` : 'Assigned';
      
      return (
        <Badge bg="info" className="me-1">
          {label}
        </Badge>
      );
    } else {
      return (
        <Badge bg="warning" text="dark" className="me-1">
          Unassigned
        </Badge>
      );
    }
  };

  // Badge 3: In-House Status (timestamps only)
  const getInHouseStatusBadge = () => {
    const checkedInAt = booking?.checked_in_at;
    const checkedOutAt = booking?.checked_out_at;
    
    if (checkedInAt && !checkedOutAt) {
      return (
        <Badge bg="success" className="me-1">
          In-house
        </Badge>
      );
    } else if (checkedOutAt) {
      return (
        <Badge bg="dark" className="me-1">
          Checked-out
        </Badge>
      );
    } else {
      return (
        <Badge bg="light" text="dark" className="me-1">
          Not arrived
        </Badge>
      );
    }
  };

  if (!booking) return null;

  return (
    <div className="d-flex flex-wrap gap-1">
      {getPaymentStatusBadge()}
      {getAssignmentStatusBadge()}
      {getInHouseStatusBadge()}
    </div>
  );
};

export default BookingStatusBadges;
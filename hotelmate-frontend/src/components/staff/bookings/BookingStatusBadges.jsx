import React from 'react';
import { Badge } from 'react-bootstrap';

// TASK D: Helper functions for in-house logic using checked_in_at/checked_out_at instead of status
const isInHouse = (booking) => !!booking?.checked_in_at && !booking?.checked_out_at;
const isCheckedOut = (booking) => !!booking?.checked_out_at;

/**
 * BookingStatusBadges - 3-Badge System for Staff Booking Status
 * Shows: Payment/Admin | Assignment | In-House status
 */
const BookingStatusBadges = ({ booking }) => {
  if (!booking) return null;

  const status = booking.status;

  const checkedInAt = booking.checked_in_at;
  const checkedOutAt = booking.checked_out_at;

  const roomNumber =
    booking.assigned_room_number ??
    booking.room_number ??
    booking.assigned_room?.room_number ??
    booking.room?.room_number ??
    null;

  // TASK D: Use helper functions instead of direct boolean logic
  const isGuestInHouse = isInHouse(booking);
  const isGuestCheckedOut = isCheckedOut(booking);

  // 1) Primary badge (single)
  let primaryBadge = null;

  if (isGuestCheckedOut) {
    primaryBadge = (
      <Badge bg="dark" className="me-1 text-white">
        {roomNumber ? `Checked-out · Room ${roomNumber}` : 'Checked-out'}
      </Badge>
    );
  } else if (isGuestInHouse) {
    primaryBadge = (
      <Badge bg="success" className="me-1">
        {roomNumber ? `In-house · Room ${roomNumber}` : 'In-house'}
      </Badge>
    );
  } else {
    // Not in-house
    if (roomNumber) {
      primaryBadge = (
        <Badge bg="danger" className="me-1">
          Assigned · Room {roomNumber}
        </Badge>
      );
    } else {
      primaryBadge = (
        <Badge bg="warning" text="dark" className="me-1">
          Unassigned
        </Badge>
      );
    }
  }

  // 2) Optional secondary badge only when it matters
  const showAdminBadge =
    !isInHouse && !isCheckedOut && status && status !== 'CONFIRMED';

  const adminBadge = showAdminBadge ? (
    <Badge bg="secondary" className="me-1">
      {status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
    </Badge>
  ) : null;

  return (
    <div className="d-flex flex-wrap gap-1">
      {primaryBadge}
      {adminBadge}
    </div>
  );
};


export default BookingStatusBadges;
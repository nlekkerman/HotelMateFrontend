import React from 'react';
import { Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useBookingTimeWarnings, logMissingWarningFields, getActiveListWarning } from '@/hooks/useBookingTimeWarnings';

/**
 * Format minutes into human-readable duration
 * Examples: 42 -> "42m", 90 -> "1h 30m", 1462 -> "24h 22m"
 */
function formatMinutesToHuman(minutes) {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}

/**
 * BookingTimeWarningBadges Component
 * Displays NEW badge first for unseen bookings, then SINGLE active warning badge
 * MANDATORY: EXPIRED bookings show NO warning badges (logic gate)
 */
const BookingTimeWarningBadges = ({ booking, showTooltips = true, overstayStatus = null }) => {
  const warnings = useBookingTimeWarnings(booking);

  // Log missing fields in development
  React.useEffect(() => {
    logMissingWarningFields(booking);
  }, [booking]);

  // Check if booking is unseen (NEW badge)
  const isUnseen = !booking?.staff_seen_at || booking?.is_new_for_staff === true;

  const badges = [];

  // 1) NEW badge first if unseen (RED)
  if (isUnseen) {
    const newBadge = (
      <Badge
        key="new"
        bg="danger"
        className="me-1"
        style={{ fontSize: '0.75em' }}
      >
        NEW
      </Badge>
    );

    if (showTooltips) {
      badges.push(
        <OverlayTrigger
          key="new"
          placement="top"
          overlay={
            <Tooltip>
              New booking - not yet seen by staff
            </Tooltip>
          }
        >
          {newBadge}
        </OverlayTrigger>
      );
    } else {
      badges.push(newBadge);
    }
  }

  // 2) Single active warning badge (MANDATORY GATE: no warnings for EXPIRED)
  const activeListWarning = getActiveListWarning(booking, warnings, overstayStatus);
  
  if (activeListWarning) {
    const warningBadge = (
      <Badge
        key="active-warning"
        bg={activeListWarning.variant}
        className="me-1"
        style={{ fontSize: '0.75em' }}
      >
        <i className={`bi ${getWarningIcon(activeListWarning.type)} me-1`}></i>
        {activeListWarning.displayText}
      </Badge>
    );

    if (showTooltips) {
      badges.push(
        <OverlayTrigger
          key="active-warning"
          placement="top"
          overlay={
            <Tooltip>
              {getWarningTooltip(activeListWarning)}
            </Tooltip>
          }
        >
          {warningBadge}
        </OverlayTrigger>
      );
    } else {
      badges.push(warningBadge);
    }
  }

  // Render nothing if no badges to show (graceful degradation)
  if (badges.length === 0) {
    return null;
  }

  return (
    <div className="booking-time-warnings d-flex flex-wrap gap-1">
      {badges}
    </div>
  );
};

/**
 * Get icon for warning type
 */
function getWarningIcon(warningType) {
  switch (warningType) {
    case 'checkout_overstay':
      return 'bi-hourglass-split';
    case 'approval_issue':
      return 'bi-clock';
    default:
      return 'bi-exclamation-triangle';
  }
}

/**
 * Get tooltip text for active warning
 */
function getWarningTooltip(activeListWarning) {
  switch (activeListWarning.type) {
    case 'checkout_overstay':
      return 'Guest should checkout or extend stay';
    case 'approval_issue':
      return 'Staff should approve or decline booking';
    default:
      return 'Warning requires attention';
  }
}

export default BookingTimeWarningBadges;
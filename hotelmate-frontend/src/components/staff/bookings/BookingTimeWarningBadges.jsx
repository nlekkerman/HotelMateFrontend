import React from 'react';
import { Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useBookingTimeWarnings, logMissingWarningFields } from '@/hooks/useBookingTimeWarnings';

/**
 * BookingTimeWarningBadges Component
 * Displays NEW badge first for unseen bookings, then approval and overstay warning badges
 * Integrates with useBookingTimeWarnings hook for real-time updates
 */
const BookingTimeWarningBadges = ({ booking, showTooltips = true }) => {
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

  // 2) Approval warning badge if approval_risk_level != OK AND guest not checked in
  const isCheckedIn = !!booking?.checked_in_at && !booking?.checked_out_at;
  if (booking?.approval_risk_level && booking.approval_risk_level !== 'OK' && !isCheckedIn) {
    let displayText = '';
    let variant = 'warning';

    try {
      switch (booking.approval_risk_level.toUpperCase()) {
        case 'DUE_SOON':
          displayText = 'Approval due soon';
          variant = 'warning';
          break;
        case 'OVERDUE':
          const overdueMinutes = booking.approval_overdue_minutes;
          displayText = overdueMinutes 
            ? `Approval overdue +${overdueMinutes}m`
            : 'Approval overdue';
          variant = 'danger';
          break;
        case 'CRITICAL':
          const criticalMinutes = booking.approval_overdue_minutes;
          displayText = criticalMinutes 
            ? `Approval CRITICAL +${criticalMinutes}m`
            : 'Approval CRITICAL';
          variant = 'danger';
          break;
        default:
          // Dev-only warning for unknown values
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[BookingTimeWarningBadges] Unknown approval_risk_level:', booking.approval_risk_level);
          }
          break;
      }

      if (displayText) {
        const approvalBadge = (
          <Badge
            key="approval"
            bg={variant}
            className="me-1"
            style={{ fontSize: '0.75em' }}
          >
            <i className="bi bi-clock me-1"></i>
            {displayText}
          </Badge>
        );

        if (showTooltips) {
          badges.push(
            <OverlayTrigger
              key="approval"
              placement="top"
              overlay={
                <Tooltip>
                  {displayText}
                </Tooltip>
              }
            >
              {approvalBadge}
            </OverlayTrigger>
          );
        } else {
          badges.push(approvalBadge);
        }
      }
    } catch (error) {
      // Graceful degradation - render nothing, dev warning only
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[BookingTimeWarningBadges] Error processing approval warning:', error);
      }
    }
  }

  // 3) Overstay warning badge if overstay_risk_level != OK
  if (booking?.overstay_risk_level && booking.overstay_risk_level !== 'OK') {
    let displayText = '';
    let variant = 'warning';

    try {
      switch (booking.overstay_risk_level.toUpperCase()) {
        case 'GRACE':
          displayText = 'Checkout grace';
          variant = 'info';
          break;
        case 'OVERDUE':
          const overdueMinutes = booking.overstay_minutes;
          displayText = overdueMinutes 
            ? `Checkout overdue +${overdueMinutes}m`
            : 'Checkout overdue';
          variant = 'warning';
          break;
        case 'CRITICAL':
          const criticalMinutes = booking.overstay_minutes;
          displayText = criticalMinutes 
            ? `Checkout CRITICAL +${criticalMinutes}m`
            : 'Checkout CRITICAL';
          variant = 'danger';
          break;
        default:
          // Dev-only warning for unknown values
          if (process.env.NODE_ENV !== 'production') {
            console.warn('[BookingTimeWarningBadges] Unknown overstay_risk_level:', booking.overstay_risk_level);
          }
          break;
      }

      if (displayText) {
        const overstayBadge = (
          <Badge
            key="overstay"
            bg={variant}
            className="me-1"
            style={{ fontSize: '0.75em' }}
          >
            <i className="bi bi-hourglass-split me-1"></i>
            {displayText}
          </Badge>
        );

        if (showTooltips) {
          badges.push(
            <OverlayTrigger
              key="overstay"
              placement="top"
              overlay={
                <Tooltip>
                  {displayText}
                </Tooltip>
              }
            >
              {overstayBadge}
            </OverlayTrigger>
          );
        } else {
          badges.push(overstayBadge);
        }
      }
    } catch (error) {
      // Graceful degradation - render nothing, dev warning only
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[BookingTimeWarningBadges] Error processing overstay warning:', error);
      }
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
 * Simple inline warning component for compact display
 */
export const InlineBookingWarnings = ({ booking, maxBadges = 2 }) => {
  const warnings = useBookingTimeWarnings(booking);
  
  if (!warnings.approval && !warnings.overstay) {
    return null;
  }

  const items = [];
  
  // Priority order: CRITICAL > OVERDUE > DUE_SOON/GRACE
  if (warnings.approval && warnings.approval.riskLevel !== 'OK') {
    items.push({
      type: 'approval',
      text: warnings.approval.displayText,
      variant: warnings.approval.variant,
      priority: getPriority(warnings.approval.riskLevel)
    });
  }

  if (warnings.overstay && warnings.overstay.riskLevel !== 'OK') {
    items.push({
      type: 'overstay', 
      text: warnings.overstay.displayText,
      variant: warnings.overstay.variant,
      priority: getPriority(warnings.overstay.riskLevel)
    });
  }

  // Sort by priority and limit
  const sortedItems = items
    .sort((a, b) => b.priority - a.priority)
    .slice(0, maxBadges);

  if (sortedItems.length === 0) return null;

  return (
    <div className="inline-booking-warnings">
      {sortedItems.map((item, index) => (
        <Badge
          key={`${item.type}-${index}`}
          bg={item.variant}
          className="me-1"
          style={{ fontSize: '0.7em' }}
        >
          {item.text}
        </Badge>
      ))}
      {items.length > maxBadges && (
        <small className="text-muted">+{items.length - maxBadges} more</small>
      )}
    </div>
  );
};

/**
 * Get numeric priority for sorting warnings
 */
function getPriority(riskLevel) {
  switch (riskLevel) {
    case 'CRITICAL':
      return 4;
    case 'OVERDUE':
      return 3;
    case 'DUE_SOON':
      return 2;
    case 'GRACE':
      return 1;
    default:
      return 0;
  }
}

export default BookingTimeWarningBadges;
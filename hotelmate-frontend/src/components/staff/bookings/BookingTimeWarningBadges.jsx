import React from 'react';
import { Badge, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useBookingTimeWarnings, logMissingWarningFields } from '@/hooks/useBookingTimeWarnings';

/**
 * BookingTimeWarningBadges Component
 * Displays approval and overstay warning badges with tooltips
 * Integrates with useBookingTimeWarnings hook for real-time updates
 */
const BookingTimeWarningBadges = ({ booking, showTooltips = true }) => {
  const warnings = useBookingTimeWarnings(booking);

  // Log missing fields in development
  React.useEffect(() => {
    logMissingWarningFields(booking);
  }, [booking]);

  if (!warnings.approval && !warnings.overstay) {
    return null;
  }

  const badges = [];

  // Approval warning badge
  if (warnings.approval && warnings.approval.displayText) {
    const approvalBadge = (
      <Badge
        key="approval"
        bg={warnings.approval.variant}
        className="me-1"
        style={{ fontSize: '0.75em' }}
      >
        <i className="bi bi-clock me-1"></i>
        {warnings.approval.displayText}
      </Badge>
    );

    if (showTooltips && warnings.approval.tooltipText) {
      badges.push(
        <OverlayTrigger
          key="approval"
          placement="top"
          overlay={
            <Tooltip>
              <div style={{ whiteSpace: 'pre-line' }}>
                {warnings.approval.tooltipText}
              </div>
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

  // Overstay warning badge
  if (warnings.overstay && warnings.overstay.displayText) {
    const overstayBadge = (
      <Badge
        key="overstay"
        bg={warnings.overstay.variant}
        className="me-1"
        style={{ fontSize: '0.75em' }}
      >
        <i className="bi bi-hourglass-split me-1"></i>
        {warnings.overstay.displayText}
      </Badge>
    );

    if (showTooltips && warnings.overstay.tooltipText) {
      badges.push(
        <OverlayTrigger
          key="overstay"
          placement="top"
          overlay={
            <Tooltip>
              <div style={{ whiteSpace: 'pre-line' }}>
                {warnings.overstay.tooltipText}
              </div>
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
import { useState, useEffect, useMemo } from 'react';

/**
 * Hook for managing booking time warnings with local ticking updates
 * Handles approval and overstay warnings without making API calls
 * Updates display text every 30-60 seconds for smooth UI
 */
export const useBookingTimeWarnings = (booking) => {
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Refresh display text every 45 seconds
  useEffect(() => {
    if (!booking) return;

    const interval = setInterval(() => {
      setLastUpdate(Date.now());
    }, 45000); // 45 seconds

    return () => clearInterval(interval);
  }, [booking]);

  const warnings = useMemo(() => {
    if (!booking) return { approval: null, overstay: null };

    const now = new Date(lastUpdate); // Use lastUpdate to trigger recalculation
    
    // Approval warnings for PENDING_APPROVAL bookings
    const approvalWarning = computeApprovalWarning(booking, now);
    
    // Overstay warnings for IN_HOUSE bookings
    const overstayWarning = computeOverstayWarning(booking, now);

    return {
      approval: approvalWarning,
      overstay: overstayWarning
    };
  }, [booking, lastUpdate]);

  return warnings;
};

/**
 * Compute approval warning details
 */
function computeApprovalWarning(booking, now) {
  // Only show approval warnings for guests who are NOT checked in yet
  // Once checked in, overstay logic takes over
  const isCheckedIn = !!booking.checked_in_at && !booking.checked_out_at;
  const shouldShow = !isCheckedIn && (
    booking.status === 'PENDING_APPROVAL' || 
    (booking.approval_risk_level && booking.approval_risk_level !== 'OK')
  );
  
  if (!shouldShow) return null;

  // Use backend fields if available
  const riskLevel = booking.approval_risk_level || 'OK';
  const minutesOverdue = booking.approval_overdue_minutes || 0;

  return {
    riskLevel,
    deadline: booking.approval_deadline_at,
    minutesOverdue: minutesOverdue || 0,
    isDueSoon: booking.is_approval_due_soon || riskLevel === 'DUE_SOON',
    isOverdue: booking.is_approval_overdue || riskLevel === 'OVERDUE' || riskLevel === 'CRITICAL',
    displayText: getApprovalDisplayText(riskLevel, minutesOverdue),
    tooltipText: getApprovalTooltipText(booking.approval_deadline_at, minutesOverdue),
    variant: getRiskVariant(riskLevel)
  };
}

/**
 * Compute overstay warning details
 */
function computeOverstayWarning(booking, now) {
  // Only show for IN_HOUSE bookings or if risk level is not OK
  const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
  const shouldShow = isInHouse || 
                    (booking.overstay_risk_level && booking.overstay_risk_level !== 'OK');
  
  if (!shouldShow) return null;

  // Use backend fields if available
  const riskLevel = booking.overstay_risk_level || 'OK';
  const minutesOverdue = booking.overstay_minutes || 0;

  return {
    riskLevel,
    deadline: booking.checkout_deadline_at,
    minutesOverdue: minutesOverdue || 0,
    isOverstay: booking.is_overstay || riskLevel === 'OVERDUE' || riskLevel === 'CRITICAL',
    displayText: getOverstayDisplayText(riskLevel, minutesOverdue),
    tooltipText: getOverstayTooltipText(booking.checkout_deadline_at, minutesOverdue),
    variant: getRiskVariant(riskLevel),
    flaggedAt: booking.overstay_flagged_at,
    acknowledgedAt: booking.overstay_acknowledged_at
  };
}

/**
 * Get display text for approval warnings
 */
function getApprovalDisplayText(riskLevel, minutesOverdue = 0) {
  switch (riskLevel) {
    case 'DUE_SOON':
      return 'Approval due soon';
    case 'OVERDUE':
      return `Approval overdue +${minutesOverdue}m`;
    case 'CRITICAL':
      return `Approval CRITICAL +${minutesOverdue}m`;
    default:
      return null;
  }
}

/**
 * Get display text for overstay warnings
 */
function getOverstayDisplayText(riskLevel, minutesOverdue = 0) {
  switch (riskLevel) {
    case 'GRACE':
      return 'Checkout grace';
    case 'OVERDUE':
      return `Checkout overdue +${minutesOverdue}m`;
    case 'CRITICAL':
      return `Checkout CRITICAL +${minutesOverdue}m`;
    default:
      return null;
  }
}

/**
 * Get tooltip text for approval warnings
 */
function getApprovalTooltipText(deadline, minutesOverdue) {
  let text = deadline ? `Deadline: ${new Date(deadline).toLocaleString()}` : 'No deadline set';
  
  if (minutesOverdue > 0) {
    text += `\nOverdue by ${minutesOverdue} minutes`;
  }
  
  text += '\nSuggested action: Confirm or Decline booking';
  return text;
}

/**
 * Get tooltip text for overstay warnings
 */
function getOverstayTooltipText(deadline, minutesOverdue) {
  let text = deadline ? `Checkout deadline: ${new Date(deadline).toLocaleString()}` : 'No checkout deadline';
  
  if (minutesOverdue > 0) {
    text += `\nOverdue by ${minutesOverdue} minutes`;
  }
  
  text += '\nSuggested action: Checkout guest or Extend stay';
  return text;
}

/**
 * Map risk levels to badge variants
 */
function getRiskVariant(riskLevel) {
  switch (riskLevel) {
    case 'DUE_SOON':
      return 'warning';
    case 'OVERDUE':
      return 'danger';
    case 'CRITICAL':
      return 'danger';
    case 'GRACE':
      return 'info';
    default:
      return 'secondary';
  }
}

/**
 * Check if booking has any warnings
 */
export const hasBookingWarnings = (warnings) => {
  return !!(warnings?.approval || warnings?.overstay);
};

/**
 * Log missing fields for development
 */
export const logMissingWarningFields = (booking, isDev = process.env.NODE_ENV === 'development') => {
  if (!isDev || !booking) return;

  const expectedFields = [
    'approval_deadline_at', 'is_approval_due_soon', 'is_approval_overdue', 
    'approval_overdue_minutes', 'approval_risk_level',
    'checkout_deadline_at', 'overstay_minutes', 
    'overstay_risk_level'
  ];

  const missingFields = expectedFields.filter(field => booking[field] === undefined);
  
  if (missingFields.length > 0) {
    console.warn(`[BookingTimeWarnings] Missing fields for booking ${booking.booking_id}:`, missingFields);
  }
};
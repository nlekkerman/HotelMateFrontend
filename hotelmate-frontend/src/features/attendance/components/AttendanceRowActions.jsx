import React, { useState } from "react";
import api from "@/services/api";
import { handleAttendanceError, showSuccessMessage, ERROR_TYPES } from "../utils/errorHandling";
import { useCan } from "@/rbac";
import NoAccess from "@/components/NoAccess";

export default function AttendanceRowActions({ row, hotelSlug, onAction }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const { can } = useCan();
  const canApprove = can("attendance", "log_approve");
  const canReject = can("attendance", "log_reject");

  // Defensive checks for row structure
  if (!row || !Array.isArray(row.logs)) {
    return null;
  }

  const pendingLog = row.logs.find(
    (l) => l && l.is_unrostered && !l.is_approved && !l.is_rejected
  );

  if (!pendingLog || !pendingLog.id) {
    return null;
  }

  // Hide entirely if user has neither authority.
  if (!canApprove && !canReject) {
    return <NoAccess inline />;
  }

  async function handleDecision(decision) {
    if (!pendingLog || !hotelSlug || !decision) {
      console.warn("Invalid decision parameters:", { pendingLog, hotelSlug, decision });
      return;
    }

    if (decision === "approve" && !canApprove) return;
    if (decision === "reject" && !canReject) return;

    // Prevent multiple clicks
    if (busy) return;

    setBusy(true);
    setError(null);
    
    try {
      const endpoint = decision === "approve"
        ? `/staff/hotel/${encodeURIComponent(hotelSlug)}/attendance/clock-logs/${pendingLog.id}/approve/`
        : `/staff/hotel/${encodeURIComponent(hotelSlug)}/attendance/clock-logs/${pendingLog.id}/reject/`;

      await api.post(endpoint);

      // Call the callback if provided
      if (typeof onAction === 'function') {
        onAction(decision, pendingLog);
      }

      // Show success message
      showSuccessMessage(decision);
    } catch (err) {
      const { userMessage } = handleAttendanceError(err, {
        type: ERROR_TYPES.NETWORK,
        component: 'row-actions',
        action: decision,
        hotelSlug,
        data: { logId: pendingLog.id }
      }, { showToast: false }); // Don't show toast, we'll show inline error
      
      setError(userMessage);
      
      // Clear error after 3 seconds
      setTimeout(() => setError(null), 3000);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="d-flex gap-2">
        {canApprove && (
          <button
            type="button"
            className="btn btn-sm btn-outline-success"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              handleDecision("approve");
            }}
            title={busy ? "Processing..." : "Approve this unrostered log"}
          >
            {busy ? "..." : "Approve"}
          </button>
        )}
        {canReject && (
          <button
            type="button"
            className="btn btn-sm btn-outline-danger"
            disabled={busy}
            onClick={(e) => {
              e.stopPropagation();
              handleDecision("reject");
            }}
            title={busy ? "Processing..." : "Reject this unrostered log"}
          >
            {busy ? "..." : "Reject"}
          </button>
        )}
      </div>
      {error && (
        <div className="text-danger small mt-1" style={{ fontSize: "0.75rem" }}>
          {error}
        </div>
      )}
    </div>
  );
}

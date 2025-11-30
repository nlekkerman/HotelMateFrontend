import React, { useState } from "react";
import api from "@/services/api";

export default function AttendanceRowActions({ row, hotelSlug, onAction }) {
  const [busy, setBusy] = useState(false);
  const pendingLog = row.logs.find(
    (l) => l.is_unrostered && !l.is_approved && !l.is_rejected
  );

  if (!pendingLog) {
    return null;
  }

  async function handleDecision(decision) {
    if (!pendingLog || !hotelSlug) return;
    setBusy(true);
    try {
      const endpoint =
        decision === "approve"
          ? `/attendance/${hotelSlug}/clock-logs/${pendingLog.id}/approve/`
          : `/attendance/${hotelSlug}/clock-logs/${pendingLog.id}/reject/`;

      await api.post(endpoint);

      if (onAction) {
        onAction(decision, pendingLog);
      }
    } catch (err) {
      console.error("Failed to", decision, "log", pendingLog.id, err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="d-flex gap-2">
      <button
        type="button"
        className="btn btn-sm btn-outline-success"
        disabled={busy}
        onClick={() => handleDecision("approve")}
      >
        Approve
      </button>
      <button
        type="button"
        className="btn btn-sm btn-outline-danger"
        disabled={busy}
        onClick={() => handleDecision("reject")}
      >
        Reject
      </button>
    </div>
  );
}

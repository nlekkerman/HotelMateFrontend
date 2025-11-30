export const ATTENDANCE_STATUS = {
  ON_DUTY: "On duty (open log)",
  UNROSTERED_PENDING: "Unrostered – pending approval",
  REJECTED: "Rejected",
  COMPLETED: "Completed (approved)",
  NO_CLOCK_LOG: "No clock log",
  UNROSTERED_APPROVED: "Unrostered but approved",
  NO_DATA: "No data",
};

export function deriveStatus(row) {
  // Defensive checks for row structure
  if (!row || typeof row !== 'object') {
    return ATTENDANCE_STATUS.NO_DATA;
  }

  // Ensure roster and logs are arrays
  const roster = Array.isArray(row.roster) ? row.roster : [];
  const logs = Array.isArray(row.logs) ? row.logs : [];

  const hasRoster = roster.length > 0;
  const hasLog = logs.length > 0;
  
  // Safely find open log
  const openLog = logs.find((l) => l && !l.time_out);
  
  // Safely check log statuses with null checks
  const anyUnrosteredPending = logs.some(
    (l) => l && l.is_unrostered && !l.is_approved && !l.is_rejected
  );
  const anyRejected = logs.some((l) => l && l.is_rejected);
  const anyApproved = logs.some((l) => l && l.is_approved);

  if (openLog) {
    return ATTENDANCE_STATUS.ON_DUTY;
  }
  if (anyUnrosteredPending) {
    return ATTENDANCE_STATUS.UNROSTERED_PENDING;
  }
  if (anyRejected) {
    return ATTENDANCE_STATUS.REJECTED;
  }
  if (hasRoster && anyApproved) {
    return ATTENDANCE_STATUS.COMPLETED;
  }
  if (hasRoster && !hasLog) {
    return ATTENDANCE_STATUS.NO_CLOCK_LOG;
  }
  if (!hasRoster && anyApproved) {
    return ATTENDANCE_STATUS.UNROSTERED_APPROVED;
  }
  return ATTENDANCE_STATUS.NO_DATA;
}

export function getStatusVariant(status) {
  switch (status) {
    case ATTENDANCE_STATUS.ON_DUTY:
      return "success";
    case ATTENDANCE_STATUS.UNROSTERED_PENDING:
      return "warning";
    case ATTENDANCE_STATUS.REJECTED:
      return "danger";
    case ATTENDANCE_STATUS.COMPLETED:
      return "primary";
    case ATTENDANCE_STATUS.NO_CLOCK_LOG:
      return "secondary";
    case ATTENDANCE_STATUS.UNROSTERED_APPROVED:
      return "info";
    case ATTENDANCE_STATUS.NO_DATA:
    default:
      return "secondary";
  }
}
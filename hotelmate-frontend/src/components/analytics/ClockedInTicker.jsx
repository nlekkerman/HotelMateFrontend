import React, { useEffect, useState } from "react";
import StaffCard from "@/components/staff/StaffCard";

function formatTime(dateTime) {
  return new Date(dateTime).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getWorkedPercent(timeIn, now) {
  const diffMinutes = (now - new Date(timeIn)) / (1000 * 60);
  const maxMinutes = 8 * 60; // 8-hour shift
  return Math.min((diffMinutes / maxMinutes) * 100, 100);
}

function getWorkedDuration(timeIn, now) {
  const diffMs = now - new Date(timeIn);
  const diffMinutes = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}`;
}

function StaffTimelineRow({ log, now }) {
  const isClockedIn = !log.time_out;

  // Construct a "staff" object for StaffCard from API data
  const staffData = {
    id: log.staff,
    first_name: log.staff_name?.split(" ")[0] || "Unnamed",
    last_name: log.staff_name?.split(" ").slice(1).join(" ") || "",
    department_detail: log.department || { name: "N/A", slug: null },
  };
  console.log("Constructed staffData:", staffData);
  const workedPercent = isClockedIn ? getWorkedPercent(log.time_in, now) : 100;
  const workedDuration = isClockedIn
    ? getWorkedDuration(log.time_in, now)
    : null;

  return (
    <div className="d-flex align-items-center py-2 border-bottom pe-5">
      {/* Left: Staff card */}
      <div className="me-3" style={{ minWidth: "200px" }}>
        <StaffCard staff={staffData} />
      </div>
      {/* Worked duration clock */}
<div
  className="d-flex flex-column flex-md-row align-items-center justify-content-center 
             bg-info text-white rounded shadow-sm p-3 gap-2"
  style={{ minWidth: "80px" }}
>
  <span className="fw-semibold">Time on</span>
  <span className="bg-light text-success rounded-pill px-3 py-1 fw-bold">
    {workedDuration}
  </span>
</div>

      {/* Right: Single line indicator */}
<div className="flex-grow-1 d-none d-md-flex align-items-center">
  {isClockedIn ? (
    <>
      {/* Progress bar */}
      <div
        className="position-relative bg-light rounded flex-grow-1"
        style={{ height: "48px", overflow: "hidden" }}
      >
        <div
          className="progress-bar-fill"
          style={{ width: `${workedPercent}%` }}
        />
        <span
          className="progress-bar-label"
          style={{ color: workedPercent > 20 ? "white" : "black" }}
        >
          {formatTime(log.time_in)}
        </span>
      </div>
    </>
  ) : (
    // Scratched line when clocked out
    <div
      className="bg-light rounded flex-grow-1"
      style={{
        height: "28px",
        background:
          "repeating-linear-gradient(45deg, #999, #999 4px, transparent 4px, transparent 8px)",
      }}
    />
  )}
</div>

    </div>
  );
}

export default function ClockedInTimeline({ staffList }) {
  const [now, setNow] = useState(new Date());

  // Live update every minute
  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(intervalId);
  }, []);

  // Debug log to check what backend sends
  useEffect(() => {
    console.log("Raw staffList data:", staffList);
  }, [staffList]);

  return (
    <div>
      {staffList.map((log) => (
        <StaffTimelineRow key={log.id} log={log} now={now} />
      ))}
    </div>
  );
}

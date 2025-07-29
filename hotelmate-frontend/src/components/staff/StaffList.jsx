import React from "react";
import StaffCard from "./StaffCard";

export default function StaffList({ staffList = [], onStaffClick }) {
  return (
    <div className="d-flex flex-column gap-3 staf-list-container">
      {staffList.map((staff) => (
        <StaffCard
          key={staff.id}
          staff={staff}
          onClick={() => onStaffClick?.(staff)}
        />
      ))}
    </div>
  );
}

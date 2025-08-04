import React, { useState } from "react";
import StaffList from "./StaffList";
import { FaChevronDown } from "react-icons/fa";

export default function StaffByDepartment({ staffList = [], onStaffClick }) {
  const grouped = staffList.reduce((acc, staff) => {
    const dept = staff.department_detail?.name || "No Department";
    if (!acc[dept]) acc[dept] = [];
    acc[dept].push(staff);
    return acc;
  }, {});

  const [openDept, setOpenDept] = useState(null);

  return (
    <div className="accordion" id="departmentAccordion">
      {Object.entries(grouped).map(([department, staffs], index) => {
        const isOpen = openDept === department;
        return (
          <div className="accordion-item shadow-sm rounded mb-3" key={department}>
            <h2 className="accordion-header" id={`heading-${index}`}>
              <button
  className={`accordion-button d-flex justify-content-between align-items-center ${
    !isOpen ? "collapsed" : ""
  }`}
  type="button"
  onClick={() => setOpenDept(isOpen ? null : department)}
  aria-expanded={isOpen}
  aria-controls={`collapse-${index}`}
  style={{ backgroundColor: isOpen ? "#e9f5ff" : "#f8f9fa" }}
>
  <div className="d-flex align-items-center gap-2">
    <span className="fw-semibold fs-5">{department}</span>
    <span className="badge text-primary rounded-pill">({staffs.length})</span>
  </div>
  <FaChevronDown
    size={18}
    style={{
      transition: "transform 0.3s ease",
      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
    }}
  />
</button>

            </h2>
            <div
              id={`collapse-${index}`}
              className={`accordion-collapse collapse ${isOpen ? "show" : ""}`}
              aria-labelledby={`heading-${index}`}
              data-bs-parent="#departmentAccordion"
            >
              <div className="accordion-body bg-white p-3">
                <StaffList staffList={staffs} onStaffClick={onStaffClick} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

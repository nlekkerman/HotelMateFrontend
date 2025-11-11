import React from "react";

const fmt = (n, digits = 2) =>
  typeof n === "number" && !Number.isNaN(n) ? n.toFixed(digits) : "0.00";

function unslugify(slug) {
  if (!slug || typeof slug !== "string") return "";
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

const bgColors = {
  hours: "#f0f8ff",      // aliceblue
  shifts: "#f9f9f9",     // light gray
  avgLength: "#fffaf0",  // floral white
  staff: "#f5f5dc",      // beige
};

export function KpiCard({ title, value, colorKey, onClick }) {
  return (
    <div className="col-12 col-md-3 mb-3">
      <div
        className="card text-center h-100 shadow-sm"
        style={{ 
          backgroundColor: bgColors[colorKey] || "white",
          cursor: onClick ? "pointer" : "default",
          transition: "transform 0.2s, box-shadow 0.2s"
        }}
        onClick={onClick}
        onMouseEnter={(e) => {
          if (onClick) {
            e.currentTarget.style.transform = "translateY(-4px)";
            e.currentTarget.style.boxShadow = "0 4px 8px rgba(0,0,0,0.2)";
          }
        }}
        onMouseLeave={(e) => {
          if (onClick) {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "";
          }
        }}
      >
        <div className="card-body">
          <h5 className="card-title">{title}</h5>
          <p className="card-text mb-0 text-danger">{value}</p>
          {onClick && (
            <small className="text-muted d-block mt-2">Click for details</small>
          )}
        </div>
      </div>
    </div>
  );
}


export function CardTable({ title, headers, children, headerBg = "bg-primary" }) {
  return (
    <div className="card mb-4 shadow-sm">
      <div className={`card-header ${headerBg} text-white`}>
        <h5 className="mb-0">{title}</h5>
      </div>
      <div className="table-responsive">
        <table className="table table-hover table-striped table-sm mb-0">
          <thead className={`${headerBg} text-white`}>
            <tr>{headers.map((h) => (<th key={h}>{h}</th>))}</tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

export function StaffSummaryCard({ staffSummary }) {
  return (
    <CardTable
      title="Staff Summary"
      headers={["Name", "Department", "Hours", "Shifts", "Avg Length"]}
      headerBg="bg-success"
    >
      {staffSummary.length ? (
        staffSummary.map((row) => (
          <tr key={row.staff_id}>
            <td>{row.first_name} {row.last_name}</td>
            <td>{row.department}</td>
            <td>{fmt(Number(row.total_rostered_hours))}</td>
            <td>{row.shifts_count}</td>
            <td>{fmt(Number(row.avg_shift_length))}</td>
          </tr>
        ))
      ) : (
        <tr>
          <td colSpan={5} className="text-center text-muted">No data</td>
        </tr>
      )}
    </CardTable>
  );
}

export function DepartmentSummaryCard({ departmentSummary }) {
  return (
    <CardTable
      title="Department Summary"
      headers={["Department", "Hours ⏰", "Shifts 👥", "Avg Length ⏳", "Unique Staff 🧑‍🤝‍🧑"]}
      headerBg="bg-info"
    >
      {departmentSummary.length ? (
        departmentSummary.map((row, idx) => (
          <tr key={idx}>
            <td>{unslugify(row.department_slug)}</td>
            <td>{fmt(Number(row.total_rostered_hours))}</td>
            <td>{row.shifts_count}</td>
            <td>{fmt(Number(row.avg_shift_length))}</td>
            <td>{row.unique_staff}</td>
          </tr>
        ))
      ) : (
        <tr>
          <td colSpan={5} className="text-center text-muted">
            No data
          </td>
        </tr>
      )}
    </CardTable>
  );
}

export function DailyTotalsCard({ dailyTotals, selectedDepartment }) {
  return (
    <CardTable
      title={`Daily Totals${selectedDepartment ? ` for ${unslugify(selectedDepartment)}` : ""}`}
      headers={["Date", "Hours ⏰", "Shifts 👥"]}
      headerBg="bg-warning"
    >
      {dailyTotals.length ? (
        dailyTotals.map((row, idx) => {
          const dateObj = new Date(row.date);
          const formattedDate = `${String(dateObj.getDate()).padStart(2, "0")}/${
            String(dateObj.getMonth() + 1).padStart(2, "0")
          }/${String(dateObj.getFullYear()).slice(-2)}`;

          return (
            <tr key={idx}>
              <td>{formattedDate}</td>
              <td>{fmt(Number(row.total_rostered_hours))}</td>
              <td>{row.shifts_count}</td>
            </tr>
          );
        })
      ) : (
        <tr>
          <td colSpan={3} className="text-center text-muted">
            No data
          </td>
        </tr>
      )}
    </CardTable>
  );
}

export function WeeklyTotalsCard({ weeklyTotals, selectedDepartment }) {
  return (
    <CardTable
      title={`Weekly Totals${selectedDepartment ? ` for ${unslugify(selectedDepartment)}` : ""}`}
      headers={["Year", "Week", "Hours ⏰", "Shifts 👥", "Unique Staff 🧑‍🤝‍🧑"]}
      headerBg="bg-danger"
    >
      {weeklyTotals.length ? (
        weeklyTotals.map((row, idx) => (
          <tr key={idx}>
            <td>{row.year}</td>
            <td>{row.week}</td>
            <td>{fmt(Number(row.total_rostered_hours))}</td>
            <td>{row.shifts_count}</td>
            <td>{row.unique_staff}</td>
          </tr>
        ))
      ) : (
        <tr>
          <td colSpan={5} className="text-center text-muted">
            No data
          </td>
        </tr>
      )}
    </CardTable>
  );
}

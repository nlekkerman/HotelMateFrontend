import React, { useState } from "react";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import DownloadRosters from "@/components/analytics/DownloadRosters";
import { useAnalytics } from "@/components/analytics/hooks/useAnalytics";
import KpiDetailModal from "@/components/modals/KpiDetailModal";

// Cards import
import {
  KpiCard,
  StaffSummaryCard,
  DepartmentSummaryCard,
  DailyTotalsCard,
  WeeklyTotalsCard,
} from "@/components/analytics/cards/Cards";

const METRIC_OPTIONS = [
  { value: "kpis", label: "KPIs" },
  { value: "staff", label: "Staff Summary" },
  { value: "department", label: "Department Summary" },
  { value: "daily", label: "Daily Totals" },
  { value: "weekly", label: "Weekly Totals" },
];

function getHotelSlugFromStorage() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return user.hotel_slug || (user.hotel && user.hotel.slug) || "";
  } catch {
    return "";
  }
}

export default function RosterAnalytics(props) {
  // Get hotelSlug from localStorage if not passed as prop
  const hotelSlug = props.hotelSlug || getHotelSlugFromStorage();

  // Pass hotelSlug and other params to your hook
  const {
    kpis,
    staffSummary,
    departmentSummary,
    dailyTotals,
    weeklyTotals,
    loading,
    error,
  } = useAnalytics(hotelSlug, {
    startDate: props.startDate,
    endDate: props.endDate,
    selectedDepartment: props.selectedDepartment,
    refreshKey: props.refreshKey,
  });

  const [selectedMetric, setSelectedMetric] = useState("kpis");
  const [showKpiModal, setShowKpiModal] = useState(false);
  const [selectedKpiData, setSelectedKpiData] = useState(null);

  const fmt = (n, digits = 2) =>
    typeof n === "number" && !Number.isNaN(n) ? n.toFixed(digits) : "0.00";

  const handleKpiCardClick = (kpiType, title, value) => {
    setSelectedKpiData({
      type: kpiType,
      title: title,
      value: value
    });
    setShowKpiModal(true);
  };

  return (
    <div className="container mt-4">
      <div className="d-flex flex-wrap gap-3 align-items-center mb-4">
        {!props.startDate && !props.endDate && (
          <>
            <ReactDatePicker
              selected={props.startDate}
              onChange={props.setStartDate}
              className="form-control"
            />
            <ReactDatePicker
              selected={props.endDate}
              onChange={props.setEndDate}
              className="form-control"
            />
          </>
        )}

        <select
          className="form-select w-auto"
          value={selectedMetric}
          onChange={(e) => setSelectedMetric(e.target.value)}
        >
          {METRIC_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <button className="btn btn-primary" onClick={() => {}}>
          Refresh
        </button>
      </div>

      

      {loading && <div className="alert alert-info">Loading analytics…</div>}
      {error && <div className="alert alert-danger">{error.message || error}</div>}

      {/* Render cards based on selected metric */}
      {!loading && !error && selectedMetric === "kpis" && kpis && (
        <div className="row mb-4">
          <KpiCard 
            title="Total Hours" 
            value={fmt(Number(kpis.total_rostered_hours))} 
            colorKey="hours"
            onClick={() => handleKpiCardClick("hours", "Total Hours", fmt(Number(kpis.total_rostered_hours)))}
          />
          <KpiCard 
            title="Total Shifts" 
            value={Number(kpis.total_shifts)} 
            colorKey="shifts"
            onClick={() => handleKpiCardClick("shifts", "Total Shifts", Number(kpis.total_shifts))}
          />
          <KpiCard 
            title="Avg Shift Length" 
            value={fmt(Number(kpis.avg_shift_length))} 
            colorKey="avgLength"
            onClick={() => handleKpiCardClick("avgLength", "Avg Shift Length", fmt(Number(kpis.avg_shift_length)))}
          />
          <KpiCard 
            title="Unique Staff" 
            value={Number(kpis.unique_staff)} 
            colorKey="staff"
            onClick={() => handleKpiCardClick("staff", "Unique Staff", Number(kpis.unique_staff))}
          />
        </div>
      )}

      {!loading && !error && selectedMetric === "staff" && (
<StaffSummaryCard staffSummary={staffSummary} selectedDepartment={props.selectedDepartment} />
      )}

      {!loading && !error && selectedMetric === "department" && (
        <DepartmentSummaryCard departmentSummary={departmentSummary} />
      )}

      {!loading && !error && selectedMetric === "daily" && (
        <DailyTotalsCard dailyTotals={dailyTotals} selectedDepartment={props.selectedDepartment} />
      )}

      {!loading && !error && selectedMetric === "weekly" && (
        <WeeklyTotalsCard weeklyTotals={weeklyTotals} selectedDepartment={props.selectedDepartment} />
      )}
      <DownloadRosters
        hotelSlug={hotelSlug}
        department={props.selectedDepartment}
        defaultDate={props.startDate}
      />

      {/* KPI Detail Modal */}
      <KpiDetailModal
        show={showKpiModal}
        onClose={() => setShowKpiModal(false)}
        kpiData={selectedKpiData}
        allData={{
          total_rostered_hours: kpis?.total_rostered_hours,
          total_shifts: kpis?.total_shifts,
          avg_shift_length: kpis?.avg_shift_length,
          unique_staff: kpis?.unique_staff,
          staffSummary: staffSummary,
          departmentSummary: departmentSummary
        }}
      />
    </div>
    
  );
}

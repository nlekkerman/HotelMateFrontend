// src/components/analytics/RosterAnalytics.jsx
import React, { useEffect, useState, useMemo } from "react";
import ReactDatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import DownloadRosters from "@/components/analytics/DownloadRosters";
import { format } from "date-fns";
import {
  getKpis,
  getStaffSummary,
  getDepartmentSummary,
  getDailyTotals,
  getWeeklyTotals,
} from "@/services/analytics";

const fmt = (n, digits = 2) =>
  typeof n === "number" && !Number.isNaN(n) ? n.toFixed(digits) : "0.00";

const METRIC_OPTIONS = [
  { value: "kpis", label: "KPIs" },
  { value: "staff", label: "Staff Summary" },
  { value: "department", label: "Department Summary" },
  { value: "daily", label: "Daily Totals" },
  { value: "weekly", label: "Weekly Totals" },
  { value: "advanced", label: "Advanced Metrics" },
];

export default function RosterAnalytics({
  hotelSlug: injectedHotelSlug,
  startDate: injectedStartDate,
  endDate: injectedEndDate,
  department: injectedDepartment,
}) {
  // -------- hotel slug ----------
  const [hotelSlug, setHotelSlug] = useState(injectedHotelSlug || null);
  useEffect(() => {
    if (injectedHotelSlug) {
      setHotelSlug(injectedHotelSlug);
      return;
    }
    try {
      const raw = localStorage.getItem("user");
      if (raw) {
        const user = JSON.parse(raw);
        const stored = user?.hotel?.slug || user?.hotel_slug || null;
        setHotelSlug(stored);
      }
    } catch (e) {
      console.warn("[RosterAnalytics] Failed to read hotelSlug", e);
    }
  }, [injectedHotelSlug]);

  // -------- dates ----------
  const [startDate, setStartDate] = useState(injectedStartDate || new Date());
  const [endDate, setEndDate] = useState(injectedEndDate || new Date());
  useEffect(() => {
    if (injectedStartDate) setStartDate(injectedStartDate);
    if (injectedEndDate) setEndDate(injectedEndDate);
  }, [injectedStartDate, injectedEndDate]);

  // -------- filters / state ----------
  const [selectedDepartment, setSelectedDepartment] = useState(
    injectedDepartment || ""
  );
  const [selectedMetric, setSelectedMetric] = useState("kpis");

  const [kpis, setKpis] = useState(null);
  const [staffSummary, setStaffSummary] = useState([]);
  const [departmentSummary, setDepartmentSummary] = useState([]);
  const [dailyTotals, setDailyTotals] = useState([]);
  const [weeklyTotals, setWeeklyTotals] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const departments = useMemo(() => {
    const list =
      departmentSummary?.map((d) => d.department).filter(Boolean) || [];
    return Array.from(new Set(list)).sort();
  }, [departmentSummary]);

  const params = useMemo(() => {
    const base = {
      start: format(startDate, "yyyy-MM-dd"),
      end: format(endDate, "yyyy-MM-dd"),
    };
    if (selectedDepartment) base.department = selectedDepartment;
    return base;
  }, [startDate, endDate, selectedDepartment]);

  // -------- fetch everything once per filter change ----------
  useEffect(() => {
    if (!hotelSlug) return;

    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const [k, s, d, daily, weekly] = await Promise.all([
          getKpis(hotelSlug, params),
          getStaffSummary(hotelSlug, params),
          getDepartmentSummary(hotelSlug, params),
          getDailyTotals(hotelSlug, params),
          getWeeklyTotals(hotelSlug, params),
        ]);
        setKpis(k.data);
        setStaffSummary(s.data || []);
        setDepartmentSummary(d.data || []);
        setDailyTotals(daily.data || []);
        setWeeklyTotals(weekly.data || []);
      } catch (err) {
        console.error("[RosterAnalytics] Error fetching analytics:", err);
        setError("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [hotelSlug, params]);

  // -------- advanced metrics (client-side) ----------
  const advanced = useMemo(() => computeAdvancedMetrics({
    staffSummary,
    departmentSummary,
    dailyTotals,
    weeklyTotals,
    kpis,
  }), [staffSummary, departmentSummary, dailyTotals, weeklyTotals, kpis]);

  return (
    <div className="container mt-4 ">
      {/* Filters */}
      
      <div className="d-flex flex-wrap gap-3 align-items-center mb-4">
        {!injectedStartDate && !injectedEndDate && (
          <>
            <ReactDatePicker
              selected={startDate}
              onChange={setStartDate}
              className="form-control"
            />
            <ReactDatePicker
              selected={endDate}
              onChange={setEndDate}
              className="form-control"
            />
          </>
        )}

        <select
          className="form-select w-auto"
          value={selectedDepartment}
          onChange={(e) => setSelectedDepartment(e.target.value)}
        >
          <option value="">All departments</option>
          {departments.map((dep) => (
          <option key={dep} value={dep}>
            {dep}
          </option>
          ))}
        </select>

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
<DownloadRosters
    hotelSlug={hotelSlug}
    department={selectedDepartment}
    defaultDate={startDate}
  />

      {loading && <div className="alert alert-info">Loading analytics…</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {/* ====== CONDITIONAL RENDERS BY METRIC ====== */}
      {!loading && !error && selectedMetric === "kpis" && kpis && (
        <div className="row mb-4">
          <KpiCard title="Total Hours" value={fmt(Number(kpis.total_rostered_hours))} />
          <KpiCard title="Total Shifts" value={Number(kpis.total_shifts)} />
          <KpiCard title="Avg Shift Length" value={fmt(Number(kpis.avg_shift_length))} />
          <KpiCard title="Unique Staff" value={Number(kpis.unique_staff)} />
        </div>
      )}

      {!loading && !error && selectedMetric === "staff" && (
        <CardTable title="Staff Summary" headers={["Name", "Department", "Hours", "Shifts", "Avg Length"]}>
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
              <td colSpan={5} className="text-center text-muted">
                No data
              </td>
            </tr>
          )}
        </CardTable>
      )}

      {!loading && !error && selectedMetric === "department" && (
        <CardTable title="Department Summary" headers={["Department", "Hours", "Shifts", "Avg Length", "Staff"]}>
          {departmentSummary.length ? (
            departmentSummary.map((row, idx) => (
              <tr key={idx}>
                <td>{row.department}</td>
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
      )}

      {!loading && !error && selectedMetric === "daily" && (
        <CardTable title="Daily Totals" headers={["Date", "Hours", "Shifts"]}>
          {dailyTotals.length ? (
            dailyTotals.map((row, idx) => (
              <tr key={idx}>
                <td>{row.date}</td>
                <td>{fmt(Number(row.total_rostered_hours))}</td>
                <td>{row.shifts_count}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={3} className="text-center text-muted">
                No data
              </td>
            </tr>
          )}
        </CardTable>
      )}

      {!loading && !error && selectedMetric === "weekly" && (
        <CardTable title="Weekly Totals" headers={["Year", "Week", "Hours", "Shifts", "Unique Staff"]}>
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
      )}

      {!loading && !error && selectedMetric === "advanced" && (
        <AdvancedMetricsView advanced={advanced} />
      )}
    </div>
  );
}

/* --------------------------------- helpers -------------------------------- */

function KpiCard({ title, value }) {
  return (
    <div className="col-md-3">
      <div className="card text-center h-100">
        <div className="card-body">
          <h5 className="card-title">{title}</h5>
          <p className="card-text mb-0">{value}</p>
        </div>
      </div>
    </div>
  );
}

function CardTable({ title, headers, children }) {
  return (
    <div className="card mb-4">
      <div className="card-body">
        <h5 className="card-title">{title}</h5>
        <table className="table table-striped table-sm">
          <thead>
            <tr>
              {headers.map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function AdvancedMetricsView({ advanced }) {
  if (!advanced) return null;

  const {
    totalHours,
    longestShift,
    shortestShift,
    mostActiveStaff,
    peakDay,
    avgShiftsPerStaff,
    departmentShares,
  } = advanced;

  return (
    <div className="card mb-4">
      <div className="card-body">
        <h5 className="card-title">Advanced Metrics</h5>

        <ul className="mb-4">
          <li><strong>Total Hours:</strong> {fmt(totalHours)}</li>
          <li><strong>Longest Avg Shift:</strong> {fmt(longestShift)} hrs</li>
          <li><strong>Shortest Avg Shift:</strong> {fmt(shortestShift)} hrs</li>
          {mostActiveStaff && (
            <li>
              <strong>Most Active Staff:</strong> {mostActiveStaff.first_name}{" "}
              {mostActiveStaff.last_name} ({fmt(mostActiveStaff.total_rostered_hours)} hrs)
            </li>
          )}
          {peakDay && (
            <li>
              <strong>Peak Day:</strong> {peakDay.date} (
              {fmt(peakDay.total_rostered_hours)} hrs)
            </li>
          )}
          {avgShiftsPerStaff !== null && (
            <li>
              <strong>Avg Shifts / Staff:</strong> {fmt(avgShiftsPerStaff, 2)}
            </li>
          )}
        </ul>

        {departmentShares.length > 0 && (
          <>
            <h6>Department Contribution %</h6>
            <table className="table table-striped table-sm">
              <thead>
                <tr>
                  <th>Department</th>
                  <th>% of Total Hours</th>
                </tr>
              </thead>
              <tbody>
                {departmentShares.map((d) => (
                  <tr key={d.department}>
                    <td>{d.department}</td>
                    <td>{fmt(d.share, 2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

function computeAdvancedMetrics({ staffSummary, departmentSummary, dailyTotals, weeklyTotals, kpis }) {
  if (!kpis) return null;

  const totalHours = Number(kpis.total_rostered_hours || 0);

  // longest / shortest avg shift (based on staff avg)
  const avgLens = staffSummary
    .map((r) => Number(r.avg_shift_length || 0))
    .filter((n) => !Number.isNaN(n) && Number.isFinite(n));
  const longestShift = avgLens.length ? Math.max(...avgLens) : 0;
  const shortestShift = avgLens.length ? Math.min(...avgLens) : 0;

  // most active staff
  const mostActiveStaff = staffSummary.reduce(
    (acc, r) =>
      Number(r.total_rostered_hours || 0) > Number(acc.total_rostered_hours || 0)
        ? r
        : acc,
    staffSummary[0] || null
  );

  // peak day from dailyTotals
  const peakDay = dailyTotals.reduce(
    (acc, r) =>
      Number(r.total_rostered_hours || 0) > Number(acc.total_rostered_hours || 0)
        ? r
        : acc,
    dailyTotals[0] || null
  );

  // avg shifts per staff
  const totalShifts = Number(kpis.total_shifts || 0);
  const uniqueStaff = Number(kpis.unique_staff || 0);
  const avgShiftsPerStaff =
    uniqueStaff > 0 ? totalShifts / uniqueStaff : null;

  // department contribution %
  const departmentShares = (() => {
    if (!totalHours) return [];
    return (departmentSummary || []).map((d) => ({
      department: d.department,
      share: (Number(d.total_rostered_hours || 0) / totalHours) * 100,
    }));
  })();

  return {
    totalHours,
    longestShift,
    shortestShift,
    mostActiveStaff,
    peakDay,
    avgShiftsPerStaff,
    departmentShares,
  };
}

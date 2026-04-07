// src/components/staff/StaffWeeklyRoster.jsx
import React, { useMemo } from "react";
import { startOfWeek, addDays, format, differenceInMinutes } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import api from "@/services/api";
import { useAuth } from '@/context/AuthContext';

const fetchStaffShifts = async ({ hotelSlug, staffId, start, end }) => {
  const { data } = await api.get(`/staff/hotel/${hotelSlug}/attendance/shifts/`, {
    params: {
      staff: staffId,
      staff_id: staffId,
      start_date: start,
      end_date: end,
    },
  });

  // Ensure data is always an array
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  return [];
};

export default function StaffWeeklyRoster({
  staffId,
  weekStartDate = new Date(),
  hotelSlug: injectedHotelSlug,
}) {
  const { user: authUser } = useAuth();
  // Resolve hotel slug (prop > auth context)
  const hotelSlug =
    injectedHotelSlug || authUser?.hotel_slug || null;

  // Sunday → Saturday week
  const start = startOfWeek(weekStartDate, { weekStartsOn: 0 });
  const end = addDays(start, 6);
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(start, i)),
    [start]
  );

  const {
    data,
    isLoading,
    isError,
    error,
  } = useQuery({
    enabled: !!hotelSlug && !!staffId,
    queryKey: [
      "staff-weekly-roster",
      hotelSlug,
      staffId,
      format(start, "yyyy-MM-dd"),
    ],
    queryFn: () =>
      fetchStaffShifts({
        hotelSlug,
        staffId,
        start: format(start, "yyyy-MM-dd"),
        end: format(end, "yyyy-MM-dd"),
      }),
  });

  // Normalized array — ensure shift_date is always populated, filter to this week only
  const shifts = useMemo(() => {
    const raw = Array.isArray(data) ? data : [];
    const weekStart = format(start, "yyyy-MM-dd");
    const weekEnd = format(end, "yyyy-MM-dd");
    return raw
      .map(s => ({
        ...s,
        shift_date: s.shift_date || s.date,
      }))
      .filter(s => s.shift_date >= weekStart && s.shift_date <= weekEnd);
  }, [data, start, end]);

  const dayShifts = useMemo(() => {
    const map = {};
    for (let day of days) map[format(day, "yyyy-MM-dd")] = [];
    for (const s of shifts) {
      if (map[s.shift_date]) map[s.shift_date].push(s);
    }
    return map;
  }, [shifts, days]);

  const totalHours = shifts.reduce((acc, s) => {
    if (s.expected_hours != null) return acc + parseFloat(s.expected_hours);
    const sStart = s.shift_start || s.start_time;
    const sEnd = s.shift_end || s.end_time;
    if (sStart && sEnd) {
      const st = new Date(`${s.shift_date}T${sStart}`);
      const en = new Date(`${s.shift_date}T${sEnd}`);
      acc += differenceInMinutes(en, st) / 60;
    }
    return acc;
  }, 0);

  const totalShifts = shifts.length;
  const avgShiftLength = totalShifts ? totalHours / totalShifts : 0;

  const formatTime = (t) =>
    t ? t.substring(0, 5) : ""; // remove seconds (HH:mm:ss → HH:mm)

  return (
    <div className="card mt-4 shadow-sm w-100">
      <div className="card-header bg-light d-flex justify-content-between align-items-center">
        <h6 className="mb-0">
          Weekly Roster ({format(start, "dd MMM")} – {format(end, "dd MMM yyyy")})
        </h6>
        <div className="small text-muted">
          H: <span className="text-danger fw-bold">{totalHours.toFixed(2)}</span>{" "}
          • Sh: <span className="text-success fw-bold">{totalShifts}</span> • Avg:{" "}
          {avgShiftLength.toFixed(2)}
        </div>
      </div>

      <div className="card-body p-0">
        {isLoading ? (
          <div className="text-center p-3">
            <div className="spinner-border text-primary" />
          </div>
        ) : isError ? (
          <div className="alert alert-danger m-3">
            Failed to load shifts: {error?.message || "Unknown error"}
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-bordered table-sm mb-0 text-center">
              <thead className="table-light">
                <tr>
                  {days.map((day) => (
                    <th key={day}>{format(day, "EEE dd")}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {days.map((day) => {
                    const key = format(day, "yyyy-MM-dd");
                    return (
                      <td key={key} style={{ verticalAlign: "middle" }}>
                        {dayShifts[key].length ? (
                          <ul className="list-unstyled mb-0">
                            {dayShifts[key].map((shift, i) => (
                              <li key={i} className="fw-semibold text-success">
                                {formatTime(shift.shift_start || shift.start_time)}–
                                {formatTime(shift.shift_end || shift.end_time)}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <span className="text-muted small">Off</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

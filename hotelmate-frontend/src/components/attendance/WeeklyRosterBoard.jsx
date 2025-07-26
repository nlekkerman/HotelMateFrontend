import React, { useEffect, useMemo } from "react";
import { addDays, startOfWeek, format, differenceInMinutes } from "date-fns";
import RosterPeriodSelector from "@/components/attendance/RosterPeriodSelector";
import ShiftModal from "@/components/modals/ShiftModal";
import ShiftCell from "@/components/attendance/ShiftCell";
import useRoster from "@/hooks/useRoster";
import RosterAnalytics from "@/components/analytics/RosterAnalytics";
import { FaUserCircle } from "react-icons/fa";

export default function WeeklyRosterBoard({
  hotelSlug,
  department,
  staffList = [],
  shifts = [],
  fetchShifts,
  period: initialPeriod,
  onPeriodChange,
  hotelId: injectedHotelId,
  locations = [],
}) {
  const {
    period,
    setPeriod,
    localShifts,
    editing,
    open,
    close,
    save,
    remove,
    bulkSubmit,
  } = useRoster({
    hotelSlug,
    department,
    fetchShifts,
    initialPeriod,
    injectedHotelId,
    serverShifts: shifts,
  });

  const cloudinaryBase = import.meta.env.VITE_CLOUDINARY_BASE || "";
  const buildImageUrl = (img) => {
    if (!img || typeof img !== "string") return null;
    if (img.startsWith("data:")) return img;
    if (/^https?:\/\//i.test(img)) return img;
    return cloudinaryBase ? `${cloudinaryBase}${img}` : img;
  };

  useEffect(() => {
    onPeriodChange?.(period?.id);
  }, [period?.id, onPeriodChange]);

  const weekStart = useMemo(
    () =>
      period?.start_date
        ? new Date(period.start_date)
        : startOfWeek(new Date(), { weekStartsOn: 0 }),
    [period?.start_date]
  );
  const locationsMap = useMemo(
    () =>
      Array.isArray(locations)
        ? locations.reduce((acc, l) => {
            acc[l.id] = l;
            return acc;
          }, {})
        : {},
    [locations]
  );

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const baseRoster = useMemo(() => {
    const arr = Array.isArray(shifts) ? shifts : [];
    return arr.reduce((acc, s) => {
      const staffKey = s.staff_id || s.staff;
      const key = `${staffKey}_${s.shift_date}`;
      acc[key] = acc[key] ? [...acc[key], s] : [s];
      return acc;
    }, {});
  }, [shifts]);

  // ---- NEW: per-staff weekly (period) stats ----
  const staffWeekStats = useMemo(() => {
    const stats = {};
    const arr = Array.isArray(shifts) ? shifts : [];

    const getHours = (s) => {
      if (s.expected_hours != null) return Number(s.expected_hours) || 0;
      if (s.start_time && s.end_time && s.shift_date) {
        try {
          const start = new Date(`${s.shift_date}T${s.start_time}`);
          const end = new Date(`${s.shift_date}T${s.end_time}`);
          const mins = differenceInMinutes(end, start);
          return Math.max(mins / 60, 0);
        } catch {
          return 0;
        }
      }
      return 0;
    };

    for (const s of arr) {
      const sid = s.staff_id || s.staff;
      if (!sid) continue;
      if (!stats[sid]) stats[sid] = { hours: 0, shifts: 0 };
      stats[sid].hours += getHours(s);
      stats[sid].shifts += 1;
    }

    return stats;
  }, [shifts]);

  const analyticsStartDate = useMemo(
    () => (period?.start_date ? new Date(period.start_date) : null),
    [period?.start_date]
  );
  const analyticsEndDate = useMemo(
    () => (period?.end_date ? new Date(period.end_date) : null),
    [period?.end_date]
  );

  if (!period?.id) {
    return (
      <div className="d-flex justify-content-center align-items-center p-4 text-muted">
        Loading roster…
      </div>
    );
  }

  return (
    <div className="mt-4">
      {/* --------------------------- */}
      {/* 🔥 Embedded Analytics Block */}
      {/* --------------------------- */}
      {analyticsStartDate && analyticsEndDate && (
        <div className="mt-4">
          <h2 className="h5 mb-3">
            Roster Analytics ({format(analyticsStartDate, "yyyy-MM-dd")} →{" "}
            {format(analyticsEndDate, "yyyy-MM-dd")})
          </h2>
        </div>
      )}

      <RosterAnalytics
        hotelSlug={hotelSlug}
        startDate={analyticsStartDate}
        endDate={analyticsEndDate}
        department={department}
      />

      <RosterPeriodSelector
        hotelSlug={hotelSlug}
        selectedPeriod={period.id}
        setSelectedPeriod={setPeriod}
        onPeriodCreated={setPeriod}
      />

      {/* Roster Table */}
      <div className="table-responsive">
        <table className="table table-bordered table-sm align-middle">
          <thead>
            <tr className="bg-light small">
              <th
                className="position-sticky start-0 bg-light text-start z-3"
                style={{ minWidth: "220px" }}
              >
                Staff
              </th>
              {days.map((day) => (
                <th key={day.toString()} className="text-center text-nowrap">
                  {format(day, "EEE dd")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staffList.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center text-muted py-4">
                  No staff available.
                </td>
              </tr>
            ) : (
              staffList.map((staff) => {
                const stats = staffWeekStats[staff.id] || {
                  hours: 0,
                  shifts: 0,
                };
                return (
                  <tr key={staff.id} className="small">
                    <td className="position-sticky start-0 bg-white z-2">
                      <div className="d-flex align-items-center gap-2">
                        <span
                          className="d-inline-flex rounded-circle overflow-hidden"
                          style={{ width: 32, height: 32 }}
                        >
                          {staff.profile_image_url ? (
                            <img
                              src={buildImageUrl(staff.profile_image_url)}
                              alt={`${staff.first_name} ${staff.last_name}`}
                              style={{
                                width: 32,
                                height: 32,
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <FaUserCircle size={32} />
                          )}
                        </span>
                        <div className="d-flex flex-column">
                          <span className="fw-medium">
                            {staff.first_name} {staff.last_name}
                          </span>
                          {/* Hours red, shifts green */}
                          <span className="small">
                            H:&nbsp;
                            <span className="text-danger fw-semibold">
                              {stats.hours.toFixed(2)}
                            </span>
                            &nbsp;• Sh:&nbsp;
                            <span className="text-success fw-semibold">
                              {stats.shifts}
                            </span>
                          </span>
                        </div>
                      </div>
                    </td>

                    {days.map((day) => (
                      <td
                        key={day.toString()}
                        className="text-center align-middle"
                      >
                        <div className="d-flex justify-content-center align-items-center">
                          <ShiftCell
                            staff={staff}
                            date={day}
                            baseRoster={baseRoster}
                            localShifts={localShifts}
                            onAdd={open}
                            onEdit={open}
                            locationsMap={locationsMap}
                          />
                        </div>
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {localShifts.length > 0 && (
        <div className="d-flex justify-content-center mt-4">
          <button className="btn btn-success px-4" onClick={bulkSubmit}>
            Submit Roster ({localShifts.length} changes)
          </button>
        </div>
      )}

      <ShiftModal
        show={!!editing.staff}
        staff={editing.staff}
        date={editing.date}
        shift={editing.shift}
        onClose={close}
        onSave={save}
        onDelete={remove}
        locations={locations}
      />
    </div>
  );
}

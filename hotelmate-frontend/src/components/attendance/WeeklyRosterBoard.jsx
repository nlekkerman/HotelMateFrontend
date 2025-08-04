import React, { useEffect, useMemo, useState } from "react";
import {  parseISO,addDays, startOfWeek, format, differenceInMinutes, differenceInCalendarDays } from "date-fns";
import RosterPeriodSelector from "@/components/attendance/RosterPeriodSelector";
import ShiftModal from "@/components/modals/ShiftModal";
import ShiftCell from "@/components/attendance/ShiftCell";
import useRoster from "@/hooks/useRoster";
import useCopyRoster from "@/components/attendance/hooks/useCopyRoster";
import RosterAnalytics from "@/components/analytics/RosterAnalytics";
import ShiftLocationBar from "@/components/attendance/ShiftLocationBar";
import { FaUserCircle } from "react-icons/fa";
import CopyPeriodModal from "@/components/attendance/modals/CopyPeriodModal";
import api from "@/services/api";

export default function WeeklyRosterBoard({
  hotelSlug,
  department,
  staffList = [],
  shifts = [],
  fetchShifts,
  period: initialPeriod,
  onPeriodChange,
  hotelId: injectedHotelId,
  onSubmitSuccess,
  refreshKey,
  initialDate,
}) {
  const {
    period,
    setPeriod,
    localShifts,
    setLocalShifts,
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
    onSubmitSuccess,
  });

   // Call the hook with needed arguments
  const { copyRoster, loading: copyLoading, error: copyError } = useCopyRoster({
    hotelSlug,
    fetchShifts,
    onCopySuccess: () => {
      alert("Roster copied successfully");
      setShowCopyModal(false);
      // Optionally, refresh shifts or update local state here
    },
    onCopyError: (err) => {
      alert(`Failed to copy roster: ${err.message || err}`);
    },
  });
const [localShiftsByPeriod, setLocalShiftsByPeriod] = useState({});

  // Then, derive the current period's local shifts like this:
  const localShiftsForCurrentPeriod = localShiftsByPeriod[period?.id] || [];

useEffect(() => {
    const shiftsForCurrentPeriod = localShiftsByPeriod[period?.id] || [];
    setLocalShifts(shiftsForCurrentPeriod);
  }, [period?.id, localShiftsByPeriod, setLocalShifts]);
  
  const [showCopyModal, setShowCopyModal] = useState(false);

  const cloudinaryBase = import.meta.env.VITE_CLOUDINARY_BASE || "";
  const buildImageUrl = (img) => {
    if (!img || typeof img !== "string") return null;
    if (img.startsWith("data:")) return img;
    if (/^https?:\/\//i.test(img)) return img;
    return cloudinaryBase ? `${cloudinaryBase}${img}` : img;
  };
  const [locations, setLocations] = useState([]);
  const [showAnalytics, setShowAnalytics] = useState(false);

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
    const deduped = Object.values(
      (Array.isArray(shifts) ? shifts : []).reduce((map, shift) => {
        map[shift.id] = shift;
        return map;
      }, {})
    );

    return deduped.reduce((acc, s) => {
      const staffKey = s.staff_id || s.staff;
      const key = `${staffKey}_${s.shift_date}`;
      acc[key] = acc[key] ? [...acc[key], s] : [s];
      return acc;
    }, {});
  }, [shifts]);

  const staffWeekStats = useMemo(() => {
    const stats = {};
    const getHours = (s) => {
      if (s.expected_hours != null) return Number(s.expected_hours) || 0;
      if (s.start_time && s.end_time && s.shift_date) {
        try {
          const start = new Date(`${s.shift_date}T${s.start_time}`);
          const end = new Date(`${s.shift_date}T${s.end_time}`);
          return Math.max(differenceInMinutes(end, start) / 60, 0);
        } catch {
          return 0;
        }
      }
      return 0;
    };

    for (const s of shifts) {
      const sid = s.staff_id || s.staff;
      if (!sid) continue;
      if (!stats[sid]) stats[sid] = { hours: 0, shifts: 0 };
      stats[sid].hours += getHours(s);
      stats[sid].shifts += 1;
    }

    return stats;
  }, [shifts]);

  const analyticsStartDate = period?.start_date
    ? new Date(period.start_date)
    : null;
  const analyticsEndDate = period?.end_date ? new Date(period.end_date) : null;

  if (!period?.id) {
    return (
      <div className="d-flex justify-content-center align-items-center p-4 text-muted">
        Loading roster…
      </div>
    );
  }

  const onCopyWeekForAllClick = () => {
    setShowCopyModal(true);
  };
const onCopyContinue = async (targetPeriodId) => {
  try {
    // Fetch shifts for old period
    const shiftsToCopy = await fetchShifts(period.id);

    if (!shiftsToCopy || !Array.isArray(shiftsToCopy)) {
      alert("No valid shifts returned to copy");
      return;
    }

    // Fetch new period details using your api helper
    let newPeriod;
    try {
      const response = await api.get(`/attendance/${hotelSlug}/periods/${targetPeriodId}/`);
      newPeriod = response.data;
    } catch (err) {
      console.error("Failed to load target period details:", err.response?.data || err.message);
      alert("Failed to load target period details");
      return;
    }

    // Calculate date offset
    const oldStart = parseISO(period.start_date);
    const newStart = parseISO(newPeriod.start_date);
    const offsetDays = differenceInCalendarDays(newStart, oldStart);

    // Adjust shifts for new period
    const adjustedShifts = shiftsToCopy.map((shift) => {
      const oldShiftDate = parseISO(shift.shift_date);
      const newShiftDate = addDays(oldShiftDate, offsetDays);
      return {
        ...shift,
        shift_date: format(newShiftDate, "yyyy-MM-dd"),
        period: targetPeriodId,
        id: undefined,
      };
    });

    // Update local shifts for the new period
    setLocalShiftsByPeriod((prev) => ({
      ...prev,
      [targetPeriodId]: adjustedShifts,
    }));

    // Switch to the new period
    setPeriod(newPeriod);
console.log("Adjusted shifts for target period:", adjustedShifts);
console.log("Current localShiftsByPeriod before update:", localShiftsByPeriod);
    // Also update localShifts for immediate UI update
    setLocalShifts(adjustedShifts);

    alert("Shifts copied and loaded for new period. Please review and submit.");
  } catch (error) {
    console.error("Error copying shifts:", error);
    alert("Error loading shifts for copy. Please try again.");
  }
};




  return (
    <div className="mt-4">
      <button
        className="btn btn-outline-secondary mb-3"
        onClick={() => setShowAnalytics((prev) => !prev)}
      >
        {showAnalytics ? "Hide Analytics" : "Show Analytics"}
      </button>

      {showAnalytics && analyticsStartDate && analyticsEndDate && (
        <div className="mt-4">
          <h2 className="h5 mb-3">
            Roster Analytics ({format(analyticsStartDate, "dd/MM/yy")} →{" "}
            {format(analyticsEndDate, "dd/MM/yy")})
          </h2>
          <RosterAnalytics
            hotelSlug={hotelSlug}
            startDate={analyticsStartDate}
            endDate={analyticsEndDate}
            selectedDepartment={department}
            refreshKey={refreshKey}
          />
        </div>
      )}

      <div className="table-responsive">
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start gap-3 p-3 border-bottom bg-white">
          <div>
            <h6 className="text-muted mb-2">Roster Period</h6>
            <RosterPeriodSelector
              hotelSlug={hotelSlug}
              selectedPeriod={period.id}
              setSelectedPeriod={setPeriod}
              onPeriodCreated={setPeriod}
            />
            <button
              className="btn btn-primary mt-2"
              title="Copy entire roster period for all staff"
              onClick={onCopyWeekForAllClick}
            >
              Copy Whole Roster Period
            </button>
          </div>

          <div className="flex-grow-1">
            <h6 className="text-muted mb-2">Locations</h6>
            <ShiftLocationBar
              hotelSlug={hotelSlug}
              onChange={(locs) => {
                const list = Array.isArray(locs) ? locs : locs?.results ?? [];
                setLocations(list);
              }}
            />
          </div>
        </div>

        <table className="table table-bordered table-sm align-middle">
          <thead>
            <tr className="bg-light small">
              <th className="bg-light text-start" style={{ minWidth: "220px" }}>
                Staff
              </th>
              {days.map((day) => (
                <th
                  key={day.toString()}
                  className="text-center text-nowrap position-relative"
                >
                  {format(day, "EEE dd")}
                  <button
                    className="btn btn-sm position-absolute top-0 end-0"
                    title={`Copy complete day for all staff: ${format(
                      day,
                      "dd/MM/yyyy"
                    )}`}
                    onClick={() => onCopyDayForAllClick(day)}
                  >
                    📋
                  </button>
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
                    <td className="bg-white z-2">
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
          <button
            className="btn btn-success px-4"
            onClick={async () => {
              const result = await bulkSubmit();
              if (result?.success && typeof onSubmitSuccess === "function") {
                onSubmitSuccess();
              }
            }}
          >
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

      <CopyPeriodModal
        show={showCopyModal}
        onClose={() => setShowCopyModal(false)}
        hotelSlug={hotelSlug}
        department={department}
        currentPeriod={period}
        onContinue={onCopyContinue}
      />
    </div>
  );
}

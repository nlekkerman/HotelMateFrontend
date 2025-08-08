import React, { useEffect, useMemo, useState } from "react";
import { addDays, startOfWeek, format, differenceInMinutes } from "date-fns";

import RosterPeriodSelector from "@/components/attendance/RosterPeriodSelector";
import ShiftModal from "@/components/modals/ShiftModal";
import ShiftCell from "@/components/attendance/ShiftCell";
import useRoster from "@/hooks/useRoster";
import useCopyRoster from "@/components/attendance/hooks/useCopyRoster";
import useCopyDayForAll from "@/components/attendance/hooks/useCopyDayForAll";
import RosterAnalytics from "@/components/analytics/RosterAnalytics";
import ShiftLocationBar from "@/components/attendance/ShiftLocationBar";
import { FaUserCircle } from "react-icons/fa";
import CopyPeriodModal from "@/components/attendance/modals/CopyPeriodModal";
import CopyDayModal from "@/components/attendance/modals/CopyDayModal";
import SuccessModal from "@/components/modals/SuccessModal";
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

  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const {
    copyAndSaveRoster,
    loading: copyLoading,
    error: copyError,
  } = useCopyRoster({
    hotelSlug,
    onCopySuccess: () => {
      setShowCopyModal(false);
      setShowSuccessModal(true);
    },
    onCopyError: (err) => alert(`Failed to copy roster: ${err.message || err}`),
  });
  const { copyDayForAll, loading, error } = useCopyDayForAll(hotelSlug);
  // Manage local shifts per period to persist changes locally by period ID
  const [localShiftsByPeriod, setLocalShiftsByPeriod] = useState({});

  useEffect(() => {
    const shiftsForCurrentPeriod = localShiftsByPeriod[period?.id] ?? [];
    setLocalShifts(shiftsForCurrentPeriod);
  }, [period?.id, localShiftsByPeriod, setLocalShifts]);

  const [showCopyModal, setShowCopyModal] = useState(false);
  const [copyDayModal, setCopyDayModal] = useState({
    show: false,
    sourceDate: null,
  });
  const [locations, setLocations] = useState([]);
  const [showAnalytics, setShowAnalytics] = useState(false);

  // Cloudinary image url builder
  const cloudinaryBase = import.meta.env.VITE_CLOUDINARY_BASE || "";
  const buildImageUrl = (img) => {
    if (!img || typeof img !== "string") return null;
    if (img.startsWith("data:") || /^https?:\/\//i.test(img)) return img;
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

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const locationsMap = useMemo(() => {
    if (!Array.isArray(locations)) return {};
    return locations.reduce((acc, loc) => {
      acc[loc.id] = loc;
      return acc;
    }, {});
  }, [locations]);

  // Group shifts by staff+date key
  const baseRoster = useMemo(() => {
    const dedupedShifts = Array.isArray(shifts) ? shifts : [];
    const uniqueShifts = Object.values(
      dedupedShifts.reduce((map, shift) => {
        map[shift.id] = shift;
        return map;
      }, {})
    );

    return uniqueShifts.reduce((acc, shift) => {
      const staffKey = shift.staff_id ?? shift.staff;
      const key = `${staffKey}_${shift.shift_date}`;
      acc[key] = acc[key] ? [...acc[key], shift] : [shift];
      return acc;
    }, {});
  }, [shifts]);

  // Calculate staff stats for the week
  const staffWeekStats = useMemo(() => {
    const stats = {};

    const getHours = (shift) => {
      if (shift.expected_hours != null)
        return Number(shift.expected_hours) || 0;
      if (shift.start_time && shift.end_time && shift.shift_date) {
        try {
          const start = new Date(`${shift.shift_date}T${shift.start_time}`);
          const end = new Date(`${shift.shift_date}T${shift.end_time}`);
          return Math.max(differenceInMinutes(end, start) / 60, 0);
        } catch {
          return 0;
        }
      }
      return 0;
    };

    for (const shift of shifts) {
      const sid = shift.staff_id ?? shift.staff;
      if (!sid) continue;
      if (!stats[sid]) stats[sid] = { hours: 0, shifts: 0 };
      stats[sid].hours += getHours(shift);
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

  const handleCopyIconClick = (day) => {
    setCopyDayModal({ show: true, sourceDate: day });
  };

  const handleCopyDayConfirm = async (sourceDate, targetDate) => {
    try {
      await copyDayForAll(format(sourceDate, "yyyy-MM-dd"), targetDate);
      setSuccessMessage("Copied day successfully!");
      setShowSuccessModal(true);
    } catch (err) {
      alert(`Error: ${err.message || err}`);
    } finally {
      setCopyDayModal({ show: false, sourceDate: null });
    }
  };

  const onCopyContinue = async (targetPeriodId) => {
    try {
      const newPeriod = await api
        .get(`/attendance/${hotelSlug}/periods/${targetPeriodId}/`)
        .then((res) => res.data);

      // Assuming copyRoster returns saved shifts, otherwise update logic here
      const savedShifts = await copyAndSaveRoster(period.id, newPeriod);

      setLocalShiftsByPeriod((prev) => ({
        ...prev,
        [targetPeriodId]: savedShifts,
      }));
      setPeriod(newPeriod);
      setSuccessMessage("Roster copied successfully for the selected period!");
      setShowSuccessModal(true);
      setShowCopyModal(false);
    } catch (err) {
      console.error("Copy and save failed:", err);
      alert(`Copy and save failed: ${err.message || err}`);
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
        <div className="d-flex flex-column flex-lg-row justify-content-evenly align-items-start gap-3 p-3 border-bottom bg-white">
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
              <th className="bg-light text-start" style={{ minWidth: 220 }}>
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
                    onClick={() => handleCopyIconClick(day)}
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
                const stats = staffWeekStats[staff.id] ?? {
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
      <SuccessModal
        show={showSuccessModal}
        message={successMessage}
        onClose={() => setShowSuccessModal(false)}
      />
      <CopyDayModal
  show={copyDayModal.show}
  sourceDate={copyDayModal.sourceDate}
  onClose={() => setCopyDayModal({ show: false, sourceDate: null })}
  onConfirm={handleCopyDayConfirm}
/>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { addDays, startOfWeek, format, differenceInMinutes } from "date-fns";
import RosterPeriodSelector from "@/components/attendance/RosterPeriodSelector";
import ShiftModal from "@/components/modals/ShiftModal";
import ShiftCell from "@/components/attendance/ShiftCell";
import useRoster from "@/hooks/useRoster";
import RosterAnalytics from "@/components/analytics/RosterAnalytics";
import ShiftLocationBar from "@/components/attendance/ShiftLocationBar";
import useCopyRoster from "@/components/attendance/hooks/useCopyRoster";
import { FaUserCircle } from "react-icons/fa";
import CopyShiftModal from "@/components/attendance/modals/CopyShiftModal";

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

  const [showModal, setShowModal] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [copyAction, setCopyAction] = useState(null); // 'copyDayForAll' | 'copyWeekForAllStaff'
  const [copySourceDate, setCopySourceDate] = useState(null);
  const [modalProps, setModalProps] = useState({
    defaultCopyType: null,
    limitedOptions: false,
  });

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

  const analyticsStartDate = period?.start_date ? new Date(period.start_date) : null;
  const analyticsEndDate = period?.end_date ? new Date(period.end_date) : null;

  if (!period?.id) {
    return (
      <div className="d-flex justify-content-center align-items-center p-4 text-muted">
        Loading roster…
      </div>
    );
  }

  const { copyOneShift, copyDayForStaff, copyDayForAll, copyWeekForAllStaff } =
    useCopyRoster({ baseRoster, localShifts, setLocalShifts });

  // Core copy handlers:
  const handleCopyOneShift = (staff, targetDate) => {
    const shiftsForStaffDate =
      baseRoster[`${staff.id}_${format(selectedDate, "yyyy-MM-dd")}`] || [];
    if (shiftsForStaffDate.length) {
      copyOneShift(shiftsForStaffDate[0], targetDate);
    }
  };

  const handleCopyDayForStaff = (staff, targetDate) => {
    copyDayForStaff(staff, selectedDate, targetDate);
  };

  const handleCopyDayForAll = (sourceDate, targetDate) => {
    copyDayForAll(sourceDate, targetDate, staffList);
  };

  const handleCopyWeekForAllStaff = (sourceDate, targetWeekStart) => {
    copyWeekForAllStaff(sourceDate, targetWeekStart, staffList);
  };

  const onCopyWeekForAllClick = (sourceWeekStart) => {
    setCopyAction("copyWeekForAllStaff");
    setCopySourceDate(sourceWeekStart);
    setModalProps({
      defaultCopyType: "week_all",
      limitedOptions: true,
    });
    setShowModal(true);
  };

  const onCopyDayForAllClick = (sourceDate) => {
    setCopyAction("copyDayForAll");
    setCopySourceDate(sourceDate);
    setModalProps({
      defaultCopyType: "day_all",
      limitedOptions: true,
    });
    setShowModal(true);
  };

  const onConfirmCopy = (targetDate) => {
    setShowModal(false);
    if (copyAction === "copyDayForAll") {
      handleCopyDayForAll(copySourceDate, targetDate);
    } else if (copyAction === "copyWeekForAllStaff") {
      handleCopyWeekForAllStaff(copySourceDate, targetDate);
    }
    setCopyAction(null);
    setCopySourceDate(null);
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
              onClick={() => onCopyWeekForAllClick(weekStart)}
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
                      <td key={day.toString()} className="text-center align-middle">
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

      {showModal && (
        <CopyShiftModal
          staff={selectedStaff}
          date={selectedDate}
          onClose={() => setShowModal(false)}
          onCopyOneShift={handleCopyOneShift}
          onCopyDayForStaff={handleCopyDayForStaff}
          onCopyDayForAll={handleCopyDayForAll}
          onCopyWeekForAllStaff={handleCopyWeekForAllStaff}
          limitedOptions={modalProps.limitedOptions}
          defaultCopyType={modalProps.defaultCopyType}
          onConfirm={onConfirmCopy}
        />
      )}
    </div>
  );
}

import React, { useEffect, useMemo, useState } from "react";
import { addDays, startOfWeek, format, differenceInMinutes } from "date-fns";

import RosterPeriodSelector from "@/components/attendance/RosterPeriodSelector";
import ShiftModal from "@/components/modals/ShiftModal";
import ShiftCell from "@/components/attendance/ShiftCell";
import useRoster from "@/hooks/useRoster";
import useCopyRoster from "@/components/attendance/hooks/useCopyRoster";
import useCopyDayForAll from "@/components/attendance/hooks/useCopyDayForAll";
import useCopyStaffWeek from "@/components/attendance/hooks/useCopyStaffWeek";
import CopyWeekForStaffModal from "@/components/attendance/modals/CopyWeekForStaffModal";
import RosterAnalytics from "@/components/analytics/RosterAnalytics";
import ShiftLocationBar from "@/components/attendance/ShiftLocationBar";
import { FaUserCircle } from "react-icons/fa";
import CopyPeriodModal from "@/components/attendance/modals/CopyPeriodModal";
import CopyDayModal from "@/components/attendance/modals/CopyDayModal";
import SuccessModal from "@/components/modals/SuccessModal";
import api from "@/services/api";
import { FiCopy } from "react-icons/fi";

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
    reloadShifts,
  } = useRoster({
    hotelSlug,
    department,
    fetchShifts,
    initialPeriod,
    injectedHotelId,
    serverShifts: shifts,
    onSubmitSuccess,
  });

  const { copyAndSaveStaffWeek, loading: loadingCopyStaffWeek } =
    useCopyStaffWeek({
      hotelSlug,
      onCopySuccess: () => fetchShifts(),
      onCopyError: (err) => alert(err.message || "Copy failed."),
    });
const [showRosterContainer, setShowRosterContainer] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [modalState, setModalState] = useState({ show: false, staff: null });

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

  const {
    copyDayForAll,
    loading: loadingCopyDayForAll,
    error: errorCopyDayForAll,
  } = useCopyDayForAll(hotelSlug);

  const [localShiftsByPeriod, setLocalShiftsByPeriod] = useState({});
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [modalProps, setModalProps] = useState({});
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

  useEffect(() => {
    const shiftsForCurrentPeriod = localShiftsByPeriod[period?.id] ?? [];
    setLocalShifts(shiftsForCurrentPeriod);
  }, [period?.id, localShiftsByPeriod, setLocalShifts]);

  useEffect(() => {
    console.log("Staff list for department", department, staffList);
  }, [department, staffList]);

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

  const onCopyWeekForAllClick = (period) => {
    setModalProps({
        hotelSlug: hotelSlug,
        departmentName: department,
        period: period,
    });
    setShowCopyModal(true);
};


  const handleCopyIconClick = (day) => {
    setCopyDayModal({ show: true, sourceDate: day });
  };

  const handleCopyDayConfirm = async (sourceDate, targetDate) => {
    try {
      await copyDayForAll(format(sourceDate, "yyyy-MM-dd"), targetDate);
      await reloadShifts();

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

  const handleConfirmCopyStaffWeek = async ({
    staffId,
    sourcePeriodId,
    targetPeriodId,
  }) => {
    if (!modalState.staff) return;
    try {
      await copyAndSaveStaffWeek(
        modalState.staff.id,
        period.id,
        targetPeriodId
      );
      setSuccessMessage(
        `Week copied successfully for ${modalState.staff.first_name}!`
      );
      setShowSuccessModal(true);
      setModalState({ show: false, staff: null });
      await fetchShifts();
    } catch (err) {
      alert(`Copy failed: ${err.message || err}`);
    }
  };

return (
  <div className="container-fluid p-3">
<div className="roster-buttons-container">

     

</div>
    {/* Sticky Toolbar */}
    <div className="d-flex flex-wrap align-items-center gap-2 mb-3 sticky-top bg-white shadow-sm p-2 rounded">
      <div className="d-flex align-items-center gap-2">
        <label className="mb-0 fw-semibold">Roster Period:</label>
        <RosterPeriodSelector
          hotelSlug={hotelSlug}
          selectedPeriod={period.id}
          setSelectedPeriod={setPeriod}
          onPeriodCreated={setPeriod}
        />
      
      </div>

    <div className="ms-auto">
        <button
          className={`btn custom-button btn-sm`}
          onClick={() => setShowAnalytics((prev) => !prev)}
        >
          {showAnalytics ? "Hide Analytics" : "Show Analytics"}
        </button>
      </div>
    </div>

    {/* Analytics Section */}
    {showAnalytics && analyticsStartDate && analyticsEndDate && (
      <div className="mb-3 p-3 bg-light rounded border">
        <h6 className="mb-2 text-center">
          Roster Analytics ({format(analyticsStartDate, "dd/MM/yy")} → {format(analyticsEndDate, "dd/MM/yy")})
        </h6>
        <RosterAnalytics
          hotelSlug={hotelSlug}
          startDate={analyticsStartDate}
          endDate={analyticsEndDate}
          selectedDepartment={department}
          refreshKey={refreshKey}
        />
      </div>
    )}

    {/* Roster Grid */}
    <div className="table-responsive">
      <table className="table table-bordered table-hover align-middle text-center">
        <thead className="table-light">
  <tr>
    <th className="text-start">
      <div className="d-flex justify-content-between align-items-center">
        <span>Staff</span>
        <button
          className="btn btn-sm btn-outline-secondary"
          key={period.id}
          onClick={() => onCopyWeekForAllClick(period)}
          title="Copy whole period"
        >
          <FiCopy size={16} />
        </button>
      </div>
    </th>
    {days.map((day) => (
      <th key={day.toString()} className="position-relative">
        {format(day, "EEE dd")}
        <button
          className="btn btn-sm btn-outline-secondary position-absolute top-0 end-0 m-1"
          onClick={() => handleCopyIconClick(day)}
          title={`Copy day for all staff`}
        >
          <FiCopy size={16} />
        </button>
      </th>
    ))}
  </tr>
</thead>


        <tbody>
          {staffList.length === 0 ? (
            <tr>
              <td colSpan={days.length + 1} className="text-center text-muted py-4">
                No staff available.
              </td>
            </tr>
          ) : (
            staffList.map((staff) => {
              const stats = staffWeekStats[staff.id] ?? { hours: 0, shifts: 0 };
              return (
                <tr key={staff.id}>
                  <td className="text-start">
                    <div className="d-flex align-items-center gap-2">
                      <span className="rounded-circle overflow-hidden" style={{ width: 36, height: 36 }}>
                        {staff.profile_image_url ? (
                          <img
                            src={buildImageUrl(staff.profile_image_url)}
                            alt={`${staff.first_name} ${staff.last_name}`}
                            style={{ width: 36, height: 36, objectFit: "cover" }}
                          />
                        ) : (
                          <FaUserCircle size={36} />
                        )}
                      </span>
                      <div className="flex-grow-1">
                        <div className="fw-semibold">{staff.first_name} {staff.last_name}</div>
                        <div className="small text-muted">
                          H: {stats.hours.toFixed(2)} • Sh: {stats.shifts}
                        </div>
                      </div>
                      <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => setModalState({ show: true, staff })}
                        title="Copy staff week"
                      >
                        <FiCopy size={16} />
                      </button>
                    </div>
                  </td>

                  {days.map((day) => (
                    <td key={day.toString()}>
                      <ShiftCell
                        staff={staff}
                        date={day}
                        baseRoster={baseRoster}
                        localShifts={localShifts}
                        onAdd={open}
                        onEdit={open}
                        locationsMap={locationsMap}
                      />
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>

    {/* Floating Submit Button */}
    {localShifts.length > 0 && (
      <div className="position-sticky bottom-0 start-50 translate-middle-x py-2 bg-white shadow-sm rounded mt-3 d-flex justify-content-center">
        <button
          className="btn btn-success btn-lg px-5"
          onClick={async () => {
            const result = await bulkSubmit();
            if (result?.success && typeof onSubmitSuccess === "function") onSubmitSuccess();
          }}
        >
          Submit Roster ({localShifts.length} changes)
        </button>
      </div>
    )}

    {/* Modals */}
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
  currentPeriodId={modalProps?.period?.id}
  {...modalProps}
  onClose={() => setShowCopyModal(false)}
  department={department} // must be defined here
  currentPeriod={period}
  onContinue={onCopyContinue}
  loading={copyLoading}
  error={copyError}
/>


    <CopyDayModal
      show={copyDayModal.show}
      sourceDate={copyDayModal.sourceDate}
      onClose={() => setCopyDayModal({ show: false, sourceDate: null })}
      onConfirm={handleCopyDayConfirm}
      loading={loadingCopyDayForAll}
      error={errorCopyDayForAll}
    />

    <CopyWeekForStaffModal
      show={modalState.show}
      staff={modalState.staff}
      currentPeriodId={period.id}
      onClose={() => setModalState({ show: false, staff: null })}
      onContinue={handleConfirmCopyStaffWeek}
      loading={loadingCopyStaffWeek}
    />

    <SuccessModal
      show={showSuccessModal}
      message={successMessage}
      onClose={() => setShowSuccessModal(false)}
    />
  </div>
);


}

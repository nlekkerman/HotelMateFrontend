import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  Button,
  Modal,
  Form,
  Alert,
  Spinner,
  Badge,
  Dropdown,
  Toast,
  ToastContainer,
} from "react-bootstrap";
import StaffSuccessModal from "@/components/staff/modals/StaffSuccessModal";
import StaffConfirmationModal from "@/components/staff/modals/StaffConfirmationModal";
import { format, parseISO, eachDayOfInterval, isSameDay } from "date-fns";
import api from "@/services/api";
import useStaffMetadata from "@/hooks/useStaffMetadata";
import { safeString, safeNumber } from "../utils/safeUtils";
import {
  CopyDayModal,
  CopyStaffWeekModal,
  CopyBulkModal,
} from "./CopyModals";
import { executeCopyOperation } from "../utils/executeCopyOperation";
import "../styles/roster-grid.css";

/**
 * Utility function to check if two shifts overlap
 */
const checkShiftOverlap = (shift1, shift2) => {
  // Normalize times to HH:MM format for comparison
  const normalize = (timeStr) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5); // Get just HH:MM part
  };
  
  const start1 = normalize(shift1.shift_start);
  const end1 = normalize(shift1.shift_end);
  const start2 = normalize(shift2.shift_start);
  const end2 = normalize(shift2.shift_end);
  
  // Allow touching times (09:45-10:46 and 10:46-18:00)
  // If end of shift1 equals start of shift2, or vice versa, it's touching (allowed)
  if (end1 === start2 || end2 === start1) {
    return false; // Touching times are allowed
  }
  
  // Check for actual overlap (one starts before the other ends)
  return (start1 < end2 && start2 < end1);
};

/**
 * Shift Edit Modal Component
 */
function ShiftEditModal({
  show,
  onHide,
  shift,
  staff,
  date,
  hotelSlug,
  selectedPeriod,
  selectedDepartment,
  onSave,
  onDeleteRequest,
  existingShifts = [],
}) {
  const [formData, setFormData] = useState({
    shift_start: "",
    shift_end: "",
    location_id: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [locations, setLocations] = useState([]);
  const [overlapWarning, setOverlapWarning] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [pendingEditAfterCancel, setPendingEditAfterCancel] = useState(null);

  // Load shift locations
  // Load shift locations
useEffect(() => {
  if (hotelSlug) {
    api
      .get(`/staff/hotel/${hotelSlug}/attendance/shift-locations/`)
      .then((response) => {
        const data = response.data;

        const normalized =
          Array.isArray(data) ? data
          : Array.isArray(data?.results) ? data.results
          : [];

        setLocations(normalized);
      })
      .catch((err) => console.error("Failed to load locations:", err));
  }
}, [hotelSlug]);


  // Populate form when shift changes
  useEffect(() => {
    if (shift) {
      setFormData({
        shift_start: shift.shift_start || "",
        shift_end: shift.shift_end || "",
        location_id: shift.location_id || "",
        notes: shift.notes || "",
      });
    } else {
      // Leave blank for manual selection
      setFormData({
        shift_start: "",
        shift_end: "",
        location_id: "",
        notes: "",
      });
    }
    setError(null);
    setOverlapWarning("");
  }, [shift, show]);

  // Check for overlaps when times change
  useEffect(() => {
    if (formData.shift_start && formData.shift_end && existingShifts.length > 0) {
      const currentShift = {
        shift_start: formData.shift_start,
        shift_end: formData.shift_end,
        staff: staff?.id,
        shift_date: date
      };
      
      // Existing shifts already filtered to exclude current shift, so no need for id check
      const overlapping = existingShifts.find(existing => 
        checkShiftOverlap(currentShift, existing)
      );
      
      if (overlapping) {
        setOverlapWarning(`This shift overlaps with existing shift ${overlapping.shift_start}-${overlapping.shift_end}`);
      } else {
        setOverlapWarning("");
      }
    } else {
      setOverlapWarning("");
    }
  }, [formData.shift_start, formData.shift_end, existingShifts, shift?.id, staff?.id, date]);

  // ✅ Safely format date for header
  const safeFormattedDate = (() => {
    if (!date) return "No date selected";
    try {
      return format(parseISO(date), "EEEE, MMMM d, yyyy");
    } catch (err) {
      console.error("Invalid date passed to ShiftEditModal:", date, err);
      return "Invalid date";
    }
  })();

  const handleSave = async () => {
    if (!formData.shift_start || !formData.shift_end) {
      setError("Start and end times are required");
      return;
    }

    if (!staff?.id) {
      setError("No staff member selected for this shift");
      return;
    }

    if (!date) {
      setError("No date selected for this shift");
      return;
    }

    // Check for overlaps before saving
    if (overlapWarning) {
      setError("Cannot save shift: " + overlapWarning);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        hotel: selectedPeriod?.hotel || null,
        staff: staff.id,
        department: selectedDepartment,
        period: selectedPeriod?.id || null,
        shift_date: date,
        shift_start: formData.shift_start,
        shift_end: formData.shift_end,
        location_id: formData.location_id || null,
        notes: formData.notes || "",
      };

      // Always save as draft, preserve original ID for updates
      const draftShift = {
        ...payload,
        id: shift?.id || `draft_${Date.now()}_${Math.random()}`,
        original_id: shift?.id && !shift?.is_draft ? shift.id : undefined, // Track original server shift ID
        is_draft: true
      };
      onSave(draftShift);
      onHide();
    } catch (err) {
      setError(
        err.response?.data?.detail || err.message || "Failed to save shift"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = () => {
    if (!shift?.id || !onDeleteRequest) return;
    onDeleteRequest(shift);
  };

  return (
    <>
      <Modal show={show} onHide={onHide} centered className="shift-modal">
        <Modal.Header closeButton>
          <Modal.Title>
            {shift?.id ? "Edit Shift" : "Create Shift"} - {staff ? `${staff.first_name ?? ""} ${staff.last_name ?? ""}`.trim() || "Unnamed" : ""}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}

        <div className="date-header">
          <strong>Date:</strong> {safeFormattedDate}
        </div>

        {/* Show existing shifts for reference */}
        {existingShifts.length > 0 && (
          <div className="existing-shifts-info mb-3">
            <small className="text-muted">Existing shifts for this day:</small>
            <div className="d-flex flex-wrap gap-1 mt-1">
              {existingShifts
                .filter(s => s.id !== shift?.id)
                .sort((a, b) => a.shift_start.localeCompare(b.shift_start))
                .map((s, idx) => {
                  const uniqueKey = `existing_${s.id || 'temp'}_${s.staff}_${s.shift_start}_${idx}`;
                  return (
                    <Badge key={uniqueKey} bg={s.is_draft ? "warning" : "secondary"} className="text-dark">
                      {s.shift_start?.substring(0, 5)}-{s.shift_end?.substring(0, 5)}
                      {s.is_draft && " (draft)"}
                    </Badge>
                  );
                })}
            </div>
          </div>
        )}



        {overlapWarning && (
          <Alert variant="warning" className="mb-3">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {overlapWarning}
          </Alert>
        )}

        <Form>
          <div className="row">
            <div className="col-6">
              <Form.Group className="mb-3">
                <Form.Label>Start Time</Form.Label>
                <Form.Control
                  type="time"
                  className="time-input"
                  value={formData.shift_start}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      shift_start: e.target.value,
                    }))
                  }
                  disabled={loading}
                />
              </Form.Group>
            </div>
            <div className="col-6">
              <Form.Group className="mb-3">
                <Form.Label>End Time</Form.Label>
                <Form.Control
                  type="time"
                  className="time-input"
                  value={formData.shift_end}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      shift_end: e.target.value,
                    }))
                  }
                  disabled={loading}
                />
              </Form.Group>
            </div>
          </div>

          <Form.Group className="mb-3">
            <Form.Label>Location</Form.Label>
            <Form.Select
              value={formData.location_id}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  location_id: e.target.value,
                }))
              }
              disabled={loading}
            >
              <option value="">Select location...</option>
              {(locations || []).map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Notes</Form.Label>
            <Form.Control
              as="textarea"
              rows={2}
              value={formData.notes}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, notes: e.target.value }))
              }
              placeholder="Optional notes..."
              disabled={loading}
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        {shift?.id && (
          <Button
            variant="danger"
            onClick={handleDeleteClick}
            disabled={loading}
            className="me-auto"
          >
            {loading ? <Spinner size="sm" /> : "Delete"}
          </Button>
        )}
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSave} 
          disabled={loading || !!overlapWarning}
        >
          {loading ? (
            <Spinner size="sm" />
          ) : (
            shift?.id ? "Update" : "Save"
          )}
        </Button>
      </Modal.Footer>
    </Modal>


    {/* Delete Confirmation Modal */}
    {showDeleteConfirm && (
      <div style={{ zIndex: 2000 }}>
        <StaffConfirmationModal
          show={showDeleteConfirm}
          title="Delete Shift"
          message="Are you sure you want to delete this shift? This action cannot be undone."
          preset="delete_item"
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
          setShowDeleteConfirm(false);
          // Reopen edit modal with previous state
          if (pendingEditAfterCancel) {
            // Restore form data
            setFormData(pendingEditAfterCancel.formData);
            // Reopen modal
            setTimeout(() => onShow(), 100); // Small delay to ensure proper modal transition
            setPendingEditAfterCancel(null);
          }
        }}
        />
      </div>
    )}


    </>
  );
}

/**
 * Main Roster Management Grid Component
 */
export default function RosterManagementGrid({
  selectedPeriod,
  hotelSlug,
  onRefresh,
  departmentFilter = null, // Optional department filter
  availablePeriods = [], // Available periods for copy operations
  onPeriodSwitch = null, // Callback to switch to different period
}) {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState(departmentFilter || "");
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState(null);
  const [editingStaff, setEditingStaff] = useState(null);
  const [editingDate, setEditingDate] = useState(null);
  const [isCreatingAdditionalShift, setIsCreatingAdditionalShift] = useState(false);

  // Copy modal states
  const [showCopyDayModal, setShowCopyDayModal] = useState(false);
  const [showCopyStaffModal, setShowCopyStaffModal] = useState(false);
  const [showCopyBulkModal, setShowCopyBulkModal] = useState(false);
  const [copySourceDate, setCopySourceDate] = useState(null);
  const [copySourceStaff, setCopySourceStaff] = useState(null);
  
  // Toast state
  const [toastMessage, setToastMessage] = useState(null);
  const [toastVariant, setToastVariant] = useState("success");
  
  // Delete confirmation modal states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [showPublishSuccess, setShowPublishSuccess] = useState(false);
  const [publishMessage, setPublishMessage] = useState('');
  const [shiftToDelete, setShiftToDelete] = useState(null);

  // Draft state management
  const [draftShifts, setDraftShifts] = useState([]);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [bulkSaving, setBulkSaving] = useState(false);

  // Draft copy state management
  const [draftCopiedShifts, setDraftCopiedShifts] = useState([]);
  const [hasCopiedChanges, setHasCopiedChanges] = useState(false);
  const [bulkCopying, setBulkCopying] = useState(false);

  const [allStaff, setAllStaff] = useState([]);
  const { departments = [] } = useStaffMetadata(hotelSlug) || {};

  // Storage keys for drafts
  const draftStorageKey = `roster_draft_${hotelSlug}_${selectedPeriod?.id}`;
  const copiedDraftStorageKey = `roster_copied_draft_${hotelSlug}_${selectedPeriod?.id}`;

  // Save drafts to localStorage
  const saveDraftsToStorage = () => {
    if (selectedPeriod && hotelSlug) {
      const draftState = {
        hotel_id: selectedPeriod.hotel,
        period_id: selectedPeriod.id,
        shifts: draftShifts,
        isDirty,
        lastSaved,
        timestamp: Date.now()
      };
      localStorage.setItem(draftStorageKey, JSON.stringify(draftState));
    }
  };

  // Save copied drafts to localStorage
  const saveCopiedDraftsToStorage = () => {
    if (selectedPeriod && hotelSlug) {
      const copiedDraftState = {
        hotel_id: selectedPeriod.hotel,
        period_id: selectedPeriod.id,
        copiedShifts: draftCopiedShifts,
        hasCopiedChanges,
        timestamp: Date.now()
      };
      localStorage.setItem(copiedDraftStorageKey, JSON.stringify(copiedDraftState));
    }
  };

  // Load drafts from localStorage
  const loadDraftsFromStorage = () => {
    if (selectedPeriod && hotelSlug) {
      // Load regular drafts
      const stored = localStorage.getItem(draftStorageKey);
      if (stored) {
        try {
          const draftState = JSON.parse(stored);
          setDraftShifts(draftState.shifts || []);
          setIsDirty(draftState.isDirty || false);
          setLastSaved(draftState.lastSaved);
        } catch (err) {
          console.error('Failed to load draft shifts:', err);
        }
      }
      
      // Load copied drafts
      const copiedStored = localStorage.getItem(copiedDraftStorageKey);
      if (copiedStored) {
        try {
          const copiedDraftState = JSON.parse(copiedStored);
          setDraftCopiedShifts(copiedDraftState.copiedShifts || []);
          setHasCopiedChanges(copiedDraftState.hasCopiedChanges || false);
        } catch (err) {
          console.error('Failed to load copied draft shifts:', err);
        }
      }
    }
  };

  // Clear drafts from storage
  const clearDraftsFromStorage = () => {
    if (selectedPeriod && hotelSlug) {
      localStorage.removeItem(draftStorageKey);
    }
  };

  // Clear copied drafts from storage
  const clearCopiedDraftsFromStorage = () => {
    if (selectedPeriod && hotelSlug) {
      localStorage.removeItem(copiedDraftStorageKey);
    }
  };

  // Auto-select department when departments are loaded
  useEffect(() => {
    if (departmentFilter) {
      setSelectedDepartment(departmentFilter);
    } else if (departments.length > 0 && !selectedDepartment) {
      setSelectedDepartment(departments[0].slug);
    }
  }, [departments, selectedDepartment, departmentFilter]);

  // Load drafts when period changes
  useEffect(() => {
    loadDraftsFromStorage();
  }, [selectedPeriod, hotelSlug]);

  // Save drafts when they change
  useEffect(() => {
    saveDraftsToStorage();
  }, [draftShifts, isDirty, lastSaved]);

  // Save copied drafts when they change
  useEffect(() => {
    saveCopiedDraftsToStorage();
  }, [draftCopiedShifts, hasCopiedChanges]);

  // Generate days for the period
  const periodDays = useMemo(() => {
    if (!selectedPeriod) return [];

    try {
      return eachDayOfInterval({
        start: parseISO(selectedPeriod.start_date),
        end: parseISO(selectedPeriod.end_date),
      });
    } catch (error) {
      console.error("Error generating period days:", error);
      return [];
    }
  }, [selectedPeriod]);

  // Filter staff by department
  const filteredStaff = useMemo(() => {
    const baseStaff = Array.isArray(allStaff) ? allStaff : [];

    if (!selectedDepartment) return [];

    // Debug: log the first staff member's structure
    if (baseStaff.length > 0) {
      console.log("Debug - Staff structure:", baseStaff[0]);
      console.log("Debug - Selected department:", selectedDepartment);
    }

    return baseStaff.filter((staff) => {
      // Check both possible department structures
      const deptSlug = staff.department?.slug || staff.department_detail?.slug;
      const match = deptSlug === selectedDepartment;
      if (!match && baseStaff.length > 0) {
        console.log(`Debug - Staff ${staff.id} dept slug:`, deptSlug, "vs selected:", selectedDepartment);
      }
      return match;
    });
  }, [allStaff, selectedDepartment]);

  // Load shifts for the period
  const loadShifts = async () => {
    if (!selectedPeriod || !hotelSlug) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(
        `/staff/hotel/${hotelSlug}/attendance/shifts/`,
        {
          params: {
            period: selectedPeriod.id,
            start_date: selectedPeriod.start_date,
            end_date: selectedPeriod.end_date,
          },
        }
      );

      setShifts(
        Array.isArray(response.data)
          ? response.data
          : response.data?.results || []
      );
    } catch (err) {
      setError(
        err.response?.data?.detail || err.message || "Failed to load shifts"
      );
      console.error("Error loading shifts:", err);
    } finally {
      setLoading(false);
    }
  };

  // Load staff list
  useEffect(() => {
    const fetchStaff = async () => {
      if (!hotelSlug) return;
      
      try {
        const response = await api.get(`staff/${hotelSlug}/`);
        const data = response.data;
        const staffList = Array.isArray(data) ? data : Array.isArray(data.results) ? data.results : [];
        setAllStaff(staffList);
      } catch (err) {
        console.error('Error loading staff:', err);
        setAllStaff([]);
      }
    };

    fetchStaff();
  }, [hotelSlug]);

  useEffect(() => {
    loadShifts();
  }, [selectedPeriod, hotelSlug]);

  // Get shifts for a specific staff member and date (server + drafts)
  const getShiftsForStaffAndDate = (staffId, date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const serverShifts = shifts.filter(
      (shift) => shift.staff === staffId && shift.shift_date === dateStr
    );
    const draftsForDate = draftShifts.filter(
      (shift) => shift.staff === staffId && shift.shift_date === dateStr
    );
    
    // Combine and sort by start time
    return [...serverShifts, ...draftsForDate].sort((a, b) => 
      (a.shift_start || '').localeCompare(b.shift_start || '')
    );
  };

  // Get only server shifts for a specific staff member and date
  const getServerShiftsForStaffAndDate = (staffId, date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return shifts.filter(
      (shift) => shift.staff === staffId && shift.shift_date === dateStr
    );
  };

  // Get only draft shifts for a specific staff member and date
  const getDraftShiftsForStaffAndDate = (staffId, date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return draftShifts.filter(
      (shift) => shift.staff === staffId && shift.shift_date === dateStr
    );
  };

  // Get only copied draft shifts for a specific staff member and date
  const getCopiedDraftShiftsForStaffAndDate = (staffId, date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return draftCopiedShifts.filter(
      (shift) => shift.staff === staffId && shift.shift_date === dateStr
    );
  };

  // Check if a set of shifts has overlaps
  const hasOverlappingShifts = (shiftsForDay) => {
    if (shiftsForDay.length < 2) return false;
    
    for (let i = 0; i < shiftsForDay.length; i++) {
      for (let j = i + 1; j < shiftsForDay.length; j++) {
        const shift1 = shiftsForDay[i];
        const shift2 = shiftsForDay[j];
        
        // Don't check overlap between draft and its original server version
        const isDraftUpdateOfSame = (
          (shift1.is_draft && shift1.original_id === shift2.id) ||
          (shift2.is_draft && shift2.original_id === shift1.id) ||
          (shift1.is_draft && shift2.is_draft && shift1.original_id === shift2.original_id && shift1.original_id)
        );
        
        if (!isDraftUpdateOfSame && checkShiftOverlap(shift1, shift2)) {
          return true;
        }
      }
    }
    return false;
  };

  // Get all shifts including copied drafts
  const getAllShiftsForStaffAndDate = (staffId, date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    const serverShifts = shifts.filter(
      (shift) => shift.staff === staffId && shift.shift_date === dateStr
    );
    const draftsForDate = draftShifts.filter(
      (shift) => shift.staff === staffId && shift.shift_date === dateStr
    );
    const copiedDraftsForDate = draftCopiedShifts.filter(
      (shift) => shift.staff === staffId && shift.shift_date === dateStr
    );
    
    // Debug logging
    if (copiedDraftsForDate.length > 0) {
      console.log(`Found ${copiedDraftsForDate.length} copied drafts for staff ${staffId} on ${dateStr}:`, copiedDraftsForDate);
    }
    
    // Combine and sort by start time
    const allShifts = [...serverShifts, ...draftsForDate, ...copiedDraftsForDate];
    return allShifts.sort((a, b) => 
      (a.shift_start || '').localeCompare(b.shift_start || '')
    );
  };

  // Handle cell click for creating/editing shifts
  const handleCellClick = (staff, date, forceNew = false) => {
    // Disable editing if period is finalized
    if (selectedPeriod?.is_finalized) {
      return;
    }
    
    const dateStr = format(date, "yyyy-MM-dd");
    const existingShifts = getShiftsForStaffAndDate(staff.id, date);

    if (existingShifts.length > 0 && !forceNew) {
      // Edit first existing shift
      setEditingShift(existingShifts[0]);
      setIsCreatingAdditionalShift(false);
    } else {
      // Create new shift (or additional shift)
      setEditingShift(null);
      setIsCreatingAdditionalShift(existingShifts.length > 0);
    }

    setEditingStaff(staff);
    setEditingDate(dateStr);
    setShowShiftModal(true);
  };

  // Handle adding additional shift
  const handleAddShift = (staff, date, event) => {
    // Disable editing if period is finalized
    if (selectedPeriod?.is_finalized) {
      return;
    }
    event.stopPropagation(); // Prevent cell click
    handleCellClick(staff, date, true);
  };

  // Handle delete confirmation
  const handleDeleteRequest = (shift) => {
    setShiftToDelete(shift);
    setShowShiftModal(false); // Close edit modal
    setShowDeleteConfirm(true); // Show delete confirmation
  };
  
  const handleDeleteConfirm = async () => {
    setShowDeleteConfirm(false);
    try {
      await api.delete(
        `/staff/hotel/${hotelSlug}/attendance/shifts/${shiftToDelete.id}/`
      );
      // Remove from state
      if (shiftToDelete.is_draft) {
        setDraftShifts((prev) => prev.filter((s) => s.id !== shiftToDelete.id));
        setIsDirty(true);
      } else {
        setShifts((prev) => prev.filter((s) => s.id !== shiftToDelete.id));
      }
      setShowDeleteSuccess(true);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.response?.data?.detail || err.message || "Failed to delete shift");
    }
    setShiftToDelete(null);
  };
  
  const handleDeleteCancel = () => {
    setShowDeleteConfirm(false);
    // Reopen edit modal for the same shift
    setTimeout(() => setShowShiftModal(true), 100);
    setShiftToDelete(null);
  };

  // Handle shift save/delete
  const handleShiftSave = (savedShift) => {
    if (savedShift === null) {
      // This should not happen now as delete is handled separately
      return;
    } else if (savedShift.is_draft) {
      // Draft shift
      if (editingShift?.id && editingShift.is_draft) {
        // Update existing draft
        setDraftShifts((prev) =>
          prev.map((s) => (s.id === savedShift.id ? savedShift : s))
        );
      } else {
        // New draft shift
        setDraftShifts((prev) => [...prev, savedShift]);
      }
      setIsDirty(true);
    } else {
      // Server shift
      if (editingShift?.id && !editingShift.is_draft) {
        // Update existing server shift
        setShifts((prev) =>
          prev.map((s) => (s.id === savedShift.id ? savedShift : s))
        );
      } else {
        // New server shift
        setShifts((prev) => [...prev, savedShift]);
      }
    }

    // Show save success modal
    setShowSaveSuccess(true);
    
    // Trigger refresh callback if provided
    if (onRefresh) {
      onRefresh();
    }
  };

  // Bulk save all draft shifts
  const handleBulkSave = async () => {
    if (draftShifts.length === 0) {
      alert('No draft shifts to save');
      return;
    }

    // Check for overlaps in draft shifts (with each other)
    const draftOverlaps = [];
    for (let i = 0; i < draftShifts.length; i++) {
      for (let j = i + 1; j < draftShifts.length; j++) {
        const a = draftShifts[i];
        const b = draftShifts[j];
        if (a.staff === b.staff && a.shift_date === b.shift_date && checkShiftOverlap(a, b)) {
          draftOverlaps.push({ shift1: a, shift2: b });
        }
      }
    }

    // Check for overlaps between drafts and existing server shifts
    const serverOverlaps = [];
    for (const draft of draftShifts) {
      const existingForDate = shifts.filter(s => 
        s.staff === draft.staff && 
        s.shift_date === draft.shift_date &&
        // Exclude the original shift if this draft is an update
        s.id !== draft.id &&
        s.id !== draft.original_id
      );
      for (const existing of existingForDate) {
        if (checkShiftOverlap(draft, existing)) {
          serverOverlaps.push({ draft, existing });
        }
      }
    }

    if (draftOverlaps.length > 0) {
      alert(`Cannot save roster: There are ${draftOverlaps.length} overlapping shifts in your drafts. Please resolve them first.`);
      return;
    }

    if (serverOverlaps.length > 0) {
      const confirmed = confirm(`Warning: ${serverOverlaps.length} draft shifts will overlap with existing shifts. This may update/replace existing shifts. Continue?`);
      if (!confirmed) return;
    }

    setBulkSaving(true);
    try {
      // Prepare payload for bulk API
      const payload = {
        hotel: selectedPeriod.hotel,
        period: selectedPeriod.id,
        shifts: draftShifts.map(shift => {
          // Ensure time format is HH:MM (remove extra :00 if present)
          const formatTime = (timeStr) => {
            if (!timeStr) return timeStr;
            // If time has seconds, remove them (HH:MM:SS -> HH:MM)
            return timeStr.length > 5 ? timeStr.substring(0, 5) : timeStr;
          };
          
          const shiftData = {
            staff: shift.staff,
            department: shift.department,
            shift_date: shift.shift_date,
            shift_start: formatTime(shift.shift_start),
            shift_end: formatTime(shift.shift_end),
            location_id: shift.location_id || null,
            notes: shift.notes || ""
          };
          
          // If this is an update to existing shift, include the ID
          if (shift.original_id || (shift.id && !shift.id.toString().startsWith('draft_'))) {
            shiftData.id = shift.original_id || shift.id;
          }
          
          return shiftData;
        })
      };

      const response = await api.post(
        `/staff/hotel/${hotelSlug}/attendance/shifts/bulk-save/`,
        payload
      );

      // Success: clear drafts and refresh
      setDraftShifts([]);
      setIsDirty(false);
      setLastSaved(new Date().toISOString());
      clearDraftsFromStorage();
      
      // Reload shifts from server
      await loadShifts();
      
      setPublishMessage(`Roster published successfully! Created: ${response.data.created?.length || 0}, Updated: ${response.data.updated?.length || 0}`);
      setShowPublishSuccess(true);
      
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Bulk save failed:', err);
      const errorData = err.response?.data;
      
      if (errorData?.errors && errorData.errors.length > 0) {
        const errorMessages = errorData.errors.map(e => e.detail).join('\n');
        alert(`Failed to save roster:\n${errorMessages}`);
      } else {
        alert('Failed to save roster: ' + (errorData?.detail || err.message));
      }
    } finally {
      setBulkSaving(false);
    }
  };

  // Clear all drafts
  const handleClearDrafts = () => {
    if (draftShifts.length === 0) return;
    
    if (confirm('Are you sure you want to clear all unsaved draft shifts?')) {
      setDraftShifts([]);
      setIsDirty(false);
      clearDraftsFromStorage();
    }
  };

  // Copy operation handlers
  const handleCopyDay = (date) => {
    setCopySourceDate(format(date, "yyyy-MM-dd"));
    setShowCopyDayModal(true);
  };

  const handleCopyStaff = (staff) => {
    setCopySourceStaff(staff);
    setShowCopyStaffModal(true);
  };

  const handleCopySuccess = (copiedShifts, operation, targetPeriodId = null) => {
    console.log('=== COPY SUCCESS HANDLER ===');
    console.log('Received copied shifts:', copiedShifts);
    console.log('Target period ID:', targetPeriodId);
    console.log('Current period ID:', selectedPeriod?.id);
    
    // If copying to different period, switch to target period
    if (targetPeriodId && targetPeriodId !== selectedPeriod?.id && onPeriodSwitch) {
      console.log('Switching to target period:', targetPeriodId);
      
      // Store copied shifts for target period
      const targetPeriodStorageKey = `roster_copied_draft_${hotelSlug}_${targetPeriodId}`;
      const copiedDraftState = {
        hotel_id: selectedPeriod?.hotel,
        period_id: targetPeriodId,
        copiedShifts: copiedShifts,
        hasCopiedChanges: true,
        timestamp: Date.now()
      };
      localStorage.setItem(targetPeriodStorageKey, JSON.stringify(copiedDraftState));
      
      // Switch to target period
      onPeriodSwitch(targetPeriodId);
      
      const message = `Copied ${copiedShifts.length} shifts to target period. Switched to show drafts.`;
      setToastMessage(message);
      setToastVariant("success");
    } else {
      // Same period copy - add to current state
      setDraftCopiedShifts(prev => {
        const updated = [...prev, ...copiedShifts];
        console.log('Setting new draftCopiedShifts:', updated);
        return updated;
      });
      setHasCopiedChanges(true);
      
      const message = `Added ${copiedShifts.length} copied shifts to drafts`;
      setToastMessage(message);
      setToastVariant("success");
    }
    
    console.log('=== END COPY SUCCESS ===');
  };

  const showToast = (message, variant = "success") => {
    setToastMessage(message);
    setToastVariant(variant);
  };

  // Publish all copied shifts
  const handlePublishCopiedShifts = async () => {
    if (draftCopiedShifts.length === 0) {
      alert('No copied shifts to publish');
      return;
    }

    // Check for overlaps in copied shifts
    const copiedOverlaps = [];
    for (let i = 0; i < draftCopiedShifts.length; i++) {
      for (let j = i + 1; j < draftCopiedShifts.length; j++) {
        const a = draftCopiedShifts[i];
        const b = draftCopiedShifts[j];
        if (a.staff === b.staff && a.shift_date === b.shift_date && checkShiftOverlap(a, b)) {
          copiedOverlaps.push({ shift1: a, shift2: b });
        }
      }
    }

    // Check for overlaps with existing shifts
    const existingOverlaps = [];
    for (const copied of draftCopiedShifts) {
      const existingForDate = [...shifts, ...draftShifts].filter(s => 
        s.staff === copied.staff && s.shift_date === copied.shift_date
      );
      for (const existing of existingForDate) {
        if (checkShiftOverlap(copied, existing)) {
          existingOverlaps.push({ copied, existing });
        }
      }
    }

    if (copiedOverlaps.length > 0) {
      alert(`Cannot publish copied shifts: There are ${copiedOverlaps.length} overlapping shifts in the copied data. Please review the source period.`);
      return;
    }

    if (existingOverlaps.length > 0) {
      const confirmed = confirm(`Warning: ${existingOverlaps.length} copied shifts will overlap with existing shifts. This may update/replace existing shifts. Continue?`);
      if (!confirmed) return;
    }

    setBulkCopying(true);
    try {
      // Use the bulk-save API to create the copied shifts
      const payload = {
        hotel: selectedPeriod.hotel,
        period: selectedPeriod.id,
        shifts: draftCopiedShifts.map(shift => {
          // Ensure time format is HH:MM (remove extra :00 if present)
          const formatTime = (timeStr) => {
            if (!timeStr) return timeStr;
            // If time has seconds, remove them (HH:MM:SS -> HH:MM)
            return timeStr.length > 5 ? timeStr.substring(0, 5) : timeStr;
          };
          
          return {
            staff: shift.staff,
            department: shift.department,
            shift_date: shift.shift_date,
            shift_start: formatTime(shift.shift_start),
            shift_end: formatTime(shift.shift_end),
            location_id: shift.location_id || null,
            notes: shift.notes || ""
          };
        })
      };

      const response = await api.post(
        `/staff/hotel/${hotelSlug}/attendance/shifts/bulk-save/`,
        payload
      );

      // Success: clear copied drafts and refresh
      setDraftCopiedShifts([]);
      setHasCopiedChanges(false);
      clearCopiedDraftsFromStorage();
      
      // Reload shifts from server
      await loadShifts();
      
      setPublishMessage(`Successfully published ${draftCopiedShifts.length} copied shifts! Created: ${response.data.created?.length || 0}, Updated: ${response.data.updated?.length || 0}`);
      setShowPublishSuccess(true);
      
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error('Bulk copy failed:', err);
      const errorData = err.response?.data;
      
      let errorMessage = 'Failed to publish copied shifts: ';
      if (errorData?.errors && errorData.errors.length > 0) {
        errorMessage += errorData.errors.map(e => e.detail).join(', ');
      } else {
        errorMessage += (errorData?.detail || err.message);
      }
      
      showToast(errorMessage, 'danger');
    } finally {
      setBulkCopying(false);
    }
  };

  // Clear all copied drafts
  const handleClearCopiedDrafts = () => {
    if (draftCopiedShifts.length === 0) return;
    
    if (confirm('Are you sure you want to clear all copied shifts? This will remove all pending copy operations.')) {
      setDraftCopiedShifts([]);
      setHasCopiedChanges(false);
      clearCopiedDraftsFromStorage();
    }
  };



  // Legacy copy function - kept for any existing usage
  const handleLegacyCopyDay = async (fromDate, toDate) => {
    if (
      !confirm(
        `Copy all shifts from ${format(fromDate, "MMM d")} to ${format(
          toDate,
          "MMM d"
        )}?`
      )
    ) {
      return;
    }

    try {
      setLoading(true);

      await api.post(
        `/staff/hotel/${hotelSlug}/attendance/shift-copy/copy-roster-day-all/`,
        {
          source_date: format(fromDate, "yyyy-MM-dd"),
          target_date: format(toDate, "yyyy-MM-dd"),
          period_id: selectedPeriod.id,
        }
      );

      // Reload shifts
      await loadShifts();

      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to copy shifts");
    } finally {
      setLoading(false);
    }
  };

  if (!selectedPeriod) {
    return (
      <Card>
        <Card.Body className="text-center py-5">
          <i
            className="bi bi-calendar-week"
            style={{ fontSize: "3rem", color: "#6c757d" }}
          ></i>
          <h5 className="mt-3 text-muted">No Period Selected</h5>
          <p className="text-muted">
            Please select a roster period from the dropdown above to view and
            manage shifts.
          </p>
          <small className="text-muted">
            <i className="bi bi-info-circle me-1"></i>
            If no periods exist, create one using the "Enhanced Dashboard" →
            "Roster Management" → "Create Period" option.
          </small>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div>
      {/* Header Controls */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h5 className="mb-1">Roster Management</h5>
          <small className="text-muted">
            {selectedPeriod.title ||
              `${selectedPeriod.start_date} to ${selectedPeriod.end_date}`}
          </small>
          {/* Debug info */}
          {draftCopiedShifts.length > 0 && (
            <div className="small text-info mt-1">
              DEBUG: {draftCopiedShifts.length} copied drafts in state
            </div>
          )}
        </div>

        <div className="d-flex gap-2 align-items-center">
          {!departmentFilter && (
            <Form.Select
              size="sm"
              style={{ width: "auto" }}
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
            >
              <option value="">Select Department</option>
              {departments.map((dept) => (
                <option key={dept.slug} value={dept.slug}>
                  {dept.name}
                </option>
              ))}
            </Form.Select>
          )}
          {departmentFilter && (
            <Badge bg="primary" className="px-3 py-2">
              {departments.find(d => d.slug === departmentFilter)?.name || departmentFilter}
            </Badge>
          )}

          {/* Draft counter */}
          {isDirty && draftShifts.length > 0 && (
            <Badge bg="warning" className="d-flex align-items-center gap-1">
              <i className="bi bi-clock-history"></i>
              {draftShifts.length} unsaved
            </Badge>
          )}

          {/* Copied drafts counter */}
          {draftCopiedShifts.length > 0 && (
            <Badge bg="info" className="d-flex align-items-center gap-1">
              <i className="bi bi-files"></i>
              {draftCopiedShifts.length} copied
            </Badge>
          )}
          
          {/* Show finalized badge if period is finalized */}
          {selectedPeriod?.is_finalized && (
            <Badge bg="danger" className="d-flex align-items-center gap-1">
              FINALIZED
            </Badge>
          )}

          {/* Global copy controls */}
          <div className="global-copy-controls">
            <span
              className={`global-copy-btn copy-tooltip ${selectedPeriod?.is_finalized ? 'disabled' : ''}`}
              data-tooltip="Copy week roster"
              onClick={selectedPeriod?.is_finalized ? undefined : () => setShowCopyBulkModal(true)}
              style={selectedPeriod?.is_finalized ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              <i className="bi bi-calendar-week"></i>
              Copy Week Roster
            </span>
          </div>

          <Button
            size="sm"
            variant="outline-primary"
            onClick={loadShifts}
            disabled={loading}
          >
            {loading ? (
              <Spinner size="sm" />
            ) : (
              <i className="bi bi-arrow-clockwise"></i>
            )}
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      )}

      {/* Roster Grid */}
      <Card className="roster-grid">
        <Card.Body className="p-0">
          <div className="table-responsive">
            <table className="table table-bordered mb-0">
              <thead className="table-light">
                <tr>
                  <th className="sticky-left" style={{ width: "200px" }}>
                    Staff Member
                  </th>
                  {periodDays.map((day) => (
                    <th
                      key={day.toISOString()}
                      className="text-center position-relative"
                      style={{ minWidth: "120px" }}
                    >
                      <div>{format(day, "EEE")}</div>
                      <div className="small text-muted">
                        {format(day, "MMM d")}
                      </div>
                      {/* Copy day icon */}
                      <span
                        className="copy-day-icon copy-tooltip"
                        data-tooltip="Copy this day to another date"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyDay(day);
                        }}
                      >
                        <i className="bi bi-copy"></i>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td
                      colSpan={periodDays.length + 1}
                      className="text-center py-4 text-muted"
                    >
                      {!selectedDepartment ? "Please select a department to view staff roster" : "No staff members found in this department"}
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((staff) => {
                    const fullName = `${staff.first_name ?? ""} ${staff.last_name ?? ""}`.trim();
                    return (
                      <tr key={staff.id}>
                        <td className="sticky-left">
                          <div className="d-flex align-items-center">
                            <div>
                              <div className="staff-name">{fullName || "Unnamed"}</div>
                              <div className="staff-department">
                                {staff.department?.name}
                              </div>
                            </div>
                            {/* Copy staff icon */}
                            <span
                              className="copy-staff-icon copy-tooltip"
                              data-tooltip="Copy this staff member's week to another period"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyStaff(staff);
                              }}
                            >
                              <i className="bi bi-copy"></i>
                            </span>
                          </div>
                        </td>
                        {periodDays.map((day) => {
                          const dayShifts = getAllShiftsForStaffAndDate(
                            staff.id,
                            day
                          );
                          
                          // Debug: log shifts for first staff member
                          if (staff.id === filteredStaff[0]?.id) {
                            console.log(`Shifts for ${staff.first_name} on ${format(day, 'MMM d')}:`, dayShifts);
                            console.log('Copied drafts:', getCopiedDraftShiftsForStaffAndDate(staff.id, day));
                          }

                          return (
                            <td
                              key={day.toISOString()}
                              className={`roster-cell text-center ${
                                dayShifts.length > 0 ? "has-shift" : ""
                              } ${getDraftShiftsForStaffAndDate(staff.id, day).length > 0 ? "has-draft" : ""} ${getCopiedDraftShiftsForStaffAndDate(staff.id, day).length > 0 ? "has-copied-draft" : ""} ${hasOverlappingShifts(dayShifts) ? "has-overlapping-shifts" : ""} ${selectedPeriod?.is_finalized ? "finalized-readonly" : ""}`}
                              data-debug-copied={getCopiedDraftShiftsForStaffAndDate(staff.id, day).length}
                              onClick={selectedPeriod?.is_finalized ? undefined : () => handleCellClick(staff, day)}
                              style={selectedPeriod?.is_finalized ? { cursor: 'not-allowed', opacity: 0.7 } : {}}
                              title={`Click to ${
                                dayShifts.length > 0 ? "edit" : "create"
                              } shift for ${fullName || "Unnamed"} on ${format(
                                day,
                                "EEE, MMM dd"
                              )}`}
                            >
                              {dayShifts.length > 0 ? (
                                <div className="shifts-container">
                                  <div className="shifts-list">
                                    {dayShifts.map((shift, idx) => {
                                      const isCopiedDraft = shift.is_copied_draft === true;
                                      
                                      console.log('Rendering shift:', shift.id, 'isCopiedDraft:', isCopiedDraft);
                                      
                                      // Create unique key combining shift data
                                      const uniqueKey = `${shift.id || 'temp'}_${shift.staff}_${shift.shift_date}_${shift.shift_start}_${idx}`;
                                      
                                      return (
                                        <Badge
                                          key={uniqueKey}
                                          bg={isCopiedDraft ? "info" : shift.is_draft ? "warning" : "primary"}
                                          className={`shift-badge ${shift.is_draft ? 'shift-badge-draft' : ''} ${isCopiedDraft ? 'shift-badge-copied' : ''}`}
                                          text={isCopiedDraft || shift.is_draft ? "dark" : "light"}
                                        >
                                          {shift.shift_start?.substring(0, 5)} -{" "}
                                          {shift.shift_end?.substring(0, 5)}
                                          {shift.is_draft && <i className="bi bi-clock-history ms-1"></i>}
                                          {isCopiedDraft && <i className="bi bi-files ms-1"></i>}
                                        </Badge>
                                      );
                                    })}
                                  </div>
                                  {/* Add shift button */}
                                  <button
                                    className="add-shift-btn"
                                    onClick={(e) => handleAddShift(staff, day, e)}
                                    title="Add another shift"
                                  >
                                    <i className="bi bi-plus-circle"></i>
                                  </button>
                                </div>
                              ) : (
                                <div className="add-shift-icon">
                                  <i className="bi bi-plus-circle-dotted"></i>
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card.Body>
      </Card>

      {/* Publish Roster Section */}
      {draftShifts.length > 0 && (
        <div className="mt-3 p-3 bg-light rounded border">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h6 className="mb-1">Ready to Publish Roster</h6>
              <small className="text-muted">
                {draftShifts.length} draft shift{draftShifts.length !== 1 ? 's' : ''} ready to be published
              </small>
            </div>
            <div className="d-flex gap-2">
              <Button
                variant="outline-danger"
                size="sm"
                onClick={handleClearDrafts}
                disabled={bulkSaving || selectedPeriod?.is_finalized}
              >
                <i className="bi bi-trash"></i> Clear All
              </Button>
              <Button
                variant="success"
                onClick={handleBulkSave}
                disabled={bulkSaving || selectedPeriod?.is_finalized}
              >
                {bulkSaving ? (
                  <><Spinner size="sm" className="me-2" />Publishing...</>
                ) : (
                  <><i className="bi bi-cloud-upload me-2"></i>Publish Roster</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Publish Copied Roster Section */}
      {draftCopiedShifts.length > 0 && (
        <div className="mt-3 p-3 bg-info bg-opacity-10 rounded border border-info">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h6 className="mb-1 text-info">Ready to Publish Copied Shifts</h6>
              <small className="text-muted">
                {draftCopiedShifts.length} copied shift{draftCopiedShifts.length !== 1 ? 's' : ''} ready to be published
              </small>
            </div>
            <div className="d-flex gap-2">
              <Button
                variant="outline-danger"
                size="sm"
                onClick={handleClearCopiedDrafts}
                disabled={bulkCopying}
              >
                <i className="bi bi-trash"></i> Clear Copies
              </Button>
              <Button
                variant="info"
                onClick={handlePublishCopiedShifts}
                disabled={bulkCopying}
              >
                {bulkCopying ? (
                  <><Spinner size="sm" className="me-2" />Publishing...</>
                ) : (
                  <><i className="bi bi-files me-2"></i>Publish Copies</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-3">
        <small className="text-muted">
          <i className="bi bi-info-circle me-1"></i>
          Click on any cell to create or edit shifts. Use the department filter
          to focus on specific teams.
        </small>
      </div>

      {/* Shift Edit Modal */}
      <ShiftEditModal
        show={showShiftModal}
        onHide={() => setShowShiftModal(false)}
        shift={editingShift}
        staff={editingStaff}
        date={editingDate}
        hotelSlug={hotelSlug}
        selectedPeriod={selectedPeriod}
        selectedDepartment={selectedDepartment}
        onSave={handleShiftSave}
        onDeleteRequest={handleDeleteRequest}
        existingShifts={editingStaff && editingDate ? getAllShiftsForStaffAndDate(editingStaff.id, parseISO(editingDate)).filter(s => s.id !== editingShift?.id) : []}
      />

      {/* Copy Modals */}
      <CopyDayModal
        show={showCopyDayModal}
        onHide={() => setShowCopyDayModal(false)}
        sourceDate={copySourceDate}
        selectedPeriod={selectedPeriod}
        selectedDepartment={selectedDepartment}
        departmentStaff={filteredStaff}
        existingShifts={[...shifts, ...draftShifts]} // Pass all existing shifts
        hotelSlug={hotelSlug}
        onSuccess={handleCopySuccess}
      />

      <CopyStaffWeekModal
        show={showCopyStaffModal}
        onHide={() => setShowCopyStaffModal(false)}
        staff={copySourceStaff}
        selectedPeriod={selectedPeriod}
        availablePeriods={availablePeriods}
        staffExistingShifts={[...shifts, ...draftShifts]}
        hotelSlug={hotelSlug}
        onSuccess={handleCopySuccess}
      />

      <CopyBulkModal
        show={showCopyBulkModal}
        onHide={() => setShowCopyBulkModal(false)}
        selectedPeriod={selectedPeriod}
        availablePeriods={availablePeriods}
        selectedDepartment={selectedDepartment}
        departmentStaff={filteredStaff}
        departmentShifts={[...shifts, ...draftShifts]} // Pass all current shifts
        hotelSlug={hotelSlug}
        onSuccess={handleCopySuccess}
      />

      {/* Toast notifications */}
      <ToastContainer position="top-end" className="p-3">
        <Toast
          show={!!toastMessage}
          onClose={() => setToastMessage(null)}
          delay={4000}
          autohide
          bg={toastVariant}
        >
          <Toast.Header>
            <strong className="me-auto">
              {toastVariant === "success" ? "Success" : "Error"}
            </strong>
          </Toast.Header>
          <Toast.Body className={toastVariant === "success" ? "text-white" : ""}>
            {toastMessage}
          </Toast.Body>
        </Toast>
      </ToastContainer>

      {/* Delete Confirmation Modal */}
      <StaffConfirmationModal
        show={showDeleteConfirm}
        title="Delete Shift"
        message="Are you sure you want to delete this shift? This action cannot be undone."
        preset="delete_item"
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />

      {/* Delete Success Modal */}
      <StaffSuccessModal
        show={showDeleteSuccess}
        preset="item_deleted"
        message="The shift has been successfully deleted."
        onClose={() => setShowDeleteSuccess(false)}
      />

      {/* Save Success Modal */}
      <StaffSuccessModal
        show={showSaveSuccess}
        preset="data_saved"
        message={editingShift?.id ? "The shift has been successfully updated." : "The shift has been successfully created."}
        onClose={() => setShowSaveSuccess(false)}
      />

      {/* Publish Success Modal */}
      <StaffSuccessModal
        show={showPublishSuccess}
        preset="operation_completed"
        message={publishMessage}
        onClose={() => setShowPublishSuccess(false)}
      />
    </div>
  );
}

import React, { useState, useEffect } from "react";
import {
  Modal,
  Button,
  Form,
  Alert,
  Spinner,
  Badge,
} from "react-bootstrap";
import { format, parseISO, eachDayOfInterval } from "date-fns";
import { executeCopyOperation, getCopyErrorMessage, getCopySuccessMessage } from "../utils/executeCopyOperation";

/**
 * Copy Day Modal - Copy all shifts from one day to another
 */
export function CopyDayModal({
  show,
  onHide,
  sourceDate,
  selectedPeriod,
  selectedDepartment,
  departmentStaff,
  existingShifts, // All shifts data to find source shifts
  hotelSlug,
  onSuccess,
}) {
  const [targetDate, setTargetDate] = useState("");
  const [departmentSlug, setDepartmentSlug] = useState(selectedDepartment || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Generate available dates within the current period
  const availableDates = selectedPeriod
    ? eachDayOfInterval({
        start: parseISO(selectedPeriod.start_date),
        end: parseISO(selectedPeriod.end_date),
      }).map((date) => format(date, "yyyy-MM-dd"))
    : [];

  // Reset form when modal opens
  useEffect(() => {
    if (show) {
      setTargetDate("");
      setDepartmentSlug(selectedDepartment || "");
      setError(null);
    }
  }, [show, selectedDepartment]);

  const handleCopy = async () => {
    if (!targetDate) {
      setError("Please select a target date");
      return;
    }

    if (targetDate === sourceDate) {
      setError("Target date must be different from source date");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('=== COPY DAY OPERATION ===');
      console.log('Source date:', sourceDate);
      console.log('Target date:', targetDate);
      console.log('Department filter:', departmentSlug);
      console.log('All existing shifts:', existingShifts);
      
      // Find all shifts on the source date
      const sourceShifts = existingShifts.filter(shift => {
        const matchesDate = shift.shift_date === sourceDate;
        const matchesDepartment = !departmentSlug || shift.department === departmentSlug;
        return matchesDate && matchesDepartment;
      });
      
      console.log('Found source shifts to copy:', sourceShifts);
      
      if (sourceShifts.length === 0) {
        setError(`No shifts found on ${sourceDate}${departmentSlug ? ` for ${departmentSlug} department` : ''}`);
        setLoading(false);
        return;
      }
      
      // Create copied versions of the source shifts
      const copiedShifts = sourceShifts.map(shift => ({
        id: `copied_${shift.id}_${Date.now()}_${Math.random()}`,
        staff: shift.staff,
        department: shift.department,
        shift_date: targetDate, // Change to target date
        shift_start: shift.shift_start,
        shift_end: shift.shift_end,
        location_id: shift.location_id,
        notes: `${shift.notes || ''} [Copied from ${sourceDate}]`,
        is_copied_draft: true
      }));
      
      console.log('Created copied shifts:', copiedShifts);

      if (onSuccess) {
        onSuccess(copiedShifts, `${copiedShifts.length} shifts copied from ${sourceFormatted}`);
      }

      onHide();
    } catch (err) {
      setError("Failed to prepare day copy: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const sourceFormatted = sourceDate
    ? format(parseISO(sourceDate), "EEEE, MMMM d, yyyy")
    : "Unknown date";

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Copy Day</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}

        <div className="mb-3">
          <label className="form-label">
            <strong>Source Date</strong>
          </label>
          <div className="form-control-plaintext bg-light p-2 rounded">
            {sourceFormatted}
          </div>
          {existingShifts && (
            <small className="text-muted mt-1 d-block">
              Found {existingShifts.filter(s => s.shift_date === sourceDate).length} shifts on this date
            </small>
          )}
        </div>

        <Form.Group className="mb-3">
          <Form.Label>Target Date</Form.Label>
          <Form.Select
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            disabled={loading}
          >
            <option value="">Select target date...</option>
            {availableDates
              .filter((date) => date !== sourceDate)
              .map((date) => (
                <option key={date} value={date}>
                  {format(parseISO(date), "EEEE, MMMM d, yyyy")}
                </option>
              ))}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Department Filter (Optional)</Form.Label>
          <Form.Select
            value={departmentSlug}
            onChange={(e) => setDepartmentSlug(e.target.value)}
            disabled={loading}
          >
            <option value="">All departments</option>
            <option value="front-office">Front Office</option>
            <option value="food-and-beverage">Food & Beverage</option>
            <option value="housekeeping">Housekeeping</option>
            <option value="maintenance">Maintenance</option>
            <option value="management">Management</option>
            <option value="security">Security</option>
          </Form.Select>
          <Form.Text className="text-muted">
            Leave empty to copy shifts from all departments
          </Form.Text>
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleCopy}
          disabled={loading || !targetDate}
        >
          {loading ? (
            <>
              <Spinner size="sm" className="me-2" />
              Copying...
            </>
          ) : (
            <>
              <i className="bi bi-copy me-2"></i>
              Copy Day
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

/**
 * Copy Staff Week Modal - Copy one staff member's shifts to another period
 */
export function CopyStaffWeekModal({
  show,
  onHide,
  staff,
  selectedPeriod,
  availablePeriods,
  staffExistingShifts, // All shifts to find staff shifts
  hotelSlug,
  onSuccess,
}) {
  const [targetPeriodId, setTargetPeriodId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reset form when modal opens
  useEffect(() => {
    if (show) {
      setTargetPeriodId("");
      setError(null);
    }
  }, [show]);

  const handleCopy = async () => {
    if (!targetPeriodId) {
      setError("Please select a target period");
      return;
    }

    if (targetPeriodId === selectedPeriod?.id?.toString()) {
      setError("Target period must be different from source period");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Find target period to calculate date mapping
      const targetPeriod = availablePeriods.find(p => p.id === parseInt(targetPeriodId));
      
      if (!targetPeriod) {
        setError('Target period not found');
        setLoading(false);
        return;
      }
      
      // Get existing shifts for this staff member in source period
      const staffShifts = staffExistingShifts || []; // This should be passed as prop
      const sourceShifts = staffShifts.filter(shift => 
        shift.staff === staff.id &&
        shift.shift_date >= selectedPeriod.start_date &&
        shift.shift_date <= selectedPeriod.end_date
      );
      
      console.log('Found source shifts for staff:', sourceShifts);
      
      if (sourceShifts.length === 0) {
        setError(`No shifts found for ${staffName} in source period`);
        setLoading(false);
        return;
      }
      
      // Calculate date offset between periods
      const sourcePeriodStart = new Date(selectedPeriod.start_date);
      const targetPeriodStart = new Date(targetPeriod.start_date);
      const daysDifference = Math.floor((targetPeriodStart - sourcePeriodStart) / (1000 * 60 * 60 * 24));
      
      // Copy each source shift with adjusted date
      const mockCopiedShifts = sourceShifts.map(shift => {
        const shiftDate = new Date(shift.shift_date);
        const targetDate = new Date(shiftDate.getTime() + (daysDifference * 24 * 60 * 60 * 1000));
        const targetDateStr = targetDate.toISOString().split('T')[0];
        
        return {
          id: `copied_staff_${shift.id}_${Date.now()}_${Math.random()}`,
          staff: staff.id,
          department: staff.department?.slug,
          shift_date: targetDateStr,
          shift_start: shift.shift_start,
          shift_end: shift.shift_end,
          location_id: shift.location_id,
          notes: `${shift.notes || ''} [Copied from ${selectedPeriod.title || 'source period'}]`,
          is_copied_draft: true
        };
      });

      if (onSuccess) {
        onSuccess(mockCopiedShifts, `staff week copy for ${staffName}`, parseInt(targetPeriodId));
      }

      onHide();
    } catch (err) {
      setError("Failed to prepare staff week copy: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const staffName = staff
    ? `${staff.first_name || ""} ${staff.last_name || ""}`.trim() || "Unnamed"
    : "";

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Copy Staff Week</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}

        <div className="mb-3">
          <label className="form-label">
            <strong>Staff Member</strong>
          </label>
          <div className="form-control-plaintext bg-light p-2 rounded">
            {staffName}
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">
            <strong>Source Period</strong>
          </label>
          <div className="form-control-plaintext bg-light p-2 rounded">
            {selectedPeriod
              ? `${selectedPeriod.title || "Untitled Period"} (${
                  selectedPeriod.start_date
                } to ${selectedPeriod.end_date})`
              : "No period selected"}
          </div>
        </div>

        <Form.Group className="mb-3">
          <Form.Label>Target Period</Form.Label>
          <Form.Select
            value={targetPeriodId}
            onChange={(e) => setTargetPeriodId(e.target.value)}
            disabled={loading}
          >
            <option value="">Select target period...</option>
            {availablePeriods
              ?.filter((period) => period.id !== selectedPeriod?.id)
              .map((period) => (
                <option key={period.id} value={period.id}>
                  {period.title || "Untitled Period"} ({period.start_date} to{" "}
                  {period.end_date})
                </option>
              ))}
          </Form.Select>
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleCopy}
          disabled={loading || !targetPeriodId}
        >
          {loading ? (
            <>
              <Spinner size="sm" className="me-2" />
              Copying...
            </>
          ) : (
            <>
              <i className="bi bi-copy me-2"></i>
              Copy Staff Week
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

/**
 * Copy Department/Bulk Modal - Copy department or selected staff to another period
 */
export function CopyBulkModal({
  show,
  onHide,
  selectedPeriod,
  availablePeriods,
  selectedDepartment,
  departmentStaff,
  departmentShifts, // All shifts for the department
  hotelSlug,
  onSuccess,
}) {
  const [targetPeriodId, setTargetPeriodId] = useState("");
  const [departmentSlug, setDepartmentSlug] = useState(selectedDepartment || "");
  const [selectedStaffIds, setSelectedStaffIds] = useState([]);
  const [copyMode, setCopyMode] = useState("department"); // "department" | "staff" | "both"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reset form when modal opens
  useEffect(() => {
    if (show) {
      setTargetPeriodId("");
      setDepartmentSlug(selectedDepartment || "");
      setSelectedStaffIds([]);
      setCopyMode("department");
      setError(null);
    }
  }, [show, selectedDepartment]);

  const handleCopy = async () => {
    if (!targetPeriodId) {
      setError("Please select a target period");
      return;
    }

    if (targetPeriodId === selectedPeriod?.id?.toString()) {
      setError("Target period must be different from source period");
      return;
    }

    if (copyMode === "staff" && selectedStaffIds.length === 0) {
      setError("Please select at least one staff member");
      return;
    }

    if (copyMode === "both" && !departmentSlug) {
      setError("Please select a department when using combined mode");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Create mock copied shifts based on copy mode
      let mockCopiedShifts = [];
      
      if (copyMode === "department" && departmentSlug && departmentStaff) {
        // Find target period to calculate date mapping
        const targetPeriod = availablePeriods.find(p => p.id === parseInt(targetPeriodId));
        
        if (!targetPeriod) {
          setError('Target period not found');
          setLoading(false);
          return;
        }
        
        console.log('Source period:', selectedPeriod);
        console.log('Target period:', targetPeriod);
        
        // Get all existing shifts for department staff in source period
        const departmentStaffIds = departmentStaff.map(s => s.id);
        const existingShifts = departmentShifts || []; // This should be passed as prop
        
        console.log('Department staff IDs:', departmentStaffIds);
        console.log('Existing shifts to copy from:', existingShifts);
        
        // Filter shifts for department staff in source period
        const sourceShifts = existingShifts.filter(shift => 
          departmentStaffIds.includes(shift.staff) &&
          shift.shift_date >= selectedPeriod.start_date &&
          shift.shift_date <= selectedPeriod.end_date
        );
        
        console.log('Found source shifts for department:', sourceShifts);
        
        if (sourceShifts.length === 0) {
          setError(`No shifts found for ${departmentSlug} department in source period`);
          setLoading(false);
          return;
        }
        
        // Calculate date offset between periods
        const sourcePeriodStart = new Date(selectedPeriod.start_date);
        const targetPeriodStart = new Date(targetPeriod.start_date);
        const daysDifference = Math.floor((targetPeriodStart - sourcePeriodStart) / (1000 * 60 * 60 * 24));
        
        console.log('Days difference between periods:', daysDifference);
        
        // Copy each source shift with adjusted date
        mockCopiedShifts = sourceShifts.map(shift => {
          const shiftDate = new Date(shift.shift_date);
          const targetDate = new Date(shiftDate.getTime() + (daysDifference * 24 * 60 * 60 * 1000));
          const targetDateStr = targetDate.toISOString().split('T')[0];
          
          return {
            id: `copied_dept_${shift.id}_${Date.now()}_${Math.random()}`,
            staff: shift.staff,
            department: shift.department,
            shift_date: targetDateStr,
            shift_start: shift.shift_start,
            shift_end: shift.shift_end,
            location_id: shift.location_id,
            notes: `${shift.notes || ''} [Copied from ${selectedPeriod.title || 'source period'}]`,
            is_copied_draft: true
          };
        });
        
        console.log('Created copied shifts:', mockCopiedShifts);
      } else if (copyMode === "staff" && selectedStaffIds.length > 0) {
        // Mock staff copy
        mockCopiedShifts = selectedStaffIds.map(staffId => ({
          id: `copied_staff_${staffId}_${Date.now()}_${Math.random()}`,
          staff: staffId,
          department: departmentStaff?.find(s => s.id === staffId)?.department?.slug,
          shift_date: "2025-12-10",
          shift_start: "09:00",
          shift_end: "17:00",
          location_id: null,
          notes: `Copied for staff ${staffId}`,
          is_copied_draft: true,
          copy_operation: {
            type: "bulk",
            copy_mode: copyMode,
            source_period_id: selectedPeriod.id,
            target_period_id: parseInt(targetPeriodId),
            staff_ids: selectedStaffIds
          }
        }));
      }

      if (onSuccess) {
        const operationDesc = copyMode === "department" ? `${departmentSlug} department` : 
                            copyMode === "staff" ? `${selectedStaffIds.length} staff members` :
                            `${selectedStaffIds.length} staff from ${departmentSlug}`;
        onSuccess(mockCopiedShifts, `bulk copy (${operationDesc})`, parseInt(targetPeriodId));
      }

      onHide();
    } catch (err) {
      setError("Failed to prepare bulk copy: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStaffToggle = (staffId) => {
    setSelectedStaffIds((prev) =>
      prev.includes(staffId)
        ? prev.filter((id) => id !== staffId)
        : [...prev, staffId]
    );
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Copy Department Roster</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}

        <div className="mb-3">
          <label className="form-label">
            <strong>Source Period</strong>
          </label>
          <div className="form-control-plaintext bg-light p-2 rounded">
            {selectedPeriod
              ? `${selectedPeriod.title || "Untitled Period"} (${
                  selectedPeriod.start_date
                } to ${selectedPeriod.end_date})`
              : "No period selected"}
          </div>
        </div>

        <Form.Group className="mb-3">
          <Form.Label>Target Period</Form.Label>
          <Form.Select
            value={targetPeriodId}
            onChange={(e) => setTargetPeriodId(e.target.value)}
            disabled={loading}
          >
            <option value="">Select target period...</option>
            {availablePeriods
              ?.filter((period) => period.id !== selectedPeriod?.id)
              .map((period) => (
                <option key={period.id} value={period.id}>
                  {period.title || "Untitled Period"} ({period.start_date} to{" "}
                  {period.end_date})
                </option>
              ))}
          </Form.Select>
        </Form.Group>

        <Form.Group className="mb-3">
          <Form.Label>Copy Mode</Form.Label>
          <div className="d-flex gap-2 mb-2">
            <Form.Check
              type="radio"
              id="mode-department"
              label="Entire Department"
              checked={copyMode === "department"}
              onChange={() => setCopyMode("department")}
              disabled={loading}
            />
            <Form.Check
              type="radio"
              id="mode-staff"
              label="Selected Staff Only"
              checked={copyMode === "staff"}
              onChange={() => setCopyMode("staff")}
              disabled={loading}
            />
            <Form.Check
              type="radio"
              id="mode-both"
              label="Selected Staff from Department"
              checked={copyMode === "both"}
              onChange={() => setCopyMode("both")}
              disabled={loading}
            />
          </div>
        </Form.Group>

        {(copyMode === "department" || copyMode === "both") && (
          <Form.Group className="mb-3">
            <Form.Label>Department</Form.Label>
            <Form.Select
              value={departmentSlug}
              onChange={(e) => setDepartmentSlug(e.target.value)}
              disabled={loading}
            >
              <option value="">Select department...</option>
              <option value="front-office">Front Office</option>
              <option value="food-and-beverage">Food & Beverage</option>
              <option value="housekeeping">Housekeeping</option>
              <option value="maintenance">Maintenance</option>
              <option value="management">Management</option>
              <option value="security">Security</option>
            </Form.Select>
          </Form.Group>
        )}

        {(copyMode === "staff" || copyMode === "both") && (
          <Form.Group className="mb-3">
            <Form.Label>
              Staff Members
              {selectedStaffIds.length > 0 && (
                <Badge bg="primary" className="ms-2">
                  {selectedStaffIds.length} selected
                </Badge>
              )}
            </Form.Label>
            <div
              className="border rounded p-3"
              style={{ maxHeight: "200px", overflowY: "auto" }}
            >
              {departmentStaff && departmentStaff.length > 0 ? (
                departmentStaff.map((staff) => {
                  const staffName =
                    `${staff.first_name || ""} ${
                      staff.last_name || ""
                    }`.trim() || "Unnamed";
                  return (
                    <Form.Check
                      key={staff.id}
                      type="checkbox"
                      id={`staff-${staff.id}`}
                      label={staffName}
                      checked={selectedStaffIds.includes(staff.id)}
                      onChange={() => handleStaffToggle(staff.id)}
                      disabled={loading}
                    />
                  );
                })
              ) : (
                <div className="text-muted">
                  No staff members available for selection
                </div>
              )}
            </div>
            {departmentStaff && departmentStaff.length > 0 && (
              <div className="mt-2">
                <Button
                  size="sm"
                  variant="outline-primary"
                  onClick={() =>
                    setSelectedStaffIds(departmentStaff.map((s) => s.id))
                  }
                  disabled={loading}
                >
                  Select All
                </Button>
                <Button
                  size="sm"
                  variant="outline-secondary"
                  className="ms-2"
                  onClick={() => setSelectedStaffIds([])}
                  disabled={loading}
                >
                  Clear Selection
                </Button>
              </div>
            )}
          </Form.Group>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleCopy}
          disabled={
            loading ||
            !targetPeriodId ||
            (copyMode === "staff" && selectedStaffIds.length === 0) ||
            (copyMode === "both" && !departmentSlug)
          }
        >
          {loading ? (
            <>
              <Spinner size="sm" className="me-2" />
              Copying...
            </>
          ) : (
            <>
              <i className="bi bi-copy me-2"></i>
              Copy Roster
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

/**
 * Copy Entire Period Modal - Copy complete roster from one period to another
 */
export function CopyPeriodModal({
  show,
  onHide,
  selectedPeriod,
  availablePeriods,
  hotelSlug,
  onSuccess,
}) {
  const [targetPeriodId, setTargetPeriodId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reset form when modal opens
  useEffect(() => {
    if (show) {
      setTargetPeriodId("");
      setError(null);
    }
  }, [show]);

  const handleCopy = async () => {
    if (!targetPeriodId) {
      setError("Please select a target period");
      return;
    }

    if (targetPeriodId === selectedPeriod?.id?.toString()) {
      setError("Target period must be different from source period");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        source_period_id: selectedPeriod.id,
        target_period_id: parseInt(targetPeriodId),
      };

      const result = await executeCopyOperation({
        type: "period",
        hotelSlug,
        payload,
      });

      // Show success message
      const successMessage = getCopySuccessMessage(result);
      if (onSuccess) {
        onSuccess(successMessage);
      }

      onHide();
    } catch (err) {
      const errorMessage = getCopyErrorMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>Copy Entire Period</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}

        <Alert variant="info">
          <i className="bi bi-info-circle me-2"></i>
          This will copy <strong>all shifts</strong> from{" "}
          <strong>all departments</strong> to the target period.
        </Alert>

        <div className="mb-3">
          <label className="form-label">
            <strong>Source Period</strong>
          </label>
          <div className="form-control-plaintext bg-light p-2 rounded">
            {selectedPeriod
              ? `${selectedPeriod.title || "Untitled Period"} (${
                  selectedPeriod.start_date
                } to ${selectedPeriod.end_date})`
              : "No period selected"}
          </div>
        </div>

        <Form.Group className="mb-3">
          <Form.Label>Target Period</Form.Label>
          <Form.Select
            value={targetPeriodId}
            onChange={(e) => setTargetPeriodId(e.target.value)}
            disabled={loading}
          >
            <option value="">Select target period...</option>
            {availablePeriods
              ?.filter((period) => period.id !== selectedPeriod?.id)
              .map((period) => (
                <option key={period.id} value={period.id}>
                  {period.title || "Untitled Period"} ({period.start_date} to{" "}
                  {period.end_date})
                </option>
              ))}
          </Form.Select>
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={handleCopy}
          disabled={loading || !targetPeriodId}
        >
          {loading ? (
            <>
              <Spinner size="sm" className="me-2" />
              Copying...
            </>
          ) : (
            <>
              <i className="bi bi-copy me-2"></i>
              Copy Entire Period
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
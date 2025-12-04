import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Card, Row, Col, Button, Badge, Form, Alert, Spinner } from "react-bootstrap";
import {
  useStaffAttendanceSummary,
} from "../hooks/useAttendanceData";
import { useRosterPeriods } from "../hooks/useRosterPeriods";
import { useAttendanceRealtime } from "../hooks/useAttendanceRealtime";
import useStaffMetadata from "@/hooks/useStaffMetadata";
import RosterManagementGrid from "../components/RosterManagementGrid";
import RosterPeriodSelector from "../components/RosterPeriodSelector";
import RosterPeriodSummary from "../components/RosterPeriodSummary";
import PeriodStaffSummary from "../components/PeriodStaffSummary";
import PeriodCreationModal from "../components/PeriodCreationModal";
import PeriodFinalizeModal from "../components/PeriodFinalizeModal";
import FinalizedRostersModal from "../components/FinalizedRostersModal";
import DepartmentStatusSummary from "../components/DepartmentStatusSummary";
import AttendanceErrorBoundary from "../components/AttendanceErrorBoundary";
import AttendanceToasts from "../components/AttendanceToasts";
import { AttendanceDashboardSkeleton } from "../components/AttendanceSkeletons";
import { safeNumber } from "../utils/safeUtils";
import { handleAttendanceError, showSuccessMessage } from "../utils/errorHandling";
import api from "@/services/api";
import "../styles/attendance.css";

function DepartmentRosterDashboardComponent() {
  const { hotelSlug } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  console.log('[DepartmentRosterDashboard] Rendering with hotelSlug:', hotelSlug);
  
  // Core state
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [selectedDepartment, setSelectedDepartment] = useState(() => {
    const urlDept = searchParams.get('department');
    return urlDept || "";
  });
  const [selectedPeriodId, setSelectedPeriodId] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [periodsRefreshKey, setPeriodsRefreshKey] = useState(0);
  
  // Period finalization state
  const [finalizing, setFinalizing] = useState(false);
  const [finalizeError, setFinalizeError] = useState(null);
  const [finalizeCanForce, setFinalizeCanForce] = useState(false);
  
  // Period creation modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Period finalize modal state
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  
  // Finalized rosters modal state
  const [showFinalizedRostersModal, setShowFinalizedRostersModal] = useState(false);
  
  // Staff metadata
  const { departments, isLoading: departmentsLoading } = useStaffMetadata(hotelSlug);
  
  // Don't auto-select department - let user choose
  
  // Update URL when department changes
  useEffect(() => {
    if (selectedDepartment) {
      setSearchParams({ department: selectedDepartment });
    }
  }, [selectedDepartment, setSearchParams]);
  
  // Calculate week range from selected date
  const getWeekRange = (date) => {
    const currentDate = new Date(date);
    const dayOfWeek = currentDate.getDay();
    const startOfWeek = new Date(currentDate);
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(currentDate.getDate() - daysToSubtract);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return {
      from: startOfWeek.toISOString().split('T')[0],
      to: endOfWeek.toISOString().split('T')[0]
    };
  };

  const weekRange = getWeekRange(selectedDate);

  // Load roster periods
  const periods = useRosterPeriods(hotelSlug, periodsRefreshKey);
  
  // Auto-select current period only when department is selected
  useEffect(() => {
    if (periods.items && periods.items.length > 0 && selectedDepartment && !selectedPeriodId) {
      // Find current period (period that includes today's date)
      const today = new Date().toISOString().split('T')[0];
      const currentPeriod = periods.items.find(period => 
        period && 
        period.start_date <= today && 
        period.end_date >= today
      );
      
      if (currentPeriod) {
        console.log('[DepartmentRoster] Auto-selecting current period:', currentPeriod);
        setSelectedPeriodId(currentPeriod.id);
      } else if (periods.items.length > 0) {
        // If no current period, select the most recent one
        const sortedPeriods = [...periods.items].sort((a, b) => 
          new Date(b.start_date) - new Date(a.start_date)
        );
        console.log('[DepartmentRoster] Auto-selecting most recent period:', sortedPeriods[0]);
        setSelectedPeriodId(sortedPeriods[0].id);
      }
    }
  }, [periods.items, selectedDepartment, selectedPeriodId]);
  
  // Find selected period
  const allPeriods = Array.isArray(periods.items) ? periods.items : [];
  const selectedPeriod = selectedPeriodId && allPeriods.length > 0 
    ? allPeriods.find((p) => p && p.id === safeNumber(selectedPeriodId)) || null 
    : null;

  // Use period dates if period is selected, otherwise fall back to week range
  const effectiveDateRange = selectedPeriod 
    ? { from: selectedPeriod.start_date, to: selectedPeriod.end_date }
    : weekRange;

  // Fetch staff attendance summary for the department
  const staffSummary = useStaffAttendanceSummary(
    hotelSlug,
    effectiveDateRange.from,
    effectiveDateRange.to,
    selectedDepartment,
    null, // no status filter
    refreshKey
  );

  // Fetch ALL staff (for status summary - currently logged in & approvals)
  const allStaffSummary = useStaffAttendanceSummary(
    hotelSlug,
    effectiveDateRange.from,
    effectiveDateRange.to,
    null, // no department filter - get ALL staff
    null, // no status filter
    refreshKey
  );

  // Refresh data when period changes
  useEffect(() => {
    if (selectedPeriodId) {
      setRefreshKey(prev => prev + 1);
    }
  }, [selectedPeriodId]);

  // Real-time updates
  function handleRealtimeEvent(evt) {
    if (evt && evt.type === 'attendance_update') {
      console.log('[DepartmentRoster] Real-time attendance update received:', evt);
      setRefreshKey(prev => prev + 1);
    }
  }

  useAttendanceRealtime(hotelSlug, handleRealtimeEvent);

  // Period finalization
  const handleShowFinalizeModal = () => {
    setFinalizeError(null);
    setFinalizeCanForce(false);
    setShowFinalizeModal(true);
  };

  const handleFinalizePeriod = async (force = false) => {
    if (!selectedPeriod || !selectedDepartment) return;

    setFinalizing(true);
    setFinalizeError(null);

    try {
      const payload = { department: selectedDepartment };
      if (force) {
        payload.force = true;
      }

      await api.post(
        `/staff/hotel/${hotelSlug}/attendance/periods/${selectedPeriod.id}/finalize/`,
        payload
      );
      
      showSuccessMessage('Period finalized successfully for department');
      setPeriodsRefreshKey(prev => prev + 1);
      setRefreshKey(prev => prev + 1);
      setShowFinalizeModal(false);
    } catch (error) {
      console.log('Finalize error response:', error.response?.data);
      
      // Check if this is a validation error with force option
      if (error.response?.status === 400 && error.response?.data) {
        const errorData = error.response.data;
        setFinalizeError(errorData.error || errorData.message || 'Cannot finalize period');
        setFinalizeCanForce(errorData.can_force === true);
      } else {
        // Handle other errors normally
        const result = handleAttendanceError(error, 'PERIOD_FINALIZE_FAILED');
        setFinalizeError(result.userMessage);
        setFinalizeCanForce(false);
      }
    } finally {
      setFinalizing(false);
    }
  };

  // Loading states
  const isInitialLoading = !hotelSlug || (periods.loading && departmentsLoading);
  
  if (isInitialLoading) {
    return <AttendanceDashboardSkeleton />;
  }

  if (departmentsLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
        <div className="text-center">
          <Spinner animation="border" className="mb-3" />
          <div>Loading departments...</div>
        </div>
      </div>
    );
  }

  if (departments.length === 0) {
    return (
      <Card>
        <Card.Body className="text-center py-5">
          <i className="bi bi-building" style={{ fontSize: "3rem", color: "#6c757d" }}></i>
          <h5 className="mt-3 text-muted">No Departments Found</h5>
          <p className="text-muted">No departments are configured for this hotel.</p>
        </Card.Body>
      </Card>
    );
  }

  const selectedDeptName = departments.find(d => d.slug === selectedDepartment)?.name || selectedDepartment;

  return (
    <div className="department-roster-dashboard container py-4">
      <AttendanceToasts />
      
      {/* Header */}
      <header className="attendance-header mb-4">
        <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start align-items-lg-center gap-3">
          <div>
            <h2 className="mb-1">Department Roster - Weekly View</h2>
            <small className="text-muted">
              Hotel: <strong>{hotelSlug}</strong> | 
              Department: <strong>{selectedDeptName}</strong> | 
              {selectedPeriod ? (
                <>Period: <strong>{selectedPeriod.start_date}</strong> to <strong>{selectedPeriod.end_date}</strong></>
              ) : (
                <>Week: <strong>{weekRange.from}</strong> to <strong>{weekRange.to}</strong></>
              )}
            </small>
          </div>

          <div className="d-flex flex-column flex-md-row align-items-stretch align-items-md-center gap-2">
            {/* Department Selector */}
            <div className="d-flex align-items-center gap-2">
              <label className="form-label mb-0 text-nowrap">Department:</label>
              <Form.Select
                size="sm"
                style={{ minWidth: "180px" }}
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                disabled={departmentsLoading}
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept.slug} value={dept.slug}>
                    {dept.name}
                  </option>
                ))}
              </Form.Select>
            </div>

        

            {/* Management Dashboard Link */}
            <Button
              size="sm"
              variant="outline-primary"
              onClick={() => navigate(`/enhanced-attendance/${hotelSlug}`)}
              title="Open Management Analytics"
            >
              <i className="bi bi-bar-chart"></i>
              <span className="ms-2 d-none d-md-inline">Management Analytics</span>
            </Button>
          </div>
        </div>
      </header>



      {!selectedDepartment ? (
        <Card>
          <Card.Body className="text-center py-5">
            <i className="bi bi-arrow-up" style={{ fontSize: "3rem", color: "#6c757d" }}></i>
            <h5 className="mt-3 text-muted">Select a Department</h5>
            <p className="text-muted">
              Choose a department from the dropdown above to view and manage rosters.
            </p>
          </Card.Body>
        </Card>
      ) : (
        <>
          {/* Period Selector */}
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="flex-grow-1">
                <RosterPeriodSelector
                  periods={periods.items || []}
                  selectedId={selectedPeriodId}
                  onChange={setSelectedPeriodId}
                />
              </div>
              <Button 
                variant="success"
                size="sm"
                onClick={() => setShowCreateModal(true)}
                className="ms-3"
              >
                <i className="bi bi-plus-circle me-2"></i>
                Create Period
              </Button>
            </div>
          </div>

          {/* Period Summary */}
          {selectedPeriod && (
            <div className="mb-4">
              <RosterPeriodSummary
                period={selectedPeriod}
                department={selectedDepartment}
                onFinalize={handleShowFinalizeModal}
                finalizing={finalizing}
                error={null}
                onShowFinalizedRosters={() => setShowFinalizedRostersModal(true)}
              />
            </div>
          )}

          {/* Department Staff Summary */}
          {selectedPeriod && staffSummary.results && staffSummary.results.length > 0 && (
            <div className="mb-4">
              <h5>Period Staff Summary</h5>
              <PeriodStaffSummary 
                logsInPeriod={staffSummary.results}
                department={selectedDepartment}
              />
            </div>
          )}

          {/* Weekly Statistics */}
          {staffSummary.results && staffSummary.results.length > 0 && (
            <Row className="mb-4">
              <Col md={3}>
                <Card className="border-0 bg-light">
                  <Card.Body className="text-center">
                    <h4 className="text-primary mb-1">{staffSummary.results.length}</h4>
                    <small className="text-muted">Staff Members</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="border-0 bg-light">
                  <Card.Body className="text-center">
                    <h4 className="text-success mb-1">
                      {staffSummary.results.filter(s => s.attendance_status === 'active').length}
                    </h4>
                    <small className="text-muted">Active This Week</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="border-0 bg-light">
                  <Card.Body className="text-center">
                    <h4 className="text-info mb-1">
                      {staffSummary.results.reduce((sum, s) => sum + (s.worked_shifts || 0), 0)}
                    </h4>
                    <small className="text-muted">Total Shifts Worked</small>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={3}>
                <Card className="border-0 bg-light">
                  <Card.Body className="text-center">
                    <h4 className="text-warning mb-1">
                      {staffSummary.results.filter(s => s.issues_count > 0).length}
                    </h4>
                    <small className="text-muted">Issues to Review</small>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          )}

          {/* Roster Management Grid */}
          {selectedPeriod && (
            <div className="mb-4">
              <RosterManagementGrid 
                selectedPeriod={selectedPeriod}
                hotelSlug={hotelSlug}
                onRefresh={() => setRefreshKey(prev => prev + 1)}
                departmentFilter={selectedDepartment}
                availablePeriods={periods.items || []}
                onPeriodSwitch={(newPeriodId) => {
                  console.log('Switching to period:', newPeriodId);
                  setSelectedPeriodId(newPeriodId);
                  setRefreshKey(prev => prev + 1);
                }}
              />
            </div>
          )}

          {/* Department Status Summary - Currently Logged In & Pending Approvals */}
          <DepartmentStatusSummary
            hotelSlug={hotelSlug}
            refreshKey={refreshKey}
          />

          {/* No Period Selected Message */}
          {!selectedPeriod && (
            <Card>
              <Card.Body className="text-center py-5">
                <i className="bi bi-calendar-week" style={{ fontSize: "3rem", color: "#6c757d" }}></i>
                <h5 className="mt-3 text-muted">No Period Selected</h5>
                <p className="text-muted">
                  Please select a roster period to view and manage department shifts.
                </p>
                <Button 
                  variant="outline-primary"
                  onClick={() => navigate(`/enhanced-attendance/${hotelSlug}`)}
                >
                  Create Period in Management Dashboard
                </Button>
              </Card.Body>
            </Card>
          )}
        </>
      )}

      {/* Period Creation Modal */}
      <PeriodCreationModal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        hotelSlug={hotelSlug}
        onSuccess={() => {
          setShowCreateModal(false);
          setPeriodsRefreshKey(prev => prev + 1);
        }}
      />
      
      {/* Period Finalize Modal */}
      <PeriodFinalizeModal
        show={showFinalizeModal}
        onHide={() => setShowFinalizeModal(false)}
        onConfirm={handleFinalizePeriod}
        period={selectedPeriod}
        department={selectedDepartment}
        finalizing={finalizing}
        error={finalizeError}
        canForce={finalizeCanForce}
      />
      
      {/* Finalized Rosters Modal */}
      <FinalizedRostersModal
        show={showFinalizedRostersModal}
        onHide={() => setShowFinalizedRostersModal(false)}
        hotelSlug={hotelSlug}
        department={selectedDepartment}
        onSelectPeriod={(period) => setSelectedPeriodId(period.id)}
      />
      
      {/* Toast notifications */}
      <AttendanceToasts />
    </div>
  );
}

// Wrap with error boundary
export default function DepartmentRosterDashboard() {
  return (
    <AttendanceErrorBoundary showDetails={process.env.NODE_ENV === 'development'}>
      <DepartmentRosterDashboardComponent />
    </AttendanceErrorBoundary>
  );
}
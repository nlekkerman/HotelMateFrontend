import React, { useState, useEffect, useMemo } from "react";
import { Card, Row, Col, Button, Badge, Dropdown, Nav } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import { useStaffAttendanceSummary, useDepartmentRosterAnalytics, useStaffRosterAnalytics } from "../hooks/useAttendanceData";
import { useRosterPeriods } from "../hooks/useRosterPeriods";
import useStaffMetadata from "@/hooks/useStaffMetadata";
import { formatDuration, calculateStaffEfficiency } from "../utils/durationUtils";
import { safeNumber } from "../utils/safeUtils";
import DepartmentAnalytics from "./DepartmentAnalytics";
import PeriodCreationModal from './PeriodCreationModal';
import PeriodCopyModal from './PeriodCopyModal';
import RosterManagementGrid from './RosterManagementGrid';
import RosterPeriodSelector from './RosterPeriodSelector';

/**
 * Enhanced Attendance Dashboard with analytics and roster management
 */
export default function EnhancedAttendanceDashboard() {
  const { hotelSlug } = useParams();
  const [activeTab, setActiveTab] = useState('summary'); // summary, departments, individuals, roster-mgmt
  const navigate = useNavigate();
  // Period and filter state
  const [selectedPeriodId, setSelectedPeriodId] = useState(null);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [periodsRefreshKey, setPeriodsRefreshKey] = useState(0);
  
  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);

  // Load roster periods
  const periods = useRosterPeriods(hotelSlug, periodsRefreshKey);
  
  // Auto-select current period when periods load
  useEffect(() => {
    if (periods.items && periods.items.length > 0 && !selectedPeriodId) {
      // Find current period (period that includes today's date)
      const today = new Date().toISOString().split('T')[0];
      const currentPeriod = periods.items.find(period => 
        period && 
        period.start_date <= today && 
        period.end_date >= today
      );
      
      if (currentPeriod) {
        setSelectedPeriodId(currentPeriod.id);
      } else if (periods.items.length > 0) {
        // If no current period, select the most recent one
        const sortedPeriods = [...periods.items].sort((a, b) => 
          new Date(b.start_date) - new Date(a.start_date)
        );
        setSelectedPeriodId(sortedPeriods[0].id);
      }
    }
  }, [periods.items, selectedPeriodId]);
  
  // Find selected period and get date range from it
  const selectedPeriod = selectedPeriodId && periods.items 
    ? periods.items.find(p => p && p.id === safeNumber(selectedPeriodId)) 
    : null;
    
  const dateRange = selectedPeriod 
    ? { start: selectedPeriod.start_date, end: selectedPeriod.end_date }
    : { start: new Date().toISOString().split('T')[0], end: new Date().toISOString().split('T')[0] };

  // Data hooks
  const { 
    loading: summaryLoading, 
    error: summaryError, 
    results: staffSummaries,
    count: totalStaff,
    dateRange: apiDateRange,
    filters: apiFilters 
  } = useStaffAttendanceSummary(
    hotelSlug, 
    dateRange.start, 
    dateRange.end, 
    selectedDepartment, 
    selectedStatus, 
    refreshKey
  );

  const departmentAnalytics = useDepartmentRosterAnalytics(
    hotelSlug, 
    dateRange.start, 
    dateRange.end, 
    selectedDepartment, 
    refreshKey
  );

  const staffAnalytics = useStaffRosterAnalytics(
    hotelSlug, 
    dateRange.start, 
    dateRange.end, 
    selectedDepartment, 
    refreshKey
  );

  const { departments } = useStaffMetadata(hotelSlug);

  // Calculate performance metrics
  const performanceMetrics = useMemo(() => {
    if (!staffSummaries.length) return null;

    const durationStats = formatDuration.getDurationStats(staffSummaries);
    const activeStaff = staffSummaries.filter(s => s.attendance_status === 'active').length;
    const staffWithIssues = staffSummaries.filter(s => s.issues_count > 0).length;
    
    return {
      // Duration metrics
      smallestDuration: formatDuration.toHoursMinutes(durationStats.min),
      largestDuration: formatDuration.toHoursMinutes(durationStats.max),
      averageDuration: formatDuration.toHoursMinutes(durationStats.avg),
      totalWorkHours: formatDuration.toHoursMinutes(durationStats.total),
      
      // Staff metrics
      totalStaff: staffSummaries.length,
      activeStaff,
      staffWithIssues,
      
      // Raw stats for highlighting
      minDuration: durationStats.min,
      
      // Department metrics
      departmentCount: departments?.length || 0
    };
  }, [staffSummaries, departments]);

  // Available departments for filter
  const availableDepartments = useMemo(() => {
    const deptSet = new Set();
    staffSummaries.forEach(staff => {
      if (staff.department_name) {
        deptSet.add(JSON.stringify({
          name: staff.department_name,
          slug: staff.department_slug
        }));
      }
    });
    return Array.from(deptSet).map(dept => JSON.parse(dept));
  }, [staffSummaries]);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleModalSuccess = (result) => {
    console.log('Operation successful:', result);
    setPeriodsRefreshKey(prev => prev + 1);
    handleRefresh();
  };

  // Format staff for display with smallest duration highlighting
  const formatStaffForDisplay = (staff) => {
    const isSmallestDuration = performanceMetrics && 
      staff.total_worked_minutes === performanceMetrics.minDuration && 
      performanceMetrics.minDuration > 0;
    
    return {
      ...staff,
      formattedDuration: formatDuration.toHoursMinutes(staff.total_worked_minutes),
      decimalHours: formatDuration.toDecimalHours(staff.total_worked_minutes),
      isSmallestDuration,
      efficiency: calculateStaffEfficiency(staff)
    };
  };

  return (
    <div className="container-fluid py-4">
      {/* Header Controls */}
      <Card className="mb-4">
        <Card.Header>
          <Row className="align-items-center">
            <Col md={8}>
              <h4 className="mb-0">📊 Enhanced Staff Attendance Dashboard</h4>
            </Col>
            <Col md={4} className="text-end">
              <Button 
                variant="outline-primary" 
                size="sm" 
                onClick={handleRefresh}
                className="me-2"
              >
                🔄 Refresh
              </Button>
              <Dropdown className="d-inline-block">
                <Dropdown.Toggle variant="primary" size="sm">
                  ⚙️ Roster Management
                </Dropdown.Toggle>
                <Dropdown.Menu>
                  <Dropdown.Item onClick={() => setShowCreateModal(true)}>
                    ➕ Create Period
                  </Dropdown.Item>
                  <Dropdown.Item onClick={() => setShowCopyModal(true)}>
                    📋 Copy Period
                  </Dropdown.Item>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={() => {
                    navigate(`/department-roster/${hotelSlug}`);
                  }}>
                    📅 Department Rosters
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown>
            </Col>
          </Row>
        </Card.Header>
        <Card.Body>
          <Row className="align-items-end">
            {/* Period Selection */}
            <Col md={6}>
              <label className="form-label">Roster Period</label>
              <RosterPeriodSelector
                periods={periods.items || []}
                selectedPeriodId={selectedPeriodId}
                onPeriodSelect={setSelectedPeriodId}
                loading={periods.loading}
                error={periods.error}
                onRefresh={() => setPeriodsRefreshKey(prev => prev + 1)}
                size="sm"
              />
              {selectedPeriod && (
                <small className="text-muted d-block mt-1">
                  {selectedPeriod.start_date} to {selectedPeriod.end_date}
                </small>
              )}
            </Col>
            
            {/* Department Filter */}
            <Col md={3}>
              <label className="form-label">Department</label>
              <select 
                className="form-select form-select-sm"
                value={selectedDepartment} 
                onChange={(e) => setSelectedDepartment(e.target.value)}
              >
                <option value="">All Departments</option>
                {availableDepartments.map((dept) => (
                  <option key={dept.slug} value={dept.slug}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </Col>
            
            {/* Status Filter */}
            <Col md={3}>
              <label className="form-label">Status</label>
              <select 
                className="form-select form-select-sm"
                value={selectedStatus} 
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="issue">Has Issues</option>
                <option value="no_log">No Log</option>
              </select>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Performance Metrics Summary */}
      {performanceMetrics && (
        <Row className="mb-4">
          <Col md={3}>
            <Card className="border-0 bg-gradient-warning text-dark">
              <Card.Body className="text-center">
                <h5 className="text-warning-emphasis">Smallest Duration</h5>
                <div className="h4 mb-0">{performanceMetrics.smallestDuration}</div>
                <small className="opacity-75">Minimum shift worked</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-0 bg-gradient-info text-white">
              <Card.Body className="text-center">
                <h5>Average Duration</h5>
                <div className="h4 mb-0">{performanceMetrics.averageDuration}</div>
                <small className="opacity-75">Average shift length</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-0 bg-gradient-success text-white">
              <Card.Body className="text-center">
                <h5>Total Work Hours</h5>
                <div className="h4 mb-0">{performanceMetrics.totalWorkHours}</div>
                <small className="opacity-75">Combined hours</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-0 bg-gradient-primary text-white">
              <Card.Body className="text-center">
                <h5>Active Staff</h5>
                <div className="h4 mb-0">
                  {performanceMetrics.activeStaff} / {performanceMetrics.totalStaff}
                </div>
                <small className="opacity-75">Currently working</small>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Navigation Tabs */}
      <Nav variant="tabs" className="mb-4">
        <Nav.Item>
          <Nav.Link 
            active={activeTab === 'summary'}
            onClick={() => setActiveTab('summary')}
            className="text-dark"
          >
            👥 Staff Summary
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link 
            active={activeTab === 'departments'}
            onClick={() => setActiveTab('departments')}
            className="text-dark"
          >
            🏢 Department Analytics
          </Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link 
            active={activeTab === 'individuals'}
            onClick={() => setActiveTab('individuals')}
            className="text-dark"
          >
            👤 Individual Rosters
          </Nav.Link>
        </Nav.Item>
      </Nav>

      {/* Content Area */}
      {activeTab === 'summary' && (
        <Card>
          <Card.Header>
            <h5 className="mb-0">👥 Staff Attendance Summary</h5>
            {summaryLoading && <Badge bg="info" className="ms-2">Loading...</Badge>}
          </Card.Header>
          <Card.Body>
            {summaryLoading ? (
              <div className="text-center py-4">
                <div className="spinner-border spinner-border-sm me-2" />
                Loading staff attendance data...
              </div>
            ) : summaryError ? (
              <div className="alert alert-danger">
                <strong>Error:</strong> {summaryError}
              </div>
            ) : staffSummaries.length === 0 ? (
              <div className="text-center py-4 text-muted">
                <i className="bi bi-people" style={{ fontSize: "3rem" }}></i>
                <p className="mt-3">No staff attendance data found for the selected criteria.</p>
              </div>
            ) : (
              <Row>
                {staffSummaries.map((staff) => {
                  const displayStaff = formatStaffForDisplay(staff);
                  return (
                    <Col key={staff.id} lg={6} xl={4} className="mb-3">
                      <Card className={`h-100 ${displayStaff.isSmallestDuration ? 'border-warning shadow-sm' : ''}`}>
                        <Card.Body>
                          <div className="d-flex align-items-start">
                            {/* Avatar */}
                            <div className="me-3">
                              <img 
                                src={staff.avatar_url || '/default-avatar.png'} 
                                alt={staff.full_name}
                                className="rounded-circle"
                                width="50"
                                height="50"
                                style={{ objectFit: 'cover' }}
                              />
                            </div>
                            
                            {/* Staff Info */}
                            <div className="flex-grow-1">
                              <h6 className="mb-1">{staff.full_name}</h6>
                              <p className="text-muted mb-2">{staff.department_name}</p>
                              
                              {/* Duration Display */}
                              <div className="mb-2">
                                <span className="text-muted small">Work Time: </span>
                                <span className={`fw-bold ${displayStaff.isSmallestDuration ? 'text-warning' : 'text-primary'}`}>
                                  {displayStaff.formattedDuration}
                                </span>
                                {displayStaff.isSmallestDuration && (
                                  <Badge bg="warning" text="dark" className="ms-2" title="Smallest duration">
                                    Smallest
                                  </Badge>
                                )}
                              </div>
                              
                              {/* Shifts Info */}
                              <div className="mb-2">
                                <small className="text-muted">
                                  {staff.worked_shifts}/{staff.planned_shifts} shifts
                                </small>
                                <div className="progress" style={{ height: '4px' }}>
                                  <div 
                                    className="progress-bar"
                                    role="progressbar"
                                    style={{ width: `${displayStaff.efficiency}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Status Badges */}
                          <div className="d-flex flex-wrap gap-1 mt-2">
                            <Badge 
                              style={{ 
                                backgroundColor: staff.duty_status_badge?.bg_color,
                                color: staff.duty_status_badge?.color 
                              }}
                            >
                              {staff.duty_status_badge?.label}
                            </Badge>
                            
                            <Badge 
                              style={{ 
                                backgroundColor: staff.attendance_status_badge?.bg_color,
                                color: staff.attendance_status_badge?.color 
                              }}
                            >
                              {staff.attendance_status_badge?.label}
                            </Badge>
                            
                            {staff.issues_count > 0 && (
                              <Badge bg="danger">
                                {staff.issues_count} issue{staff.issues_count > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            )}
          </Card.Body>
        </Card>
      )}

      {activeTab === 'departments' && (
        <DepartmentAnalytics
          hotelSlug={hotelSlug}
          startDate={dateRange.start}
          endDate={dateRange.end}
          department={selectedDepartment}
          refreshKey={refreshKey}
        />
      )}

      {activeTab === 'individuals' && (
        <Card>
          <Card.Header>
            <h5 className="mb-0">👤 Individual Staff Roster Analytics</h5>
            {staffAnalytics.loading && <Badge bg="info" className="ms-2">Loading...</Badge>}
          </Card.Header>
          <Card.Body>
            {staffAnalytics.loading ? (
              <div className="text-center py-4">
                <div className="spinner-border spinner-border-sm me-2" />
                Loading individual staff analytics...
              </div>
            ) : staffAnalytics.error ? (
              <div className="alert alert-danger">
                <strong>Error:</strong> {staffAnalytics.error}
              </div>
            ) : !staffAnalytics.staffSummaries.length ? (
              <div className="text-center py-4 text-muted">
                <i className="bi bi-person" style={{ fontSize: "3rem" }}></i>
                <p className="mt-3">No individual roster data found for the selected period.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover">
                  <thead>
                    <tr>
                      <th>Staff Name</th>
                      <th>Department</th>
                      <th>Total Hours</th>
                      <th>Shifts</th>
                      <th>Avg Shift Length</th>
                      <th>Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffAnalytics.staffSummaries.map((staff) => (
                      <tr key={staff.staff_id}>
                        <td>
                          <strong>{staff.first_name} {staff.last_name}</strong>
                        </td>
                        <td>{staff.department_name}</td>
                        <td>{staff.total_rostered_hours.toFixed(1)}h</td>
                        <td>{staff.shifts_count}</td>
                        <td className="fw-bold">
                          {formatDuration.toHoursMinutes(staff.avg_shift_length * 60)}
                        </td>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="progress me-2" style={{ width: '60px', height: '8px' }}>
                              <div 
                                className="progress-bar bg-success"
                                style={{ 
                                  width: `${Math.min(100, (staff.total_rostered_hours / 40) * 100)}%` 
                                }}
                              />
                            </div>
                            <small className="text-muted">
                              {((staff.total_rostered_hours / 40) * 100).toFixed(0)}%
                            </small>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {/* Modals */}
      <PeriodCreationModal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        hotelSlug={hotelSlug}
        onSuccess={handleModalSuccess}
      />

      <PeriodCopyModal
        show={showCopyModal}
        onHide={() => setShowCopyModal(false)}
        hotelSlug={hotelSlug}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}
import React, { useMemo } from "react";
import { Card, Row, Col, Badge, Spinner, Alert } from "react-bootstrap";
import { useDepartmentRosterAnalytics } from "../hooks/useAttendanceData";
import { formatDuration, formatDepartmentStats, getDepartmentWithSmallestAvg } from "../utils/durationUtils";

/**
 * Component for displaying department roster analytics
 */
export default function DepartmentAnalytics({ 
  hotelSlug, 
  startDate, 
  endDate, 
  department,
  refreshKey = 0 
}) {
  const { 
    loading, 
    error, 
    departmentSummaries,
    dailyBreakdown,
    weeklyBreakdown 
  } = useDepartmentRosterAnalytics(hotelSlug, startDate, endDate, department, refreshKey);

  // Calculate statistics
  const departmentStats = useMemo(() => {
    if (!departmentSummaries.length) return null;

    const totalHours = departmentSummaries.reduce((sum, dept) => sum + dept.total_rostered_hours, 0);
    const totalShifts = departmentSummaries.reduce((sum, dept) => sum + dept.shifts_count, 0);
    const totalStaff = departmentSummaries.reduce((sum, dept) => sum + dept.unique_staff, 0);
    const smallestAvgDept = getDepartmentWithSmallestAvg(departmentSummaries);

    return {
      totalDepartments: departmentSummaries.length,
      totalHours: totalHours.toFixed(1),
      totalShifts,
      totalStaff,
      avgHoursPerDept: (totalHours / departmentSummaries.length).toFixed(1),
      smallestAvgDept
    };
  }, [departmentSummaries]);

  if (loading) {
    return (
      <Card>
        <Card.Header>
          <h5 className="mb-0">📊 Department Analytics</h5>
        </Card.Header>
        <Card.Body className="text-center">
          <Spinner animation="border" size="sm" className="me-2" />
          Loading department analytics...
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Card.Header>
          <h5 className="mb-0">📊 Department Analytics</h5>
        </Card.Header>
        <Card.Body>
          <Alert variant="danger">
            <strong>Error:</strong> {error}
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  if (!departmentSummaries.length) {
    return (
      <Card>
        <Card.Header>
          <h5 className="mb-0">📊 Department Analytics</h5>
        </Card.Header>
        <Card.Body className="text-center text-muted">
          <i className="bi bi-building" style={{ fontSize: "2rem" }}></i>
          <p className="mt-2">No department data available for the selected period.</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div>
      {/* Summary Statistics */}
      {departmentStats && (
        <Row className="mb-4">
          <Col md={3}>
            <Card className="border-0 bg-light">
              <Card.Body className="text-center">
                <h4 className="text-primary mb-1">{departmentStats.totalDepartments}</h4>
                <small className="text-muted">Departments</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-0 bg-light">
              <Card.Body className="text-center">
                <h4 className="text-success mb-1">{departmentStats.totalHours}h</h4>
                <small className="text-muted">Total Hours</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-0 bg-light">
              <Card.Body className="text-center">
                <h4 className="text-info mb-1">{departmentStats.totalShifts}</h4>
                <small className="text-muted">Total Shifts</small>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-0 bg-light">
              <Card.Body className="text-center">
                <h4 className="text-warning mb-1">{departmentStats.totalStaff}</h4>
                <small className="text-muted">Staff Members</small>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Department Cards */}
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">🏢 Department Breakdown</h5>
          {departmentStats?.smallestAvgDept && (
            <Badge bg="info" className="ms-2">
              Smallest Avg: {departmentStats.smallestAvgDept.department_name} - {formatDuration.toHoursMinutes(departmentStats.smallestAvgDept.avg_shift_length * 60)}
            </Badge>
          )}
        </Card.Header>
        <Card.Body>
          <Row>
            {departmentSummaries.map((dept) => {
              const formattedStats = formatDepartmentStats(dept);
              const isSmallestAvg = departmentStats?.smallestAvgDept?.dept_id === dept.dept_id;
              
              return (
                <Col key={dept.dept_id} lg={6} xl={4} className="mb-3">
                  <Card className={`h-100 ${isSmallestAvg ? 'border-warning' : ''}`}>
                    <Card.Header className="d-flex justify-content-between align-items-center">
                      <h6 className="mb-0">{formattedStats.name}</h6>
                      {isSmallestAvg && (
                        <Badge bg="warning" text="dark" title="Department with smallest average shift">
                          Smallest Avg
                        </Badge>
                      )}
                    </Card.Header>
                    <Card.Body>
                      <div className="row g-2">
                        <div className="col-6">
                          <div className="text-center">
                            <div className="h6 text-primary mb-0">{formattedStats.totalHours}h</div>
                            <small className="text-muted">Total Hours</small>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="text-center">
                            <div className="h6 text-success mb-0">{formattedStats.staffCount}</div>
                            <small className="text-muted">Staff Count</small>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="text-center">
                            <div className="h6 text-info mb-0">{formattedStats.shiftsCount}</div>
                            <small className="text-muted">Total Shifts</small>
                          </div>
                        </div>
                        <div className="col-6">
                          <div className="text-center">
                            <div className={`h6 mb-0 ${isSmallestAvg ? 'text-warning' : 'text-secondary'}`}>
                              {formattedStats.avgShiftLength}
                            </div>
                            <small className="text-muted">Avg Shift</small>
                          </div>
                        </div>
                      </div>
                      
                      <hr className="my-2" />
                      
                      <div className="d-flex justify-content-between align-items-center">
                        <small className="text-muted">Hours per Staff:</small>
                        <strong>{formattedStats.hoursPerStaff}h</strong>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
        </Card.Body>
      </Card>

      {/* Daily Breakdown (if available) */}
      {dailyBreakdown.length > 0 && (
        <Card className="mt-4">
          <Card.Header>
            <h5 className="mb-0">📅 Daily Breakdown by Department</h5>
          </Card.Header>
          <Card.Body>
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Date</th>
                    {departmentSummaries.map(dept => (
                      <th key={dept.dept_id} className="text-center">
                        {dept.department_name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {/* Group daily breakdown by date */}
                  {Array.from(new Set(dailyBreakdown.map(item => item.date))).map(date => (
                    <tr key={date}>
                      <td className="fw-semibold">{date}</td>
                      {departmentSummaries.map(dept => {
                        const dayData = dailyBreakdown.find(
                          item => item.date === date && item.dept_id === dept.dept_id
                        );
                        return (
                          <td key={dept.dept_id} className="text-center">
                            {dayData ? (
                              <div>
                                <div className="fw-semibold">{dayData.total_rostered_hours.toFixed(1)}h</div>
                                <small className="text-muted">{dayData.shifts_count} shifts</small>
                              </div>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card.Body>
        </Card>
      )}

      {/* Weekly Breakdown (if available) */}
      {weeklyBreakdown.length > 0 && (
        <Card className="mt-4">
          <Card.Header>
            <h5 className="mb-0">📊 Weekly Breakdown by Department</h5>
          </Card.Header>
          <Card.Body>
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Week</th>
                    <th>Department</th>
                    <th>Total Hours</th>
                    <th>Shifts</th>
                    <th>Avg Shift</th>
                    <th>Staff Count</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyBreakdown.map((item, index) => (
                    <tr key={index}>
                      <td>{item.week || 'N/A'}</td>
                      <td>{item.department_name}</td>
                      <td>{item.total_rostered_hours.toFixed(1)}h</td>
                      <td>{item.shifts_count}</td>
                      <td>{formatDuration.toHoursMinutes(item.avg_shift_length * 60)}</td>
                      <td>{item.unique_staff}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
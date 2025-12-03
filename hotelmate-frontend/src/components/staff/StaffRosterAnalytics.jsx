import React, { useState, useMemo } from "react";
import { Card, Nav, Row, Col, Badge, Alert, Spinner } from "react-bootstrap";
import { useStaffRosterAnalytics } from "../../features/attendance/hooks/useAttendanceData";
import useStaffMetadata from "../../hooks/useStaffMetadata";
import { formatDuration, getStaffPerformanceMetrics } from "../../features/attendance/utils/durationUtils";

/**
 * Component for displaying individual staff roster analytics
 */
export default function StaffRosterAnalytics({ 
  hotelSlug, 
  staffId, 
  startDate, 
  endDate 
}) {
  const [activeTab, setActiveTab] = useState('summary');
  
  // Calculate date range - default to current week if not provided
  const dateRange = useMemo(() => {
    if (startDate && endDate) {
      return { start: startDate, end: endDate };
    }
    
    // Default to current week
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const startOfWeek = new Date(today);
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startOfWeek.setDate(today.getDate() - daysToSubtract);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return {
      start: startOfWeek.toISOString().split('T')[0],
      end: endOfWeek.toISOString().split('T')[0]
    };
  }, [startDate, endDate]);

  const { 
    loading, 
    error, 
    staffSummaries,
    dailyBreakdown,
    weeklyBreakdown 
  } = useStaffRosterAnalytics(hotelSlug, dateRange.start, dateRange.end, null, 0);

  // Filter data for this specific staff member
  const staffData = useMemo(() => {
    if (!staffSummaries.length || !staffId) return null;
    
    const summary = staffSummaries.find(s => s.staff_id === parseInt(staffId));
    const daily = dailyBreakdown.filter(d => d.staff_id === parseInt(staffId));
    const weekly = weeklyBreakdown.filter(w => w.staff_id === parseInt(staffId));
    
    return { summary, daily, weekly };
  }, [staffSummaries, dailyBreakdown, weeklyBreakdown, staffId]);

  // Calculate performance metrics
  const performanceMetrics = useMemo(() => {
    if (!staffData?.summary) return null;
    
    return getStaffPerformanceMetrics(staffData.summary, staffData.daily);
  }, [staffData]);

  if (loading) {
    return (
      <Card>
        <Card.Header>
          <h5 className="mb-0">📊 Roster Analytics</h5>
        </Card.Header>
        <Card.Body className="text-center">
          <Spinner animation="border" size="sm" className="me-2" />
          Loading roster analytics...
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Card.Header>
          <h5 className="mb-0">📊 Roster Analytics</h5>
        </Card.Header>
        <Card.Body>
          <Alert variant="danger">
            <strong>Error:</strong> {error}
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  if (!staffData?.summary) {
    return (
      <Card>
        <Card.Header>
          <h5 className="mb-0">📊 Roster Analytics</h5>
        </Card.Header>
        <Card.Body className="text-center text-muted">
          <i className="bi bi-calendar-x" style={{ fontSize: "2rem" }}></i>
          <p className="mt-2">No roster data available for the current period.</p>
          <small>Period: {dateRange.start} to {dateRange.end}</small>
        </Card.Body>
      </Card>
    );
  }

  const { summary, daily, weekly } = staffData;

  return (
    <Card>
      <Card.Header>
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">📊 Roster Analytics</h5>
          <Badge bg="info">{dateRange.start} to {dateRange.end}</Badge>
        </div>
      </Card.Header>
      
      <Card.Body>
        {/* Performance Summary */}
        {performanceMetrics && (
          <Row className="mb-4">
            <Col md={3}>
              <div className="text-center">
                <h4 className="text-primary mb-0">{performanceMetrics.totalHours.toFixed(1)}h</h4>
                <small className="text-muted">Total Hours</small>
              </div>
            </Col>
            <Col md={3}>
              <div className="text-center">
                <h4 className="text-success mb-0">{performanceMetrics.shiftsCount}</h4>
                <small className="text-muted">Total Shifts</small>
              </div>
            </Col>
            <Col md={3}>
              <div className="text-center">
                <h4 className="text-info mb-0">{performanceMetrics.avgShiftLength}</h4>
                <small className="text-muted">Avg Shift</small>
              </div>
            </Col>
            <Col md={3}>
              <div className="text-center">
                <h4 className="text-warning mb-0">{performanceMetrics.department}</h4>
                <small className="text-muted">Department</small>
              </div>
            </Col>
          </Row>
        )}

        {/* Navigation Tabs */}
        <Nav variant="tabs" className="mb-3">
          <Nav.Item>
            <Nav.Link 
              active={activeTab === 'summary'}
              onClick={() => setActiveTab('summary')}
            >
              Summary
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link 
              active={activeTab === 'daily'}
              onClick={() => setActiveTab('daily')}
            >
              Daily Breakdown
            </Nav.Link>
          </Nav.Item>
          {weekly.length > 0 && (
            <Nav.Item>
              <Nav.Link 
                active={activeTab === 'weekly'}
                onClick={() => setActiveTab('weekly')}
              >
                Weekly Trends
              </Nav.Link>
            </Nav.Item>
          )}
        </Nav>

        {/* Content Areas */}
        {activeTab === 'summary' && (
          <div>
            <h6 className="mb-3">Period Summary</h6>
            <Row>
              <Col md={6}>
                <div className="border rounded p-3">
                  <h6 className="text-primary">Work Statistics</h6>
                  <div className="row">
                    <div className="col-6">
                      <strong>Total Rostered Hours:</strong>
                    </div>
                    <div className="col-6 text-end">
                      {summary.total_rostered_hours.toFixed(1)}h
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-6">
                      <strong>Shifts Count:</strong>
                    </div>
                    <div className="col-6 text-end">
                      {summary.shifts_count}
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-6">
                      <strong>Average Shift:</strong>
                    </div>
                    <div className="col-6 text-end">
                      {formatDuration.toHoursMinutes(summary.avg_shift_length * 60)}
                    </div>
                  </div>
                </div>
              </Col>
              <Col md={6}>
                <div className="border rounded p-3">
                  <h6 className="text-success">Performance Indicators</h6>
                  <div className="row">
                    <div className="col-6">
                      <strong>Hours per Day:</strong>
                    </div>
                    <div className="col-6 text-end">
                      {(summary.total_rostered_hours / 7).toFixed(1)}h
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-6">
                      <strong>Shifts per Week:</strong>
                    </div>
                    <div className="col-6 text-end">
                      {summary.shifts_count}
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-6">
                      <strong>Department:</strong>
                    </div>
                    <div className="col-6 text-end">
                      <Badge bg="secondary">{summary.department_name}</Badge>
                    </div>
                  </div>
                </div>
              </Col>
            </Row>
          </div>
        )}

        {activeTab === 'daily' && (
          <div>
            <h6 className="mb-3">Daily Breakdown</h6>
            {daily.length > 0 ? (
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Hours</th>
                      <th>Shifts</th>
                      <th>Avg Shift</th>
                    </tr>
                  </thead>
                  <tbody>
                    {daily.map((day, index) => (
                      <tr key={index}>
                        <td>
                          <strong>{new Date(day.date).toLocaleDateString()}</strong>
                        </td>
                        <td>{day.total_rostered_hours.toFixed(1)}h</td>
                        <td>{day.shifts_count}</td>
                        <td>
                          {day.avg_shift_length > 0 
                            ? formatDuration.toHoursMinutes(day.avg_shift_length * 60)
                            : '-'
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-muted py-3">
                <i className="bi bi-calendar3"></i>
                <p className="mb-0 mt-2">No daily breakdown data available</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'weekly' && weekly.length > 0 && (
          <div>
            <h6 className="mb-3">Weekly Trends</h6>
            <div className="table-responsive">
              <table className="table table-sm">
                <thead>
                  <tr>
                    <th>Week</th>
                    <th>Total Hours</th>
                    <th>Shifts</th>
                    <th>Avg Shift</th>
                    <th>Daily Average</th>
                  </tr>
                </thead>
                <tbody>
                  {weekly.map((week, index) => (
                    <tr key={index}>
                      <td>
                        <strong>Week {week.week || index + 1}</strong>
                      </td>
                      <td>{week.total_rostered_hours.toFixed(1)}h</td>
                      <td>{week.shifts_count}</td>
                      <td>
                        {formatDuration.toHoursMinutes(week.avg_shift_length * 60)}
                      </td>
                      <td>
                        {(week.total_rostered_hours / 7).toFixed(1)}h/day
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
import React, { useState, useEffect, useRef } from 'react';
import { Card, Row, Col, Badge, Button, Alert, Toast, ToastContainer } from 'react-bootstrap';
import { useDepartmentAttendanceStatus, useAttendanceApproval } from '../hooks/useDepartmentAttendanceStatus';
import { useAuth } from '@/context/AuthContext';
import { safeString } from '../utils/safeUtils';

/**
 * DepartmentStatusSummary Component
 * Shows currently logged in staff and pending approvals using new department status API
 */
const DepartmentStatusSummary = ({
  hotelSlug,
  refreshKey = 0
}) => {
  const [toasts, setToasts] = useState([]);
  const [internalRefreshKey, setInternalRefreshKey] = useState(0);
  const { user } = useAuth();
  const pusherRef = useRef(null);
  const channelRef = useRef(null);
  
  // Fetch real-time department attendance data
  const { data: departmentData, loading, error, refresh } = useDepartmentAttendanceStatus(hotelSlug, refreshKey + internalRefreshKey);
  
  // Handle approval/rejection with toast feedback
  const handleSuccess = (action, logId) => {
    const message = action === 'approved' 
      ? 'Clock-in approved successfully!' 
      : 'Clock-in rejected - staff has been clocked out';
    
    setToasts(prev => [...prev, {
      id: Date.now(),
      message,
      variant: action === 'approved' ? 'success' : 'warning'
    }]);
    
    // Auto-remove toast after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== Date.now()));
    }, 3000);
  };
  
  const { approveLog, rejectLog, isApproving } = useAttendanceApproval(hotelSlug, handleSuccess);

  // Pusher real-time integration for approval updates
  useEffect(() => {
    if (!hotelSlug || !user?.staff_id) return;

    const initializePusher = async () => {
      try {
        const pusherKey = import.meta.env.VITE_PUSHER_KEY;
        const pusherCluster = import.meta.env.VITE_PUSHER_CLUSTER;
        
        if (!pusherKey || !pusherCluster) {
          console.warn('[DepartmentStatus] Pusher configuration missing');
          return;
        }

        // Dynamic import Pusher
        let Pusher;
        try {
          Pusher = (await import('pusher-js')).default;
        } catch (importError) {
          console.warn('[DepartmentStatus] Pusher not available:', importError);
          return;
        }

        // Initialize Pusher
        pusherRef.current = new Pusher(pusherKey, {
          cluster: pusherCluster,
          encrypted: true,
        });

        // Subscribe to personal staff channel for approval notifications
        const personalChannel = `attendance-hotel-${hotelSlug}-staff-${user.staff_id}`;
        console.log('[DepartmentStatus] Subscribing to personal channel:', personalChannel);
        
        const staffChannel = pusherRef.current.subscribe(personalChannel);
        
        // Listen for approval events on personal channel
        staffChannel.bind('clocklog-approved', (data) => {
          console.log('[DepartmentStatus] Received approval notification:', data);
          setToasts(prev => [...prev, {
            id: Date.now(),
            message: `✅ ${data.message} (by ${data.approved_by})`,
            variant: 'success'
          }]);
          // Refresh department status
          setInternalRefreshKey(prev => prev + 1);
        });
        
        staffChannel.bind('clocklog-rejected', (data) => {
          console.log('[DepartmentStatus] Received rejection notification:', data);
          setToasts(prev => [...prev, {
            id: Date.now(),
            message: `❌ ${data.message} (by ${data.rejected_by})`,
            variant: 'warning'
          }]);
          // Refresh department status
          setInternalRefreshKey(prev => prev + 1);
        });

        // Subscribe to manager channel for department-wide updates
        const managerChannel = `attendance-hotel-${hotelSlug}-managers`;
        console.log('[DepartmentStatus] Subscribing to manager channel:', managerChannel);
        
        channelRef.current = pusherRef.current.subscribe(managerChannel);
        
        // Listen for any approval/rejection events to refresh department status
        channelRef.current.bind('clocklog-approved', () => {
          console.log('[DepartmentStatus] Manager channel: clocklog approved, refreshing status');
          setInternalRefreshKey(prev => prev + 1);
        });
        
        channelRef.current.bind('clocklog-rejected', () => {
          console.log('[DepartmentStatus] Manager channel: clocklog rejected, refreshing status');
          setInternalRefreshKey(prev => prev + 1);
        });

        pusherRef.current.connection.bind('connected', () => {
          console.log('[DepartmentStatus] Pusher connected');
        });

      } catch (error) {
        console.error('[DepartmentStatus] Failed to initialize Pusher:', error);
      }
    };

    initializePusher();

    // Cleanup
    return () => {
      if (channelRef.current) {
        channelRef.current.unbind_all();
        channelRef.current = null;
      }
      if (pusherRef.current) {
        pusherRef.current.disconnect();
        pusherRef.current = null;
      }
    };
  }, [hotelSlug, user?.staff_id]);
  
  // Process data from new API format
  const allCurrentlyLoggedIn = [];
  const allNeedingApproval = [];
  
  if (departmentData) {
    Object.entries(departmentData).forEach(([deptSlug, deptData]) => {
      // Add currently clocked in staff
      if (deptData.currently_clocked_in) {
        deptData.currently_clocked_in.forEach(staff => {
          allCurrentlyLoggedIn.push({
            ...staff,
            department_name: deptSlug.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
          });
        });
      }
      
      // Add staff needing approval
      if (deptData.unrostered) {
        deptData.unrostered.forEach(staff => {
          allNeedingApproval.push({
            ...staff,
            department_name: deptSlug.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())
          });
        });
      }
    });
  }

  const handleApprove = async (staff) => {
    try {
      await approveLog(staff.log_id);  // Use log_id not staff_id
      // Refresh department status after approval
      setInternalRefreshKey(prev => prev + 1);
    } catch (error) {
      setToasts(prev => [...prev, {
        id: Date.now(),
        message: error.message || 'Failed to approve',
        variant: 'danger'
      }]);
    }
  };

  const handleReject = async (staff) => {
    try {
      await rejectLog(staff.log_id);  // Use log_id not staff_id
      // Refresh department status after rejection
      setInternalRefreshKey(prev => prev + 1);
    } catch (error) {
      setToasts(prev => [...prev, {
        id: Date.now(),
        message: error.message || 'Failed to reject',
        variant: 'danger'
      }]);
    }
  };

  const calculateDuration = (hoursWorked) => {
    if (!hoursWorked) return '0m';
    const hours = Math.floor(hoursWorked);
    const minutes = Math.round((hoursWorked - hours) * 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <div className="mt-2">Loading attendance status...</div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <i className="bi bi-exclamation-triangle me-2"></i>
        {error}
      </Alert>
    );
  }

  return (
    <div className="department-status-summary mt-4">
      <Row>
        {/* Currently Logged In Staff */}
        <Col md={6}>
          <Card className="h-100">
            <Card.Header className="bg-success text-white">
              <h6 className="mb-0">
                <i className="bi bi-clock-fill me-2"></i>
                Currently Logged In ({allCurrentlyLoggedIn.length})
              </h6>
            </Card.Header>
            <Card.Body>
              {allCurrentlyLoggedIn.length === 0 ? (
                <div className="text-center text-muted py-3">
                  <i className="bi bi-person-dash" style={{ fontSize: '2rem' }}></i>
                  <p className="mb-0 mt-2">No staff currently logged in</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {allCurrentlyLoggedIn.map((staff, index) => (
                    <div key={staff.staff_id || index} className="list-group-item px-0">
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="flex-grow-1">
                          <div className="fw-bold">
                            {safeString(staff.staff_name)}
                          </div>
                          <div className="small text-info mb-1">
                            <i className="bi bi-building me-1"></i>
                            {safeString(staff.department_name)}
                          </div>
                          <div className="small text-muted">
                            <i className="bi bi-clock me-1"></i>
                            Started: {staff.clock_in_time}
                            <span className="ms-2">
                              Duration: {calculateDuration(staff.hours_worked)}
                            </span>
                          </div>
                          {staff.is_on_break && (
                            <Badge bg="info" className="mt-1 me-2">
                              On Break
                            </Badge>
                          )}
                          {!staff.is_approved && (
                            <Badge bg="warning" className="mt-1">
                              Unscheduled
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>

        {/* Pending Approvals */}
        <Col md={6}>
          <Card className="h-100">
            <Card.Header className="bg-warning text-dark">
              <h6 className="mb-0">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                Needs Approval ({allNeedingApproval.length})
              </h6>
            </Card.Header>
            <Card.Body>
              {allNeedingApproval.length === 0 ? (
                <div className="text-center text-muted py-3">
                  <i className="bi bi-check-circle" style={{ fontSize: '2rem' }}></i>
                  <p className="mb-0 mt-2">All shifts approved</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {allNeedingApproval.map((staff, index) => (
                    <div key={staff.log_id || staff.staff_id || index} className="list-group-item px-0">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <div className="fw-bold">
                            {safeString(staff.staff_name)}
                          </div>
                          <div className="small text-info mb-1">
                            <i className="bi bi-building me-1"></i>
                            {safeString(staff.department_name)}
                          </div>
                          <div className="small text-muted">
                            <i className="bi bi-clock me-1"></i>
                            Started: {staff.clock_in_time}
                            <span className="ms-2">
                              Duration: {calculateDuration(staff.hours_worked)}
                            </span>
                          </div>
                          <div className="small text-warning mt-1">
                            <i className="bi bi-exclamation-triangle me-1"></i>
                            Unscheduled shift - needs approval
                          </div>
                          {staff.is_on_break && (
                            <div className="small text-info">
                              Currently on break
                            </div>
                          )}
                        </div>
                        <div className="d-flex flex-column gap-1">
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleApprove(staff)}
                            disabled={isApproving(staff.log_id)}
                            title="Approve this unscheduled shift"
                          >
                            {isApproving(staff.log_id) ? (
                              <span className="spinner-border spinner-border-sm"></span>
                            ) : (
                              <i className="bi bi-check"></i>
                            )}
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleReject(staff)}
                            disabled={isApproving(staff.log_id)}
                            title="Reject and clock out staff"
                          >
                            {isApproving(staff.log_id) ? (
                              <span className="spinner-border spinner-border-sm"></span>
                            ) : (
                              <i className="bi bi-x"></i>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Summary Stats */}
      {(allCurrentlyLoggedIn.length > 0 || allNeedingApproval.length > 0) && (
        <Alert variant="info" className="mt-3">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <i className="bi bi-info-circle me-2"></i>
              <strong>Hotel Summary:</strong> {allCurrentlyLoggedIn.length} staff on duty, 
              {' '}{allNeedingApproval.length} approvals needed
            </div>
            {allNeedingApproval.length > 0 && (
              <Badge bg="warning">Action Required</Badge>
            )}
          </div>
        </Alert>
      )}

      {/* Toast Notifications */}
      <ToastContainer position="top-end" className="p-3">
        {toasts.map(toast => (
          <Toast 
            key={toast.id}
            bg={toast.variant}
            onClose={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
            show={true}
            delay={3000}
            autohide
          >
            <Toast.Body className={toast.variant === 'success' || toast.variant === 'danger' ? 'text-white' : ''}>
              {toast.message}
            </Toast.Body>
          </Toast>
        ))}
      </ToastContainer>
    </div>
  );
};

export default DepartmentStatusSummary;
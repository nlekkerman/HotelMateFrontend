import React, { useState } from "react";
import DepartmentRosterView from "@/components/attendance/DepartmentRosterView";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import useStaffMetadata from "@/hooks/useStaffMetadata";
import { Container, Row, Col, Card } from "react-bootstrap";

/**
 * RosterDashboard - Department selection and roster management
 * 
 * Quick Actions Integration:
 * - When a department is selected, Quick Actions appear in BigScreenNavbar
 * - Actions dispatch custom events: 'toggleDailyPlans', 'toggleClockLogs', 'toggleAnalytics'
 * - DepartmentRosterView listens to these events and toggles the respective views
 * - Only one view (Daily Plans, Clock Logs, or Analytics) can be active at a time
 */
export default function RosterDashboard() {
  const { hotelSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const departmentFromUrl = searchParams.get('department') || '';
  const [selectedDepartment, setSelectedDepartment] = useState(departmentFromUrl);

  const {
    departments,
    roles,
    accessLevels,
    isLoading,
    isError,
    error,
  } = useStaffMetadata(hotelSlug);

  if (isError) {
    return (
      <Container className="mt-5">
        <div className="alert alert-danger text-center">
          <i className="bi bi-exclamation-triangle-fill me-2"></i>
          Error loading departments: {error?.message || "Unknown error"}
        </div>
      </Container>
    );
  }

  if (isLoading) {
    return (
      <Container className="mt-5 text-center">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-3 text-muted">Loading departments...</p>
      </Container>
    );
  }

  // Get department icon based on name
  const getDepartmentIcon = (name) => {
    const iconMap = {
      'reception': 'person-workspace',
      'housekeeping': 'house-door',
      'maintenance': 'tools',
      'kitchen': 'egg-fried',
      'restaurant': 'cup-hot',
      'bar': 'cup-straw',
      'management': 'briefcase',
      'security': 'shield-lock',
    };
    
    const key = name.toLowerCase();
    for (const [keyword, icon] of Object.entries(iconMap)) {
      if (key.includes(keyword)) return icon;
    }
    return 'people-fill'; // default icon
  };

  // Get department color gradient based on index
  const getDepartmentGradient = (index) => {
    const gradients = [
      '#667eea 0%, #764ba2 100%',
      '#f093fb 0%, #f5576c 100%',
      '#4facfe 0%, #00f2fe 100%',
      '#43e97b 0%, #38f9d7 100%',
      '#fa709a 0%, #fee140 100%',
      '#30cfd0 0%, #330867 100%',
      '#ff9a9e 0%, #fecfef 100%',
      '#ffecd2 0%, #fcb69f 100%',
    ];
    return gradients[index % gradients.length];
  };

  return (
    <Container fluid className="py-4" style={{ maxWidth: '1400px' }}>
      {/* Back to Departments Button */}
      {selectedDepartment && (
        <div className="mb-4">
          <button
            className="btn btn-outline-primary d-flex align-items-center gap-2"
            onClick={() => {
              setSelectedDepartment('');
              navigate(`/roster/${hotelSlug}`);
            }}
            style={{ transition: 'all 0.2s ease' }}
          >
            <i className="bi bi-arrow-left"></i>
            <span>Back to Departments</span>
          </button>
        </div>
      )}

      {/* Department Selection - Card Grid */}
      {!selectedDepartment && (
        <Row className="g-4 mb-5">
          {departments.map((dept, index) => (
            <Col xs={12} sm={6} md={4} lg={3} key={dept.id}>
              <Card 
                className="h-100 border-0 shadow-sm"
                onClick={() => {
                  const deptSlug = dept.slug || dept.id;
                  setSelectedDepartment(deptSlug);
                  navigate(`/roster/${hotelSlug}?department=${deptSlug}`);
                }}
                style={{ 
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  minHeight: '200px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-8px)';
                  e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
                }}
              >
                <div 
                  style={{
                    height: '120px',
                    background: `linear-gradient(135deg, ${getDepartmentGradient(index)})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div 
                    style={{
                      width: '70px',
                      height: '70px',
                      borderRadius: '50%',
                      background: 'rgba(255, 255, 255, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backdropFilter: 'blur(10px)',
                    }}
                  >
                    <i className={`bi bi-${getDepartmentIcon(dept.name)}`} style={{ fontSize: '2rem', color: 'white' }}></i>
                  </div>
                </div>
                
                <Card.Body className="text-center">
                  <h5 className="fw-bold mb-0" style={{ color: '#2c3e50' }}>
                    {dept.name}
                  </h5>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Selected Department View */}
      {selectedDepartment && (
        <>
          <DepartmentRosterView
            department={selectedDepartment}
            hotelSlug={hotelSlug}
            onSubmit={() => {
              // Optionally refresh or reset things on submit
            }}
          />
        </>
      )}

      {/* Empty State */}
      {!isLoading && departments.length === 0 && (
        <div className="text-center py-5">
          <i className="bi bi-calendar-x" style={{ fontSize: '4rem', color: '#ddd' }}></i>
          <h4 className="mt-3 text-muted">No departments found</h4>
          <p className="text-muted">Please add departments to manage rosters</p>
        </div>
      )}
    </Container>
  );
}

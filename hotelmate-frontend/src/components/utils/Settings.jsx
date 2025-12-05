// src/components/utils/Settings.jsx
import React from "react";
import { Container, Row, Col, Alert } from "react-bootstrap";
import { useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";

// Import section components - STAFF ONLY
import SectionStaffRegistration from "./settings-sections/SectionStaffRegistration";
import SectionThemeSettings from "./settings-sections/SectionThemeSettings";

export default function Settings() {
  const { user } = useAuth();
  const { hotelSlug } = useParams();
  const { canAccess, isSuperUser } = usePermissions();
  
  // Basic permission check - must be staff of this hotel
  if (!user || !user.is_staff || user.hotel_slug !== hotelSlug) {
    return (
      <Container className="py-5">
        <Alert variant="warning">
          <i className="bi bi-exclamation-triangle me-2"></i>
          You don't have permission to access hotel settings.
        </Alert>
      </Container>
    );
  }

  // Additional permission check - must be superuser or super staff admin
  const canAccessSettings = isSuperUser || canAccess(['super_staff_admin']);
  if (!canAccessSettings) {
    return (
      <Container className="py-5">
        <Alert variant="warning">
          <i className="bi bi-shield-exclamation me-2"></i>
          Theme settings are only available to superusers and super staff admins.
        </Alert>
      </Container>
    );
  }

  return (
    <Container className="py-5" style={{ maxWidth: '1200px' }}>
      {/* Header */}
      <Row className="mb-4 py-5">
        <Col>
          <div>
            <h2 className="mb-1">
              <i className="bi bi-gear-fill me-2"></i>
              Staff Settings
            </h2>
            <p className="text-muted mb-0">
              Manage staff-related configuration and tools
            </p>
          </div>
        </Col>
      </Row>

      {/* Staff-Only Sections */}
      <Row>
        <Col>
          {/* Theme Settings */}
          <SectionThemeSettings />
          
          {/* Staff Registration Packages */}
          <SectionStaffRegistration />
          
          {/* Future staff-only settings can be added here */}
          <Alert variant="info" className="mt-4">
            <i className="bi bi-info-circle me-2"></i>
            Additional staff management features will be available here in future updates.
          </Alert>
        </Col>
      </Row>
    </Container>
  );
}
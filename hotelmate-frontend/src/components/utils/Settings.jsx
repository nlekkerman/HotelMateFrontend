// src/components/utils/Settings.jsx
import React from "react";
import { Container, Row, Col, Alert, Card, Button } from "react-bootstrap";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useCan } from "@/rbac";

// Import section components - STAFF ONLY
import SectionThemeSettings from "./settings-sections/SectionThemeSettings";

export default function Settings() {
  const { user } = useAuth();
  const { hotelSlug } = useParams();
  // RBAC: backend-driven authority for the Staff Settings page.
  // TODO(backend-rbac): backend `MODULE_POLICY` does not yet expose an
  // `admin_settings` module / `read` action. Until it does, the page is
  // fail-closed. See RBAC_MISSING_BACKEND_POLICY_KEYS.md.
  // Do NOT reintroduce isAdmin / role / tier / access_level fallbacks.
  const { can } = useCan(); // eslint-disable-line no-unused-vars
  const canAccessSettings = false;
  const navigate = useNavigate();
  
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

  // Additional permission check - canonical RBAC action key
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
          
          {/* Registration Packages shortcut — full manager lives in Staff page */}
          <Card className="shadow-sm mb-4">
            <Card.Body className="p-4 d-flex align-items-center justify-content-between">
              <div>
                <h5 className="mb-1">
                  <i className="bi bi-qr-code me-2"></i>
                  Staff Registration Packages
                </h5>
                <p className="text-muted mb-0">
                  Generate, email, and print registration packages for new staff members.
                </p>
              </div>
              <Button
                variant="primary"
                onClick={() => navigate(`/${hotelSlug}/staff?tab=packages`)}
              >
                <i className="bi bi-box-arrow-up-right me-1"></i>
                Open Manager
              </Button>
            </Card.Body>
          </Card>

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
// src/pages/staff/OverviewPage.jsx
// Operational summary page — shows compact, actionable summaries for RBAC-allowed modules.
// Does NOT duplicate full pages. Each module card shows counts + CTAs.
import React, { useEffect, useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Container, Row, Col, Card, Badge } from 'react-bootstrap';
import { usePermissions } from '@/hooks/usePermissions';
import {
  useOverviewSignalsState,
  overviewSignalsActions,
  OVERVIEW_MODULES,
} from '@/realtime/stores/overviewSignalsStore';
import { useRoomBookingState } from '@/realtime/stores/roomBookingStore';
import { useServiceBookingState } from '@/realtime/stores/serviceBookingStore';
import { useRoomServiceState } from '@/realtime/stores/roomServiceStore';

// ---------------------------------------------------------------------------
// Module card config — maps RBAC slug → label, icon, path template, live data
// ---------------------------------------------------------------------------
const MODULE_CONFIG = {
  room_bookings: {
    label: 'Room Bookings',
    icon: 'bi-bed',
    pathTemplate: '/staff/hotel/{hotelSlug}/room-bookings',
    color: '#4e79a7',
  },
  room_services: {
    label: 'Room Service',
    icon: 'bi-box',
    pathTemplate: '/room_services/{hotelSlug}?tab=management',
    color: '#e15759',
  },
  housekeeping: {
    label: 'Housekeeping',
    icon: 'bi-house-gear',
    pathTemplate: '/staff/hotel/{hotelSlug}/housekeeping',
    color: '#76b7b2',
  },
};

function resolvePath(template, hotelSlug) {
  return template.replace('{hotelSlug}', hotelSlug);
}

// ---------------------------------------------------------------------------
// Individual overview module card
// ---------------------------------------------------------------------------
function OverviewModuleCard({ slug, hotelSlug, signalData, liveCount }) {
  const cfg = MODULE_CONFIG[slug];
  if (!cfg) return null;

  const count = signalData.count || 0;
  const reasons = signalData.reasons || [];
  const link = resolvePath(cfg.pathTemplate, hotelSlug);

  // Show newest reasons (up to 5)
  const recentReasons = reasons.slice(-5).reverse();

  return (
    <Col xs={12} md={6} lg={4} className="mb-3">
      <Card className="h-100 shadow-sm border-0">
        <Card.Body>
          <div className="d-flex align-items-center mb-2">
            <i className={`bi ${cfg.icon} fs-4 me-2`} style={{ color: cfg.color }} />
            <Card.Title className="mb-0 fs-6">{cfg.label}</Card.Title>
            {count > 0 && (
              <Badge bg="danger" pill className="ms-auto">
                {count}
              </Badge>
            )}
          </div>

          {liveCount !== null && liveCount !== undefined && (
            <p className="text-muted small mb-1">
              {liveCount} active item{liveCount !== 1 ? 's' : ''}
            </p>
          )}

          {count > 0 ? (
            <ul className="list-unstyled small text-muted mb-2">
              {recentReasons.map((r, i) => (
                <li key={i} className="text-truncate">
                  <i className="bi bi-dot" /> {r}
                </li>
              ))}
            </ul>
          ) : (
            <p className="small text-muted mb-2">No new updates</p>
          )}

          <Link to={link} className="btn btn-sm btn-outline-primary w-100">
            Open {cfg.label}
          </Link>
        </Card.Body>
      </Card>
    </Col>
  );
}

// ---------------------------------------------------------------------------
// OverviewPage
// ---------------------------------------------------------------------------
export default function OverviewPage() {
  const { hotelSlug } = useParams();
  const { effectiveNavs, isSuperUser } = usePermissions();
  const overviewSignals = useOverviewSignalsState();

  // Live counts from existing realtime stores
  const roomBookingState = useRoomBookingState();
  const serviceBookingState = useServiceBookingState();
  const roomServiceState = useRoomServiceState();

  // Mark all signals as seen when the user visits Overview
  useEffect(() => {
    overviewSignalsActions.markAllSeen();
  }, []);

  // Filter modules to those allowed by RBAC
  const allowedModules = useMemo(() => {
    if (isSuperUser) return OVERVIEW_MODULES;
    return OVERVIEW_MODULES.filter((m) => effectiveNavs.includes(m));
  }, [effectiveNavs, isSuperUser]);

  // Build live counts per module from existing store state
  const liveCounts = useMemo(() => ({
    room_bookings: roomBookingState?.list?.length ?? null,
    room_services: roomServiceState?.pendingOrders?.length ?? null,
    housekeeping: null, // housekeeping counts are UI-driven, not in realtime store
  }), [roomBookingState, roomServiceState]);

  if (allowedModules.length === 0) {
    return (
      <Container className="py-4">
        <p className="text-muted">No operational modules available for your role.</p>
        <Link to={`/staff/${hotelSlug}/feed`} className="btn btn-primary btn-sm">
          Go to Feed
        </Link>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <div className="d-flex align-items-center justify-content-between mb-4">
        <div>
          <h5 className="mb-0">Operations Overview</h5>
          <small className="text-muted">Items requiring your attention</small>
        </div>
        <Link to={`/staff/${hotelSlug}/feed`} className="btn btn-outline-secondary btn-sm">
          <i className="bi bi-house me-1" />
          Feed
        </Link>
      </div>

      <Row>
        {allowedModules.map((slug) => (
          <OverviewModuleCard
            key={slug}
            slug={slug}
            hotelSlug={hotelSlug}
            signalData={overviewSignals[slug] || { count: 0, latestAt: null, reasons: [] }}
            liveCount={liveCounts[slug]}
          />
        ))}
      </Row>
    </Container>
  );
}

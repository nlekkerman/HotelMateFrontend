import React, { useState, useEffect } from 'react';
import api from '@/services/api';

/**
 * Read-only visualization of a staff member's navigation access.
 * Fetches all hotel nav items + staff permissions and renders
 * a disabled-checkbox list showing which modules are allowed.
 */
const NavigationPermissionManager = ({ staffId, hotelSlug }) => {
  const [navItems, setNavItems] = useState([]);
  const [allowedNavs, setAllowedNavs] = useState([]);
  const [accessLevel, setAccessLevel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [navError, setNavError] = useState(null);
  const [permError, setPermError] = useState(null);

  useEffect(() => {
    if (!staffId || !hotelSlug) return;

    let cancelled = false;

    const fetchData = async () => {
      setLoading(true);
      setNavError(null);
      setPermError(null);

      // Fetch both in parallel
      const [navResult, permResult] = await Promise.allSettled([
        api.get(`/staff/navigation-items/?hotel_slug=${encodeURIComponent(hotelSlug)}&is_active=true`),
        api.get(`/staff/${staffId}/permissions/`),
      ]);

      if (cancelled) return;

      // Nav items
      if (navResult.status === 'fulfilled') {
        const items = Array.isArray(navResult.value.data) ? navResult.value.data : [];
        setNavItems(items);
      } else {
        console.error('Failed to fetch navigation items:', navResult.reason);
        setNavError('Failed to load navigation items');
      }

      // Permissions
      if (permResult.status === 'fulfilled') {
        const data = permResult.value.data;
        setAllowedNavs(Array.isArray(data.allowed_navs) ? data.allowed_navs : []);
        setAccessLevel(data.access_level || null);
      } else {
        console.error('Failed to fetch staff permissions:', permResult.reason);
        setPermError('Failed to load staff permissions');
      }

      setLoading(false);
    };

    fetchData();

    return () => { cancelled = true; };
  }, [staffId, hotelSlug]);

  // --- Loading ---
  if (loading) {
    return (
      <div className="text-center p-4">
        <div className="spinner-border spinner-border-sm text-primary me-2" role="status" />
        <span className="text-muted">Loading navigation access…</span>
      </div>
    );
  }

  // --- Errors ---
  if (navError) {
    return <div className="alert alert-danger"><i className="bi bi-exclamation-triangle me-2"></i>{navError}</div>;
  }
  if (permError) {
    return <div className="alert alert-danger"><i className="bi bi-exclamation-triangle me-2"></i>{permError}</div>;
  }

  // --- Empty ---
  if (navItems.length === 0) {
    return (
      <div className="alert alert-info">
        <i className="bi bi-info-circle me-2"></i>
        No navigation items configured for this hotel.
      </div>
    );
  }

  const allowedCount = navItems.filter(item => allowedNavs.includes(item.slug)).length;

  return (
    <div className="card shadow-sm">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">
          <i className="bi bi-shield-lock me-2"></i>
          Navigation Access
        </h5>
        <span className="badge bg-primary">
          {allowedCount} / {navItems.length} modules
        </span>
      </div>
      <div className="card-body p-0">
        {accessLevel && (
          <div className="px-3 pt-3">
            <small className="text-muted">
              Access level: <span className="badge bg-secondary">{accessLevel.replace(/_/g, ' ')}</span>
            </small>
          </div>
        )}
        <ul className="list-group list-group-flush">
          {navItems.map(item => {
            const isAllowed = allowedNavs.includes(item.slug);
            return (
              <li key={item.id} className="list-group-item">
                <div className="d-flex align-items-center">
                  <div className="form-check me-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      checked={isAllowed}
                      disabled
                      readOnly
                      id={`nav-access-${item.id}`}
                    />
                  </div>
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center">
                      {item.icon && <i className={`bi bi-${item.icon} me-2 fs-5`}></i>}
                      <strong>{item.name}</strong>
                    </div>
                    <small className="text-muted">{item.slug}</small>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default NavigationPermissionManager;

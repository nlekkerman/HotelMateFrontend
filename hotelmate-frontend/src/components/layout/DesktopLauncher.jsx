// src/components/layout/DesktopLauncher.jsx
// Compact desktop-only navigation launcher for staff area.
// Closed: small fixed pill at top-left. Open: popover panel with RBAC-filtered items.
// Does NOT render on mobile — NavbarWrapper handles display switching.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useDesktopNav } from '@/hooks/useDesktopNav';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import './DesktopLauncher.css';

export default function DesktopLauncher() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const triggerRef = useRef(null);
  const location = useLocation();
  const { items } = useDesktopNav();
  const { mainColor } = useTheme();
  const { user, logout } = useAuth();

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e) {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        triggerRef.current && !triggerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  // Close on navigation
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const toggle = useCallback(() => setOpen((v) => !v), []);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    // Strip query params from path for comparison
    const cleanPath = path.split('?')[0];
    return location.pathname.startsWith(cleanPath);
  };

  const accentColor = mainColor || '#0d6efd';

  return (
    <div className="desktop-launcher-root d-none d-lg-block">
      {/* Trigger pill */}
      <button
        ref={triggerRef}
        className={`desktop-launcher-trigger ${open ? 'open' : ''}`}
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Open navigation"
        style={{ '--dl-accent': accentColor }}
      >
        <i className={`bi ${open ? 'bi-x-lg' : 'bi-grid-3x3-gap'}`} />
        <span className="dl-trigger-label">Menu</span>
      </button>

      {/* Panel */}
      {open && (
        <nav
          ref={panelRef}
          className="desktop-launcher-panel"
          role="navigation"
          aria-label="Staff navigation"
          style={{ '--dl-accent': accentColor }}
        >
          {/* User brief */}
          {user && (
            <div className="dl-user-brief">
              <span className="dl-user-name">{user.username || 'Staff'}</span>
              <button
                className="dl-logout-btn"
                onClick={() => { setOpen(false); logout(); }}
                title="Logout"
              >
                <i className="bi bi-box-arrow-right" />
              </button>
            </div>
          )}

          <div className="dl-divider" />

          {/* Nav items */}
          <ul className="dl-items">
            {items.map((item) => (
              <li key={item.slug}>
                <Link
                  to={item.path}
                  className={`dl-item ${isActive(item.path) ? 'active' : ''}`}
                  title={item.name}
                >
                  <i className={item.icon} />
                  <span className="dl-item-label">{item.name}</span>
                </Link>
              </li>
            ))}
          </ul>

          {items.length === 0 && (
            <p className="dl-empty">No modules available.</p>
          )}
        </nav>
      )}
    </div>
  );
}

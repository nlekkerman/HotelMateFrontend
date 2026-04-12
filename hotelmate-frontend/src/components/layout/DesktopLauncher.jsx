// src/components/layout/DesktopLauncher.jsx
// Desktop-only horizontal dock launcher for staff area.
// Closed: small tab/bookmark at top-center. Open: wide horizontal dashboard bar.
// Does NOT render on mobile.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDesktopNav } from '@/hooks/useDesktopNav';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import './DesktopLauncher.css';

export default function DesktopLauncher() {
  const [open, setOpen] = useState(false);
  const barRef = useRef(null);
  const tabRef = useRef(null);
  const location = useLocation();
  const { items } = useDesktopNav();
  const { mainColor } = useTheme();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const hotelIdentifier = user?.hotel_slug;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onClickOutside(e) {
      if (
        barRef.current && !barRef.current.contains(e.target) &&
        tabRef.current && !tabRef.current.contains(e.target)
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
    const cleanPath = path.split('?')[0];
    return location.pathname.startsWith(cleanPath);
  };

  const accentColor = mainColor || '#0d6efd';

  return (
    <div className="desktop-launcher-root d-none d-lg-block">
      {/* Collapsed tab — like a folder bookmark */}
      <button
        ref={tabRef}
        className={`dl-tab ${open ? 'dl-tab--open' : ''}`}
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={open ? 'Close navigation' : 'Open navigation'}
        style={{ '--dl-accent': accentColor }}
      >
        <i className={`bi ${open ? 'bi-chevron-up' : 'bi-grid-3x3-gap-fill'}`} />
      </button>

      {/* Expanded horizontal dock */}
      {open && (
        <nav
          ref={barRef}
          className="dl-dock"
          role="navigation"
          aria-label="Staff navigation"
          style={{ '--dl-accent': accentColor }}
        >
          {/* Nav items — horizontal row */}
          <div className="dl-dock-items">
            {items.map((item) => (
              <Link
                key={item.slug}
                to={item.path}
                className={`dl-dock-item ${isActive(item.path) ? 'dl-dock-item--active' : ''}`}
                title={item.name}
              >
                <i className={item.icon} />
                <span className="dl-dock-label">{item.name}</span>
              </Link>
            ))}

            {/* Clock In */}
            {user && hotelIdentifier && (
              <button
                className="dl-dock-item"
                onClick={() => { setOpen(false); navigate(`/face/${hotelIdentifier}/clock-in`); }}
                title="Clock In"
              >
                <i className="bi bi-clock" />
                <span className="dl-dock-label">Clock</span>
              </button>
            )}

            {/* Public Page */}
            {hotelIdentifier && (
              <Link
                className={`dl-dock-item ${isActive(`/hotel/${hotelIdentifier}`) ? 'dl-dock-item--active' : ''}`}
                to={`/hotel/${hotelIdentifier}`}
                title="Public Page"
              >
                <i className="bi bi-globe" />
                <span className="dl-dock-label">Public Page</span>
              </Link>
            )}

            {/* Super User */}
            {user?.is_superuser && (
              <button
                className={`dl-dock-item ${isActive('/super-user') ? 'dl-dock-item--active' : ''}`}
                onClick={() => { setOpen(false); navigate('/super-user'); }}
                title="Super User Admin Panel"
              >
                <i className="bi bi-shield-lock" />
                <span className="dl-dock-label">Super User</span>
              </button>
            )}

            {/* Logout */}
            {user && (
              <button
                className="dl-dock-item dl-dock-item--logout"
                onClick={() => { setOpen(false); logout(); }}
                title="Logout"
              >
                <i className="bi bi-box-arrow-right" />
                <span className="dl-dock-label">Logout</span>
              </button>
            )}
          </div>

          {items.length === 0 && (
            <p className="dl-empty">No modules available.</p>
          )}
        </nav>
      )}
    </div>
  );
}

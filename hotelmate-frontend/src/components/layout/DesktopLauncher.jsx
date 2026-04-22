// src/components/layout/DesktopLauncher.jsx
// Desktop-only full-width launcher panel for staff area.
// Closed: small tab/bookmark at top-right. Open: full-width panel with staggered tiles.
// Does NOT render on mobile. RBAC logic lives in useDesktopNav — untouched here.
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDesktopNav } from '@/hooks/useDesktopNav';
import { useTheme } from '@/context/ThemeContext';
import { useAuth } from '@/context/AuthContext';
import { getLucideIcon } from '@/config/navIconMap';
import { ChevronUp, LayoutGrid, Clock, Globe, ShieldCheck, LogOut, X, UserCircle } from 'lucide-react';
import './DesktopLauncher.css';

// Respect prefers-reduced-motion
const prefersReducedMotion =
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Panel animation — enters from right (softened, slower roll in/out)
const panelVariants = prefersReducedMotion
  ? { hidden: { opacity: 0 }, visible: { opacity: 1 }, exit: { opacity: 0 } }
  : {
      hidden: { opacity: 0, x: '30%' },
      visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
      exit: { opacity: 0, x: '20%', transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] } },
    };

// Container for staggered children
const gridVariants = prefersReducedMotion
  ? { visible: {} }
  : {
      visible: {
        transition: { staggerChildren: 0.05, delayChildren: 0.18 },
      },
    };

// Individual tile animation
const tileVariants = prefersReducedMotion
  ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
  : {
      hidden: { opacity: 0, y: 12 },
      visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] },
      },
    };

function LauncherTile({ to, onClick, slug, label, active, variant, children }) {
  const IconComponent = getLucideIcon(slug);
  const inner = (
    <>
      <span className="dl-tile-content">
        <span className="dl-tile-icon">
          {children || <IconComponent size={22} strokeWidth={1.8} />}
        </span>
        <span className="dl-tile-label">{label}</span>
      </span>
      {active && <span className="dl-tile-active-dot" />}
    </>
  );

  const classes = [
    'dl-tile',
    active && 'dl-tile--active',
    variant && `dl-tile--${variant}`,
  ].filter(Boolean).join(' ');

  const motionProps = {
    variants: tileVariants,
    whileHover: prefersReducedMotion ? {} : { y: -3, scale: 1.04 },
    whileTap: prefersReducedMotion ? {} : { scale: 0.97 },
  };

  if (to) {
    return (
      <motion.div {...motionProps}>
        <Link to={to} className={classes} title={label}>
          {inner}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div {...motionProps}>
      <button type="button" className={classes} onClick={onClick} title={label}>
        {inner}
      </button>
    </motion.div>
  );
}

export default function DesktopLauncher() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
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
        panelRef.current && !panelRef.current.contains(e.target) &&
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
    <div className="desktop-launcher-root d-none d-lg-block" style={{ '--dl-accent': accentColor }}>
      {/* Collapsed tab — top-right bookmark */}
      <button
        ref={tabRef}
        className={`dl-tab ${open ? 'dl-tab--open' : ''}`}
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={open ? 'Close launcher' : 'Open launcher'}
      >
        {open
          ? <ChevronUp size={16} strokeWidth={2.2} />
          : <span className="dl-tab-label">Menu</span>
        }
      </button>

      {/* Full-width launcher panel */}
      <AnimatePresence>
        {open && (
          <motion.nav
            ref={panelRef}
            className="dl-panel"
            role="navigation"
            aria-label="Staff navigation"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div className="dl-panel-inner">
              {/* Close button */}
              <button
                type="button"
                className="dl-close"
                onClick={() => setOpen(false)}
                aria-label="Close launcher"
              >
                <X size={18} strokeWidth={2} />
              </button>

              {/* Module tiles grid */}
              <motion.div
                className="dl-grid"
                variants={gridVariants}
                initial="hidden"
                animate="visible"
              >
                {items.map((item) => (
                  <LauncherTile
                    key={item.slug}
                    to={item.path}
                    slug={item.slug}
                    label={item.name}
                    active={isActive(item.path)}
                  />
                ))}

                {/* Clock In */}
                {user && hotelIdentifier && (
                  <LauncherTile
                    slug="clock_in"
                    label="Clock In"
                    onClick={() => { setOpen(false); navigate(`/face/${hotelIdentifier}/clock-in`); }}
                  >
                    <Clock size={22} strokeWidth={1.8} />
                  </LauncherTile>
                )}

                {/* My Profile */}
                {user && hotelIdentifier && (
                  <LauncherTile
                    to={`/${hotelIdentifier}/staff/me`}
                    slug="profile"
                    label="My Profile"
                    active={isActive(`/${hotelIdentifier}/staff/me`)}
                  >
                    <UserCircle size={22} strokeWidth={1.8} />
                  </LauncherTile>
                )}

                {/* Public Page */}
                {hotelIdentifier && (
                  <LauncherTile
                    to={`/hotel/${hotelIdentifier}`}
                    slug="public_page"
                    label="Public Page"
                    active={isActive(`/hotel/${hotelIdentifier}`)}
                  >
                    <Globe size={22} strokeWidth={1.8} />
                  </LauncherTile>
                )}

                {/* Super User */}
                {user?.is_superuser && (
                  <LauncherTile
                    slug="super_user"
                    label="Super User"
                    active={isActive('/super-user')}
                    onClick={() => { setOpen(false); navigate('/super-user'); }}
                  >
                    <ShieldCheck size={22} strokeWidth={1.8} />
                  </LauncherTile>
                )}

                {/* Logout */}
                {user && (
                  <LauncherTile
                    slug="logout"
                    label="Logout"
                    variant="logout"
                    onClick={() => { setOpen(false); logout(); }}
                  >
                    <LogOut size={22} strokeWidth={1.8} />
                  </LauncherTile>
                )}
              </motion.div>

              {items.length === 0 && (
                <p className="dl-empty">No modules available.</p>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </div>
  );
}

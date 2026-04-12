// src/config/navIconMap.js
// Canonical icon mapping for navigation slugs.
// Uses Bootstrap Icons (bi-*). All keys are canonical RBAC slugs.

const NAV_ICON_MAP = {
  overview:             'bi bi-grid-1x2',
  home:                 'bi bi-house',
  chat:                 'bi bi-chat-dots',
  rooms:                'bi bi-door-closed',
  room_bookings:        'bi bi-calendar-check',
  restaurant_bookings:  'bi bi-calendar2-event',
  room_services:        'bi bi-box',
  housekeeping:         'bi bi-house-gear',
  attendance:           'bi bi-clock-history',
  hotel_info:           'bi bi-info-circle',
  admin_settings:       'bi bi-gear',
  staff_management:     'bi bi-person-badge',
  stock_tracker:        'bi bi-graph-up',
  maintenance:          'bi bi-tools',
  entertainment:        'bi bi-controller',
};

const FALLBACK_ICON = 'bi bi-circle';

/**
 * Get the Bootstrap Icon class for a navigation slug.
 * @param {string} slug - Canonical nav slug
 * @returns {string} Full icon class string (e.g. "bi bi-house")
 */
export function getNavIcon(slug) {
  return NAV_ICON_MAP[slug] || FALLBACK_ICON;
}

export default NAV_ICON_MAP;

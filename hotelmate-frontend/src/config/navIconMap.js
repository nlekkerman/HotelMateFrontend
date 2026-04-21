// src/config/navIconMap.js
// Canonical icon mapping for navigation slugs.
// Dual system: Lucide React components for desktop launcher,
// Bootstrap Icon classes for legacy/mobile usage.
import {
  LayoutGrid,
  Home,
  MessageCircle,
  DoorOpen,
  CalendarCheck,
  UtensilsCrossed,
  ConciergeBell,
  Sparkles,
  Clock,
  Info,
  Settings,
  UserCog,
  Wrench,
  ShieldCheck,
  Globe,
  LogOut,
  Circle,
} from 'lucide-react';

// ── Lucide component map (used by desktop launcher) ──────────────
const LUCIDE_ICON_MAP = {
  overview:             LayoutGrid,
  home:                 Home,
  chat:                 MessageCircle,
  rooms:                DoorOpen,
  room_bookings:        CalendarCheck,
  restaurant_bookings:  UtensilsCrossed,
  room_services:        ConciergeBell,
  housekeeping:         Sparkles,
  attendance:           Clock,
  hotel_info:           Info,
  admin_settings:       Settings,
  staff_management:     UserCog,
  maintenance:          Wrench,
  front_office:         DoorOpen,
  guest_relations:      MessageCircle,
  public_page:          Globe,
  super_user:           ShieldCheck,
  clock_in:             Clock,
  logout:               LogOut,
};

const LUCIDE_FALLBACK = Circle;

export function getLucideIcon(slug) {
  return LUCIDE_ICON_MAP[slug] || LUCIDE_FALLBACK;
}

// ── Bootstrap Icon class map (legacy — mobile nav, etc.) ─────────
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
  maintenance:          'bi bi-tools',
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

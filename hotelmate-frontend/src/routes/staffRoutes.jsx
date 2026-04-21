import React from 'react';
import { Navigate, useParams, useLocation } from 'react-router-dom';
import Home from '@/pages/home/Home';
import Settings from '@/components/utils/Settings';
import SuperUser from '@/pages/SuperUser';
import Maintenance from '@/pages/maintenance/Maintenance';
import SectionEditorPage from '@/pages/sections/SectionEditorPage';

import Staff from '@/components/staff/Staff';
import StaffCreate from '@/components/staff/StaffCreate';
import StaffDetails from '@/components/staff/StaffDetails';
import StaffProfile from '@/components/staff/StaffProfile';

import FaceRegisterPage from '@/features/faceAttendance/pages/FaceRegisterPage';

import RestaurantManagementDashboard from '@/pages/bookings/RestaurantManagementDashboard';

import RoomDetails from '@/components/rooms/RoomDetails';
import MenusManagement from '@/components/menus/MenusManagement';

import GuestList from '@/components/guests/GuestList';
import GuestEdit from '@/components/guests/GuestEdit';
import AssignGuestForm from '@/components/guests/AssignGuestForm';

import { HousekeepingRooms } from '@/pages/housekeeping';
import HousekeepingRoomDetails from '@/pages/housekeeping/components/HousekeepingRoomDetails';

import HotelInfo from '@/pages/hotel_info/HotelInfo';

import OverviewPage from '@/pages/staff/OverviewPage';

// Canonical module hub pages (tabbed entries)
import AttendanceHub from '@/pages/staff/AttendanceHub';
import RoomBookingsHub from '@/pages/staff/RoomBookingsHub';
import RoomServicesHub from '@/pages/staff/RoomServicesHub';
import RoomsHub from '@/pages/staff/RoomsHub';

import { useAuth } from '@/context/AuthContext';

/**
 * Staff route configs — all require authentication.
 *
 * Consolidation notes (cleanup pass):
 *  - Attendance: single canonical entry at /attendance/:hotelSlug with ?tab=…
 *  - Room Bookings: single canonical entry at /staff/hotel/:hotelSlug/room-bookings with ?tab=…
 *  - Room Services: single canonical entry at /room_services/:hotelSlug with ?tab=…
 *  - Rooms: single canonical entry at /staff/hotel/:hotelSlug/rooms with ?tab=…
 * Legacy paths are kept as redirects to preserve deep links.
 */

// ----- small redirect helpers -----
const RedirectWithTab = ({ to, tab }) => {
  const params = useParams();
  const loc = useLocation();
  const base = typeof to === 'function' ? to(params) : to;
  const search = new URLSearchParams(loc.search);
  if (tab) search.set('tab', tab);
  const qs = search.toString();
  return <Navigate to={qs ? `${base}?${qs}` : base} replace />;
};

const RedirectToRoomBookings = () => {
  const { user } = useAuth();
  const slug = user?.hotel_slug;
  if (!slug) return <Navigate to="/login" replace />;
  return <Navigate to={`/staff/hotel/${slug}/room-bookings`} replace />;
};

const RedirectToRoomsHub = () => {
  const { user } = useAuth();
  const slug = user?.hotel_slug;
  if (!slug) return <Navigate to="/login" replace />;
  return <Navigate to={`/staff/hotel/${slug}/rooms`} replace />;
};

const RedirectToHousekeeping = () => {
  const { user } = useAuth();
  const slug = user?.hotel_slug;
  if (!slug) return <Navigate to="/login" replace />;
  return <Navigate to={`/staff/hotel/${slug}/housekeeping`} replace />;
};

// Generic canonical redirect — builds the canonical URL from the user's hotel slug.
// Used as a safety net for stale / malformed backend nav payloads that emit bare slugs
// like `/housekeeping` or `/settings` instead of the canonical `/staff/hotel/<slug>/...`.
const RedirectToCanonical = ({ build }) => {
  const { user } = useAuth();
  const slug = user?.hotel_slug;
  if (!slug) return <Navigate to="/login" replace />;
  return <Navigate to={build(slug)} replace />;
};

const staffRoutes = [
  // Staff dashboard / feed (synthetic, auth-only)
  { path: '/staff/:hotelSlug/feed', element: <Home />, protected: true },
  // Operations overview — auth-only (RBAC filtering handled inside the page)
  { path: '/staff/:hotelSlug/overview', element: <OverviewPage />, protected: true },
  { path: '/staff/:hotelSlug/section-editor', element: <SectionEditorPage />, protected: true, mode: 'staff', requiredSlug: 'admin_settings' },

  // Settings
  { path: '/staff/:hotelSlug/settings', element: <Settings />, protected: true, mode: 'staff', requiredSlug: 'admin_settings' },

  // Super User (synthetic)
  { path: '/super-user', element: <SuperUser />, protected: true, mode: 'staff' },

  // Maintenance
  { path: '/maintenance', element: <Maintenance />, protected: true, mode: 'staff', requiredSlug: 'maintenance' },

  // Staff management
  { path: '/:hotelSlug/staff', element: <Staff />, protected: true, mode: 'staff', requiredSlug: 'staff_management' },
  { path: '/:hotelSlug/staff/create', element: <StaffCreate />, protected: true, mode: 'staff', requiredSlug: 'staff_management' },
  { path: '/:hotelSlug/staff/:id', element: <StaffDetails />, protected: true, mode: 'staff', requiredSlug: 'staff_management' },
  // Own profile — auth-only, every staff member can view their own profile
  { path: '/:hotelSlug/staff/me', element: <StaffProfile />, protected: true },

  // ---------------- Attendance (canonical + redirects) ----------------
  { path: '/attendance/:hotelSlug', element: <AttendanceHub />, protected: true, mode: 'staff', requiredSlug: 'attendance' },
  { path: '/roster/:hotelSlug', element: <RedirectWithTab to={(p) => `/attendance/${p.hotelSlug}`} />, protected: true, mode: 'staff', requiredSlug: 'attendance' },
  { path: '/department-roster/:hotelSlug', element: <RedirectWithTab to={(p) => `/attendance/${p.hotelSlug}`} tab="department-roster" />, protected: true, mode: 'staff', requiredSlug: 'attendance' },
  { path: '/enhanced-attendance/:hotelSlug', element: <RedirectWithTab to={(p) => `/attendance/${p.hotelSlug}`} tab="enhanced" />, protected: true, mode: 'staff', requiredSlug: 'attendance' },

  // Face attendance registration — internal attendance setup page
  { path: '/attendance/:hotelSlug/face-register', element: <FaceRegisterPage />, protected: true, mode: 'staff', requiredSlug: 'attendance' },
  { path: '/face/:hotelSlug/register', element: <RedirectWithTab to={(p) => `/attendance/${p.hotelSlug}/face-register`} />, protected: true, mode: 'staff', requiredSlug: 'attendance' },

  // ---------------- Restaurant Bookings ----------------
  { path: '/hotel-:hotelSlug/restaurants', element: <RestaurantManagementDashboard />, protected: true, mode: 'staff', requiredSlug: 'restaurant_bookings' },
  { path: '/hotel-:hotelSlug/restaurants/:restaurantSlug', element: <RestaurantManagementDashboard />, protected: true, mode: 'staff', requiredSlug: 'restaurant_bookings' },

  // ---------------- Rooms (canonical + redirects) ----------------
  { path: '/staff/hotel/:hotelSlug/rooms', element: <RoomsHub />, protected: true, mode: 'staff', requiredSlug: 'rooms' },
  // Room detail deep link (internal to the rooms family)
  { path: '/staff/hotel/:hotelSlug/rooms/:roomNumber', element: <RoomDetails />, protected: true, mode: 'staff', requiredSlug: 'rooms' },
  { path: '/staff/hotel/:hotelSlug/rooms/:roomNumber/add-guest', element: <AssignGuestForm />, protected: true, mode: 'staff', requiredSlug: 'rooms' },
  // Legacy paths → redirect to canonical rooms hub (or its internal detail route)
  { path: '/rooms', element: <RedirectToRoomsHub />, protected: true, mode: 'staff', requiredSlug: 'rooms' },
  { path: '/room-management/:hotelIdentifier/room/:roomNumber', element: <RoomDetails />, protected: true, mode: 'staff', requiredSlug: 'rooms' },
  { path: '/rooms/:roomNumber/add-guest', element: <AssignGuestForm />, protected: true, mode: 'staff', requiredSlug: 'rooms' },
  { path: '/staff/hotel/:hotelSlug/room-management', element: <RedirectWithTab to={(p) => `/staff/hotel/${p.hotelSlug}/rooms`} tab="management" />, protected: true, mode: 'staff', requiredSlug: 'rooms' },

  // ---------------- Room Services (canonical + redirects) ----------------
  { path: '/room_services/:hotelSlug', element: <RoomServicesHub />, protected: true, mode: 'staff', requiredSlug: 'room_services' },
  { path: '/room_services/:hotelSlug/orders', element: <RedirectWithTab to={(p) => `/room_services/${p.hotelSlug}`} />, protected: true, mode: 'staff', requiredSlug: 'room_services' },
  { path: '/room_services/:hotelSlug/orders-management', element: <RedirectWithTab to={(p) => `/room_services/${p.hotelSlug}`} tab="management" />, protected: true, mode: 'staff', requiredSlug: 'room_services' },
  { path: '/room_services/:hotelSlug/orders-summary', element: <RedirectWithTab to={(p) => `/room_services/${p.hotelSlug}`} tab="summary" />, protected: true, mode: 'staff', requiredSlug: 'room_services' },
  { path: '/room_services/:hotelSlug/breakfast-orders', element: <RedirectWithTab to={(p) => `/room_services/${p.hotelSlug}`} tab="breakfast" />, protected: true, mode: 'staff', requiredSlug: 'room_services' },
  // Menus authoring is a distinct surface — keep as sibling under room_services permission.
  { path: '/menus_management/:hotelSlug', element: <MenusManagement />, protected: true, mode: 'staff', requiredSlug: 'room_services' },

  // ---------------- Guests (part of Rooms module) ----------------
  { path: '/:hotelIdentifier/guests', element: <GuestList />, protected: true, mode: 'staff', requiredSlug: 'rooms' },
  { path: '/:hotelIdentifier/guests/:guestId/edit', element: <GuestEdit />, protected: true, mode: 'staff', requiredSlug: 'rooms' },

  // ---------------- Room Bookings (canonical + redirects) ----------------
  { path: '/staff/hotel/:hotelSlug/room-bookings', element: <RoomBookingsHub />, protected: true, mode: 'staff', requiredSlug: 'room_bookings' },
  { path: '/staff/hotel/:hotelSlug/booking-management', element: <RedirectWithTab to={(p) => `/staff/hotel/${p.hotelSlug}/room-bookings`} tab="settings" />, protected: true, mode: 'staff', requiredSlug: 'room_bookings' },
  { path: '/bookings', element: <RedirectToRoomBookings />, protected: true, mode: 'staff', requiredSlug: 'room_bookings' },

  // ---------------- Housekeeping ----------------
  { path: '/staff/hotel/:hotelSlug/housekeeping', element: <HousekeepingRooms />, protected: true, mode: 'staff', requiredSlug: 'housekeeping' },
  { path: '/staff/hotel/:hotelSlug/housekeeping/rooms/:roomNumber', element: <HousekeepingRoomDetails />, protected: true, mode: 'staff', requiredSlug: 'housekeeping' },
  // Legacy / malformed nav payload fallback → redirect to canonical housekeeping hub
  { path: '/housekeeping', element: <RedirectToHousekeeping />, protected: true, mode: 'staff', requiredSlug: 'housekeeping' },

  // ---------------- Hotel Info ----------------
  { path: '/hotel_info/:hotel_slug', element: <HotelInfo />, protected: true, mode: 'staff', requiredSlug: 'hotel_info' },
  { path: '/hotel_info/:hotel_slug/:category', element: <HotelInfo />, protected: true, mode: 'staff', requiredSlug: 'hotel_info' },

  // ---------------- Chat ----------------
  { path: '/hotel/:hotelSlug/chat', element: 'CHAT_HOME_PAGE', protected: true, mode: 'staff', requiredSlug: 'chat' },
];

export default staffRoutes;

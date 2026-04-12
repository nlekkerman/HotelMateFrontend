import React from 'react';
import { Navigate } from 'react-router-dom';
import Home from '@/pages/home/Home';
import Reception from '@/components/Reception';
import Settings from '@/components/utils/Settings';
import SuperUser from '@/pages/SuperUser';
import Maintenance from '@/pages/maintenance/Maintenance';
import SectionEditorPage from '@/pages/sections/SectionEditorPage';

import Staff from '@/components/staff/Staff';
import StaffCreate from '@/components/staff/StaffCreate';
import StaffDetails from '@/components/staff/StaffDetails';
import StaffProfile from '@/components/staff/StaffProfile';

import AttendanceDashboard from '@/features/attendance/pages/AttendanceDashboard';
import DepartmentRosterDashboard from '@/features/attendance/pages/DepartmentRosterDashboard';
import EnhancedAttendanceDashboard from '@/features/attendance/components/EnhancedAttendanceDashboard';
import FaceRegisterPage from '@/features/faceAttendance/pages/FaceRegisterPage';

import RestaurantManagementDashboard from '@/pages/bookings/RestaurantManagementDashboard';
import BookingManagementPage from '@/pages/staff/BookingManagementPage';
import BookingManagementDashboard from '@/components/bookings/BookingManagementDashboard';

import RoomList from '@/components/rooms/RoomList';
import RoomDetails from '@/components/rooms/RoomDetails';
import RoomManagementPage from '@/pages/staff/RoomManagementPage';
import RoomServiceOrders from '@/components/room_service/RoomServiceOrders';
import OrdersSummary from '@/components/room_service/OrdersSummary';
import RoomServiceOrdersManagement from '@/components/room_service/RoomServiceOrdersManagement';
import BreakfastRoomService from '@/components/room_service/BreakfastRoomService';
import MenusManagement from '@/components/menus/MenusManagement';

import GuestList from '@/components/guests/GuestList';
import GuestEdit from '@/components/guests/GuestEdit';
import AssignGuestForm from '@/components/guests/AssignGuestForm';

import Bookings from '@/components/bookings/Bookings';

import { HousekeepingRooms } from '@/pages/housekeeping';
import HousekeepingRoomDetails from '@/pages/housekeeping/components/HousekeepingRoomDetails';

import HotelInfo from '@/pages/hotel_info/HotelInfo';
import GoodToKnowConsole from '@/components/hotel_info/GoodToKnowConsole';

import StockDashboard from '@/pages/stock_tracker/StockDashboard';
import Analytics from '@/pages/stock_tracker/Analytics';
import StockOperations from '@/pages/stock_tracker/StockOperations';
import StockItemsResponsive from '@/components/stock_tracker/stock_items/StockItemsResponsive';
import StockItemProfitability from '@/components/stock_tracker/stock_items/StockItemProfitability';
import { MovementsList } from '@/components/stock_tracker/movements/MovementsList';
import { StocktakesList } from '@/components/stock_tracker/stocktakes/StocktakesList';
import { StocktakeDetail } from '@/components/stock_tracker/stocktakes/StocktakeDetail';
import { PeriodSnapshots } from '@/components/stock_tracker/periods/PeriodSnapshots';
import { PeriodSnapshotDetail } from '@/components/stock_tracker/periods/PeriodSnapshotDetail';
import { PeriodsComparison } from '@/components/stock_tracker/periods/PeriodsComparison';
import { CocktailsPage } from '@/pages/stock_tracker/CocktailsPage';
import SalesReport from '@/pages/stock_tracker/SalesReport';
import SalesEntry from '@/pages/stock_tracker/SalesEntry';
import SalesListView from '@/pages/stock_tracker/SalesListView';

import ChatHomePage from '@/pages/chat/ChatHomePage';
import OverviewPage from '@/pages/staff/OverviewPage';

/**
 * Staff route configs — all require authentication.
 *
 * `protected: true` = wrapped with ProtectedRoute.
 * `mode: "staff"` = Layer 2 permission check via staffAccessPolicy.
 * `requiredSlug` = overrides auto-mapping when provided.
 *
 * Routes without `mode: "staff"` get auth-only protection (Layer 1).
 * Auth-only routes: feed (all staff need it), own profile (self-service).
 */

const staffRoutes = [
  // Staff dashboard / feed
  { path: '/staff/:hotelSlug/feed', element: <Home />, protected: true },
  // Operations overview — auth-only (RBAC filtering handled inside the page)
  { path: '/staff/:hotelSlug/overview', element: <OverviewPage />, protected: true },
  { path: '/staff/:hotelSlug/section-editor', element: <SectionEditorPage />, protected: true, mode: 'staff', requiredSlug: 'admin_settings' },

  // Reception
  { path: '/reception', element: <Reception />, protected: true, mode: 'staff', requiredSlug: 'rooms' },

  // Settings
  { path: '/staff/:hotelSlug/settings', element: <Settings />, protected: true, mode: 'staff', requiredSlug: 'admin_settings' },

  // Super User
  { path: '/super-user', element: <SuperUser />, protected: true, mode: 'staff' },

  // Maintenance
  { path: '/maintenance', element: <Maintenance />, protected: true, mode: 'staff', requiredSlug: 'maintenance' },

  // Staff management
  { path: '/:hotelSlug/staff', element: <Staff />, protected: true, mode: 'staff', requiredSlug: 'staff_management' },
  { path: '/:hotelSlug/staff/create', element: <StaffCreate />, protected: true, mode: 'staff', requiredSlug: 'staff_management' },
  { path: '/:hotelSlug/staff/:id', element: <StaffDetails />, protected: true, mode: 'staff', requiredSlug: 'staff_management' },
  // Own profile — auth-only, every staff member can view their own profile
  { path: '/:hotelSlug/staff/me', element: <StaffProfile />, protected: true },

  // Attendance
  { path: '/attendance/:hotelSlug', element: <AttendanceDashboard />, protected: true, mode: 'staff', requiredSlug: 'attendance' },
  { path: '/roster/:hotelSlug', element: <AttendanceDashboard />, protected: true, mode: 'staff', requiredSlug: 'attendance' },
  { path: '/department-roster/:hotelSlug', element: <DepartmentRosterDashboard />, protected: true, mode: 'staff', requiredSlug: 'attendance' },
  { path: '/enhanced-attendance/:hotelSlug', element: <EnhancedAttendanceDashboard />, protected: true, mode: 'staff', requiredSlug: 'attendance' },

  // Face attendance registration — staff-only setup, requires attendance permission
  { path: '/face/:hotelSlug/register', element: <FaceRegisterPage />, protected: true, mode: 'staff', requiredSlug: 'attendance' },

  // Restaurant management
  { path: '/hotel-:hotelSlug/restaurants', element: <RestaurantManagementDashboard />, protected: true, mode: 'staff', requiredSlug: 'room_services' },
  { path: '/:hotelSlug/:restaurantSlug', element: <RestaurantManagementDashboard />, protected: true, mode: 'staff', requiredSlug: 'room_services' },

  // Rooms
  { path: '/rooms', element: <RoomList />, protected: true, mode: 'staff', requiredSlug: 'rooms' },
  { path: '/room-management/:hotelIdentifier/room/:roomNumber', element: <RoomDetails />, protected: true, mode: 'staff', requiredSlug: 'rooms' },
  { path: '/rooms/:roomNumber/add-guest', element: <AssignGuestForm />, protected: true, mode: 'staff', requiredSlug: 'rooms' },

  // Room inventory management (canonical CRUD page)
  { path: '/staff/hotel/:hotelSlug/room-management', element: <RoomManagementPage />, protected: true, mode: 'staff', requiredSlug: 'rooms' },

  // Room services (staff management views)
  { path: '/room_services/:hotelIdentifier/orders', element: <RoomServiceOrders />, protected: true, mode: 'staff', requiredSlug: 'room_services' },
  { path: '/room_services/:hotelIdentifier/orders-summary', element: <OrdersSummary />, protected: true, mode: 'staff', requiredSlug: 'room_services' },
  { path: '/room_services/:hotelIdentifier/orders-management', element: <RoomServiceOrdersManagement />, protected: true, mode: 'staff', requiredSlug: 'room_services' },
  { path: '/room_services/:hotelIdentifier/breakfast-orders', element: <BreakfastRoomService />, protected: true, mode: 'staff', requiredSlug: 'room_services' },
  { path: '/menus_management/:hotelSlug', element: <MenusManagement />, protected: true, mode: 'staff', requiredSlug: 'room_services' },

  // Guests
  { path: '/:hotelIdentifier/guests', element: <GuestList />, protected: true, mode: 'staff', requiredSlug: 'rooms' },
  { path: '/:hotelIdentifier/guests/:guestId/edit', element: <GuestEdit />, protected: true, mode: 'staff', requiredSlug: 'rooms' },

  // Room Bookings (canonical RBAC slug: room_bookings)
  { path: '/bookings', element: <Bookings />, protected: true, mode: 'staff', requiredSlug: 'room_bookings' },
  { path: '/staff/hotel/:hotelSlug/room-bookings', element: <BookingManagementPage />, protected: true, mode: 'staff', requiredSlug: 'room_bookings' },
  { path: '/staff/hotel/:hotelSlug/booking-management', element: <BookingManagementDashboard />, protected: true, mode: 'staff', requiredSlug: 'room_bookings' },

  // Housekeeping
  { path: '/staff/hotel/:hotelSlug/housekeeping', element: <HousekeepingRooms />, protected: true, mode: 'staff', requiredSlug: 'housekeeping' },
  { path: '/staff/hotel/:hotelSlug/housekeeping/rooms/:roomNumber', element: <HousekeepingRoomDetails />, protected: true, mode: 'staff', requiredSlug: 'housekeeping' },

  // Hotel Info
  { path: '/hotel_info/:hotel_slug', element: <HotelInfo />, protected: true, mode: 'staff', requiredSlug: 'hotel_info' },
  { path: '/hotel_info/:hotel_slug/:category', element: <HotelInfo />, protected: true, mode: 'staff', requiredSlug: 'hotel_info' },
  { path: '/good_to_know_console/:hotel_slug', element: <GoodToKnowConsole />, protected: true, mode: 'staff', requiredSlug: 'hotel_info' },

  // Stock Tracker
  { path: '/stock_tracker/:hotel_slug', element: <StockDashboard />, protected: true, mode: 'staff', requiredSlug: 'stock_tracker' },
  { path: '/stock_tracker/:hotel_slug/analytics', element: <Analytics />, protected: true, mode: 'staff', requiredSlug: 'stock_tracker' },
  { path: '/stock_tracker/:hotel_slug/operations', element: <StockOperations />, protected: true, mode: 'staff', requiredSlug: 'stock_tracker' },
  { path: '/stock_tracker/:hotel_slug/items', element: <StockItemsResponsive />, protected: true, mode: 'staff', requiredSlug: 'stock_tracker' },
  { path: '/stock_tracker/:hotel_slug/profitability', element: <StockItemProfitability />, protected: true, mode: 'staff', requiredSlug: 'stock_tracker' },
  { path: '/stock_tracker/:hotel_slug/movements', element: <MovementsList />, protected: true, mode: 'staff', requiredSlug: 'stock_tracker' },
  { path: '/stock_tracker/:hotel_slug/stocktakes', element: <StocktakesList />, protected: true, mode: 'staff', requiredSlug: 'stock_tracker' },
  { path: '/stock_tracker/:hotel_slug/stocktakes/:id', element: <StocktakeDetail />, protected: true, mode: 'staff', requiredSlug: 'stock_tracker' },
  { path: '/stock_tracker/:hotel_slug/periods', element: <PeriodSnapshots />, protected: true, mode: 'staff', requiredSlug: 'stock_tracker' },
  { path: '/stock_tracker/:hotel_slug/periods/:id', element: <PeriodSnapshotDetail />, protected: true, mode: 'staff', requiredSlug: 'stock_tracker' },
  { path: '/stock_tracker/:hotel_slug/comparison', element: <PeriodsComparison />, protected: true, mode: 'staff', requiredSlug: 'stock_tracker' },
  { path: '/stock_tracker/:hotel_slug/sales/analysis', element: <SalesReport />, protected: true, mode: 'staff', requiredSlug: 'stock_tracker' },
  { path: '/stock_tracker/:hotel_slug/sales/list', element: <SalesListView />, protected: true, mode: 'staff', requiredSlug: 'stock_tracker' },
  { path: '/stock_tracker/:hotel_slug/sales/entry', element: <SalesEntry />, protected: true, mode: 'staff', requiredSlug: 'stock_tracker' },
  // Legacy redirects (no protection needed — they redirect to protected routes)
  { path: '/stock_tracker/:hotel_slug/sales-report', element: <Navigate to="../sales/analysis" replace /> },
  { path: '/stock_tracker/:hotel_slug/sales', element: <Navigate to="./entry" replace /> },
  { path: '/stock_tracker/:hotel_slug/cocktails', element: <CocktailsPage />, protected: true, mode: 'staff', requiredSlug: 'stock_tracker' },

  // Chat (staff view)
  { path: '/hotel/:hotelSlug/chat', element: 'CHAT_HOME_PAGE', protected: true, mode: 'staff', requiredSlug: 'chat' },
];

export default staffRoutes;

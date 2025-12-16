import React, { useState, useEffect } from "react";
import api from "@/services/api";
import { useMediaQuery } from "react-responsive";
import "@/games/whack-a-mole/styles/InterfaceStyles.css";
import "@/styles/main.css";

import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { UIProvider } from "@/context/UIContext";
import { ChatProvider } from "@/context/ChatContext";
import { StaffChatProvider } from "@/staff_chat/context/StaffChatContext";
import { BookingNotificationProvider } from "@/context/BookingNotificationContext";
import { RoomServiceNotificationProvider } from "@/context/RoomServiceNotificationContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ChartPreferencesProvider } from "@/context/ChartPreferencesContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  Navigate,
  matchPath,
} from "react-router-dom";
import MobileNavbar from "@/components/layout/MobileNavbar";
import BigScreenNavbar from "@/components/layout/BigScreenNavbar";
import NetworkHandler from "@/components/offline/NetworkHandler";
import LogoBanner from "./components/layout/LogoBanner";

import MessengerWidget from "@/staff_chat/components/MessengerWidget";

import { MessengerProvider } from "@/staff_chat/context/MessengerContext";
import RealtimeProvider from "@/realtime/RealtimeProvider";
import { AttendanceProvider } from "@/realtime/stores/attendanceStore.jsx";
import { RoomServiceProvider } from "@/realtime/stores/roomServiceStore.jsx";
import { ServiceBookingProvider } from "@/realtime/stores/serviceBookingStore.jsx";
import { GuestChatProvider } from "@/realtime/stores/guestChatStore.jsx";
import { ChatProvider as StaffChatStoreProvider } from "@/realtime/stores/chatStore.jsx";

// Pages + Components
import Home from "@/pages/home/Home";
import HotelsLandingPage from "@/pages/hotels/HotelsLandingPage";
import HotelPublicPage from "@/pages/hotels/HotelPublicPage";
import HotelPortalPage from "@/pages/HotelPortalPage";
import SectionEditorPage from "@/pages/sections/SectionEditorPage";
import SectionBasedPublicPage from "@/pages/sections/SectionBasedPublicPage";
import GuestRoomBookingPage from "@/pages/bookings/GuestRoomBookingPage";
import BookingConfirmation from "@/pages/bookings/BookingConfirmation";
import BookingPaymentSuccess from "@/pages/bookings/BookingPaymentSuccess";
import BookingPaymentCancel from "@/pages/bookings/BookingPaymentCancel";
import MyBookingsPage from "@/pages/bookings/MyBookingsPage";
import Reception from "@/components/Reception";
import Login from "@/components/auth/Login";
import Register from "@/components/auth/Register";
import RegistrationSuccess from "@/components/auth/RegistrationSuccess";
import ForgotPassword from "@/components/auth/ForgotPassword";
import ResetPassword from "@/components/auth/ResetPassword";
import Logout from "@/components/auth/Logout";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import RequirePin from "@/components/auth/RequirePin";
import RequireChatPin from "@/components/auth/RequireChatPin";
import RequireDinnerPin from "@/components/auth/RequireDinnerPin";
import DinnerPinAuth from "@/components/auth/DinnerPinAuth";
import ChatPinAuth from "@/components/auth/ChatPinAuth";
import PinAuth from "@/components/auth/PinAuth";

import RoomList from "@/components/rooms/RoomList";
import RoomDetails from "@/components/rooms/RoomDetails";
import RoomService from "@/components/rooms/RoomService";
import Breakfast from "@/components/rooms/Breakfast";
import BreakfastRoomService from "@/components/room_service/BreakfastRoomService";
import RoomServiceOrders from "@/components/room_service/RoomServiceOrders";
import OrdersSummary from "@/components/room_service/OrdersSummary";
import RoomServiceOrdersManagement from "@/components/room_service/RoomServiceOrdersManagement";

import MenusManagement from "@/components/menus/MenusManagement";

import Staff from "@/components/staff/Staff";
import StaffCreate from "@/components/staff/StaffCreate";
import StaffDetails from "@/components/staff/StaffDetails";
import StaffProfile from "@/components/staff/StaffProfile";

import GuestList from "@/components/guests/GuestList";
import GuestEdit from "@/components/guests/GuestEdit";
import AssignGuestForm from "@/components/guests/AssignGuestForm";

import DinnerBookingForm from "@/components/bookings/DinnerBookingForm";
import DinnerBookingList from "@/components/bookings/DinnerBookingList";
import Bookings from "@/components/bookings/Bookings";
import RestaurantManagementDashboard from "@/pages/bookings/RestaurantManagementDashboard";
import StaffBookingsPage from "@/pages/bookings/StaffBookingsPage";
import BookingManagementPage from "@/pages/staff/BookingManagementPage";
import Restaurant from "@/components/restaurants/Restaurant";
import HotelInfo from "@/pages/hotel_info/HotelInfo";
import GoodToKnow from "@/components/hotel_info/GoodToKnow";
import GoodToKnowConsole from "@/components/hotel_info/GoodToKnowConsole";

import StockDashboard from "@/pages/stock_tracker/StockDashboard";
import Analytics from "@/pages/stock_tracker/Analytics";
import StockOperations from "@/pages/stock_tracker/StockOperations";
import { StockItemsList } from "@/components/stock_tracker/stock_items/StockItemsList";
import StockItemsResponsive from "@/components/stock_tracker/stock_items/StockItemsResponsive";
import StockItemProfitability from "@/components/stock_tracker/stock_items/StockItemProfitability";
import { MovementsList } from "@/components/stock_tracker/movements/MovementsList";
import { StocktakesList } from "@/components/stock_tracker/stocktakes/StocktakesList";
import { StocktakeDetail } from "@/components/stock_tracker/stocktakes/StocktakeDetail";
import { PeriodSnapshots } from "@/components/stock_tracker/periods/PeriodSnapshots";
import { PeriodSnapshotDetail } from "@/components/stock_tracker/periods/PeriodSnapshotDetail";
import { PeriodsComparison } from "@/components/stock_tracker/periods/PeriodsComparison";
import { CocktailsPage } from "@/pages/stock_tracker/CocktailsPage";
import SalesReport from "@/pages/stock_tracker/SalesReport";
import SalesEntry from "@/pages/stock_tracker/SalesEntry";
import SalesListView from "@/pages/stock_tracker/SalesListView";

import Settings from "@/components/utils/Settings";
import Maintenance from "@/pages/maintenance/Maintenance";
import NoInternet from "@/components/offline/NoInternet";
import NotFound from "@/components/offline/NotFound";

import ChatHomePage from "@/pages/chat/ChatHomePage";
import ChatWindow from "@/components/chat/ChatWindow";

//Games
import GamesDashboard from "@/games/GamesDashboard";
import WhackAMolePage from "@/games/whack-a-mole/pages/GamePage";
import MemoryGame from "@/games/memory-match/pages/MemoryGame";
import MemoryMatchDashboard from "@/games/memory-match/pages/MemoryMatchDashboard";
import TournamentDashboard from "@/games/memory-match/pages/TournamentDashboard";
import TournamentWinners from "@/games/memory-match/pages/TournamentWinners";
import Leaderboard from "@/games/memory-match/pages/Leaderboard";
import PersonalStats from "@/games/memory-match/pages/PersonalStats";
import QuizStartScreen from "@/games/quiz-game/pages/QuizStartScreen";
import QuizPlayScreen from "@/games/quiz-game/pages/QuizPlayScreen";
import QuizResultsScreen from "@/games/quiz-game/pages/QuizResultsScreen";
import QuizLeaderboard from "@/games/quiz-game/pages/QuizLeaderboard";
import QuizTournaments from "@/games/quiz-game/pages/QuizTournaments";

// Attendance
import AttendanceDashboard from "@/features/attendance/pages/AttendanceDashboard";
import DepartmentRosterDashboard from "@/features/attendance/pages/DepartmentRosterDashboard";
import EnhancedAttendanceDashboard from "@/features/attendance/components/EnhancedAttendanceDashboard";

// Face Attendance
import FaceRegisterPage from "@/features/faceAttendance/pages/FaceRegisterPage";
import FaceClockInPage from "@/features/faceAttendance/pages/FaceClockInPage";

const queryClient = new QueryClient();
// Default settings for all games
const defaultAudioSettings = {
  bgMusic: true,
  effects: true,
};

// 🔓 Guest routes that don't require staff authentication (PIN-based auth instead)
const GUEST_ROUTE_PATTERNS = [
  // PIN Validation Routes
  "/:hotelIdentifier/room/:roomNumber/validate-pin",
  "/chat/:hotelSlug/messages/room/:room_number/validate-chat-pin",
  "/guest-booking/:hotelSlug/restaurant/:restaurantSlug/room/:roomNumber/validate-dinner-pin",

  // Protected Guest Routes (use RequirePin/RequireChatPin/RequireDinnerPin)
  "/room_services/:hotelIdentifier/room/:roomNumber/menu",
  "/room_services/:hotelIdentifier/room/:roomNumber/breakfast",
  "/chat/:hotelSlug/conversations/:conversationId/messages/send",
  "/chat/:hotelSlug/conversations/:conversationId/messages",
  "/guest-booking/:hotelSlug/restaurant/:restaurantSlug/room/:roomNumber",
  "/guest-booking/:hotelSlug/restaurant/:restaurantSlug",

  // Good to Know (Public)
  "/good_to_know/:hotel_slug/:slug",

  // Quiz Game (Public - Anonymous play via QR)
  "/games/quiz",
];

// Helper function to check if current path is a guest route
const isGuestRoute = (pathname) => {
  return GUEST_ROUTE_PATTERNS.some((pattern) => matchPath(pattern, pathname));
};

// 🔁 Inner layout that uses `useLocation()` safely
function AppLayout({ collapsed, setCollapsed, isMobile }) {
  const [audioSettings, setAudioSettings] = useState(defaultAudioSettings);
  const location = useLocation();
  const isAuthPage =
    location.pathname === "/login" ||
    location.pathname === "/logout" ||
    location.pathname === "/register" ||
    location.pathname === "/forgot-password" ||
    location.pathname === "/registration-success" ||
    location.pathname.startsWith("/reset-password");

  // Check if current page is a guest route (should also hide sidebar/navbar)
  const isGuestPage = isGuestRoute(location.pathname);

  // Staff routes that should ALWAYS show navigation
  const isStaffRoute =
    location.pathname.startsWith("/staff/") ||
    location.pathname === "/reception" ||
    location.pathname.startsWith("/rooms") ||
    location.pathname.startsWith("/bookings") ||
    location.pathname.startsWith("/maintenance") ||
    location.pathname.startsWith("/stock_tracker/") ||
    location.pathname.startsWith("/games") ||
    location.pathname.startsWith("/hotel_info/") ||
    location.pathname.startsWith("/good_to_know_console/");

  // Public landing pages - hide navbar/sidebar
  const isPublicLandingPage =
    !isStaffRoute &&
    (location.pathname === "/" ||
      /^\/hotel\/[a-z0-9-]+$/.test(location.pathname) || // Public hotel pages
      /^\/[a-z0-9-]+$/.test(location.pathname) ||
      /^\/[a-z0-9-]+\/book/.test(location.pathname) ||
      /^\/[a-z0-9-]+\/my-bookings/.test(location.pathname) ||
      /^\/my-bookings/.test(location.pathname) ||
      /^\/booking\/confirmation\//.test(location.pathname) ||
      /^\/booking\/payment\//.test(location.pathname) ||
      location.pathname === "/staff/login");

  // Determine if navbar/sidebar should be hidden
  const hideNavigation = isAuthPage || isGuestPage || isPublicLandingPage;

  const { user } = useAuth();

  const [selectedRoom, setSelectedRoom] = useState(null);

  const handleSelectRoom = async (roomNumber, conversationId) => {
    setSelectedRoom(roomNumber);
  };

  // Redirect home to login if not authenticated AND not on a guest route
  const HomeRedirect = () => {
    // Check if user is coming from a guest route (might have been redirected here)
    const fromGuestRoute =
      location.state?.from && isGuestRoute(location.state.from.pathname);

    if (!user && !fromGuestRoute) {
      console.log(
        "🔒 HomeRedirect: No user and not from guest route, redirecting to login"
      );
      return <Navigate to="/login" replace />;
    }

    // If coming from guest route but no user, something is wrong - go to login
    if (!user && fromGuestRoute) {
      console.warn(
        "⚠️ HomeRedirect: Coming from guest route but no user session"
      );
      return <Navigate to="/login" replace />;
    }

    return <Home />;
  };

  // Only allow registration with QR token
  const RegisterWithToken = () => {
    const searchParams = new URLSearchParams(location.search);
    const token = searchParams.get("token");
    const hotel = searchParams.get("hotel");

    // If no token/hotel, redirect to login
    if (!token || !hotel) {
      return <Navigate to="/login" replace />;
    }

    return <Register />;
  };

  const sidebar = !isMobile && !hideNavigation && (
    <div className={`sidebar-wrapper ${collapsed ? "collapsed" : ""}`}>
      <BigScreenNavbar collapsed={collapsed} setCollapsed={setCollapsed} />
    </div>
  );

  const layoutClass = `vw-100 ${collapsed ? "collapsed" : "expanded"} ${
    isMobile ? "mt-0" : ""
  }`;

  return (
    <>
      {isMobile && !hideNavigation && <MobileNavbar />}
      <div className="d-flex min-vh-100 min-vw-100 app-container">
        {sidebar}
        <div className={layoutClass}>
          <div
            className={`main-content-area d-flex flex-column ${
              !hideNavigation ? "with-navbar" : ""
            }`}
          >
            {!hideNavigation && <LogoBanner />}
            <Routes>
              {/* Public Routes - Always Accessible */}
              <Route path="/login" element={<Login />} />
              <Route path="/logout" element={<Logout />} />
              <Route path="/register" element={<RegisterWithToken />} />
              <Route
                path="/registration-success"
                element={<RegistrationSuccess />}
              />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route
                path="/reset-password/:uid/:token/"
                element={<ResetPassword />}
              />
              <Route path="/no-internet" element={<NoInternet />} />
              {/* NEW PHASE 1 ROUTES */}
              {/* Hotels Landing - Public */}
              <Route path="/" element={<HotelsLandingPage />} />
              {/* Hotel Dynamic Public Page - Public (uses page builder) */}
              <Route path="/hotel/:slug" element={<HotelPublicPage />} />
              {/* Section-Based Public Page - Public (new section-based system) */}
              <Route
                path="/hotel/:slug/sections"
                element={<SectionBasedPublicPage />}
              />
              {/* Section Editor - Staff only */}
              <Route
                path="/staff/:hotelSlug/section-editor"
                element={
                  <ProtectedRoute>
                    <SectionEditorPage />
                  </ProtectedRoute>
                }
              />
              {/* Staff Feed - Requires hotel slug */}
              <Route
                path="/staff/:hotelSlug/feed"
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                }
              />
              {/* Protected Routes - Require Authentication */}
              <Route
                path="/reception"
                element={
                  <ProtectedRoute>
                    <Reception />
                  </ProtectedRoute>
                }
              />
              {/* Protected Routes - Require Authentication */}
              <Route
                path="/reception"
                element={
                  <ProtectedRoute>
                    <Reception />
                  </ProtectedRoute>
                }
              />

              {/* Settings */}
              <Route
                path="/staff/:hotelSlug/settings"
                element={
                  <ProtectedRoute>
                    <Settings />
                  </ProtectedRoute>
                }
              />
              {/* Maintenance */}
              <Route
                path="/maintenance"
                element={
                  <ProtectedRoute>
                    <Maintenance />
                  </ProtectedRoute>
                }
              />
              {/* Staff Routes */}
              <Route
                path="/:hotelSlug/staff"
                element={
                  <ProtectedRoute>
                    <Staff />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/:hotelSlug/staff/create"
                element={
                  <ProtectedRoute>
                    <StaffCreate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/:hotelSlug/staff/:id"
                element={
                  <ProtectedRoute>
                    <StaffDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/:hotelSlug/staff/me"
                element={
                  <ProtectedRoute>
                    <StaffProfile />
                  </ProtectedRoute>
                }
              />
              {/* Attendance Routes */}
              <Route
                path="/attendance/:hotelSlug"
                element={
                  <ProtectedRoute>
                    <AttendanceDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/roster/:hotelSlug"
                element={
                  <ProtectedRoute>
                    <AttendanceDashboard />
                  </ProtectedRoute>
                }
              />{" "}
              {/* Legacy route */}
              <Route
                path="/department-roster/:hotelSlug"
                element={
                  <ProtectedRoute>
                    <DepartmentRosterDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/enhanced-attendance/:hotelSlug"
                element={
                  <ProtectedRoute>
                    <EnhancedAttendanceDashboard />
                  </ProtectedRoute>
                }
              />
              {/* Face Attendance Routes */}
              <Route
                path="/face/:hotelSlug/register"
                element={
                  <ProtectedRoute>
                    <FaceRegisterPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/face/:hotelSlug/clock-in"
                element={<FaceClockInPage />}
              />
              <Route
                path="/camera-clock-in/:hotelSlug"
                element={<FaceClockInPage />}
              />
              {/* PIN Auth - Public (guests use these) */}
              <Route
                path="/:hotelIdentifier/room/:roomNumber/validate-pin"
                element={<PinAuth />}
              />
              <Route
                path="/guest-booking/:hotelSlug/restaurant/:restaurantSlug/room/:roomNumber/validate-dinner-pin"
                element={<DinnerPinAuth />}
              />
              {/* Restaurant Management */}
              <Route
                path="/hotel-:hotelSlug/restaurants"
                element={
                  <ProtectedRoute>
                    <RestaurantManagementDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/:hotelSlug/:restaurantSlug"
                element={
                  <ProtectedRoute>
                    <RestaurantManagementDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hotels/:hotelSlug/restaurants/:restaurantSlug"
                element={<Restaurant />}
              />
              {/* Guest Booking - Public (guests can book) */}
              <Route
                path="/guest-booking/:hotelSlug/restaurant/:restaurantSlug/"
                element={<DinnerBookingList />}
              />
              <Route
                path="/guest-booking/:hotelSlug/restaurant/:restaurantSlug/room/:roomNumber/"
                element={
                  <RequireDinnerPin>
                    <DinnerBookingForm />
                  </RequireDinnerPin>
                }
              />
              {/* Room Services */}
              <Route
                path="/rooms"
                element={
                  <ProtectedRoute>
                    <RoomList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/room_services/:hotelIdentifier/orders"
                element={
                  <ProtectedRoute>
                    <RoomServiceOrders />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/room_services/:hotelIdentifier/orders-summary"
                element={
                  <ProtectedRoute>
                    <OrdersSummary />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/room_services/:hotelIdentifier/orders-management"
                element={
                  <ProtectedRoute>
                    <RoomServiceOrdersManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/room_services/:hotelIdentifier/breakfast-orders"
                element={
                  <ProtectedRoute>
                    <BreakfastRoomService />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/menus_management/:hotelSlug"
                element={
                  <ProtectedRoute>
                    <MenusManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/room_services/:hotelIdentifier/room/:roomNumber/menu"
                element={
                  <RequirePin>
                    <RoomService />
                  </RequirePin>
                }
              />
              <Route
                path="/room_services/:hotelIdentifier/room/:roomNumber/breakfast/"
                element={
                  <RequirePin>
                    <Breakfast />
                  </RequirePin>
                }
              />
              {/* Guests */}
              <Route
                path="/:hotelIdentifier/guests"
                element={
                  <ProtectedRoute>
                    <GuestList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/:hotelIdentifier/guests/:guestId/edit"
                element={
                  <ProtectedRoute>
                    <GuestEdit />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/rooms/:hotelIdentifier/rooms/:roomNumber"
                element={
                  <ProtectedRoute>
                    <RoomDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/rooms/:roomNumber/add-guest"
                element={
                  <ProtectedRoute>
                    <AssignGuestForm />
                  </ProtectedRoute>
                }
              />
              {/* Bookings */}
              <Route
                path="/bookings"
                element={
                  <ProtectedRoute>
                    <Bookings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/staff/hotel/:hotelSlug/bookings"
                element={
                  <ProtectedRoute>
                    <BookingManagementPage />
                  </ProtectedRoute>
                }
              />
              {/* Hotel Info */}
              <Route
                path="/hotel_info/:hotel_slug"
                element={
                  <ProtectedRoute>
                    <HotelInfo />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hotel_info/:hotel_slug/:category"
                element={
                  <ProtectedRoute>
                    <HotelInfo />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/good_to_know/:hotel_slug/:slug"
                element={<GoodToKnow />}
              />
              <Route
                path="/good_to_know_console/:hotel_slug"
                element={
                  <ProtectedRoute>
                    <GoodToKnowConsole />
                  </ProtectedRoute>
                }
              />
              {/* Stock Tracker Routes */}
              <Route
                path="/stock_tracker/:hotel_slug"
                element={
                  <ProtectedRoute>
                    <StockDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/stock_tracker/:hotel_slug/analytics"
                element={
                  <ProtectedRoute>
                    <Analytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/stock_tracker/:hotel_slug/operations"
                element={
                  <ProtectedRoute>
                    <StockOperations />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/stock_tracker/:hotel_slug/items"
                element={
                  <ProtectedRoute>
                    <StockItemsResponsive />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/stock_tracker/:hotel_slug/profitability"
                element={
                  <ProtectedRoute>
                    <StockItemProfitability />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/stock_tracker/:hotel_slug/movements"
                element={
                  <ProtectedRoute>
                    <MovementsList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/stock_tracker/:hotel_slug/stocktakes"
                element={
                  <ProtectedRoute>
                    <StocktakesList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/stock_tracker/:hotel_slug/stocktakes/:id"
                element={
                  <ProtectedRoute>
                    <StocktakeDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/stock_tracker/:hotel_slug/periods"
                element={
                  <ProtectedRoute>
                    <PeriodSnapshots />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/stock_tracker/:hotel_slug/periods/:id"
                element={
                  <ProtectedRoute>
                    <PeriodSnapshotDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/stock_tracker/:hotel_slug/comparison"
                element={
                  <ProtectedRoute>
                    <PeriodsComparison />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/stock_tracker/:hotel_slug/sales/analysis"
                element={
                  <ProtectedRoute>
                    <SalesReport />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/stock_tracker/:hotel_slug/sales/list"
                element={
                  <ProtectedRoute>
                    <SalesListView />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/stock_tracker/:hotel_slug/sales/entry"
                element={
                  <ProtectedRoute>
                    <SalesEntry />
                  </ProtectedRoute>
                }
              />
              {/* Legacy routes - redirect to new sales routes */}
              <Route
                path="/stock_tracker/:hotel_slug/sales-report"
                element={<Navigate to="../sales/analysis" replace />}
              />
              <Route
                path="/stock_tracker/:hotel_slug/sales"
                element={<Navigate to="./entry" replace />}
              />
              <Route
                path="/stock_tracker/:hotel_slug/cocktails"
                element={
                  <ProtectedRoute>
                    <CocktailsPage />
                  </ProtectedRoute>
                }
              />
              {/* Chat Routes */}
              <Route
                path="/chat/:hotelSlug/messages/room/:room_number/validate-chat-pin"
                element={<ChatPinAuth />}
              />
              <Route
                path="/hotel/:hotelSlug/chat"
                element={
                  <ProtectedRoute>
                    <ChatHomePage
                      selectedRoom={selectedRoom}
                      onSelectRoom={handleSelectRoom}
                    />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat/:hotelSlug/conversations/:conversationId/messages/send"
                element={
                  <RequireChatPin>
                    <ChatWindow />
                  </RequireChatPin>
                }
              />
              <Route
                path="/chat/:hotelSlug/conversations/:conversationId/messages"
                element={<ChatWindow />}
              />
              
              {/* Games - Protected */}
              <Route
                path="/games"
                element={
                  <ProtectedRoute>
                    <GamesDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/games/whack-a-mole"
                element={
                  <ProtectedRoute>
                    <WhackAMolePage audioSettings={audioSettings} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/games/memory-match"
                element={
                  <ProtectedRoute>
                    <MemoryMatchDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/games/memory-match/practice"
                element={
                  <ProtectedRoute>
                    <MemoryGame practiceMode={true} />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/games/memory-match/tournament/:tournamentId"
                element={
                  <ProtectedRoute>
                    <MemoryGame />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/games/memory-match/tournament/:tournamentId/winners"
                element={
                  <ProtectedRoute>
                    <React.Suspense fallback={<div>Loading...</div>}>
                      <TournamentWinners />
                    </React.Suspense>
                  </ProtectedRoute>
                }
              />
              <Route
                path="/games/memory-match/tournaments"
                element={
                  <ProtectedRoute>
                    <TournamentDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/games/memory-match/leaderboard"
                element={
                  <ProtectedRoute>
                    <Leaderboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/games/memory-match/stats"
                element={
                  <ProtectedRoute>
                    <PersonalStats />
                  </ProtectedRoute>
                }
              />
              {/* Quiz Game Routes */}
              <Route
                path="/games/quiz"
                element={
                  <ProtectedRoute>
                    <QuizStartScreen />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/games/quiz/play"
                element={
                  <ProtectedRoute>
                    <QuizPlayScreen />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/games/quiz/results"
                element={
                  <ProtectedRoute>
                    <QuizResultsScreen />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/games/quiz/leaderboard"
                element={
                  <ProtectedRoute>
                    <QuizLeaderboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/games/quiz/tournaments"
                element={
                  <ProtectedRoute>
                    <QuizTournaments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/games/settings"
                element={
                  <ProtectedRoute>
                    <div>Game Settings Coming Soon!</div>
                  </ProtectedRoute>
                }
              />
              {/* Hotel Portal Routes - Must be at end to avoid catching other routes */}
              <Route path="/:hotelSlug/book" element={<GuestRoomBookingPage />} />
              <Route
                path="/booking/:hotelSlug"
                element={<GuestRoomBookingPage />}
              />
              <Route
                path="/:hotelSlug/my-bookings"
                element={<MyBookingsPage />}
              />
              <Route path="/my-bookings" element={<MyBookingsPage />} />
              <Route
                path="/booking/confirmation/:bookingId"
                element={<BookingConfirmation />}
              />
              <Route
                path="/booking/:hotelSlug/payment/success"
                element={<BookingPaymentSuccess />}
              />
              <Route
                path="/booking/:hotelSlug/payment/cancel"
                element={<BookingPaymentCancel />}
              />
              {/* Legacy routes without hotel slug for backward compatibility */}
              <Route
                path="/booking/payment/success"
                element={<BookingPaymentSuccess />}
              />
              <Route
                path="/booking/payment/cancel"
                element={<BookingPaymentCancel />}
              />
              {/* Hotel Portal - Public (guest view) or Staff (with toggle) - MUST be last specific route */}
              <Route path="/:hotelSlug" element={<HotelPortalPage />} />
              {/* Catch All */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </div>
        </div>
      </div>
    </>
  );
}

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const isMobile = useMediaQuery({ maxWidth: 991 });

  return (
     <BrowserRouter>
    <QueryClientProvider client={queryClient}>
      <ToastContainer
        position="top-center"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        draggable
        theme="colored"
      />
      <UIProvider>
        <AuthProvider>
          <RealtimeProvider>
            <AttendanceProvider>
              <RoomServiceProvider>
                <ServiceBookingProvider>
                  <GuestChatProvider>
                    <StaffChatStoreProvider>
                      <MessengerProvider>
                        <ThemeProvider>
                          <ChartPreferencesProvider>
                            <ChatProvider>
                              <StaffChatProvider>
                                <BookingNotificationProvider>
                                  <RoomServiceNotificationProvider>
                                    <NetworkHandler />
                                    <MessengerWidget position="bottom-right" />
                                    <AppLayout
                                      collapsed={collapsed}
                                      setCollapsed={setCollapsed}
                                      isMobile={isMobile}
                                    />
                                  </RoomServiceNotificationProvider>
                                </BookingNotificationProvider>
                              </StaffChatProvider>
                            </ChatProvider>
                          </ChartPreferencesProvider>
                        </ThemeProvider>
                      </MessengerProvider>
                    </StaffChatStoreProvider>
                  </GuestChatProvider>
                </ServiceBookingProvider>
              </RoomServiceProvider>
            </AttendanceProvider>
          </RealtimeProvider>
        </AuthProvider>
      </UIProvider>
    </QueryClientProvider>
    </BrowserRouter>
  );
}

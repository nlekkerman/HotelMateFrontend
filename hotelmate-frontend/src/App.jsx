import React, { useState, useEffect } from "react";
import Pusher from "pusher-js";
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
import { BookingNotificationProvider } from "@/context/BookingNotificationContext";
import { RoomServiceNotificationProvider } from "@/context/RoomServiceNotificationContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import MobileNavbar from "@/components/layout/MobileNavbar";
import DesktopSidebarNavbar from "@/components/layout/DesktopSidebarNavbar";
import NetworkHandler from "@/components/offline/NetworkHandler";
import LogoBanner from "./components/layout/LogoBanner";
import PusherDebugger from "@/components/utils/PusherDebugger";

// Pages + Components
import Home from "@/pages/home/Home";
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
import FaceClockInPage from "@/pages/attendance/FaceClockInPage";
import FaceRegister from "@/components/attendance/FaceRegister";

import RoomList from "@/components/rooms/RoomList";
import RoomDetails from "@/components/rooms/RoomDetails";
import RoomService from "@/components/rooms/RoomService";
import Breakfast from "@/components/rooms/Breakfast";
import BreakfastRoomService from "@/components/room_service/BreakfastRoomService";
import RoomServiceOrders from "@/components/room_service/RoomServiceOrders";
import OrdersSummary from "@/components/room_service/OrdersSummary";
import RoomServiceOrdersManagement from "@/components/room_service/RoomServiceOrdersManagement";

import Staff from "@/components/staff/Staff";
import StaffCreate from "@/components/staff/StaffCreate";
import StaffDetails from "@/components/staff/StaffDetails";
import StaffProfile from "@/components/staff/StaffProfile";
import RosterDashboard from "@/pages/attendance/RosterDashboard";
import DepartmentRosterView from "@/components/attendance/DepartmentRosterView";

import GuestList from "@/components/guests/GuestList";
import GuestEdit from "@/components/guests/GuestEdit";
import AssignGuestForm from "@/components/guests/AssignGuestForm";

import DinnerBookingForm from "@/components/bookings/DinnerBookingForm";
import DinnerBookingList from "@/components/bookings/DinnerBookingList";
import Bookings from "@/components/bookings/Bookings";
import RestaurantManagementDashboard from "@/pages/bookings/RestaurantManagementDashboard";
import Restaurant from "@/components/restaurants/Restaurant";
import HotelInfo from "@/pages/hotel_info/HotelInfo";
import GoodToKnow from "@/components/hotel_info/GoodToKnow";
import GoodToKnowConsole from "@/components/hotel_info/GoodToKnowConsole";

import StockDashboard from "@/pages/stock_tracker/StockDashboard";
import CategoryStock from "@/components/stock_tracker/CategoryStock";

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

const queryClient = new QueryClient();
// Default settings for all games
const defaultAudioSettings = {
  bgMusic: true,
  effects: true,
};
// 🔁 Inner layout that uses `useLocation()` safely
function AppLayout({ collapsed, setCollapsed, isMobile }) {
  const [audioSettings, setAudioSettings] = useState(defaultAudioSettings);
  const location = useLocation();
  const isClockInPage = location.pathname.startsWith("/clock-in");
  const isAuthPage = location.pathname === "/login" || 
                     location.pathname === "/logout" ||
                     location.pathname === "/register" || 
                     location.pathname === "/forgot-password" ||
                     location.pathname === "/registration-success" ||
                     location.pathname.startsWith("/reset-password");
  const { user } = useAuth();

  const [selectedRoom, setSelectedRoom] = useState(null);

  const handleSelectRoom = async (roomNumber, conversationId) => {
    setSelectedRoom(roomNumber);
  };

  // Redirect home to login if not authenticated
  const HomeRedirect = () => {
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    return <Home />;
  };

  // Only allow registration with QR token
  const RegisterWithToken = () => {
    const searchParams = new URLSearchParams(location.search);
    const token = searchParams.get('token');
    const hotel = searchParams.get('hotel');
    
    // If no token/hotel, redirect to login
    if (!token || !hotel) {
      return <Navigate to="/login" replace />;
    }
    
    return <Register />;
  };

  const sidebar = !isMobile && !isClockInPage && !isAuthPage && (
    <div className={`sidebar-wrapper ${collapsed ? "collapsed" : ""}`}>
      <DesktopSidebarNavbar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />
    </div>
  );

  const layoutClass = `vw-100 ${collapsed ? "collapsed" : "expanded"} ${
    isMobile ? "mt-0" : ""
  }`;

  return (
    <>
      {isMobile && !isClockInPage && !isAuthPage && <MobileNavbar />}
      <div className="d-flex min-vh-100 min-vw-100 app-container">
        {sidebar}
        <div className={layoutClass}>
          <div className="main-content-area d-flex flex-column">
            {!isClockInPage && !isAuthPage && <LogoBanner />}
            <Routes>
              {/* Public Routes - Always Accessible */}
              <Route path="/login" element={<Login />} />
              <Route path="/logout" element={<Logout />} />
              <Route path="/register" element={<RegisterWithToken />} />
              <Route path="/registration-success" element={<RegistrationSuccess />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:uid/:token/" element={<ResetPassword />} />
              <Route path="/no-internet" element={<NoInternet />} />
              
              {/* Home - Redirect to login if not authenticated */}
              <Route path="/" element={<HomeRedirect />} />
              
              {/* Protected Routes - Require Authentication */}
              <Route path="/reception" element={<ProtectedRoute><Reception /></ProtectedRoute>} />
              {/* Protected Routes - Require Authentication */}
              <Route path="/reception" element={<ProtectedRoute><Reception /></ProtectedRoute>} />

              {/* Debug Route - REMOVE IN PRODUCTION */}
              <Route path="/pusher-debug" element={<ProtectedRoute><PusherDebugger /></ProtectedRoute>} />

              {/* Settings */}
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />

              {/* Maintenance */}
              <Route path="/maintenance" element={<ProtectedRoute><Maintenance /></ProtectedRoute>} />

              {/* Staff Routes */}
              <Route path="/:hotelSlug/staff" element={<ProtectedRoute><Staff /></ProtectedRoute>} />
              <Route path="/:hotelSlug/staff/create" element={<ProtectedRoute><StaffCreate /></ProtectedRoute>} />
              <Route path="/:hotelSlug/staff/:id" element={<ProtectedRoute><StaffDetails /></ProtectedRoute>} />
              <Route path="/:hotelSlug/staff/me" element={<ProtectedRoute><StaffProfile /></ProtectedRoute>} />
              <Route path="/roster/:hotelSlug" element={<ProtectedRoute><RosterDashboard /></ProtectedRoute>} />
              <Route path="/roster/:hotelSlug/department/:department" element={<ProtectedRoute><DepartmentRosterView /></ProtectedRoute>} />

              {/* Face Recognition */}
              <Route path="/clock-in/:hotel_slug" element={<FaceClockInPage />} />
              <Route path="/:hotel_slug/staff/register-face" element={<ProtectedRoute><FaceRegister /></ProtectedRoute>} />

              {/* PIN Auth - Public (guests use these) */}
              <Route path="/:hotelIdentifier/room/:roomNumber/validate-pin" element={<PinAuth />} />
              <Route path="/guest-booking/:hotelSlug/restaurant/:restaurantSlug/room/:roomNumber/validate-dinner-pin" element={<DinnerPinAuth />} />
              
              {/* Restaurant Management */}
              <Route path="/:hotelSlug/:restaurantSlug" element={<ProtectedRoute><RestaurantManagementDashboard /></ProtectedRoute>} />
              <Route path="/hotels/:hotelSlug/restaurants/:restaurantSlug" element={<Restaurant />} />

              {/* Guest Booking - Public (guests can book) */}
              <Route path="/guest-booking/:hotelSlug/restaurant/:restaurantSlug/" element={<DinnerBookingList />} />
              <Route path="/guest-booking/:hotelSlug/restaurant/:restaurantSlug/room/:roomNumber/" element={
                <RequireDinnerPin>
                  <DinnerBookingForm />
                </RequireDinnerPin>
              } />

              {/* Room Services */}
              <Route path="/rooms" element={<ProtectedRoute><RoomList /></ProtectedRoute>} />
              <Route path="/room_services/:hotelIdentifier/orders" element={<ProtectedRoute><RoomServiceOrders /></ProtectedRoute>} />
              <Route path="/room_services/:hotelIdentifier/orders-summary" element={<ProtectedRoute><OrdersSummary /></ProtectedRoute>} />
              <Route path="/room_services/:hotelIdentifier/orders-management" element={<ProtectedRoute><RoomServiceOrdersManagement /></ProtectedRoute>} />
              <Route path="/room_services/:hotelIdentifier/breakfast-orders" element={<ProtectedRoute><BreakfastRoomService /></ProtectedRoute>} />
              <Route path="/room_services/:hotelIdentifier/room/:roomNumber/menu" element={
                <RequirePin>
                  <RoomService />
                </RequirePin>
              } />
              <Route path="/room_services/:hotelIdentifier/room/:roomNumber/breakfast/" element={
                <RequirePin>
                  <Breakfast />
                </RequirePin>
              } />

              {/* Guests */}
              <Route path="/:hotelIdentifier/guests" element={<ProtectedRoute><GuestList /></ProtectedRoute>} />
              <Route path="/:hotelIdentifier/guests/:guestId/edit" element={<ProtectedRoute><GuestEdit /></ProtectedRoute>} />
              <Route path="/rooms/:hotelIdentifier/rooms/:roomNumber" element={<ProtectedRoute><RoomDetails /></ProtectedRoute>} />
              <Route path="/rooms/:roomNumber/add-guest" element={<ProtectedRoute><AssignGuestForm /></ProtectedRoute>} />

              {/* Bookings */}
              <Route path="/bookings" element={<ProtectedRoute><Bookings /></ProtectedRoute>} />

              {/* Hotel Info */}
              <Route path="/hotel_info/:hotel_slug" element={<ProtectedRoute><HotelInfo /></ProtectedRoute>} />
              <Route path="/hotel_info/:hotel_slug/:category" element={<ProtectedRoute><HotelInfo /></ProtectedRoute>} />
              <Route path="/good_to_know/:hotel_slug/:slug" element={<GoodToKnow />} />
              <Route path="/good_to_know_console/:hotel_slug" element={<ProtectedRoute><GoodToKnowConsole /></ProtectedRoute>} />

              {/* Stock Tracker */}
              <Route path="/stock_tracker/:hotel_slug" element={<ProtectedRoute><StockDashboard /></ProtectedRoute>} />
              <Route path="/stock_tracker/:hotel_slug/:category_slug" element={<ProtectedRoute><CategoryStock /></ProtectedRoute>} />

              {/* Chat Routes */}
              <Route path="/chat/:hotelSlug/messages/room/:room_number/validate-chat-pin" element={<ChatPinAuth />} />
              <Route path="/hotel/:hotelSlug/chat" element={
                <ProtectedRoute>
                  <ChatHomePage selectedRoom={selectedRoom} onSelectRoom={handleSelectRoom} />
                </ProtectedRoute>
              } />
              <Route path="/chat/:hotelSlug/conversations/:conversationId/messages/send" element={
                <RequireChatPin>
                  <ChatWindow />
                </RequireChatPin>
              } />
              <Route path="/chat/:hotelSlug/conversations/:conversationId/messages" element={<ChatWindow />} />

              {/* Games - Protected */}
              <Route path="/games" element={<ProtectedRoute><GamesDashboard /></ProtectedRoute>} />
              <Route path="/games/whack-a-mole" element={<ProtectedRoute><WhackAMolePage audioSettings={audioSettings} /></ProtectedRoute>} />
              <Route path="/games/memory-match" element={<ProtectedRoute><MemoryMatchDashboard /></ProtectedRoute>} />
              <Route path="/games/memory-match/practice" element={<ProtectedRoute><MemoryGame practiceMode={true} /></ProtectedRoute>} />
              <Route path="/games/memory-match/tournament/:tournamentId" element={<ProtectedRoute><MemoryGame /></ProtectedRoute>} />
              <Route path="/games/memory-match/tournament/:tournamentId/winners" element={
                <ProtectedRoute>
                  <React.Suspense fallback={<div>Loading...</div>}>
                    <TournamentWinners />
                  </React.Suspense>
                </ProtectedRoute>
              } />
              <Route path="/games/memory-match/tournaments" element={<ProtectedRoute><TournamentDashboard /></ProtectedRoute>} />
              <Route path="/games/memory-match/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
              <Route path="/games/memory-match/stats" element={<ProtectedRoute><PersonalStats /></ProtectedRoute>} />
              <Route path="/games/settings" element={<ProtectedRoute><div>Game Settings Coming Soon!</div></ProtectedRoute>} />
              
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
          <ThemeProvider>
            <ChatProvider>
              <BookingNotificationProvider>
                <RoomServiceNotificationProvider>
                  <BrowserRouter>
                    <NetworkHandler />
                    <AppLayout
                      collapsed={collapsed}
                      setCollapsed={setCollapsed}
                      isMobile={isMobile}
                    />
                  </BrowserRouter>
                </RoomServiceNotificationProvider>
              </BookingNotificationProvider>
            </ChatProvider>
          </ThemeProvider>
        </AuthProvider>
      </UIProvider>
    </QueryClientProvider>
  );
}

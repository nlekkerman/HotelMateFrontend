import React, { useState, useEffect } from "react";
import "@/firebase";
import Pusher from "pusher-js";
import api from "@/services/api";
import { useMediaQuery } from "react-responsive";
import "@/styles/main.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import { UIProvider } from "@/context/UIContext";
import { ChatProvider  } from "@/context/ChatContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useUnreadConversations } from "@/components/chat/hooks/useUnreadConversations";
import MobileNavbar from "@/components/layout/MobileNavbar";
import DesktopSidebarNavbar from "@/components/layout/DesktopSidebarNavbar";
import NetworkHandler from "@/components/offline/NetworkHandler";
import LogoBanner from "./components/layout/LogoBanner";

// Pages + Components
import Home from "@/pages/home/Home";
import Reception from "@/components/Reception";
import Login from "@/components/auth/Login";
import Register from "@/components/auth/Register";
import RegistrationSuccess from "@/components/auth/RegistrationSuccess";
import ForgotPassword from "@/components/auth/ForgotPassword";
import ResetPassword from "@/components/auth/ResetPassword";
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
const queryClient = new QueryClient();

// 🔁 Inner layout that uses `useLocation()` safely
function AppLayout({ collapsed, setCollapsed, isMobile }) {
  const location = useLocation();
  const isClockInPage = location.pathname.startsWith("/clock-in");
  const { user } = useAuth();
  const { unreadCount: chatUnreadCount, markConversationRead } =
    useUnreadConversations();

  const [selectedRoom, setSelectedRoom] = useState(null);

  const handleSelectRoom = async (roomNumber, conversationId) => {
    setSelectedRoom(roomNumber);
    await markConversationRead(conversationId);
  };

  const sidebar = !isMobile && !isClockInPage && (
    <div className={`sidebar-wrapper ${collapsed ? "collapsed" : ""}`}>
      <DesktopSidebarNavbar
        collapsed={collapsed}
        setCollapsed={setCollapsed}
        chatUnreadCount={chatUnreadCount}
      />
    </div>
  );

  const layoutClass = `vw-100 ${collapsed ? "collapsed" : "expanded"} ${
    isMobile ? "mt-0" : ""
  }`;

  return (
    <>
      {isMobile && !isClockInPage && <MobileNavbar />}
      <div className="d-flex min-vh-100 min-vw-100 app-container">
        {sidebar}
        <div className={layoutClass}>
          <div className="main-content-area d-flex flex-column">
            {!isClockInPage && <LogoBanner />}
            <Routes>
              {/* General */}
              <Route path="/" element={<Home />} />
              <Route path="/reception" element={<Reception />} />
              <Route path="/no-internet" element={<NoInternet />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route
                path="/registration-success"
                element={<RegistrationSuccess />}
              />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route
                path="/reset-password/:uid/:token/"
                element={<ResetPassword />}
              />

              {/* PIN Auth */}
              <Route
                path="/:hotelIdentifier/room/:roomNumber/validate-pin"
                element={<PinAuth />}
              />
              <Route
                path="/guest-booking/:hotelSlug/restaurant/:restaurantSlug/room/:roomNumber/validate-dinner-pin"
                element={<DinnerPinAuth />}
              />
              <Route
                path="/:hotelSlug/:restaurantSlug"
                element={<RestaurantManagementDashboard />}
              ></Route>
              <Route
                path="/hotels/:hotelSlug/restaurants/:restaurantSlug"
                element={<Restaurant />}
              />

              {/* Face Recognition */}
              <Route
                path="/clock-in/:hotel_slug"
                element={<FaceClockInPage />}
              />
              <Route
                path="/:hotel_slug/staff/register-face"
                element={<FaceRegister />}
              />

              {/* Guest Booking */}
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

              {/* Maintenance */}
              <Route path="/maintenance" element={<Maintenance />} />

              {/* Room Services */}
              <Route path="/rooms" element={<RoomList />} />
              <Route
                path="/room_services/:hotelIdentifier/orders"
                element={<RoomServiceOrders />}
              />
              <Route
                path="/services/room-service"
                element={<RoomServiceOrders />}
              />
              <Route
                path="/services/breakfast"
                element={<BreakfastRoomService />}
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

              <Route path="/:hotelSlug/staff" element={<Staff />} />
              <Route
                path="/:hotelSlug/staff/create"
                element={<StaffCreate />}
              />
              <Route path="/:hotelSlug/staff/:id" element={<StaffDetails />} />
              <Route path="/:hotelSlug/staff/me" element={<StaffProfile />} />
              <Route path="/roster/:hotelSlug" element={<RosterDashboard />} />

              <Route
                path="/roster/:hotelSlug/department/:department"
                element={<DepartmentRosterView />}
              />
              {/* Guests */}
              <Route path="/:hotelIdentifier/guests" element={<GuestList />} />
              <Route
                path="/:hotelIdentifier/guests/:guestId/edit"
                element={<GuestEdit />}
              />
              <Route
                path="/rooms/:hotelIdentifier/rooms/:roomNumber"
                element={<RoomDetails />}
              />
              <Route
                path="/rooms/:roomNumber/add-guest"
                element={<AssignGuestForm />}
              />

              {/* Utilities */}
              <Route path="/bookings" element={<Bookings />} />
              <Route path="/settings" element={<Settings />} />

              {/* Hotel Info */}
              <Route path="/hotel_info/:hotel_slug" element={<HotelInfo />} />
              <Route
                path="/hotel_info/:hotel_slug/:category"
                element={<HotelInfo />}
              />
              <Route
                path="/good_to_know/:hotel_slug/:slug"
                element={<GoodToKnow />}
              />
              <Route
                path="/good_to_know_console/:hotel_slug"
                element={<GoodToKnowConsole />}
              />

              {/* Stock Tracker */}
              <Route
                path="/stock_tracker/:hotel_slug"
                element={<StockDashboard />}
              />
              <Route
                path="/stock_tracker/:hotel_slug/:category_slug"
                element={<CategoryStock />}
              />
              {/* Guest: Validate chat PIN for a room */}
              <Route
                path="/chat/:hotelSlug/messages/room/:room_number/validate-chat-pin"
                element={<ChatPinAuth />}
              />

              {/* Staff: Authenticated users go to ChatHomePage (all active conversations for the hotel) */}
              <Route
                path="/hotel/:hotelSlug/chat"
                element={
                  <ChatHomePage
                    selectedRoom={selectedRoom}
                    onSelectRoom={handleSelectRoom}
                  />
                }
              />

              {/* Guests: Access a specific conversation (previously room-based) */}
              <Route
                path="/chat/:hotelSlug/conversations/:conversationId/messages/send"
                element={
                  <RequireChatPin>
                    <ChatWindow />
                  </RequireChatPin>
                }
              />

              {/* Fetch all messages in a conversation */}
              <Route
                path="/chat/:hotelSlug/conversations/:conversationId/messages"
                element={<ChatWindow />}
              />

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
            <BrowserRouter>
              <NetworkHandler />
              <AppLayout
                collapsed={collapsed}
                setCollapsed={setCollapsed}
                isMobile={isMobile}
              />
            </BrowserRouter>
            </ChatProvider>
          </ThemeProvider>
        </AuthProvider>
      </UIProvider>
    </QueryClientProvider>
  );
}

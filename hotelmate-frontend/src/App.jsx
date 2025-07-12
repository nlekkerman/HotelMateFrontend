// src/App.jsx
import React, { useState } from "react";
import "@/firebase"; // Ensure Firebase is initialized
import { useMediaQuery } from "react-responsive";
import "@/styles/main.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { UIProvider } from "@/context/UIContext";
import { AuthProvider } from "@/context/AuthContext";
import MobileNavbar from "@/components/layout/MobileNavbar";
import DesktopSidebarNavbar from "@/components/layout/DesktopSidebarNavbar";

import RoomList from "@/components/rooms/RoomList";
import Reception from "@/components/Reception";

import Login from "@/components/auth/Login";
import Register from "@/components/auth/Register";
import RegistrationSuccess from "@/components/auth/RegistrationSuccess";
import ForgotPassword from "@/components/auth/ForgotPassword";
import ResetPassword from "@/components/auth/ResetPassword";
import RequirePin from "@/components/auth/RequirePin";
import RequireDinnerPin from "@/components/auth/RequireDinnerPin";
import DinnerPinAuth from "@/components/auth/DinnerPinAuth";
import PinAuth from "@/components/auth/PinAuth";

import Staff from "@/components/staff/Staff";
import StaffCreate from "@/components/staff/StaffCreate";
import StaffDetails from "@/components/staff/StaffDetails";
import StaffProfile from "@/components/staff/StaffProfile";
import RoomDetails from "@/components/rooms/RoomDetails";
import Breakfast from "@/components/rooms/Breakfast";
import RoomService from "@/components/rooms/RoomService";
import AssignGuestForm from "@/components/guests/AssignGuestForm"; // Adjust path if needed
import GuestList from "@/components/guests/GuestList";
import GuestEdit from "@/components/guests/GuestEdit";
import DinnerBookingForm from "@/components/bookings/DinnerBookingForm";
import DinnerBookingList from "@/components/bookings/DinnerBookingList";
import Bookings from "@/components/bookings/Bookings";
import Settings from "@/components/utils/Settings";

import StockDashboard from "@/pages/stock_tracker/StockDashboard";
import CategoryStock from "@/components/stock_tracker/CategoryStock";

import NetworkHandler from "@/components/offline/NetworkHandler";
import NoInternet from "@/components/offline/NoInternet";
import { ThemeProvider } from "@/context/ThemeContext"; // Import ThemeProvider
import HotelInfo from "@/pages/hotel_info/HotelInfo";
import GoodToKnow from "@/components/hotel_info/GoodToKnow";
import GoodToKnowConsole from "@/components/hotel_info/GoodToKnowConsole";
import RoomServiceOrders from "@/components/room_service/RoomServiceOrders";
import BreakfastRoomService from "@/components/room_service/BreakfastRoomService";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Maintenance from "@/pages/maintenance/Maintenance";

import ARMenuPage from "./pages/ar_logic/ARMenuPage";

const queryClient = new QueryClient();

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const isMobile = useMediaQuery({ maxWidth: 991 });

  const sidebar = !isMobile && (
    <div className={`sidebar-wrapper ${collapsed ? "collapsed" : ""}`}>
      <DesktopSidebarNavbar collapsed={collapsed} setCollapsed={setCollapsed} />
    </div>
  );

  const layoutClass = `layout-container vw-100 ${
    collapsed ? "collapsed" : "expanded"
  } ${isMobile ? "mt-0" : ""}`;

  return (
    <QueryClientProvider client={queryClient}>
      <ToastContainer
        position="top-center"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        pauseOnHover
        draggable
        theme="colored"
      />
      <UIProvider>
        <AuthProvider>
          <ThemeProvider>
            <BrowserRouter>
              <NetworkHandler />
              {isMobile && <MobileNavbar />}

              <div className="d-flex min-vh-100 min-vw-100">
                {sidebar}
                <div className={layoutClass}>
                  <div className="main-content-area d-flex">
                    <Routes>
                      {/* General */}
                      <Route path="/" element={<Reception />} />
                      <Route
                        path="/:hotel_slug/restaurant/:restaurant_slug/ar/menu"
                        element={<ARMenuPage />}
                      />
                      <Route path="/no-internet" element={<NoInternet />} />
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                      <Route
                        path="/registration-success"
                        element={<RegistrationSuccess />}
                      />
                      <Route
                        path="/forgot-password"
                        element={<ForgotPassword />}
                      />
                      <Route
                        path="/reset-password/:uid/:token/"
                        element={<ResetPassword />}
                      />

                      {/* PIN Authentication */}
                      <Route
                        path="/:hotelIdentifier/room/:roomNumber/validate-pin"
                        element={<PinAuth />}
                      />
                      <Route
                        path="/guest-booking/:hotelSlug/restaurant/:restaurantSlug/room/:roomNumber/validate-dinner-pin"
                        element={<DinnerPinAuth />}
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

                      {/* Staff */}
                      <Route path="/staff" element={<Staff />} />
                      <Route path="/staff/create" element={<StaffCreate />} />
                      <Route path="/staff/:id" element={<StaffDetails />} />
                      <Route path="/staff/me" element={<StaffProfile />} />

                      {/* Guests */}
                      <Route
                        path="/:hotelIdentifier/guests"
                        element={<GuestList />}
                      />
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
                      <Route
                        path="/hotel_info/:hotel_slug"
                        element={<HotelInfo />}
                      />
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
                    </Routes>
                  </div>
                </div>
              </div>
            </BrowserRouter>
          </ThemeProvider>
        </AuthProvider>
      </UIProvider>
    </QueryClientProvider>
  );
}

export default App;

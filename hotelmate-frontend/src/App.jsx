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
import RoomServiceOrders from "@/components/room_service/RoomServiceOrders";
import BreakfastRoomService from "@/components/room_service/BreakfastRoomService";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ✅ Add this import:
import { BrowserRouter, Routes, Route } from "react-router-dom";

const queryClient = new QueryClient();

function App() {
  const [collapsed, setCollapsed] = useState(false);
  const isMobile = useMediaQuery({ maxWidth: 991 });
  return (
    <QueryClientProvider client={queryClient}>
      <ToastContainer
        position="top-center"
        autoClose={5000} // auto-dismiss after 5s
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        pauseOnHover
        draggable
        theme="colored" // gives you a nice colored style
      />
      <UIProvider>
        <AuthProvider>
          <ThemeProvider>
            <BrowserRouter>
              <NetworkHandler />
              {isMobile && <MobileNavbar />}

              <div className="d-flex min-vh-100  min-vw-100 ">
                {!isMobile && (
                  <div
                    className={`sidebar-wrapper ${
                      collapsed ? "collapsed" : ""
                    }`}
                  >
                    <DesktopSidebarNavbar
                      collapsed={collapsed}
                      setCollapsed={setCollapsed}
                    />
                  </div>
                )}

                <div
                  className={`layout-container vw-100 ${
                    collapsed ? "collapsed" : "expanded"
                  } ${isMobile ? "mt-0" : ""}`}
                >
                  <div className="main-content-area d-flex">
                    <Routes>
                      <Route path="/no-internet" element={<NoInternet />} />
                      <Route path="/" element={<Reception />} />
                      <Route
                        path="/forgot-password"
                        element={<ForgotPassword />}
                      />

                      <Route
                        path="/reset-password/:uid/:token/"
                        element={<ResetPassword />}
                      />
                      <Route
                        path="/:hotelIdentifier/room/:roomNumber/validate-pin"
                        element={<PinAuth />}
                      />
                      <Route path="/rooms" element={<RoomList />} />
                      <Route
                        path="/room_services/:hotelIdentifier/room/:roomNumber/menu"
                        element={
                          <RequirePin>
                            <RoomService />
                          </RequirePin>
                        }
                      />
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
                        path="/room_services/:hotelIdentifier/room/:roomNumber/breakfast/"
                        element={
                          <RequirePin>
                            <Breakfast />
                          </RequirePin>
                        }
                      />
                      <Route path="/login" element={<Login />} />
                      <Route path="/register" element={<Register />} />
                      <Route
                        path="/registration-success"
                        element={<RegistrationSuccess />}
                      />
                      <Route path="/staff" element={<Staff />} />
                      <Route path="/staff/create" element={<StaffCreate />} />
                      <Route path="/staff/:id" element={<StaffDetails />} />
                      <Route path="/staff/me" element={<StaffProfile />} />
                      <Route
                        path="/:hotelIdentifier/guests"
                        element={<GuestList />}
                      />
                      <Route
                        path="/rooms/:hotelIdentifier/rooms/:roomNumber"
                        element={<RoomDetails />}
                      />
                      <Route
                        path="/rooms/:roomNumber/add-guest"
                        element={<AssignGuestForm />}
                      />
                      <Route
                        path="/:hotelIdentifier/guests/:guestId/edit"
                        element={<GuestEdit />}
                      />
                      <Route
                        path="/guest-booking/:hotelSlug/restaurant/:restaurantSlug/room/:roomNumber/"
                        element={<DinnerBookingForm />}
                      />
                      <Route
                        path="/guest-booking/:hotelSlug/restaurant/:restaurantSlug/"
                        element={<DinnerBookingList />}
                      />
                      <Route path="/bookings" element={<Bookings />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route
                        path="/hotel_info/:hotel_slug"
                        element={<HotelInfo />}
                      />
                      <Route
                        path="/hotel_info/:hotel_slug/:category"
                        element={<HotelInfo />}
                      />
                      <Route
                        path="/stock_tracker/:hotel_slug/:category_slug"
                        element={<CategoryStock />}
                      />
                      <Route
                        path="/stock_tracker/:hotel_slug"
                        element={<StockDashboard />}
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

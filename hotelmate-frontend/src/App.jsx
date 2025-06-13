// src/App.jsx
import React from "react";
import "@/styles/main.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import { UIProvider } from "@/context/UIContext";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/layout/Navbar";
import RoomList from "@/components/rooms/RoomList";
import Reception from "@/components/Reception";
import Login from "@/components/auth/Login";
import Register from "@/components/auth/Register";
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
import RoomServiceOrders from "@/components/room_service/RoomServiceOrders";
import Settings from "@/components/utils/Settings";



import HotelInfo from "@/pages/hotel_info/HotelInfo";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// ✅ Add this import:
import { BrowserRouter, Routes, Route } from "react-router-dom";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UIProvider>
        <AuthProvider>
          <BrowserRouter>
            <Navbar />
            <div className="container-fluid bg-light min-vh-100 vw-100 d-flex flex-column">
              <Routes>
                <Route path="/" element={<Reception />} />
                <Route
                  path="/:hotelIdentifier/room/:roomNumber/validate-pin"
                  element={<PinAuth />}
                />
                <Route path="/rooms" element={<RoomList />} />
                {/* Protected routes */}
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
                  element={
                    
                      <RoomServiceOrders />
                    
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

                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
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
                <Route path="/hotel_info/:hotel_slug" element={<HotelInfo />} />

                {/* 2) If you hit /hotel_info/:hotel_slug/:category */}
                <Route
                  path="/hotel_info/:hotel_slug/:category"
                  element={<HotelInfo />}
                  
                />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </div>
          </BrowserRouter>
        </AuthProvider>
      </UIProvider>
    </QueryClientProvider>
  );
}

export default App;

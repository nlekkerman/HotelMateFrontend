// src/App.jsx
import React from "react";
import "@/styles/main.css";
import "bootstrap/dist/css/bootstrap.min.css";
import { UIProvider } from "@/context/UIContext";
import { AuthProvider } from "@/context/AuthContext";
import Navbar from "@/components/layout/Navbar";
import RoomList from "@/components/rooms/RoomList";
import Reception from "@/components/Reception";
import Login from "@/components/auth/Login";
import Register from "@/components/auth/Register";
import Staff from "@/components/staff/Staff";
import StaffCreate from "@/components/staff/StaffCreate";
import StaffDetails from "@/components/staff/StaffDetails";
import StaffProfile from "@/components/staff/StaffProfile";
import RoomDetails from "@/components/rooms/RoomDetails";
import Breakfast from "@/components/rooms/Breakfast";
import RoomService from "@/components/rooms/RoomService";
import AssignGuestForm from "@/components/guests/AssignGuestForm"; // Adjust path if needed

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
                <Route path="/reception" element={<Reception />} />
                <Route path="/rooms" element={<RoomList />} />
                <Route
                  path="/breakfast/:roomNumber"
                  element={<Breakfast />}
                />
               
                <Route
                  path="/room/:roomNumber/menu"
                  element={<RoomService />}
                />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/staff" element={<Staff />} />
                <Route path="/staff/create" element={<StaffCreate />} />
                <Route path="/staff/:id" element={<StaffDetails />} />
                <Route path="/staff/me" element={<StaffProfile />} />
                <Route path="/rooms/:roomNumber" element={<RoomDetails />} />
                <Route
                  path="/rooms/:roomNumber/add-guest"
                  element={<AssignGuestForm />}
                />
              </Routes>
            </div>
          </BrowserRouter>
        </AuthProvider>
      </UIProvider>
    </QueryClientProvider>
  );
}

export default App;

import React, { useState } from 'react';
import { useLocation, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getLayoutMode } from '@/policy/layoutPolicy';
import MobileNavbar from '@/components/layout/MobileNavbar';
import BigScreenNavbar from '@/components/layout/BigScreenNavbar';
import LogoBanner from '@/components/layout/LogoBanner';
import AppRouter from './AppRouter';
import Register from '@/components/auth/Register';

const defaultAudioSettings = { bgMusic: true, effects: true };

/**
 * AppLayoutShell — owns sidebar/nav chrome and delegates to AppRouter.
 *
 * Extracted from the former AppLayout function in App.jsx.
 * All layout-mode decisions come from getLayoutMode() (layoutPolicy).
 */
export default function AppLayoutShell({ collapsed, setCollapsed, isMobile }) {
  const [audioSettings] = useState(defaultAudioSettings);
  const location = useLocation();

  const layoutMode = getLayoutMode(location.pathname);
  const showStaffChrome = layoutMode === 'staff';
  const hideNavigation = !showStaffChrome;

  const { user } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState(null);

  const handleSelectRoom = async (roomNumber) => {
    setSelectedRoom(roomNumber);
  };

  // Guard: only allow /register with valid QR token params
  const RegisterWithToken = (() => {
    const searchParams = new URLSearchParams(location.search);
    const token = searchParams.get('token');
    const hotel = searchParams.get('hotel');
    if (!token || !hotel) return <Navigate to="/login" replace />;
    return <Register />;
  })();

  const sidebar = !isMobile && !hideNavigation && (
    <div className={`sidebar-wrapper ${collapsed ? 'collapsed' : ''}`}>
      <BigScreenNavbar collapsed={collapsed} setCollapsed={setCollapsed} />
    </div>
  );

  const layoutClass = `vw-100 ${collapsed ? 'collapsed' : 'expanded'} ${isMobile ? 'mt-0' : ''}`;

  return (
    <>
      {isMobile && !hideNavigation && <MobileNavbar />}
      <div className="d-flex min-vh-100 min-vw-100 app-container">
        {sidebar}
        <div className={layoutClass}>
          <div className={`main-content-area d-flex flex-column ${!hideNavigation ? 'with-navbar' : ''}`}>
            {!hideNavigation && <LogoBanner />}
            <AppRouter
              audioSettings={audioSettings}
              selectedRoom={selectedRoom}
              handleSelectRoom={handleSelectRoom}
              RegisterWithToken={RegisterWithToken}
            />
          </div>
        </div>
      </div>
    </>
  );
}

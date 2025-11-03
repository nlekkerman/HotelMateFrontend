import React, { useState, useEffect, useRef } from "react";
import Pusher from "pusher-js";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import ClockModal from "@/components/staff/ClockModal";
import api from "@/services/api";
import { useOrderCount } from "@/hooks/useOrderCount.jsx";
import { useTheme } from "@/context/ThemeContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigation } from "@/hooks/useNavigation";
import { useChat } from "@/context/ChatContext";
import { useBookingNotifications } from "@/context/BookingNotificationContext";
import { useRoomServiceNotifications } from "@/context/RoomServiceNotificationContext";

const DesktopSidebarNavbar = ({ chatUnreadCount }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  // Early return checks BEFORE any other hooks
  const searchParams = new URLSearchParams(location.search);
  const isMemoryMatchTournamentExact =
    /^\/games\/memory-match\/tournaments\/?$/.test(location.pathname) &&
    searchParams.get("hotel") === "hotel-killarney";

  // Hide navigation completely for non-authenticated users or users without permissions
  if (!user && isMemoryMatchTournamentExact) return null;
  if (!user) return null;
  
  // Now safe to use all hooks
  const hotelIdentifier = user?.hotel_slug;
  const { mainColor } = useTheme();
  const { totalUnread, markConversationRead } = useChat();
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const { hasNewBooking } = useBookingNotifications();
  const { hasNewRoomService, hasNewBreakfast } = useRoomServiceNotifications();
  const { roomServiceCount, breakfastCount, totalServiceCount } =
    useOrderCount(hotelIdentifier);
  
  // Debug logging
  useEffect(() => {
    console.log('📊 Desktop Sidebar Counts:', { 
      roomServiceCount, 
      breakfastCount, 
      totalServiceCount,
      hasNewRoomService,
      hasNewBreakfast
    });
  }, [roomServiceCount, breakfastCount, totalServiceCount, hasNewRoomService, hasNewBreakfast]);
  
  const [staffProfile, setStaffProfile] = useState(null);
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [flyoutOpen, setFlyoutOpen] = useState(false);

  const { canAccess } = usePermissions();
  const { visibleNavItems, hasNavigation } = useNavigation();
  const servicesRef = useRef(null);
  
  // Check if user has navigation permissions
  if (!hasNavigation) return null;

  // Define active path helpers
  const isPartialActive = (path) => {
    if (path === "/") return location.pathname === "/";
    
    // Handle paths with query parameters (like Games)
    if (path.includes('?')) {
      const pathWithoutQuery = path.split('?')[0];
      return location.pathname.startsWith(pathWithoutQuery);
    }
    
    return location.pathname.startsWith(path);
  };

  // Fetch staff profile
  useEffect(() => {
    if (!user) {
      setStaffProfile(null);
      setIsOnDuty(false);
      return;
    }
    api
      .get("/staff/me/")
      .then((res) => {
        setStaffProfile(res.data);
        setIsOnDuty(res.data.is_on_duty);
      })
      .catch(() => {
        setStaffProfile(null);
        setIsOnDuty(false);
      });
  }, [user]);

  // Collapse/expand sidebar
  useEffect(() => {
    document.body.classList.toggle("sidebar-collapsed", collapsed);
    if (collapsed) {
      setServicesDropdownOpen(false);
      setFlyoutOpen(false);
    }
  }, [collapsed]);

  // Close flyout if clicked outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (servicesRef.current && !servicesRef.current.contains(event.target)) {
        setFlyoutOpen(false);
      }
    }
    if (flyoutOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [flyoutOpen]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <>
      <nav
        className={`d-none d-lg-flex flex-column position-relative top-0 start-0 sidebar-nav-desktop vh-100 shadow-lg text-white  ${
          mainColor ? "" : "bg-info"
        }`}
        style={{
          width: collapsed ? "100px" : "260px",
          backgroundColor: mainColor || undefined,
          transition: "width 0.3s ease",
          zIndex: 1050,
        }}
      >
        <div className="d-flex justify-content-end p-3">
          <button
            className="btn btn-sm text-white"
            onClick={() => setCollapsed(!collapsed)}
          >
            <i className="bi bi-list" />
          </button>
        </div>

        <ul className="nav nav-pills flex-column mb-auto px-2">
          {user && (
             <li className="nav-item">
                <button
                  className="btn btn-success text-white w-100"
                  onClick={() => navigate(`/clock-in/${hotelIdentifier}`)}
                >
                  <i className="bi bi-clock" />
                {!collapsed && <span className="ms-2">Clock In / Out</span>}
                </button>
              </li>
          )}

          {staffProfile && (
            <li className="nav-item mb-2">
              <Link
                className="nav-link text-white d-flex "
                to={`/${hotelIdentifier}/staff/me`}
                title="Profile"
              >
                <i className="bi bi-person-circle" />
                {!collapsed && <span className="ms-2">Profile</span>}
              </Link>
            </li>
          )}

          {visibleNavItems.map((item) => {
            // Add order counts for room service and breakfast
            let orderCount = 0;
            if (item.slug === "room-service") orderCount = roomServiceCount;
            if (item.slug === "breakfast") orderCount = breakfastCount;
            if (item.slug === "chat") orderCount = totalUnread;
            
            const showNewBadge = 
              item.slug === "bookings" ? hasNewBooking : 
              item.slug === "chat" ? totalUnread > 0 : 
              item.slug === "room-service" ? hasNewRoomService :
              item.slug === "breakfast" ? hasNewBreakfast :
              false;

            // Show indicator if there's a count OR a new badge
            const hasNotification = orderCount > 0 || showNewBadge;
            
            return (
              <li className="nav-item" key={item.slug}>
                <Link
                  className={`nav-link text-white position-relative ${
                    isPartialActive(item.path) ? "active-icon-bg" : ""
                  }`}
                  to={item.path}
                  onClick={() => setCollapsed(true)}
                >
                  <i className={`bi bi-${item.icon} me-2`} />
                  {!collapsed && item.name}
                  
                  {/* When collapsed: show small dot if there are notifications or count */}
                  {collapsed && hasNotification && (
                    <span 
                      className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle"
                      style={{ width: '10px', height: '10px' }}
                    >
                      <span className="visually-hidden">New notifications</span>
                    </span>
                  )}
                  
                  {/* When expanded: show count badge */}
                  {!collapsed && orderCount > 0 && (
                    <span className="badge bg-danger ms-2 rounded-pill">
                      {orderCount}
                    </span>
                  )}
                  
                  {/* When expanded and NEW but no count: show NEW badge */}
                  {!collapsed && showNewBadge && orderCount === 0 && (
                    <span className="badge bg-danger ms-2">NEW</span>
                  )}
                </Link>
              </li>
            );
          })}

          {/* LOGIN / REGISTER if not logged in */}
          {!user && (
            <>
              <li className="nav-item mt-2">
                <Link
                  className="nav-link text-white d-flex align-items-center justify-content-center"
                  to="/login"
                  title="Login"
                  onClick={() => setCollapsed(true)}
                >
                  <i className="bi bi-box-arrow-in-right" />
                  {!collapsed && <span className="ms-2">Login</span>}
                </Link>
              </li>
              <li className="nav-item mt-2">
                <Link
                  className="nav-link text-white d-flex align-items-center justify-content-center"
                  to="/register"
                  title="Register"
                  onClick={() => setCollapsed(true)}
                >
                  <i className="bi bi-person-plus" />
                  {!collapsed && <span className="ms-2">Register</span>}
                </Link>
              </li>
            </>
          )}

          {/* LOGOUT if logged in */}
          {user && (
            <li className="nav-item mt-2">
              <button
                className="btn btn-link nav-link text-white d-flex "
                onClick={handleLogout}
                title="Logout"
                style={{ width: "100%", textAlign: "center" }}
              >
                <i className="bi bi-box-arrow-right" />
                {!collapsed && <span className="ms-2">Logout</span>}
              </button>
            </li>
          )}
        </ul>
      </nav>

      {staffProfile && (
        <ClockModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          staffId={staffProfile.id}
          initialStatus={isOnDuty}
          onStatusChange={(newStatus) => {
            setIsOnDuty(newStatus);
            setIsModalOpen(false);
          }}
        />
      )}
    </>
  );
};

export default DesktopSidebarNavbar;

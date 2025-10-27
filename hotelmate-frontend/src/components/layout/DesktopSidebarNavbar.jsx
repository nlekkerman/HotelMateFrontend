import React, { useState, useEffect, useRef } from "react";
import Pusher from "pusher-js";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import ClockModal from "@/components/staff/ClockModal";
import api from "@/services/api";
import { useOrderCount } from "@/hooks/useOrderCount.jsx";
import { useTheme } from "@/context/ThemeContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useChat } from "@/context/ChatContext";
import { useBookingNotifications } from "@/context/BookingNotificationContext";

const DesktopSidebarNavbar = ({ chatUnreadCount }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const hotelIdentifier = user?.hotel_slug;
  const { mainColor } = useTheme();
  const { totalUnread, markConversationRead } = useChat();
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const { hasNewBooking } = useBookingNotifications();
  const { roomServiceCount, breakfastCount, totalServiceCount } =
    useOrderCount(hotelIdentifier);
  const [staffProfile, setStaffProfile] = useState(null);
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [flyoutOpen, setFlyoutOpen] = useState(false);

  const { canAccess } = usePermissions();
  const servicesRef = useRef(null);

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

  const navItems = [
    {
      path: "/",
      label: "Home",
      icon: "house",
      roles: [
        "porter",
        "receptionist",
        "waiter",
        "bartender",
        "chef",
        "supervisor",
        "housekeeping_attendant",
        "manager",
        "technician",
        "security",
        "concierge",
        "leisure_staff",
        "maintenance_staff",
        "other",
      ],
    },
    {
      path: `/hotel/${hotelIdentifier}/chat`,
      label: "Chat",
      icon: "chat-dots", // Bootstrap icon
      roles: ["receptionist", "porter", "manager", "concierge", "staff_admin"],
      badge: totalUnread > 0 ? totalUnread : null,
    },
    {
      path: "/reception",
      label: "Reception",
      icon: "bell",
      feature: "reception",
      roles: ["receptionist", "manager", "concierge"],
    },
    {
      path: "/rooms",
      label: "Rooms",
      icon: "door-closed",
      feature: "reception",
      roles: ["receptionist", "manager"],
    },
    {
      path: `/${hotelIdentifier}/guests`,
      label: "Guests",
      icon: "people",
      feature: "reception",
      roles: ["receptionist", "manager"],
    },
    {
      path: `/roster/${hotelIdentifier}`,
      label: "Roster",
      icon: "calendar-week",
      feature: "roster",
      roles: ["manager", "staff_admin", "super_staff_admin"],
    },
    {
      path: `/${hotelIdentifier}/staff`,
      label: "Staff",
      icon: "person-badge",
      feature: "profile",
      roles: ["staff_admin", "super_staff_admin"],
    },
    {
      path: `/${hotelIdentifier}/restaurants`,
      label: "Restaurants",
      icon: "shop-window", // Bootstrap Icon for restaurants/buildings
      roles: ["manager", "staff_admin", "super_staff_admin"], // adjust as needed
    },

    {
      path: "/bookings",
      label: "Bookings",
      icon: "calendar-check",
      feature: "reception",
      roles: ["receptionist", "manager", "waiter"],
    },
    {
      path: "/maintenance",
      label: "Maintenance",
      icon: "tools",
      feature: "maintenance",
      roles: ["maintenance_staff", "manager", "super_staff_admin"],
    },
    {
      path: `/hotel_info/${hotelIdentifier}`,
      label: "Info",
      icon: "info-circle",
      feature: "reception",
      roles: ["receptionist", "manager"],
    },
    {
      path: `/good_to_know_console/${hotelIdentifier}`,
      label: "Good To Know",
      icon: "book",
      feature: "hotel_info",
      roles: ["staff_admin", "super_staff_admin"],
    },
    {
      path: `/stock_tracker/${hotelIdentifier}`,
      label: "Stock Dashboard",
      icon: "graph-up",
      feature: "stock_tracker",
      roles: ["chef", "bartender", "manager"],
    },
    {
      path: `/games/?hotel=${hotelIdentifier}`,
      label: "Games",
      icon: "controller",
      feature: "games",
      roles: ["manager", "staff_admin", "super_staff_admin"],
    },
  ];

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
          {staffProfile && (
             <li className="nav-item">
                <button
                  className="btn btn-success text-white"
                  onClick={() => navigate("/clock-in/hotel-killarney")}
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

          {navItems
  .filter((item) => canAccess(item.roles))
  .map((item) => {
    const showNewBadge =
      item.path === "/bookings" ? hasNewBooking : item.path === `/hotel/${hotelIdentifier}/chat` ? totalUnread > 0 : false;

    return (
      <li className="nav-item" key={item.path}>
        <Link
          className={`nav-link text-white ${
            isPartialActive(item.path) ? "active-icon-bg" : ""
          }`}
          to={item.path}
          onClick={() => setCollapsed(true)}
        >
          <i className={`bi bi-${item.icon} me-2`} />
          {!collapsed && item.label}
          {showNewBadge && (
            <span className="badge bg-danger ms-2">NEW</span>
          )}
        </Link>
      </li>
    );
  })}


          {servicesDropdownOpen !== null && (
            <li className="nav-item" ref={servicesRef}>
              <div
                className={`nav-link d-flex align-items-center  text-white ${
                  collapsed ? "justify-content-start" : "justify-content-start"
                }`}
                style={{ cursor: "pointer" }}
                onClick={() => setServicesDropdownOpen(!servicesDropdownOpen)}
                title={collapsed ? "Services" : ""} // Tooltip when collapsed
              >
                {/* Icon always visible */}
                <i className="bi bi-cup-hot me-2" />

                {/* Show text + badge + chevron only if expanded */}
                {!collapsed && (
                  <>
                    <span>Services</span>
                    {roomServiceCount + breakfastCount > 0 && (
                      <span className="badge bg-danger ms-2">
                        {roomServiceCount + breakfastCount}
                      </span>
                    )}
                    <i
                      className={`ms-3 bi bi-chevron-${
                        servicesDropdownOpen ? "up" : "down"
                      }`}
                      style={{ fontSize: "0.8rem" }}
                    />
                  </>
                )}
              </div>

              {/* Submenu only when expanded */}
              {!collapsed && servicesDropdownOpen && (
                <ul className="nav flex-column ms-3">
                  {[
                    {
                      label: "Room Service",
                      icon: "box",
                      count: roomServiceCount,
                    },
                    {
                      label: "Breakfast",
                      icon: "egg-fried",
                      count: breakfastCount,
                    },
                  ].map(({ label, icon, count }) => (
                    <li className="nav-item" key={label}>
                      <Link
                        className="nav-link text-white d-flex 
              "
                        to={`/services/${label
                          .toLowerCase()
                          .replace(" ", "-")}`}
                        onClick={() => setCollapsed(true)}
                      >
                        <div>
                          <i className={`bi bi-${icon} me-2`} />
                          {label}
                        </div>
                        {count > 0 && (
                          <span className="badge bg-danger ms-2">{count}</span>
                        )}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )}

          {/* SETTINGS if super admin */}
          {canAccess(["super_staff_admin"]) && (
            <li className="nav-item mt-2">
              <Link
                className="nav-link text-white d-flex "
                to="/settings"
                title="Settings"
                onClick={() => setCollapsed(true)}
              >
                <i className="bi bi-gear" />
                {!collapsed && <span className="ms-2">Settings</span>}
              </Link>
            </li>
          )}

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

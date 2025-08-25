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

const DesktopSidebarNavbar = ({ chatUnreadCount }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const hotelIdentifier = user?.hotel_slug;
  const { mainColor } = useTheme();
  const { totalUnread, markConversationRead } = useChat();
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);

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
  const isExactActive = (path) => location.pathname === path;
  const isPartialActive = (path) => location.pathname.startsWith(path);

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
      roles: ["receptionist", "manager"],
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
  ];

  return (
    <>
      <nav
        className={`d-none d-lg-flex flex-column position-relative top-0 start-0 sidebar-nav-desktop vh-100 shadow-lg text-white  ${
          mainColor ? "" : "bg-dark"
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
          {navItems
            .filter((item) => canAccess(item.roles))
            .map(({ path, label, icon, badge }) => (
              <li className="nav-item" key={path}>
                <Link
                  className={`nav-link text-white ${
                    isPartialActive(path) ? "bg-opacity-25" : ""
                  }`}
                  to={path}
                  onClick={() => setCollapsed(true)}
                >
                  <i className={`bi bi-${icon} me-2`} />
                  {!collapsed && label}
                  {badge && (
                    <span className="badge bg-danger ms-2">{badge}</span>
                  )}
                </Link>
              </li>
            ))}
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

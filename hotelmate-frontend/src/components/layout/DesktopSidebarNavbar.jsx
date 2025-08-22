import React, { useState, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import ClockModal from "@/components/staff/ClockModal";
import api from "@/services/api";
import { useOrderCount } from "@/hooks/useOrderCount.jsx";
import { useTheme } from "@/context/ThemeContext";
import { usePermissions } from "@/hooks/usePermissions";

const DesktopSidebarNavbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const hotelIdentifier = user?.hotel_slug;
  const { mainColor } = useTheme();

  const { roomServiceCount, breakfastCount, totalServiceCount } =
    useOrderCount(hotelIdentifier);
  const [staffProfile, setStaffProfile] = useState(null);
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const [flyoutOpen, setFlyoutOpen] = useState(false);

  const { canAccess } = usePermissions();
  const servicesRef = useRef(null);

  // Define active path helpers
  const isExactActive = (path) => location.pathname === path;
  const isPartialActive = (path) => {
    if (path === "/") {
      return location.pathname === "/";
    }
    return location.pathname.startsWith(path);
  };

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
    roles: ["receptionist", "porter", "manager", "concierge", "staff_admin"], // adjust roles
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
        className={`d-none d-lg-flex flex-column position-relative top-0 start-0 sidebar-nav-desktop vh-100 shadow-lg text-white main-bg ${
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
          {/* Clock In/Out as Link for consistent hover/active */}
          {user?.is_superuser && (
            <li className="nav-item">
              <Link
                to={`/clock-in/${hotelIdentifier}`}
                className={`nav-link text-white ${
                  isExactActive(`/clock-in/${hotelIdentifier}`)
                    ? "bg-opacity-25"
                    : ""
                }`}
                onClick={() => setCollapsed(true)}
              >
                <i className="bi bi-clock me-2" />
                {!collapsed && "Clock In / Out"}
              </Link>
            </li>
          )}

          {!user ? (
            <>
              <li className="nav-item">
                <Link
                  className={`nav-link text-white ${
                    isExactActive("/login") ? "bg-opacity-25" : ""
                  }`}
                  to="/login"
                >
                  <i className="bi bi-box-arrow-in-right me-2" />
                  {!collapsed && "Login"}
                </Link>
              </li>
              <li className="nav-item">
                <Link
                  className={`nav-link text-white ${
                    isExactActive("/register") ? "bg-opacity-25" : ""
                  }`}
                  to="/register"
                >
                  <i className="bi bi-person-plus me-2" />
                  {!collapsed && "Register"}
                </Link>
              </li>
            </>
          ) : (
            <>
              {canAccess([
                "receptionist",
                "porter",
                "waiter",
                "manager",
                "chef",
                "staff_admin",
                "super_staff_admin",
                "concierge",
                "maintenance_staff",
                "housekeeping_attendant",
              ]) && (
                <li className="nav-item">
                  <Link
                    className={`nav-link text-white ${
                      isExactActive(`/${hotelIdentifier}/staff/me`)
                        ? "bg-opacity-25"
                        : ""
                    }`}
                    to={`/${hotelIdentifier}/staff/me`}
                    onClick={() => setCollapsed(true)}
                  >
                    <i className="bi bi-person-circle me-2" />
                    {!collapsed && "Profile"}
                  </Link>
                </li>
              )}

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

              {/* Services parent nav item */}
              {canAccess([
                "receptionist",
                "porter",
                "waiter",
                "manager",
                "chef",
              ]) && (
                <li className="nav-item" ref={servicesRef}>
                  <div
                    className={`nav-link text-white d-flex align-items-center justify-content-between ${
                      isPartialActive("/services") ? "bg-opacity-25" : ""
                    }`}
                    style={{ cursor: "pointer" }}
                    onClick={() => setFlyoutOpen(!flyoutOpen)}
                  >
                    <div className="d-flex align-items-center">
                      <i className="bi bi-cup-hot me-2" />
                      {!collapsed && "Services"}
                    </div>

                    <div className="d-flex align-items-center">
                      {totalServiceCount > 0 && (
                        <span className="badge bg-danger me-2">
                          {totalServiceCount}
                        </span>
                      )}
                      {!collapsed && (
                        <i
                          className={`bi ${
                            flyoutOpen ? "bi-chevron-up" : "bi-chevron-down"
                          } transition-transform`}
                        />
                      )}
                    </div>
                  </div>

                  {flyoutOpen && (
                    <ul className="nav flex-column mt-1">
                      <li className="nav-item">
                        <Link
                          className={`nav-link text-white ${
                            isPartialActive("/services/room-service")
                              ? "bg-opacity-25"
                              : ""
                          } d-flex align-items-center justify-content-between`}
                          to="/services/room-service"
                          onClick={() => setCollapsed(true)}
                          style={{ whiteSpace: "nowrap" }}
                        >
                          <div>
                            <i className="bi bi-box me-2 ms-2" />
                            {!collapsed && "Room Service"}
                          </div>
                          {roomServiceCount > 0 && (
                            <span className="badge bg-danger ms-2">
                              {roomServiceCount}
                            </span>
                          )}
                        </Link>
                      </li>

                      <li className="nav-item">
                        <Link
                          className={`nav-link text-white ${
                            isPartialActive("/services/breakfast")
                              ? "bg-opacity-25"
                              : ""
                          } d-flex align-items-center justify-content-between`}
                          to="/services/breakfast"
                          onClick={() => setCollapsed(true)}
                          style={{ whiteSpace: "nowrap" }}
                        >
                          <div>
                            <i className="bi bi-egg-fried me-2 ms-2" />
                            {!collapsed && "Breakfast"}
                          </div>
                          {breakfastCount > 0 && (
                            <span className="badge bg-danger ms-2">
                              {breakfastCount}
                            </span>
                          )}
                        </Link>
                      </li>
                    </ul>
                  )}
                </li>
              )}

              {/* Show Settings only if user is Django superuser */}
              {user?.is_superuser && (
                <li className="nav-item">
                  <Link
                    className={`nav-link text-white ${
                      isExactActive("/settings") ? "bg-opacity-25" : ""
                    }`}
                    to="/settings"
                    onClick={() => setCollapsed(true)}
                  >
                    <i className="bi bi-gear me-2" />
                    {!collapsed && "Settings"}
                  </Link>
                </li>
              )}

              <li className="nav-item mt-3">
                <button
                  className="btn btn-link text-white w-100 text-start"
                  onClick={handleLogout}
                >
                  <i className="bi bi-box-arrow-right me-2" />
                  {!collapsed && "Logout"}
                </button>
              </li>
            </>
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

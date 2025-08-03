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

  const isActive = (path) => location.pathname.startsWith(path);

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
      path: "/staff",
      label: "Staff",
      icon: "person-badge",
      feature: "profile",
      roles: ["staff_admin", "super_staff_admin"],
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
        className={`d-none d-lg-flex flex-column position-relative top-0 start-0 sidebar-nav-desktop vh-100 shadow-sm text-white main-bg ${
          mainColor ? "" : "bg-dark"
        }`}
        style={{
          width: collapsed ? "90px" : "260px",
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
          {!user ? (
            <>
              <li className="nav-item">
                <Link className="nav-link text-white" to="/login">
                  <i className="bi bi-box-arrow-in-right me-2" />
                  {!collapsed && "Login"}
                </Link>
              </li>
              <li className="nav-item">
                <Link className="nav-link text-white" to="/register">
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
                      isActive("/staff/me") ? "bg-opacity-25" : ""
                    }`}
                    to="/staff/me"
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
                        isActive(path) ? "bg-opacity-25" : ""
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
                      isActive("/services") ? "bg-opacity-25" : ""
                    }`}
                    style={{ cursor: "default" }}
                    onClick={() => setFlyoutOpen(!flyoutOpen)}
                  >
                    <div>
                      <i className="bi bi-cup-hot me-2" />
                      {!collapsed && "Services"}
                    </div>
                    {totalServiceCount > 0 && (
                      <span className="badge bg-danger ms-2">
                        {totalServiceCount}
                      </span>
                    )}
                  </div>

                  {flyoutOpen && (
                    <ul className="nav flex-column mt-1">
                      <li className="nav-item">
                        <Link
                          className={`nav-link text-white ${
                            isActive("/services/room-service")
                              ? "bg-opacity-25"
                              : ""
                          } d-flex align-items-center justify-content-between`}
                          to="/services/room-service"
                          onClick={() => setCollapsed(true)}
                          style={{ whiteSpace: "nowrap" }}
                        >
                          <div>
                            <i className="bi bi-box me-2" />
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
                            isActive("/services/breakfast")
                              ? "bg-opacity-25"
                              : ""
                          } d-flex align-items-center justify-content-between`}
                          to="/services/breakfast"
                          onClick={() => setCollapsed(true)}
                          style={{ whiteSpace: "nowrap" }}
                        >
                          <div>
                            <i className="bi bi-egg-fried me-2" />
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
                      isActive("/settings") ? "bg-opacity-25" : ""
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

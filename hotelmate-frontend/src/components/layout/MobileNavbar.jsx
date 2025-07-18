import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import ClockModal from "@/components/staff/ClockModal";
import api from "@/services/api";
import logo from "@/assets/hotel-mate.png";
import { useOrderCount } from "@/hooks/useOrderCount.jsx";
import { useTheme } from "@/context/ThemeContext";
import { usePermissions } from "@/hooks/usePermissions";

const MobileNavbar = () => {
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

  const { canAccess } = usePermissions(staffProfile);

  useEffect(() => {
    if (!user) {
      setStaffProfile(null);
      return;
    }
    api
      .get("/staff/me/")
      .then((res) => {
        setStaffProfile(res.data);
        setIsOnDuty(res.data.is_on_duty);
      })
      .catch(() => setStaffProfile(null));
  }, [user]);

  const toggleNavbar = () => setCollapsed((prev) => !prev);
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    {
      path: "/reception",
      label: "Reception",
      icon: "house",
      roles: ["receptionist", "manager", "concierge"],
    },
    {
      path: "/rooms",
      label: "Rooms",
      icon: "door-closed",
      roles: ["receptionist", "manager"],
    },
    {
      path: `/${hotelIdentifier}/guests`,
      label: "Guests",
      icon: "people",
      roles: ["receptionist", "manager"],
    },
    {
      path: "/staff",
      label: "Staff",
      icon: "person-badge",
      roles: ["staff_admin", "super_staff_admin"],
    },
    {
      path: "/bookings",
      label: "Bookings",
      icon: "calendar-check",
      roles: ["receptionist", "manager"],
    },
    {
      path: "/maintenance",
      label: "Maintenance",
      icon: "tools",
      roles: ["maintenance_staff", "manager", "super_staff_admin"],
    },
    {
      path: `/hotel_info/${hotelIdentifier}`,
      label: "Info",
      icon: "info-circle",
      roles: ["receptionist", "manager"],
    },
    {
      path: `/good_to_know_console/${hotelIdentifier}`,
      label: "Good To Know",
      icon: "book",
      roles: ["staff_admin", "super_staff_admin"],
    },
    {
      path: `/stock_tracker/${hotelIdentifier}`,
      label: "Stock Dashboard",
      icon: "graph-up",
      roles: ["chef", "bartender", "manager"],
    },
    {
      path: "/settings",
      label: "Settings",
      icon: "gear",
      roles: ["super_staff_admin"],
    },
  ];
  // Services nav items — handled separately due to dropdown behavior
  const servicesNavItems = [
    {
      path: "/services/room-service",
      label: "Room Service",
      icon: "box",
      roles: ["receptionist", "porter", "waiter", "manager"],
    },
    {
      path: "/services/breakfast",
      label: "Breakfast",
      icon: "egg-fried",
      roles: ["receptionist", "porter", "waiter", "manager"],
    },
  ];
  const isActive = (path) => location.pathname.startsWith(path);

  // Hide navbar on some paths when not logged in
  const hiddenNavPatterns = [
    /^\/room_services\/[^/]+\/room\/[^/]+\/breakfast\/?$/,
    /^\/room_services\/[^/]+\/room\/[^/]+\/menu\/?$/,
    /^\/hotel_info\/[^/]+(\/[^/]+)?\/?$/,
  ];
  if (!user && hiddenNavPatterns.some((re) => re.test(location.pathname)))
    return null;

  return (
    <nav
      className={`navbar navbar-expand-lg text-white shadow-sm main-bg ${
        mainColor ? "" : "bg-dark"
      }`}
      style={mainColor ? { backgroundColor: mainColor } : {}}
    >
      <div className="container-fluid">
        <Link to="/" className="flex items-center space-x-2 logo-container">
          <img
            src={logo}
            alt="HotelMate Logo"
            className="h-10 w-auto drop-shadow-md logo-image"
          />
        </Link>

        <div className="position-relative d-inline-block">
  <button
    className="navbar-toggler bg-transparent border-0 shadow-lg"
    type="button"
    aria-controls="navbarSupportedContent"
    aria-expanded={!collapsed}
    aria-label="Toggle navigation"
    onClick={toggleNavbar}
  >
    <span
      className="navbar-toggler-icon"
      style={{ filter: "invert(1)" }}
    />
  </button>

  {totalServiceCount > 0 && (
<span className="position-absolute top-0 start-0 translate-middle badge rounded-pill bg-danger">
      {totalServiceCount}
    </span>
  )}
</div>

        <div className={`collapse navbar-collapse ${!collapsed ? "show" : ""}`}>
          <ul className="navbar-nav ms-auto mb-2 mb-lg-0 gap-3 shadow-lg p-2 rounded m-2">
            {!user && (
              <>
                <li className="nav-item">
                  <Link
                    className={`nav-link ${
                      isActive("/login") ? "active" : ""
                    } text-white`}
                    to="/login"
                    onClick={toggleNavbar}
                  >
                    Login
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    className={`nav-link ${
                      isActive("/register") ? "active" : ""
                    } text-white`}
                    to="/register"
                    onClick={toggleNavbar}
                  >
                    Register
                  </Link>
                </li>
              </>
            )}

            {user && (
              <>
                {staffProfile && (
                  <li className="nav-item">
                    <button
                      className={`btn custom-button btn-${isOnDuty ? "success" : "danger"}`}
                      onClick={() => setIsModalOpen(true)}
                    >
                      {isOnDuty ? "Clock Out" : "Clock In"}
                    </button>
                  </li>
                )}

                {navItems
                  .filter((item) => canAccess(item.roles))
                  .map(({ path, label, icon }) => (
                    <li className="nav-item" key={path}>
                      <Link
                        className={`nav-link ${
                          isActive(path) ? "active" : ""
                        } text-white`}
                        to={path}
                        onClick={toggleNavbar}
                      >
                        <i className={`bi bi-${icon} me-2`} />
                        {label}
                      </Link>
                    </li>
                  ))}

                {/* Services dropdown with badges */}
                {servicesNavItems.some(({ roles }) => canAccess(roles)) && (
                  <li className="nav-item dropdown">
                    <div
                      className="nav-link d-flex justify-content-between align-items-center text-white"
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        setServicesDropdownOpen(!servicesDropdownOpen)
                      }
                    >
                      <span>
                        <i className="bi bi-cup-hot me-2" />
                        Services
                      </span>

                      {roomServiceCount + breakfastCount > 0 && (
                        <span className="badge bg-danger ms-2">
                          {roomServiceCount + breakfastCount}
                        </span>
                      )}

                      <i
                        className={`bi bi-chevron-${
                          servicesDropdownOpen ? "up" : "down"
                        }`}
                        style={{ fontSize: "0.8rem" }}
                      />
                    </div>

                    {servicesDropdownOpen && (
                      <ul className="nav flex-column ms-3">
                        {servicesNavItems
                          .filter(({ roles }) => canAccess(roles))
                          .map(({ path, label, icon }) => {
                            const badgeCount =
                              label === "Room Service"
                                ? roomServiceCount
                                : label === "Breakfast"
                                ? breakfastCount
                                : 0;

                            return (
                              <li className="nav-item" key={path}>
                                <Link
                                  className={`nav-link text-white d-flex justify-content-between align-items-center ${
                                    isActive(path) ? "active" : ""
                                  }`}
                                  to={path}
                                  onClick={() => {
                                    toggleNavbar();
                                    setServicesDropdownOpen(false);
                                  }}
                                >
                                  <div>
                                    <i className={`bi bi-${icon} me-2`} />
                                    {label}
                                  </div>
                                  {badgeCount > 0 && (
                                    <span className="badge bg-danger ms-2">
                                      {badgeCount}
                                    </span>
                                  )}
                                </Link>
                              </li>
                            );
                          })}
                      </ul>
                    )}
                  </li>
                )}

                <li className="nav-item">
                  <button
                    className="btn btn-link nav-link"
                    onClick={handleLogout}
                  >
                    Logout
                  </button>
                </li>
              </>
            )}
          </ul>
        </div>
      </div>

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
    </nav>
  );
};

export default MobileNavbar;

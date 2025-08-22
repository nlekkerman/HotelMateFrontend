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

  // Use usePermissions WITHOUT argument — it reads roles from localStorage inside
  const { canAccess } = usePermissions();

  useEffect(() => {
    if (!user) {
      setStaffProfile(null);
      return;
    }
    api
      .get(`/staff/me/`)
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
      path: `/roster/${hotelIdentifier}`,
      label: "Roster",
      icon: "calendar-week",
      feature: "roster",
      roles: ["manager", "staff_admin", "super_staff_admin"],
    },
    {
      path: `/${hotelIdentifier}/restaurants`,
      label: "Restaurants",
      icon: "shop-window", // Bootstrap Icon for restaurants/buildings
      roles: ["manager", "staff_admin", "super_staff_admin"], // adjust as needed
    },
    {
      path: `/${hotelIdentifier}/staff`,
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

  const hiddenNavPatterns = [
    /^\/room_services\/[^/]+\/room\/[^/]+\/breakfast\/?$/,
    /^\/room_services\/[^/]+\/room\/[^/]+\/menu\/?$/,
    /^\/hotel_info\/[^/]+(\/[^/]+)?\/?$/,
  ];
  if (!user && hiddenNavPatterns.some((re) => re.test(location.pathname)))
    return null;

  return (
    <nav
      className={`navbar navbar-expand-lg text-white main-bg shadow-lg  ${
        mainColor ? "" : "bg-dark"
      }`}
      style={mainColor ? { backgroundColor: mainColor } : {}}
    >
      <div className="container-fluid ">
        <div className="position-relative d-inline-block ms-auto ">
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
            {user?.is_superuser && (
  <li className="nav-item">
    <button
      className="btn btn-primary text-white w-100"
      onClick={() => navigate("/clock-in/hotel-killarney")}
    >
      <i className="bi bi-clock me-2" />
      Clock In / Out
    </button>
  </li>
)}

            
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
                        isActive(`/${hotelIdentifier}/staff/me`) ? "active" : ""
                      }`}
                      to={`/${hotelIdentifier}/staff/me`}
                      onClick={toggleNavbar}
                    >
                      <i className="bi bi-person-circle me-2" />
                      Profile
                    </Link>
                  </li>
                )}
            
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

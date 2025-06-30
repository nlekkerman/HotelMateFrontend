import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import ClockModal from "@/components/staff/ClockModal";
import api from "@/services/api";
import { useOrderCount } from "@/hooks/useOrderCount.jsx";
import { useTheme } from "@/context/ThemeContext";

const DesktopSidebarNavbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const hotelIdentifier = user?.hotel_slug;
  const { mainColor } = useTheme();

  const { count: newOrderCount } = useOrderCount(hotelIdentifier);
  const [staffProfile, setStaffProfile] = useState(null);
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);

  useEffect(() => {
    if (!user) return setStaffProfile(null);
    api
      .get("/staff/me/")
      .then((res) => {
        setStaffProfile(res.data);
        setIsOnDuty(res.data.is_on_duty);
      })
      .catch(() => setStaffProfile(null));
  }, [user]);

  useEffect(() => {
    document.body.classList.toggle("sidebar-collapsed", collapsed);
  }, [collapsed]);

  const pathname = location.pathname;
  const isSuperUser = user?.is_superuser;
  const accessLevel = staffProfile?.access_level;
  const isStaffAdmin = accessLevel === "staff_admin";
  const isSuperStaffAdmin = accessLevel === "super_staff_admin";
  const showFullNav = isSuperUser || isSuperStaffAdmin || isStaffAdmin;
  const isActive = (path) => pathname.startsWith(path);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { path: "/", label: "Reception", icon: "house" },
    { path: "/rooms", label: "Rooms", icon: "door-closed" },
    { path: `/${hotelIdentifier}/guests`, label: "Guests", icon: "people" },
    { path: "/staff", label: "Staff", icon: "person-badge" },
    { path: "/staff/me", label: "Profile", icon: "person-circle" },
    { path: "/bookings", label: "Bookings", icon: "calendar-check" },
    {
      path: `/hotel_info/${hotelIdentifier}`,
      label: "Info",
      icon: "info-circle",
    },

    ...(isSuperStaffAdmin
      ? [{ path: "/settings", label: "Settings", icon: "gear" }]
      : []),
    {
      path: `/stock_tracker/${hotelIdentifier}`,
      label: "Stock Dashboard",
      icon: "graph-up",
    },
  ];

  return (
    <>
      <nav
        className={`d-none d-lg-flex flex-column position-relative top-0 start-0 bg-main sidebar-nav-desktop vh-100 shadow-sm text-white main-bg ${
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
              {staffProfile && (
                <li className="nav-item mb-2">
                  <button
                    className={`btn w-100 text-start text-white btn-${
                      isOnDuty ? "success" : "danger"
                    }`}
                    onClick={() => setIsModalOpen(true)}
                  >
                    <i className="bi bi-clock me-2" />
                    {!collapsed && (isOnDuty ? "Clock Out" : "Clock In")}
                  </button>
                </li>
              )}
              {showFullNav &&
                navItems.map(({ path, label, icon, badge }) => (
                  <li className="nav-item" key={path}>
                    <Link
                      className={`nav-link text-white ${
                        isActive(path) ? " bg-opacity-25" : ""
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
              {/* Services Dropdown */}
              {showFullNav && (
                <li className="nav-item">
                  <div
                    className={`nav-link text-white d-flex justify-content-between align-items-center ${
                      isActive("/services") ? "bg-opacity-25" : ""
                    }`}
                    onClick={() =>
                      setServicesDropdownOpen(!servicesDropdownOpen)
                    }
                    style={{ cursor: "pointer" }}
                  >
                    <span className="d-flex align-items-center">
                      <i className="bi bi-cup-hot me-2" />
                      {!collapsed && "Services"}
                    </span>
                    {!collapsed && (
                      <span className="d-flex align-items-center">
                        {newOrderCount > 0 && (
                          <span className="badge bg-danger me-2">
                            {newOrderCount}
                          </span>
                        )}
                        <i
                          className={`bi bi-chevron-${
                            servicesDropdownOpen ? "up" : "down"
                          }`}
                          style={{ fontSize: "0.8rem" }}
                        />
                      </span>
                    )}
                  </div>

                  {!collapsed && servicesDropdownOpen && (
                    <ul className="nav flex-column ms-4 mt-1">
                      <li className="nav-item">
                        <Link
                          className={`nav-link text-white ${
                            isActive(`/services/room-service`)
                              ? "bg-opacity-25"
                              : ""
                          }`}
                          to="/services/room-service"
                          onClick={() => setCollapsed(true)}
                        >
                          <i className="bi bi-box me-2" />
                          Room Service
                          {newOrderCount > 0 && (
                            <span className="badge bg-danger ms-2">
                              {newOrderCount}
                            </span>
                          )}
                        </Link>
                      </li>
                      <li className="nav-item">
                        <Link
                          className={`nav-link text-white ${
                            isActive(`/services/breakfast`)
                              ? "bg-opacity-25"
                              : ""
                          }`}
                          to="/services/breakfast"
                          onClick={() => setCollapsed(true)}
                        >
                          <i className="bi bi-egg-fried me-2" />
                          Breakfast
                        </Link>
                      </li>
                    </ul>
                  )}
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

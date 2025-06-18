import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import ClockModal from "@/components/staff/ClockModal";
import api from "@/services/api";
import logo from "@/assets/hotel-mate.png";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const hotelIdentifier = user?.hotel_slug;

  const [staffProfile, setStaffProfile] = useState(null);
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

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
  // ─── Now we can decide whether to render ───
  const { pathname } = location;
  const hiddenNavPatterns = [
    /^\/room_services\/[^/]+\/room\/[^/]+\/breakfast\/?$/,
    /^\/room_services\/[^/]+\/room\/[^/]+\/menu\/?$/,
    /^\/hotel_info\/[^/]+(\/[^/]+)?\/?$/,
  ];
  if (!user && hiddenNavPatterns.some((re) => re.test(pathname))) {
    return null;
  }

  const toggleNavbar = () => setCollapsed((prev) => !prev);
  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  // Permission checks
  const isSuperUser = user?.is_superuser;
  const accessLevel = staffProfile?.access_level;
  const isStaffAdmin = accessLevel === "staff_admin";
  const isSuperStaffAdmin = accessLevel === "super_staff_admin";
  const showFullNav = isSuperUser || isSuperStaffAdmin || isStaffAdmin;
  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <nav className="navbar navbar-expand-lg bg-danger text-white shadow-sm main-bg">
      <div className="container-fluid">
        <Link to="/" className="flex items-center space-x-2 logo-container">
         
        </Link>
        <Link to="/" className="flex items-center space-x-2 logo-container">
          <img
            src={logo}
            alt="HotelMate Logo"
            className="h-10 w-auto drop-shadow-md logo-image"
          />
        </Link>
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
          ></span>
        </button>

        <div className={`collapse navbar-collapse ${!collapsed ? "show" : ""}`}>
          <ul className="navbar-nav ms-auto mb-2 mb-lg-0 gap-3 shadow-lg p-2 rounded m-2">
            {!user && (
              <>
                <li className="nav-item">
                  <Link
                    className={`nav-link ${
                      isActive("/login") && "active"
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
                      isActive("/register") && "active"
                    } text-white`}
                    to="/register"
                    onClick={toggleNavbar}
                  >
                    Register
                  </Link>
                </li>
              </>
            )}

            {user && !showFullNav && (
              <>
                {staffProfile && (
                  <li className="nav-item">
                    <button
                      className={`btn btn-${isOnDuty ? "success" : "danger"}`}
                      onClick={() => setIsModalOpen(true)}
                    >
                      {isOnDuty ? "Clock Out" : "Clock In"}
                    </button>
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

            {user && showFullNav && (
              <>
                {staffProfile && (
                  <li className="nav-item">
                    <button
                      className={`btn btn-${isOnDuty ? "success" : "danger"}`}
                      onClick={() => setIsModalOpen(true)}
                    >
                      {isOnDuty ? "Clock Out" : "Clock In"}
                    </button>
                  </li>
                )}
                <li className="nav-item">
                  <Link
                    className={`nav-link ${isActive("/") && "active"}`}
                    to="/"
                    onClick={toggleNavbar}
                  >
                    Reception
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    className={`nav-link ${isActive("/rooms") && "active"}`}
                    to="/rooms"
                    onClick={toggleNavbar}
                  >
                    Rooms
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    className={`nav-link ${
                      isActive(`/${hotelIdentifier}/guests`) && "active"
                    }`}
                    to={`/${hotelIdentifier}/guests`}
                    onClick={toggleNavbar}
                  >
                    Guests
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    className={`nav-link ${isActive("/staff") && "active"}`}
                    to="/staff"
                    onClick={toggleNavbar}
                  >
                    Staff
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    className={`nav-link ${isActive("/staff/me") && "active"}`}
                    to="/staff/me"
                    onClick={toggleNavbar}
                  >
                    Profile
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    className={`nav-link ${isActive("/bookings") && "active"}`}
                    to="/bookings"
                    onClick={toggleNavbar}
                  >
                    Bookings
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    className={`nav-link ${
                      isActive(`/hotel_info/${hotelIdentifier}`) && "active"
                    }`}
                    to={`/hotel_info/${hotelIdentifier}`}
                    onClick={toggleNavbar}
                  >
                    Info
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    className={`nav-link ${
                      isActive(`/room_services/${hotelIdentifier}/orders`) &&
                      "active"
                    }`}
                    to={`/room_services/${hotelIdentifier}/orders`}
                    onClick={toggleNavbar}
                  >
                    Room Service
                  </Link>
                </li>
                {isSuperStaffAdmin && (
                  <li className="nav-item">
                    <Link
                      className={`nav-link ${
                        isActive("/settings") && "active"
                      }`}
                      to="/settings"
                      onClick={toggleNavbar}
                    >
                      Settings
                    </Link>
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

export default Navbar;

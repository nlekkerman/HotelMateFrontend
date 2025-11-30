import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import ClockModal from "@/components/staff/ClockModal";
import api from "@/services/api";
import logo from "@/assets/hotel-mate.png";
import { useOrderCount } from "@/hooks/useOrderCount.jsx";
import { useTheme } from "@/context/ThemeContext";
import MessengerWidget from "@/staff_chat/components/MessengerWidget";


const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const hotelIdentifier = user?.hotel_slug;
    const { mainColor } = useTheme();

  const { count: newOrderCount, refresh: refreshCount } =
    useOrderCount(hotelIdentifier);
  const [staffProfile, setStaffProfile] = useState(null);
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChatExpanded, setIsChatExpanded] = useState(false);

  useEffect(() => {
    if (!user) {
      setStaffProfile(null);
      return;
    }
    
    const hotelSlug = user?.hotel_slug;
    if (hotelSlug) {
      api
        .get(`/staff/hotel/${hotelSlug}/me/`)
        .then((res) => {
          setStaffProfile(res.data);
          setIsOnDuty(res.data.is_on_duty);
        })
        .catch(() => {
          // Fallback to old endpoint
          api
            .get("/staff/me/")
            .then((res) => {
              setStaffProfile(res.data);
              setIsOnDuty(res.data.is_on_duty);
            })
            .catch(() => setStaffProfile(null));
        });
    } else {
      api
        .get("/staff/me/")
        .then((res) => {
          setStaffProfile(res.data);
          setIsOnDuty(res.data.is_on_duty);
        })
        .catch(() => setStaffProfile(null));
    }
  }, [user]);
  // ─── Now we can decide whether to render ───
  const { pathname } = location;
  const hiddenNavPatterns = [
    /^\/room_services\/[^/]+\/room\/[^/]+\/breakfast\/?$/,
    /^\/room_services\/[^/]+\/room\/[^/]+\/menu\/?$/,
    /^\/hotel_info\/[^/]+(\/[^/]+)?\/?$/,
  ];
  // Hide nav for certain private routes when user is anonymous.
  // Also hide for the exact public tournament view: /games/memory-match/tournaments?hotel=hotel-killarney
  const searchParams = new URLSearchParams(location.search);
  const isMemoryMatchTournamentExact =
    /^\/games\/memory-match\/tournaments\/?$/.test(pathname) &&
    searchParams.get("hotel") === "hotel-killarney";

  if (!user && (hiddenNavPatterns.some((re) => re.test(pathname)) || isMemoryMatchTournamentExact)) {
    return null;
  }

  const toggleNavbar = () => setCollapsed((prev) => !prev);
  const handleLogout = () => {
    logout();
    // Use window.location for a full page reload to ensure clean state
    window.location.href = "/login";
  };

  // Permission checks
  const isSuperUser = user?.is_superuser;
  const accessLevel = staffProfile?.access_level;
  const isStaffAdmin = accessLevel === "staff_admin";
  const isSuperStaffAdmin = accessLevel === "super_staff_admin";
  const showFullNav = isSuperUser || isSuperStaffAdmin || isStaffAdmin;
  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <nav
      className={`navbar navbar-expand-lg text-white shadow-sm main-bg ${
        mainColor ? "" : "bg-dark"
      }`}
      style={mainColor ? { backgroundColor: mainColor } : {}}
    >
      <div className="container-fluid">
        {/* Left side: Logo */}
        <Link to="/" className="flex items-center space-x-2 logo-container">
          <img
            src={logo}
            alt="HotelMate Logo"
            className="h-10 w-auto drop-shadow-md logo-image"
          />
        </Link>

        {/* Right side: Chat button + Hamburger menu */}
        <div className="d-flex align-items-center gap-2">
          {/* Staff Chat Button - Only show for logged in users */}
          {user && (
            <button
              className="btn btn-link text-white p-2"
              onClick={() => setIsChatExpanded(!isChatExpanded)}
              style={{ 
                textDecoration: 'none',
                fontSize: '24px',
                lineHeight: 1
              }}
              aria-label="Toggle staff chat"
              title="Staff Chat"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"
                  fill="currentColor"
                />
                <circle cx="12" cy="10" r="1.5" fill="currentColor" />
                <circle cx="8" cy="10" r="1.5" fill="currentColor" />
                <circle cx="16" cy="10" r="1.5" fill="currentColor" />
              </svg>
            </button>
          )}

          {/* Hamburger menu */}
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
        </div>

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
                    to={`/room_services/${hotelIdentifier}/orders`}
                    onClick={toggleNavbar}
                    className={`
              nav-link
              
              ${
                isActive(`/room_services/${hotelIdentifier}/orders`) && "active"
              }
            `}
                  >
                    Room Service
                    {newOrderCount > 0 && (
                      <span className="badge bg-danger ms-1">
                        {newOrderCount}
                      </span>
                    )}
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
                  <Link
                    className={`nav-link ${
                      isActive(`/stock_tracker/${hotelIdentifier}`) && "active"
                    }`}
                    to={`/stock_tracker/${hotelIdentifier}`}
                    onClick={toggleNavbar}
                  >
                    Stock Dashboard
                  </Link>
                </li>

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

      {/* Staff Chat Widget - Only render for logged in users */}
      {user && (
        <MessengerWidget 
          position="bottom-right" 
          isExpanded={isChatExpanded}
          onExpandChange={setIsChatExpanded}
        />
      )}
    </nav>
  );
};

export default Navbar;

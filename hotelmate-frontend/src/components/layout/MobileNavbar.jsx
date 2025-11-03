import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import ClockModal from "@/components/staff/ClockModal";
import api from "@/services/api";
import logo from "@/assets/hotel-mate.png";
import { useOrderCount } from "@/hooks/useOrderCount.jsx";
import { useChat } from "@/context/ChatContext";
import { useTheme } from "@/context/ThemeContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigation } from "@/hooks/useNavigation";
import { useRoomServiceNotifications } from "@/context/RoomServiceNotificationContext";

const MobileNavbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const hotelIdentifier = user?.hotel_slug;
  const { mainColor } = useTheme();
  const { totalUnread } = useChat();
  const { hasNewRoomService, hasNewBreakfast } = useRoomServiceNotifications();
  const { roomServiceCount, breakfastCount, totalServiceCount } =
    useOrderCount(hotelIdentifier);
  const [staffProfile, setStaffProfile] = useState(null);
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Use usePermissions WITHOUT argument — it reads roles from localStorage inside
  const { canAccess } = usePermissions();
  const { visibleNavItems, hasNavigation } = useNavigation();

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

  const isActive = (path) => {
    // Handle paths with query parameters (like Games)
    if (path.includes('?')) {
      const pathWithoutQuery = path.split('?')[0];
      return location.pathname.startsWith(pathWithoutQuery);
    }
    return location.pathname.startsWith(path);
  };

  const hiddenNavPatterns = [
    /^\/room_services\/[^/]+\/room\/[^/]+\/breakfast\/?$/,
    /^\/room_services\/[^/]+\/room\/[^/]+\/menu\/?$/,
    /^\/hotel_info\/[^/]+(\/[^/]+)?\/?$/,
  ];

  // Hide mobile navbar for anonymous users on certain private routes or the
  // exact public tournament view: /games/memory-match/tournaments?hotel=hotel-killarney
  const searchParams = new URLSearchParams(location.search);
  const isMemoryMatchTournamentExact =
    /^\/games\/memory-match\/tournaments\/?$/.test(location.pathname) &&
    searchParams.get("hotel") === "hotel-killarney";

  // Hide navigation completely for non-authenticated users or users without permissions
  if (!user && (hiddenNavPatterns.some((re) => re.test(location.pathname)) || isMemoryMatchTournamentExact))
    return null;
  if (!user || !hasNavigation) return null;

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
            className="navbar-toggler bg-transparent border-0 shadow-lg position-relative"
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
            {/* Small dot indicator on hamburger when collapsed and there are notifications */}
            {collapsed && (totalUnread > 0 || hasNewRoomService || hasNewBreakfast || totalServiceCount > 0) && (
              <span 
                className="position-absolute top-0 start-100 translate-middle p-1 bg-danger border border-light rounded-circle"
                style={{ width: '10px', height: '10px' }}
              >
                <span className="visually-hidden">New notifications</span>
              </span>
            )}
          </button>
        </div>

        <div className={`collapse navbar-collapse ${!collapsed ? "show" : ""}`}>
          <ul className="navbar-nav ms-auto mb-2 mb-lg-0 gap-3 shadow-lg p-2 rounded m-2">
            {user && (
              <li className="nav-item">
                <button
                  className="btn btn-primary text-white w-100"
                  onClick={() => navigate(`/clock-in/${hotelIdentifier}`)}
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
                {visibleNavItems.map((item) => {
                  // Add order counts for room service and breakfast
                  let orderCount = 0;
                  if (item.slug === "room-service") orderCount = roomServiceCount;
                  if (item.slug === "breakfast") orderCount = breakfastCount;
                  if (item.slug === "chat") orderCount = totalUnread;

                  // Show NEW badge for notifications
                  const showNewBadge = 
                    item.slug === "room-service" ? hasNewRoomService :
                    item.slug === "breakfast" ? hasNewBreakfast :
                    item.slug === "chat" ? totalUnread > 0 :
                    false;

                  return (
                    <li className="nav-item" key={item.slug}>
                      <Link
                        className={`nav-link ${
                          isActive(item.path) ? "active" : ""
                        } text-white d-flex justify-content-between align-items-center`}
                        to={item.path}
                        onClick={toggleNavbar}
                      >
                        <div>
                          <i className={`bi bi-${item.icon} me-2`} />
                          {item.name}
                        </div>

                        {/* Show count badge when menu is expanded */}
                        {orderCount > 0 && (
                          <span className="badge bg-danger rounded-pill">
                            {orderCount}
                          </span>
                        )}

                        {/* Show NEW badge when expanded but no count */}
                        {showNewBadge && orderCount === 0 && (
                          <span className="badge bg-danger">NEW</span>
                        )}
                      </Link>
                    </li>
                  );
                })}

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

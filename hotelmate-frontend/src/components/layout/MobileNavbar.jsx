import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import ClockModal from "@/components/staff/ClockModal";
import api from "@/services/api";
import logo from "@/assets/hotel-mate.png";
import { useOrderCount } from "@/hooks/useOrderCount.jsx";
import { useStaffChat } from "@/staff_chat/context/StaffChatContext";
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
  const { totalUnread } = useStaffChat();
  const { hasNewRoomService, hasNewBreakfast } = useRoomServiceNotifications();
  const { roomServiceCount, breakfastCount, totalServiceCount } =
    useOrderCount(hotelIdentifier);
  const [staffProfile, setStaffProfile] = useState(null);
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [presetMenuOpen, setPresetMenuOpen] = useState(false);

  // Use usePermissions WITHOUT argument — it reads roles from localStorage inside
  const { canAccess } = usePermissions();
  const { visibleNavItems, categories, uncategorizedItems, hasNavigation } = useNavigation();
  const [expandedCategoryId, setExpandedCategoryId] = useState(null);

  useEffect(() => {
    if (!user || !hotelIdentifier) {
      setStaffProfile(null);
      return;
    }
    api
      .get(`/staff/hotel/${hotelIdentifier}/me/`)
      .then((res) => {
        setStaffProfile(res.data);
        setIsOnDuty(res.data.is_on_duty);
      })
      .catch(() => {
        // Fallback to old endpoint if enhanced one fails
        api
          .get(`/staff/me/`)
          .then((res) => {
            setStaffProfile(res.data);
            setIsOnDuty(res.data.is_on_duty);
          })
          .catch(() => setStaffProfile(null));
      });
  }, [user, hotelIdentifier]);

  // Listen for clock status changes from camera clock-in
  useEffect(() => {
    const handleClockStatusChange = (event) => {
      setIsOnDuty(event.detail.is_on_duty);
    };

    window.addEventListener('clockStatusChanged', handleClockStatusChange);
    return () => window.removeEventListener('clockStatusChanged', handleClockStatusChange);
  }, []);

  const toggleNavbar = () => setCollapsed((prev) => !prev);
  const handleLogout = () => {
    logout();
    // Use window.location for a full page reload to ensure clean state
    window.location.href = "/login";
  };

  // Add/remove class to body when navbar expands/collapses
  useEffect(() => {
    if (!collapsed) {
      document.body.classList.add('mobile-navbar-expanded');
    } else {
      document.body.classList.remove('mobile-navbar-expanded');
    }
    return () => {
      document.body.classList.remove('mobile-navbar-expanded');
    };
  }, [collapsed]);

  const isActive = (path) => {
    // Handle paths with query parameters (like Games)
    if (path.includes('?')) {
      const pathWithoutQuery = path.split('?')[0];
      return location.pathname.startsWith(pathWithoutQuery);
    }
    return location.pathname.startsWith(path);
  };

  // Helper functions for notifications
  const getOrderCountForItem = (item) => {
    if (item.slug === "room_service") return roomServiceCount;
    if (item.slug === "breakfast") return breakfastCount;
    if (item.slug === "chat") return totalUnread;
    return 0;
  };

  const hasNewBadgeForItem = (item) => {
    if (item.slug === "room_service") return hasNewRoomService;
    if (item.slug === "breakfast") return hasNewBreakfast;
    if (item.slug === "chat") return totalUnread > 0;
    return false;
  };

  const categoryHasNotifications = (category) => {
    return category.items.some(item => {
      const orderCount = getOrderCountForItem(item);
      const showNewBadge = hasNewBadgeForItem(item);
      return orderCount > 0 || showNewBadge;
    });
  };

  const isCategoryActive = (category) => {
    return category.items.some(item => isActive(item.path));
  };

  const toggleCategory = (categoryId) => {
    setExpandedCategoryId(expandedCategoryId === categoryId ? null : categoryId);
  };

  // 🎯 LAYOUT POLICY: Visibility controlled by App.jsx using layoutMode
  // No internal visibility logic needed - App.jsx decides whether to render this component
  if (!user || !hasNavigation) return null;

  return (
    <nav
      className={`navbar navbar-expand-lg text-white main-bg shadow-lg fixed-top ${
        mainColor ? "" : "bg-dark"
      } d-lg-none mobile-nav ${!collapsed ? "show" : ""}`}
      style={mainColor ? { backgroundColor: mainColor } : {}}
    >
      <div className="container-fluid ">
        <div className="d-flex align-items-center justify-content-between w-100">
          {/* Public Pages Button */}
          <button
            className="btn btn-outline-light btn-sm me-2"
            onClick={() => navigate(`/hotel/${hotelIdentifier}`)}
            title="View Public Pages"
          >
            <i className="bi bi-globe2 me-1"></i>
            <span className="d-none d-sm-inline">Public</span>
          </button>

          {/* Preset Selector for Mobile (when on public pages) */}
          {location.pathname.includes(`/${hotelIdentifier}`) && !location.pathname.includes('/staff/') && (
            <div className="mobile-preset-selector me-2">
              <button
                className="btn btn-outline-light btn-sm"
                onClick={() => setPresetMenuOpen(!presetMenuOpen)}
                title="Page Styles"
              >
                <i className="bi bi-palette me-1"></i>
                <span className="d-none d-sm-inline">Style</span>
              </button>
            </div>
          )}

          <div className="position-relative d-inline-block">
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
        </div>

        <div className={`collapse navbar-collapse ${!collapsed ? "show" : ""}`}>
          <ul className="navbar-nav ms-auto mb-2 mb-lg-0 gap-3 shadow-lg p-2 rounded m-2">
            {user && (
              <li className="nav-item">
                <button
                  className={`btn ${isOnDuty ? 'btn-danger' : 'btn-success'} text-white w-100`}
                  onClick={() => navigate(`/face/${hotelIdentifier}/clock-in`)}
                >
                  <i className="bi bi-person-bounding-box me-2" />
                  {isOnDuty ? 'Clock Out' : 'Clock In'}
                </button>
              </li>
            )}

            {staffProfile && (
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

            {/* Super User Button - Only visible to super users */}
            {user?.is_superuser && (
              <li className="nav-item">
                <button
                  className="btn btn-warning text-dark w-100"
                  onClick={() => {
                    navigate('/super-user');
                    toggleNavbar();
                  }}
                  title="Super User Admin Panel"
                >
                  <i className="bi bi-shield-check me-2" />
                  Super User
                </button>
              </li>
            )}

            {/* Preset Selector Menu Items (when on public pages) */}
            {location.pathname.includes(`/${hotelIdentifier}`) && !location.pathname.includes('/staff/') && (
              <li className="nav-item mobile-preset-nav">
                <div className="nav-link text-white py-2 px-3" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <i className="bi bi-palette me-2" />
                      Page Styles
                    </div>
                    <button
                      className="btn btn-link text-white p-0"
                      onClick={() => setPresetMenuOpen(!presetMenuOpen)}
                      aria-expanded={presetMenuOpen}
                    >
                      <i className={`bi bi-chevron-${presetMenuOpen ? 'up' : 'down'}`}></i>
                    </button>
                  </div>
                </div>

                {/* Preset Options Submenu */}
                {presetMenuOpen && (
                  <ul className="list-unstyled ps-4 mt-1">
                    <li className="mb-1">
                      <button
                        className="nav-link text-white py-1 px-2 small w-100 text-start border-0 bg-transparent"
                        onClick={() => {
                          // Handle preset 1 selection
                          window.dispatchEvent(new CustomEvent('presetChange', { detail: { variant: 1 } }));
                          toggleNavbar();
                        }}
                      >
                        <i className="bi bi-1-circle me-2" />
                        Modern
                      </button>
                    </li>
                    <li className="mb-1">
                      <button
                        className="nav-link text-white py-1 px-2 small w-100 text-start border-0 bg-transparent"
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('presetChange', { detail: { variant: 2 } }));
                          toggleNavbar();
                        }}
                      >
                        <i className="bi bi-2-circle me-2" />
                        Dark
                      </button>
                    </li>
                    <li className="mb-1">
                      <button
                        className="nav-link text-white py-1 px-2 small w-100 text-start border-0 bg-transparent"
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('presetChange', { detail: { variant: 3 } }));
                          toggleNavbar();
                        }}
                      >
                        <i className="bi bi-3-circle me-2" />
                        Minimal
                      </button>
                    </li>
                    <li className="mb-1">
                      <button
                        className="nav-link text-white py-1 px-2 small w-100 text-start border-0 bg-transparent"
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('presetChange', { detail: { variant: 4 } }));
                          toggleNavbar();
                        }}
                      >
                        <i className="bi bi-4-circle me-2" />
                        Vibrant
                      </button>
                    </li>
                    <li className="mb-1">
                      <button
                        className="nav-link text-white py-1 px-2 small w-100 text-start border-0 bg-transparent"
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('presetChange', { detail: { variant: 5 } }));
                          toggleNavbar();
                        }}
                      >
                        <i className="bi bi-5-circle me-2" />
                        Professional
                      </button>
                    </li>
                  </ul>
                )}
              </li>
            )}

            {user && (
              <>
                {/* Uncategorized items (Home, Settings) */}
                {uncategorizedItems.map((item) => {
                  const orderCount = getOrderCountForItem(item);
                  const showNewBadge = hasNewBadgeForItem(item);

                  // Regular uncategorized items
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

                        {orderCount > 0 && (
                          <span className="badge bg-danger rounded-pill">
                            {orderCount}
                          </span>
                        )}

                        {showNewBadge && orderCount === 0 && (
                          <span className="badge bg-danger">NEW</span>
                        )}
                      </Link>
                    </li>
                  );
                })}

                {/* Quick Access: Room Bookings */}
                {canAccess('room-bookings') && (
                  <li className="nav-item">
                    <Link
                      className={`nav-link ${
                        location.pathname.includes('/room-bookings') ? "active" : ""
                      } text-white d-flex justify-content-between align-items-center`}
                      to={`/staff/hotel/${hotelIdentifier}/room-bookings`}
                      onClick={toggleNavbar}
                    >
                      <div>
                        <i className="bi bi-calendar-check me-2" />
                        Room Bookings
                      </div>
                    </Link>
                  </li>
                )}

                {/* Category accordion */}
                {categories.map((category) => {
                  const isExpanded = expandedCategoryId === category.id;
                  const hasNotifications = categoryHasNotifications(category);
                  const isCategoryCurrentlyActive = isCategoryActive(category);

                  return (
                    <li className="nav-item mobile-category-item" key={category.id}>
                      <button
                        className={`nav-link text-white d-flex justify-content-between align-items-center w-100 border-0 bg-transparent text-start ${
                          isCategoryCurrentlyActive ? "active" : ""
                        }`}
                        onClick={() => toggleCategory(category.id)}
                      >
                        <div>
                          <i className={`bi bi-${category.icon} me-2`} />
                          {category.name}
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          {hasNotifications && (
                            <span className="badge bg-danger rounded-circle" style={{ width: '8px', height: '8px', padding: 0 }}></span>
                          )}
                          <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'}`} />
                        </div>
                      </button>

                      {/* Category items (accordion content) */}
                      {isExpanded && (
                        <ul className="list-unstyled ps-4 mt-2">
                          {category.items.map((item) => {
                            const orderCount = getOrderCountForItem(item);
                            const showNewBadge = hasNewBadgeForItem(item);

                            // Special handling for Room Bookings with sub-items
                            if (item.slug === 'room-bookings') {
                              return (
                                <li key={item.slug} className="mb-2">
                                  {/* Main Room Bookings Header */}
                                  <div className="nav-link text-white py-2 px-3" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                                    <div className="d-flex justify-content-between align-items-center">
                                      <div>
                                        <i className={`bi bi-${item.icon} me-2`} />
                                        {item.name}
                                      </div>
                                      {orderCount > 0 && (
                                        <span className="badge bg-danger rounded-pill">
                                          {orderCount}
                                        </span>
                                      )}
                                      {showNewBadge && orderCount === 0 && (
                                        <span className="badge bg-danger">NEW</span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Room Bookings Sub-items */}
                                  <ul className="list-unstyled ps-4 mt-1">
                                    <li className="mb-1">
                                      <Link
                                        className={`nav-link ${
                                          location.pathname.includes('/room-bookings') && location.search.includes('filter=pending') ? "active" : ""
                                        } text-white py-1 px-2 small`}
                                        to={`/staff/hotel/${hotelIdentifier}/room-bookings?filter=pending`}
                                        onClick={toggleNavbar}
                                      >
                                        <i className="bi bi-clock me-2" />
                                        Pending Bookings
                                      </Link>
                                    </li>
                                    <li className="mb-1">
                                      <Link
                                        className={`nav-link ${
                                          location.pathname.includes('/room-bookings') && location.search.includes('filter=confirmed') ? "active" : ""
                                        } text-white py-1 px-2 small`}
                                        to={`/staff/hotel/${hotelIdentifier}/room-bookings?filter=confirmed`}
                                        onClick={toggleNavbar}
                                      >
                                        <i className="bi bi-check-circle me-2" />
                                        Confirmed Bookings
                                      </Link>
                                    </li>
                                    <li className="mb-1">
                                      <Link
                                        className={`nav-link ${
                                          location.pathname.includes('/room-bookings') && !location.search.includes('filter=') ? "active" : ""
                                        } text-white py-1 px-2 small`}
                                        to={`/staff/hotel/${hotelIdentifier}/room-bookings`}
                                        onClick={toggleNavbar}
                                      >
                                        <i className="bi bi-calendar-event me-2" />
                                        All Bookings
                                      </Link>
                                    </li>
                                    <li className="mb-1">
                                      <Link
                                        className={`nav-link ${
                                          location.pathname.includes('/room-bookings') && location.search.includes('filter=history') ? "active" : ""
                                        } text-white py-1 px-2 small`}
                                        to={`/staff/hotel/${hotelIdentifier}/room-bookings?filter=history`}
                                        onClick={toggleNavbar}
                                      >
                                        <i className="bi bi-archive me-2" />
                                        Booking History
                                      </Link>
                                    </li>
                                    <li className="mb-1">
                                      <Link
                                        className={`nav-link ${
                                          location.pathname.includes('/booking-management') ? "active" : ""
                                        } text-white py-1 px-2 small`}
                                        to={`/staff/hotel/${hotelIdentifier}/booking-management`}
                                        onClick={toggleNavbar}
                                      >
                                        <i className="bi bi-gear me-2" />
                                        Management Dashboard
                                      </Link>
                                    </li>
                                  </ul>
                                </li>
                              );
                            }


                            // Special handling for Stock Tracker with sub-items
                            if (item.slug === 'stock_tracker') {
                              return (
                                <li key={item.slug} className="mb-2">
                                  {/* Main Stock Tracker Header */}
                                  <div className="nav-link text-white py-2 px-3" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                                    <div className="d-flex justify-content-between align-items-center">
                                      <div>
                                        <i className={`bi bi-${item.icon} me-2`} />
                                        {item.name}
                                      </div>
                                      {orderCount > 0 && (
                                        <span className="badge bg-danger rounded-pill">
                                          {orderCount}
                                        </span>
                                      )}
                                      {showNewBadge && orderCount === 0 && (
                                        <span className="badge bg-danger">NEW</span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Stock Tracker Sub-items */}
                                  <ul className="list-unstyled ps-4 mt-1">
                                    <li className="mb-1">
                                      <Link
                                        className={`nav-link ${
                                          location.pathname === `/stock_tracker/${hotelIdentifier}` ? "active" : ""
                                        } text-white py-1 px-2 small`}
                                        to={`/stock_tracker/${hotelIdentifier}`}
                                        onClick={toggleNavbar}
                                      >
                                        <i className="bi bi-speedometer2 me-2" />
                                        Dashboard
                                      </Link>
                                    </li>
                                    <li className="mb-1">
                                      <Link
                                        className={`nav-link ${
                                          location.pathname.includes('/stocktakes') ? "active" : ""
                                        } text-white py-1 px-2 small`}
                                        to={`/stock_tracker/${hotelIdentifier}/stocktakes`}
                                        onClick={toggleNavbar}
                                      >
                                        <i className="bi bi-clipboard-check me-2" />
                                        Stocktakes
                                      </Link>
                                    </li>
                                    <li className="mb-1">
                                      <Link
                                        className={`nav-link ${
                                          location.pathname.includes('/periods') ? "active" : ""
                                        } text-white py-1 px-2 small`}
                                        to={`/stock_tracker/${hotelIdentifier}/periods`}
                                        onClick={toggleNavbar}
                                      >
                                        <i className="bi bi-calendar-range me-2" />
                                        Periods
                                      </Link>
                                    </li>
                                  </ul>
                                </li>
                              );
                            }

                            // Regular category items
                            return (
                              <li key={item.slug} className="mb-2">
                                <Link
                                  className={`nav-link ${
                                    isActive(item.path) ? "active" : ""
                                  } text-white d-flex justify-content-between align-items-center py-2`}
                                  to={item.path}
                                  onClick={toggleNavbar}
                                >
                                  <div>
                                    <i className={`bi bi-${item.icon} me-2`} />
                                    {item.name}
                                  </div>

                                  {orderCount > 0 && (
                                    <span className="badge bg-danger rounded-pill">
                                      {orderCount}
                                    </span>
                                  )}

                                  {showNewBadge && orderCount === 0 && (
                                    <span className="badge bg-danger">NEW</span>
                                  )}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      )}
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
          currentStatus={staffProfile?.current_status}
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

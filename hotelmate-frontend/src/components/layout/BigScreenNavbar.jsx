import React, { useState, useEffect, useRef } from "react";
import Pusher from "pusher-js";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import ClockModal from "@/components/staff/ClockModal";
import api from "@/services/api";
import { useOrderCount } from "@/hooks/useOrderCount.jsx";
import { useTheme } from "@/context/ThemeContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigation } from "@/hooks/useNavigation";
import { useChat } from "@/context/ChatContext";
import { useBookingNotifications } from "@/context/BookingNotificationContext";
import { useRoomServiceNotifications } from "@/context/RoomServiceNotificationContext";
const BigScreenNavbar = ({ chatUnreadCount }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const hotelIdentifier = user?.hotel_slug;
  const { mainColor } = useTheme();
  const { totalUnread, markConversationRead } = useChat();
  const [servicesDropdownOpen, setServicesDropdownOpen] = useState(false);
  const { hasNewBooking } = useBookingNotifications();
  const { hasNewRoomService, hasNewBreakfast } = useRoomServiceNotifications();
  const { roomServiceCount, breakfastCount, totalServiceCount } =
    useOrderCount(hotelIdentifier);
  
  // Quick notifications moved to GlobalQuickNotifications component
  
  const [staffProfile, setStaffProfile] = useState(null);
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [collapsed, setCollapsed] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const { canAccess } = usePermissions();
  const { visibleNavItems, hasNavigation } = useNavigation();
  const servicesRef = useRef(null);
  
  // Detect current section for contextual navigation
  const getCurrentSection = () => {
    const path = location.pathname;
    if (path.includes('/stock_tracker')) return 'stock';
    if (path.includes('/chat')) return 'chat';
    if (path.includes('/games')) return 'games';
    if (path.includes('/restaurants')) return 'restaurant';
    if (path.includes('/bookings')) return 'bookings';
    if (path.includes('/roster')) return 'roster';
    return 'general';
  };
  
  const currentSection = getCurrentSection();
  
  // Early return checks AFTER all hooks
  const searchParams = new URLSearchParams(location.search);
  const isMemoryMatchTournamentExact =
    /^\/games\/memory-match\/tournaments\/?$/.test(location.pathname) &&
    searchParams.get("hotel") === "hotel-killarney";

  // Define active path helpers
  const isPartialActive = (path) => {
    if (path === "/") return location.pathname === "/";
    
    // Handle paths with query parameters (like Games)
    if (path.includes('?')) {
      const pathWithoutQuery = path.split('?')[0];
      return location.pathname.startsWith(pathWithoutQuery);
    }
    
    return location.pathname.startsWith(path);
  };

  // Fetch staff profile
  const fetchStaffProfile = () => {
    if (!user || !hotelIdentifier) {
      setStaffProfile(null);
      setIsOnDuty(false);
      return;
    }
    api
      .get(`/staff/${hotelIdentifier}/me/`)
      .then((res) => {
        console.log("[BigScreenNav] Staff profile data:", res.data);
        console.log("[BigScreenNav] Clock status (is_on_duty):", res.data.is_on_duty);
        setStaffProfile(res.data);
        setIsOnDuty(res.data.is_on_duty);
      })
      .catch((err) => {
        console.error("[BigScreenNav] Failed to fetch staff profile:", err);
        setStaffProfile(null);
        setIsOnDuty(false);
      });
  };

  useEffect(() => {
    fetchStaffProfile();
  }, [user, hotelIdentifier]);

  // Listen for clock status changes from ClockModal
  useEffect(() => {
    const handleClockStatusChange = () => {
      console.log("[BigScreenNav] Clock status changed, refreshing...");
      fetchStaffProfile();
    };

    window.addEventListener('clockStatusChanged', handleClockStatusChange);

    return () => {
      window.removeEventListener('clockStatusChanged', handleClockStatusChange);
    };
  }, [user, hotelIdentifier]);

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
    // Use window.location for a full page reload to ensure clean state
    window.location.href = "/login";
  };

  // Contextual Quick Actions based on current section - FIXED ROUTES
  const getContextualActions = () => {
    const path = location.pathname;
    
    // ROSTER - Show Quick Actions when department is selected
    if (path.includes('/roster')) {
      const searchParams = new URLSearchParams(location.search);
      const department = searchParams.get('department');
      
      if (department) {
        // Department selected - show action buttons
        return [
          { icon: 'calendar-check', label: 'Daily Plans', action: () => {
            // Toggle daily plans view
            const event = new CustomEvent('toggleDailyPlans');
            window.dispatchEvent(event);
          }},
          { icon: 'clock-history', label: 'Clock Logs', action: () => {
            // Toggle clock logs view
            const event = new CustomEvent('toggleClockLogs');
            window.dispatchEvent(event);
          }},
          { icon: 'graph-up', label: 'Analytics', action: () => {
            // Toggle analytics view
            const event = new CustomEvent('toggleAnalytics');
            window.dispatchEvent(event);
          }},
        ];
      }
      
      // No department selected - hide Quick Actions
      return [];
    }
    
    // ROOMS - No Quick Actions
    if (path.includes('/rooms')) {
      return [];
    }
    
    // GUESTS - Guest management
    if (path.includes('/guests')) {
      return [
        { icon: 'people-fill', label: 'All Guests', action: () => navigate(`/${hotelIdentifier}/guests`) },
        { icon: 'door-open', label: 'Rooms', action: () => navigate('/rooms') },
        { icon: 'calendar-event', label: 'Bookings', action: () => navigate('/bookings') },
        { icon: 'receipt', label: 'Room Service', action: () => navigate(`/room_services/${hotelIdentifier}/orders`) },
      ];
    }
    
    // HOTEL INFO - Create actions
    if (path.includes('/hotel-info') || path.includes('/hotel_info')) {
      return [
        { icon: 'folder-plus', label: 'Create Category', action: () => {
          const event = new CustomEvent('openCreateCategory');
          window.dispatchEvent(event);
        }},
        { icon: 'file-earmark-plus', label: 'Create Info', action: () => {
          const event = new CustomEvent('openCreateInfo');
          window.dispatchEvent(event);
        }},
        { icon: 'qr-code', label: 'Download QR Codes', action: () => {
          const event = new CustomEvent('downloadAllQRs');
          window.dispatchEvent(event);
        }},
      ];
    }
    
    // STOCK TRACKER - Fixed routes
    if (path.includes('/stock_tracker')) {
      return [
        { icon: 'box-seam', label: 'Items', action: () => navigate(`/stock_tracker/${hotelIdentifier}/items`) },
        { icon: 'clipboard-check', label: 'Stocktakes', action: () => navigate(`/stock_tracker/${hotelIdentifier}/stocktakes`) },
        { icon: 'calendar-range', label: 'Periods', action: () => navigate(`/stock_tracker/${hotelIdentifier}/periods`) },
        { icon: 'arrows-move', label: 'Operations', action: () => navigate(`/stock_tracker/${hotelIdentifier}/operations`) },
        { icon: 'graph-up', label: 'Analytics', action: () => navigate(`/stock_tracker/${hotelIdentifier}/analytics`) },
        { icon: 'cash-coin', label: 'Sales', action: () => navigate(`/stock_tracker/${hotelIdentifier}/sales/analysis`) },
      ];
    }
    
    // CHAT - Chat features
    if (path.includes('/chat')) {
      return [
        { icon: 'chat-dots-fill', label: 'All Chats', action: () => navigate(`/hotel/${hotelIdentifier}/chat`) },
        { icon: 'people', label: 'Staff Chat', action: () => navigate(`/${hotelIdentifier}/staff-chat`) },
        { icon: 'bell', label: 'Notifications', action: () => {} },
      ];
    }
    
    // BOOKINGS - Restaurant bookings
    if (path.includes('/bookings')) {
      return [
        { icon: 'calendar3', label: 'All Bookings', action: () => navigate('/bookings') },
        { icon: 'calendar-plus', label: 'Today', action: () => navigate('/bookings?filter=today') },
        { icon: 'hourglass-split', label: 'Pending', action: () => navigate('/bookings?filter=pending') },
        { icon: 'check-circle', label: 'Confirmed', action: () => navigate('/bookings?filter=confirmed') },
      ];
    }
    
    // ROSTER - Staff scheduling
    if (path.includes('/roster')) {
      return [
        { icon: 'people-fill', label: 'All Staff', action: () => navigate(`/${hotelIdentifier}/staff`) },
        { icon: 'person-plus', label: 'Add Staff', action: () => navigate(`/${hotelIdentifier}/staff/create`) },
        { icon: 'clock', label: 'Clock In/Out', action: () => navigate(`/clock-in/${hotelIdentifier}`) },
      ];
    }
    
    // STAFF - Staff management
    if (path.includes('/staff') && !path.includes('/staff/create')) {
      return [
        { icon: 'person-plus', label: 'Add Staff', action: () => navigate(`/${hotelIdentifier}/staff/create`) },
        { icon: 'calendar-week', label: 'Roster', action: () => navigate(`/roster/${hotelIdentifier}`) },
        { icon: 'clock-history', label: 'Clocked In', action: () => {
          if (window.toggleClockedInView) {
            window.toggleClockedInView();
          }
        }},
      ];
    }
    
    // RESTAURANTS - Restaurant management
    if (path.includes('/restaurants')) {
      return [
        { icon: 'receipt-cutoff', label: 'Room Service', action: () => navigate(`/room_services/${hotelIdentifier}/orders`) },
        { icon: 'egg-fried', label: 'Breakfast', action: () => navigate(`/room_services/${hotelIdentifier}/breakfast-orders`) },
        { icon: 'calendar3', label: 'Bookings', action: () => navigate('/bookings') },
      ];
    }
    
    // ROOM SERVICE - Room service orders
    if (path.includes('/room_service') || path.includes('/room_services')) {
      return [
        { icon: 'receipt-cutoff', label: 'All Orders', action: () => navigate(`/room_services/${hotelIdentifier}/orders`) },
        { icon: 'egg-fried', label: 'Breakfast', action: () => navigate(`/room_services/${hotelIdentifier}/breakfast-orders`) },
        { icon: 'clipboard-data', label: 'Management', action: () => navigate(`/room_services/${hotelIdentifier}/orders-management`) },
        { icon: 'graph-up', label: 'Summary', action: () => navigate(`/room_services/${hotelIdentifier}/orders-summary`) },
      ];
    }
    
    // MAINTENANCE - Maintenance tasks
    if (path.includes('/maintenance')) {
      return [
        { icon: 'tools', label: 'All Tasks', action: () => navigate('/maintenance') },
        { icon: 'door-open', label: 'Rooms', action: () => navigate('/rooms') },
        { icon: 'people', label: 'Staff', action: () => navigate(`/${hotelIdentifier}/staff`) },
      ];
    }
    
    // GAMES - Fixed game routes
    if (path.includes('/games')) {
      return [
        { icon: 'controller', label: 'Dashboard', action: () => navigate('/games') },
        { icon: 'grid-3x3-gap', label: 'Memory Match', action: () => navigate('/games/memory-match') },
        { icon: 'joystick', label: 'Whack-a-Mole', action: () => navigate('/games/whack-a-mole') },
        { icon: 'trophy-fill', label: 'Leaderboard', action: () => navigate('/games/memory-match/leaderboard') },
        { icon: 'award', label: 'Tournaments', action: () => navigate('/games/memory-match/tournaments') },
      ];
    }
    
    return [];
  };
  
  const contextualActions = getContextualActions();

  return (
    <>
      <nav
        className={`d-none d-lg-flex position-fixed top-0 start-0 end-0 top-navbar-strip glassmorphic-nav text-white ${
          mainColor ? "" : "bg-info"
        } ${isExpanded ? "expanded" : ""} section-${currentSection}`}
        style={{
          backgroundColor: mainColor || undefined,
          zIndex: 1050,
          transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
          height: isExpanded ? "110px" : "50px",
        }}
        onMouseEnter={() => setIsExpanded(true)}
        onMouseLeave={() => setIsExpanded(false)}
      >
        <div className="container-fluid h-100">
          <div className="d-flex align-items-center justify-content-between h-100 px-3">
            
            {/* Left side: Clock In + Profile */}
            <div className="d-flex align-items-center gap-2">
              {user && (
                <button
                  className={`btn ${isOnDuty ? 'btn-danger' : 'btn-success'} text-white top-nav-btn clock-btn`}
                  onClick={() => navigate(`/clock-in/${hotelIdentifier}`)}
                  title={isOnDuty ? "Clock Out" : "Clock In"}
                  style={{
                    backgroundColor: isOnDuty ? '#dc3545' : '#28a745',
                    borderColor: isOnDuty ? '#dc3545' : '#28a745'
                  }}
                >
                  <i className="bi bi-clock" />
                  {isExpanded && <span className="ms-2 btn-label">{isOnDuty ? 'Clock Out' : 'Clock In'}</span>}
                </button>
              )}

              {(staffProfile || user) && (() => {
                // Build proper Cloudinary URL for profile image
                const getImageUrl = (url) => {
                  if (!url) return null;
                  if (url.startsWith('http')) return url;
                  // Add Cloudinary base if relative path
                  const cloudinaryBase = 'https://res.cloudinary.com/dg0ssec7u/';
                  return `${cloudinaryBase}${url}`;
                };

                const profileImageUrl = getImageUrl(staffProfile?.profile_image_url);
                const displayName = staffProfile 
                  ? `${staffProfile.first_name || ''} ${staffProfile.last_name || ''}`.trim() || user?.username || 'User'
                  : user?.username || 'User';

                return (
                  <Link
                    className="top-nav-link staff-profile-link"
                    to={`/${hotelIdentifier}/staff/me`}
                    title={displayName}
                  >
                    <div className="staff-profile-container">
                      {profileImageUrl ? (
                        <img 
                          src={profileImageUrl} 
                          alt={displayName}
                          className="staff-avatar"
                          onError={(e) => {
                            console.error('[DesktopNav] Image load failed:', profileImageUrl);
                            e.target.style.display = 'none';
                            e.target.nextSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className="staff-avatar-placeholder"
                        style={{ display: profileImageUrl ? 'none' : 'flex' }}
                      >
                        {staffProfile?.first_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                        {staffProfile?.last_name?.charAt(0) || user?.username?.charAt(1) || 'S'}
                      </div>
                      <span className="staff-name">
                        {displayName}
                      </span>
                    </div>
                  </Link>
                );
              })()}
            </div>

            {/* Center: Main Navigation Items */}
            <div className="d-flex align-items-center justify-content-center flex-grow-1 gap-1 flex-wrap">
              {visibleNavItems.map((item) => {
                let orderCount = 0;
                if (item.slug === "room-service") orderCount = roomServiceCount;
                if (item.slug === "breakfast") orderCount = breakfastCount;
                if (item.slug === "chat") orderCount = totalUnread;
                // staff-chat removed - using MessengerWidget with quick action buttons
                
                const showNewBadge = 
                  item.slug === "bookings" ? hasNewBooking : 
                  item.slug === "chat" ? totalUnread > 0 : 
                  item.slug === "room-service" ? hasNewRoomService :
                  item.slug === "breakfast" ? hasNewBreakfast :
                  false;

                const hasNotification = orderCount > 0 || showNewBadge;
                
                return (
                  <Link
                    key={item.slug}
                    className={`top-nav-link ${
                      isPartialActive(item.path) ? "active" : ""
                    }`}
                    to={item.path}
                    title={item.name}
                  >
                    <div className="top-nav-item position-relative">
                      <i className={`bi bi-${item.icon} top-nav-icon`} />
                      {isExpanded && <span className="top-nav-label">{item.name}</span>}
                      
                      {/* Notification badge */}
                      {hasNotification && (
                        <span 
                          className={`notification-badge ${isExpanded ? 'with-label' : 'dot-only'}`}
                        >
                          {isExpanded && orderCount > 0 ? orderCount : ""}
                          {isExpanded && showNewBadge && orderCount === 0 ? "NEW" : ""}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>

            {/* Right side: Logout */}
            {user && (
              <div className="d-flex align-items-center">
                <button
                  className="top-nav-link logout-link"
                  onClick={handleLogout}
                  title="Logout"
                >
                  <div className="top-nav-item">
                    <i className="bi bi-box-arrow-right top-nav-icon" />
                    {isExpanded && <span className="top-nav-label">Logout</span>}
                  </div>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Spacer to push content down - adjusted for navbar + quick actions */}
      <div className="d-none d-lg-block" style={{ 
        height: contextualActions.length > 0 ? "90px" : 
                (location.pathname.includes('/roster') && new URLSearchParams(location.search).get('department')) ? "130px" :
                location.pathname.includes('/roster') ? "90px" : "50px" 
      }}></div>

      {/* Roster Page Title - Below Navbar */}
      {location.pathname.includes('/roster') && (() => {
        const searchParams = new URLSearchParams(location.search);
        const department = searchParams.get('department');
        
        return (
          <div 
            className="d-none d-lg-flex position-fixed start-0 end-0"
            style={{
              top: "50px",
              zIndex: 1045,
              background: "transparent",
              padding: "8px 0",
            }}
          >
            <div className="container-fluid">
              <div className="d-flex flex-column align-items-start px-3">
                <h1 className="fw-bold mb-0" style={{ fontSize: '2.5rem', color: '#2c3e50' }}>
                  <i className="bi bi-calendar-week me-3" style={{ color: '#3498db' }}></i>
                  Roster Management
                </h1>
                
                {department && (
                  <button
                    className="btn btn-outline-secondary mt-2"
                    onClick={() => navigate(`/roster/${hotelIdentifier}`)}
                    style={{
                      borderRadius: '8px',
                      padding: '0.4rem 1.2rem',
                      fontWeight: '600',
                      fontSize: '0.9rem',
                    }}
                  >
                    <i className="bi bi-arrow-left me-2"></i>
                    Back to Departments
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Contextual Quick Actions Bar - Desktop - Always Visible Below Navbar */}
      {contextualActions.length > 0 && (
        <div 
          className="d-none d-lg-flex position-fixed start-0 end-0 contextual-actions-bar"
          style={{
            top: "50px",
            zIndex: 1045,
            background: "transparent",
          }}
        >
          <div className="container-fluid">
            <div className="d-flex align-items-center justify-content-center gap-2 py-2 px-3">
              {/* Contextual action buttons */}
              {contextualActions.map((action, idx) => (
                <button
                  key={idx}
                  className="contextual-action-btn"
                  onClick={action.action}
                  title={action.label}
                  style={{
                    color: mainColor || '#3498db',
                    boxShadow: `0 4px 15px ${mainColor ? mainColor + '40' : 'rgba(0, 0, 0, 0.2)'}`,
                  }}
                >
                  <i className={`bi bi-${action.icon}`} style={{ color: mainColor || '#3498db' }} />
                  <span className="action-label" style={{ color: mainColor || '#3498db' }}>{action.label}</span>
                </button>
              ))}
              
              {/* Quick notification buttons moved to GlobalQuickNotifications - always visible globally */}
            </div>
          </div>
        </div>
      )}

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

// No need for separate PusherProvider - already wrapped in App.jsx
export default BigScreenNavbar;

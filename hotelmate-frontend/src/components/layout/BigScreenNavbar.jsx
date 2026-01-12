import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import ClockModal from "@/components/staff/ClockModal";
import api from "@/services/api";
import { useOrderCount } from "@/hooks/useOrderCount.jsx";
import { useTheme } from "@/context/ThemeContext";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigation } from "@/hooks/useNavigation";
import { useStaffChat } from "@/staff_chat/context/StaffChatContext";
import { useBookingNotifications } from "@/context/BookingNotificationContext";
import { useRoomServiceNotifications } from "@/context/RoomServiceNotificationContext";
import { useAttendanceRealtime } from "@/features/attendance/hooks/useAttendanceRealtime";
import { handleClockAction as performClockActionAPI, showClockOptionsModal } from "@/features/attendance/utils/clockActions";

import EnhancedAttendanceStatusBadge from "@/features/attendance/components/EnhancedAttendanceStatusBadge";

const BigScreenNavbar = ({ chatUnreadCount }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const hotelIdentifier = user?.hotel_slug;
  const { mainColor } = useTheme();
  const { totalUnread, markConversationRead } = useStaffChat();
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
  const [clockActionLoading, setClockActionLoading] = useState(false);
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showLogoutSuccess, setShowLogoutSuccess] = useState(false);
  const [forceButtonUpdate, setForceButtonUpdate] = useState(0);

  const { canAccess } = usePermissions();
  const { visibleNavItems, categories, uncategorizedItems, hasNavigation } = useNavigation();
  const servicesRef = useRef(null);
  const [openCategoryId, setOpenCategoryId] = useState(null);
  const categoryRefs = useRef({});
  const hoverTimeoutRef = useRef(null);
  
  // Detect current section for contextual navigation
  const getCurrentSection = () => {
    const path = location.pathname;
    if (path.includes('/stock_tracker')) return 'stock';
    if (path.includes('/chat')) return 'chat';
    if (path.includes('/games')) return 'games';
    if (path.includes('/restaurants')) return 'restaurant';
    if (path.includes('/bookings') && !path.includes('/room-bookings')) return 'bookings';
    if (path.includes('/room-bookings') || path.includes('/booking-management')) return 'room-bookings';
    return 'general';
  };
  
  const currentSection = getCurrentSection();
  
  // 🎯 LAYOUT POLICY: Visibility controlled by App.jsx using layoutMode
  // No internal visibility checks needed - App.jsx decides whether to render this component

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

  // Fetch staff profile - MEMOIZED to prevent re-subscription loops
  const fetchStaffProfile = useCallback(() => {
    if (!user || !hotelIdentifier) {
      setStaffProfile(null);
      setIsOnDuty(false);
      return;
    }

    api
      .get(`/staff/hotel/${hotelIdentifier}/me/`)
      .then((res) => {
        setStaffProfile(res.data);
        setIsOnDuty(res.data.is_on_duty);
        setForceButtonUpdate(prev => prev + 1);
      })
      .catch((err) => {
        console.error("Failed to fetch staff profile:", err.message);
        setStaffProfile(null);
        setIsOnDuty(false);
      });
  }, [user, hotelIdentifier]);

  useEffect(() => {
    fetchStaffProfile();
  }, [fetchStaffProfile]);



  // Legacy DOM event listeners removed - now using only useAttendanceRealtime hook

  // Handle real-time attendance updates via Pusher - MEMOIZED to prevent re-subscription loops
  const handleAttendanceEvent = useCallback((event) => {
    const { type, payload } = event || {};
    
    if (type !== "clock-status-updated" || !payload) {
      return;
    }

    // Normalize IDs to numbers for type-safe comparison
    const payloadStaffId = payload.staff_id != null ? Number(payload.staff_id) : null;
    const payloadUserId  = payload.user_id  != null ? Number(payload.user_id)  : null;
    
    // Use staffProfile.id as the primary staff identifier, fallback to user.staff_id
    const currentStaffId = staffProfile?.id != null ? Number(staffProfile.id) : 
                          (user?.staff_id != null ? Number(user.staff_id) : null);
    const currentUserId  = user?.id         != null ? Number(user.id)          : null;

    const isCurrentUser =
      (currentStaffId && payloadStaffId === currentStaffId) ||
      (currentUserId && payloadUserId === currentUserId);

    if (!isCurrentUser) {
      return;
    }

    // Add visual shimmer effect to clock button
    const clockButton = document.querySelector(".clock-btn");
    if (clockButton) {
      clockButton.classList.add("updating");
      setTimeout(() => clockButton.classList.remove("updating"), 800);
    }

    // IMMEDIATELY UPDATE UI STATE - NO WAITING FOR API
    if (payload.current_status) {
      setStaffProfile(prev => ({
        ...prev,
        current_status: payload.current_status,
        duty_status: payload.duty_status,
        is_on_duty: payload.duty_status === 'on_duty' || payload.duty_status === 'on_break'
      }));
      setIsOnDuty(payload.duty_status === 'on_duty' || payload.duty_status === 'on_break');
    } else {
      // If Pusher doesn't send complete data, force immediate profile refresh
      fetchStaffProfile();
    }

    // Force immediate re-render + refetch profile for consistency
    setForceButtonUpdate(prev => prev + 1);
    fetchStaffProfile();

    // Window event dispatching for staffStatusUpdated removed - components now use attendance store
    // Real-time updates are handled through the centralized attendance store infrastructure
  }, [user?.id, hotelIdentifier, fetchStaffProfile]);

  // Initialize Pusher real-time updates
  useAttendanceRealtime(hotelIdentifier, handleAttendanceEvent);

  // Simple clock button - just shows "Clock" text
  const clockButtonInfo = useMemo(() => {
    return { 
      text: 'Clock', 
      color: '#007bff', 
      isDanger: false 
    };
  }, []);  // No dependencies needed for simple static button

  // Listen for face recognition clock actions (manual refresh trigger)
  useEffect(() => {
    const handleFaceClockAction = (event) => {
      const { action, hotelSlug: eventHotelSlug, data } = event.detail;
      
      // Check if this event is for the current hotel
      if (eventHotelSlug === hotelIdentifier) {
        
        // Add visual feedback to clock button
        const clockButton = document.querySelector('.clock-btn');
        if (clockButton) {
          clockButton.classList.add('updating');
          setTimeout(() => {
            clockButton.classList.remove('updating');
          }, 800);
        }
        
        // Force immediate button update and refresh profile
        setForceButtonUpdate(prev => prev + 1);
        
        // Refresh staff profile to get updated status
        fetchStaffProfile(); // Immediate refresh - backend updates are synchronous
      }
    };

    window.addEventListener('face-clock-action-success', handleFaceClockAction);

    return () => {
      window.removeEventListener('face-clock-action-success', handleFaceClockAction);
    };
  }, [hotelIdentifier, fetchStaffProfile]);

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

  // Cleanup hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    logout();
    setShowLogoutSuccess(true);
    
    // Redirect after showing success message
    setTimeout(() => {
      window.location.href = "/login";
    }, 1500);
  };

  // Check if any item in category has notifications
  const categoryHasNotifications = (category) => {
    return category.items.some(item => {
      const orderCount = getOrderCountForItem(item);
      const showNewBadge = hasNewBadgeForItem(item);
      return orderCount > 0 || showNewBadge;
    });
  };

  // Get order count for specific nav item
  const getOrderCountForItem = (item) => {
    if (item.slug === "room_service") return roomServiceCount;
    if (item.slug === "breakfast") return breakfastCount;
    if (item.slug === "chat") return totalUnread;
    return 0;
  };

  // Check if item should show NEW badge
  const hasNewBadgeForItem = (item) => {
    if (item.slug === "bookings") return hasNewBooking;
    if (item.slug === "chat") return totalUnread > 0;
    if (item.slug === "room_service") return hasNewRoomService;
    if (item.slug === "breakfast") return hasNewBreakfast;
    return false;
  };

  // Handle hover enter with delay
  const handleCategoryHoverEnter = (categoryId) => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setOpenCategoryId(categoryId);
  };

  // Handle hover leave with delay
  const handleCategoryHoverLeave = () => {
    // Set a delay before closing
    hoverTimeoutRef.current = setTimeout(() => {
      setOpenCategoryId(null);
    }, 200); // 200ms delay before closing
  };

  // Toggle category dropdown (for click)
  const toggleCategory = (categoryId) => {
    setOpenCategoryId(openCategoryId === categoryId ? null : categoryId);
  };

  // Check if category is active (any item inside is active)
  const isCategoryActive = (category) => {
    return category.items.some(item => isPartialActive(item.path));
  };

  // Contextual Quick Actions based on current section - FIXED ROUTES
  const getContextualActions = () => {
    const path = location.pathname;
    

    
    // ROOMS - No Quick Actions
    if (path.includes('/rooms')) {
      return [];
    }
    
    // HOUSEKEEPING - Housekeeping management actions
    if (path.includes('/housekeeping')) {
      return [
        { icon: 'house-gear', label: 'All Rooms', action: () => navigate(`/staff/hotel/${hotelIdentifier}/housekeeping`) },
        { icon: 'door-closed', label: 'Rooms List', action: () => navigate('/rooms') },
        { icon: 'tools', label: 'Maintenance', action: () => navigate('/maintenance') },
        { icon: 'calendar-event', label: 'Bookings', action: () => navigate('/bookings') },
      ];
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
    
    // STAFF - Staff management
    if (path.includes('/staff') && !path.includes('/staff/create')) {
      return [
        { icon: 'person-plus', label: 'Add Staff', action: () => navigate(`/${hotelIdentifier}/staff/create`) },
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
    
    // ATTENDANCE & ROSTER - Attendance management
    if (path.includes('/attendance') || path.includes('/roster') || path.includes('/enhanced-attendance') || path.includes('/department-roster')) {
      return [
        { icon: 'clock', label: 'Live View', action: () => navigate(`/attendance/${hotelIdentifier}`) },
        { icon: 'calendar-week', label: 'Rosters', action: () => navigate(`/department-roster/${hotelIdentifier}`) },
        { icon: 'bar-chart', label: 'Analytics', action: () => navigate(`/enhanced-attendance/${hotelIdentifier}`) },
      ];
    }
    
    // ============================================================================
    // PLACEHOLDER: Future Category-Based Quick Actions
    // ============================================================================
    // These will be implemented as the navigation categories are expanded:
    //
    // FRONT OFFICE CATEGORY:
    //   - Arrivals: Quick view/filters for today's arrivals
    //   - Departures: Quick view/filters for today's departures
    //   - In-House: Filter/view current in-house guests
    //   - Reservations: Create booking, view upcoming
    //   - Requests: View/create guest requests
    //
    // F&B CATEGORY:
    //   - Table Bookings: Create booking, view today
    //   - Menus: Create/edit menu items, view by restaurant
    //
    // STAFF CATEGORY:
    //   - Clock: View clock history, clock analytics
    //
    // STOCK CATEGORY:
    //   (Already implemented above)
    //
    // GUEST RELATIONS CATEGORY:
    //   - Entertainment: View/manage activities, event calendar
    //   - Good To Know: Already implemented (hotel_info routes)
    //
    // Note: Quick actions will be populated based on route context and user
    // permissions. Use the same pattern as existing actions above.
    // ============================================================================
    
    return [];
  };
  
  const contextualActions = getContextualActions();

  return (
    <>
      <nav
        className={`d-none d-lg-flex position-fixed top-0 start-0 end-0 top-navbar-strip glassmorphic-nav text-white ${
          mainColor ? "" : "bg-info"
        } expanded section-${currentSection}`}
        style={{
          backgroundColor: mainColor || undefined,
          zIndex: 1050,
          height: "60px",
        }}

      >
        <div className="container-fluid h-100 ">
          <div className="d-flex align-items-center justify-content-between h-100 px-3">
            
            {/* Left side: Logout + Clock In + Profile */}
            <div className="d-flex align-items-center gap-2 ">
              {user && (
                <button
                  className="top-nav-link logout-link"
                  onClick={handleLogout}
                  title="Logout"
                  style={{ color: 'white' }}
                >
                  <div className="top-nav-item">
                    <span className="top-nav-label" style={{ color: 'white' }}>Logout</span>
                  </div>
                </button>
              )}

              {user && (() => {
                const isKioskMode = localStorage.getItem('kioskMode') === 'true';
                
                // Hide clock buttons in kiosk mode
                if (isKioskMode) {
                  return (
                    <div className="kiosk-mode-indicator badge bg-warning text-dark">
                      <i className="bi bi-display me-1"></i>
                      Kiosk Mode Active
                    </div>
                  );
                }
                
                // Simple clock button info
                const buttonInfo = clockButtonInfo;
                
                const handleClockAction = async () => {
                  if (!hotelIdentifier || clockActionLoading) {
                    return;
                  }
                  
                  setClockActionLoading(true);
                  
                  try {
                    if (!staffProfile?.current_status) {
                      navigate(`/face/${hotelIdentifier}/clock-in`);
                      return;
                    }
                    
                    const currentStatus = staffProfile.current_status;
                    
                    // Navigate to face recognition for all actions except simple clock in
                    if (currentStatus.status === 'on_duty' || currentStatus.status === 'on_break') {
                      // Use face recognition for break start/end and clock out actions
                      navigate(`/face/${hotelIdentifier}/clock-in`);
                      return;
                    } else {
                      // Simple clock in action - use API directly
                      const result = await performClockActionAPI(currentStatus, hotelIdentifier);
                      setForceButtonUpdate(prev => prev + 1); // Force immediate update
                      fetchStaffProfile(); // Refresh profile after action
                    }
                  } catch (error) {
                    console.error('Clock action failed:', error);
                    // Fallback to face recognition on error
                    navigate(`/face/${hotelIdentifier}/clock-in`);
                  } finally {
                    setClockActionLoading(false);
                  }
                };

                return (
                  <button
                    key={`clock-btn-${forceButtonUpdate}`}
                    className="btn btn-primary text-white top-nav-btn clock-btn"
                    onClick={handleClockAction}
                    title={clockActionLoading ? 'Processing...' : 'Clock'}
                    disabled={clockActionLoading}
                    style={{
                      backgroundColor: buttonInfo.color,
                      borderColor: buttonInfo.color,
                      opacity: clockActionLoading ? 0.7 : 1
                    }}
                  >
                    {clockActionLoading ? (
                      <div className="spinner-border spinner-border-sm text-white me-2" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                    ) : (
                      <i className={`bi ${
                        buttonInfo.text === 'Clock In' ? 'bi-clock' : 
                        buttonInfo.text === 'End Break' ? 'bi-play-circle' : 
                        buttonInfo.text === 'Start Break' ? 'bi-pause-circle' :
                        'bi-clock'
                      }`} />
                    )}
                    <span className="ms-2 btn-label">
                      {clockActionLoading ? 'Processing...' : 'Clock'}
                    </span>
                  </button>
                );
              })()}

              {(staffProfile || user) && (() => {
                const getImageUrl = (url) => {
                  if (!url) return null;
                  if (url.startsWith('http')) return url;
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
                      <div className="staff-avatar-container">
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
                        
                        {/* Badge removed - working elsewhere but problematic in navbar */}
                      </div>
                      
                      <div className="staff-info">
                        <span className="staff-name">
                          {displayName}
                        </span>
                        {staffProfile?.current_status && (
                          <small className="staff-status-text text-muted">
                            {staffProfile.current_status.status === 'on_break' && staffProfile.current_status.total_break_minutes
                              ? `On Break (${staffProfile.current_status.total_break_minutes}min)`
                              : staffProfile.current_status.label
                            }
                          </small>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })()}

              {/* Toggle between Staff Feed and Public Hotel Page */}
              {hotelIdentifier && (() => {
                const isOnPublicPage = location.pathname === `/hotel/${hotelIdentifier}`;
                const targetPath = isOnPublicPage ? `/staff/${hotelIdentifier}/feed` : `/hotel/${hotelIdentifier}`;
                const buttonLabel = isOnPublicPage ? "Staff View" : "Public Page";
                const buttonIcon = isOnPublicPage ? "person-badge" : "globe";
                
                return (
                  <Link
                    className="top-nav-link"
                    to={targetPath}
                    title={buttonLabel}
                  >
                    <div className="top-nav-item">
                      <span className="top-nav-label">{buttonLabel}</span>
                    </div>
                  </Link>
                );
              })()}

              {/* Super User Button - Only visible to super users */}
              {user?.is_superuser && (
                <button
                  className="top-nav-link"
                  onClick={() => navigate('/super-user')}
                  title="Super User Admin Panel"
                >
                  <div className="top-nav-item">
                    <span className="top-nav-label">Super User</span>
                  </div>
                </button>
              )}
            </div>

            {/* Right side: Main Navigation Items - Categories & Uncategorized */}
            <div className="d-flex align-items-center justify-content-end flex-grow-1 gap-1 flex-wrap">
              {/* Uncategorized items first (Home, Settings, Room Bookings) */}
              {uncategorizedItems.map((item) => {
                const orderCount = getOrderCountForItem(item);
                const showNewBadge = hasNewBadgeForItem(item);
                const hasNotification = orderCount > 0 || showNewBadge;
                
                // Special handling for Room Bookings with dropdown
                if (item.slug === 'room_bookings') {
                  const isOpen = openCategoryId === `uncategorized_${item.slug}`;
                  
                  return (
                    <div 
                      key={item.slug}
                      className="position-relative category-nav-wrapper"
                      ref={(el) => (categoryRefs.current[`uncategorized_${item.slug}`] = el)}
                      onMouseEnter={() => handleCategoryHoverEnter(`uncategorized_${item.slug}`)}
                      onMouseLeave={handleCategoryHoverLeave}
                    >
                      <div
                        className={`top-nav-link category-toggle ${
                          isPartialActive(item.path) ? "active" : ""
                        } ${isOpen ? "open" : ""}`}
                        title={item.name}
                      >
                        <div className="top-nav-item position-relative">
                          <span className="top-nav-label">{item.name}</span>
                          
                          {hasNotification && (
                            <span className="notification-badge with-label">
                              {orderCount > 0 ? orderCount : showNewBadge ? "NEW" : ""}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Room Bookings Dropdown */}
                      {isOpen && (
                        <div 
                          className="category-dropdown"
                          style={{
                            background: mainColor 
                              ? `linear-gradient(135deg, ${mainColor}f5 0%, ${mainColor}f8 100%)`
                              : 'linear-gradient(135deg, rgba(30, 30, 30, 0.98) 0%, rgba(40, 40, 40, 0.98) 100%)'
                          }}
                        >
                          <Link
                            className="category-dropdown-item"
                            to={`/staff/hotel/${hotelIdentifier}/room-bookings?filter=pending`}
                            onClick={() => setOpenCategoryId(null)}
                          >
                            <i className="bi bi-clock me-2" />
                            <span>Pending Bookings</span>
                          </Link>
                          <Link
                            className="category-dropdown-item"
                            to={`/staff/hotel/${hotelIdentifier}/room-bookings?filter=confirmed`}
                            onClick={() => setOpenCategoryId(null)}
                          >
                            <i className="bi bi-check-circle me-2" />
                            <span>Confirmed Bookings</span>
                          </Link>
                          <Link
                            className="category-dropdown-item"
                            to={`/staff/hotel/${hotelIdentifier}/room-bookings?filter=cancelled`}
                            onClick={() => setOpenCategoryId(null)}
                          >
                            <i className="bi bi-x-circle me-2" />
                            <span>Cancelled Bookings</span>
                          </Link>
                          <Link
                            className="category-dropdown-item"
                            to={`/staff/hotel/${hotelIdentifier}/room-bookings`}
                            onClick={() => setOpenCategoryId(null)}
                          >
                            <i className="bi bi-calendar-event me-2" />
                            <span>All Bookings</span>
                          </Link>
                          <Link
                            className="category-dropdown-item"
                            to={`/staff/hotel/${hotelIdentifier}/room-bookings?filter=history`}
                            onClick={() => setOpenCategoryId(null)}
                          >
                            <i className="bi bi-archive me-2" />
                            <span>Booking History</span>
                          </Link>
                          <Link
                            className="category-dropdown-item"
                            to={`/staff/hotel/${hotelIdentifier}/booking-management`}
                            onClick={() => setOpenCategoryId(null)}
                          >
                            <i className="bi bi-gear me-2" />
                            <span>Management Dashboard</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  );
                }
                
                // Regular uncategorized items (Home, Settings)
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
                      <span className="top-nav-label">{item.name}</span>
                      
                      {hasNotification && (
                        <span className="notification-badge with-label">
                          {orderCount > 0 ? orderCount : showNewBadge ? "NEW" : ""}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}

              {/* Categorized navigation with dropdowns */}
              {categories.map((category) => {
                const isActive = isCategoryActive(category);
                const hasNotifications = categoryHasNotifications(category);
                const isOpen = openCategoryId === category.id;
                
                return (
                  <div 
                    key={category.id}
                    className="position-relative category-nav-wrapper"
                    ref={(el) => (categoryRefs.current[category.id] = el)}
                    onMouseEnter={() => handleCategoryHoverEnter(category.id)}
                    onMouseLeave={handleCategoryHoverLeave}
                  >
                    <div
                      className={`top-nav-link category-toggle ${isActive ? "active" : ""} ${isOpen ? "open" : ""}`}
                      title={category.name}
                    >
                      <div className="top-nav-item position-relative">
                        <span className="top-nav-label">{category.name}</span>
                        
                        {hasNotifications && (
                          <span className="notification-badge with-label">
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dropdown menu for category items - shows on hover */}
                    {isOpen && (
                      <div 
                        className="category-dropdown"
                        style={{
                          background: mainColor 
                            ? `linear-gradient(135deg, ${mainColor}f5 0%, ${mainColor}f8 100%)`
                            : 'linear-gradient(135deg, rgba(30, 30, 30, 0.98) 0%, rgba(40, 40, 40, 0.98) 100%)'
                        }}
                      >
                        {category.items.map((item) => {
                          const orderCount = getOrderCountForItem(item);
                          const showNewBadge = hasNewBadgeForItem(item);
                          const hasItemNotification = orderCount > 0 || showNewBadge;
                          
                          // Special handling for Room Bookings with sub-dropdown
                          if (item.slug === 'room-bookings') {
                            return (
                              <div key={item.slug} className="category-dropdown-item-with-submenu">
                                <div
                                  className={`category-dropdown-item ${
                                    isPartialActive(item.path) ? "active" : ""
                                  }`}
                                >
                                  <i className={`bi bi-${item.icon} me-2`} />
                                  <span>{item.name}</span>
                                  <i className="bi bi-chevron-right ms-auto"></i>
                                  
                                  {hasItemNotification && (
                                    <span className="item-notification-badge">
                                      {orderCount > 0 ? orderCount : "NEW"}
                                    </span>
                                  )}
                                </div>
                                
                                {/* Room Bookings Sub-dropdown */}
                                <div className="sub-dropdown">
                                  <Link
                                    className="sub-dropdown-item"
                                    to={`/staff/hotel/${hotelIdentifier}/room-bookings?filter=pending`}
                                    onClick={() => setOpenCategoryId(null)}
                                  >
                                    <i className="bi bi-clock me-2" />
                                    <span>Pending Bookings</span>
                                    {/* Add badge for pending count when logic is ready */}
                                  </Link>
                                  <Link
                                    className="sub-dropdown-item"
                                    to={`/staff/hotel/${hotelIdentifier}/room-bookings?filter=confirmed`}
                                    onClick={() => setOpenCategoryId(null)}
                                  >
                                    <i className="bi bi-check-circle me-2" />
                                    <span>Confirmed Bookings</span>
                                  </Link>
                                  <Link
                                    className="sub-dropdown-item"
                                    to={`/staff/hotel/${hotelIdentifier}/room-bookings`}
                                    onClick={() => setOpenCategoryId(null)}
                                  >
                                    <i className="bi bi-calendar-event me-2" />
                                    <span>All Bookings</span>
                                  </Link>
                                  <Link
                                    className="sub-dropdown-item"
                                    to={`/staff/hotel/${hotelIdentifier}/room-bookings?filter=history`}
                                    onClick={() => setOpenCategoryId(null)}
                                  >
                                    <i className="bi bi-archive me-2" />
                                    <span>Booking History</span>
                                  </Link>
                                  <Link
                                    className="sub-dropdown-item"
                                    to={`/staff/hotel/${hotelIdentifier}/booking-management`}
                                    onClick={() => setOpenCategoryId(null)}
                                  >
                                    <i className="bi bi-gear me-2" />
                                    <span>Booking Management</span>
                                  </Link>
                                </div>
                              </div>
                            );
                          }

                          // Regular category items
                          return (
                            <Link
                              key={item.slug}
                              className={`category-dropdown-item ${
                                isPartialActive(item.path) ? "active" : ""
                              }`}
                              to={item.path}
                              onClick={() => setOpenCategoryId(null)}
                            >
                              <i className={`bi bi-${item.icon} me-2`} />
                              <span>{item.name}</span>
                              
                              {hasItemNotification && (
                                <span className="item-notification-badge ms-auto">
                                  {orderCount > 0 ? orderCount : "NEW"}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </nav>

      {/* Spacer to push content down - adjusted for navbar + quick actions */}
      <div className="d-none d-lg-block" style={{ 
        height: contextualActions.length > 0 ? "90px" : "50px" 
      }}></div>



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
            <div className="d-flex align-items-center justify-content-center gap-2 py-2 px-3 my-3 contextual-actions-container glassmorphic-bar">
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
          currentStatus={staffProfile.current_status}
          onStatusChange={(newStatus) => {
            setIsOnDuty(newStatus);
            setIsModalOpen(false);
          }}
        />
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Logout</h5>
                <button type="button" className="btn-close" onClick={() => setShowLogoutConfirm(false)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to logout?</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowLogoutConfirm(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger" onClick={confirmLogout}>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logout Success Modal */}
      {showLogoutSuccess && (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-body text-center py-4">
                <i className="bi bi-check-circle text-success" style={{ fontSize: '3rem' }}></i>
                <h5 className="mt-3">Logged Out Successfully</h5>
                <p className="text-muted">Redirecting to login page...</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </>
  );
};

// No need for separate PusherProvider - already wrapped in App.jsx
export default BigScreenNavbar;

// Add styles for room bookings sub-dropdown and clock button updates
const styleElement = document.createElement('style');
styleElement.textContent = `
  .category-dropdown-item-with-submenu {
    position: relative;
  }

  .category-dropdown-item-with-submenu:hover .sub-dropdown {
    display: block;
  }

  .sub-dropdown {
    position: absolute;
    left: 100%;
    top: 0;
    min-width: 200px;
    background: rgba(20, 20, 20, 0.95);
    backdrop-filter: blur(10px);
    border-radius: 8px;
    padding: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    display: none;
    z-index: 1001;
    border: 1px solid rgba(255, 255, 255, 0.1);
  }

  .sub-dropdown-item {
    display: flex;
    align-items: center;
    padding: 10px 12px;
    color: #ffffff;
    text-decoration: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    transition: all 0.2s ease;
  }

  .sub-dropdown-item:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
    transform: translateX(2px);
  }

  .category-dropdown-item-with-submenu .category-dropdown-item {
    position: relative;
  }

  .category-dropdown-item-with-submenu .category-dropdown-item .bi-chevron-right {
    font-size: 12px;
    opacity: 0.7;
    margin-left: auto;
  }

  /* Clock button real-time update feedback */
  .clock-btn.updating {
    position: relative;
    overflow: hidden;
  }

  .clock-btn.updating::after {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(
      90deg, 
      transparent, 
      rgba(255, 255, 255, 0.3), 
      transparent
    );
    animation: shimmer 0.8s ease-in-out;
  }

  @keyframes shimmer {
    0% {
      left: -100%;
    }
    100% {
      left: 100%;
    }
  }

  .clock-btn.updating {
    transition: all 0.2s ease;
    box-shadow: 0 0 15px rgba(255, 255, 255, 0.5);
  }

  /* Simple clock button styling */
  
  /* Staff profile with status badge */
  .staff-profile-container {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .staff-avatar-container {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  /* Badge styles removed - no longer used in navbar */
  
  .staff-info {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }
  
  .staff-name {
    font-weight: 500;
    margin-bottom: 0;
  }
  
  .staff-status-text {
    font-size: 11px;
    opacity: 0.8;
    margin-top: 1px;
  }
  
  /* Avatar styles */
  .staff-avatar {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
  }
  
  .staff-avatar-placeholder {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: rgba(255,255,255,0.2);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: bold;
    color: white;
  }
`;

if (!document.head.querySelector('[data-component="BigScreenNavbar"]')) {
  styleElement.setAttribute('data-component', 'BigScreenNavbar');
  document.head.appendChild(styleElement);
}

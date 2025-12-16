import { matchPath } from "react-router-dom";

// Guest route patterns from App.jsx - PIN-based authentication
const GUEST_ROUTE_PATTERNS = [
  // PIN Validation Routes
  "/:hotelIdentifier/room/:roomNumber/validate-pin",
  "/chat/:hotelSlug/messages/room/:room_number/validate-chat-pin",
  "/guest-booking/:hotelSlug/restaurant/:restaurantSlug/room/:roomNumber/validate-dinner-pin",

  // Protected Guest Routes (use RequirePin/RequireChatPin/RequireDinnerPin)
  "/room_services/:hotelIdentifier/room/:roomNumber/menu",
  "/room_services/:hotelIdentifier/room/:roomNumber/breakfast",
  "/chat/:hotelSlug/conversations/:conversationId/messages/send",
  "/chat/:hotelSlug/conversations/:conversationId/messages",
  "/guest-booking/:hotelSlug/restaurant/:restaurantSlug/room/:roomNumber",
  "/guest-booking/:hotelSlug/restaurant/:restaurantSlug",

  // Good to Know (Public)
  "/good_to_know/:hotel_slug/:slug",

  // Quiz Game (Public - Anonymous play via QR)
  "/games/quiz",
];

/**
 * Helper function to check if current path is a guest route
 * @param {string} pathname - The pathname to check
 * @returns {boolean} True if pathname matches any guest route pattern
 */
const isGuestRoute = (pathname) => {
  return GUEST_ROUTE_PATTERNS.some((pattern) => matchPath(pattern, pathname));
};

/**
 * Determines the layout mode for the given pathname
 * This is the single source of truth for layout chrome rendering decisions
 * 
 * @param {string} pathname - The pathname to classify
 * @returns {"auth"|"guest"|"public"|"staff"} Layout mode
 */
export function getLayoutMode(pathname) {
  // AUTH: Login, registration, and password reset pages
  if (
    pathname === "/login" ||
    pathname === "/logout" ||
    pathname === "/register" ||
    pathname === "/forgot-password" ||
    pathname === "/registration-success" ||
    pathname.startsWith("/reset-password") ||
    pathname === "/staff/login"
  ) {
    return "auth";
  }

  // GUEST: PIN-based authentication routes (room service, guest chat, etc.)
  if (isGuestRoute(pathname)) {
    return "guest";
  }

  // Staff routes that should ALWAYS show navigation (determine this first)
  // NOTE: These patterns align with backend slugs and route structure
  const isStaffRoute =
    pathname.startsWith("/staff/") ||
    pathname === "/reception" ||
    pathname.startsWith("/rooms") ||
    pathname.startsWith("/bookings") ||
    pathname.startsWith("/maintenance") ||
    pathname.startsWith("/stock_tracker") || // Note: no trailing slash for consistency
    pathname.startsWith("/games") ||
    pathname.startsWith("/hotel_info") || // Note: no trailing slash for consistency
    pathname.startsWith("/good_to_know_console");

  // PUBLIC: Public-facing pages without staff navigation
  // CRITICAL FIX: Add /booking/:hotelSlug pattern to fix staff nav leak
  if (
    !isStaffRoute &&
    (pathname === "/" ||
      /^\/hotel\/[a-z0-9-]+$/.test(pathname) || // Public hotel pages
      /^\/[a-z0-9-]+$/.test(pathname) || // Hotel slug only
      /^\/[a-z0-9-]+\/book/.test(pathname) || // Booking forms
      /^\/[a-z0-9-]+\/my-bookings/.test(pathname) || // My bookings
      /^\/my-bookings/.test(pathname) || // Legacy my bookings
      /^\/booking\/confirmation\//.test(pathname) || // Confirmations
      /^\/booking\/payment\//.test(pathname) || // Payment pages
      /^\/booking\/[a-z0-9-]+/.test(pathname)) // CRITICAL: Booking flow with hotel slug
  ) {
    return "public";
  }

  // STAFF: Default fallback for staff routes
  return "staff";
}

/**
 * Get a descriptive name for the layout mode (for debugging)
 * @param {string} layoutMode - The layout mode
 * @returns {string} Descriptive name
 */
export function getLayoutModeDescription(layoutMode) {
  const descriptions = {
    auth: "Authentication pages (no navigation)",
    guest: "Guest pages with PIN authentication (no staff navigation)",
    public: "Public pages (no staff navigation)",
    staff: "Staff pages (full staff navigation)",
  };
  return descriptions[layoutMode] || "Unknown layout mode";
}
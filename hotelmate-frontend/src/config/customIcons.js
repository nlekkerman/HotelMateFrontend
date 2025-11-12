// Custom Icons Configuration
// Import all custom icons from assets
import homeIcon from "@/assets/icons/home-icon.png";

/**
 * Custom Icons Registry
 * Add new icons here as you provide them
 */
export const customIcons = {
  home: homeIcon,
  // Add more icons below as needed:
  // dashboard: dashboardIcon,
  // bookings: bookingsIcon,
  // rooms: roomsIcon,
  // restaurant: restaurantIcon,
  // staff: staffIcon,
  // chat: chatIcon,
  // settings: settingsIcon,
  // analytics: analyticsIcon,
  // maintenance: maintenanceIcon,
  // etc...
};

/**
 * Get icon by name
 * @param {string} iconName - Name of the icon from customIcons
 * @returns {string|null} Icon path or null if not found
 */
export const getCustomIcon = (iconName) => {
  return customIcons[iconName] || null;
};

/**
 * Check if custom icon exists
 * @param {string} iconName - Name of the icon
 * @returns {boolean}
 */
export const hasCustomIcon = (iconName) => {
  return iconName in customIcons;
};

/**
 * Get all available icon names
 * @returns {string[]} Array of icon names
 */
export const getAvailableIcons = () => {
  return Object.keys(customIcons);
};

export default customIcons;

import { useAuth } from "@/context/AuthContext";
import {
  NAVIGATION_CATEGORIES,
  getCategoryForNavItem,
  getCategoryById
} from "@/config/navigationCategories";

/* @deprecated — remove when backend guarantees navigation_items on every login.
 * Paths here must match the canonical entry paths declared in staffRoutes.jsx. */
export const DEFAULT_NAV_ITEMS = [
  { slug: 'home', name: 'Home', path: '/staff/{hotelSlug}/feed', icon: 'house' },
  { slug: 'chat', name: 'Chat', path: '/hotel/{hotelSlug}/chat', icon: 'chat-dots' },
  { slug: 'rooms', name: 'Rooms', path: '/staff/hotel/{hotelSlug}/rooms', icon: 'door-closed' },
  { slug: 'housekeeping', name: 'Housekeeping', path: '/staff/hotel/{hotelSlug}/housekeeping', icon: 'house-gear' },
  { slug: 'room_bookings', name: 'Room Bookings', path: '/staff/hotel/{hotelSlug}/room-bookings', icon: 'calendar-check', hasDropdown: true },
  { slug: 'restaurant_bookings', name: 'Restaurants', path: '/hotel-{hotelSlug}/restaurants', icon: 'calendar2-event' },
  { slug: 'staff_management', name: 'Staff', path: '/{hotelSlug}/staff', icon: 'person-badge' },
  { slug: 'attendance', name: 'Attendance', path: '/attendance/{hotelSlug}', icon: 'clock-history' },
  { slug: 'room_services', name: 'Room Service', path: '/room_services/{hotelSlug}', icon: 'box' },
  { slug: 'maintenance', name: 'Maintenance', path: '/maintenance', icon: 'tools' },
  { slug: 'hotel_info', name: 'Hotel Info', path: '/hotel_info/{hotelSlug}', icon: 'info-circle' },
  { slug: 'admin_settings', name: 'Settings', path: '/staff/{hotelSlug}/settings', icon: 'gear', requiresHotelSlug: true },
];



/**
 * Custom hook for managing navigation items
 * Handles filtering based on user permissions and hotel context
 */
export function useNavigation() {
  const { user } = useAuth();
  const hotelSlug = user?.hotel_slug || '';

  // 🎯 BACKEND AUTHORITATIVE: Use navigation_items from canonical payload
  // Backend resolver guarantees hotel-scoped, validated navigation structure
  let savedNavItems = [];
  try {
    savedNavItems = user?.navigation_items || [];
    // Backend canonical resolver ensures valid structure - no client validation needed
  } catch {
    savedNavItems = [];
  }

  // Use saved nav items if available, otherwise use defaults
  let allNavItems = savedNavItems.length > 0 ? savedNavItems : DEFAULT_NAV_ITEMS;

  // 🎯 BACKEND AUTHORITATIVE: Trust navigation_items structure from canonical resolver
  // Backend guarantees valid slugs and structure - no client-side filtering needed

  // Replace {hotelSlug} placeholder in paths with actual hotel slug
  allNavItems = allNavItems.map(item => ({
    ...item,
    path: item.path ? item.path.replace('{hotelSlug}', hotelSlug) : '#'
  }));


  
  // Backend controls nav visibility via navigation_items and effective_navs
  const finalVisibleItems = allNavItems;

  // Group navigation items by category
  const groupItemsByCategory = (items) => {
    const categorized = {};
    const uncategorized = [];

    items.forEach(item => {
      const categoryId = getCategoryForNavItem(item.slug);
      
      if (categoryId) {
        if (!categorized[categoryId]) {
          categorized[categoryId] = [];
        }
        categorized[categoryId].push(item);
      } else {
        // Items without category (home, settings) go to uncategorized
        uncategorized.push(item);
      }
    });

    return { categorized, uncategorized };
  };

  // Create categorized navigation structure
  const { categorized: categorizedItems, uncategorized } = groupItemsByCategory(finalVisibleItems);
  
  // Build categories with items - show ALL categories regardless of content
  const categories = NAVIGATION_CATEGORIES
    .map(category => ({
      ...category,
      items: categorizedItems[category.id] || [],
      hasNotifications: false, // Will be calculated by navbar components
    }));
    // Show all categories without filtering


  return { 
    visibleNavItems: finalVisibleItems, 
    allNavItems,
    categories,
    uncategorizedItems: uncategorized,
    hasNavigation: true // Always show navigation
  };
}

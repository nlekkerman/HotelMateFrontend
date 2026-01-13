import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { 
  NAVIGATION_CATEGORIES, 
  getCategoryForNavItem, 
  getCategoryById 
} from "@/config/navigationCategories";

// Default navigation items (fallback if not in localStorage)
export const DEFAULT_NAV_ITEMS = [
  { slug: 'home', name: 'Home', path: '/staff/{hotelSlug}/feed', icon: 'house' },
  { slug: 'chat', name: 'Chat', path: '/hotel/{hotelSlug}/chat', icon: 'chat-dots' },
  // Removed 'staff-chat' - using MessengerWidget instead
  { slug: 'reception', name: 'Reception', path: '/reception', icon: 'bell' },
  { slug: 'rooms', name: 'Rooms', path: '/rooms', icon: 'door-closed' },
  { slug: 'housekeeping', name: 'Housekeeping', path: '/staff/hotel/{hotelSlug}/housekeeping', icon: 'house-gear' },
  { slug: 'guests', name: 'Guests', path: '/{hotelSlug}/guests', icon: 'people' },
  { slug: 'staff', name: 'Staff', path: '/{hotelSlug}/staff', icon: 'person-badge' },
  { slug: 'attendance', name: 'Attendance', path: '/attendance/{hotelSlug}', icon: 'clock-history' },
  { slug: 'department_roster', name: 'Department Roster', path: '/department-roster/{hotelSlug}', icon: 'calendar-week' },
  { slug: 'management_analytics', name: 'Management Analytics', path: '/enhanced-attendance/{hotelSlug}', icon: 'bar-chart' },
  { slug: 'restaurants', name: 'Restaurants', path: '/{hotelSlug}/restaurants', icon: 'shop-window' },
  { slug: 'room-bookings', name: 'Room Bookings', path: '/staff/hotel/{hotelSlug}/room-bookings', icon: 'bed', hasDropdown: true },
  { slug: 'restaurant-bookings', name: 'Restaurant Bookings', path: '/restaurant-bookings', icon: 'calendar-check' },
  { slug: 'maintenance', name: 'Maintenance', path: '/maintenance', icon: 'tools' },
  { slug: 'hotel_info', name: 'Hotel Info', path: '/hotel_info/{hotelSlug}', icon: 'info-circle' },
  { slug: 'good_to_know', name: 'Good to Know', path: '/good_to_know_console/{hotelSlug}', icon: 'book' },
  { slug: 'stock_tracker', name: 'Dashboard', path: '/stock_tracker/{hotelSlug}', icon: 'graph-up' },
  { slug: 'games', name: 'Games', path: '/games/?hotel={hotelSlug}', icon: 'controller' },
  { slug: 'settings', name: 'Settings', path: '/staff/{hotelSlug}/settings', icon: 'gear', requiresHotelSlug: true },
  { slug: 'room_service', name: 'Room Service', path: '/room_services/{hotelSlug}/orders-management', icon: 'box' },
  { slug: 'breakfast', name: 'Breakfast', path: '/room_services/{hotelSlug}/breakfast-orders', icon: 'egg-fried' },
  { slug: 'menus_management', name: 'Menus Management', path: '/menus_management/{hotelSlug}', icon: 'menu-button-wide', allowedRoles: ['staff_admin', 'super_staff_admin'] },
];



/**
 * Custom hook for managing navigation items
 * Handles filtering based on user permissions and hotel context
 */
export function useNavigation() {
  const { user } = useAuth();
  const { canAccessNav, canAccess, isSuperUser, allowedNavs } = usePermissions();
  
  const hotelSlug = user?.hotel_slug || '';

  // 🎯 BACKEND AUTHORITATIVE: Use navigation_items from canonical payload
  // Backend resolver guarantees hotel-scoped, validated navigation structure
  let savedNavItems = [];
  try {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    savedNavItems = storedUser?.navigation_items || [];
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


  
  // Show all navigation items without conditional filtering
  const visibleNavItems = allNavItems;

  // 🎯 BACKEND AUTHORITATIVE: Trust allowed_navs from canonical resolver
  // Backend handles superuser bypass and M2M filtering correctly
  // If allowed_navs is empty, staff has no access by design (no frontend fallback)
  const finalVisibleItems = visibleNavItems;

  // Group navigation items by category
  const groupItemsByCategory = (items) => {
    const categorized = {};
    const uncategorized = [];

    items.forEach(item => {
      const categoryId = getCategoryForNavItem(item.slug);
      
      // Special handling: room_bookings is always independent
      if (item.slug === 'room_bookings') {
        uncategorized.push(item);
      } 
      // Special handling: stock_tracker must be categorized under stock
      else if (item.slug === 'stock_tracker') {
        if (!categorized['stock']) {
          categorized['stock'] = [];
        }
        categorized['stock'].push(item);
      }
      else if (categoryId) {
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

import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { 
  NAVIGATION_CATEGORIES, 
  getCategoryForNavItem, 
  getCategoryById 
} from "@/config/navigationCategories";

// Default navigation items (fallback if not in localStorage)
const DEFAULT_NAV_ITEMS = [
  { slug: 'home', name: 'Home', path: '/staff/{hotelSlug}/feed', icon: 'house' },
  { slug: 'chat', name: 'Chat', path: '/hotel/{hotelSlug}/chat', icon: 'chat-dots' },
  // Removed 'staff-chat' - using MessengerWidget instead
  { slug: 'reception', name: 'Reception', path: '/reception', icon: 'bell' },
  { slug: 'rooms', name: 'Rooms', path: '/rooms', icon: 'door-closed' },
  { slug: 'guests', name: 'Guests', path: '/{hotelSlug}/guests', icon: 'people' },
  { slug: 'roster', name: 'Roster', path: '/roster/{hotelSlug}', icon: 'calendar-week' },
  { slug: 'staff', name: 'Staff', path: '/{hotelSlug}/staff', icon: 'person-badge' },
  { slug: 'restaurants', name: 'Restaurants', path: '/{hotelSlug}/restaurants', icon: 'shop-window' },
  { slug: 'room_bookings', name: 'Room Bookings', path: '/staff/hotel/{hotelSlug}/bookings', icon: 'bed', hasDropdown: true },
  { slug: 'bookings', name: 'Restaurant Bookings', path: '/bookings', icon: 'calendar-check' },
  { slug: 'maintenance', name: 'Maintenance', path: '/maintenance', icon: 'tools' },
  { slug: 'hotel_info', name: 'Hotel Info', path: '/hotel_info/{hotelSlug}', icon: 'info-circle' },
  { slug: 'good_to_know', name: 'Good to Know', path: '/good_to_know_console/{hotelSlug}', icon: 'book' },
  { slug: 'stock_tracker', name: 'Stock Dashboard', path: '/stock_tracker/{hotelSlug}', icon: 'graph-up' },
  { slug: 'games', name: 'Games', path: '/games/?hotel={hotelSlug}', icon: 'controller' },
  { slug: 'settings', name: 'Settings', path: '/staff/{hotelSlug}/settings', icon: 'gear', requiresHotelSlug: true },
  { slug: 'room_service', name: 'Room Service', path: '/room_services/{hotelSlug}/orders-management', icon: 'box' },
  { slug: 'breakfast', name: 'Breakfast', path: '/room_services/{hotelSlug}/breakfast-orders', icon: 'egg-fried' },
];

/**
 * Custom hook for managing navigation items
 * Handles filtering based on user permissions and hotel context
 */
export function useNavigation() {
  const { user } = useAuth();
  const { canAccessNav, isSuperUser } = usePermissions();
  
  const hotelSlug = user?.hotel_slug || '';

  // Try to get navigation items from localStorage first (saved on login)
  let savedNavItems = [];
  try {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    savedNavItems = storedUser?.navigation_items || [];
  } catch {
    savedNavItems = [];
  }

  // Use saved nav items if available, otherwise use defaults
  let allNavItems = savedNavItems.length > 0 ? savedNavItems : DEFAULT_NAV_ITEMS;

  // Replace {hotelSlug} placeholder in paths with actual hotel slug
  allNavItems = allNavItems.map(item => ({
    ...item,
    path: item.path.replace('{hotelSlug}', hotelSlug)
  }));

  // Regular staff: filter by allowed_navs AND exclude settings (superuser only)
  // Django superuser sees ALL items (bypass filtering)
  const visibleNavItems = isSuperUser 
    ? allNavItems 
    : allNavItems.filter(item => {
        // Settings is ONLY for Django superuser
        if (item.slug === 'settings') {
          return false;
        }
        return canAccessNav(item.slug);
      });

  // Group navigation items by category
  const groupItemsByCategory = (items) => {
    const categorized = {};
    const uncategorized = [];

    items.forEach(item => {
      const categoryId = getCategoryForNavItem(item.slug);
      
      // Special handling: room_bookings is always independent
      if (item.slug === 'room_bookings') {
        uncategorized.push(item);
      } else if (categoryId) {
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
  const { categorized: categorizedItems, uncategorized } = groupItemsByCategory(visibleNavItems);
  
  // Build categories with items and filter out empty categories
  const categories = NAVIGATION_CATEGORIES
    .map(category => ({
      ...category,
      items: categorizedItems[category.id] || [],
      hasNotifications: false, // Will be calculated by navbar components
    }))
    .filter(category => category.items.length > 0); // Only show categories with items


  return { 
    visibleNavItems, 
    allNavItems,
    categories,
    uncategorizedItems: uncategorized,
    hasNavigation: visibleNavItems.length > 0 
  };
}

import { useAuth } from "@/context/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";

// Default navigation items (fallback if not in localStorage)
const DEFAULT_NAV_ITEMS = [
  { slug: 'home', name: 'Home', path: '/', icon: 'house' },
  { slug: 'chat', name: 'Chat', path: '/hotel/{hotelSlug}/chat', icon: 'chat-dots' },
  { slug: 'reception', name: 'Reception', path: '/reception', icon: 'bell' },
  { slug: 'rooms', name: 'Rooms', path: '/rooms', icon: 'door-closed' },
  { slug: 'guests', name: 'Guests', path: '/{hotelSlug}/guests', icon: 'people' },
  { slug: 'roster', name: 'Roster', path: '/roster/{hotelSlug}', icon: 'calendar-week' },
  { slug: 'staff', name: 'Staff', path: '/{hotelSlug}/staff', icon: 'person-badge' },
  { slug: 'restaurants', name: 'Restaurants', path: '/{hotelSlug}/restaurants', icon: 'shop-window' },
  { slug: 'bookings', name: 'Bookings', path: '/bookings', icon: 'calendar-check' },
  { slug: 'maintenance', name: 'Maintenance', path: '/maintenance', icon: 'tools' },
  { slug: 'hotel_info', name: 'Hotel Info', path: '/hotel_info/{hotelSlug}', icon: 'info-circle' },
  { slug: 'good_to_know', name: 'Good to Know', path: '/good_to_know_console/{hotelSlug}', icon: 'book' },
  { slug: 'stock_tracker', name: 'Stock Dashboard', path: '/stock_tracker/{hotelSlug}', icon: 'graph-up' },
  { slug: 'games', name: 'Games', path: '/games/?hotel={hotelSlug}', icon: 'controller' },
  { slug: 'settings', name: 'Settings', path: '/settings', icon: 'gear' },
  { slug: 'room_service', name: 'Room Service', path: '/services/room-service', icon: 'box' },
  { slug: 'breakfast', name: 'Breakfast', path: '/services/breakfast', icon: 'egg-fried' },
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

  // Django superuser sees ALL items (bypass filtering)
  if (isSuperUser) {
    return { 
      visibleNavItems: allNavItems, 
      allNavItems,
      hasNavigation: true 
    };
  }

  // Regular staff: filter by allowed_navs AND exclude settings (superuser only)
  const visibleNavItems = allNavItems.filter(item => {
    // Settings is ONLY for Django superuser
    if (item.slug === 'settings') {
      return false;
    }
    return canAccessNav(item.slug);
  });

  // Debug logging to compare available vs visible
  if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
    console.group('🔍 Navigation Comparison');
    console.log('All Available Items:', allNavItems.map(i => i.slug));
    console.log('Visible Items:', visibleNavItems.map(i => i.slug));
    console.log('Hidden Items:', allNavItems.filter(i => !visibleNavItems.includes(i)).map(i => i.slug));
    console.groupEnd();
  }

  return { 
    visibleNavItems, 
    allNavItems,
    hasNavigation: visibleNavItems.length > 0 
  };
}

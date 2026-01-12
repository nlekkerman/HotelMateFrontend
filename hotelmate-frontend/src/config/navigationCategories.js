/**
 * Navigation Categories Configuration
 * Defines the main navigation categories and maps nav items to categories
 */

export const NAVIGATION_CATEGORIES = [
  {
    id: 'front-office',
    name: 'Front Office',
    icon: 'building',
    slug: 'front-office',
    order: 1,
  },
  {
    id: 'fnb',
    name: 'F&B',
    icon: 'cup-hot',
    slug: 'fnb',
    order: 2,
  },
  {
    id: 'staff',
    name: 'Staff',
    icon: 'people-fill',
    slug: 'staff',
    order: 3,
  },
 
  {
    id: 'guest-relations',
    name: 'Guest Relations',
    icon: 'info-circle-fill',
    slug: 'guest-relations',
    order: 5,
  },
];

/**
 * Maps navigation item slugs to their parent category
 */
export const NAV_ITEM_CATEGORY_MAP = {
  // Front Office
  'reception': 'front-office',
  'rooms': 'front-office',
  'guests': 'front-office',
  'chat': 'front-office', // Guest Chat
  'room_bookings': 'front-office', // Room bookings/reservations
  
  // F&B
  'restaurants': 'fnb',
  'bookings': 'fnb', // Restaurant bookings
  'room_service': 'fnb',
  'breakfast': 'fnb',
  'menus_management': 'fnb',
  
  // Staff
  'staff': 'staff',
  'attendance': 'staff',
  'department_roster': 'staff',
  'management_analytics': 'staff',
  'maintenance': 'staff',
  'staff_chat': 'staff',
  
  // Stock
  'stock_tracker': 'stock',
  
  // Guest Relations
  'hotel_info': 'guest-relations',
  'good_to_know': 'guest-relations',
  'games': 'guest-relations', // Entertainment
  
  // Uncategorized/Special (Home, Settings)
  'home': null,
  'settings': null,
};

/**
 * Get category for a navigation item by slug
 */
export const getCategoryForNavItem = (slug) => {
  return NAV_ITEM_CATEGORY_MAP[slug] || null;
};

/**
 * Get category object by ID
 */
export const getCategoryById = (categoryId) => {
  return NAVIGATION_CATEGORIES.find(cat => cat.id === categoryId);
};

/**
 * Check if a slug belongs to a specific category
 */
export const isInCategory = (slug, categoryId) => {
  return NAV_ITEM_CATEGORY_MAP[slug] === categoryId;
};

/**
 * Subcategory definitions for future expansion
 * These represent the detailed structure within each category
 */
export const SUBCATEGORIES = {
  'front-office': [
    { slug: 'rooms', name: 'Rooms', order: 1 },
    { slug: 'guests', name: 'Guests', order: 2 },
    { slug: 'chat', name: 'Guest Chat', order: 3 },
    { slug: 'arrivals', name: 'Arrivals', order: 4, parent: 'bookings' },
    { slug: 'departures', name: 'Departures', order: 5, parent: 'bookings' },
    { slug: 'in-house', name: 'In-House', order: 6, parent: 'bookings' },
    { slug: 'reservations', name: 'Reservations', order: 7, parent: 'bookings' },
    { slug: 'requests', name: 'Requests', order: 8 },
  ],
  'fnb': [
    { slug: 'restaurants', name: 'Restaurants', order: 1 },
    { slug: 'bookings', name: 'Restaurant Bookings', order: 2 },
    { slug: 'room_service', name: 'Room Service', order: 3 },
    { slug: 'breakfast', name: 'Breakfast', order: 4 },
    { slug: 'menus_management', name: 'Menus Management', order: 5 },
    { slug: 'menus', name: 'Menus', order: 6 },
  ],
  'staff': [
    { slug: 'staff', name: 'Staff', order: 1 },
    { slug: 'clock', name: 'Clock', order: 2 },
    { slug: 'maintenance', name: 'Maintenance', order: 4 },
    { slug: 'staff_chat', name: 'Staff Chat', order: 5 },
  ],
  'stock': [
    { slug: 'items', name: 'Items', order: 1 },
    { slug: 'stocktakes', name: 'Stocktakes', order: 2 },
    { slug: 'periods', name: 'Periods', order: 3 },
    { slug: 'operations', name: 'Operations', order: 4 },
    { slug: 'analytics', name: 'Analytics', order: 5 },
    { slug: 'sales', name: 'Sales', order: 6 },
  ],
  'guest-relations': [
    { slug: 'hotel_info', name: 'Hotel Info', order: 1 },
    { slug: 'games', name: 'Entertainment', order: 2 },
    { slug: 'good_to_know', name: 'Good To Know', order: 3 },
  ],
};

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
  'rooms': 'front-office',
  'bookings': 'front-office',
  'chat': 'front-office',
  'housekeeping': 'front-office',

  // F&B / Services
  'room_services': 'fnb',

  // Staff & Operations
  'staff_management': 'staff',
  'attendance': 'staff',
  'maintenance': 'staff',

  // Guest Relations
  'hotel_info': 'guest-relations',
  'entertainment': 'guest-relations',
  'stock_tracker': 'guest-relations',

  // Uncategorized (rendered outside category groups)
  'home': null,
  'admin_settings': null,
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
    { slug: 'bookings', name: 'Bookings', order: 2 },
    { slug: 'chat', name: 'Guest Chat', order: 3 },
    { slug: 'housekeeping', name: 'Housekeeping', order: 4 },
  ],
  'fnb': [
    { slug: 'room_services', name: 'Room Services', order: 1 },
  ],
  'staff': [
    { slug: 'staff_management', name: 'Staff', order: 1 },
    { slug: 'attendance', name: 'Attendance', order: 2 },
    { slug: 'maintenance', name: 'Maintenance', order: 3 },
  ],
  'guest-relations': [
    { slug: 'hotel_info', name: 'Hotel Info', order: 1 },
    { slug: 'entertainment', name: 'Entertainment', order: 2 },
    { slug: 'stock_tracker', name: 'Stock Tracker', order: 3 },
  ],
};

/**
 * Navigation Categories Configuration
 * Defines the main navigation categories and maps nav items to categories.
 *
 * Cleanup pass: after dead modules were removed, "F&B" and "Guest Relations"
 * only held a single nav item each, which made them awkward dropdowns.
 * They have been merged into the remaining categories:
 *   - room_services (was F&B) → now under Front Office
 *   - hotel_info (was Guest Relations) → now under Front Office
 * Synthetic pages (home, admin_settings) remain uncategorized.
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
    id: 'staff',
    name: 'Staff',
    icon: 'people-fill',
    slug: 'staff',
    order: 2,
  },
];

/**
 * Maps navigation item slugs to their parent category
 */
export const NAV_ITEM_CATEGORY_MAP = {
  // Front Office (guest-facing operations)
  'rooms': 'front-office',
  'room_bookings': 'front-office',
  'restaurant_bookings': 'front-office',
  'room_services': 'front-office',
  'chat': 'front-office',
  'housekeeping': 'front-office',
  'hotel_info': 'front-office',

  // Staff & Operations
  'staff_management': 'staff',
  'attendance': 'staff',
  'maintenance': 'staff',

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
 * Subcategory definitions — ordered lists of items within each category.
 */
export const SUBCATEGORIES = {
  'front-office': [
    { slug: 'rooms', name: 'Rooms', order: 1 },
    { slug: 'room_bookings', name: 'Room Bookings', order: 2 },
    { slug: 'restaurant_bookings', name: 'Restaurant Bookings', order: 3 },
    { slug: 'room_services', name: 'Room Services', order: 4 },
    { slug: 'housekeeping', name: 'Housekeeping', order: 5 },
    { slug: 'chat', name: 'Guest Chat', order: 6 },
    { slug: 'hotel_info', name: 'Hotel Info', order: 7 },
  ],
  'staff': [
    { slug: 'staff_management', name: 'Staff', order: 1 },
    { slug: 'attendance', name: 'Attendance', order: 2 },
    { slug: 'maintenance', name: 'Maintenance', order: 3 },
  ],
};


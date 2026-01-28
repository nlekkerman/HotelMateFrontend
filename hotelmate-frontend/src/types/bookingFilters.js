/**
 * @fileoverview Booking List Filters - Single Source of Truth
 * Canonical filter model and URL serialization for staff room bookings
 */

/**
 * @typedef {Object} BookingListFilters
 * @property {string|null} bucket - Operational bucket filter
 * @property {'stay'|'created'|'updated'|'checked_in'|'checked_out'} date_mode - Date filtering mode
 * @property {string|null} date_from - Start date (YYYY-MM-DD)
 * @property {string|null} date_to - End date (YYYY-MM-DD)
 * @property {string} q - Text search query
 * @property {boolean|null} assigned - Room assignment filter
 * @property {number|null} room_id - Specific room ID
 * @property {string|null} room_number - Room number filter
 * @property {string|null} room_type - Room type filter
 * @property {number|null} adults - Number of adults
 * @property {number|null} children - Number of children
 * @property {number|null} party_size_min - Minimum party size
 * @property {number|null} party_size_max - Maximum party size
 * @property {'complete'|'pending'|'none'|null} precheckin - Pre-checkin status
 * @property {number|null} amount_min - Minimum booking amount
 * @property {number|null} amount_max - Maximum booking amount
 * @property {string|null} currency - Currency filter
 * @property {string|null} payment_status - Payment status filter
 * @property {boolean|null} seen - Seen status filter
 * @property {number|null} seen_by_staff_id - Seen by specific staff member
 * @property {string[]} status - Status filters (array, serialized as comma-separated)
 * @property {string|null} ordering - Sort order
 * @property {boolean} include_counts - Whether to include bucket counts
 */

/**
 * Default filter values
 * @type {BookingListFilters}
 */
export const defaultBookingListFilters = {
  bucket: null,
  date_mode: 'stay',
  date_from: null,
  date_to: null,
  q: '',
  assigned: null,
  room_id: null,
  room_number: null,
  room_type: null,
  adults: null,
  children: null,
  party_size_min: null,
  party_size_max: null,
  precheckin: null,
  amount_min: null,
  amount_max: null,
  currency: null,
  payment_status: null,
  seen: null,
  seen_by_staff_id: null,
  status: [],
  ordering: null,
  include_counts: true
};

/**
 * Backend-validated allowed bucket values
 */
export const ALLOWED_BUCKETS = [
  'arrivals',
  'in_house', 
  'departures',
  'pending',
  'checked_out',
  'cancelled',
  'expired',
  'no_show',
  'overdue_checkout'
];

/**
 * Available bucket options
 */
export const BUCKET_OPTIONS = [
  { value: null, label: 'All', key: 'all' },
  { value: 'arrivals', label: 'Arrivals', key: 'arrivals' },
  { value: 'in_house', label: 'In-House', key: 'in_house' },
  { value: 'departures', label: 'Departures', key: 'departures' },
  { value: 'pending', label: 'Pending', key: 'pending' },
  { value: 'checked_out', label: 'Checked Out', key: 'checked_out' },
  { value: 'cancelled', label: 'Cancelled', key: 'cancelled' },
  { value: 'expired', label: 'Expired', key: 'expired' },
  { value: 'no_show', label: 'No Show', key: 'no_show' },
  { value: 'overdue_checkout', label: 'Overdue Checkout', key: 'overdue_checkout' }
];

/**
 * Available date mode options
 */
export const DATE_MODE_OPTIONS = [
  { value: 'stay', label: 'Stay Dates' },
  { value: 'created', label: 'Created Date' },
  { value: 'updated', label: 'Updated Date' },
  { value: 'checked_in', label: 'Check-in Date' },
  { value: 'checked_out', label: 'Check-out Date' }
];

/**
 * Available precheckin options
 */
export const PRECHECKIN_OPTIONS = [
  { value: null, label: 'All' },
  { value: 'complete', label: 'Complete' },
  { value: 'pending', label: 'Pending' },
  { value: 'none', label: 'None' }
];

/**
 * Available ordering options
 */
export const ORDERING_OPTIONS = [
  { value: null, label: 'Default' },
  { value: 'created_at', label: 'Created Date (Oldest)' },
  { value: '-created_at', label: 'Created Date (Newest)' },
  { value: 'check_in', label: 'Check-in Date (Earliest)' },
  { value: '-check_in', label: 'Check-in Date (Latest)' },
  { value: 'check_out', label: 'Check-out Date (Earliest)' },
  { value: '-check_out', label: 'Check-out Date (Latest)' },
  { value: 'total_amount', label: 'Amount (Low to High)' },
  { value: '-total_amount', label: 'Amount (High to Low)' },
  { value: 'guest_name', label: 'Guest Name (A-Z)' },
  { value: '-guest_name', label: 'Guest Name (Z-A)' }
];

/**
 * Available status options
 */
export const STATUS_OPTIONS = [
  'PENDING_PAYMENT',
  'PENDING_APPROVAL',
  'CONFIRMED',
  'CANCELLED',
  'COMPLETED',
  'NO_SHOW',
  'EXPIRED'
];

/**
 * Build URLSearchParams from BookingListFilters
 * @param {BookingListFilters} filters - Filter state
 * @param {number} [page=1] - Current page number
 * @returns {URLSearchParams} URL parameters for API request
 */
export function buildBookingListSearchParams(filters, page = 1) {
  const params = new URLSearchParams();

  // Add page if not 1
  if (page > 1) {
    params.append('page', page.toString());
  }

  // Add filters (only non-null, non-empty values)
  if (filters.bucket && ALLOWED_BUCKETS.includes(filters.bucket)) {
    params.append('bucket', filters.bucket);
  }

  if (filters.date_mode && filters.date_mode !== 'stay') {
    params.append('date_mode', filters.date_mode);
  }

  if (filters.date_from) {
    params.append('date_from', filters.date_from);
  }

  if (filters.date_to) {
    params.append('date_to', filters.date_to);
  }

  if (filters.q?.trim()) {
    params.append('q', filters.q.trim());
  }

  if (filters.assigned !== null) {
    params.append('assigned', filters.assigned ? 'true' : 'false');
  }

  if (filters.room_id !== null) {
    params.append('room_id', filters.room_id.toString());
  }

  if (filters.room_number) {
    params.append('room_number', filters.room_number);
  }

  if (filters.room_type) {
    params.append('room_type', filters.room_type);
  }

  if (filters.adults !== null) {
    params.append('adults', filters.adults.toString());
  }

  if (filters.children !== null) {
    params.append('children', filters.children.toString());
  }

  if (filters.party_size_min !== null) {
    params.append('party_size_min', filters.party_size_min.toString());
  }

  if (filters.party_size_max !== null) {
    params.append('party_size_max', filters.party_size_max.toString());
  }

  if (filters.precheckin) {
    params.append('precheckin', filters.precheckin);
  }

  if (filters.amount_min !== null) {
    params.append('amount_min', filters.amount_min.toString());
  }

  if (filters.amount_max !== null) {
    params.append('amount_max', filters.amount_max.toString());
  }

  if (filters.currency) {
    params.append('currency', filters.currency);
  }

  if (filters.payment_status) {
    params.append('payment_status', filters.payment_status);
  }

  if (filters.seen !== null) {
    params.append('seen', filters.seen ? 'true' : 'false');
  }

  if (filters.seen_by_staff_id !== null) {
    params.append('seen_by_staff_id', filters.seen_by_staff_id.toString());
  }

  if (filters.status?.length > 0) {
    params.append('status', filters.status.join(','));
  }

  if (filters.ordering) {
    params.append('ordering', filters.ordering);
  }

  if (!filters.include_counts) {
    params.append('include_counts', '0');
  }

  return params;
}

/**
 * Parse URLSearchParams into BookingListFilters
 * @param {URLSearchParams} searchParams - URL search parameters
 * @returns {BookingListFilters} Parsed filter state
 */
export function parseBookingListFiltersFromSearchParams(searchParams) {
  const filters = { ...defaultBookingListFilters };

  // Parse bucket
  if (searchParams.has('bucket')) {
    const bucket = searchParams.get('bucket');
    if (bucket && ALLOWED_BUCKETS.includes(bucket)) {
      filters.bucket = bucket;
    }
  }

  // Parse date_mode
  if (searchParams.has('date_mode')) {
    const dateMode = searchParams.get('date_mode');
    if (DATE_MODE_OPTIONS.some(opt => opt.value === dateMode)) {
      filters.date_mode = dateMode;
    }
  }

  // Parse dates
  if (searchParams.has('date_from')) {
    filters.date_from = searchParams.get('date_from');
  }

  if (searchParams.has('date_to')) {
    filters.date_to = searchParams.get('date_to');
  }

  // Parse search query
  if (searchParams.has('q')) {
    filters.q = searchParams.get('q') || '';
  }

  // Parse assigned
  if (searchParams.has('assigned')) {
    const assigned = searchParams.get('assigned');
    filters.assigned = assigned === 'true' ? true : assigned === 'false' ? false : null;
  }

  // Parse room_id
  if (searchParams.has('room_id')) {
    const roomId = parseInt(searchParams.get('room_id'), 10);
    if (!isNaN(roomId)) {
      filters.room_id = roomId;
    }
  }

  // Parse room_number
  if (searchParams.has('room_number')) {
    filters.room_number = searchParams.get('room_number');
  }

  // Parse room_type
  if (searchParams.has('room_type')) {
    filters.room_type = searchParams.get('room_type');
  }

  // Parse numeric filters
  const numericFields = ['adults', 'children', 'party_size_min', 'party_size_max', 'amount_min', 'amount_max', 'seen_by_staff_id'];
  numericFields.forEach(field => {
    if (searchParams.has(field)) {
      const value = parseFloat(searchParams.get(field));
      if (!isNaN(value)) {
        filters[field] = value;
      }
    }
  });

  // Parse precheckin
  if (searchParams.has('precheckin')) {
    const precheckin = searchParams.get('precheckin');
    if (PRECHECKIN_OPTIONS.some(opt => opt.value === precheckin)) {
      filters.precheckin = precheckin;
    }
  }

  // Parse currency
  if (searchParams.has('currency')) {
    filters.currency = searchParams.get('currency');
  }

  // Parse payment_status
  if (searchParams.has('payment_status')) {
    filters.payment_status = searchParams.get('payment_status');
  }

  // Parse seen
  if (searchParams.has('seen')) {
    const seen = searchParams.get('seen');
    filters.seen = seen === 'true' ? true : seen === 'false' ? false : null;
  }

  // Parse status array
  if (searchParams.has('status')) {
    const statusString = searchParams.get('status');
    if (statusString) {
      const statusArray = statusString.split(',').filter(s => STATUS_OPTIONS.includes(s.trim()));
      filters.status = statusArray;
    }
  }

  // Parse ordering
  if (searchParams.has('ordering')) {
    const ordering = searchParams.get('ordering');
    if (ORDERING_OPTIONS.some(opt => opt.value === ordering)) {
      filters.ordering = ordering;
    }
  }

  // Parse include_counts
  if (searchParams.has('include_counts')) {
    filters.include_counts = searchParams.get('include_counts') !== '0';
  }

  return filters;
}

/**
 * Get current page from URLSearchParams
 * @param {URLSearchParams} searchParams - URL search parameters
 * @returns {number} Current page number (default 1)
 */
export function getCurrentPageFromSearchParams(searchParams) {
  const pageParam = searchParams.get('page');
  const page = parseInt(pageParam, 10);
  return isNaN(page) || page < 1 ? 1 : page;
}
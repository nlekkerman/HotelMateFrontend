// src/realtime/debug/realtimeDebugStore.js
// Disposable realtime debug store — delete this folder to remove all debug UI
// Module-level singleton: survives React lifecycle, route changes, provider remounts.

const MAX_EVENTS = 100;

let _state = {
  hotelSlug: null,
  subscribedChannels: [], // { name, subscribedAt, unsubscribedAt? }
  events: [],             // rolling list of event records
  errors: [],
  counters: {
    receivedCount: 0,
    routedCount: 0,
    dispatchedCount: 0,
    invalidatedCount: 0,
    ignoredCount: 0,
    errorCount: 0,
    queryStartCount: 0,
    querySuccessCount: 0,
    cacheUpdateCount: 0,
    uiRenderCount: 0,
  },
  collapsed: false,       // UI state — persisted here so it survives remounts
};

// Cached snapshot for useSyncExternalStore (same reference until _notify)
let _snapshot = { ..._state };

let _listeners = new Set();

function _notify() {
  _snapshot = { ..._state };
  _listeners.forEach(fn => {
    try { fn(); } catch (_) { /* no-op */ }
  });
}

let _eventIdCounter = 0;

// ─── Public API ───

/**
 * Subscribe to store changes.
 * Compatible with React useSyncExternalStore(subscribe, getSnapshot).
 * @param {Function} listener - called with no args on every state change
 * @returns {Function} unsubscribe
 */
export function subscribe(listener) {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

/**
 * Return a stable snapshot reference (only changes on _notify).
 * Use as the getSnapshot arg for useSyncExternalStore.
 */
export function getSnapshot() {
  return _snapshot;
}

export function clearDebugState() {
  _state = {
    hotelSlug: _state.hotelSlug,
    subscribedChannels: _state.subscribedChannels,
    collapsed: _state.collapsed,
    events: [],
    errors: [],
    counters: {
      receivedCount: 0,
      routedCount: 0,
      dispatchedCount: 0,
      invalidatedCount: 0,
      ignoredCount: 0,
      errorCount: 0,
      queryStartCount: 0,
      querySuccessCount: 0,
      cacheUpdateCount: 0,
      uiRenderCount: 0,
    },
  };
  _notify();
}

export function setHotelSlug(slug) {
  _state.hotelSlug = slug;
  _notify();
}

export function setCollapsed(collapsed) {
  _state.collapsed = !!collapsed;
  _notify();
}

export function addSubscription(channelName) {
  const existing = _state.subscribedChannels.find(c => c.name === channelName && !c.unsubscribedAt);
  if (existing) return; // already tracked
  _state.subscribedChannels = [
    ..._state.subscribedChannels,
    { name: channelName, subscribedAt: new Date().toISOString() },
  ];
  _notify();
}

export function removeSubscription(channelName) {
  _state.subscribedChannels = _state.subscribedChannels.map(c =>
    c.name === channelName && !c.unsubscribedAt
      ? { ...c, unsubscribedAt: new Date().toISOString() }
      : c
  );
  _notify();
}

export function pushEvent(record) {
  _eventIdCounter += 1;
  const entry = {
    id: _eventIdCounter,
    timestamp: new Date().toISOString(),
    routed: false,
    dispatchedToStore: false,
    invalidatedQueries: [],
    invalidationSource: null,
    ignored: false,
    error: null,
    status: null,
    roomNumber: null,
    ...record,
  };
  _state.events = [entry, ..._state.events].slice(0, MAX_EVENTS);
  _state.counters.receivedCount += 1;
  _notify();
  return entry.id;
}

export function updateEvent(id, patch) {
  _state.events = _state.events.map(e =>
    e.id === id ? { ...e, ...patch } : e
  );
  if (patch.routed) _state.counters.routedCount += 1;
  if (patch.dispatchedToStore) _state.counters.dispatchedCount += 1;
  if (patch.ignored) _state.counters.ignoredCount += 1;
  if (patch.invalidatedQueries?.length) _state.counters.invalidatedCount += 1;
  if (patch.error) _state.counters.errorCount += 1;
  _notify();
}

/**
 * Find the last event matching a bookingId (for linking cache diffs to their source).
 */
export function findEventByBookingId(bookingId) {
  return _state.events.find(e => !e._debugRecord && e.bookingId === bookingId);
}

export function pushError(errorMsg, context) {
  _state.errors = [
    { message: errorMsg, context, timestamp: new Date().toISOString() },
    ..._state.errors,
  ].slice(0, 30);
  _state.counters.errorCount += 1;
  _notify();
}

// ─── Pipeline debug records (query, cache, UI render) ───

const COUNTER_MAP = {
  'query-refetch-start': 'queryStartCount',
  'query-refetch-success': 'querySuccessCount',
  'cache-updated': 'cacheUpdateCount',
  'ui-rendered': 'uiRenderCount',
};

/**
 * Push a pipeline debug record into the shared event log.
 * @param {Object} record
 * @param {string} record.type - 'query-refetch-start' | 'query-refetch-success' | 'cache-updated' | 'ui-rendered'
 * @param {string} [record.queryFamily] - e.g. 'staff-room-bookings'
 * @param {string} [record.component] - e.g. 'BookingList'
 * @param {string} [record.bookingId]
 * @param {number|string} [record.roomId]
 * @param {string} [record.summary] - one-line readable summary
 */
export function pushDebugRecord(record) {
  _eventIdCounter += 1;
  const entry = {
    id: _eventIdCounter,
    timestamp: new Date().toISOString(),
    _debugRecord: true,  // distinguishes from realtime events
    ...record,
  };
  _state.events = [entry, ..._state.events].slice(0, MAX_EVENTS);
  const counterKey = COUNTER_MAP[record.type];
  if (counterKey) _state.counters[counterKey] = (_state.counters[counterKey] || 0) + 1;
  _notify();
}

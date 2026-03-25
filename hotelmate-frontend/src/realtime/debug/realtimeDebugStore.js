// src/realtime/debug/realtimeDebugStore.js
// Disposable realtime debug store — delete this folder to remove all debug UI

const MAX_EVENTS = 50;

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
  },
};

let _listeners = new Set();

function _notify() {
  _listeners.forEach(fn => {
    try { fn({ ..._state }); } catch (_) { /* no-op */ }
  });
}

let _eventIdCounter = 0;

// ─── Public API ───

export function subscribe(listener) {
  _listeners.add(listener);
  listener({ ..._state });
  return () => _listeners.delete(listener);
}

export function getDebugState() {
  return { ..._state };
}

export function clearDebugState() {
  _state = {
    hotelSlug: _state.hotelSlug,
    subscribedChannels: _state.subscribedChannels,
    events: [],
    errors: [],
    counters: {
      receivedCount: 0,
      routedCount: 0,
      dispatchedCount: 0,
      invalidatedCount: 0,
      ignoredCount: 0,
      errorCount: 0,
    },
  };
  _notify();
}

export function setHotelSlug(slug) {
  _state.hotelSlug = slug;
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
    ignored: false,
    error: null,
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

export function pushError(errorMsg, context) {
  _state.errors = [
    { message: errorMsg, context, timestamp: new Date().toISOString() },
    ..._state.errors,
  ].slice(0, 30);
  _state.counters.errorCount += 1;
  _notify();
}

// src/realtime/debug/chatDebugStore.js
// Chat-specific realtime debug store — delete this file to disable chat debug panel.
// Module-level singleton: survives React lifecycle, route changes, provider remounts.

const MAX_EVENTS = 150;
const MAX_CHANNELS = 50;

let _state = {
  // Active chat channels grouped by domain
  channels: [],
  // { name, domain, subscribedAt, unsubscribedAt?, lastEventAt?, status, sourceClient }
  // domain: 'guest-private' | 'staff-chat' | 'guest-broadcast' | 'guest-notifications' | 'unknown'

  // Rolling chat event log
  events: [],

  // Chat-specific counters
  counters: {
    subscribed: 0,
    rcv: 0,
    routed: 0,
    dispatched: 0,
    deduped: 0,
    dropped: 0,
    optimistic: 0,
    reconciled: 0,
    syncStart: 0,
    syncOk: 0,
    syncErr: 0,
    apiSend: 0,
    apiSendOk: 0,
    apiSendErr: 0,
    uiAdd: 0,
    uiReplace: 0,
    uiRemove: 0,
    errors: 0,
  },

  // Current conversation state snapshot
  conversationSnapshot: {
    conversationId: null,
    bookingId: null,
    channelName: null,
    boundMessageCreated: null,
    boundMessageRead: null,
    connectionState: null,
    confirmedCount: 0,
    optimisticCount: 0,
    lastConfirmedId: null,
    lastOptimisticClientId: null,
    dataSource: null,       // 'hook' | 'store' | 'synthesized'
    uiMode: null,           // 'guest' | 'staff'
  },

  // Mismatch diagnostics — array of active warnings
  diagnostics: [],
  // { id, severity, message, detail, detectedAt }

  collapsed: true,
  errors: [],
};

let _snapshot = { ..._state };
let _listeners = new Set();
let _eventIdCounter = 0;

function _notify() {
  _snapshot = { ..._state };
  _listeners.forEach(fn => {
    try { fn(); } catch (_) { /* no-op */ }
  });
}

// ─── Public API (useSyncExternalStore compatible) ───

export function subscribe(listener) {
  _listeners.add(listener);
  return () => _listeners.delete(listener);
}

export function getSnapshot() {
  return _snapshot;
}

export function clearChatDebugState() {
  _state = {
    ..._state,
    events: [],
    errors: [],
    diagnostics: [],
    counters: {
      subscribed: _state.counters.subscribed,
      rcv: 0, routed: 0, dispatched: 0, deduped: 0, dropped: 0,
      optimistic: 0, reconciled: 0,
      syncStart: 0, syncOk: 0, syncErr: 0,
      apiSend: 0, apiSendOk: 0, apiSendErr: 0,
      uiAdd: 0, uiReplace: 0, uiRemove: 0,
      errors: 0,
    },
  };
  _notify();
}

export function setCollapsed(collapsed) {
  _state.collapsed = !!collapsed;
  _notify();
}

// ─── Channel tracking ───

function classifyChannel(channelName) {
  if (!channelName) return 'unknown';
  if (channelName.includes('-guest-chat-booking-')) return 'guest-private';
  if (channelName.includes('.staff-chat.')) return 'staff-chat';
  if (channelName.endsWith('-guest-messages')) return 'guest-broadcast';
  if (channelName.includes('-notifications')) return 'guest-notifications';
  return 'unknown';
}

export function addChatChannel(channelName, sourceClient) {
  const existing = _state.channels.find(c => c.name === channelName && !c.unsubscribedAt);
  if (existing) return;
  _state.channels = [
    ..._state.channels,
    {
      name: channelName,
      domain: classifyChannel(channelName),
      subscribedAt: new Date().toISOString(),
      unsubscribedAt: null,
      lastEventAt: null,
      status: 'subscribing',
      sourceClient: sourceClient || 'unknown',
    },
  ].slice(-MAX_CHANNELS);
  _state.counters.subscribed += 1;
  _notify();
}

export function updateChatChannelStatus(channelName, status) {
  _state.channels = _state.channels.map(c =>
    c.name === channelName && !c.unsubscribedAt ? { ...c, status } : c
  );
  _notify();
}

export function removeChatChannel(channelName) {
  _state.channels = _state.channels.map(c =>
    c.name === channelName && !c.unsubscribedAt
      ? { ...c, unsubscribedAt: new Date().toISOString(), status: 'unsubscribed' }
      : c
  );
  _notify();
}

function touchChannelLastEvent(channelName) {
  const now = new Date().toISOString();
  _state.channels = _state.channels.map(c =>
    c.name === channelName && !c.unsubscribedAt ? { ...c, lastEventAt: now } : c
  );
}

// ─── Event log ───

/**
 * Push a chat event into the debug log.
 * @returns {number} Event ID for later updates
 */
export function pushChatEvent(record) {
  _eventIdCounter += 1;
  const entry = {
    id: _eventIdCounter,
    timestamp: new Date().toISOString(),
    source: record.source || 'unknown',
    channel: record.channel || null,
    rawEventName: record.rawEventName || null,
    normalizedCategory: record.normalizedCategory || null,
    conversationId: record.conversationId || null,
    bookingId: record.bookingId || null,
    messageId: record.messageId || null,
    clientMessageId: record.clientMessageId || null,
    eventId: record.eventId || null,
    outcome: record.outcome || 'received', // received | processed | ignored | deduped | dropped | error
    payloadPreview: record.payloadPreview || null,
    detail: record.detail || null,
    ...record,
  };
  _state.events = [entry, ..._state.events].slice(0, MAX_EVENTS);
  if (entry.channel) touchChannelLastEvent(entry.channel);
  _notify();
  return entry.id;
}

export function updateChatEvent(id, patch) {
  _state.events = _state.events.map(e => e.id === id ? { ...e, ...patch } : e);
  _notify();
}

// ─── Counter helpers ───

export function incrementCounter(name, amount = 1) {
  if (name in _state.counters) {
    _state.counters[name] += amount;
    _notify();
  }
}

// ─── Conversation snapshot ───

export function updateConversationSnapshot(patch) {
  _state.conversationSnapshot = { ..._state.conversationSnapshot, ...patch };
  _notify();
}

// ─── Diagnostics ───

let _diagIdCounter = 0;

export function addDiagnostic(severity, message, detail) {
  _diagIdCounter += 1;
  const diag = {
    id: _diagIdCounter,
    severity, // 'warning' | 'error' | 'info'
    message,
    detail: detail || null,
    detectedAt: new Date().toISOString(),
  };
  // Avoid exact duplicate messages within 5 seconds
  const recent = _state.diagnostics.find(
    d => d.message === message && (Date.now() - new Date(d.detectedAt).getTime()) < 5000
  );
  if (recent) return;

  _state.diagnostics = [diag, ..._state.diagnostics].slice(0, 30);
  _notify();
}

export function clearDiagnostics() {
  _state.diagnostics = [];
  _notify();
}

// ─── Errors ───

export function pushChatError(errorMsg, context) {
  _state.errors = [
    { message: errorMsg, context, timestamp: new Date().toISOString() },
    ..._state.errors,
  ].slice(0, 30);
  _state.counters.errors += 1;
  _notify();
}

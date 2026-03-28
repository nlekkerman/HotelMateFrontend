// src/realtime/debug/chatDebugLogger.js
// Thin instrumentation helpers for chat realtime debugging.
// All functions no-op safely if the debug store is missing.
// To remove: delete this file + ChatRealtimeDebugPanel.

import * as store from './chatDebugStore.js';

// Chat channel patterns we track
const CHAT_CHANNEL_PATTERNS = [
  '-guest-chat-booking-',
  '.staff-chat.',
  '-guest-messages',
  '-notifications',
];

function isChatChannel(channelName) {
  if (!channelName) return false;
  return CHAT_CHANNEL_PATTERNS.some(p => channelName.includes(p));
}

function previewPayload(payload) {
  if (!payload) return null;
  try {
    const s = JSON.stringify(payload);
    return s.length > 120 ? s.slice(0, 120) + '…' : s;
  } catch { return '[unserializable]'; }
}

function extractIds(payload) {
  const inner = payload?.payload ?? payload;
  return {
    conversationId: inner?.conversation_id ?? inner?.conversation ?? payload?.conversation_id ?? null,
    bookingId: inner?.booking_id ?? payload?.booking_id ?? null,
    messageId: inner?.id ?? inner?.message_id ?? payload?.id ?? null,
    clientMessageId: inner?.client_message_id ?? payload?.client_message_id ?? null,
    eventId: payload?.meta?.event_id ?? inner?.event_id ?? payload?.event_id ?? null,
  };
}

// ─── Channel lifecycle ───

export function logChatSubscription(channelName, sourceClient) {
  try {
    if (!isChatChannel(channelName)) return;
    store.addChatChannel(channelName, sourceClient);
  } catch (_) { /* no-op */ }
}

export function logChatSubscriptionSucceeded(channelName) {
  try {
    if (!isChatChannel(channelName)) return;
    store.updateChatChannelStatus(channelName, 'connected');
    store.pushChatEvent({
      source: 'pusher',
      channel: channelName,
      rawEventName: 'pusher:subscription_succeeded',
      outcome: 'processed',
      detail: 'Channel subscription succeeded',
    });
  } catch (_) { /* no-op */ }
}

export function logChatSubscriptionError(channelName, error) {
  try {
    if (!isChatChannel(channelName)) return;
    store.updateChatChannelStatus(channelName, 'error');
    store.pushChatError('Subscription error: ' + channelName, { error: String(error) });
    store.addDiagnostic('error', `Subscription error on ${channelName}`, String(error));
  } catch (_) { /* no-op */ }
}

export function logChatUnsubscription(channelName) {
  try {
    if (!isChatChannel(channelName)) return;
    store.removeChatChannel(channelName);
  } catch (_) { /* no-op */ }
}

// ─── Incoming events ───

/**
 * Log an incoming chat realtime event.
 * @returns {number|null} debug event ID for follow-up updates
 */
export function logChatEventReceived(channel, rawEventName, rawPayload) {
  try {
    if (!isChatChannel(channel)) return null;
    // Skip pusher system events from the feed (subscription_succeeded logged separately)
    if (rawEventName?.startsWith('pusher:')) return null;
    const ids = extractIds(rawPayload);
    store.incrementCounter('rcv');
    return store.pushChatEvent({
      source: 'pusher',
      channel,
      rawEventName,
      ...ids,
      payloadPreview: previewPayload(rawPayload),
      outcome: 'received',
    });
  } catch (_) { return null; }
}

export function logChatEventRouted(debugEventId, { normalizedCategory, normalizedType } = {}) {
  try {
    if (debugEventId == null) return;
    store.updateChatEvent(debugEventId, {
      outcome: 'processed',
      normalizedCategory,
      normalizedType: normalizedType || null,
    });
    store.incrementCounter('routed');
  } catch (_) { /* no-op */ }
}

export function logChatEventDispatched(debugEventId, storeName) {
  try {
    if (debugEventId == null) return;
    store.updateChatEvent(debugEventId, {
      detail: `dispatched → ${storeName || 'store'}`,
    });
    store.incrementCounter('dispatched');
  } catch (_) { /* no-op */ }
}

export function logChatEventDeduped(channel, rawEventName, rawPayload, reason) {
  try {
    if (!isChatChannel(channel)) return;
    const ids = extractIds(rawPayload);
    store.pushChatEvent({
      source: 'dedup',
      channel,
      rawEventName,
      ...ids,
      outcome: 'deduped',
      detail: reason || 'processedEventIds',
      payloadPreview: previewPayload(rawPayload),
    });
    store.incrementCounter('deduped');
  } catch (_) { /* no-op */ }
}

export function logChatEventDropped(channel, rawEventName, rawPayload, reason) {
  try {
    const ids = extractIds(rawPayload);
    store.pushChatEvent({
      source: 'drop',
      channel,
      rawEventName,
      ...ids,
      outcome: 'dropped',
      detail: reason || 'unknown',
      payloadPreview: previewPayload(rawPayload),
    });
    store.incrementCounter('dropped');
    if (reason?.includes('event_id')) {
      store.addDiagnostic('warning', 'Event dropped: missing event_id', `${rawEventName} on ${channel}`);
    }
  } catch (_) { /* no-op */ }
}

// ─── Optimistic / reconciliation ───

export function logOptimisticAdd(clientMessageId, message) {
  try {
    store.pushChatEvent({
      source: 'local optimistic',
      rawEventName: 'optimistic_add',
      clientMessageId,
      messageId: null,
      outcome: 'processed',
      detail: `optimistic: "${(message || '').slice(0, 40)}"`,
    });
    store.incrementCounter('optimistic');
  } catch (_) { /* no-op */ }
}

export function logOptimisticReconcile(clientMessageId, confirmedId) {
  try {
    store.pushChatEvent({
      source: 'local optimistic',
      rawEventName: 'optimistic_reconcile',
      clientMessageId,
      messageId: confirmedId,
      outcome: 'processed',
      detail: `reconciled: ${clientMessageId} → ${confirmedId}`,
    });
    store.incrementCounter('reconciled');
  } catch (_) { /* no-op */ }
}

// ─── Sync & API ───

export function logSyncStart(source) {
  try {
    store.pushChatEvent({
      source: source || 'sync',
      rawEventName: 'syncMessages_start',
      outcome: 'processed',
      detail: 'Fetching latest messages from API',
    });
    store.incrementCounter('syncStart');
  } catch (_) { /* no-op */ }
}

export function logSyncSuccess(source, count) {
  try {
    store.pushChatEvent({
      source: source || 'sync',
      rawEventName: 'syncMessages_success',
      outcome: 'processed',
      detail: `Synced ${count ?? '?'} messages`,
    });
    store.incrementCounter('syncOk');
  } catch (_) { /* no-op */ }
}

export function logSyncError(source, error) {
  try {
    store.pushChatEvent({
      source: source || 'sync',
      rawEventName: 'syncMessages_error',
      outcome: 'error',
      detail: String(error),
    });
    store.incrementCounter('syncErr');
    store.pushChatError('Sync failed: ' + String(error), { source });
  } catch (_) { /* no-op */ }
}

export function logApiSend(clientMessageId) {
  try {
    store.pushChatEvent({
      source: 'api',
      rawEventName: 'sendMessage',
      clientMessageId,
      outcome: 'processed',
      detail: 'API send started',
    });
    store.incrementCounter('apiSend');
  } catch (_) { /* no-op */ }
}

export function logApiSendSuccess(clientMessageId, confirmedId) {
  try {
    store.pushChatEvent({
      source: 'api',
      rawEventName: 'sendMessage_success',
      clientMessageId,
      messageId: confirmedId,
      outcome: 'processed',
      detail: `API confirmed id=${confirmedId}`,
    });
    store.incrementCounter('apiSendOk');
  } catch (_) { /* no-op */ }
}

export function logApiSendError(clientMessageId, error) {
  try {
    store.pushChatEvent({
      source: 'api',
      rawEventName: 'sendMessage_error',
      clientMessageId,
      outcome: 'error',
      detail: String(error),
    });
    store.incrementCounter('apiSendErr');
    store.pushChatError('Send failed: ' + String(error), { clientMessageId });
  } catch (_) { /* no-op */ }
}

// ─── UI mutations ───

export function logUiAdd(messageId, source) {
  try {
    store.pushChatEvent({
      source: source || 'ui',
      rawEventName: 'ui_message_added',
      messageId,
      outcome: 'processed',
      detail: `Message ${messageId} added to UI`,
    });
    store.incrementCounter('uiAdd');
  } catch (_) { /* no-op */ }
}

export function logUiReplace(messageId, detail) {
  try {
    store.pushChatEvent({
      source: 'ui',
      rawEventName: 'ui_message_replaced',
      messageId,
      outcome: 'processed',
      detail: detail || `Message ${messageId} replaced in UI`,
    });
    store.incrementCounter('uiReplace');
  } catch (_) { /* no-op */ }
}

export function logUiRemove(messageId, detail) {
  try {
    store.pushChatEvent({
      source: 'ui',
      rawEventName: 'ui_message_removed',
      messageId,
      outcome: 'processed',
      detail: detail || `Message ${messageId} removed from UI`,
    });
    store.incrementCounter('uiRemove');
  } catch (_) { /* no-op */ }
}

// ─── Conversation snapshot ───

export function updateSnapshot(patch) {
  try {
    store.updateConversationSnapshot(patch);
  } catch (_) { /* no-op */ }
}

// ─── Mismatch diagnostics ───

export function checkChannelMismatch(expectedChannel, subscribedChannels, uiMode) {
  try {
    if (!expectedChannel) return;
    const subNames = (subscribedChannels || []).map(c => c.name || c);
    if (!subNames.some(n => n === expectedChannel)) {
      store.addDiagnostic(
        'error',
        `Expected channel not subscribed: ${expectedChannel}`,
        `UI mode: ${uiMode}, subscribed: [${subNames.join(', ')}]`
      );
    }
  } catch (_) { /* no-op */ }
}

export function checkUnexpectedChannel(channel, expectedDomains) {
  try {
    if (!channel) return;
    const domain = isChatChannel(channel) ? 'chat' : 'other';
    if (domain === 'chat' && expectedDomains && !expectedDomains.includes(channel)) {
      store.addDiagnostic(
        'warning',
        `Event on unexpected channel: ${channel}`,
        `Expected one of: ${expectedDomains.join(', ')}`
      );
    }
  } catch (_) { /* no-op */ }
}

export function checkMissingEventId(channel, rawEventName) {
  try {
    store.addDiagnostic(
      'warning',
      `Missing event_id on ${rawEventName}`,
      `Channel: ${channel}`
    );
  } catch (_) { /* no-op */ }
}

export function logChatError(errorMsg, context) {
  try {
    store.pushChatError(errorMsg, context);
  } catch (_) { /* no-op */ }
}

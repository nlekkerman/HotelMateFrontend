/**
 * Guest Chat Hook — LOCKED BACKEND CONTRACT
 *
 * Bootstrap: GET /api/guest/hotel/{slug}/chat/context?token=RAW_TOKEN
 *   → returns flat contract with chat_session, channel_name, events, pusher config
 *
 * All post-bootstrap calls use chat_session via X-Guest-Chat-Session header.
 * Raw token is NEVER used after bootstrap.
 *
 * Realtime:
 * - Pusher key/cluster/authEndpoint from bootstrap pusher.* fields
 * - Channel from bootstrap channel_name
 * - Binds all contract events: message_created, message_read,
 *   message_deleted, message_edited, unread_updated
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { createGuestPusherClient, disconnectGuestPusher } from '../realtime/guestRealtimeClient';
import * as guestChatAPI from '../services/guestChatAPI';
import { useGuestChatDispatch, guestChatActions } from '../realtime/stores/guestChatStore';
import * as chatDbg from '../realtime/debug/chatDebugLogger';

const DEBUG_REALTIME = import.meta.env.DEV;

const generateClientMessageId = () => uuidv4();

/** Normalize a raw realtime payload into a deterministic message shape */
function normalizeRealtimeMessage(payload, fallbackConversationId) {
  return {
    id: payload.id,
    conversation_id: payload.conversation_id || fallbackConversationId,
    booking_id: payload.booking_id,
    sender_type: payload.sender_type || payload.sender_role,
    sender_name: payload.sender_name,
    staff_display_name: payload.staff_display_name || null,
    staff_role_name: payload.staff_role_name || null,
    staff_info: payload.staff_info || null,
    message: payload.message,
    timestamp: payload.timestamp,
    attachments: payload.attachments || [],
    has_attachments: payload.has_attachments || false,
    read_by_staff: payload.read_by_staff ?? false,
    read_by_guest: payload.read_by_guest ?? false,
    is_edited: payload.is_edited ?? false,
    is_deleted: payload.is_deleted ?? false,
    status: payload.status || 'delivered',
    reply_to: payload.reply_to || null,
    client_message_id: payload.client_message_id || null,
  };
}

/** Sort helper used in multiple places */
const sortMessages = (msgs) =>
  [...msgs].sort((a, b) => {
    const tA = new Date(a.timestamp || a.created_at).getTime();
    const tB = new Date(b.timestamp || b.created_at).getTime();
    return tA !== tB ? tA - tB : (a.id || 0) - (b.id || 0);
  });

/**
 * Main Guest Chat Hook
 * @param {Object} params
 * @param {string} params.hotelSlug - Hotel slug
 * @param {string} params.token     - Raw guest token (bootstrap-only)
 */
export const useGuestChat = ({ hotelSlug, token }) => {
  const guestChatDispatch = useGuestChatDispatch();

  // ── Local state ──────────────────────────────────────────────────────
  const [messages, setMessages] = useState([]);
  const [sendingMessages, setSendingMessages] = useState([]);
  const [connectionState, setConnectionState] = useState('disconnected');

  // Deduplication sets
  const processedEventIds = useRef(new Set());
  const processedMessageIds = useRef(new Set());

  // Realtime diagnostics exposed to debug panel
  const realtimeDiag = useRef({
    lastReceivedEventName: null,
    lastReceivedMessageId: null,
    lastReadUpdateId: null,
    duplicateEventsIgnored: 0,
    lastSubscriptionError: null,
    lastAuthError: null,
    boundEvents: [],
    subscribedChannel: null,
  });

  // Stable ref for realtime handler so effect deps don't cause resubscribe
  const handleMessageCreatedRef = useRef(null);
  const handleMessageReadRef = useRef(null);
  const handleMessageDeletedRef = useRef(null);
  const handleMessageEditedRef = useRef(null);
  const handleUnreadUpdatedRef = useRef(null);

  // Keep a ref to the Pusher client + channel for cleanup
  const pusherRef = useRef(null);
  const channelRef = useRef(null);

  // ── STEP 1: Bootstrap ────────────────────────────────────────────────
  // GET /api/guest/hotel/{slug}/chat/context?token=RAW_TOKEN
  const {
    data: contract,
    isLoading: bootstrapLoading,
    error: bootstrapError,
  } = useQuery({
    queryKey: ['guestChatBootstrap', hotelSlug, token],
    queryFn: () => guestChatAPI.getChatBootstrap(hotelSlug, token),
    enabled: !!(hotelSlug && token),
    staleTime: 5 * 60 * 1000,
    retry: 3,
  });

  // Derive fields from validated contract (getChatBootstrap already validated)
  const chatSession   = contract?.chat_session   ?? null;
  const conversationId = contract?.conversation_id ?? null;
  const channelName   = contract?.channel_name    ?? null;
  const events        = contract?.events          ?? null;
  const pusherConfig  = contract?.pusher          ?? null;
  const permissions   = contract?.permissions     ?? null;

  // Push contract into guestChatStore
  useEffect(() => {
    if (contract) {
      guestChatActions.setContext(contract, guestChatDispatch);
      if (conversationId) {
        guestChatActions.setActiveConversation(conversationId, guestChatDispatch);
      }
    }
  }, [contract, conversationId, guestChatDispatch]);

  // ── STEP 2: Fetch Messages ───────────────────────────────────────────
  const {
    data: initialMessages,
    isLoading: messagesLoading,
    error: messagesError,
  } = useQuery({
    queryKey: ['guestChatMessages', hotelSlug, chatSession],
    queryFn: () => guestChatAPI.getMessages(hotelSlug, chatSession, { limit: 50 }),
    enabled: !!(chatSession && hotelSlug),
    staleTime: 30 * 1000,
  });

  // Hydrate local state from initial fetch — merge, don't replace,
  // so realtime messages received between fetches are preserved.
  useEffect(() => {
    if (!initialMessages || !Array.isArray(initialMessages)) return;
    setMessages((prev) => {
      const map = new Map();
      // Keep existing messages (including realtime arrivals), skip optimistic
      prev.forEach((m) => { if (m.id && !m.__optimistic) map.set(m.id, m); });
      // Layer fetched messages on top
      (Array.isArray(initialMessages) ? initialMessages : []).forEach((m) => {
        if (m.id) { map.set(m.id, { ...m, status: 'delivered' }); processedMessageIds.current.add(m.id); }
      });
      const merged = Array.from(map.values());
      // Preserve unresolved optimistic messages
      const optimistic = prev.filter(
        (m) => m.__optimistic && !merged.find((x) => x.client_message_id === m.client_message_id)
      );
      const result = sortMessages([...merged, ...optimistic]);
      if (conversationId) {
        guestChatActions.initMessagesForConversation(conversationId, result, guestChatDispatch);
      }
      return result;
    });
  }, [initialMessages, conversationId, guestChatDispatch]);

  // ── Realtime handler: message_created ────────────────────────────────
  const handleMessageCreated = useCallback(
    (evt) => {
      realtimeDiag.current.lastReceivedEventName = events?.message_created;

      if (DEBUG_REALTIME) console.log('[useGuestChat] message_created event:', evt);

      // Accept canonical envelope OR raw payload
      const payload = evt?.payload ?? evt;
      const eventId = evt?.meta?.event_id;

      // Chat debug: log incoming event
      const _cdId = chatDbg.logChatEventReceived(channelName, events?.message_created, evt);
      if (!eventId) chatDbg.checkMissingEventId(channelName, events?.message_created);

      if (eventId) {
        if (processedEventIds.current.has(eventId)) {
          realtimeDiag.current.duplicateEventsIgnored++;
          chatDbg.logChatEventDeduped(channelName, events?.message_created, evt, 'processedEventIds (useGuestChat)');
          return;
        }
        processedEventIds.current.add(eventId);
      }

      const msg = normalizeRealtimeMessage(payload, conversationId);

      realtimeDiag.current.lastReceivedMessageId = msg.id;

      if (msg.id && processedMessageIds.current.has(msg.id)) {
        realtimeDiag.current.duplicateEventsIgnored++;
        chatDbg.logChatEventDeduped(channelName, events?.message_created, evt, 'processedMessageIds (useGuestChat)');
        return;
      }
      if (msg.id) processedMessageIds.current.add(msg.id);

      // Clear matching sending message
      if (msg.sender_type === 'guest' && msg.client_message_id) {
        setSendingMessages((prev) =>
          prev.filter((s) => s.client_message_id !== msg.client_message_id)
        );
      }

      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        chatDbg.logUiAdd(msg.id, 'guest-realtime');
        return sortMessages([...prev, msg]);
      });

      // Chat debug: mark routed/dispatched
      chatDbg.logChatEventRouted(_cdId, { normalizedCategory: 'guest_chat', normalizedType: 'message_created' });
      chatDbg.logChatEventDispatched(_cdId, 'guestChatStore');

      // Route to guestChatStore
      const storeEvent = evt?.category
        ? evt
        : { category: 'guest_chat', type: 'message_created', payload: msg, meta: evt?.meta };
      guestChatActions.handleEvent(storeEvent, guestChatDispatch);
    },
    [conversationId, events?.message_created, guestChatDispatch]
  );

  // ── Realtime handler: message_read ───────────────────────────────────
  const handleMessageRead = useCallback(
    (evt) => {
      realtimeDiag.current.lastReceivedEventName = events?.message_read;

      if (DEBUG_REALTIME) console.log('[useGuestChat] message_read event:', evt);

      const payload = evt?.payload ?? evt;
      const eventId = evt?.meta?.event_id;

      // Chat debug
      chatDbg.logChatEventReceived(channelName, events?.message_read, evt);

      if (eventId) {
        if (processedEventIds.current.has(eventId)) {
          realtimeDiag.current.duplicateEventsIgnored++;
          chatDbg.logChatEventDeduped(channelName, events?.message_read, evt, 'processedEventIds');
          return;
        }
        processedEventIds.current.add(eventId);
      }

      realtimeDiag.current.lastReadUpdateId =
        payload.message_id || payload.id || eventId || new Date().toISOString();

      // Route to guestChatStore — it already handles MESSAGE_READ_UPDATE
      const storeEvent = evt?.category
        ? evt
        : {
            category: 'guest_chat',
            type: 'message_read',
            payload: { ...payload, conversation_id: payload.conversation_id || conversationId },
            meta: evt?.meta,
          };
      guestChatActions.handleEvent(storeEvent, guestChatDispatch);
    },
    [conversationId, events?.message_read, guestChatDispatch]
  );

  // ── Realtime handler: message_deleted ─────────────────────────────────
  const handleMessageDeleted = useCallback(
    (evt) => {
      if (DEBUG_REALTIME) console.log('[useGuestChat] message_deleted event:', evt);

      const payload = evt?.payload ?? evt;
      const messageId = payload.message_id || payload.id;

      if (!messageId) return;

      // Remove from local display state
      setMessages((prev) => prev.filter((m) => m.id !== messageId));

      // Route to store
      const storeEvent = { category: 'guest_chat', type: 'message_deleted', payload: { ...payload, conversation_id: payload.conversation_id || conversationId }, meta: evt?.meta };
      guestChatActions.handleEvent(storeEvent, guestChatDispatch);
    },
    [conversationId, guestChatDispatch]
  );

  // ── Realtime handler: message_edited ──────────────────────────────────
  const handleMessageEdited = useCallback(
    (evt) => {
      if (DEBUG_REALTIME) console.log('[useGuestChat] message_edited event:', evt);

      const payload = evt?.payload ?? evt;
      const messageId = payload.message_id || payload.id;

      if (!messageId) return;

      // Update in local display state
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, message: payload.message || payload.message_text || m.message, is_edited: true }
            : m
        )
      );

      // Route to store
      const storeEvent = { category: 'guest_chat', type: 'message_edited', payload: { ...payload, conversation_id: payload.conversation_id || conversationId }, meta: evt?.meta };
      guestChatActions.handleEvent(storeEvent, guestChatDispatch);
    },
    [conversationId, guestChatDispatch]
  );

  // ── Realtime handler: unread_updated ──────────────────────────────────
  const handleUnreadUpdated = useCallback(
    (evt) => {
      if (DEBUG_REALTIME) console.log('[useGuestChat] unread_updated event:', evt);

      const payload = evt?.payload ?? evt;

      const storeEvent = { category: 'guest_chat', type: 'unread_updated', payload: { ...payload, conversation_id: payload.conversation_id || conversationId }, meta: evt?.meta };
      guestChatActions.handleEvent(storeEvent, guestChatDispatch);
    },
    [conversationId, guestChatDispatch]
  );

  // Keep refs current (avoids stale closures in Pusher bindings)
  handleMessageCreatedRef.current = handleMessageCreated;
  handleMessageReadRef.current = handleMessageRead;
  handleMessageDeletedRef.current = handleMessageDeleted;
  handleMessageEditedRef.current = handleMessageEdited;
  handleUnreadUpdatedRef.current = handleUnreadUpdated;

  // ── STEP 3: Pusher Setup ─────────────────────────────────────────────
  useEffect(() => {
    if (!chatSession || !channelName || !events || !pusherConfig) return;

    let client;
    let channel;

    const setup = () => {
      try {
        client = createGuestPusherClient({
          key: pusherConfig.key,
          cluster: pusherConfig.cluster,
          authEndpoint: pusherConfig.auth_endpoint,
          chatSession,
        });

        pusherRef.current = client;
        setConnectionState('connecting');

        channel = client.subscribe(channelName);
        channelRef.current = channel;

        realtimeDiag.current.subscribedChannel = channelName;
        chatDbg.logChatSubscription(channelName, 'guestRealtimeClient');

        // Connection state bindings
        client.connection.bind('connected', () => { setConnectionState('connected'); chatDbg.updateSnapshot({ connectionState: 'connected' }); });
        client.connection.bind('disconnected', () => { setConnectionState('disconnected'); chatDbg.updateSnapshot({ connectionState: 'disconnected' }); });
        client.connection.bind('error', (err) => {
          console.error('[useGuestChat] Pusher error:', err);
          realtimeDiag.current.lastAuthError = err?.error?.message || String(err);
          setConnectionState('failed');
          chatDbg.updateSnapshot({ connectionState: 'failed' });
          chatDbg.logChatError('Pusher connection error', { error: String(err) });
        });

        // Debug: global event log
        if (DEBUG_REALTIME) {
          channel.bind_global((eventName, data) => {
            console.log('[useGuestChat] global event:', { eventName, data, channel: channelName });
          });
        }

        // Subscription lifecycle
        channel.bind('pusher:subscription_succeeded', () => {
          setConnectionState('connected');
          chatDbg.logChatSubscriptionSucceeded(channelName);
          syncMessages();
        });

        channel.bind('pusher:subscription_error', (err) => {
          console.error('[useGuestChat] Subscription error:', err);
          realtimeDiag.current.lastSubscriptionError = String(err);
          chatDbg.logChatSubscriptionError(channelName, err);
          setConnectionState('failed');
        });

        // ── Bind ALL contract events ───────────────────────────────────
        const wrappedCreated = (evt) => handleMessageCreatedRef.current(evt);
        const wrappedRead    = (evt) => handleMessageReadRef.current(evt);
        const wrappedDeleted = (evt) => handleMessageDeletedRef.current(evt);
        const wrappedEdited  = (evt) => handleMessageEditedRef.current(evt);
        const wrappedUnread  = (evt) => handleUnreadUpdatedRef.current(evt);

        channel.bind(events.message_created, wrappedCreated);
        channel.bind(events.message_read, wrappedRead);

        const boundEvents = [events.message_created, events.message_read];

        if (events.message_deleted) {
          channel.bind(events.message_deleted, wrappedDeleted);
          boundEvents.push(events.message_deleted);
        }
        if (events.message_edited) {
          channel.bind(events.message_edited, wrappedEdited);
          boundEvents.push(events.message_edited);
        }
        if (events.unread_updated) {
          channel.bind(events.unread_updated, wrappedUnread);
          boundEvents.push(events.unread_updated);
        }

        realtimeDiag.current.boundEvents = boundEvents;

        // Chat debug: update snapshot
        chatDbg.updateSnapshot({
          conversationId,
          bookingId: contract?.booking_id || null,
          channelName,
          boundMessageCreated: events.message_created,
          boundMessageRead: events.message_read,
          connectionState: 'connecting',
          uiMode: 'guest',
          dataSource: 'hook',
        });
      } catch (err) {
        console.error('[useGuestChat] Pusher setup error:', err);
        setConnectionState('failed');
      }
    };

    setup();

    return () => {
      if (channel) {
        channel.unbind_all();
        if (client) client.unsubscribe(channelName);
      }
      channelRef.current = null;
      realtimeDiag.current.subscribedChannel = null;
      realtimeDiag.current.boundEvents = [];
      chatDbg.logChatUnsubscription(channelName);
    };
    // Stable deps: primitives + config objects that only change on new bootstrap
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatSession, channelName, events?.message_created, events?.message_read, pusherConfig?.key]);

  // ── Mark read when NEW staff/system messages arrive ───────────────
  // Only POST mark_read when the latest message was NOT sent by the guest
  // (the guest already "read" their own messages). Track the last length
  // to avoid re-posting on every render.
  const lastMarkedLengthRef = useRef(0);

  useEffect(() => {
    if (!messages.length || messages.length <= lastMarkedLengthRef.current) return;

    // Check if any of the NEW messages (since last mark) are from staff/system
    const newMessages = messages.slice(lastMarkedLengthRef.current);
    const hasUnreadFromOthers = newMessages.some(
      (m) => m.sender_type !== 'guest' && m.sender_role !== 'guest'
    );

    lastMarkedLengthRef.current = messages.length;

    if (hasUnreadFromOthers) {
      markRead();
    }
  }, [messages.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync on reconnection ─────────────────────────────────────────────
  const syncMessages = useCallback(async () => {
    if (!hotelSlug || !chatSession) return;
    chatDbg.logSyncStart('guest');
    try {
      const latest = await guestChatAPI.getMessages(hotelSlug, chatSession, { limit: 50 });
      setMessages((prev) => {
        const map = new Map();
        prev.forEach((m) => { if (m.id && !m.__optimistic) map.set(m.id, m); });
        (Array.isArray(latest) ? latest : []).forEach((m) => {
          if (m.id) { map.set(m.id, { ...m, status: 'delivered' }); processedMessageIds.current.add(m.id); }
        });
        const merged = Array.from(map.values());
        const optimistic = prev.filter(
          (m) => m.__optimistic && !merged.find((x) => x.client_message_id === m.client_message_id)
        );
        const result = sortMessages([...merged, ...optimistic]);
        chatDbg.logSyncSuccess('guest', result.length);
        chatDbg.updateSnapshot({ confirmedCount: merged.length, optimisticCount: optimistic.length });
        if (conversationId) {
          guestChatActions.initMessagesForConversation(conversationId, result, guestChatDispatch);
        }
        return result;
      });
    } catch (err) {
      console.error('[useGuestChat] Sync error:', err);
      chatDbg.logSyncError('guest', err);
    }
  }, [hotelSlug, chatSession, conversationId, guestChatDispatch]);

  // ── Send message mutation ────────────────────────────────────────────
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, replyTo, clientMessageId }) => {
      const response = await guestChatAPI.sendMessage(hotelSlug, chatSession, {
        message,
        client_message_id: clientMessageId,
        reply_to: replyTo,
      });
      return { response, clientMessageId };
    },
    onMutate: async ({ message, replyTo, clientMessageId }) => {
      // Optimistic: add to sendingMessages BEFORE the API call
      setSendingMessages((prev) => [
        ...prev,
        {
          id: `sending-${clientMessageId}`,
          client_message_id: clientMessageId,
          message,
          sender_type: 'guest',
          status: 'sending',
          timestamp: new Date().toISOString(),
          created_at: new Date().toISOString(),
          reply_to: replyTo,
        },
      ]);
      chatDbg.logOptimisticAdd(clientMessageId, message);
      chatDbg.logApiSend(clientMessageId);
      // Return context so onError can access clientMessageId
      return { clientMessageId };
    },
    onSuccess: (data) => {
      const { response, clientMessageId } = data;
      // Extract the confirmed message from the API response
      const confirmedMsg = response?.message || response?.data?.message || response;

      if (confirmedMsg?.id) {
        // Add confirmed message to messages[] so there's no gap
        // between removing the optimistic entry and the Pusher echo arriving
        setMessages((prev) => {
          if (prev.some((m) => m.id === confirmedMsg.id)) return prev;
          return sortMessages([...prev, { ...confirmedMsg, status: 'delivered' }]);
        });
        if (confirmedMsg.id) processedMessageIds.current.add(confirmedMsg.id);
        chatDbg.logApiSendSuccess(clientMessageId, confirmedMsg.id);
        chatDbg.logOptimisticReconcile(clientMessageId, confirmedMsg.id);
      }

      // Now safe to remove from sendingMessages
      setSendingMessages((prev) => prev.filter((m) => m.client_message_id !== clientMessageId));
    },
    onError: (error, _vars, ctx) => {
      console.error('[useGuestChat] Send error:', error);
      chatDbg.logApiSendError(ctx?.clientMessageId, error);
      setSendingMessages((prev) =>
        prev.map((m) =>
          m.client_message_id === ctx?.clientMessageId ? { ...m, status: 'failed' } : m
        )
      );
    },
  });

  // ── Load older (pagination) ──────────────────────────────────────────
  const loadOlderMessages = useCallback(
    async (beforeMessageId) => {
      if (!hotelSlug || !chatSession) return 0;
      const older = await guestChatAPI.getMessages(hotelSlug, chatSession, {
        limit: 50,
        before: beforeMessageId,
      });
      const arr = Array.isArray(older) ? older : [];
      if (arr.length > 0) {
        setMessages((prev) => {
          const map = new Map();
          [...arr, ...prev].forEach((m) => { if (m.id) map.set(m.id, m); });
          const sorted = sortMessages(Array.from(map.values()));
          if (conversationId) {
            guestChatActions.initMessagesForConversation(conversationId, sorted, guestChatDispatch);
          }
          return sorted;
        });
      }
      return arr.length;
    },
    [hotelSlug, chatSession, conversationId, guestChatDispatch]
  );

  // ── Retry failed message ─────────────────────────────────────────────
  const retryMessage = useCallback(
    (failedMessage) => {
      if (failedMessage.status !== 'failed') return;
      setSendingMessages((prev) => prev.filter((m) => m.id !== failedMessage.id));
      sendMessageMutation.mutate({
        message: failedMessage.message,
        replyTo: failedMessage.reply_to,
        clientMessageId: generateClientMessageId(),
      });
    },
    [sendMessageMutation]
  );

  // ── Mark read ────────────────────────────────────────────────────────
  const markRead = useCallback(async () => {
    if (!hotelSlug || !chatSession || !conversationId) return;
    try {
      await guestChatAPI.markRead(hotelSlug, chatSession, conversationId);
      guestChatActions.markConversationReadForGuest(conversationId, guestChatDispatch);
    } catch (err) {
      console.error('[useGuestChat] Mark read error:', err);
    }
  }, [hotelSlug, chatSession, conversationId, guestChatDispatch]);

  // ── Public API ───────────────────────────────────────────────────────
  return {
    // Contract fields (flat, from bootstrap)
    contract,
    chatSession,
    conversationId,
    channelName,
    events,
    pusherConfig,
    permissions,

    // Message state
    messages,
    sendingMessages,

    // Loading / error
    loading: bootstrapLoading || messagesLoading,
    error: bootstrapError || messagesError,
    connectionState,

    // Actions
    sendMessage: (message, replyTo) => sendMessageMutation.mutate({
      message,
      replyTo,
      clientMessageId: generateClientMessageId(),
    }),
    loadOlder: loadOlderMessages,
    retryMessage,
    syncMessages,
    markRead,

    // Sending state
    isSending: sendMessageMutation.isPending,
    sendError: sendMessageMutation.error,

    // Permissions / disabled
    isDisabled: permissions ? !permissions.can_send : false,
    disabledReason: permissions?.can_send === false ? 'Sending is not allowed for this session' : null,

    // Diagnostics for debug panel
    realtimeDiag: realtimeDiag.current,
  };
};
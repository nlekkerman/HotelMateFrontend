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
 * - Binds BOTH events.message_created AND events.message_read
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import { createGuestPusherClient, disconnectGuestPusher } from '../realtime/guestRealtimeClient';
import * as guestChatAPI from '../services/guestChatAPI';
import { useGuestChatDispatch, guestChatActions } from '../realtime/stores/guestChatStore';

const DEBUG_REALTIME = true;

const generateClientMessageId = () => uuidv4();

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
    }
  }, [contract, guestChatDispatch]);

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

      if (eventId) {
        if (processedEventIds.current.has(eventId)) {
          realtimeDiag.current.duplicateEventsIgnored++;
          return;
        }
        processedEventIds.current.add(eventId);
      }

      const msg = { ...payload };
      if (!msg.conversation_id && conversationId) msg.conversation_id = conversationId;

      realtimeDiag.current.lastReceivedMessageId = msg.id;

      if (msg.id && processedMessageIds.current.has(msg.id)) {
        realtimeDiag.current.duplicateEventsIgnored++;
        return;
      }
      if (msg.id) processedMessageIds.current.add(msg.id);

      // Clear matching sending message
      if (
        (msg.sender_type === 'guest' || msg.sender_role === 'guest') &&
        msg.client_message_id
      ) {
        setSendingMessages((prev) =>
          prev.filter((s) => s.client_message_id !== msg.client_message_id)
        );
      }

      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return sortMessages([...prev, { ...msg, status: 'delivered' }]);
      });

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

      if (eventId) {
        if (processedEventIds.current.has(eventId)) {
          realtimeDiag.current.duplicateEventsIgnored++;
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

  // Keep refs current (avoids stale closures in Pusher bindings)
  handleMessageCreatedRef.current = handleMessageCreated;
  handleMessageReadRef.current = handleMessageRead;

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

        // Connection state bindings
        client.connection.bind('connected', () => setConnectionState('connected'));
        client.connection.bind('disconnected', () => setConnectionState('disconnected'));
        client.connection.bind('error', (err) => {
          console.error('[useGuestChat] Pusher error:', err);
          realtimeDiag.current.lastAuthError = err?.error?.message || String(err);
          setConnectionState('failed');
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
          syncMessages();
        });

        channel.bind('pusher:subscription_error', (err) => {
          console.error('[useGuestChat] Subscription error:', err);
          realtimeDiag.current.lastSubscriptionError = String(err);
          setConnectionState('failed');
        });

        // ── Bind BOTH contract events ──────────────────────────────────
        const wrappedCreated = (evt) => handleMessageCreatedRef.current(evt);
        const wrappedRead    = (evt) => handleMessageReadRef.current(evt);

        channel.bind(events.message_created, wrappedCreated);
        channel.bind(events.message_read, wrappedRead);

        realtimeDiag.current.boundEvents = [events.message_created, events.message_read];
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
    };
    // Stable deps: primitives + config objects that only change on new bootstrap
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatSession, channelName, events?.message_created, events?.message_read, pusherConfig?.key]);

  // ── Sync on reconnection ─────────────────────────────────────────────
  const syncMessages = useCallback(async () => {
    if (!hotelSlug || !chatSession) return;
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
        if (conversationId) {
          guestChatActions.initMessagesForConversation(conversationId, result, guestChatDispatch);
        }
        return result;
      });
    } catch (err) {
      console.error('[useGuestChat] Sync error:', err);
    }
  }, [hotelSlug, chatSession, conversationId, guestChatDispatch]);

  // ── Send message mutation ────────────────────────────────────────────
  const sendMessageMutation = useMutation({
    mutationFn: async ({ message, replyTo }) => {
      const clientMessageId = generateClientMessageId();
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
      const response = await guestChatAPI.sendMessage(hotelSlug, chatSession, {
        message,
        client_message_id: clientMessageId,
        reply_to: replyTo,
      });
      return { response, clientMessageId };
    },
    onSuccess: (data) => {
      setSendingMessages((prev) => prev.filter((m) => m.client_message_id !== data.clientMessageId));
    },
    onError: (error, _vars, ctx) => {
      console.error('[useGuestChat] Send error:', error);
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
      sendMessageMutation.mutate({ message: failedMessage.message, replyTo: failedMessage.reply_to });
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
    sendMessage: (message, replyTo) => sendMessageMutation.mutate({ message, replyTo }),
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
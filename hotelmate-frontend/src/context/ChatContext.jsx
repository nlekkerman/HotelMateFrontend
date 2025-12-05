// src/context/ChatContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import api from "@/services/api";
import { useAuth } from "@/context/AuthContext";
import { useGuestChatState, useGuestChatDispatch, guestChatActions } from "@/realtime/stores/guestChatStore";

const ChatContext = createContext(undefined);

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  
  // Use guestChatStore for guest chat data
  const guestChatState = useGuestChatState();
  const guestChatDispatch = useGuestChatDispatch();
  
  // Local state for staff-specific functionality
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);

  // Fetch conversations + unread counts (unchanged HTTP calls)
  const fetchConversations = useCallback(async () => {
    if (!user?.hotel_slug) return;

    try {
      const res = await api.get(`/chat/${user.hotel_slug}/conversations/`);
      const countsRes = await api.get(
        `/chat/hotels/${user.hotel_slug}/conversations/unread-count/`
      );

      const countsMap = {};
      (countsRes.data.rooms || []).forEach((room) => {
        countsMap[room.conversation_id] = room.unread_count;
      });

      const convs = res.data.map((c) => ({
        ...c,
        unread_count: countsMap[c.conversation_id] || 0,
        last_message: c.last_message || "",
      }));

      setConversations(convs);
      
      // Also initialize guestChatStore with fetched conversations
      guestChatActions.initFromAPI(convs, guestChatDispatch);
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
    }
  }, [user?.hotel_slug, guestChatDispatch]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Sync conversations from guestChatStore realtime updates
  useEffect(() => {
    if (!guestChatState || !user?.hotel_slug) return;

    // Sync conversations with store data and show notifications for new messages
    const storeConversations = Object.values(guestChatState.conversationsById || {});
    
    if (storeConversations.length > 0) {
      // Simple notification logic without dependency on conversations state
      storeConversations.forEach(storeConv => {
        if (
          storeConv.last_message &&
          storeConv.conversation_id !== currentConversationId &&
          canShowNotifications()
        ) {
          showNotification(`New Message from Room ${storeConv.room_number}`, {
            body: storeConv.last_message,
            icon: "/favicons/favicon.svg",
            tag: `chat-${storeConv.conversation_id}`,
          }).then(notification => {
            if (notification && notification.onclick !== undefined) {
              notification.onclick = () => {
                window.focus();
                window.location.href = `/${user.hotel_slug}/chat`;
              };
            }
          }).catch(console.error);
        }
      });
      
      // Update local conversations with store data
      setConversations(storeConversations);
    }
  }, [guestChatState, currentConversationId, user?.hotel_slug]);

  // Handle realtime message updates from guestChatStore
  useEffect(() => {
    if (!guestChatState) return;

    // Update conversations when store has new messages
    const storeConversations = Object.values(guestChatState.conversationsById || {});
    
    storeConversations.forEach((storeConv) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.conversation_id === storeConv.conversation_id
            ? {
                ...c,
                last_message: storeConv.last_message || c.last_message,
                unread_count: storeConv.unread_count !== undefined ? storeConv.unread_count : c.unread_count,
              }
            : c
        )
      );
    });
  }, [guestChatState]);

  const markConversationRead = async (conversationId) => {
    if (!conversationId) {
      console.warn("markConversationRead called with undefined/null conversationId");
      return;
    }
    
    try {
      await api.post(`/chat/conversations/${conversationId}/mark-read/`);
      setConversations((prev) =>
        prev.map((c) =>
          c.conversation_id === conversationId
            ? { ...c, unread_count: 0 }
            : c
        )
      );
    } catch (err) {
      console.error("Failed to mark conversation as read:", err);
      // Don't show toast for this - it's not critical if it fails
    }
  };

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  // Helper functions for guest chat integration
  const fetchGuestMessages = useCallback(async (conversationId) => {
    try {
      const res = await api.get(`/chat/conversations/${conversationId}/messages/`);
      guestChatActions.initMessagesForConversation(conversationId, res.data, guestChatDispatch);
      return res.data;
    } catch (err) {
      console.error("Failed to fetch guest messages:", err);
      return [];
    }
  }, [guestChatDispatch]);

  const setActiveGuestConversation = useCallback((conversationId) => {
    guestChatActions.setActiveConversation(conversationId, guestChatDispatch);
    setCurrentConversationId(conversationId);
  }, [guestChatDispatch]);

  const markGuestConversationReadForStaff = useCallback(async (conversationId) => {
    try {
      await api.post(`/chat/conversations/${conversationId}/mark-read/`);
      guestChatActions.markConversationReadForStaff(conversationId, guestChatDispatch);
    } catch (err) {
      console.error("Failed to mark guest conversation as read:", err);
    }
  }, [guestChatDispatch]);

  const markGuestConversationReadForGuest = useCallback(async (conversationId) => {
    try {
      await api.post(`/chat/conversations/${conversationId}/mark-read-guest/`);
      guestChatActions.markConversationReadForGuest(conversationId, guestChatDispatch);
    } catch (err) {
      console.error("Failed to mark guest conversation as read for guest:", err);
    }
  }, [guestChatDispatch]);

  // Unified API that exposes both staff and guest chat data
  const contextValue = {
    // Legacy staff chat API (preserved for backward compatibility)
    conversations,
    fetchConversations,
    markConversationRead,
    totalUnread,
    pusherInstance: null, // Legacy support - now using centralized realtime
    currentConversationId,
    setCurrentConversationId,

    // Guest chat API backed by guestChatStore
    guestConversations: Object.values(guestChatState.conversationsById),
    guestMessages: guestChatState.activeConversationId 
      ? guestChatState.messagesByConversationId[guestChatState.activeConversationId] || []
      : [],
    activeGuestConversation: guestChatState.activeConversationId 
      ? guestChatState.conversationsById[guestChatState.activeConversationId]
      : null,
    activeGuestConversationId: guestChatState.activeConversationId,
    
    // Guest chat actions
    fetchGuestMessages,
    setActiveGuestConversation,
    markGuestConversationReadForStaff,
    markGuestConversationReadForGuest,
    
    // Store access for advanced usage
    guestChatState,
    guestChatDispatch
  };

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

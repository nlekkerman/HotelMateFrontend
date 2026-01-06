// src/context/ChatContext.jsx
import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import api from "@/services/api";
import { fetchRoomConversations, fetchRoomConversationsUnreadCount, markRoomConversationRead, fetchRoomConversationMessages } from "@/services/roomConversationsAPI";
import { useAuth } from "@/context/AuthContext";
import { useGuestChatState, useGuestChatDispatch, guestChatActions } from "@/realtime/stores/guestChatStore";
import { useChatState } from "@/realtime/stores/chatStore.jsx";

const ChatContext = createContext(undefined);

export const ChatProvider = ({ children }) => {
  const { user } = useAuth();
  const { hotelSlug } = useParams();
  const [searchParams] = useSearchParams();
  
  // Use guestChatStore for guest chat data
  const guestChatState = useGuestChatState();
  const guestChatDispatch = useGuestChatDispatch();
  
  // Use chatStore (same store as StaffChatContext) for fallback
  const chatStore = useChatState();
  
  // Local state for staff-specific functionality
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);

  // Fetch conversations + unread counts using room conversations API
  const fetchConversations = useCallback(async () => {
    // Get hotel slug from either authenticated user, URL params, or query params
    const hotelSlugFromQuery = searchParams.get('hotel_slug');
    const currentHotelSlug = user?.hotel_slug || hotelSlug || hotelSlugFromQuery;
    
    console.log('[ChatContext] Hotel slug sources:', {
      userHotelSlug: user?.hotel_slug,
      urlHotelSlug: hotelSlug,
      queryHotelSlug: hotelSlugFromQuery,
      finalHotelSlug: currentHotelSlug
    });
    
    if (!currentHotelSlug) {
      console.warn('[ChatContext] No hotel slug available, skipping fetch');
      return;
    }

    try {
      console.log('[ChatContext] Fetching room conversations for hotel:', currentHotelSlug);
      
      // Use the new room conversations API
      const [conversations, unreadData] = await Promise.all([
        fetchRoomConversations(currentHotelSlug),
        fetchRoomConversationsUnreadCount(currentHotelSlug).catch(err => {
          console.warn('[ChatContext] Failed to fetch unread count, using defaults:', err);
          return { total_unread: 0, conversations: [] };
        })
      ]);

      console.log('[ChatContext] Room conversations fetched:', {
        count: conversations?.length || 0,
        unreadTotal: unreadData?.total_unread || 0
      });

      // Map conversations to expected format
      const convs = (conversations || []).map((c) => ({
        ...c,
        // Primary fields (API response format)
        conversation_id: c.id || c.conversation_id,
        room_number: c.room?.number || c.room_number || (c.room && c.room.room_number),
        guest_name: c.room?.guest_name || c.guest_name || (c.room && c.room.guest_name),
        unread_count: c.unread_count || c.unread_count_for_staff || 0,
        last_message: c.last_message || "",
        last_message_time: c.updated_at || c.last_message_time,
        
        // Legacy/alternative field names for compatibility
        id: c.id || c.conversation_id,
        roomNumber: c.room?.number || c.room_number || (c.room && c.room.room_number),
        guestName: c.room?.guest_name || c.guest_name || (c.room && c.room.guest_name),
        lastMessage: c.last_message || "",
        updatedAt: c.updated_at || c.last_message_time,
        unreadCountForGuest: c.unread_count || c.unread_count_for_staff || 0,
        
        // Additional room information if available
        room: c.room || {
          number: c.room_number,
          guest_name: c.guest_name
        }
      }));

      setConversations(convs);
      
      // Also initialize guestChatStore with fetched conversations
      guestChatActions.initFromAPI(convs, guestChatDispatch);
      
      console.log('[ChatContext] Room conversations processed and stored:', convs.length);
    } catch (err) {
      console.error("[ChatContext] Failed to fetch room conversations:", err);
      
      // 🔄 FALLBACK: Try to use chatStore conversations when API fails
      console.log("🔄 [ChatContext] Trying chatStore fallback...");
      if (chatStore?.conversationsById && Object.keys(chatStore.conversationsById).length > 0) {
        const storeConversations = Object.values(chatStore.conversationsById);
        console.log("✅ [ChatContext] Using chatStore conversations as fallback:", storeConversations.length);
        
        // Convert chatStore format to ChatContext format
        const fallbackConvs = storeConversations.map((c) => ({
          ...c,
          conversation_id: c.id || c.conversation_id,
          unread_count: c.unread_count || 0,
          last_message: c.last_message || "",
          room_number: c.room_number || "Unknown"
        }));
        
        setConversations(fallbackConvs);
        
        // Also initialize guestChatStore with fallback conversations
        guestChatActions.initFromAPI(fallbackConvs, guestChatDispatch);
      } else {
        console.log("❌ [ChatContext] No chatStore conversations available for fallback");
      }
    }
  }, [user?.hotel_slug, hotelSlug, searchParams, guestChatDispatch, chatStore?.conversationsById]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Sync conversations from guestChatStore realtime updates
  useEffect(() => {
    // Get hotel slug from either authenticated user, URL params, or query params
    const currentHotelSlug = user?.hotel_slug || hotelSlug || searchParams.get('hotel_slug');
    if (!guestChatState || !currentHotelSlug) return;

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
                window.location.href = `/${currentHotelSlug}/chat`;
              };
            }
          }).catch(console.error);
        }
      });
      
      // Update local conversations with store data
      setConversations(storeConversations);
    }
  }, [guestChatState, currentConversationId, user?.hotel_slug, hotelSlug, searchParams]);

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
      console.log('[ChatContext] Marking room conversation as read:', conversationId);
      
      // Use the new room conversations API
      const currentHotelSlug = user?.hotel_slug || hotelSlug || searchParams.get('hotel_slug');
      await markRoomConversationRead(currentHotelSlug, conversationId);
      
      setConversations((prev) =>
        prev.map((c) =>
          (c.conversation_id || c.id) === conversationId
            ? { ...c, unread_count: 0 }
            : c
        )
      );
      
      console.log('[ChatContext] Room conversation marked as read successfully:', conversationId);
    } catch (err) {
      console.error("[ChatContext] Failed to mark room conversation as read:", err);
      // Don't show toast for this - it's not critical if it fails
    }
  };

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  // Helper functions for guest chat integration
  const fetchGuestMessages = useCallback(async (conversationId, options = {}) => {
    try {
      console.log('[ChatContext] Fetching room conversation messages:', conversationId);
      
      // Use the new room conversations API for messages
      const currentHotelSlug = user?.hotel_slug || hotelSlug || searchParams.get('hotel_slug');
      const response = await fetchRoomConversationMessages(currentHotelSlug, conversationId, options);
      
      // Handle both possible response formats
      const messages = response.messages || response || [];
      
      console.log('[ChatContext] Room messages fetched:', {
        conversationId,
        messageCount: messages.length
      });
      
      guestChatActions.initMessagesForConversation(conversationId, messages, guestChatDispatch);
      return messages;
    } catch (err) {
      console.error("[ChatContext] Failed to fetch room conversation messages:", err);
      return [];
    }
  }, [user?.hotel_slug, hotelSlug, searchParams, guestChatDispatch]);

  const setActiveGuestConversation = useCallback((conversationId) => {
    guestChatActions.setActiveConversation(conversationId, guestChatDispatch);
    setCurrentConversationId(conversationId);
  }, [guestChatDispatch]);

  const markGuestConversationReadForStaff = useCallback(async (conversationId) => {
    try {
      console.log('[ChatContext] Marking room conversation as read for staff:', conversationId);
      
      // Use the new room conversations API
      const currentHotelSlug = user?.hotel_slug || hotelSlug || searchParams.get('hotel_slug');
      await markRoomConversationRead(currentHotelSlug, conversationId);
      
      guestChatActions.markConversationReadForStaff(conversationId, guestChatDispatch);
      console.log('[ChatContext] Room conversation marked as read for staff successfully:', conversationId);
    } catch (err) {
      console.error("[ChatContext] Failed to mark room conversation as read for staff:", err);
    }
  }, [user?.hotel_slug, hotelSlug, searchParams, guestChatDispatch]);

  const markGuestConversationReadForGuest = useCallback(async (conversationId) => {
    try {
      console.log('[ChatContext] Marking room conversation as read for guest:', conversationId);
      
      // Guest read operations might use a different endpoint, but for now using the same API
      // This might need to be updated based on actual backend implementation
      const currentHotelSlug = user?.hotel_slug || hotelSlug || searchParams.get('hotel_slug');
      await markRoomConversationRead(currentHotelSlug, conversationId);
      
      guestChatActions.markConversationReadForGuest(conversationId, guestChatDispatch);
      console.log('[ChatContext] Room conversation marked as read for guest successfully:', conversationId);
    } catch (err) {
      console.error("[ChatContext] Failed to mark room conversation as read for guest:", err);
    }
  }, [user?.hotel_slug, hotelSlug, searchParams, guestChatDispatch]);

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

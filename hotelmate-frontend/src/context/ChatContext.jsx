// src/context/ChatContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import api from "@/services/api";
import { fetchRoomConversations, fetchRoomConversationsUnreadCount, markRoomConversationRead, fetchRoomConversationMessages } from "@/services/roomConversationsAPI";
import { useAuth } from "@/context/AuthContext";
import { useGuestChatState, useGuestChatDispatch, guestChatActions } from "@/realtime/stores/guestChatStore";
import { useChatState } from "@/realtime/stores/chatStore.jsx";

const ChatContext = createContext(undefined);

export const ChatProvider = ({ children }) => {
  // Reduced render logging to minimize console noise
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

  // Debug searchParams
  useEffect(() => {
    console.log('🔍 [ChatContext] SearchParams changed:', {
      hotelSlugParam: searchParams.get('hotel_slug'),
      allParams: Object.fromEntries(searchParams.entries())
    });
  }, [searchParams]);

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
      
      // For guest users, we can't access staff endpoints, so we'll use guest chat data instead
      if (!user?.hotel_slug) {
        console.log('[ChatContext] Guest mode detected - user has no hotel_slug');
        
        // Wait for guest chat context to be loaded
        if (guestChatState?.context) {
          console.log('[ChatContext] Guest mode: Using guest chat data instead of staff API');
          
          // If we have guest chat context, create a conversation from it
          const guestConversation = {
            conversation_id: guestChatState.context.conversation_id,
            id: guestChatState.context.conversation_id,
            roomNumber: guestChatState.context.room_number,
            room_number: guestChatState.context.room_number,
            guestName: guestChatState.context.guest_name || `Room ${guestChatState.context.room_number}`,
            guest_name: guestChatState.context.guest_name || `Room ${guestChatState.context.room_number}`,
            lastMessage: "Chat available",
            last_message: "Chat available", 
            updatedAt: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            unreadCountForGuest: 0,
            unread_count: 0,
            room: {
              number: guestChatState.context.room_number,
              guest_name: guestChatState.context.guest_name || `Room ${guestChatState.context.room_number}`
            }
          };
          
          console.log('[ChatContext] Created guest conversation:', guestConversation);
          setConversations([guestConversation]);
          
          // Also initialize guestChatStore with the conversation
          guestChatActions.initFromAPI([guestConversation], guestChatDispatch);
          
          // Set this conversation as active in the guest chat store
          guestChatActions.setActiveConversation(guestChatState.context.conversation_id, guestChatDispatch);
          
          console.log('[ChatContext] Guest conversation set as active:', guestChatState.context.conversation_id);
          return;
        } else {
          console.log('[ChatContext] Guest mode: Waiting for guest context to load...');
          return; // Don't try staff API, just wait for guest context
        }
      }
      
      console.log('[ChatContext] Staff mode: Fetching room conversations via staff API');
      // Use the new room conversations API for staff users
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
  }, [user?.hotel_slug, hotelSlug]); // Removed problematic dependencies that cause excessive re-renders

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Re-fetch when guest context becomes available (only for guests)
  useEffect(() => {
    console.log('[ChatContext] Guest context effect triggered:', {
      hasUser: !!user?.hotel_slug,
      hasGuestContext: !!guestChatState?.context,
      guestChatState: guestChatState
    });
    
    if (!user?.hotel_slug && guestChatState?.context) {
      console.log('[ChatContext] Guest context now available, re-fetching conversations');
      // Use a stable way to trigger fetch without causing loops
      const timer = setTimeout(() => {
        const hotelSlugFromQuery = searchParams.get('hotel_slug');
        const currentHotelSlug = user?.hotel_slug || hotelSlug || hotelSlugFromQuery;
        
        if (guestChatState?.context && !currentHotelSlug) {
          // Create guest conversation directly without fetchConversations to avoid loops
          const guestConversation = {
            conversation_id: guestChatState.context.conversation_id,
            id: guestChatState.context.conversation_id,
            roomNumber: guestChatState.context.room_number,
            room_number: guestChatState.context.room_number,
            guestName: guestChatState.context.guest_name || `Room ${guestChatState.context.room_number}`,
            guest_name: guestChatState.context.guest_name || `Room ${guestChatState.context.room_number}`,
            lastMessage: "Chat available",
            last_message: "Chat available", 
            updatedAt: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            unreadCountForGuest: 0,
            unread_count: 0,
            room: {
              number: guestChatState.context.room_number,
              guest_name: guestChatState.context.guest_name || `Room ${guestChatState.context.room_number}`
            }
          };
          
          setConversations([guestConversation]);
          guestChatActions.initFromAPI([guestConversation], guestChatDispatch);
          guestChatActions.setActiveConversation(guestChatState.context.conversation_id, guestChatDispatch);
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [guestChatState?.context?.conversation_id, user?.hotel_slug]); // More specific dependencies

  // Sync conversations from chatStore (staff chat store) for real-time updates
  useEffect(() => {
    if (!chatStore?.conversationsById) return;

    console.log('🔄 [ChatContext] Syncing with chatStore real-time updates:', Object.keys(chatStore.conversationsById).length);
    
    const storeConversations = Object.values(chatStore.conversationsById);
    
    if (storeConversations.length > 0) {
      console.log('🔄 [ChatContext] ChatStore conversations data:', storeConversations.map(c => ({
        id: c.id,
        lastMessage: c.lastMessage || c.last_message,
        updatedAt: c.updatedAt
      })));
      
      // Merge store conversations with existing conversations, preserving other data
      setConversations(prevConversations => {
        const updatedConversations = [...prevConversations];
        
        storeConversations.forEach(storeConv => {
          const existingIndex = updatedConversations.findIndex(c => 
            (c.conversation_id || c.id) === (storeConv.conversation_id || storeConv.id)
          );
          
          const normalizedStoreConv = {
            conversation_id: storeConv.conversation_id || storeConv.id,
            id: storeConv.conversation_id || storeConv.id,
            room_number: storeConv.room_number || storeConv.roomNumber,
            roomNumber: storeConv.room_number || storeConv.roomNumber,
            guest_name: storeConv.guest_name || storeConv.guestName,
            guestName: storeConv.guest_name || storeConv.guestName,
            guest_id: storeConv.guest_id || storeConv.guestId,
            guestId: storeConv.guest_id || storeConv.guestId,
            last_message: storeConv.last_message || storeConv.lastMessage,
            lastMessage: storeConv.last_message || storeConv.lastMessage,
            last_message_time: storeConv.last_message_time || storeConv.updatedAt,
            updatedAt: storeConv.last_message_time || storeConv.updatedAt,
            unread_count: storeConv.unread_count || 0,
            unreadCount: storeConv.unread_count || 0,
          };
          
          if (existingIndex >= 0) {
            // Update existing conversation, preserving other fields
            updatedConversations[existingIndex] = {
              ...updatedConversations[existingIndex],
              ...normalizedStoreConv
            };
          } else {
            // Add new conversation with room data
            updatedConversations.push({
              ...normalizedStoreConv,
              room: {
                number: storeConv.room_number || storeConv.roomNumber,
                guest_name: storeConv.guest_name || storeConv.guestName
              }
            });
          }
        });
        
        console.log('✅ [ChatContext] Conversations updated from chatStore:', updatedConversations.length);
        return updatedConversations;
      });
    }
  }, [JSON.stringify(chatStore?.conversationsById)]);


  // Sync conversations from guestChatStore realtime updates
  useEffect(() => {
    // Get hotel slug from either authenticated user, URL params, or query params
    const currentHotelSlug = user?.hotel_slug || hotelSlug;
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
  }, [guestChatState?.conversationsById, currentConversationId]); // More specific dependencies

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
  }, [guestChatState?.conversationsById]); // More specific dependency

  const markConversationRead = useCallback(async (conversationId) => {
    if (!conversationId) {
      console.warn("markConversationRead called with undefined/null conversationId");
      return;
    }
    
    try {
      console.log('[ChatContext] Marking room conversation as read:', conversationId);
      
      // Use the new room conversations API
      const currentHotelSlug = user?.hotel_slug || hotelSlug;
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
  }, [user?.hotel_slug, hotelSlug]);

  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

  // Helper functions for guest chat integration
  const fetchGuestMessages = useCallback(async (conversationId, options = {}) => {
    try {
      console.log('[ChatContext] Fetching room conversation messages:', conversationId);
      
      // Use the new room conversations API for messages
      const currentHotelSlug = user?.hotel_slug || hotelSlug;
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
  }, [user?.hotel_slug, hotelSlug, guestChatDispatch]);

  const setActiveGuestConversation = useCallback((conversationId) => {
    guestChatActions.setActiveConversation(conversationId, guestChatDispatch);
    setCurrentConversationId(conversationId);
    
    // Note: Staff real-time updates for guest conversations are now handled by
    // the centralized chatStore and eventBus system in ChatWindow.jsx
    // No manual channel subscriptions needed here
  }, [guestChatDispatch]);

  const markGuestConversationReadForStaff = useCallback(async (conversationId) => {
    try {
      console.log('[ChatContext] Marking room conversation as read for staff:', conversationId);
      
      // Use the new room conversations API
      const currentHotelSlug = user?.hotel_slug || hotelSlug;
      await markRoomConversationRead(currentHotelSlug, conversationId);
      
      guestChatActions.markConversationReadForStaff(conversationId, guestChatDispatch);
      console.log('[ChatContext] Room conversation marked as read for staff successfully:', conversationId);
    } catch (err) {
      console.error("[ChatContext] Failed to mark room conversation as read for staff:", err);
    }
  }, [user?.hotel_slug, hotelSlug, guestChatDispatch]);

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

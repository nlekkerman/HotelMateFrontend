// src/staff_chat/context/StaffChatContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { fetchConversations, sendMessage as apiSendMessage, markConversationAsRead } from "../services/staffChatApi";
import { useAuth } from "@/context/AuthContext";
import { useChatState, useChatDispatch } from "@/realtime/stores/chatStore.jsx";
import { CHAT_ACTIONS } from "@/realtime/stores/chatActions.js";
import { showNotification, canShowNotifications } from "@/utils/notificationUtils";
import { subscribeToStaffChatConversation } from "@/realtime/channelRegistry";

const StaffChatContext = createContext(undefined);

export const StaffChatProvider = ({ children }) => {
  const { user } = useAuth();
  const chatState = useChatState();
  const chatDispatch = useChatDispatch();
  
  // Event listeners for broadcasting messages to all components (maintain compatibility)
  // ✅ UNIFIED: No legacy listener refs needed

  // Get staff ID and hotel slug from user
  const staffId = user?.staff_id || user?.id;
  const hotelSlug = user?.hotel_slug;
  
  // ✅ UNIFIED: No legacy subscription functions needed - use chatStore directly

  // Fetch staff conversations and load into store
  const fetchStaffConversations = useCallback(async () => {
    if (!hotelSlug) return;

    try {
      const res = await fetchConversations(hotelSlug);
      const convs = res?.results || res || [];
      
      // Load conversations into chatStore
      chatDispatch({
        type: CHAT_ACTIONS.INIT_CONVERSATIONS_FROM_API,
        payload: { conversations: convs }
      });
    } catch (err) {
      console.error("Failed to fetch staff conversations:", err);
    }
  }, [hotelSlug, chatDispatch]);

  useEffect(() => {
    fetchStaffConversations();
  }, [fetchStaffConversations]);

  // ✅ UNIFIED: Desktop notifications only - no legacy broadcasting
  useEffect(() => {
    const conversations = Object.values(chatState.conversationsById);
    
    conversations.forEach(conversation => {
      const lastMessage = conversation.messages[conversation.messages.length - 1];
      if (lastMessage) {
        // Show desktop notification if not active conversation and not sent by current user
        const isActiveConv = chatState.activeConversationId === conversation.id;
        const isMyMessage = lastMessage.sender_info?.id === staffId || lastMessage.sender_id === staffId;
        
        if (!isActiveConv && !isMyMessage && canShowNotifications()) {
          const senderName = lastMessage.sender_info?.full_name || lastMessage.sender_name || 'Staff member';
          showNotification(`New message from ${senderName}`, {
            body: lastMessage.message || lastMessage.content || 'New message',
            icon: lastMessage.sender_info?.profile_image || "/favicons/favicon.svg",
            tag: `staff-msg-${lastMessage.id}`,
          }).catch(console.error);
        }
      }
    });
  }, [chatState.conversationsById, chatState.activeConversationId, staffId]);

  const markConversationRead = async (conversationId) => {
    if (!conversationId) return;
    try {
      // Update local state immediately
      chatDispatch({
        type: CHAT_ACTIONS.MARK_CONVERSATION_READ,
        payload: { conversationId }
      });
      
      await markConversationAsRead(hotelSlug, conversationId);
      console.log('[StaffChatContext] markConversationRead awaiting backend sync', { conversationId });
    } catch (err) {
      console.error("Failed to mark conversation as read:", err);
    }
  };

  // Send message function
  const sendMessage = async (conversationId, messageData) => {
    try {
      const response = await apiSendMessage(hotelSlug, conversationId, messageData);
      // Message will be received via realtime event, no need to update state here
      return response;
    } catch (err) {
      console.error("Failed to send message:", err);
      throw err;
    }
  };

  // Open/set active conversation
  const openConversation = useCallback((conversationId) => {
    chatDispatch({
      type: CHAT_ACTIONS.SET_ACTIVE_CONVERSATION,
      payload: { conversationId: conversationId }
    });
  }, [chatDispatch]);

  // Derived values from chatStore
  const conversations = useMemo(
    () => Object.values(chatState.conversationsById),
    [chatState.conversationsById]
  );
  const activeConversation = chatState.activeConversationId 
    ? chatState.conversationsById[chatState.activeConversationId] 
    : null;
  const messagesForActiveConversation = activeConversation ? activeConversation.messages : [];
  const totalUnread = useMemo(() => {
    if (typeof chatState.totalUnreadOverride === 'number') {
      return chatState.totalUnreadOverride;
    }
    return conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);
  }, [chatState.totalUnreadOverride, conversations]);
  
  // Subscribe to individual conversation channels when conversations change
  const subscriptionsRef = useRef(new Map());
  
  // Stable subscription management - only subscribe/unsubscribe when actually needed
  useEffect(() => {
    console.log('🚨🚨 [StaffChatContext] SUBSCRIPTION EFFECT TRIGGERED 🚨🚨');
    console.log('🔍 [StaffChatContext] Subscription effect running with:', {
      hotelSlug,
      conversationsCount: conversations.length,
      conversationIds: conversations.map(c => c.id),
      conversations: conversations
    });
    
    if (!hotelSlug) {
      console.warn('⚠️ [StaffChatContext] No hotelSlug, skipping subscriptions');
      return;
    }
    
    // Get current conversation IDs
    const currentConversationIds = new Set(conversations.map(c => c.id));
    const subscribedIds = new Set(subscriptionsRef.current.keys());
    
    console.log('🔍 [StaffChatContext] Subscription state:', {
      currentConversations: Array.from(currentConversationIds),
      alreadySubscribed: Array.from(subscribedIds)
    });
    
    // Subscribe to NEW conversations only
    currentConversationIds.forEach(conversationId => {
      if (!subscribedIds.has(conversationId)) {
        console.log('🔗 [StaffChatContext] Subscribing to conversation:', conversationId);
        const cleanup = subscribeToStaffChatConversation(hotelSlug, conversationId);
        subscriptionsRef.current.set(conversationId, cleanup);
      }
    });
    
    // Unsubscribe from REMOVED conversations only  
    subscribedIds.forEach(conversationId => {
      if (!currentConversationIds.has(conversationId)) {
        console.log('🧹 [StaffChatContext] Unsubscribing from removed conversation:', conversationId);
        const cleanup = subscriptionsRef.current.get(conversationId);
        if (cleanup) cleanup();
        subscriptionsRef.current.delete(conversationId);
      }
    });
    
  }, [hotelSlug, conversations.map(c => c.id).join(',')]); // Only re-run if conversation IDs actually change
  
  // Cleanup ALL subscriptions only on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 [StaffChatContext] Component unmounting - cleaning up all subscriptions');
      subscriptionsRef.current.forEach(cleanup => cleanup());
      subscriptionsRef.current.clear();
    };
  }, []); // Empty dependency array - only runs on mount/unmount

  // Debug logging
  useEffect(() => {
    console.log('[StaffChatContext] Unread snapshot:', {
      totalUnread,
      override: chatState.totalUnreadOverride,
      conversations: conversations.length,
    });
  }, [conversations.length, totalUnread, chatState.totalUnreadOverride]);

  return (
    <StaffChatContext.Provider value={{
      conversations,
      activeConversation,
      messagesForActiveConversation,
      fetchStaffConversations,
      markConversationRead,
      sendMessage,
      openConversation,
      totalUnread,
      currentConversationId: chatState.activeConversationId, // Legacy compatibility
      setCurrentConversationId: openConversation, // Legacy compatibility
      // ✅ UNIFIED: Legacy subscription methods removed - use chatStore directly
      hotelSlug,
      staffId
    }}>
      {children}
    </StaffChatContext.Provider>
  );
};

export const useStaffChat = () => {
  const context = useContext(StaffChatContext);
  if (context === undefined) {
    throw new Error('useStaffChat must be used within a StaffChatProvider');
  }
  return context;
};

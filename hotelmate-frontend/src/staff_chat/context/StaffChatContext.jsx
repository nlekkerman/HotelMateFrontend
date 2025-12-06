// src/staff_chat/context/StaffChatContext.jsx
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { fetchConversations, sendMessage as apiSendMessage, markConversationAsRead } from "../services/staffChatApi";
import { useAuth } from "@/context/AuthContext";
import { useChatState, useChatDispatch } from "@/realtime/stores/chatStore.jsx";
import { CHAT_ACTIONS } from "@/realtime/stores/chatActions.js";
import { showNotification, canShowNotifications } from "@/utils/notificationUtils";

const StaffChatContext = createContext(undefined);

export const StaffChatProvider = ({ children }) => {
  const { user } = useAuth();
  const chatState = useChatState();
  const chatDispatch = useChatDispatch();
  
  // Event listeners for broadcasting messages to all components (maintain compatibility)
  const messageListenersRef = useRef(new Set());
  const conversationUpdateListenersRef = useRef(new Set());

  // Get staff ID and hotel slug from user
  const staffId = user?.staff_id || user?.id;
  const hotelSlug = user?.hotel_slug;
  
  /**
   * Subscribe to new message events
   * Components can register callbacks to receive all new messages
   */
  const subscribeToMessages = useCallback((callback) => {
    messageListenersRef.current.add(callback);
    
    // Return unsubscribe function
    return () => {
      messageListenersRef.current.delete(callback);
    };
  }, []);
  
  /**
   * Subscribe to conversation update events
   * Components can register callbacks to receive conversation updates
   */
  const subscribeToConversationUpdates = useCallback((callback) => {
    conversationUpdateListenersRef.current.add(callback);
    
    // Return unsubscribe function
    return () => {
      conversationUpdateListenersRef.current.delete(callback);
    };
  }, []);
  
  /**
   * Broadcast new message to all listeners
   */
  const broadcastMessage = useCallback((message) => {
    messageListenersRef.current.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('❌ [StaffChatContext] Error in message listener:', error);
      }
    });
  }, []);
  
  /**
   * Broadcast conversation update to all listeners
   */
  const broadcastConversationUpdate = useCallback((conversationId, updates) => {
    console.log('📣 [StaffChatContext] Broadcasting conversation update to', conversationUpdateListenersRef.current.size, 'listeners');
    conversationUpdateListenersRef.current.forEach(callback => {
      try {
        callback(conversationId, updates);
      } catch (error) {
        console.error('❌ [StaffChatContext] Error in conversation update listener:', error);
      }
    });
  }, []);

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

  // Monitor chatStore for changes and broadcast to legacy listeners
  useEffect(() => {
    // Watch for new messages in any conversation and broadcast to legacy message listeners
    const conversations = Object.values(chatState.conversationsById);
    
    conversations.forEach(conversation => {
      const lastMessage = conversation.messages[conversation.messages.length - 1];
      if (lastMessage) {
        // Broadcast to legacy message listeners for compatibility
        broadcastMessage(lastMessage);
        
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
      
      // Broadcast conversation updates to legacy listeners
      broadcastConversationUpdate(conversation.id, conversation);
    });
  }, [chatState.conversationsById, chatState.activeConversationId, staffId, broadcastMessage, broadcastConversationUpdate]);

  const markConversationRead = async (conversationId) => {
    try {
      // Call API to mark as read
      await markConversationAsRead(hotelSlug, conversationId);
      
      // Update local state immediately
      chatDispatch({
        type: CHAT_ACTIONS.MARK_CONVERSATION_READ,
        payload: { conversationId: parseInt(conversationId) }
      });
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
  const conversations = Object.values(chatState.conversationsById);
  const activeConversation = chatState.activeConversationId 
    ? chatState.conversationsById[chatState.activeConversationId] 
    : null;
  const messagesForActiveConversation = activeConversation ? activeConversation.messages : [];
  const totalUnread = conversations.reduce((sum, c) => sum + (c.unread_count || 0), 0);

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
      // 🔥 NEW: Event subscription methods for components (maintain compatibility)
      subscribeToMessages,
      subscribeToConversationUpdates,
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

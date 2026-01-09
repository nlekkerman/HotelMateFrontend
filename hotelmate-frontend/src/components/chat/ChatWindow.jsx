import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import api, { buildStaffURL } from "@/services/api";
import { FaPaperPlane, FaTimes, FaArrowLeft, FaAngleDoubleDown, FaCheck, FaCheckDouble, FaSmile, FaPaperclip, FaDownload, FaTrash } from "react-icons/fa";
// import { useChat } from "@/context/ChatContext";
import { useChat } from "@/context/ChatContext";
import useHotelLogo from "@/hooks/useHotelLogo";
import EmojiPicker from "emoji-picker-react";
import { GuestChatSession } from "@/utils/guestChatSession";

import { messaging } from "@/firebase";
import { onMessage } from "firebase/messaging";
import ConfirmationModal from "@/components/modals/ConfirmationModal";
import SuccessModal from "@/components/modals/SuccessModal";
import { useChatState, useChatDispatch } from "@/realtime/stores/chatStore.jsx";
import { CHAT_ACTIONS } from "@/realtime/stores/chatActions.js";

// Import message action utilities
import {
  createReplyHandlers,
  ReplyPreview,
  ReplyInputPreview,
  formatReplyData,
  scrollToOriginalMessage
} from "./utils";
import {
  handleMessageDeletion,
  handlePusherDeletion,
  DeletedMessageDisplay
} from "./utils/messageDelete";
import {
  handleMessageShare
} from "./utils/messageShare";
import {        
  handleMessageDownload,
  getCloudinaryUrl
} from "./utils/messageDownload";
import { showStaffAssignmentNotification } from '@/utils/guestNotifications.jsx';
import { staffChatConversationChannel } from '@/lib/pusher/channels';

const MESSAGE_LIMIT = 10;

// Cloudinary configuration from environment
const CLOUDINARY_BASE = import.meta.env.VITE_CLOUDINARY_BASE || "https://res.cloudinary.com/dg0ssec7u/";
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dg0ssec7u";

// File upload constraints (matching backend - updated to 50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB (backend max)
const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv'
];

const ChatWindow = ({
  userId: propUserId,
  conversationId: propConversationId,
  hotelSlug: propHotelSlug,
  roomNumber: propRoomNumber,
  conversationData: propConversationData,
  onNewMessage,
  onClose,
}) => {
  // console.log('🔧 [CHATWINDOW PROPS] Received props:', {
  //   propUserId,
  //   propConversationId,
  //   propHotelSlug,
  //   propRoomNumber,
  //   hasConversationData: !!propConversationData
  // });
  
  const {
    hotelSlug: paramHotelSlug,
    conversationId: paramConversationIdFromURL,
  } = useParams();
  const location = useLocation();
  
  // console.log('🔧 [CHATWINDOW PARAMS] URL params:', {
  //   paramHotelSlug,
  //   paramConversationIdFromURL
  // });
  // console.log('🔧 [CHATWINDOW STATE] Location state:', location.state);
  
  const hotelSlug = propHotelSlug || paramHotelSlug;
  const conversationId = propConversationId || paramConversationIdFromURL;
  
  const storedUser = localStorage.getItem("user");
  const userId =
    propUserId || (storedUser ? JSON.parse(storedUser).id : undefined);
  
  // Guest is someone WITHOUT a userId (not authenticated as staff)
  const isGuest = !userId;
  
  // Get room number from multiple sources - use state for dynamic updates
  const [roomNumber, setRoomNumber] = useState(() => {
    // Try multiple sources in order of priority
    let initialRoomNumber = propRoomNumber || location.state?.room_number;
    
    // If no room number but this is a guest, try to get it from stored session
    if (!initialRoomNumber && isGuest) {
      try {
        const storedSession = localStorage.getItem('hotelmate_guest_chat_session');
        if (storedSession) {
          const session = JSON.parse(storedSession);
          initialRoomNumber = session.room_number;
          console.log('🔍 Retrieved room number from stored session:', initialRoomNumber);
        }
      } catch (err) {
        console.error('Failed to parse stored session:', err);
      }
    }
    
    // If still no room number, try conversation data prop
    if (!initialRoomNumber && isGuest && propConversationData?.room_number) {
      initialRoomNumber = propConversationData.room_number;
      console.log('🔍 Retrieved room number from conversation data:', initialRoomNumber);
    }
    
    return initialRoomNumber;
  });
  
  // Get chat context data early (needed in useEffects below)
  const { 
    markConversationRead, 
    pusherInstance, 
    setCurrentConversationId,
    // Guest chat functionality from guestChatStore
    guestMessages,
    fetchGuestMessages: contextFetchGuestMessages,
    setActiveGuestConversation: contextSetActiveGuestConversation,
    activeGuestConversation: contextActiveGuestConversation,
    markGuestConversationReadForStaff: contextMarkGuestConversationReadForStaff,
    markGuestConversationReadForGuest: contextMarkGuestConversationReadForGuest,
    guestChatState // Add this to get access to all guest conversations
  } = useChat();
  
  // Guest chat functions - use context functions if available
  const activeGuestConversation = contextActiveGuestConversation;
  const fetchGuestMessages = contextFetchGuestMessages || (() => Promise.resolve());
  const setActiveGuestConversation = contextSetActiveGuestConversation || (() => {});
  const markGuestConversationReadForStaff = contextMarkGuestConversationReadForStaff || (() => {});
  const markGuestConversationReadForGuest = contextMarkGuestConversationReadForGuest || (() => {});

  // Guest session management
  const [guestSession, setGuestSession] = useState(null);
  const [currentStaff, setCurrentStaff] = useState(null);
  
  // Guest chat channels now managed by centralized RealtimeProvider
  // Debug log for guest setup - DISABLED to prevent re-renders
  // useEffect(() => {
  //   if (isGuest) {
  //     console.log('🔍 Guest Chat Store Debug - isGuest:', isGuest, 'conversationId:', conversationId);
  //   }
  // }, [isGuest, conversationId]);
  
  // Use conversation data from props (already fetched in ChatHomePage)
  const [conversationDetails, setConversationDetails] = useState(propConversationData || null);
  
  // Fetch room number from conversation if not available (critical for guests)
  useEffect(() => {
    if (!roomNumber && conversationId && hotelSlug && isGuest) {
      console.log('🔍 [ROOM NUMBER] Missing room number for guest, fetching from conversation...');
      
      const fetchRoomNumber = async () => {
        try {
          const response = await api.get(buildStaffURL(hotelSlug, 'chat', `conversations/${conversationId}/`));
          if (response.data?.room_number) {
            // Update room number state
            setRoomNumber(response.data.room_number);
            console.log('✅ [ROOM NUMBER] Fetched room number from backend:', response.data.room_number);
            
            // Update conversation details
            setConversationDetails(prev => ({
              ...prev,
              ...response.data,
              room_number: response.data.room_number
            }));
            
            // Also save to localStorage for future use
            try {
              const storedSession = localStorage.getItem('hotelmate_guest_chat_session');
              if (storedSession) {
                const session = JSON.parse(storedSession);
                session.room_number = response.data.room_number;
                localStorage.setItem('hotelmate_guest_chat_session', JSON.stringify(session));
              }
            } catch (err) {
              console.error('Failed to update stored session:', err);
            }
          }
        } catch (error) {
          console.error('❌ [ROOM NUMBER] Failed to fetch conversation details:', error);
        }
      };
      
      fetchRoomNumber();
    }
  }, [roomNumber, conversationId, hotelSlug, isGuest]);
  
  const {
    logoUrl: hotelLogo,
    loading: logoLoading,
    error: logoError,
  } = useHotelLogo(hotelSlug);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  
  // Debug: Log messages state changes
  useEffect(() => {
    console.log('💬 [MESSAGES STATE] Current messages:', messages.length, messages.map(m => ({
      id: m.id, 
      msg: m.message?.substring(0, 20),
      is_deleted: m.is_deleted,
      has_attachments: !!m.attachments?.length,
      reply_to: m.reply_to,
      has_reply_to_message: !!m.reply_to_message
    })));
    
    // Log deleted messages specifically
    const deletedMessages = messages.filter(m => m.is_deleted);
    if (deletedMessages.length > 0) {
      console.log('🗑️ [DELETED MESSAGES] Found deleted messages:', deletedMessages.map(m => ({
        id: m.id,
        message: m.message,
        attachments: m.attachments?.length || 0,
        is_deleted: m.is_deleted
      })));
    }
  }, [messages]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [seenMessages, setSeenMessages] = useState(new Set());
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [messageStatuses, setMessageStatuses] = useState(new Map()); // Track message statuses: pending, delivered, seen
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDownloadConfirm, setShowDownloadConfirm] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [messageToDownload, setMessageToDownload] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [replyingTo, setReplyingTo] = useState(null);

  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const observerRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const messageInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Initialize reply handlers from utility
  const { startReply, cancelReply, clearReplyAfterSend } = createReplyHandlers(setReplyingTo, messageInputRef);

  // Scroll to bottom only on initial load or when sending a new message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Update conversation details when prop changes
  useEffect(() => {
    if (propConversationData) {
      setConversationDetails(propConversationData);
      console.log('📋 Using conversation data from props:', propConversationData);
    }
  }, [propConversationData]);

  // Remove the unnecessary fetchConversationDetails function since we have data from props

  // Function to add "staff joined" markers based on staff changes in message history
  const addStaffJoinedMarkers = useCallback((messages) => {
    if (!messages || messages.length === 0) return messages;
    
    let previousStaff = null;
    const result = [];
    
    messages.forEach((message) => {
      // Check if this is a staff message with staff_info
      if (message.sender_type === 'staff' && message.staff_info) {
        const currentStaffName = message.staff_info.name;
        
        // If staff changed from previous message, insert "joined" marker
        if (previousStaff && previousStaff !== currentStaffName) {
          // Extract only position from role (remove department)
          let role = message.staff_info.role || "";
          if (role) {
            const match = role.match(/\(([^)]+)\)$/);
            role = match ? match[1] : role.split(' - ').pop();
          }
          
          result.push({
            id: `system-join-${message.id}`,
            message: `${message.staff_info.name} (${role}) joined the chat`,
            sender_type: 'system',
            is_system_message: true,
            created_at: message.created_at,
            timestamp: message.timestamp
          });
        }
        
        previousStaff = currentStaffName;
      }
      
      result.push(message);
    });
    
    return result;
  }, []);

  // Fetch messages
  const fetchMessages = async (beforeId = null) => {
    if (!hasMore && beforeId) return;

    try {
      if (beforeId) setLoadingMore(true);
      else setLoading(true);

      console.log('🔥 [FETCH MESSAGES] Starting fetch with params:', {
        hotelSlug,
        conversationId,
        beforeId,
        endpoint: buildStaffURL(hotelSlug, 'chat', `conversations/${conversationId}/messages/`)
      });

      const res = await api.get(
        buildStaffURL(hotelSlug, 'chat', `conversations/${conversationId}/messages/`),
        { params: { limit: MESSAGE_LIMIT, before_id: beforeId } }
      );

      console.log('🔥 [FETCH MESSAGES] API response received:', {
        messageCount: res.data.length,
        messageIds: res.data.map(m => m.id)
      });

      // Clean up deleted messages - remove attachments if is_deleted is true
      const newMessages = res.data.map(msg => {
        if (msg.is_deleted) {
          console.log(`🗑️ [FETCH] Found deleted message ${msg.id} - clearing attachments`);
          return {
            ...msg,
            attachments: [] // Clear attachments for deleted messages
          };
        }
        return msg;
      });

      // Use guest chat store for guests, local state for staff
      if (isGuest) {
        // Let the store handle message initialization
        setLoading(false); // Clear loading state for guests
        setLoadingMore(false);
        return; // guestChatStore will be updated via fetchGuestMessages
      }
      
      const container = messagesContainerRef.current;

      if (beforeId && container) {
        // Infinite scroll: prepend older messages
        const scrollOffsetFromBottom =
          container.scrollHeight - container.scrollTop;

        setMessages((prev) => {
          // Combine old and new messages, then add markers
          const combined = [...newMessages, ...prev];
          return addStaffJoinedMarkers(combined);
        });

        // Wait for DOM to render before restoring scroll
        requestAnimationFrame(() => {
          container.scrollTop = container.scrollHeight - scrollOffsetFromBottom;
          setLoadingMore(false);
        });
      } else {
        // Initial load or switching conversation: replace messages with markers
        const messagesWithMarkers = addStaffJoinedMarkers(newMessages);
        console.log('🔥 [FETCH MESSAGES] Setting messages in state:', {
          originalCount: newMessages.length,
          withMarkersCount: messagesWithMarkers.length,
          messageIds: messagesWithMarkers.map(m => m.id)
        });
        setMessages(messagesWithMarkers);
        setLoading(false);
        
        // Scroll to bottom after DOM renders
        setTimeout(() => {
          scrollToBottom();
        }, 100);
        
        // Extract guest name from first guest message if conversation details not available
        if (!conversationDetails?.guest_name && newMessages.length > 0) {
          const guestMessage = newMessages.find(msg => msg.sender_type === 'guest');
          if (guestMessage?.guest_name) {
            setConversationDetails(prev => ({
              ...prev,
              guest_name: guestMessage.guest_name,
              room_number: guestMessage.room_number || roomNumber
            }));
          }
        }
      }

      if (newMessages.length < MESSAGE_LIMIT) setHasMore(false);
    } catch (err) {
      console.error("Error fetching messages:", err);
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (!conversationId) return;

    // Reset state for new conversation
    setMessages([]);
    setLoading(true);
    setHasMore(true);
    setLoadingMore(false);

    // Update current conversation ID in context (only for staff)
    if (userId) {
      setCurrentConversationId(conversationId);
    }

    // Assign staff to conversation when they open it (STAFF ONLY)
    const assignStaffToConversation = async () => {
      if (!userId || isGuest || !hotelSlug) return;
      
      try {
        console.log('👤 [STAFF ASSIGN] Assigning current staff to conversation:', conversationId);
        const response = await api.post(
          buildStaffURL(hotelSlug, 'chat', `conversations/${conversationId}/assign-staff/`)
        );
        
        if (response.data?.assigned_staff) {
          console.log('✅ [STAFF ASSIGN] Staff assigned:', response.data.assigned_staff.name);
          if (response.data?.messages_marked_read !== undefined) {
            console.log('✅ [STAFF ASSIGN] Marked', response.data.messages_marked_read, 'guest messages as read');
          }
          
          // Show local notification for staff assignment
          if (response.data?.guest_name || response.data?.room_number) {
            showStaffAssignmentNotification({
              guest_name: response.data.guest_name || 'Guest',
              room_number: response.data.room_number || roomNumber || 'Unknown',
              unread_count: response.data.messages_marked_read || 0,
              conversation_id: conversationId
            });
          }
        }
        
        // ADDITIONAL: Explicitly mark conversation as read to trigger Pusher event
        console.log('📖 [STAFF ASSIGN] Explicitly marking conversation as read...');
        await api.post(buildStaffURL(hotelSlug, 'chat', `conversations/${conversationId}/mark-read/`));
        console.log('✅ [STAFF ASSIGN] Conversation marked as read - Pusher event should fire');
      } catch (error) {
        console.error('❌ [STAFF ASSIGN] Failed to assign staff to conversation:', error);
        // Don't block conversation loading if assignment fails
      }
    };

    // Initialize guest session if this is a guest
    if (isGuest && hotelSlug && roomNumber) {
      console.log('🔧 Initializing guest session:', { hotelSlug, roomNumber });
      const session = new GuestChatSession(hotelSlug, roomNumber);
      setGuestSession(session);
      
      // Log complete session data for debugging
      console.log('📊 Guest Session Data:', {
        session_id: session.getSessionId(),
        room_number: session.getRoomNumber(),
        hotel_slug: session.getHotelSlug(),
        conversation_id: session.getConversationId(),
        pusher_channel: session.getPusherChannel(),
        guest_name: session.getGuestName(),
        has_token: !!session.getToken()
      });
      
      // Don't load saved staff handler - wait for staff to actively pick up the conversation
      // Staff will be set via Pusher 'staff-assigned' event when they select the conversation
      console.log('📡 Guest Pusher channel will be:', `${hotelSlug}-room-${roomNumber}-chat`);
    }

    // Initialize chatStore conversation for staff viewing guest chat
    if (!isGuest && chatDispatch && conversationId) {
      console.log('🔄 [UNIFIED] Initializing chatStore conversation for guest-to-staff:', conversationId);
      chatDispatch({
        type: CHAT_ACTIONS.SET_ACTIVE_CONVERSATION,
        payload: { conversationId: parseInt(conversationId) }
      });
    }
    
    // Assign staff first (if staff), then fetch messages
    assignStaffToConversation().then(() => {
      console.log('🔥 [INIT] About to fetch messages for staff API - conversationId:', conversationId);
      console.log('🔥 [INIT] isGuest:', isGuest, 'userId:', userId);
      fetchMessages();
    });

    return () => {
      if (userId) {
        setCurrentConversationId(null);
      }
    };
  }, [conversationId, isGuest, hotelSlug, roomNumber, userId]);

  // Pusher real-time updates - reuse global instance for staff, separate for guests
  useEffect(() => {
    if (!conversationId || !hotelSlug) return;
    
    // IMPORTANT: Skip staff Pusher if this is a guest (guests use centralized guestChatStore)
    if (isGuest) {
      console.log('⏭️ Skipping staff Pusher - using guest Pusher hook instead');
      return;
    }

    // For authenticated staff, use staff conversation channels for ALL conversations (guest and staff)
    if (userId && pusherInstance) {
      // ✅ BACKEND SENDS TO: hotel-killarney.staff-chat.100 (for all staff conversations)
      const channelName = `${hotelSlug}.staff-chat.${conversationId}`;
      console.log('👨‍💼 [STAFF-CONVERSATION] Using staff chat channel:', channelName, { conversationId, roomNumber });
      
      // Get existing channel or subscribe to a new one
      let channel = pusherInstance.channel(channelName);
      if (!channel) {
        channel = pusherInstance.subscribe(channelName);
      }

      // Unbind any existing handlers to avoid duplicates
      channel.unbind("new-message");
      channel.unbind("message-delivered");
      channel.unbind("messages-read-by-staff");
      channel.unbind("messages-read-by-guest");
      channel.unbind("staff-assigned");
      
      // Listen for new messages
      channel.bind("new-message", (message) => {
        console.log(`📨 [PUSHER] New message received:`, { 
          id: message.id, 
          sender: message.sender_type, 
          text: message.message?.substring(0, 30),
          reply_to: message.reply_to,
          reply_to_message: message.reply_to_message 
        });
        
        // 🔍 DEBUG: Check if reply data is present
        if (message.reply_to) {
          console.log('🔍 [PUSHER REPLY] Message has reply_to:', message.reply_to);
          console.log('🔍 [PUSHER REPLY] reply_to_message:', message.reply_to_message);
        }
        
        setMessages((prev) => {
          // Check if this message already exists by ID
          const exists = prev.some((m) => m.id === message.id);
          if (exists) {
            console.log(`⚠️ [PUSHER] Message ${message.id} already exists, skipping`);
            return prev;
          }
          
          // Check if there's a temp message with the same content (race condition)
          const tempMsg = prev.find(m => {
            const isTemp = m.id?.toString().startsWith('temp-') || m.__optimistic;
            const sameMessage = m.message === message.message;
            const sameSender = m.sender_type === message.sender_type;
            
            // For guest messages, also check guest_id match to avoid cross-guest conflicts
            if (message.sender_type === 'guest' && m.sender_type === 'guest') {
              return isTemp && sameMessage && sameSender && 
                     (!message.guest_id || !m.guest_id || message.guest_id === m.guest_id);
            }
            
            return isTemp && sameMessage && sameSender;
          });
          
          if (tempMsg) {
            console.log(`🔄 [PUSHER] Replacing temp message ${tempMsg.id} with real ${message.id}`);
            // Replace temp with real message
            return prev.map(m => m.id === tempMsg.id ? { ...message, status: 'delivered' } : m);
          }
          
          console.log(`✅ [PUSHER] Adding new message ${message.id} to chat`);
          return [...prev, message];
        });
        scrollToBottom();
      });

      // Listen for staff assignment changes (for staff handoff notifications)
      channel.bind("staff-assigned", (data) => {
        console.log('👤 Staff assignment changed:', data);
        
        // Get current staff name from localStorage
        const storedUser = localStorage.getItem("user");
        const currentStaffName = storedUser ? JSON.parse(storedUser).first_name + ' ' + JSON.parse(storedUser).last_name : '';
        
        // Log if another staff member took over
        if (data.staff_name && data.staff_name !== currentStaffName) {
          console.log('📢 Staff handoff:', data.staff_name, 'is now handling this conversation');
        }
      });

      // Listen for message delivered event (from backend)
      channel.bind("message-delivered", (data) => {
        const { message_id } = data;
        if (message_id) {
          setMessageStatuses(prev => {
            const newMap = new Map(prev);
            newMap.set(message_id, 'delivered');
            return newMap;
          });
        }
      });

      // Listen for messages read by staff (affects guest's messages)
      channel.bind("messages-read-by-staff", (data) => {
        const { message_ids } = data;
        if (message_ids && Array.isArray(message_ids)) {
          setMessageStatuses(prev => {
            const newMap = new Map(prev);
            message_ids.forEach(id => {
              newMap.set(id, 'read');
            });
            return newMap;
          });
          
          // Also update the messages array with read status
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              message_ids.includes(msg.id)
                ? { ...msg, status: 'read', is_read_by_recipient: true, read_by_staff: true }
                : msg
            )
          );
        }
      });

      // Listen for messages read by guest (affects staff's messages)
      channel.bind("messages-read-by-guest", (data) => {
        console.log('👁️ [STAFF SEES] Messages read by guest event received:', data);
        const { message_ids } = data;
        if (message_ids && Array.isArray(message_ids)) {
          console.log(`👁️ [STAFF SEES] Updating ${message_ids.length} staff messages as read by guest`);
          
          setMessageStatuses(prev => {
            const newMap = new Map(prev);
            message_ids.forEach(id => {
              console.log(`👁️ [STAFF SEES] Marking message ${id} as read`);
              newMap.set(id, 'read');
            });
            return newMap;
          });
          
          // Also update the messages array with read status
          setMessages(prevMessages => 
            prevMessages.map(msg => 
              message_ids.includes(msg.id)
                ? { ...msg, status: 'read', is_read_by_recipient: true, read_by_guest: true }
                : msg
            )
          );
        }
      });

      // ALSO listen to staff notifications channel for new guest messages
      const notificationsChannelName = `${hotelSlug}.staff-${userId}-notifications`;
      let notificationsChannel = pusherInstance.channel(notificationsChannelName);
      if (!notificationsChannel) {
        notificationsChannel = pusherInstance.subscribe(notificationsChannelName);
      }
      
      console.log('🔔 [GUEST-TO-STAFF] Also listening for guest messages on:', notificationsChannelName);
      
      // Handle new guest messages coming through notifications channel
      notificationsChannel.bind("new-guest-message", (data) => {
        console.log('📨 [GUEST-TO-STAFF] New guest message received on notifications channel:', data);
        
        // Only process if it's for the current conversation
        if (data.conversation_id === conversationId) {
          console.log('✅ [GUEST-TO-STAFF] Message is for current conversation, adding to chat');
          
          const guestMessage = {
            id: data.id,
            message: data.guest_message || data.message,
            sender_type: 'guest',
            sender_name: data.sender_name || 'Guest',
            guest_id: data.guest_id,
            conversation_id: data.conversation_id,
            created_at: data.timestamp || new Date().toISOString(),
            status: 'delivered'
          };
          
          setMessages((prev) => {
            // Check if this message already exists by ID
            const exists = prev.some((m) => m.id === guestMessage.id);
            if (exists) {
              console.log(`⚠️ [GUEST-TO-STAFF] Message ${guestMessage.id} already exists, skipping`);
              return prev;
            }
            
            console.log(`✅ [GUEST-TO-STAFF] Adding guest message ${guestMessage.id} to chat`);
            return [...prev, guestMessage];
          });
          
          scrollToBottom();
        } else {
          console.log('⏭️ [GUEST-TO-STAFF] Message not for current conversation, ignoring');
        }
      });

      // Listen for message deleted event (backend sends both 'message-deleted' and 'message-removed')
      const handleDeletion = (data) => {
        handlePusherDeletion(data, setMessages, setMessageStatuses, false); // isGuest = false for staff
      };
      
      channel.bind("message-deleted", handleDeletion);
      channel.bind("message-removed", handleDeletion); // Backend alias

      return () => {
        // Only unbind our handlers, don't unsubscribe the channel
        if (channel) {
          channel.unbind("new-message");
          channel.unbind("message-delivered");
          channel.unbind("messages-read-by-staff");
          channel.unbind("messages-read-by-guest");
          channel.unbind("staff-assigned");
          channel.unbind("message-deleted", handleDeletion);
          channel.unbind("message-removed", handleDeletion);
        }
        
        // Also cleanup notifications channel
        if (notificationsChannel) {
          notificationsChannel.unbind("new-guest-message");
        }
      };
    }
  }, [hotelSlug, conversationId, pusherInstance, userId, isGuest]);

  // UNIFIED: Use chatStore for guest-to-staff messages (new system)
  const chatState = useChatState();
  const chatDispatch = useChatDispatch();
  
  // Get messages from chatStore for this conversation
  const conversation = chatState.conversationsById?.[conversationId];
  const storeMessages = conversation?.messages || [];
  
  // Sync store messages with local state for guest-to-staff chat
  useEffect(() => {
    if (isGuest || !conversationId) return;
    
    if (storeMessages.length > 0) {
      console.log('🔄 [UNIFIED] Syncing', storeMessages.length, 'messages from chatStore to ChatWindow');
      
      setMessages(prevMessages => {
        // Merge store messages with local messages, avoiding duplicates
        const localMessageIds = new Set(prevMessages.map(m => m.id));
        const newMessagesFromStore = storeMessages.filter(m => !localMessageIds.has(m.id));
        
        if (newMessagesFromStore.length > 0) {
          console.log('✅ [UNIFIED] Adding', newMessagesFromStore.length, 'new messages from chatStore');
          const combined = [...prevMessages, ...newMessagesFromStore];
          // Sort by timestamp to maintain order
          return combined.sort((a, b) => new Date(a.created_at || a.timestamp) - new Date(b.created_at || b.timestamp));
        }
        
        return prevMessages;
      });
    }
  }, [storeMessages, conversationId, isGuest]);

  // Guest Pusher setup - use useCallback to create stable event handlers
  const handleNewStaffMessage = useCallback((data) => {
    console.log('📨 New staff message received by guest:', data);
    console.log('📨 Message details:', {
      id: data.id,
      message: data.message,
      sender_type: data.sender_type,
      sender_id: data.sender_id,
      reply_to: data.reply_to,
      reply_to_message: data.reply_to_message
    });
    
    // 🔍 DEBUG: Check reply data for guests
    if (data.reply_to) {
      console.log('🔍 [GUEST PUSHER REPLY] Staff replied to message:', data.reply_to);
      console.log('🔍 [GUEST PUSHER REPLY] reply_to_message:', data.reply_to_message);
    }
    
    // Add message to list (check for duplicates)
    setMessages(prev => {
      console.log('📨 Current messages count:', prev.length);
      const isDuplicate = prev.find(m => m.id === data.id);
      if (isDuplicate) {
        console.log('⚠️ Duplicate message detected, skipping:', data.id);
        return prev;
      }
      console.log('✅ Adding new staff message to UI:', data.id);
      const newMessages = [...prev, data];
      console.log('✅ New messages count:', newMessages.length);
      return newMessages;
    });
    
    // Update current staff handler
    if (data.staff_info) {
      setCurrentStaff(data.staff_info);
      guestSession?.saveToLocalStorage({ current_staff_handler: data.staff_info });
    }
    
    // Show notification if tab not focused using Service Worker
    if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
      const staffName = data.staff_info?.name || data.staff_name || 'Hotel Staff';
      const messageText = data.message?.substring(0, 100) || '';
      
      // Use Service Worker Registration to show notification
      navigator.serviceWorker.ready.then(registration => {
        registration.showNotification(`Message from ${staffName}`, {
          body: messageText,
          icon: data.staff_info?.profile_image || '/hotel-icon.png',
          tag: `chat-${data.id}`,
          badge: '/hotel-icon.png',
          data: {
            url: window.location.href,
            messageId: data.id
          }
        });
      }).catch(err => {
        console.warn('⚠️ Could not show notification:', err);
      });
    }
    
    // Scroll after message is rendered
    setTimeout(() => {
      scrollToBottom();
    }, 50);
  }, [guestSession]); // Only recreate if guestSession changes

  const handleNewMessage = useCallback((data) => {
    console.log('💬 New message received by guest (general event):', data);
    console.log('💬 Message details:', {
      id: data.id,
      message: data.message,
      sender_type: data.sender_type,
      sender_id: data.sender_id
    });
    
    // Add message if not already present
    setMessages(prev => {
      console.log('💬 Current messages count:', prev.length);
      const isDuplicate = prev.find(m => m.id === data.id);
      if (isDuplicate) {
        console.log('⚠️ Duplicate message detected, skipping:', data.id);
        return prev;
      }
      console.log('✅ Adding new message to UI:', data.id);
      const newMessages = [...prev, data];
      console.log('✅ New messages count:', newMessages.length);
      return newMessages;
    });
    
    // Scroll after message is rendered
    setTimeout(() => {
      scrollToBottom();
    }, 50);
  }, []); // Stable callback with no dependencies

  // Handle staff assignment changes (for guests)
  const handleStaffAssigned = useCallback((data) => {
    console.log('👤 Staff assigned event received:', data);
    
    const newStaffInfo = {
      name: data.staff_name,
      role: data.staff_role,
      profile_image: data.staff_profile_image
    };
    
    // Check if this is actually a new staff member (prevent duplicate "joined" messages)
    const isNewStaff = !currentStaff || currentStaff.name !== newStaffInfo.name;
    
    // Update current staff handler
    setCurrentStaff(newStaffInfo);
    
    // Save to guest session
    guestSession?.saveToLocalStorage({ current_staff_handler: newStaffInfo });
    
    // Only add system message if this is a new staff member joining
    if (isNewStaff) {
      const systemMessage = {
        id: `system-${Date.now()}`,
        message: `${data.staff_name} (${data.staff_role}) joined the chat`,
        sender_type: 'system',
        created_at: new Date().toISOString(),
        is_system_message: true
      };
      
      setMessages((prev) => [...prev, systemMessage]);
      scrollToBottom();
      console.log('✅ Added "joined chat" message for new staff:', data.staff_name);
    } else {
      console.log('ℹ️ Same staff member, skipping "joined chat" message');
    }
    
    console.log('✅ Updated staff handler to:', data.staff_name);
  }, [currentStaff, guestSession]);

  // Handle messages read by staff (for guest view)
  const handleMessagesReadByStaff = useCallback((data) => {
    console.log('👁️ [SEEN STATUS] Messages read by staff event received:', data);
    console.log('👁️ [SEEN STATUS] Event data:', JSON.stringify(data, null, 2));
    console.log('👁️ [SEEN STATUS] Message IDs to mark as read:', data.message_ids);
    
    const { message_ids } = data;
    if (message_ids && Array.isArray(message_ids)) {
      console.log('👁️ [SEEN STATUS] Updating status for', message_ids.length, 'messages');
      
      setMessageStatuses(prev => {
        const newMap = new Map(prev);
        message_ids.forEach(id => {
          const oldStatus = newMap.get(id);
          newMap.set(id, 'read');
          console.log(`👁️ [SEEN STATUS] Message ${id}: ${oldStatus} -> read`);
        });
        return newMap;
      });
      
      // Update messages array with read status
      setMessages(prevMessages => {
        const updated = prevMessages.map(msg => {
          if (message_ids.includes(msg.id)) {
            console.log(`👁️ [SEEN STATUS] Marking message ${msg.id} as read in state`);
            return { ...msg, status: 'read', is_read_by_recipient: true, read_by_staff: true };
          }
          return msg;
        });
        return updated;
      });
      
      console.log('✅ [SEEN STATUS] Updated guest messages as read by staff');
    } else {
      console.warn('⚠️ [SEEN STATUS] No message_ids in event data or not an array:', message_ids);
    }
  }, []); // Stable callback

  // Handle message deleted event (for guest view) - using utility
  const handleMessageDeleted = useCallback((data) => {
    console.log('🗑️ [GUEST] handleMessageDeleted called with data:', data);
    handlePusherDeletion(data, setMessages, setMessageStatuses, isGuest);
  }, [isGuest]); // Only depend on isGuest

  // NEW: Handle content-deleted event from dedicated deletion channel
  const handleContentDeleted = useCallback((data) => {
    console.log('🗑️🔴 [DELETION CHANNEL] content-deleted event received!');
    console.log('🗑️🔴 [DELETION CHANNEL] Raw data:', JSON.stringify(data, null, 2));
    
    // Use the same handler with isGuest flag for contextual messages
    handlePusherDeletion(data, setMessages, setMessageStatuses, isGuest);
  }, [isGuest]); // Only depend on isGuest

  // NEW: Handle attachment-deleted event from deletion channel
  const handleAttachmentDeleted = useCallback((data) => {
    console.log('📎 [DELETION CHANNEL] attachment-deleted event received:', data);
    const { attachment_id, message_id } = data;
    
    if (message_id && attachment_id) {
      console.log(`📎 Removing attachment ${attachment_id} from message ${message_id}`);
      
      setMessages(prevMessages => 
        prevMessages.map(msg => {
          if (msg.id === message_id && msg.attachments) {
            const updatedAttachments = msg.attachments.filter(att => att.id !== attachment_id);
            console.log(`📎 Attachments: ${msg.attachments.length} → ${updatedAttachments.length}`);
            
            return {
              ...msg,
              attachments: updatedAttachments
            };
          }
          return msg;
        })
      );
      
      console.log(`✅ Attachment ${attachment_id} removed from UI`);
    }
  }, []);

  // Guest chat now uses centralized guestChatStore via RealtimeProvider
  // All Pusher subscriptions are handled by the eventBus system
  // console.log('🔧 [CHATWINDOW] Guest chat now uses centralized store via RealtimeProvider');

  // Use appropriate messages source based on user type
  const displayMessages = isGuest ? guestMessages : messages;
  
  // Debug logging for message state - SIMPLIFIED to prevent re-renders
  // console.log('🔥 [MESSAGE DEBUG] isGuest:', isGuest, 'messages:', displayMessages?.length || 0);

  // Initialize guest conversation when component loads
  useEffect(() => {
    if (isGuest && conversationId) {
      console.log('🔄 [GUEST CHAT] Setting active conversation:', conversationId);
      setActiveGuestConversation(conversationId);
      fetchGuestMessages(conversationId).then(() => {
        console.log('📥 [GUEST CHAT] Messages fetched, clearing loading state');
        setLoading(false);
        setLoadingMore(false);
      }).catch((err) => {
        console.error('❌ [GUEST CHAT] Failed to fetch messages:', err);
        setLoading(false);
        setLoadingMore(false);
      });
    }
  }, [isGuest, conversationId, setActiveGuestConversation, fetchGuestMessages]);

  // FCM foreground message listener for guests
  useEffect(() => {
    if (!isGuest) {
      console.log('🔔 Skipping FCM setup - not a guest');
      return;
    }

    console.log('🔔 Setting up FCM foreground message listener for guest');
    
    try {
      // Listen for foreground FCM messages (when tab is open)
      const unsubscribe = onMessage(messaging, (payload) => {
        console.log('🔔 FCM foreground message received:', payload);
        console.log('🔔 FCM payload.data:', payload.data);
        console.log('🔔 FCM payload.notification:', payload.notification);
        
        // Extract message data
        const data = payload.data;
        if (data && data.message_id) {
          // FCM notification already shown by service worker
          // Pusher event will handle adding the message to the UI
          console.log('✅ FCM message received, Pusher will handle UI update');
        } else {
          console.warn('⚠️ FCM message received but no message_id in data');
        }
      });

      return () => {
        console.log('🔔 Cleaning up FCM listener');
        unsubscribe();
      };
    } catch (error) {
      console.error('❌ Error setting up FCM listener:', error);
    }
  }, [isGuest]);

  // Set up intersection observer for message seen status (for staff only)
  useEffect(() => {
    if (!conversationId || !userId) return;

    const observerCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const messageId = entry.target.dataset.messageId;
          const senderId = entry.target.dataset.senderId;
          const senderType = entry.target.dataset.senderType;
          
          // Only mark as seen if it's not our own message
          const isOwnMessage = (senderType === "staff" && senderId == userId) || 
                               (senderType === "guest" && !userId);
          
          if (messageId && !isOwnMessage && !seenMessages.has(messageId)) {
            setSeenMessages((prev) => new Set(prev).add(messageId));
          }
        }
      });
    };

    observerRef.current = new IntersectionObserver(observerCallback, {
      root: messagesContainerRef.current,
      threshold: 0.5,
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [conversationId, userId]);
  // Removed seenMessages from deps to prevent re-subscription

  // Auto-mark messages as read when viewing conversation - ONLY FOR GUESTS
  // Staff must click input to mark as read
  useEffect(() => {
    if (!conversationId || userId) return; // Skip if staff (userId exists)
    
    // Only run for guests
    if (!guestSession) return;

    const markAsRead = async () => {
      try {
        console.log('📝 [AUTO-READ] Guest auto-marking staff messages as read...');
        const response = await api.post(buildStaffURL(hotelSlug, 'chat', `conversations/${conversationId}/mark-read/`), {
          session_token: guestSession.getToken()
        });
        console.log('✅ [AUTO-READ] Guest marked conversation as read:', response.data);
        
        // Update local UI immediately
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.sender_type === 'staff'
              ? { ...msg, status: 'read', is_read_by_recipient: true, read_by_guest: true }
              : msg
          )
        );
      } catch (error) {
        console.error('❌ [AUTO-READ] Failed to mark conversation as read:', error);
      }
    };

    // Wait 1 second to ensure guest is actually viewing
    const timer = setTimeout(markAsRead, 1000);

    return () => clearTimeout(timer);
  }, [conversationId, userId, guestSession]);

  // Auto-mark new staff messages as read when they arrive - ONLY FOR GUESTS
  useEffect(() => {
    if (!conversationId || messages.length === 0 || userId) return; // Skip if staff
    if (!guestSession) return;
    
    // Count unread staff messages
    let unreadCount = 0;
    const unreadMessageIds = [];
    
    messages.forEach(msg => {
      if (msg.sender_type === 'staff' && !msg.is_read_by_recipient && msg.status !== 'read') {
        unreadCount++;
        unreadMessageIds.push(msg.id);
      }
    });

    if (unreadCount === 0) return;

    const markNewMessagesAsRead = async () => {
      try {
        console.log(`📝 [NEW-MSG-READ] Guest auto-marking ${unreadCount} staff messages as read:`, unreadMessageIds);
        const response = await api.post(buildStaffURL(hotelSlug, 'chat', `conversations/${conversationId}/mark-read/`), {
          session_token: guestSession.getToken()
        });
        console.log('✅ [NEW-MSG-READ] Response:', response.data);
        
        // Update local UI
        setMessages(prevMessages => 
          prevMessages.map(msg => 
            msg.sender_type === 'staff' && unreadMessageIds.includes(msg.id)
              ? { ...msg, status: 'read', is_read_by_recipient: true, read_by_guest: true }
              : msg
          )
        );
      } catch (error) {
        console.error('❌ [NEW-MSG-READ] Failed:', error);
      }
    };

    // Mark as read after a short delay
    const timer = setTimeout(markNewMessagesAsRead, 500);

    return () => clearTimeout(timer);
  }, [messages.length, conversationId, userId, guestSession]);

  // Ensure FCM token is saved for guest on chat open (even if already authenticated)
  useEffect(() => {
    if (!isGuest || !guestSession || !conversationId) return;

    const ensureFCMToken = async () => {
      try {
        // Check if we already have FCM token saved in session
        const hasTokenSaved = localStorage.getItem('guest_fcm_token_saved');
        if (hasTokenSaved === 'true') {
          console.log('✅ FCM token already saved for guest session');
          return;
        }

        console.log('🔔 Ensuring FCM token is saved for guest...');
        
        // Request FCM permission (will return existing token if already granted)
        const { requestFCMPermission } = await import('@/utils/fcm');
        const fcmToken = await requestFCMPermission();
        
        if (fcmToken) {
          // Save FCM token to backend via session endpoint
          await api.post(
            buildStaffURL(hotelSlug, 'chat', `messages/room/${roomNumber}/save-fcm-token/`),
            {
              session_token: guestSession.getToken(),
              fcm_token: fcmToken
            }
          );
          console.log('✅ FCM token saved for guest session');
          localStorage.setItem('guest_fcm_token_saved', 'true');
        } else {
          console.warn('⚠️ Could not obtain FCM token for guest');
        }
      } catch (error) {
        console.error('❌ Failed to ensure FCM token for guest:', error);
      }
    };

    // Run after a short delay to not block initial render
    const timer = setTimeout(ensureFCMToken, 2000);
    return () => clearTimeout(timer);
  }, [isGuest, guestSession, conversationId, hotelSlug, roomNumber]);

  // Infinite scroll
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Check if user is near bottom
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
    setShowScrollButton(!isNearBottom);

    // Trigger fetch when scrollTop < 50 for infinite scroll
    if (!loadingMore && hasMore && container.scrollTop < 50) {
      const oldestId = messages[0]?.id;
      if (!oldestId) return;

      fetchMessages(oldestId);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const errors = [];
    
    // Validate each file
    const validFiles = files.filter(file => {
      // Check file size (50MB max per backend)
      if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        errors.push(`${file.name}: Too large (${sizeMB}MB, max 50MB)`);
        return false;
      }
      
      // Check file type
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        errors.push(`${file.name}: File type not allowed (${file.type})`);
        return false;
      }
      
      return true;
    });
    
    // Show errors if any
    if (errors.length > 0) {
      alert('Some files could not be added:\n\n' + errors.join('\n'));
    }
    
    // Add valid files
    if (validFiles.length > 0) {
      setSelectedFiles([...selectedFiles, ...validFiles]);
      console.log(`✅ Added ${validFiles.length} valid file(s) for upload`);
    }
    
    e.target.value = ''; // Reset input
  };

  const removeFile = (index) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleSendMessage = async () => {
    // Allow sending if there's either a message or files
    if ((!newMessage.trim() && selectedFiles.length === 0) || !conversationId) return;

    const messageToSend = newMessage;
    const filesToSend = [...selectedFiles];
    const replyToMessage = replyingTo;
    const tempId = `temp-${Date.now()}`; // Temporary ID for tracking
    
    setNewMessage("");
    setSelectedFiles([]);
    clearReplyAfterSend(); // Use utility to clear reply
    setUploading(true);

    // Add temporary message to UI with pending status
    const tempMessage = {
      id: tempId,
      message: messageToSend || (filesToSend.length > 0 ? `📎 ${filesToSend.length} file(s)` : ''),
      sender_type: userId ? 'staff' : 'guest',
      staff: userId || null,
      guest_id: isGuest ? (guestSession?.getSessionId() || null) : null,
      guest_name: isGuest ? (guestSession?.getGuestName() || 'You') : null,
      staff_name: userId ? 'You' : null,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      status: 'pending',
      has_attachments: filesToSend.length > 0,
      __optimistic: true // Mark as optimistic for proper identification
    };
    
    console.log('📤 Creating temp message:', {
      tempId,
      sender_type: tempMessage.sender_type,
      userId,
      isGuest,
      staff: tempMessage.staff,
      guest_name: tempMessage.guest_name
    });

    setMessages(prev => [...prev, tempMessage]);
    setMessageStatuses(prev => new Map(prev).set(tempId, 'pending'));
    scrollToBottom();

    try {
      let response;
      
      // If files are present, use upload endpoint with FormData
      if (filesToSend.length > 0) {
        const formData = new FormData();
        
        // Add files
        filesToSend.forEach((file, index) => {
          formData.append('files', file);
          console.log(`📎 File ${index + 1}: ${file.name} (${(file.size / 1024).toFixed(1)}KB, ${file.type})`);
        });
        
        // Add message text if present
        if (messageToSend.trim()) {
          formData.append('message', messageToSend.trim());
        }
        
        // Add reply reference if replying (using utility)
        const replyId = formatReplyData(replyToMessage);
        if (replyId) {
          formData.append('reply_to', replyId);
          console.log('📤 [SEND REPLY WITH FILE] Adding reply_to to FormData:', {
            reply_to: replyId,
            replying_to_message: replyToMessage?.message?.substring(0, 50),
            replying_to_sender: replyToMessage?.sender_type
          });
        }
        
        // Add authentication - SAME AS TEXT MESSAGES
        if (userId) {
          // Staff - add staff_id to FormData (same as text messages)
          formData.append('staff_id', userId);
          console.log('👤 Staff upload with staff_id:', userId);
        } else if (guestSession) {
          // Guest - add session token (same as text messages)
          const sessionToken = guestSession.getToken();
          formData.append('session_token', sessionToken);
          console.log('👤 Guest upload with session token:', sessionToken);
          console.log('👤 Guest session data:', {
            session_id: guestSession.getSessionId(),
            room_number: guestSession.getRoomNumber(),
            has_token: !!sessionToken
          });
        } else {
          console.error('❌ No userId or guestSession - cannot upload file!');
        }

        console.log('📤 Uploading to Cloudinary via backend:', {
          endpoint: `/api${buildStaffURL(hotelSlug, 'chat', `conversations/${conversationId}/upload-attachment/`)}`,
          fileCount: filesToSend.length,
          totalSize: `${(filesToSend.reduce((sum, f) => sum + f.size, 0) / 1024).toFixed(1)}KB`,
          hasMessage: !!messageToSend.trim(),
          isGuest,
          userId,
          conversationId,
          cloudinaryBase: CLOUDINARY_BASE
        });

        // Build headers object - ONLY for staff (guests authenticate via session_token in FormData)
        const headers = {};
        
        if (userId) {
          // Staff authentication - get token and hotel info from localStorage
          const storedUser = localStorage.getItem("user");
          const userData = storedUser ? JSON.parse(storedUser) : null;
          const token = userData?.token || null;
          const hotelId = userData?.hotel_id || null;
          const hotelSlug_header = userData?.hotel_slug || null;

          if (token) {
            headers['Authorization'] = `Token ${token}`;
          }
          if (hotelId) {
            headers['X-Hotel-ID'] = hotelId.toString();
          }
          if (hotelSlug_header) {
            headers['X-Hotel-Slug'] = hotelSlug_header;
          }
          
          console.log('📤 Staff upload headers:', { 
            hasAuth: !!headers['Authorization'],
            hotelId: headers['X-Hotel-ID'],
            hotelSlug: headers['X-Hotel-Slug']
          });
        } else {
          // Guest authentication - NO headers, session_token is in FormData
          console.log('📤 Guest upload - no auth headers (session_token in FormData)');
        }
        // DON'T set Content-Type - browser sets it with boundary

        // Build upload URL using the same logic as api.js
        const getApiBaseUrl = () => {
          if (import.meta.env.VITE_API_URL) {
            // Remove trailing /api if present, we'll add it back
            return import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');
          }
          
          const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
          const isDev = import.meta.env.DEV;
          
          if (isLocal && isDev) {
            return "http://localhost:8000";
          }
          
          return "https://hotel-porter-d25ad83b12cf.herokuapp.com";
        };
        
        const apiBase = getApiBaseUrl();
        const uploadUrl = `${apiBase}/api${buildStaffURL(hotelSlug, 'chat', `conversations/${conversationId}/upload-attachment/`)}`;
        console.log('📤 [UPLOAD] Full upload URL:', uploadUrl);
        console.log('📤 [UPLOAD] URL parts:', {
          apiBase,
          hotelSlug,
          conversationId
        });
        
        response = await fetch(uploadUrl, {
          method: 'POST',
          headers: headers,
          body: formData
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          const errorMessage = errorData.error || errorData.details?.join('\n') || 'Upload failed';
          console.error('❌ Upload failed:', errorMessage);
          throw new Error(errorMessage);
        }
        
        const data = await response.json();
        console.log('✅ Upload successful - files stored in Cloudinary:', {
          messageId: data.message?.id,
          attachmentCount: data.attachments?.length,
          attachments: data.attachments?.map(a => ({
            name: a.file_name,
            url: a.file_url,
            type: a.file_type,
            size: a.file_size_display
          }))
        });
        response = { data }; // Normalize response format
        
      } else {
        // No files - use regular message endpoint
        const payload = {};
        
        if (userId) {
          payload.message = messageToSend;
          payload.staff_id = userId;
        } else if (guestSession) {
          payload.message = messageToSend;
          payload.session_token = guestSession.getToken();
        } else {
          console.error('❌ Cannot send message: No userId or guestSession');
          setMessageStatuses(prev => new Map(prev).set(tempId, 'failed'));
          setMessages(prev => 
            prev.map(msg => msg.id === tempId ? { ...msg, status: 'failed' } : msg)
          );
          setUploading(false);
          return;
        }
        
        // Add reply reference if replying (using utility)
        const replyId = formatReplyData(replyToMessage);
        if (replyId) {
          payload.reply_to = replyId;
          console.log('📤 [SEND REPLY] Adding reply_to to payload:', {
            reply_to: replyId,
            replying_to_message: replyToMessage?.message?.substring(0, 50),
            replying_to_sender: replyToMessage?.sender_type
          });
        }

        console.log('📤 [SEND MESSAGE] Sending payload:', {
          hasMessage: !!payload.message,
          hasReply: !!payload.reply_to,
          staff_id: payload.staff_id,
          hasSessionToken: !!payload.session_token
        });

        response = await api.post(
          buildStaffURL(hotelSlug, 'chat', `conversations/${conversationId}/messages/send/`),
          payload
        );
        
        console.log('✅ [SEND MESSAGE] Response received:', {
          message_id: response.data?.message?.id || response.data?.id,
          has_reply_to: !!(response.data?.message?.reply_to || response.data?.reply_to),
          has_reply_to_message: !!(response.data?.message?.reply_to_message || response.data?.reply_to_message),
          reply_data: response.data?.message?.reply_to_message || response.data?.reply_to_message
        });
      }

      // Extract the actual message object
      const messageData = response.data?.message || response.data;
      
      console.log('📨 [MESSAGE RECEIVED] Backend returned message:', {
        id: messageData?.id,
        has_reply_to: !!messageData?.reply_to,
        reply_to_value: messageData?.reply_to,
        has_reply_to_message: !!messageData?.reply_to_message,
        reply_to_message_data: messageData?.reply_to_message
      });
      
      // 🔍 DEBUG: Check if backend returned wrong sender_type
      if (userId && messageData?.sender_type !== 'staff') {
        console.error('❌ BACKEND ERROR: Staff sent message but backend returned sender_type:', messageData?.sender_type);
        console.error('❌ This is a BACKEND bug. Staff should always have sender_type="staff"');
        // Fix it on frontend as workaround
        messageData.sender_type = 'staff';
        messageData.staff = userId;
      }

      // Update staff handler if changed (for guests)
      if (!userId && messageData?.staff_info) {
        setCurrentStaff(messageData.staff_info);
        guestSession?.saveToLocalStorage({ current_staff_handler: messageData.staff_info });
      }

      // Replace temp message with real message from backend
      if (messageData?.id) {
        console.log(`🔄 Replacing temp message ${tempId} with real message ${messageData.id}`);
        setMessages(prev => {
          // Check if the real message already exists (from Pusher)
          const realMessageExists = prev.some(m => m.id === messageData.id);
          
          if (realMessageExists) {
            console.log(`⚠️ Real message ${messageData.id} already exists, just removing temp`);
            return prev.filter(msg => msg.id !== tempId);
          } else {
            console.log(`✅ Replacing temp ${tempId} with real ${messageData.id}`);
            return prev.map(msg => msg.id === tempId ? { ...messageData, status: 'delivered' } : msg);
          }
        });
        
        setMessageStatuses(prev => {
          const newMap = new Map(prev);
          newMap.delete(tempId);
          newMap.set(messageData.id, 'delivered');
          return newMap;
        });
      }

      scrollToBottom();
      
      // Blur input after sending
      if (messageInputRef.current) {
        messageInputRef.current.blur();
      }
      
    } catch (err) {
      console.error("❌ Failed to send message:", err);
      
      // Show user-friendly error message
      let errorMessage = 'Failed to send message. ';
      if (err.message) {
        errorMessage += err.message;
      } else {
        errorMessage += 'Please check your connection and try again.';
      }
      
      // For file uploads, provide additional context
      if (filesToSend.length > 0) {
        errorMessage += '\n\nTip: Files are uploaded to Cloudinary. Check file size (max 50MB) and type.';
      }
      
      console.error('❌ [FILE UPLOAD ERROR] Full error details:', err);
      console.error('❌ [FILE UPLOAD ERROR] Error response:', err.response?.data);
      
      alert(errorMessage);
      
      // Mark message as failed in UI
      setMessageStatuses(prev => new Map(prev).set(tempId, 'failed'));
      setMessages(prev => 
        prev.map(msg => msg.id === tempId ? { ...msg, status: 'failed' } : msg)
      );
    } finally {
      setUploading(false);
    }
  };

  const handleEmojiClick = (emojiData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    // Don't refocus input - keep keyboard hidden on mobile
  };

  const handleEmojiButtonClick = () => {
    // Blur the message input to prevent keyboard from showing on mobile
    if (messageInputRef.current) {
      messageInputRef.current.blur();
    }
    // Small delay to ensure blur happens before toggling picker
    setTimeout(() => {
      setShowEmojiPicker(!showEmojiPicker);
    }, 50);
  };

  // Handle delete message (using utility)
  const handleDeleteMessage = async () => {
    if (!messageToDelete) return;
    
    await handleMessageDeletion(
      messageToDelete.id,
      setMessages,
      setMessageStatuses,
      (successMsg) => {
        setSuccessMessage(successMsg);
        setShowSuccessModal(true);
      },
      (errorMsg) => {
        alert(errorMsg);
      },
      isGuest ? guestSession : null // Pass guest session for authentication
    );
    
    setShowDeleteConfirm(false);
    setMessageToDelete(null);
  };

  // Handle download message and attachments (using utility)
  const handleDownloadMessageAction = async () => {
    if (!messageToDownload) return;
    
    await handleMessageDownload(
      messageToDownload,
      CLOUDINARY_BASE,
      (successMsg) => {
        setSuccessMessage(successMsg);
        setShowSuccessModal(true);
      },
      (errorMsg) => {
        alert(errorMsg);
      }
    );
    
    setShowDownloadConfirm(false);
    setMessageToDownload(null);
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if clicking the emoji button or the picker itself
      if (
        emojiPickerRef.current && 
        !emojiPickerRef.current.contains(event.target) &&
        emojiButtonRef.current &&
        !emojiButtonRef.current.contains(event.target)
      ) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  return (
    <div className="chat-window">
      {/* Chat Header - Fixed at top */}
      <div className="chat-window-header">
        {onClose && (
          <button
            className="chat-back-btn"
            onClick={onClose}
            title="Back to chats"
          >
            <FaArrowLeft />
            <span className="ms-2 d-none d-sm-inline">Back</span>
          </button>
        )}
        <div className="chat-header-info">
          {/* Hotel logo for guests */}
          {isGuest && hotelLogo && (
            <div className="hotel-logo-header mb-2">
              {logoLoading && <span className="text-white-50">Loading logo...</span>}
              {logoError && <span className="text-white-50">Error loading logo</span>}
              {!logoLoading && !logoError && (
                <img
                  src={hotelLogo}
                  alt="Hotel Logo"
                  style={{ maxHeight: 50, objectFit: "contain" }}
                />
              )}
            </div>
          )}
          
          {/* For STAFF view: Show Guest Name (Room Number) */}
          {!isGuest && (
            <h5 className="mb-0" style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {conversationDetails?.guest_name && (
                <>
                  {conversationDetails.guest_name}
                  {roomNumber && <span style={{ fontWeight: 'normal', fontSize: '0.75em', opacity: 0.9 }}> (Room {roomNumber})</span>}
                </>
              )}
              {!conversationDetails?.guest_name && roomNumber && `Room ${roomNumber}`}
              {!conversationDetails?.guest_name && !roomNumber && 'Chat'}
            </h5>
          )}

          {/* For GUEST view: Show Staff Name */}
          {isGuest && (
            <h5 className="mb-0">
              {currentStaff ? `Chat with ${currentStaff.name}` : 'Hotel Reception'}
            </h5>
          )}
          
          {/* Show current staff handler details for guests */}
          {isGuest && currentStaff && (
            <div className="current-staff-handler mt-2 d-flex align-items-center">
              {currentStaff.profile_image && (
                <img 
                  src={currentStaff.profile_image} 
                  alt={currentStaff.name}
                  className="staff-avatar me-2"
                  style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }}
                />
              )}
              <div className="staff-details">
                <small className="text-white-50">
                  {currentStaff.role}
                </small>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Desktop close button */}
      {onClose && (
        <button
          className="chat-close-btn"
          onClick={onClose}
          title="Close chat"
        >
          <FaTimes />
        </button>
      )}

      {/* Messages Container - Scrollable */}
      <div
        className="chat-messages"
        ref={messagesContainerRef}
        onScroll={handleScroll}
        style={{ paddingTop: '1rem' }}
      >
        {loading && (
          <div className="loading text-center">
            <div className="spinner"></div>
          </div>
        )}

        {loadingMore && (
          <div className="loading-more text-center">
            <div className="spinner small"></div>
          </div>
        )}

        {messages.map((msg) => {
          // Handle system messages differently
          if (msg.is_system_message || msg.sender_type === 'system') {
            return (
              <div
                key={msg.id}
                className="text-center my-3"
              >
                <div 
                  className="d-inline-block px-3 py-2 rounded-pill text-muted"
                  style={{
                    backgroundColor: 'rgba(108, 117, 125, 0.1)',
                    fontSize: '0.85rem',
                    fontStyle: 'italic',
                    border: '1px solid rgba(108, 117, 125, 0.2)'
                  }}
                >
                  {msg.message}
                </div>
              </div>
            );
          }
          
          // For STAFF view: all staff messages on right, guest messages on left
          // For GUEST view: all guest messages on right, staff messages on left
          const isMine = userId 
            ? (msg.sender_type === "staff" && msg.staff === userId) // Staff view: only THIS staff's messages are "mine"
            : (msg.sender_type === "guest" && (
                msg.guest_id === guestSession?.getSessionId() || 
                msg.id?.toString().startsWith('temp-') || 
                msg.id?.toString().startsWith('local:') ||
                msg.__optimistic === true
              )); // Guest view: only THIS guest's messages are "mine"
          
          // Handle deleted messages - show in same position as original with smart text from backend
          if (msg.is_deleted) {
            // Backend provides smart deletion text:
            // "[Message deleted]" for text-only
            // "[File deleted]" for file-only
            // "[Message and file(s) deleted]" for text + files
            const deletionText = msg.message || '🗑️ Message deleted';
            
            return (
              <div
                key={msg.id}
                className={`d-flex mb-3 ${isMine ? 'justify-content-end' : 'justify-content-start'}`}
              >
                <div 
                  className="px-3 py-2 rounded text-muted"
                  style={{
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    fontSize: '0.85rem',
                    fontStyle: 'italic',
                    border: '1px solid rgba(220, 53, 69, 0.2)',
                    color: '#dc3545',
                    maxWidth: '280px'
                  }}
                >
                  {deletionText}
                </div>
              </div>
            );
          }
          
          // Determine sender name
          let senderName;
          if (msg.sender_type === "guest") {
            senderName = msg.guest_name || "Guest";
            // Add "(You)" for guest's own messages when viewing as guest
            if (isGuest && isMine) {
              senderName += " (You)";
            }
          } else {
            // For staff messages - extract clean name and role using regex
            let baseName = msg.staff_name || (isGuest && currentStaff ? currentStaff.name : "Reception");
            let role = msg.staff_info?.role || (isGuest && currentStaff ? currentStaff.role : "");
            
            // Handle case where staff_name contains full string like "Nikola Simic - Front Office - Porter (Porter)"
            // Extract just the name (before first dash) and role (in last parentheses)
            if (baseName.includes(' - ')) {
              const nameMatch = baseName.match(/^([^-]+?)(?:\s*-|$)/);
              if (nameMatch) {
                baseName = nameMatch[1].trim();
              }
            }
            
            // Extract position from role format like "Front Office - Porter (Porter)" -> "Porter"
            // Or from staff_name if role is in the name string
            if (role) {
              const roleMatch = role.match(/\(([^)]+)\)$/);
              role = roleMatch ? roleMatch[1] : role.split(' - ').pop().replace(/\([^)]*\)/, '').trim();
            } else if (baseName.includes('(')) {
              // Extract role from name if it's embedded there
              const roleMatch = baseName.match(/\(([^)]+)\)$/);
              if (roleMatch) {
                role = roleMatch[1];
                baseName = baseName.replace(/\s*-.*$/, '').trim();
              }
            }
            
            senderName = role ? `${baseName} (${role})` : baseName;
            
            // For staff view: add " (You)" only if this message is from the currently logged-in staff
            if (!isGuest && msg.staff === userId) {
              senderName += " (You)";
            }
          }

          const messageTime = msg.timestamp
            ? new Date(msg.timestamp).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "";

          // Get message status - prefer backend status, fallback to local status map
          let status = msg.status || messageStatuses.get(msg.id) || 'delivered';
          
          // Check if message has been read by recipient (from backend)
          if (msg.is_read_by_recipient) {
            status = 'read';
          }

          return (
            <div
              key={msg.id}
              className={`mb-4 ${isMine ? "text-end" : "text-start"}`}
              data-message-id={msg.id}
              data-sender-id={msg.staff || msg.guest_id}
              data-sender-type={msg.sender_type}
              ref={(el) => {
                if (el && observerRef.current && msg.id) {
                  observerRef.current.observe(el);
                }
              }}
            >
              <div className="small text-muted mb-1">
                <strong>{senderName}</strong>
              </div>
              {/* Message container with hover actions */}
              <div
                className="message-bubble-container"
                style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}
                onMouseEnter={(e) => {
                  const actions = e.currentTarget.querySelector('.message-actions');
                  if (actions) actions.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  const actions = e.currentTarget.querySelector('.message-actions');
                  if (actions) actions.style.opacity = '0';
                }}
              >
                {/* Hover actions - Delete and Download - only show if message has attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div 
                    className="message-actions"
                    style={{
                      position: 'absolute',
                      top: '0',
                      left: '0',
                      right: '0',
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '6px',
                      opacity: '0',
                      transition: 'opacity 0.2s',
                      zIndex: 10,
                      background: 'rgba(0, 0, 0, 0.85)',
                      borderRadius: '8px 8px 0 0',
                      padding: '8px 12px',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                    }}
                  >
                    {/* Delete button with text */}
                    <button
                      className="btn btn-sm d-flex align-items-center gap-1"
                      style={{ 
                        fontSize: '0.85rem',
                        background: 'none',
                        border: 'none',
                        color: '#ff4444',
                        cursor: 'pointer',
                        padding: '2px 6px',
                        fontWeight: '500'
                      }}
                      onClick={() => {
                        setMessageToDelete(msg);
                        setShowDeleteConfirm(true);
                      }}
                      title="Delete message"
                    >
                      <FaTrash style={{ fontSize: '0.75rem' }} />
                      <span>Delete</span>
                    </button>
                    {/* Download button with arrow */}
                    <button
                      className="btn btn-sm d-flex align-items-center gap-1"
                      style={{ 
                        fontSize: '0.85rem',
                        background: 'none',
                        border: 'none',
                        color: '#4CAF50',
                        cursor: 'pointer',
                        padding: '2px 6px',
                        fontWeight: '500'
                      }}
                      onClick={() => {
                        setMessageToDownload(msg);
                        setShowDownloadConfirm(true);
                      }}
                      title="Download attachments"
                    >
                      <FaDownload style={{ fontSize: '0.75rem' }} />
                      <span>↓</span>
                    </button>
                  </div>
                )}
                <div
                  className={`p-3 rounded position-relative ${
                    isMine ? "my-message" : "receiver-message"
                  } ${status === 'failed' ? 'opacity-75' : ''}`}
                  style={{
                    ...(status === 'failed' ? { border: '1px solid #dc3545' } : {}),
                    maxWidth: '100%',
                    wordWrap: 'break-word',
                    paddingTop: msg.attachments && msg.attachments.length > 0 ? '3rem' : '1rem'
                  }}
                >
                  {/* Show replied-to message - using utility component */}
                  <ReplyPreview 
                    replyToMessage={msg.reply_to_message}
                    messages={messages}
                    isMine={isMine}
                    onClickReply={scrollToOriginalMessage}
                  />
                  
                  {/* Only show message text if it exists and is not a placeholder */}
                  {msg.message && 
                   msg.message.trim() !== '' && 
                   msg.message !== '[FILE SHARED]' && 
                   msg.message !== '[File shared]' && 
                   !msg.message.match(/^\[.*file.*shared.*\]$/i) && (
                    <div style={{ marginBottom: msg.attachments && msg.attachments.length > 0 ? '0.5rem' : '0' }}>
                      {msg.message}
                    </div>
                  )}
                
                {/* Reply button - positioned on inner side of message */}
                <div 
                  className={`mt-2 ${isMine ? 'text-start' : 'text-end'}`}
                  style={{ opacity: 0.7 }}
                >
                  <button
                    className="btn btn-link p-0"
                    style={{ 
                      fontSize: '0.7rem',
                      textDecoration: 'none',
                      color: 'inherit',
                      fontWeight: '500',
                      padding: '0',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer'
                    }}
                    onClick={() => startReply(msg)}
                    title="Reply to this message"
                  >
                    Reply
                  </button>
                </div>
                
                {/* Render attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="message-attachments" style={{ marginTop: msg.message ? '0.5rem' : '0' }}>
                    {msg.attachments.map((att, idx) => {
                      // Ensure we have full Cloudinary URL (using utility)
                      const fullFileUrl = getCloudinaryUrl(att.file_url, CLOUDINARY_BASE);
                      const fullThumbnailUrl = att.thumbnail_url ? getCloudinaryUrl(att.thumbnail_url, CLOUDINARY_BASE) : null;
                      
                      return (
                        <div 
                          key={att.id} 
                          className="attachment" 
                          style={{ marginBottom: idx < msg.attachments.length - 1 ? '0.75rem' : '0' }}
                        >
                          {att.file_type === 'image' ? (
                            // Show images inline - improved layout
                            <div className="image-attachment">
                              <div 
                                className="image-wrapper" 
                                style={{ 
                                  position: 'relative',
                                  display: 'block',
                                  width: '100%',
                                  maxWidth: '280px'
                                }}
                              >
                                <img 
                                  src={fullThumbnailUrl || fullFileUrl} 
                                  alt={att.file_name}
                                  style={{ 
                                    width: '100%',
                                    height: 'auto',
                                    maxHeight: '280px',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    objectFit: 'cover',
                                    display: 'block'
                                  }}
                                  onClick={() => window.open(fullFileUrl, '_blank')}
                                  title="Click to open full size"
                                />
                              </div>
                              {/* File info below image - compact */}
                              <div 
                                className="image-info mt-1" 
                                style={{ 
                                  fontSize: '0.7rem', 
                                  opacity: 0.7,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  gap: '0.5rem',
                                  maxWidth: '280px'
                                }}
                              >
                                <span className="text-truncate flex-grow-1" title={att.file_name}>
                                  {att.file_name}
                                </span>
                                <span style={{ fontSize: '0.65rem', whiteSpace: 'nowrap' }}>
                                  {att.file_size_display || `${(att.file_size / 1024).toFixed(1)} KB`}
                                </span>
                              </div>
                            </div>
                          ) : (
                            // Show document - improved compact layout
                            <div 
                              className="document d-flex align-items-center gap-2 p-2 rounded"
                              style={{ 
                                backgroundColor: isMine ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.08)',
                                maxWidth: '280px',
                                width: '100%'
                              }}
                            >
                              <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>
                                {att.file_type === 'pdf' ? '📄' : 
                                 att.file_type === 'document' ? '📝' : '📎'}
                              </span>
                              <div className="flex-grow-1" style={{ minWidth: 0, overflow: 'hidden' }}>
                                <div 
                                  className="text-truncate" 
                                  style={{ fontSize: '0.85rem', fontWeight: '500' }}
                                  title={att.file_name}
                                >
                                  {att.file_name}
                                </div>
                                <small style={{ fontSize: '0.7rem', opacity: 0.7 }}>
                                  {att.file_size_display || `${(att.file_size / 1024).toFixed(1)} KB`}
                                </small>
                              </div>
                              <a 
                                href={fullFileUrl} 
                                download={att.file_name}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-sm"
                                style={{ 
                                  fontSize: '0.75rem',
                                  padding: '0.25rem 0.5rem',
                                  whiteSpace: 'nowrap',
                                  flexShrink: 0,
                                  backgroundColor: isMine ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                                  border: 'none',
                                  color: 'inherit'
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                              >
                                ⬇️
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
                </div>
              </div>
              {/* Footer: Delete, Share, Seen on first row, Time below */}
              <div 
                className={`small text-muted ${isMine ? 'text-end' : 'text-start'}`}
                style={{
                  width: '100%',
                  marginTop: '4px',
                  fontSize: '0.7rem'
                }}
              >
                {/* First row: Delete, Share, Seen */}
                <div className="d-flex align-items-center gap-2" style={{ justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                  {/* Delete button - only for own messages */}
                  {isMine && (
                    <button
                      className="btn btn-link p-0 text-muted"
                      style={{ 
                        fontSize: '0.7rem',
                        textDecoration: 'none',
                        padding: '0',
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer'
                      }}
                      onClick={() => {
                        setMessageToDelete(msg);
                        setShowDeleteConfirm(true);
                      }}
                      title="Delete this message"
                    >
                      Delete
                    </button>
                  )}
                  {/* Share button */}
                  <button
                    className="btn btn-link p-0 text-muted"
                    style={{ 
                      fontSize: '0.7rem',
                      textDecoration: 'none',
                      padding: '0',
                      border: 'none',
                      background: 'none',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      handleMessageShare(
                        msg,
                        (successMsg) => {
                          setSuccessMessage(successMsg);
                          setShowSuccessModal(true);
                        },
                        (errorMsg) => {
                          alert(errorMsg);
                        }
                      );
                    }}
                    title="Share this message"
                  >
                    Share
                  </button>
                  {/* Status for own messages */}
                  {isMine && (
                    <span style={{ fontStyle: 'italic' }}>
                      {status === 'pending' && <span>Sending...</span>}
                      {status === 'delivered' && <span>Unseen</span>}
                      {status === 'read' && <span className="text-info">Seen</span>}
                      {status === 'failed' && (
                        <span className="text-danger d-flex align-items-center gap-1">
                          Failed
                          <button
                            className="btn btn-sm btn-link text-danger p-0 text-decoration-underline"
                            style={{ fontSize: '0.65rem' }}
                            onClick={() => {
                              // Restore message to input for retry
                              setNewMessage(msg.message);
                              // Remove failed message from UI
                              setMessages(prev => prev.filter(m => m.id !== msg.id));
                              setMessageStatuses(prev => {
                                const newMap = new Map(prev);
                                newMap.delete(msg.id);
                                return newMap;
                              });
                            }}
                          >
                            Retry
                          </button>
                        </span>
                      )}
                    </span>
                  )}
                </div>
                {/* Second row: Time below */}
                {messageTime && <div style={{ opacity: 0.7, marginTop: '2px' }}>{messageTime}</div>}
              </div>
            </div>
          );
        })}

        <div ref={messagesEndRef} style={{ minHeight: '10px' }} />
      </div>

      {/* Scroll to Bottom Button */}
      {showScrollButton && (
        <button
          className="scroll-to-bottom-btn"
          onClick={scrollToBottom}
          title="Scroll to latest messages"
        >
          <FaAngleDoubleDown />
        </button>
      )}

      {/* Chat Footer - Fixed at bottom */}
      <div className="chat-input-vertical p-2 border-start" style={{ position: 'relative' }}>
        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div 
            ref={emojiPickerRef}
            className="emoji-picker-container"
          >
            <EmojiPicker onEmojiClick={handleEmojiClick} />
          </div>
        )}

        {/* Reply Preview - using utility component */}
        <ReplyInputPreview replyingTo={replyingTo} onCancel={cancelReply} />

        {/* File Previews */}
        {selectedFiles.length > 0 && (
          <div 
            className="file-previews d-flex gap-2 p-2 mb-2 overflow-auto" 
            style={{ 
              backgroundColor: '#f5f5f5', 
              borderRadius: '8px',
              maxHeight: '120px'
            }}
          >
            {selectedFiles.map((file, index) => (
              <div 
                key={`${file.name}-${file.size}-${file.lastModified}-${index}`} 
                className="file-preview position-relative d-flex flex-column align-items-center p-2 bg-white rounded"
                style={{ minWidth: '80px' }}
              >
                {file.type.startsWith('image/') ? (
                  <img 
                    src={URL.createObjectURL(file)} 
                    alt={file.name}
                    style={{ 
                      width: '60px', 
                      height: '60px', 
                      objectFit: 'cover',
                      borderRadius: '4px'
                    }}
                  />
                ) : (
                  <div 
                    className="file-icon d-flex align-items-center justify-content-center"
                    style={{ 
                      fontSize: '30px',
                      width: '60px',
                      height: '60px'
                    }}
                  >
                    📄
                  </div>
                )}
                <span 
                  className="file-name text-truncate mt-1" 
                  style={{ 
                    fontSize: '10px',
                    maxWidth: '70px'
                  }}
                  title={file.name}
                >
                  {file.name}
                </span>
                <button
                  className="btn btn-sm position-absolute"
                  onClick={() => removeFile(index)}
                  style={{
                    top: '2px',
                    right: '2px',
                    background: 'rgba(255, 0, 0, 0.8)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '20px',
                    height: '20px',
                    padding: '0',
                    fontSize: '10px',
                    color: 'white',
                    lineHeight: '1'
                  }}
                  title="Remove file"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Row */}
        <div className="d-flex align-items-center">
          {/* Hidden File Input */}
          <input
            type="file"
            multiple
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv"
            onChange={handleFileSelect}
            ref={fileInputRef}
            style={{ display: 'none' }}
          />

          {/* Attachment Button */}
          <button
            className="btn d-flex align-items-center justify-content-center"
            onClick={() => fileInputRef.current?.click()}
            disabled={!conversationId || uploading}
            title="Attach files"
            style={{ marginRight: '0.5rem' }}
          >
            <FaPaperclip />
          </button>

          {/* Emoji Button */}
          <button
            ref={emojiButtonRef}
            className="btn d-flex align-items-center justify-content-center"
            onClick={handleEmojiButtonClick}
            disabled={!conversationId || uploading}
            title="Add emoji"
            style={{ marginRight: '0.5rem' }}
          >
            <FaSmile />
          </button>

          <input
            ref={messageInputRef}
            type="text"
            className="message-form-control me-2"
            placeholder={replyingTo ? "Type your reply..." : "Type a message..."}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          onClick={async () => {
            if (!conversationId) return;
            
            console.log('📝 [INPUT FOCUS] User focused on message input');
            
            try {
              // For staff: ALWAYS call backend regardless of local state
              if (userId) {
                console.log('📝 [INPUT FOCUS] Staff marking guest messages as read');
                
                // FIRST: Call backend immediately (don't wait for state updates)
                console.log('🔥 [INPUT FOCUS] Calling backend to mark ALL guest messages as read...');
                const response = await api.post(buildStaffURL(hotelSlug, 'chat', `conversations/${conversationId}/mark-read/`));
                console.log('✅ [INPUT FOCUS] Backend response:', response.data);
                console.log('✅ [INPUT FOCUS] Backend should have fired Pusher event to guest');
                
                // THEN: Update local UI (won't cause re-initialization issues)
                setMessages(prevMessages => 
                  prevMessages.map(msg => 
                    msg.sender_type === 'guest'
                      ? { ...msg, status: 'read', is_read_by_recipient: true, read_by_staff: true }
                      : msg
                  )
                );
                
                // Update message statuses map (simple, no nested setMessages)
                setMessageStatuses(prev => {
                  const newMap = new Map(prev);
                  // Use messages from closure - it's okay here since we don't rely on it for backend call
                  messages.forEach(msg => {
                    if (msg.sender_type === 'guest') {
                      newMap.set(msg.id, 'read');
                    }
                  });
                  return newMap;
                });
                
                console.log('✅ [INPUT FOCUS] Local UI updated');
                
                // Update conversation badge in sidebar (remove unread count)
                markConversationRead(conversationId);
                console.log('✅ [INPUT FOCUS] Conversation marked as read in sidebar');
              } 
              // For guests: use session token and mark staff messages as read
              else if (guestSession) {
                console.log('📝 [INPUT FOCUS] Guest marking staff messages as read');
                
                // Collect staff message IDs from current state
                const staffMessageIds = [];
                
                // First, update local UI to show staff messages as read
                setMessages(prevMessages => {
                  const updated = prevMessages.map(msg => {
                    if (msg.sender_type === 'staff' && !msg.is_read_by_recipient && msg.status !== 'read') {
                      staffMessageIds.push(msg.id);
                      console.log(`📝 [INPUT FOCUS] Marking staff message ${msg.id} as read`);
                      return { ...msg, status: 'read', is_read_by_recipient: true, read_by_guest: true };
                    }
                    return msg;
                  });
                  return updated;
                });
                
                // Update message statuses map using the collected IDs
                if (staffMessageIds.length > 0) {
                  console.log(`📝 [INPUT FOCUS] Updating status map for ${staffMessageIds.length} staff messages`);
                  setMessageStatuses(prev => {
                    const newMap = new Map(prev);
                    staffMessageIds.forEach(id => {
                      newMap.set(id, 'read');
                    });
                    return newMap;
                  });
                }
                
                // Then call backend to mark as read (will trigger Pusher event for staff)
                const response = await api.post(buildStaffURL(hotelSlug, 'chat', `conversations/${conversationId}/mark-read/`), {
                  session_token: guestSession.getToken()
                });
                console.log('✅ [INPUT FOCUS] Guest marked conversation as read:', response.data);
              }
            } catch (error) {
              console.error('❌ [INPUT FOCUS] Failed to mark conversation as read:', error);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !uploading) handleSendMessage();
          }}
          disabled={!conversationId || uploading}
          style={{
            backgroundColor: (!conversationId || uploading) ? '#f8f9fa' : 'white',
            borderColor: (!conversationId || uploading) ? '#dee2e6' : '#ced4da'
          }}
          title={!conversationId ? 'No conversation ID available - check debug info below' : uploading ? 'Uploading...' : 'Type your message...'}
        />
        
        {/* Debug info for conversation issues */}
        {!conversationId && (
          <div className="small text-warning mt-2 p-2 border rounded">
            🔧 <strong>Debug:</strong> Input disabled - No conversationId available
            <details className="mt-1">
              <summary>Debug Details (Click to expand)</summary>
              <pre className="small text-monospace mt-2" style={{fontSize: '11px'}}>
                {JSON.stringify({
                  propConversationId,
                  paramConversationIdFromURL,
                  hotelSlug,
                  roomNumber,
                  isGuest,
                  hasActiveGuestConversation: !!activeGuestConversation,
                  activeGuestConversationId: activeGuestConversation?.conversation_id,
                  conversationDetails: conversationDetails ? 'Present' : 'Missing'
                }, null, 2)}
              </pre>
            </details>
          </div>
        )}
        
        <button
          className="btn d-flex align-items-center justify-content-center"
          onClick={handleSendMessage}
          disabled={!conversationId || uploading || (!newMessage.trim() && selectedFiles.length === 0)}
          title={uploading ? "Uploading..." : "Send message"}
        >
            {uploading ? (
              <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
            ) : (
              <FaPaperPlane />
            )}
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <ConfirmationModal
          title="Delete Message"
          message="Are you sure you want to delete this message? This action cannot be undone."
          onConfirm={handleDeleteMessage}
          onCancel={() => {
            setShowDeleteConfirm(false);
            setMessageToDelete(null);
          }}
        />
      )}

      {/* Download Confirmation Modal */}
      {showDownloadConfirm && (
        <ConfirmationModal
          title="Download Attachments"
          message={`Download ${messageToDownload?.attachments?.length || 0} file(s) from this message?`}
          onConfirm={handleDownloadMessageAction}
          onCancel={() => {
            setShowDownloadConfirm(false);
            setMessageToDownload(null);
          }}
        />
      )}

      {/* Success Modal */}
      <SuccessModal
        show={showSuccessModal}
        message={successMessage}
        onClose={() => {
          setShowSuccessModal(false);
          setSuccessMessage("");
        }}
      />
    </div>
  );
};

export default ChatWindow;

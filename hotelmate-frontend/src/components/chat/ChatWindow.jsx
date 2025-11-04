import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import api from "@/services/api";
import { FaPaperPlane, FaTimes, FaArrowLeft, FaAngleDoubleDown, FaCheck, FaCheckDouble, FaSmile, FaPaperclip } from "react-icons/fa";
import { useChat } from "@/context/ChatContext";
import useHotelLogo from "@/hooks/useHotelLogo";
import EmojiPicker from "emoji-picker-react";
import { GuestChatSession } from "@/utils/guestChatSession";
import { useGuestPusher } from "@/hooks/useGuestPusher";
import { messaging } from "@/firebase";
import { onMessage } from "firebase/messaging";

const MESSAGE_LIMIT = 10;

// Cloudinary configuration from environment
const CLOUDINARY_BASE = import.meta.env.VITE_CLOUDINARY_BASE || "https://res.cloudinary.com/dg0ssec7u/";
const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dg0ssec7u";

// File upload constraints (matching backend)
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain', 'text/csv'
];

// Helper: Build full Cloudinary URL if needed
const getCloudinaryUrl = (url) => {
  if (!url) return '';
  
  // If already a Cloudinary URL, return as-is
  if (url.includes('res.cloudinary.com')) {
    return url;
  }
  
  // If it's a backend URL (not Cloudinary), we need to fix it
  // Backend should return Cloudinary URLs, but if it returns local paths...
  if (url.startsWith('http://') || url.startsWith('https://')) {
    console.warn('⚠️ Backend returned non-Cloudinary URL:', url);
    console.warn('⚠️ Backend needs CLOUDINARY_URL configured in .env');
    // Return as-is and let it fail so user knows backend is misconfigured
    return url;
  }
  
  // If it's a relative path, prefix with Cloudinary base
  // Remove leading slash if present
  const cleanPath = url.startsWith('/') ? url.slice(1) : url;
  return `${CLOUDINARY_BASE}${cleanPath}`;
};

const ChatWindow = ({
  userId: propUserId,
  conversationId: propConversationId,
  hotelSlug: propHotelSlug,
  roomNumber: propRoomNumber,
  conversationData: propConversationData,
  onNewMessage,
  onClose,
}) => {
  const {
    hotelSlug: paramHotelSlug,
    conversationId: paramConversationIdFromURL,
  } = useParams();
  const location = useLocation();
  const hotelSlug = propHotelSlug || paramHotelSlug;
  const conversationId = propConversationId || paramConversationIdFromURL;
  
  const storedUser = localStorage.getItem("user");
  const userId =
    propUserId || (storedUser ? JSON.parse(storedUser).id : undefined);
  
  // Guest is someone WITHOUT a userId (not authenticated as staff)
  const isGuest = !userId;
  
  // Get room number from multiple sources
  let roomNumber = propRoomNumber || location.state?.room_number;
  
  // If no room number but this is a guest, try to get it from stored session
  if (!roomNumber && isGuest) {
    try {
      const storedSession = localStorage.getItem('hotelmate_guest_chat_session');
      if (storedSession) {
        const session = JSON.parse(storedSession);
        roomNumber = session.room_number;
        console.log('🔍 Retrieved room number from stored session:', roomNumber);
      }
    } catch (err) {
      console.error('Failed to parse stored session:', err);
    }
  }
  
  console.log('🔍 [INIT] ChatWindow initialized:', {
    isGuest,
    hasUserId: !!userId,
    hotelSlug,
    roomNumber,
    conversationId,
    locationStateIsGuest: location.state?.isGuest
  });
  
  // Guest session management
  const [guestSession, setGuestSession] = useState(null);
  const [currentStaff, setCurrentStaff] = useState(null);
  
  // Guest Pusher channels - compute them directly from props
  // According to backend docs: guests need TWO channels
  // 1. Room channel: for new-staff-message, new-message, staff-assigned
  // 2. Conversation channel: for messages-read-by-staff (read receipts)
  const guestRoomChannel = isGuest && hotelSlug && roomNumber 
    ? `${hotelSlug}-room-${roomNumber}-chat` 
    : null;
  
  const guestConversationChannel = isGuest && hotelSlug && conversationId
    ? `${hotelSlug}-conversation-${conversationId}-chat`
    : null;
  
  // Debug log for guest Pusher channels
  useEffect(() => {
    if (isGuest) {
      console.log('🔍 Guest Pusher Channels Debug:', {
        isGuest,
        hotelSlug,
        roomNumber,
        conversationId,
        guestRoomChannel,
        guestConversationChannel,
        roomChannelReady: !!guestRoomChannel,
        conversationChannelReady: !!guestConversationChannel
      });
    }
  }, [isGuest, hotelSlug, roomNumber, conversationId, guestRoomChannel, guestConversationChannel]);
  
  // Use conversation data from props (already fetched in ChatHomePage)
  const [conversationDetails, setConversationDetails] = useState(propConversationData || null);
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
    console.log('💬 [MESSAGES STATE] Current messages:', messages.length, messages.map(m => ({id: m.id, msg: m.message?.substring(0, 20)})));
  }, [messages]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [seenMessages, setSeenMessages] = useState(new Set());
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [messageStatuses, setMessageStatuses] = useState(new Map()); // Track message statuses: pending, delivered, seen
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const observerRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const messageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const { markConversationRead, pusherInstance, setCurrentConversationId } = useChat();

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
          result.push({
            id: `system-join-${message.id}`,
            message: `${message.staff_info.name} (${message.staff_info.role}) joined the chat`,
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

      const res = await api.get(
        `/chat/${hotelSlug}/conversations/${conversationId}/messages/`,
        { params: { limit: MESSAGE_LIMIT, before_id: beforeId } }
      );

      const newMessages = res.data;
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
        setMessages(messagesWithMarkers);
        setLoading(false);
        scrollToBottom();
        
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
          `/chat/${hotelSlug}/conversations/${conversationId}/assign-staff/`
        );
        
        if (response.data?.assigned_staff) {
          console.log('✅ [STAFF ASSIGN] Staff assigned:', response.data.assigned_staff.name);
          if (response.data?.messages_marked_read !== undefined) {
            console.log('✅ [STAFF ASSIGN] Marked', response.data.messages_marked_read, 'guest messages as read');
          }
        }
        
        // ADDITIONAL: Explicitly mark conversation as read to trigger Pusher event
        console.log('📖 [STAFF ASSIGN] Explicitly marking conversation as read...');
        await api.post(`/chat/conversations/${conversationId}/mark-read/`);
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

    // Assign staff first (if staff), then fetch messages
    assignStaffToConversation().then(() => {
      fetchMessages();
    });

    return () => {
      if (userId) {
        setCurrentConversationId(null);
      }
    };
  }, [conversationId, setCurrentConversationId, isGuest, hotelSlug, roomNumber, userId]);

  // Pusher real-time updates - reuse global instance for staff, separate for guests
  useEffect(() => {
    if (!conversationId || !hotelSlug) return;
    
    // IMPORTANT: Skip staff Pusher if this is a guest (guests use useGuestPusher hook)
    if (isGuest) {
      console.log('⏭️ Skipping staff Pusher - using guest Pusher hook instead');
      return;
    }

    // For authenticated staff, use the global Pusher instance from ChatContext
    if (userId && pusherInstance) {
      const channelName = `${hotelSlug}-conversation-${conversationId}-chat`;
      
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
        console.log(`📨 [PUSHER] New message received:`, { id: message.id, sender: message.sender_type, text: message.message?.substring(0, 30) });
        
        setMessages((prev) => {
          // Check if this message already exists by ID
          const exists = prev.some((m) => m.id === message.id);
          if (exists) {
            console.log(`⚠️ [PUSHER] Message ${message.id} already exists, skipping`);
            return prev;
          }
          
          // Check if there's a temp message with the same content (race condition)
          const tempMsg = prev.find(m => 
            m.id?.toString().startsWith('temp-') && 
            m.message === message.message &&
            m.sender_type === message.sender_type
          );
          
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
          setMessages(prevMessages => {
            const updated = prevMessages.map(msg => 
              message_ids.includes(msg.id)
                ? { ...msg, status: 'read', is_read_by_recipient: true, read_by_guest: true }
                : msg
            );
            console.log('👁️ [STAFF SEES] Updated messages:', updated.filter(m => message_ids.includes(m.id)).map(m => ({ id: m.id, status: m.status })));
            return updated;
          });
          
          console.log('✅ [STAFF SEES] Staff messages marked as read by guest');
        } else {
          console.warn('⚠️ [STAFF SEES] Invalid message_ids:', message_ids);
        }
      });

      return () => {
        // Only unbind our handlers, don't unsubscribe the channel
        if (channel) {
          channel.unbind("new-message");
          channel.unbind("message-delivered");
          channel.unbind("messages-read-by-staff");
          channel.unbind("messages-read-by-guest");
          channel.unbind("staff-assigned");
        }
      };
    }
  }, [hotelSlug, conversationId, pusherInstance, userId, isGuest]);

  // Guest Pusher setup - use useCallback to create stable event handlers
  const handleNewStaffMessage = useCallback((data) => {
    console.log('📨 New staff message received by guest:', data);
    console.log('📨 Message details:', {
      id: data.id,
      message: data.message,
      sender_type: data.sender_type,
      sender_id: data.sender_id
    });
    
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
    
    scrollToBottom();
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
    
    scrollToBottom();
  }, [userId, conversationId, messageInputRef]); // Add dependencies

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
    console.log('👁️ [SEEN STATUS] Current messages in state:', messages.map(m => ({id: m.id, status: m.status})));
    
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
        console.log('👁️ [SEEN STATUS] Messages after update:', updated.filter(m => message_ids.includes(m.id)).map(m => ({id: m.id, status: m.status})));
        return updated;
      });
      
      console.log('✅ [SEEN STATUS] Updated guest messages as read by staff');
    } else {
      console.warn('⚠️ [SEEN STATUS] No message_ids in event data or not an array:', message_ids);
    }
  }, [messages]);

  // Use guest Pusher hook with MULTIPLE channels
  // According to backend docs: guests subscribe to:
  // 1. Room channel: for new-staff-message, new-message, staff-assigned
  // 2. Conversation channel: for messages-read-by-staff (read receipts)
  const guestPusherChannels = isGuest && guestRoomChannel && guestConversationChannel
    ? [
        {
          name: guestRoomChannel,
          events: {
            'new-staff-message': handleNewStaffMessage,
            'new-message': handleNewMessage,
            'staff-assigned': handleStaffAssigned,
          }
        },
        {
          name: guestConversationChannel,
          events: {
            'messages-read-by-staff': handleMessagesReadByStaff,
          }
        }
      ]
    : [];

  console.log('🔧 [CHATWINDOW] Setting up Pusher hook with channels:', {
    isGuest,
    channelCount: guestPusherChannels.length,
    channels: guestPusherChannels.map(ch => ch.name)
  });

  useGuestPusher(guestPusherChannels);

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
        const response = await api.post(`/chat/conversations/${conversationId}/mark-read/`, {
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
        const response = await api.post(`/chat/conversations/${conversationId}/mark-read/`, {
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
            `/chat/${hotelSlug}/messages/room/${roomNumber}/save-fcm-token/`,
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
      // Check file size (10MB max)
      if (file.size > MAX_FILE_SIZE) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        errors.push(`${file.name}: Too large (${sizeMB}MB, max 10MB)`);
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
    const tempId = `temp-${Date.now()}`; // Temporary ID for tracking
    
    setNewMessage("");
    setSelectedFiles([]);
    setUploading(true);

    // Add temporary message to UI with pending status
    const tempMessage = {
      id: tempId,
      message: messageToSend || (filesToSend.length > 0 ? `📎 ${filesToSend.length} file(s)` : ''),
      sender_type: userId ? 'staff' : 'guest',
      staff: userId,
      guest_name: isGuest ? (guestSession?.getGuestName() || 'You') : null,
      staff_name: userId ? 'You' : null,
      timestamp: new Date().toISOString(),
      created_at: new Date().toISOString(),
      status: 'pending',
      has_attachments: filesToSend.length > 0
    };

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
        
        // Add authentication
        const authToken = localStorage.getItem('authToken');
        if (userId) {
          // Staff - token already in api headers
          console.log('👤 Staff upload with auth token');
        } else if (guestSession) {
          // Guest - add session token
          formData.append('session_token', guestSession.getToken());
          console.log('👤 Guest upload with session token');
        }

        console.log('📤 Uploading to Cloudinary via backend:', {
          endpoint: `/api/chat/${hotelSlug}/conversations/${conversationId}/upload-attachment/`,
          fileCount: filesToSend.length,
          totalSize: `${(filesToSend.reduce((sum, f) => sum + f.size, 0) / 1024).toFixed(1)}KB`,
          hasMessage: !!messageToSend.trim(),
          isGuest,
          conversationId,
          cloudinaryBase: CLOUDINARY_BASE
        });

        // Use fetch for file upload (not axios wrapper)
        response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL}/api/chat/${hotelSlug}/conversations/${conversationId}/upload-attachment/`,
          {
            method: 'POST',
            headers: {
              'Authorization': authToken ? `Token ${authToken}` : '',
              // DON'T set Content-Type - browser sets it with boundary
            },
            body: formData
          }
        );

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

        response = await api.post(
          `/chat/${hotelSlug}/conversations/${conversationId}/messages/send/`,
          payload
        );
      }

      console.log('✅ Message sent successfully - RAW response:', response.data);
      
      // Extract the actual message object
      const messageData = response.data?.message || response.data;
      
      console.log('✅ Extracted message data:', {
        messageId: messageData?.id,
        sender_type: messageData?.sender_type,
        message: messageData?.message,
        has_attachments: messageData?.has_attachments,
        attachments_count: messageData?.attachments?.length
      });

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
        errorMessage += '\n\nTip: Files are uploaded to Cloudinary. Check file size (max 10MB) and type.';
      }
      
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

        {/* Debug: Log before rendering */}
        {console.log('🎨 [RENDER] About to render messages:', messages.length)}
        
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
            ? msg.sender_type === "staff"  // Staff view: all staff messages are "mine"
            : msg.sender_type === "guest"; // Guest view: all guest messages are "mine"
          
          // Determine sender name
          let senderName;
          if (msg.sender_type === "guest") {
            senderName = msg.guest_name || "Guest";
            // Add "(You)" for guest's own messages when viewing as guest
            if (isGuest && isMine) {
              senderName += " (You)";
            }
          } else {
            // For staff messages
            senderName = msg.staff_name || (isGuest && currentStaff ? currentStaff.name : "Reception");
            
            // For staff view: add "(You)" only if this message is from the currently logged-in staff
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
              <div
                className={`d-inline-block p-2 rounded position-relative ${
                  isMine ? "my-message" : "receiver-message"
                } ${status === 'failed' ? 'opacity-75' : ''}`}
                style={status === 'failed' ? { border: '1px solid #dc3545' } : {}}
              >
                {msg.message && <div>{msg.message}</div>}
                
                {/* Render attachments */}
                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="message-attachments mt-2">
                    {msg.attachments.map(att => {
                      // Ensure we have full Cloudinary URL
                      const fullFileUrl = getCloudinaryUrl(att.file_url);
                      const fullThumbnailUrl = att.thumbnail_url ? getCloudinaryUrl(att.thumbnail_url) : null;
                      
                      return (
                        <div key={att.id} className="attachment mb-2">
                          {att.file_type === 'image' ? (
                            // Show images inline
                            <img 
                              src={fullThumbnailUrl || fullFileUrl} 
                              alt={att.file_name}
                              style={{ 
                                maxWidth: '300px', 
                                maxHeight: '300px',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                objectFit: 'cover'
                              }}
                              onClick={() => window.open(fullFileUrl, '_blank')}
                              title="Click to open full size"
                            />
                          ) : (
                            // Show document with download button
                            <div 
                              className="document d-flex align-items-center gap-2 p-2 rounded"
                              style={{ 
                                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                                maxWidth: '300px'
                              }}
                            >
                              <span style={{ fontSize: '1.5rem' }}>
                                {att.file_type === 'pdf' ? '📄' : '📎'}
                              </span>
                              <div className="flex-grow-1" style={{ minWidth: 0 }}>
                                <div 
                                  className="text-truncate" 
                                  style={{ fontSize: '0.9rem', fontWeight: '500' }}
                                  title={att.file_name}
                                >
                                  {att.file_name}
                                </div>
                                <small className="text-muted">{att.file_size_display || `${(att.file_size / 1024).toFixed(1)} KB`}</small>
                              </div>
                              <a 
                                href={fullFileUrl} 
                                download={att.file_name}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn-sm btn-primary"
                                style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                              >
                                ⬇️ Download
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className={`small mt-1 d-flex align-items-center gap-2 ${isMine ? 'justify-content-end' : 'justify-content-start'}`}>
                {messageTime && <span className="text-muted">{messageTime}</span>}
                {isMine && (
                  <span className="message-status-text" style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
                    {status === 'pending' && <span className="text-secondary">Sending...</span>}
                    {status === 'delivered' && <span className="text-secondary">Unseen</span>}
                    {status === 'read' && <span className="text-info">Seen</span>}
                    {status === 'failed' && (
                      <span className="text-danger d-flex align-items-center gap-1">
                        ❌ Failed to send
                        <button
                          className="btn btn-sm btn-link text-danger p-0 text-decoration-underline"
                          style={{ fontSize: '0.7rem' }}
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
            </div>
          );
        })}

        <div ref={messagesEndRef} style={{ minHeight: '60px' }} />
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
                key={index} 
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
            placeholder="Type a message..."
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
                console.log('� [INPUT FOCUS] Calling backend to mark ALL guest messages as read...');
                const response = await api.post(`/chat/conversations/${conversationId}/mark-read/`);
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
                const response = await api.post(`/chat/conversations/${conversationId}/mark-read/`, {
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
        />
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
    </div>
  );
};

export default ChatWindow;

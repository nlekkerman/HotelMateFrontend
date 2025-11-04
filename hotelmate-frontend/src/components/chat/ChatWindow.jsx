import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useLocation } from "react-router-dom";
import api from "@/services/api";
import { FaPaperPlane, FaTimes, FaArrowLeft, FaAngleDoubleDown, FaCheck, FaCheckDouble, FaSmile } from "react-icons/fa";
import { useChat } from "@/context/ChatContext";
import useHotelLogo from "@/hooks/useHotelLogo";
import { toast } from "react-toastify";
import EmojiPicker from "emoji-picker-react";
import { GuestChatSession } from "@/utils/guestChatSession";
import { useGuestPusher } from "@/hooks/useGuestPusher";
import { messaging } from "@/firebase";
import { onMessage } from "firebase/messaging";

const MESSAGE_LIMIT = 10;

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
  // Guest Pusher channel name - compute it directly from props
  const guestPusherChannel = isGuest && hotelSlug && roomNumber 
    ? `${hotelSlug}-room-${roomNumber}-chat` 
    : null;
  
  // Debug log for guest Pusher channel
  useEffect(() => {
    if (isGuest) {
      console.log('🔍 Guest Pusher Channel Debug:', {
        isGuest,
        hotelSlug,
        roomNumber,
        guestPusherChannel,
        channelWillBeUsed: !!guestPusherChannel
      });
    }
  }, [isGuest, hotelSlug, roomNumber, guestPusherChannel]);
  
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

  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const observerRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const messageInputRef = useRef(null);
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

        setMessages((prev) => [...newMessages, ...prev]);

        // Wait for DOM to render before restoring scroll
        requestAnimationFrame(() => {
          container.scrollTop = container.scrollHeight - scrollOffsetFromBottom;
          setLoadingMore(false);
        });
      } else {
        // Initial load or switching conversation: replace messages
        setMessages(newMessages);
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
      toast.error("Failed to load messages. Please try again.");
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
        console.log('👤 Assigning current staff to conversation:', conversationId);
        const response = await api.post(
          `/chat/${hotelSlug}/conversations/${conversationId}/assign-staff/`
        );
        
        if (response.data?.assigned_staff) {
          console.log('✅ Staff assigned:', response.data.assigned_staff.name);
        }
      } catch (error) {
        console.error('❌ Failed to assign staff to conversation:', error);
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
      
      // Load saved staff handler if exists
      const savedStaff = session.getCurrentStaffHandler();
      if (savedStaff) {
        setCurrentStaff(savedStaff);
        console.log('👤 Loaded saved staff handler:', savedStaff);
      }
      
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
        setMessages((prev) => {
          // Check if this message already exists by ID
          if (prev.some((m) => m.id === message.id)) {
            return prev;
          }
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
        
        // Only show notification if another staff member took over
        if (data.staff_name && data.staff_name !== currentStaffName) {
          toast.info(`${data.staff_name} (${data.staff_role}) is now handling this conversation`, {
            position: "top-right",
            autoClose: 5000,
          });
          console.log('📢 Showing handoff notification:', data.staff_name);
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
                ? { ...msg, status: 'read', is_read_by_recipient: true, read_by_guest: true }
                : msg
            )
          );
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
  }, []); // No dependencies needed

  // Handle staff assignment changes (for guests)
  const handleStaffAssigned = useCallback((data) => {
    console.log('👤 Staff assigned event received:', data);
    
    const newStaffInfo = {
      name: data.staff_name,
      role: data.staff_role,
      profile_image: data.staff_profile_image
    };
    
    // Update current staff handler
    setCurrentStaff(newStaffInfo);
    
    // Save to guest session
    guestSession?.saveToLocalStorage({ current_staff_handler: newStaffInfo });
    
    // Show a toast notification to the guest
    toast.info(`${data.staff_name} (${data.staff_role}) is now assisting you`, {
      position: "top-center",
      autoClose: 4000,
    });
    
    console.log('✅ Updated staff handler to:', data.staff_name);
  }, [guestSession]);

  // Use guest Pusher hook if this is a guest session
  // Use the computed channel name instead of relying on session data
  console.log('🔧 [CHATWINDOW] Setting up Pusher hook:', {
    isGuest,
    guestPusherChannel,
    willSubscribe: !!guestPusherChannel
  });
  
  useGuestPusher(
    guestPusherChannel, // Direct channel name: {hotelSlug}-room-{roomNumber}-chat
    {
      'new-staff-message': handleNewStaffMessage,
      'new-message': handleNewMessage,
      'staff-assigned': handleStaffAssigned,
    }
  );

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
          // Show toast notification
          const staffName = data.staff_name || 'Hotel Staff';
          const messageText = data.message || 'New message';
          
          toast.info(`${staffName}: ${messageText.substring(0, 50)}${messageText.length > 50 ? '...' : ''}`, {
            position: "top-right",
            autoClose: 5000,
          });

          console.log('✅ Toast notification shown for FCM message');
          
          // The Pusher event will handle adding the message to the UI
          // This is just for the notification
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

  // Auto-mark messages as read when viewing conversation (after 1 second delay)
  // Works for both staff and guests
  useEffect(() => {
    if (!conversationId) return;

    const markAsRead = async () => {
      try {
        // For staff: use the existing endpoint
        if (userId) {
          await api.post(`/chat/conversations/${conversationId}/mark-read/`);
          console.log('✅ Staff marked conversation as read');
        } 
        // For guests: use session token
        else if (guestSession) {
          await api.post(`/chat/conversations/${conversationId}/mark-read/`, {
            session_token: guestSession.getToken()
          });
          console.log('✅ Guest marked conversation as read');
        }
      } catch (error) {
        console.error('Failed to mark conversation as read:', error);
      }
    };

    // Wait 1 second to ensure user is actually viewing
    const timer = setTimeout(markAsRead, 1000);

    return () => clearTimeout(timer);
  }, [conversationId, userId, guestSession]);

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

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversationId) return;

    const messageToSend = newMessage;
    const tempId = `temp-${Date.now()}`; // Temporary ID for tracking
    setNewMessage("");

    // Mark as pending
    setMessageStatuses(prev => new Map(prev).set(tempId, 'pending'));

    try {
      // Simplified payload - backend determines sender_type from token presence
      const payload = {};
      
      if (userId) {
        // Staff sends with staff_id
        payload.message = messageToSend;
        payload.staff_id = userId;
      } else if (guestSession) {
        // Guest sends with ONLY message and session_token
        payload.message = messageToSend;
        payload.session_token = guestSession.getToken();
      } else {
        console.error('❌ Cannot send message: No userId or guestSession');
        toast.error("Unable to send message. Please refresh and try again.");
        return;
      }

      console.log('📤 Sending message:', {
        isGuest,
        hasUserId: !!userId,
        hasSessionToken: !!payload.session_token,
        hasStaffId: !!payload.staff_id,
        payload,
        conversationId,
        hotelSlug
      });

      const response = await api.post(
        `/chat/${hotelSlug}/conversations/${conversationId}/messages/send/`,
        payload
      );

      console.log('✅ Message sent successfully - RAW response:', response.data);
      
      // Backend returns: {conversation_id: 37, message: {...}}
      // Extract the actual message object
      const messageData = response.data?.message || response.data;
      
      console.log('✅ Extracted message data:', {
        messageId: messageData?.id,
        sender_type: messageData?.sender_type,
        message: messageData?.message
      });

      // Update staff handler if changed (for guests)
      if (!userId && messageData?.staff_info) {
        setCurrentStaff(messageData.staff_info);
        guestSession?.saveToLocalStorage({ current_staff_handler: messageData.staff_info });
      }

      // When we get response, mark as delivered and map tempId to real ID
      if (messageData?.id) {
        setMessageStatuses(prev => {
          const newMap = new Map(prev);
          newMap.delete(tempId);
          newMap.set(messageData.id, 'delivered');
          return newMap;
        });
      }

      // Message will appear via Pusher
      scrollToBottom();
      
    } catch (err) {
      console.error("Failed to send message:", err);
      setMessageStatuses(prev => {
        const newMap = new Map(prev);
        newMap.delete(tempId);
        return newMap;
      });
      toast.error("Failed to send message. Please try again.");
      // Restore the message in the input on failure
      setNewMessage(messageToSend);
    }
  };

  const handleEmojiClick = (emojiData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
    // Return focus to input after selecting emoji (without triggering keyboard on mobile)
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
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
          // For STAFF view: all staff messages on right, guest messages on left
          // For GUEST view: all guest messages on right, staff messages on left
          const isMine = userId 
            ? msg.sender_type === "staff"  // Staff view: all staff messages are "mine"
            : msg.sender_type === "guest"; // Guest view: all guest messages are "mine"
          
          // Determine sender name
          let senderName;
          if (msg.sender_type === "guest") {
            senderName = msg.guest_name || "Guest";
          } else {
            // For staff messages, use staff_name if available, otherwise use currentStaff name for guests
            senderName = msg.staff_name || (isGuest && currentStaff ? currentStaff.name : "Reception");
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
                }`}
              >
                {msg.message}
              </div>
              <div className={`small text-muted mt-1 d-flex align-items-center gap-1 ${isMine ? 'justify-content-end' : 'justify-content-start'}`}>
                {messageTime && <span>{messageTime}</span>}
                {isMine && (
                  <span className="message-status-text" style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
                    {status === 'pending' && <span className="text-secondary">Sending...</span>}
                    {status === 'delivered' && <span className="text-secondary">Unseen</span>}
                    {status === 'read' && <span className="text-info">Seen</span>}
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
      <div className="chat-input-vertical d-flex p-2 border-start" style={{ position: 'relative' }}>
        {/* Emoji Picker */}
        {showEmojiPicker && (
          <div 
            ref={emojiPickerRef}
            className="emoji-picker-container"
          >
            <EmojiPicker onEmojiClick={handleEmojiClick} />
          </div>
        )}

        {/* Emoji Button */}
        <button
          ref={emojiButtonRef}
          className="btn d-flex align-items-center justify-content-center"
          onClick={handleEmojiButtonClick}
          disabled={!conversationId}
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
          onFocus={() => {
            if (conversationId) markConversationRead(conversationId);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSendMessage();
          }}
          disabled={!conversationId}
        />
        <button
          className="btn d-flex align-items-center justify-content-center"
          onClick={handleSendMessage}
          disabled={!conversationId}
        >
          <FaPaperPlane />
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;

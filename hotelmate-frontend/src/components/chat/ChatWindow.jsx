import React, { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import api from "@/services/api";
import { FaPaperPlane, FaTimes, FaArrowLeft, FaAngleDoubleDown, FaCheck, FaCheckDouble, FaSmile } from "react-icons/fa";
import { useChat } from "@/context/ChatContext";
import useHotelLogo from "@/hooks/useHotelLogo";
import { toast } from "react-toastify";
import EmojiPicker from "emoji-picker-react";

const MESSAGE_LIMIT = 10;

const ChatWindow = ({
  userId: propUserId,
  conversationId: propConversationId,
  hotelSlug: propHotelSlug,
  roomNumber: propRoomNumber,
  onNewMessage,
  onClose,
}) => {
  const {
    hotelSlug: paramHotelSlug,
    conversationId: paramConversationIdFromURL,
  } = useParams();
  const hotelSlug = propHotelSlug || paramHotelSlug;
  const conversationId = propConversationId || paramConversationIdFromURL;
  const roomNumber = propRoomNumber;

  const storedUser = localStorage.getItem("user");
  const userId =
    propUserId || (storedUser ? JSON.parse(storedUser).id : undefined);
  const {
    logoUrl: hotelLogo,
    loading: logoLoading,
    error: logoError,
  } = useHotelLogo(hotelSlug);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [seenMessages, setSeenMessages] = useState(new Set());
  const [conversationDetails, setConversationDetails] = useState(null);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [messageStatuses, setMessageStatuses] = useState(new Map()); // Track message statuses: pending, delivered, seen
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messagesContainerRef = useRef(null);
  const messagesEndRef = useRef(null);
  const observerRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const emojiButtonRef = useRef(null);
  const { markConversationRead, pusherInstance, setCurrentConversationId } = useChat();

  // Scroll to bottom only on initial load or when sending a new message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch conversation details
  const fetchConversationDetails = async () => {
    if (!conversationId || !hotelSlug) return;
    
    try {
      const res = await api.get(`/chat/${hotelSlug}/conversations/${conversationId}/`);
      setConversationDetails(res.data);
    } catch (err) {
      console.error("Error fetching conversation details:", err);
    }
  };

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
    setConversationDetails(null);

    // Update current conversation ID in context
    setCurrentConversationId(conversationId);

    fetchConversationDetails();
    fetchMessages();

    return () => {
      setCurrentConversationId(null);
    };
  }, [conversationId, setCurrentConversationId]);

  // Pusher real-time updates - reuse global instance
  useEffect(() => {
    if (!conversationId || !pusherInstance) return;

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

    // Set up intersection observer for message seen status
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
      // Only unbind our handlers, don't unsubscribe the channel
      // (ChatContext might still need it for notifications)
      if (channel) {
        channel.unbind("new-message");
        channel.unbind("message-delivered");
        channel.unbind("messages-read-by-staff");
        channel.unbind("messages-read-by-guest");
      }
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hotelSlug, conversationId, pusherInstance, userId]);
  // Removed seenMessages from deps to prevent re-subscription

  // Auto-mark messages as read when viewing conversation (after 1 second delay)
  useEffect(() => {
    if (!conversationId) return;

    const markAsRead = async () => {
      try {
        await api.post(`/chat/conversations/${conversationId}/mark-read/`);
        console.log('Marked conversation as read');
      } catch (error) {
        console.error('Failed to mark conversation as read:', error);
      }
    };

    // Wait 1 second to ensure user is actually viewing
    const timer = setTimeout(markAsRead, 1000);

    return () => clearTimeout(timer);
  }, [conversationId]);

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
      const response = await api.post(
        `/chat/${hotelSlug}/conversations/${conversationId}/messages/send/`,
        {
          message: messageToSend,
          sender_type: userId ? "staff" : "guest",
          staff_id: userId || undefined,
        }
      );

      // When we get response, mark as delivered and map tempId to real ID
      if (response.data?.id) {
        setMessageStatuses(prev => {
          const newMap = new Map(prev);
          newMap.delete(tempId);
          newMap.set(response.data.id, 'delivered');
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
          <h5 className="mb-0">
            {roomNumber ? `Room ${roomNumber}` : 'Chat'}
          </h5>
          {conversationDetails?.guest_name && (
            <small className="text-white-50">
              {conversationDetails.guest_name}
            </small>
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
        {!userId && (
          <div className="chat-logo-container rounded-pill shadow-lg">
            <div
              className={`chat-logo-inner ${newMessage.trim() ? "shake" : ""}`}
            >
              {logoLoading && <span>Loading logo...</span>}
              {logoError && <span>Error loading logo</span>}
              {hotelLogo && (
                <img
                  src={hotelLogo}
                  alt="Hotel Logo"
                  style={{ maxHeight: 80, objectFit: "contain" }}
                />
              )}
            </div>
          </div>
        )}

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
          const isMine =
            (msg.sender_type === "staff" && msg.staff === userId) ||
            (msg.sender_type === "guest" && !userId);
          const senderName =
            msg.sender_type === "guest" ? msg.guest_name : "Reception";

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
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          disabled={!conversationId}
          title="Add emoji"
          style={{ marginRight: '0.5rem' }}
        >
          <FaSmile />
        </button>

        <input
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

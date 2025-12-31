import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { subscribeToGuestChatChannel } from '@/realtime/channelRegistry';
import { useGuestChatStore } from '@/realtime/stores/guestChatStore';
import { publicAPI } from '@/services/api';

/**
 * Guest Chat Portal - Token-based guest chat interface
 * Accessed via /guest/chat?hotel_slug=...&token=...
 * No PIN required, uses token from email link
 */
const GuestChatPortal = () => {
  const [searchParams] = useSearchParams();
  const hotelSlug = searchParams.get('hotel_slug');
  const token = searchParams.get('token');

  // State
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [channelName, setChannelName] = useState(null);
  
  // Realtime cleanup
  const unsubscribeRef = useRef(null);
  
  // Chat store
  const { guestChatData } = useGuestChatStore();
  const messages = guestChatData.messages || [];
  const messagesLoading = false;

  // Message container ref for auto-scroll
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch guest context on mount
  useEffect(() => {
    if (!hotelSlug || !token) {
      setError('Missing hotel slug or token in URL');
      setLoading(false);
      return;
    }

    fetchGuestContext();
  }, [hotelSlug, token]);

  // Load messages when conversation ID is available
  useEffect(() => {
    if (conversationId && context?.allowed_actions?.can_chat) {
      loadMessages();
    }
  }, [conversationId, context]);

  /**
   * Load existing messages for the conversation
   */
  const loadMessages = async () => {
    try {
      console.log('📥 [GuestChat] Loading messages for conversation:', conversationId);
      
      const response = await publicAPI.get(
        `/chat/${hotelSlug}/guest/chat/messages/`,
        {
          params: { 
            token,
            conversation_id: conversationId 
          }
        }
      );
      
      console.log('✅ [GuestChat] Messages loaded:', response.data);
      // Messages should be handled by the guest chat store via real-time events
      // or we could dispatch them directly here if needed
    } catch (err) {
      console.error('❌ [GuestChat] Failed to load messages:', err);
      // Not critical - user can still send messages
    }
  };

  // Subscribe to realtime when context is available
  useEffect(() => {
    if (channelName && context?.allowed_actions?.can_chat) {
      subscribeToChat();
    }

    // Cleanup on unmount
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [channelName, context]);

  // Periodic context refresh for room move resilience
  useEffect(() => {
    if (!hotelSlug || !token || !context) return;

    const intervalId = setInterval(async () => {
      try {
        console.log('🔄 [GuestChat] Periodic context refresh...');
        const response = await publicAPI.get(
          `/chat/${hotelSlug}/guest/chat/context/`,
          { params: { token } }
        );
        
        const newContext = response.data;
        const newChannelName = newContext.channel;
        
        // Check if channel changed (room move)
        if (newChannelName !== channelName) {
          console.log('🏠 [GuestChat] Room change detected:', { 
            old: channelName, 
            new: newChannelName 
          });
          
          // Unsubscribe from old channel
          if (unsubscribeRef.current) {
            unsubscribeRef.current();
            unsubscribeRef.current = null;
          }
          
          // Update context and channel
          setContext(newContext);
          setConversationId(newContext.conversation_id);
          setChannelName(newChannelName);
        }
      } catch (err) {
        console.error('❌ [GuestChat] Context refresh failed:', err);
      }
    }, 45000); // Every 45 seconds

    return () => clearInterval(intervalId);
  }, [hotelSlug, token, context, channelName]);

  /**
   * Fetch guest context from backend
   */
  const fetchGuestContext = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🔍 [GuestChat] Fetching context for:', { hotelSlug, hasToken: !!token });

      const response = await publicAPI.get(
        `/chat/${hotelSlug}/guest/chat/context/`,
        {
          params: { token }
        }
      );

      const contextData = response.data;
      console.log('✅ [GuestChat] Context fetched:', contextData);
      
      setContext(contextData);
      setConversationId(contextData.conversation_id);
      setChannelName(contextData.channel);
      
      if (!contextData.allowed_actions?.can_chat) {
        console.log('⚠️ [GuestChat] Chat not allowed - guest may need to check in');
      }
    } catch (err) {
      console.error('❌ [GuestChat] Failed to fetch context:', err);
      setError(
        err.response?.data?.detail || 
        'Failed to load chat context. Please check your link.'
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * Subscribe to realtime chat events
   */
  const subscribeToChat = () => {
    if (unsubscribeRef.current) {
      // Already subscribed
      return;
    }

    console.log('🔗 [GuestChat] Subscribing to realtime chat channel:', channelName);
    
    const cleanup = subscribeToGuestChatChannel(channelName);
    
    unsubscribeRef.current = cleanup;
  };

  /**
   * Send message to backend
   */
  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!message.trim() || sending) {
      return;
    }

    if (!context?.allowed_actions?.can_chat) {
      toast.error('Chat is not available at this time');
      return;
    }

    try {
      setSending(true);
      
      console.log('📤 [GuestChat] Sending message:', message);
      
      const response = await publicAPI.post(
        `/chat/${hotelSlug}/guest/chat/messages/`,
        {
          message: message.trim(),
          message_type: 'text'
        },
        {
          params: { token }
        }
      );
      
      console.log('✅ [GuestChat] Message sent successfully:', response.data);
      
      // Clear input - message will appear via realtime event
      setMessage('');
      
      // Optional: Show success toast
      // toast.success('Message sent');
      
    } catch (err) {
      console.error('❌ [GuestChat] Failed to send message:', err);
      toast.error(
        err.response?.data?.detail || 
        'Failed to send message. Please try again.'
      );
    } finally {
      setSending(false);
    }
  };

  // Render loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted">Loading chat...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="alert alert-danger" style={{ maxWidth: '400px' }}>
            <i className="bi bi-exclamation-triangle me-2"></i>
            <strong>Error:</strong> {error}
          </div>
          <button 
            className="btn btn-outline-primary"
            onClick={() => window.location.reload()}
          >
            <i className="bi bi-arrow-clockwise me-2"></i>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Render chat not available state
  if (!context?.allowed_actions?.can_chat) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container py-5">
          <div className="row justify-content-center">
            <div className="col-md-8 col-lg-6">
              <div className="card shadow-sm">
                <div className="card-header bg-warning text-dark">
                  <h5 className="mb-0">
                    <i className="bi bi-chat-dots me-2"></i>
                    Guest Chat
                  </h5>
                </div>
                <div className="card-body text-center py-5">
                  <i className="bi bi-clock display-1 text-muted mb-3"></i>
                  <h4 className="text-muted mb-3">Chat Available After Check-in</h4>
                  <p className="text-muted">
                    The chat feature will become available once you have checked into your room.
                    Please visit the front desk to complete your check-in process.
                  </p>
                  
                  {context?.booking_summary && (
                    <div className="mt-4">
                      <h6>Booking Details:</h6>
                      <p className="small text-muted">
                        Booking #{context.booking_id} • {context.booking_summary}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render active chat interface
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container-fluid h-100">
        <div className="row justify-content-center h-100">
          <div className="col-12 col-md-8 col-lg-6">
            <div className="card shadow h-100 d-flex flex-column" style={{ minHeight: '100vh' }}>
              
              {/* Header */}
              <div className="card-header bg-primary text-white">
                <div className="d-flex align-items-center">
                  <i className="bi bi-chat-dots fs-4 me-3"></i>
                  <div>
                    <h5 className="mb-0">Guest Chat</h5>
                    <small className="opacity-75">
                      Room {context?.room_number || 'N/A'} • Connected
                    </small>
                  </div>
                </div>
              </div>

              {/* Messages area */}
              <div className="card-body flex-grow-1 d-flex flex-column p-0">
                <div className="flex-grow-1 overflow-auto p-3" style={{ maxHeight: 'calc(100vh - 200px)' }}>
                  {messagesLoading && (
                    <div className="text-center py-3">
                      <div className="spinner-border spinner-border-sm text-primary" role="status">
                        <span className="visually-hidden">Loading messages...</span>
                      </div>
                    </div>
                  )}
                  
                  {messages.length === 0 && !messagesLoading && (
                    <div className="text-center py-5">
                      <i className="bi bi-chat-square-text display-1 text-muted mb-3"></i>
                      <p className="text-muted">No messages yet. Start the conversation!</p>
                    </div>
                  )}

                  {messages.map((msg) => (
                    <div 
                      key={msg.id} 
                      className={`mb-3 d-flex ${
                        msg.sender_type === 'guest' ? 'justify-content-end' : 'justify-content-start'
                      }`}
                    >
                      <div 
                        className={`max-width-75 px-3 py-2 rounded ${
                          msg.sender_type === 'guest' 
                            ? 'bg-primary text-white' 
                            : 'bg-light text-dark border'
                        }`}
                        style={{ maxWidth: '75%' }}
                      >
                        <div className="mb-1">{msg.message}</div>
                        <small className={`opacity-75 ${
                          msg.sender_type === 'guest' ? 'text-white' : 'text-muted'
                        }`}>
                          {msg.sender_type === 'staff' ? 'Staff' : 'You'} • 
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </small>
                      </div>
                    </div>
                  ))}
                  
                  {/* Auto-scroll target */}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Message input */}
              <div className="card-footer">
                <form onSubmit={handleSendMessage}>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Type your message..."
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      disabled={sending}
                    />
                    <button 
                      className="btn btn-primary" 
                      type="submit"
                      disabled={!message.trim() || sending}
                    >
                      {sending ? (
                        <><span className="spinner-border spinner-border-sm me-1" /> Sending...</>
                      ) : (
                        <><i className="bi bi-send me-1"></i> Send</>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GuestChatPortal;
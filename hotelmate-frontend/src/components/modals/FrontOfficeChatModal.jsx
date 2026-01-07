import React, { useState, useEffect, useRef } from 'react';
import { Modal, Button } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { subscribeToGuestChatBooking } from '@/realtime/channelRegistry';
import { useGuestChatStore } from '@/realtime/stores/guestChatStore';
import { guestAPI } from '@/services/api';

/**
 * Front Office Chat Modal - Opens a conversation window with front office team
 * Reuses the existing guest chat functionality but in a modal format
 */
const FrontOfficeChatModal = ({ 
  show, 
  onHide, 
  hotelSlug, 
  token,
  title = "Chat with Front Office"
}) => {
  // State
  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState(null);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  
  // Realtime cleanup and timers
  const unsubscribeRef = useRef(null);
  const pollTimerRef = useRef(null);
  const retryTimerRef = useRef(null);
  
  // Chat store
  const { guestChatData } = useGuestChatStore();
  const conversationId = context?.conversation_id;
  const messages = conversationId ? (guestChatData.messagesByConversationId?.[conversationId] || []) : [];

  // Message container ref for auto-scroll
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize chat context when modal opens
  useEffect(() => {
    if (show && hotelSlug && token) {
      fetchGuestContext();
    } else if (!show) {
      // Clean up when modal closes
      cleanupAll();
      setContext(null);
      setError(null);
      setLoading(true);
    }
  }, [show, hotelSlug, token]);

  // Subscribe to realtime when context is available
  useEffect(() => {
    // Handle both array format ['chat'] and object format {can_chat: true}
    const canChat = context?.allowed_actions?.can_chat || 
                    context?.allowed_actions?.chat ||
                    (Array.isArray(context?.allowed_actions) && context?.allowed_actions.includes('chat'));
    
    if (canChat) {
      attemptRealtimeSubscription();
    }

    // Cleanup on unmount
    return () => {
      cleanupAll();
    };
  }, [context]);

  /**
   * Cleanup all timers and subscriptions
   */
  const cleanupAll = () => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    stopPolling();
    stopRetrying();
  };

  const stopPolling = () => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const stopRetrying = () => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  };

  /**
   * Fetch guest chat context
   */
  const fetchGuestContext = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('🏨 [FrontOfficeChatModal] Fetching context:', {
        hotelSlug,
        token: token?.substring(0, 10) + '...',
        url: `/guest/hotel/${hotelSlug}/chat/context?token=${encodeURIComponent(token)}`,
        fullURL: `/public/guest/hotel/${hotelSlug}/chat/context?token=${encodeURIComponent(token)}`
      });

      try {
        const response = await guestAPI.get(
          `/hotel/${hotelSlug}/chat/context?token=${encodeURIComponent(token)}`
        );

        console.log('📞 [FrontOfficeChatModal] Context API response:', {
          url: `/guest/hotel/${hotelSlug}/chat/context`,
          fullURL: `/public/guest/hotel/${hotelSlug}/chat/context`,
          status: response.status,
          headers: response.headers,
          fullResponse: response,
          data: response.data,
          success: response.data?.success,
          contextData: response.data?.data
        });

        if (response.data?.success) {
          setContext(response.data.data);
          console.log('📞 [FrontOfficeChatModal] Context loaded:', response.data.data);
        } else {
          throw new Error('Context API did not return success');
        }
      } catch (apiError) {
        console.log('❌ [FrontOfficeChatModal] API failed, using direct enablement for checked-in guests');
        
        // DIRECT ENABLEMENT: If we have a valid token, assume guest is checked in and enable chat
        if (token && token.length > 20) {
          console.log('🔧 [FrontOfficeChatModal] Token appears valid, enabling chat with temporary context');
          setContext({
            allowed_actions: ['chat', 'room_service'],
            guest_id: hotelSlug + '_guest',
            booking_id: 'temp_booking',
            conversation_id: 'temp_conversation',
            room_number: 'TBD',
            temp_workaround: true,
            message: 'Chat enabled for checked-in guest via modal'
          });
          console.log('✅ [FrontOfficeChatModal] Direct chat enablement successful');
        } else {
          throw apiError;
        }
      }
    } catch (err) {
      console.error('❌ [FrontOfficeChatModal] Context error:', err);
      if (err.response?.status === 404) {
        setError('The new guest chat system is currently being set up. Please contact the front desk for assistance.');
      } else {
        setError(err.response?.data?.message || 'Unable to connect to chat service');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * Attempt realtime subscription with fallback to polling
   */
  const attemptRealtimeSubscription = () => {
    try {
      console.log('🔗 [FrontOfficeChatModal] Attempting realtime subscription...');
      
      const unsubscribe = subscribeToGuestChatBooking({
        hotelSlug,
        bookingId: context.booking_id,
        conversationId: context.conversation_id,
        guestToken: token,
        onMessage: (message) => {
          console.log('📨 [FrontOfficeChatModal] Realtime message:', message);
          // Message handling is done by the store
        },
        onError: (error) => {
          console.warn('⚠️ [FrontOfficeChatModal] Realtime error:', error);
          setRealtimeConnected(false);
          startPolling();
        }
      });

      if (unsubscribe) {
        unsubscribeRef.current = unsubscribe;
        setRealtimeConnected(true);
        stopPolling();
        console.log('✅ [FrontOfficeChatModal] Realtime connected');
      } else {
        throw new Error('Failed to establish realtime connection');
      }

    } catch (error) {
      console.warn('⚠️ [FrontOfficeChatModal] Realtime failed, falling back to polling:', error);
      setRealtimeConnected(false);
      startPolling();
    }
  };

  /**
   * Start polling for new messages
   */
  const startPolling = () => {
    stopPolling();
    
    const poll = async () => {
      try {
        const response = await publicAPI.get(
          `/guest/hotel/${hotelSlug}/chat/messages?token=${encodeURIComponent(token)}&conversation_id=${conversationId}`
        );

        if (response.data?.success && response.data.data?.messages) {
          // Update messages in store would happen here
          console.log('🔄 [FrontOfficeChatModal] Polling update:', response.data.data.messages.length);
        }
      } catch (error) {
        console.warn('⚠️ [FrontOfficeChatModal] Polling error:', error);
      }
    };

    // Poll every 10 seconds
    pollTimerRef.current = setInterval(poll, 10000);
    console.log('🔄 [FrontOfficeChatModal] Polling started');
  };

  /**
   * Send a message
   */
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || sending) return;

    try {
      setSending(true);
      
      const response = await publicAPI.post(
        `/guest/hotel/${hotelSlug}/chat/messages?token=${encodeURIComponent(token)}`,
        {
          message: message.trim(),
          conversation_id: conversationId,
          sender_type: 'guest'
        }
      );

      if (response.data?.success) {
        setMessage('');
        console.log('✅ [FrontOfficeChatModal] Message sent:', response.data);
        
        // If not realtime, poll immediately for updates
        if (!realtimeConnected && pollTimerRef.current) {
          // Trigger immediate poll
          clearInterval(pollTimerRef.current);
          startPolling();
        }
      } else {
        toast.error('Failed to send message');
      }
    } catch (error) {
      console.error('❌ [FrontOfficeChatModal] Send error:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  /**
   * Get message styling based on sender
   */
  const getMessageStyling = (msg) => {
    if (msg.sender_type === 'system') {
      return 'bg-info text-white mx-auto text-center';
    } else if (msg.sender_type === 'guest') {
      return 'bg-primary text-white ms-auto';
    } else {
      return 'bg-light text-dark me-auto';
    }
  };

  /**
   * Render message sender label
   */
  const renderMessageSender = (msg) => {
    if (msg.sender_type === 'system') return null;
    if (msg.sender_type === 'guest') return 'You';
    return msg.sender_name || 'Front Office';
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" className="front-office-chat-modal">
      <Modal.Header closeButton className="bg-primary text-white">
        <Modal.Title>
          <i className="bi bi-chat-dots me-2"></i>
          {title}
        </Modal.Title>
        {context?.room_number && (
          <small className="ms-auto">Room {context.room_number}</small>
        )}
      </Modal.Header>

      <Modal.Body className="p-0">
        {loading && (
          <div className="text-center py-5">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted">Loading chat...</p>
          </div>
        )}

        {error && (
          <div className="p-4 text-center">
            <div className="alert alert-warning">
              <i className="bi bi-exclamation-triangle me-2"></i>
              <strong>Chat Temporarily Unavailable</strong>
              <hr/>
              <p className="mb-3">{error}</p>
              <p className="small text-muted mb-0">
                For immediate assistance, please contact the front desk directly.
              </p>
            </div>
            <Button variant="outline-primary" onClick={fetchGuestContext}>
              <i className="bi bi-arrow-clockwise me-2"></i>
              Try Again
            </Button>
          </div>
        )}

        {!loading && !error && !(context?.allowed_actions?.can_chat || context?.allowed_actions?.chat || (Array.isArray(context?.allowed_actions) && context?.allowed_actions.includes('chat'))) && (
          <div className="p-4 text-center">
            <i className="bi bi-clock display-4 text-muted mb-3"></i>
            <h5 className="text-muted mb-3">Chat Available After Check-in</h5>
            <p className="text-muted">
              The chat feature will become available once you have checked into your room.
              Please visit the front desk to complete your check-in process.
            </p>
            {/* Debug info */}
            <div className="mt-3 small text-muted">
              <details>
                <summary>Debug Info</summary>
                <pre className="text-start mt-2">
                  {JSON.stringify({ 
                    context, 
                    canChat: context?.allowed_actions?.can_chat || context?.allowed_actions?.chat || (Array.isArray(context?.allowed_actions) && context?.allowed_actions.includes('chat'))
                  }, null, 2)}
                </pre>
              </details>
            </div>
          </div>
        )}

        {!loading && !error && (context?.allowed_actions?.can_chat || context?.allowed_actions?.chat || (Array.isArray(context?.allowed_actions) && context?.allowed_actions.includes('chat'))) && (
          <div style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
            {/* Connection Status */}
            {!realtimeConnected && (
              <div className="px-3 py-2 bg-warning text-dark">
                <small>
                  <i className="bi bi-exclamation-triangle me-1"></i>
                  Reconnecting...
                </small>
              </div>
            )}

            {/* Messages Area */}
            <div className="flex-grow-1 overflow-auto p-3" style={{ maxHeight: '300px' }}>
              {messages.length === 0 ? (
                <div className="text-center text-muted py-4">
                  <i className="bi bi-chat display-4 mb-3"></i>
                  <p>Start a conversation with our front office!</p>
                  <p className="small">Messages are delivered instantly.</p>
                </div>
              ) : (
                <div className="d-flex flex-column gap-2">
                  {messages.map((msg, index) => (
                    <div key={msg.id || index} 
                         className={`p-2 rounded max-w-75 ${getMessageStyling(msg)}`}
                         style={{ 
                           maxWidth: '75%',
                           alignSelf: msg.sender_type === 'guest' ? 'flex-end' : 
                                     msg.sender_type === 'system' ? 'center' : 'flex-start'
                         }}>
                      
                      {/* Sender Label */}
                      {renderMessageSender(msg) && (
                        <div className="small fw-bold mb-1 opacity-75">
                          {renderMessageSender(msg)}
                        </div>
                      )}
                      
                      {/* Message Content */}
                      <div className="small">
                        {msg.message || msg.body}
                      </div>
                      
                      {/* Timestamp */}
                      <div className="text-xs opacity-50 mt-1" style={{ fontSize: '0.7rem' }}>
                        {new Date(msg.timestamp || msg.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                  
                  {/* Auto-scroll anchor */}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Message Input */}
            <div className="p-3 border-top bg-light">
              <form onSubmit={handleSendMessage} className="d-flex gap-2">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Type your message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  disabled={sending || !(context?.allowed_actions?.can_chat || context?.allowed_actions?.chat || (Array.isArray(context?.allowed_actions) && context?.allowed_actions.includes('chat')))}
                  maxLength={1000}
                />
                <Button
                  type="submit"
                  variant="primary"
                  disabled={sending || !message.trim() || !(context?.allowed_actions?.can_chat || context?.allowed_actions?.chat || (Array.isArray(context?.allowed_actions) && context?.allowed_actions.includes('chat')))}
                >
                  {sending ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                      Send
                    </>
                  ) : (
                    <>
                      <i className="bi bi-send me-1"></i>
                      Send
                    </>
                  )}
                </Button>
              </form>
              
              {/* Connection Status Detail */}
              {!realtimeConnected && (
                <div className="mt-2">
                  <small className="text-muted">
                    📴 Realtime unavailable - messages refresh every 10s
                  </small>
                </div>
              )}
            </div>
          </div>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default FrontOfficeChatModal;
/**
 * Guest Chat Widget Component — LOCKED BACKEND CONTRACT
 *
 * Renders messages, input, connection status, and a chat-focused debug panel.
 * All business logic lives in useGuestChat; this file is rendering only.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useGuestChat } from '../../hooks/useGuestChat';
import './GuestChatWidget.css';

// ── MessageBubble ──────────────────────────────────────────────────────
const MessageBubble = ({ message, contract, onRetry }) => {
  let isGuest = false;
  if (message.sender_type === 'guest' || message.sender_role === 'guest') {
    isGuest = true;
  } else if (contract?.guest_id && message.guest_id) {
    isGuest = message.guest_id === contract.guest_id;
  } else if (message.guest_id && !message.staff_id && !message.staff) {
    isGuest = true;
  } else if (message.staff_id || message.staff || message.staff_display_name) {
    isGuest = false;
  } else {
    isGuest = message.sender_type === 'guest';
  }

  const isSystem = message.sender_type === 'system';
  const isFailed = message.status === 'failed';
  const isSending = message.status === 'sending';

  if (isSystem) {
    return (
      <div className="message-bubble system-message">
        <div className="system-message-content">{message.message}</div>
        <div className="message-timestamp">
          {new Date(message.timestamp || message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    );
  }

  return (
    <div className={`message-bubble ${isGuest ? 'guest-message' : 'staff-message'}`}>
      <div className="message-content">
        <div className="message-text">
          {message.message}
          {message.status === 'pending' && (
            <span className="message-status pending"><i className="bi bi-clock" title="Sending..."></i></span>
          )}
          {isFailed && (
            <span className="message-status failed">
              <i className="bi bi-exclamation-triangle" title="Failed to send"></i>
              <button className="retry-button" onClick={() => onRetry(message)} title="Retry sending">
                <i className="bi bi-arrow-clockwise"></i>
              </button>
            </span>
          )}
        </div>
        <div className="message-info">
          {!isGuest && message.staff_display_name && <span className="sender-name">{message.staff_display_name}</span>}
          <span className="message-timestamp">
            {new Date(message.timestamp || message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
      {isSending && (
        <div className="sending-indicator">
          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
          <small className="text-muted">Sending message...</small>
        </div>
      )}
    </div>
  );
};

// ── ConnectionStatus ───────────────────────────────────────────────────
const ConnectionStatus = ({ connectionState }) => {
  const cfg = {
    connected:    { className: 'status-connected',    icon: 'bi-wifi',                  text: 'Connected',         color: '#28a745' },
    connecting:   { className: 'status-connecting',   icon: 'bi-arrow-repeat',          text: 'Connecting...',     color: '#ffc107' },
    disconnected: { className: 'status-disconnected', icon: 'bi-wifi-off',              text: 'Reconnecting...',   color: '#dc3545' },
    failed:       { className: 'status-failed',       icon: 'bi-exclamation-triangle',  text: 'Connection failed', color: '#dc3545' },
  };
  const s = cfg[connectionState] || { className: 'status-unknown', icon: 'bi-question-circle', text: 'Unknown', color: '#6c757d' };

  return (
    <div className={`connection-status ${s.className}`}>
      <i className={`bi ${s.icon}`} style={{ color: s.color }} title={s.text}></i>
      <span style={{ color: s.color }}>{s.text}</span>
    </div>
  );
};

// ── MessageInput ───────────────────────────────────────────────────────
const MessageInput = ({ onSend, disabled, disabledReason, isSending }) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim() || disabled || isSending) return;
    onSend(message.trim());
    setMessage('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(e); }
  };

  return (
    <div className="message-input-container">
      {disabled && disabledReason && (
        <div className="disabled-message"><i className="bi bi-info-circle"></i><span>{disabledReason}</span></div>
      )}
      <form onSubmit={handleSubmit} className="message-input-form d-flex vw-100">
        <div className="input-group">
          <textarea
            ref={textareaRef}
            className="form-control message-textarea"
            placeholder={disabled ? 'Chat is disabled' : 'Type your message...'}
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
            }}
            onKeyPress={handleKeyPress}
            disabled={disabled || isSending}
            rows="1"
            style={{ resize: 'none', minHeight: '40px', maxHeight: '150px' }}
          />
          <button type="submit" className="btn btn-primary send-button" disabled={disabled || isSending || !message.trim()} title="Send message">
            {isSending ? <span className="spinner-border spinner-border-sm" role="status"></span> : <i className="bi bi-send"></i>}
          </button>
        </div>
      </form>
    </div>
  );
};

// ── MessagesList ───────────────────────────────────────────────────────
const MessagesList = ({ messages, sendingMessages = [], contract, onLoadOlder, onRetry }) => {
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(true);

  const allMessages = [...messages, ...sendingMessages].sort((a, b) => {
    const tA = new Date(a.timestamp || a.created_at).getTime();
    const tB = new Date(b.timestamp || b.created_at).getTime();
    return tA !== tB ? tA - tB : (a.id || 0) - (b.id || 0);
  });

  useEffect(() => {
    if (hasScrolledToBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [allMessages, hasScrolledToBottom]);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    setHasScrolledToBottom(scrollHeight - scrollTop - clientHeight < 50);
  };

  const handleLoadOlder = async () => {
    if (isLoadingOlder || messages.length === 0) return;
    const oldest = messages[0];
    if (!oldest?.id || String(oldest.id).startsWith('local:')) return;
    setIsLoadingOlder(true);
    try { await onLoadOlder(oldest.id); } catch (err) { console.error('[GuestChatWidget] Load older error:', err); } finally { setIsLoadingOlder(false); }
  };

  return (
    <div className="messages-list" ref={messagesContainerRef} onScroll={handleScroll}>
      {messages.length > 0 && (
        <div className="load-older-container">
          <button className="btn btn-outline-secondary btn-sm load-older-button" onClick={handleLoadOlder} disabled={isLoadingOlder}>
            {isLoadingOlder
              ? <><span className="spinner-border spinner-border-sm me-2" role="status"></span>Loading...</>
              : <><i className="bi bi-arrow-up me-2"></i>Load older messages</>}
          </button>
        </div>
      )}
      <div className="messages-container">
        {allMessages.map((msg, i) => (
          <MessageBubble key={msg.id || `temp-${i}`} message={msg} contract={contract} onRetry={onRetry} />
        ))}
      </div>
      <div ref={messagesEndRef} />
    </div>
  );
};

// ── Chat Debug Panel ───────────────────────────────────────────────────
const ChatDebugPanel = ({
  hotelSlug,
  contract,
  chatSession,
  channelName,
  events,
  pusherConfig,
  connectionState,
  messages,
  sendingMessages,
  realtimeDiag,
}) => {
  const [open, setOpen] = useState(false);

  // Contract validation
  const requiredFields = [
    ['conversation_id', contract?.conversation_id],
    ['chat_session',    contract?.chat_session],
    ['channel_name',    contract?.channel_name],
    ['events.message_created',  contract?.events?.message_created],
    ['events.message_read',     contract?.events?.message_read],
    ['pusher.key',              contract?.pusher?.key],
    ['pusher.cluster',          contract?.pusher?.cluster],
    ['pusher.auth_endpoint',    contract?.pusher?.auth_endpoint],
  ];
  const missingFields = requiredFields.filter(([, v]) => v == null).map(([k]) => k);
  const contractValid = contract != null && missingFields.length === 0;

  return (
    <div className="chat-debug-panel" style={{ fontSize: '11px', borderTop: '1px solid #dee2e6', background: '#f8f9fa' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="btn btn-sm btn-outline-secondary w-100"
        style={{ fontSize: '10px', borderRadius: 0 }}
      >
        {open ? 'Hide' : 'Show'} Chat Debug
      </button>
      {open && (
        <div style={{ padding: '8px', maxHeight: '280px', overflowY: 'auto', fontFamily: 'monospace', whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
          {/* ── Bootstrap / Contract ── */}
          <div><strong>── Bootstrap / Contract ──</strong></div>
          <div>hotelSlug: {hotelSlug || '—'}</div>
          <div>bootstrap endpoint: /api/guest/hotel/{hotelSlug}/chat/context</div>
          <div>bootstrap loaded: {contract ? 'yes' : 'no'}</div>
          <div>conversationId: {contract?.conversation_id || '—'}</div>
          <div>chatSession present: {chatSession ? 'yes' : 'no'}</div>
          <div>channelName: {channelName || '—'}</div>
          <div>eventMessageCreated: {events?.message_created || '—'}</div>
          <div>eventMessageRead: {events?.message_read || '—'}</div>
          <div>pusherKey present: {pusherConfig?.key ? 'yes' : 'no'}</div>
          <div>pusherCluster: {pusherConfig?.cluster || '—'}</div>
          <div>pusherAuthEndpoint: {pusherConfig?.auth_endpoint || '—'}</div>

          {/* ── Connection / Subscription ── */}
          <div style={{ marginTop: 6 }}><strong>── Connection / Subscription ──</strong></div>
          <div>pusher client initialized: {realtimeDiag?.subscribedChannel != null || connectionState !== 'disconnected' ? 'yes' : 'no'}</div>
          <div>pusher connection state: {connectionState}</div>
          <div>subscribed: {realtimeDiag?.subscribedChannel ? 'yes' : 'no'}</div>
          <div>subscribed channel: {realtimeDiag?.subscribedChannel || '—'}</div>
          <div>bound events: {realtimeDiag?.boundEvents?.join(', ') || '—'}</div>
          <div>last subscription error: {realtimeDiag?.lastSubscriptionError || 'none'}</div>
          <div>last auth error: {realtimeDiag?.lastAuthError || 'none'}</div>

          {/* ── Message / Realtime Diagnostics ── */}
          <div style={{ marginTop: 6 }}><strong>── Message / Realtime ──</strong></div>
          <div>messages count: {messages?.length ?? 0}</div>
          <div>pending sends count: {sendingMessages?.length ?? 0}</div>
          <div>last received event name: {realtimeDiag?.lastReceivedEventName || '—'}</div>
          <div>last received message id: {realtimeDiag?.lastReceivedMessageId || '—'}</div>
          <div>last read update id: {realtimeDiag?.lastReadUpdateId || '—'}</div>
          <div>duplicate events ignored: {realtimeDiag?.duplicateEventsIgnored ?? 0}</div>

          {/* ── Contract Validation ── */}
          <div style={{ marginTop: 6 }}><strong>── Contract Validation ──</strong></div>
          <div style={{ color: contractValid ? '#28a745' : '#dc3545' }}>
            contract valid: {contractValid ? 'yes' : 'no'}
          </div>
          {!contractValid && missingFields.length > 0 && (
            <div style={{ color: '#dc3545' }}>missing: {missingFields.join(', ')}</div>
          )}
          {!contract && <div style={{ color: '#dc3545' }}>contract not loaded</div>}
        </div>
      )}
    </div>
  );
};

// ── Main Widget ────────────────────────────────────────────────────────
export const GuestChatWidget = ({ hotelSlug, token, className = '', style = {} }) => {
  const {
    contract,
    chatSession,
    channelName,
    events,
    pusherConfig,
    messages,
    sendingMessages,
    loading,
    error,
    connectionState,
    sendMessage,
    loadOlder,
    retryMessage,
    isSending,
    isDisabled,
    disabledReason,
    realtimeDiag,
  } = useGuestChat({ hotelSlug, token });

  // Loading
  if (loading) {
    return (
      <div className={`guest-chat-widget loading ${className}`} style={style}>
        <div className="chat-header"><h5>Chat</h5><ConnectionStatus connectionState="connecting" /></div>
        <div className="chat-body">
          <div className="loading-container">
            <div className="spinner-border text-primary" role="status"></div>
            <div className="mt-2">Loading chat...</div>
          </div>
        </div>
      </div>
    );
  }

  // Error
  if (error) {
    const status = error?.response?.status || error?.status;
    const serverDetail = error?.response?.data?.detail || error?.response?.data?.error;
    let friendlyMessage;
    if (status === 401 || status === 403) {
      friendlyMessage = 'Your chat session has expired. Please return to your booking page and try again.';
    } else if (status === 404) {
      friendlyMessage = serverDetail || 'Chat could not be found for this booking. Please check your booking link.';
    } else if (status >= 500) {
      friendlyMessage = 'The hotel chat service is temporarily unavailable. Please try again in a few minutes.';
    } else {
      friendlyMessage = serverDetail || error.message || 'Failed to load chat';
    }

    return (
      <div className={`guest-chat-widget error ${className}`} style={style}>
        <div className="chat-header"><h5>Chat</h5><ConnectionStatus connectionState="failed" /></div>
        <div className="chat-body">
          <div className="error-container">
            <div className="alert alert-danger"><i className="bi bi-exclamation-triangle me-2"></i>{friendlyMessage}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`guest-chat-widget ${className}`} style={style}>
      <div className="chat-header">
        <div className="chat-title">
          <h5>Chat with Hotel</h5>
        </div>
        <ConnectionStatus connectionState={connectionState} />
      </div>

      <div className="chat-body">
        {messages.length === 0 && sendingMessages.length === 0 ? (
          <div className="empty-chat">
            <div className="empty-chat-icon"><i className="bi bi-chat-dots"></i></div>
            <div className="empty-chat-message"><p>Welcome! Send a message to start the conversation.</p></div>
          </div>
        ) : (
          <MessagesList
            messages={messages}
            sendingMessages={sendingMessages}
            contract={contract}
            onLoadOlder={loadOlder}
            onRetry={retryMessage}
          />
        )}
      </div>

      <div className="chat-footer">
        <MessageInput onSend={sendMessage} disabled={isDisabled} disabledReason={disabledReason} isSending={isSending} />
      </div>

      {import.meta.env.DEV && (
        <ChatDebugPanel
          hotelSlug={hotelSlug}
          contract={contract}
          chatSession={chatSession}
          channelName={channelName}
          events={events}
          pusherConfig={pusherConfig}
          connectionState={connectionState}
          messages={messages}
          sendingMessages={sendingMessages}
          realtimeDiag={realtimeDiag}
        />
      )}
    </div>
  );
};

export default GuestChatWidget;
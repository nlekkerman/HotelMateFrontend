/**
 * Guest Chat Widget Component — LOCKED BACKEND CONTRACT
 *
 * Renders messages, input, connection status, and a chat-focused debug panel.
 * All business logic lives in useGuestChat; this file is rendering only.
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useGuestChat } from '../../hooks/useGuestChat';
import './GuestChatWidget.css';

// ── Grouping helpers ───────────────────────────────────────────────────
const TIME_GAP_MS = 5 * 60 * 1000; // 5 minutes

/** Build the metadata label for a message */
function buildMetaLabel(message, roomNumber) {
  const senderType = message.sender_type || message.sender_role;
  if (senderType === 'guest') {
    return roomNumber ? `You · Room ${roomNumber}` : 'You';
  }
  if (senderType === 'staff') {
    const name = message.staff_display_name || message.sender_name || 'Staff';
    const role = message.staff_role_name
      || message.staff_info?.role
      || null;
    return role ? `${name} · ${role}` : name;
  }
  return null; // system messages don't get metadata
}

/**
 * Determine which messages should show a metadata row above the bubble.
 * Returns a Set of message indices that need the label.
 */
function computeShowMetaIndices(messages) {
  const indices = new Set();
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    const senderType = msg.sender_type || msg.sender_role;
    if (senderType === 'system') continue;

    if (i === 0) { indices.add(i); continue; }

    const prev = messages[i - 1];
    const prevSenderType = prev.sender_type || prev.sender_role;

    // Sender changed
    if (senderType !== prevSenderType) { indices.add(i); continue; }

    // Same sender but different staff member
    if (senderType === 'staff') {
      const curName = msg.staff_display_name || msg.sender_name;
      const prevName = prev.staff_display_name || prev.sender_name;
      if (curName !== prevName) { indices.add(i); continue; }
    }

    // Time gap > 5 minutes
    const tCur = new Date(msg.timestamp || msg.created_at).getTime();
    const tPrev = new Date(prev.timestamp || prev.created_at).getTime();
    if (tCur - tPrev > TIME_GAP_MS) { indices.add(i); }
  }
  return indices;
}

// ── MessageBubble ──────────────────────────────────────────────────────
const MessageBubble = ({ message, contract, onRetry, showMeta, metaLabel, isFirstInGroup }) => {
  const senderType = message.sender_type || message.sender_role;
  const isGuest = senderType === 'guest';
  const isSystem = senderType === 'system';
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
    <div className={`message-wrapper ${isGuest ? 'guest-side' : 'staff-side'}${isFirstInGroup ? ' group-start' : ''}`}>
      {showMeta && metaLabel && (
        <div className={`message-meta ${isGuest ? 'meta-guest' : 'meta-staff'}`}>
          {metaLabel}
        </div>
      )}
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
            {message.is_edited && <span className="edited-indicator" title="Edited"><i className="bi bi-pencil"></i></span>}
            <span className="message-timestamp">
              {new Date(message.timestamp || message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {isGuest && message.status === 'delivered' && (
              <span className="read-receipt" title={message.read_by_staff ? 'Seen' : 'Delivered'}>
                {message.read_by_staff
                  ? <i className="bi bi-check2-all" style={{ color: '#0d6efd' }}></i>
                  : <i className="bi bi-check2"></i>}
              </span>
            )}
          </div>
        </div>
        {isSending && (
          <div className="sending-indicator">
            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
            <small className="text-muted">Sending message...</small>
          </div>
        )}
      </div>
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

  const roomNumber = contract?.room_number || null;

  const allMessages = useMemo(() =>
    [...messages, ...sendingMessages].sort((a, b) => {
      const tA = new Date(a.timestamp || a.created_at).getTime();
      const tB = new Date(b.timestamp || b.created_at).getTime();
      return tA !== tB ? tA - tB : (a.id || 0) - (b.id || 0);
    }), [messages, sendingMessages]);

  const showMetaIndices = useMemo(() => computeShowMetaIndices(allMessages), [allMessages]);

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
        {allMessages.map((msg, i) => {
          const showMeta = showMetaIndices.has(i);
          const metaLabel = showMeta ? buildMetaLabel(msg, roomNumber) : null;
          return (
            <MessageBubble
              key={msg.id || `temp-${i}`}
              message={msg}
              contract={contract}
              onRetry={onRetry}
              showMeta={showMeta}
              metaLabel={metaLabel}
              isFirstInGroup={showMeta}
            />
          );
        })}
      </div>
      <div ref={messagesEndRef} />
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
    </div>
  );
};

export default GuestChatWidget;
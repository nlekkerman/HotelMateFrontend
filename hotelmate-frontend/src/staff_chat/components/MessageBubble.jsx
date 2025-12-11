import React from 'react';
import PropTypes from 'prop-types';
import MessageEditor from './MessageEditor';
import MessageAttachments from './MessageAttachments';

/**
 * MessageBubble Component
 * Displays a single message with reply preview and editing support
 */
const MessageBubble = ({
  message,
  timestamp,
  isOwn = false,
  senderName = null,
  senderAvatar = null,
  replyTo = null,
  isEdited = false,
  isDeleted = false,
  attachments = [],
  isEditing = false,
  readByList = [],
  readByCount = 0,
  isSending = false,
  onSaveEdit = null,
  onCancelEdit = null,
  onReply = null,
  onReaction = null,
  onShare = null,
  onDelete = null,
  reactions = null,
}) => {
  const messageText = message || '';
  const messageTime = timestamp;
  const displayName = isOwn ? 'You' : senderName;

  // Removed debug logging for performance

  // If in editing mode, show the editor
  if (isEditing) {
    return (
      <MessageEditor
        initialText={messageText}
        onSave={onSaveEdit}
        onCancel={onCancelEdit}
      />
    );
  }

  // Determine deleted message display text
  const getDeletedText = () => {
    if (!isDeleted) return null;
    
    const hasAttachments = attachments && attachments.length > 0;
    const hasText = messageText && 
                    messageText !== '[File shared]' && 
                    !messageText.includes('[Message deleted]') &&
                    !messageText.includes('[File deleted]');
    
    if (hasText && hasAttachments) {
      return 'Message and file(s) deleted';
    } else if (hasAttachments) {
      return 'File deleted';
    } else {
      return 'Message deleted';
    }
  };

  const deletedText = getDeletedText();

  // Debug logging for deleted messages
  if (isDeleted) {
    // console.log('🗑️ MessageBubble - Rendering deleted message:', {
    //   isDeleted,
    //   deletedText,
    //   messageText,
    //   hasAttachments: attachments?.length > 0
    // });
  }

  return (
    <>
      {/* Sender Name ABOVE Bubble */}
      {displayName && (
        <div className="staff-chat-message__sender-name">
          {displayName}
        </div>
      )}

      {/* Bubble Container with Reply Button */}
      <div className="staff-chat-message__bubble-container">
        {/* Reply Button (outside bubble) */}
        <button 
          className="staff-chat-message__reply-btn"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            //
            // console.log('🔘 onReply function:', onReply);
            // console.log('🔘 onReply toString:', onReply.toString());
            if (onReply) {
              //
              onReply();
              //
            } else {
              console.error('❌ onReply is not defined!');
            }
          }}
          title="Reply"
          type="button"
        >
          <i className="bi bi-reply"></i>
        </button>

        {/* Message Bubble */}
        <div className={`staff-chat-message__bubble ${isDeleted ? 'staff-chat-message__bubble--deleted' : ''}`}>
          {/* Reply Preview (if replying to another message) */}
          {replyTo && (
            <div className="staff-chat-message__reply-preview">
              {/* Sender Avatar */}
              <div className="staff-chat-message__reply-avatar">
                {(replyTo.sender_avatar || replyTo.avatar) ? (
                  <img 
                    src={replyTo.sender_avatar || replyTo.avatar} 
                    alt={replyTo.sender_name || replyTo.sender_info?.full_name || 'User'}
                    className="staff-chat-message__reply-avatar-img"
                    onError={(e) => {
                      e.target.style.display = 'none';
                      e.target.nextSibling.style.display = 'flex';
                    }}
                  />
                ) : null}
                <div className={`staff-chat-message__reply-avatar-initial ${(replyTo.sender_avatar || replyTo.avatar) ? 'hidden' : ''}`}>
                  {(replyTo.sender_name || replyTo.sender_info?.full_name || 'U').charAt(0).toUpperCase()}
                </div>
              </div>
              
              <div className="staff-chat-message__reply-content">
                <div className="staff-chat-message__reply-label">
                  Replied to {replyTo.sender_name || replyTo.sender_info?.full_name || 'User'}
                </div>
{(() => {
                  if (replyTo.is_deleted) {
                    return (
                      <div className="staff-chat-message__reply-text text-muted fst-italic">
                        [Message deleted]
                      </div>
                    );
                  }
                  
                  const messageText = replyTo.message || replyTo.content || '';
                  const hasAttachments = (replyTo.images || replyTo.attachments || replyTo.attachments_preview || []).length > 0;
                  
                  // Only hide text if it's EXACTLY "[File shared]" and we have attachments to show
                  const shouldHideText = hasAttachments && messageText.trim() === '[File shared]';
                  
                  if (shouldHideText) {
                    return null; // Don't render text div at all for "[File shared]"
                  }
                  
                  // Show text if it has actual content or if there are no attachments
                  if (messageText.trim()) {
                    return (
                      <div className="staff-chat-message__reply-text">
                        {messageText.substring(0, 50)}
                        {messageText.length > 50 ? '...' : ''}
                      </div>
                    );
                  }
                  
                  return null; // Don't show empty text
                })()}

                {/* Show image attachments in reply preview */}
                {!replyTo.is_deleted && (replyTo.images || replyTo.attachments || replyTo.attachments_preview) && (replyTo.images || replyTo.attachments || replyTo.attachments_preview).length > 0 && (
                  <div className="staff-chat-message__reply-attachments">
                    {(replyTo.images || replyTo.attachments || replyTo.attachments_preview || []).slice(0, 2).map((att, idx) => {
                      const isImage = att.file_type === 'image' || att.mime_type?.startsWith('image/') || 
                                    /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(att.file_name || att.filename);
                      
                      if (isImage) {
                        // Use thumbnail URL if available for smaller preview, otherwise use full image
                        const imageUrl = att.thumbnail_url || att.image_url || att.file_url || att.url;
                        return (
                          <img
                            key={idx}
                            src={imageUrl}
                            alt={att.file_name || att.filename || 'Image'}
                            className="staff-chat-message__reply-attachment-thumbnail"
                            onError={(e) => {
                              // Fallback to full image if thumbnail fails
                              const fallbackUrl = att.image_url || att.file_url || att.url;
                              if (fallbackUrl && e.target.src !== fallbackUrl) {
                                e.target.src = fallbackUrl;
                              }
                            }}
                          />
                        );
                      } else {
                        return (
                          <div
                            key={idx}
                            className="staff-chat-message__reply-attachment-file"
                            title={att.file_name || att.filename}
                          >
                            📎
                          </div>
                        );
                      }
                    })}
                    {(replyTo.attachments || replyTo.attachments_preview || []).length > 2 && (
                      <div className="staff-chat-message__reply-attachment-count">
                        +{(replyTo.attachments || replyTo.attachments_preview || []).length - 2}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
          
          {/* Deleted Message Display - Nice Rounded Badge */}
          {isDeleted ? (
            <div className="staff-chat-message__deleted-badge">
              <i className="bi bi-trash"></i>
              <span>{deletedText}</span>
            </div>
          ) : (
            <>
              {/* Message Text (only show if there's text and it's not just "[File shared]") */}
              {messageText && messageText !== '[File shared]' && (
                <div>
                  {/* Show "Forwarded" badge if message starts with forwarding indicator */}
                  {messageText.startsWith('📤 Forwarded') && (
                    <div className="text-white mb-2" style={{ fontSize: '0.75rem', fontStyle: 'italic' }}>
                      <i className="bi bi-arrow-right-circle me-1"></i>
                      Forwarded
                    </div>
                  )}
                  <p className="staff-chat-message__text">
                    {/* Remove the "📤 Forwarded" prefix from display if present */}
                    {messageText.startsWith('📤 Forwarded') 
                      ? messageText.replace('📤 Forwarded', '').trim()
                      : messageText
                    }
                    {isEdited && (
                      <span className="staff-chat-message__edited-badge"> (edited)</span>
                    )}
                  </p>
                </div>
              )}

              {/* Attachments */}
              {attachments && attachments.length > 0 && (
                <MessageAttachments
                  attachments={attachments}
                  canDelete={isOwn}
                />
              )}
            </>
          )}

          {/* Timestamp inside bubble */}
          <div className="staff-chat-message__bubble-footer">
            {/* Timestamp */}
            {messageTime && (
              <span className="staff-chat-message__time">
                {new Date(messageTime).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
            
            {/* Message Status Labels - Only for own messages */}
            {isOwn && !isDeleted && (
              <div className="message-status" style={{
                fontSize: '10px',
                marginLeft: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                color: isSending ? '#6c757d' : (readByCount > 0 ? '#fd790dff' : '#f7f7f7ff'),
                fontWeight: '500'
              }}>

                {isSending ? (
                  // Sending...
                  <>
                    <i className="bi bi-clock" style={{ fontSize: '10px' }}></i>
                    <span style={{ fontStyle: 'italic' }}>Sending</span>
                  </>
                ) : readByCount > 0 ? (
                  // Seen with avatars
                  <>
                    {readByList.length > 0 && (
                      <div className="staff-chat-message__read-avatars" style={{
                        display: 'flex',
                        alignItems: 'center',
                        marginRight: '2px'
                      }}>
                        {readByList.slice(0, 3).map((reader, index) => (
                          <div
                            key={reader.id || index}
                            className="staff-chat-message__read-avatar"
                            title={reader.name || reader.staff_name || reader.sender_name || 'User'}
                            style={{
                              marginLeft: index > 0 ? '-8px' : '0',
                              zIndex: readByList.length - index
                            }}
                          >
                            {(reader.avatar || reader.sender_avatar || reader.staff_avatar) ? (
                              <img 
                                src={reader.avatar || reader.sender_avatar || reader.staff_avatar} 
                                alt={reader.name || reader.staff_name || reader.sender_name}
                                style={{
                                  width: '14px',
                                  height: '14px',
                                  borderRadius: '50%',
                                  border: '1px solid white',
                                  objectFit: 'cover'
                                }}
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                  e.target.nextSibling.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div
                              style={{
                                width: '14px',
                                height: '14px',
                                borderRadius: '50%',
                                border: '1px solid white',
                                backgroundColor: '#0d6efd',
                                color: 'white',
                                fontSize: '7px',
                                display: (reader.avatar || reader.sender_avatar || reader.staff_avatar) ? 'none' : 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 'bold'
                              }}
                            >
                              {(reader.name || reader.staff_name || reader.sender_name || 'U').charAt(0).toUpperCase()}
                            </div>
                          </div>
                        ))}
                        {readByCount > 3 && (
                          <div
                            className="staff-chat-message__read-avatar"
                            style={{
                              marginLeft: '-8px',
                              zIndex: 0,
                              width: '14px',
                              height: '14px',
                              borderRadius: '50%',
                              border: '1px solid white',
                              backgroundColor: '#6c757d',
                              color: 'white',
                              fontSize: '7px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 'bold'
                            }}
                          >
                            +{readByCount - 3}
                          </div>
                        )}
                      </div>
                    )}
                    <i className="bi bi-check2-all" style={{ fontSize: '11px' }}></i>
                    <span>Seen</span>
                  </>
                ) : (
                  // Delivered
                  <>
                    <i className="bi bi-check2-all" style={{ fontSize: '11px' }}></i>
                    <span>Delivered</span>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reactions UNDER Bubble, ABOVE Footer */}
      {reactions && (
        <div className="staff-chat-message__reactions-wrapper">
          {reactions}
        </div>
      )}

      {/* Message Footer BELOW Reactions - Don't show actions for deleted messages */}
      {!isDeleted && (
        <div className="staff-chat-message__footer">
          {/* Footer Actions - Order differs for own vs other messages */}
          <div className="staff-chat-message__footer-actions">
            {isOwn ? (
              // Own messages: Reaction, Share, Delete
              <>
                {/* Reaction Button */}
                {onReaction && (
                  <button 
                    className="staff-chat-message__reaction-btn"
                    onClick={onReaction}
                    title="React"
                  >
                    <i className="bi bi-emoji-smile"></i>
                  </button>
                )}
                {/* Forward */}
                {onShare && (
                  <a 
                    href="#" 
                    className="staff-chat-message__action-link"
                    onClick={(e) => {
                      e.preventDefault();
                      onShare();
                    }}
                  >
                    Forward
                  </a>
                )}
                {/* Delete */}
                {onDelete && (
                  <a 
                    href="#" 
                    className="staff-chat-message__action-link"
                    onClick={(e) => {
                      e.preventDefault();
                      onDelete();
                    }}
                  >
                    Delete
                  </a>
                )}
              </>
            ) : (
              // Other people's messages: Forward, Reaction ONLY (NO DELETE)
              <>
                {/* Forward */}
                {onShare && (
                  <a 
                    href="#" 
                    className="staff-chat-message__action-link"
                    onClick={(e) => {
                      e.preventDefault();
                      onShare();
                    }}
                  >
                    Forward
                  </a>
                )}
                {/* Reaction Button */}
                {onReaction && (
                  <button 
                    className="staff-chat-message__reaction-btn"
                    onClick={onReaction}
                    title="React"
                  >
                    <i className="bi bi-emoji-smile"></i>
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

MessageBubble.propTypes = {
  /** Message text content */
  message: PropTypes.string.isRequired,
  /** Message timestamp */
  timestamp: PropTypes.string,
  /** Whether this is the current user's message */
  isOwn: PropTypes.bool,
  /** Sender's name to display */
  senderName: PropTypes.string,
  /** Sender's avatar URL */
  senderAvatar: PropTypes.string,
  /** Reply information if this is a reply */
  replyTo: PropTypes.shape({
    id: PropTypes.number,
    message: PropTypes.string,
    content: PropTypes.string,
    sender_name: PropTypes.string,
    sender_info: PropTypes.shape({
      full_name: PropTypes.string
    }),
    is_deleted: PropTypes.bool
  }),
  /** Whether the message has been edited */
  isEdited: PropTypes.bool,
  /** Whether the message has been deleted */
  isDeleted: PropTypes.bool,
  /** Array of file attachments */
  attachments: PropTypes.array,
  /** Whether currently editing this message */
  isEditing: PropTypes.bool,
  /** List of users who have read this message */
  readByList: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.number,
    name: PropTypes.string,
    avatar: PropTypes.string
  })),
  /** Total number of users who have read this message */
  readByCount: PropTypes.number,
  /** Whether message is currently being sent */
  isSending: PropTypes.bool,
  /** Callback to save edited message */
  onSaveEdit: PropTypes.func,
  /** Callback to cancel editing */
  onCancelEdit: PropTypes.func,
  /** Callback to reply to message */
  onReply: PropTypes.func,
  /** Callback to add reaction */
  onReaction: PropTypes.func,
  /** Callback to share message */
  onShare: PropTypes.func,
  /** Callback to delete message */
  onDelete: PropTypes.func,
  /** Reactions component to render inside bubble */
  reactions: PropTypes.node
};

export default React.memo(MessageBubble);

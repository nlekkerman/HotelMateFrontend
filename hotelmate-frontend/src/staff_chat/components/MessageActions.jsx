import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown } from 'react-bootstrap';

/**
 * MessageActions Component
 * Action menu for messages (edit, delete, reply)
 */
const MessageActions = ({
  message,
  isOwn = false,
  canEdit = false,
  canDelete = false,
  canHardDelete = false,
  onEdit = null,
  onDelete = null,
  onHardDelete = null,
  onReply = null,
  deleting = false,
}) => {
  const isDeleted = message.is_deleted || false;

  // Don't show actions for deleted messages
  if (isDeleted) {
    return null;
  }

  const hasActions = 
    (isOwn && canEdit && onEdit) ||
    (isOwn && canDelete && onDelete) ||
    (canHardDelete && onHardDelete) ||
    onReply;

  if (!hasActions) {
    return null;
  }

  return (
    <div className="message-actions-menu">
      <Dropdown>
        <Dropdown.Toggle
          variant="link"
          className="message-actions-menu__toggle"
          disabled={deleting}
        >
          <i className="bi bi-three-dots-vertical"></i>
        </Dropdown.Toggle>

        <Dropdown.Menu align="end" className="message-actions-menu__menu">
          {/* Reply */}
          {onReply && (
            <Dropdown.Item onClick={() => onReply(message)}>
              <i className="bi bi-reply me-2"></i>
              Reply
            </Dropdown.Item>
          )}

          {/* Edit (own messages only) */}
          {isOwn && canEdit && onEdit && (
            <Dropdown.Item onClick={() => onEdit(message)}>
              <i className="bi bi-pencil me-2"></i>
              Edit
            </Dropdown.Item>
          )}

          {/* Soft Delete (own messages) */}
          {isOwn && canDelete && onDelete && (
            <Dropdown.Item
              onClick={() => onDelete(message.id, false)}
              className="text-warning"
            >
              <i className="bi bi-trash me-2"></i>
              Delete
            </Dropdown.Item>
          )}

          {/* Hard Delete (managers/admins only) */}
          {canHardDelete && onHardDelete && (
            <>
              <Dropdown.Divider />
              <Dropdown.Item
                onClick={() => onHardDelete(message.id, true)}
                className="text-danger"
              >
                <i className="bi bi-trash-fill me-2"></i>
                Delete Permanently
              </Dropdown.Item>
            </>
          )}
        </Dropdown.Menu>
      </Dropdown>
    </div>
  );
};

MessageActions.propTypes = {
  message: PropTypes.shape({
    id: PropTypes.number.isRequired,
    is_deleted: PropTypes.bool,
  }).isRequired,
  isOwn: PropTypes.bool,
  canEdit: PropTypes.bool,
  canDelete: PropTypes.bool,
  canHardDelete: PropTypes.bool,
  onEdit: PropTypes.func,
  onDelete: PropTypes.func,
  onHardDelete: PropTypes.func,
  onReply: PropTypes.func,
  deleting: PropTypes.bool,
};

export default MessageActions;

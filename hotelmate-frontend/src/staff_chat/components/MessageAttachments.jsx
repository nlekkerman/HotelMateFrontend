import React from 'react';
import PropTypes from 'prop-types';

/**
 * MessageAttachments Component
 * Displays file attachments in a message
 */
const MessageAttachments = ({
  attachments = [],
  onDelete = null,
  canDelete = false,
}) => {
  if (!attachments || attachments.length === 0) {
    return null;
  }

  const getFileIcon = (fileType) => {
    const type = fileType?.toLowerCase() || '';
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(type)) {
      return 'bi-file-image';
    }
    if (type === 'pdf') {
      return 'bi-file-pdf';
    }
    if (['doc', 'docx'].includes(type)) {
      return 'bi-file-word';
    }
    if (['xls', 'xlsx'].includes(type)) {
      return 'bi-file-excel';
    }
    if (type === 'txt') {
      return 'bi-file-text';
    }
    return 'bi-file-earmark';
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const isImage = (attachment) => {
    // Check file_type field
    const type = attachment.file_type?.toLowerCase() || '';
    if (type === 'image' || type.startsWith('image/')) {
      return true;
    }
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(type)) {
      return true;
    }
    
    // Check file extension from file_name
    if (attachment.file_name) {
      const ext = attachment.file_name.split('.').pop().toLowerCase();
      if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) {
        return true;
      }
    }
    
    // Check mime_type if available
    if (attachment.mime_type?.startsWith('image/')) {
      return true;
    }
    
    return false;
  };

  return (
    <div className="message-attachments">
      {attachments.map((attachment) => {
        const isImg = isImage(attachment);

        return (
          <div key={attachment.id} className="message-attachments__item">
            {isImg && attachment.file_url ? (
              // Image Preview
              <a
                href={attachment.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="message-attachments__image-link"
              >
                <img
                  src={attachment.thumbnail || attachment.file_url}
                  alt={attachment.file_name}
                  className="message-attachments__image"
                />
              </a>
            ) : (
              // File Link
              <a
                href={attachment.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="message-attachments__file-link"
              >
                <i className={`bi ${getFileIcon(attachment.file_type)} message-attachments__file-icon`}></i>
                <div className="message-attachments__file-info">
                  <div className="message-attachments__file-name">
                    {attachment.file_name}
                  </div>
                  {attachment.file_size && (
                    <div className="message-attachments__file-size">
                      {formatFileSize(attachment.file_size)}
                    </div>
                  )}
                </div>
                <i className="bi bi-download message-attachments__download-icon"></i>
              </a>
            )}

            {/* Delete Button */}
            {canDelete && onDelete && (
              <button
                className="message-attachments__delete-btn"
                onClick={() => onDelete(attachment.id)}
                title="Delete attachment"
              >
                <i className="bi bi-x"></i>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};

MessageAttachments.propTypes = {
  attachments: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.number.isRequired,
      file_name: PropTypes.string.isRequired,
      file_type: PropTypes.string,
      file_size: PropTypes.number,
      file_url: PropTypes.string.isRequired,
      thumbnail: PropTypes.string,
    })
  ),
  onDelete: PropTypes.func,
  canDelete: PropTypes.bool,
};

export default MessageAttachments;

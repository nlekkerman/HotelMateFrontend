import React, { useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Spinner } from 'react-bootstrap';

/**
 * MessageEditor Component
 * Inline message editor
 */
const MessageEditor = ({
  value,
  onChange,
  onSave,
  onCancel,
  saving = false,
  error = null,
}) => {
  const textareaRef = useRef(null);

  // Focus on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (onSave && value.trim()) {
        onSave();
      }
    }
    
    if (e.key === 'Escape') {
      e.preventDefault();
      if (onCancel) {
        onCancel();
      }
    }
  };

  return (
    <div className="message-editor">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className="message-editor__textarea"
        disabled={saving}
        rows="1"
        maxLength={5000}
      />

      {error && (
        <div className="message-editor__error">
          <i className="bi bi-exclamation-triangle me-1"></i>
          {error}
        </div>
      )}

      <div className="message-editor__actions">
        <button
          type="button"
          className="message-editor__btn message-editor__btn--cancel"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="button"
          className="message-editor__btn message-editor__btn--save"
          onClick={onSave}
          disabled={!value.trim() || saving}
        >
          {saving ? (
            <>
              <Spinner animation="border" size="sm" className="me-1" />
              Saving...
            </>
          ) : (
            <>
              <i className="bi bi-check me-1"></i>
              Save
            </>
          )}
        </button>
      </div>

      <div className="message-editor__hint">
        <small>Press Enter to save • Esc to cancel</small>
      </div>
    </div>
  );
};

MessageEditor.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  saving: PropTypes.bool,
  error: PropTypes.string,
};

export default MessageEditor;

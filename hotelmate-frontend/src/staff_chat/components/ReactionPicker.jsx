import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { OverlayTrigger, Tooltip } from 'react-bootstrap';

/**
 * ReactionPicker Component
 * Emoji picker for adding reactions to messages
 * Shows on hover or click with smooth animation
 */
const ReactionPicker = ({ onSelectEmoji, show, onClose, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(show);
  const pickerRef = useRef(null);

  // Available emoji reactions (displayed in rows of 3)
  const emojis = [
    { emoji: '👍', label: 'Thumbs Up' },
    { emoji: '❤️', label: 'Heart' },
    { emoji: '😂', label: 'Laughing' },
    { emoji: '😮', label: 'Surprised' },
    { emoji: '😢', label: 'Sad' },
    { emoji: '🙏', label: 'Thank You' },
    { emoji: '🎉', label: 'Celebration' },
    { emoji: '🔥', label: 'Fire' }
  ];

  useEffect(() => {
    setIsVisible(show);
  }, [show]);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target)) {
        if (onClose) onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isVisible, onClose]);

  // Handle emoji selection
  const handleEmojiClick = (emoji) => {
    if (onSelectEmoji) {
      onSelectEmoji(emoji);
    }
    if (onClose) onClose();
  };

  // Handle keyboard navigation
  const handleKeyDown = (e, emoji) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleEmojiClick(emoji);
    }
  };

  if (!isVisible) return null;

  return (
    <div 
      ref={pickerRef}
      className={`reaction-picker reaction-picker-${position}`}
      role="dialog"
      aria-label="Select a reaction"
    >
      <div className="reaction-picker-emojis">
        {emojis.map(({ emoji, label }) => (
          <OverlayTrigger
            key={emoji}
            placement="top"
            overlay={<Tooltip id={`tooltip-${emoji}`}>{label}</Tooltip>}
          >
            <button
              type="button"
              className="reaction-emoji-btn"
              onClick={() => handleEmojiClick(emoji)}
              onKeyDown={(e) => handleKeyDown(e, emoji)}
              aria-label={label}
              title={label}
            >
              {emoji}
            </button>
          </OverlayTrigger>
        ))}
      </div>
    </div>
  );
};

ReactionPicker.propTypes = {
  /** Callback when an emoji is selected */
  onSelectEmoji: PropTypes.func.isRequired,
  /** Whether the picker is visible */
  show: PropTypes.bool,
  /** Callback when picker should close */
  onClose: PropTypes.func,
  /** Position of the picker relative to trigger (top, bottom, left, right) */
  position: PropTypes.oneOf(['top', 'bottom', 'left', 'right'])
};

ReactionPicker.defaultProps = {
  show: false,
  onClose: null,
  position: 'top'
};

export default ReactionPicker;

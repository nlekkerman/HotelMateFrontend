import React from 'react';
import PropTypes from 'prop-types';

/**
 * SearchInput Component
 * Reusable search input for staff filtering
 */
const SearchInput = ({ 
  value, 
  onChange, 
  onClear, 
  placeholder = 'Search staff...', 
  disabled = false 
}) => {
  const handleChange = (e) => {
    onChange(e.target.value);
  };

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else {
      onChange('');
    }
  };

  return (
    <div className="search-input-wrapper">
      <div className="search-input">
        <svg 
          className="search-input__icon" 
          width="20" 
          height="20" 
          viewBox="0 0 20 20" 
          fill="none"
        >
          <path 
            d="M9 17A8 8 0 1 0 9 1a8 8 0 0 0 0 16zM19 19l-4.35-4.35" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
        <input
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          disabled={disabled}
          className="search-input__field"
        />
        {value && (
          <button 
            type="button"
            onClick={handleClear}
            className="search-input__clear"
            aria-label="Clear search"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path 
                d="M12 4L4 12M4 4l8 8" 
                stroke="currentColor" 
                strokeWidth="2" 
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

SearchInput.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onClear: PropTypes.func,
  placeholder: PropTypes.string,
  disabled: PropTypes.bool
};

export default SearchInput;

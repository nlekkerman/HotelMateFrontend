import React from 'react';
import PropTypes from 'prop-types';

/**
 * SectionHeader Component
 * Universal header component that adapts to preset configurations
 * 
 * @param {Object} props - Component props
 * @param {string} props.title - Section title
 * @param {string} props.subtitle - Optional subtitle
 * @param {Object} props.preset - Section header preset configuration
 */
const SectionHeader = ({ title, subtitle, preset }) => {
  // Extract config with defaults
  const config = preset?.config || {};
  const {
    text_alignment = 'center',
    title_size = 'large',
    show_subtitle = true,
    show_divider = false,
    divider_style = 'solid',
    font_style = 'sans-serif',
    margin_bottom = 'large',
  } = config;

  // Map title size to Bootstrap classes
  const titleSizeClass = {
    'medium': 'h2',
    'large': 'display-4',
    'extra_large': 'display-3',
  }[title_size] || 'h2';

  // Map margin bottom to Bootstrap spacing
  const marginClass = {
    'small': 'mb-3',
    'medium': 'mb-4',
    'large': 'mb-5',
    'extra_large': 'mb-6',
  }[margin_bottom] || 'mb-5';

  // Font style class
  const fontClass = font_style === 'serif' ? 'font-serif' : '';

  return (
    <div className={`section-header section-header-preset text-${text_alignment} ${marginClass}`}>
      <h2 className={`section-header-title ${titleSizeClass} ${fontClass}`}>
        {title}
      </h2>
      
      {show_subtitle && subtitle && (
        <p className="section-header-subtitle text-muted mt-2">
          {subtitle}
        </p>
      )}
      
      {show_divider && (
        <hr 
          className={`section-divider divider-${divider_style} ${text_alignment === 'center' ? 'mx-auto' : ''}`} 
        />
      )}
    </div>
  );
};

SectionHeader.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string,
  preset: PropTypes.shape({
    key: PropTypes.string,
    name: PropTypes.string,
    config: PropTypes.object,
  }),
};

SectionHeader.defaultProps = {
  subtitle: null,
  preset: null,
};

export default SectionHeader;

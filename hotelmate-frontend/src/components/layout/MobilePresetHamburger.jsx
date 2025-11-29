import React, { useState, useEffect } from 'react';

/**
 * MobilePresetSelector - A simple accordion-style preset selector for mobile
 * Shows presets in a clean column layout with toggle functionality
 */
const MobilePresetSelector = ({ 
  presets = [], 
  activePreset = null,
  onPresetChange = null,
  title = "Choose Style",
  className = '',
  showOnDesktop = false 
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Don't render if not mobile and showOnDesktop is false
  if (!isMobile && !showOnDesktop) {
    return null;
  }

  // Don't render if no presets provided
  if (!presets || presets.length === 0) {
    return null;
  }

  const handlePresetClick = (preset) => {
    if (onPresetChange) {
      onPresetChange(preset);
    }
  };

  return (
    <div className={`preset-selector-mobile ${className}`}>
      <div 
        className={`preset-header ${isExpanded ? 'expanded' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h4 className="preset-header-title">{title}</h4>
        <i className={`bi bi-chevron-down preset-toggle-icon`}></i>
      </div>
      
      <div className={`preset-buttons-container ${isExpanded ? 'expanded' : ''}`}>
        <div className="preset-buttons-grid">
          {presets.map((preset, index) => (
            <button
              key={preset.id || index}
              className={`preset-btn-mobile ${activePreset === preset.id ? 'active' : ''}`}
              onClick={() => handlePresetClick(preset)}
              disabled={preset.disabled}
            >
              {preset.icon && <i className={`bi bi-${preset.icon}`}></i>}
              <span>{preset.label || preset.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

/**
 * Hook to provide common preset configurations
 */
export const usePresetConfig = (presetType) => {
  const presetConfigs = {
    hero: [
      { id: 'preset-1', label: 'Classic', icon: 'image' },
      { id: 'preset-2', label: 'Modern', icon: 'display' },
      { id: 'preset-3', label: 'Minimal', icon: 'square' },
      { id: 'preset-4', label: 'Overlay', icon: 'layers' },
      { id: 'preset-5', label: 'Split', icon: 'columns' }
    ],
    gallery: [
      { id: 'preset-1', label: 'Grid', icon: 'grid-3x3' },
      { id: 'preset-2', label: 'Masonry', icon: 'bricks' },
      { id: 'preset-3', label: 'Carousel', icon: 'arrow-left-right' },
      { id: 'preset-4', label: 'Lightbox', icon: 'fullscreen' },
      { id: 'preset-5', label: 'Timeline', icon: 'clock-history' }
    ],
    rooms: [
      { id: 'preset-1', label: 'Card View', icon: 'card-list' },
      { id: 'preset-2', label: 'List View', icon: 'list-ul' },
      { id: 'preset-3', label: 'Table View', icon: 'table' },
      { id: 'preset-4', label: 'Grid View', icon: 'grid' },
      { id: 'preset-5', label: 'Detailed', icon: 'info-circle' }
    ],
    news: [
      { id: 'preset-1', label: 'Blog Style', icon: 'journal-text' },
      { id: 'preset-2', label: 'Card Style', icon: 'card-text' },
      { id: 'preset-3', label: 'List Style', icon: 'list-task' },
      { id: 'preset-4', label: 'Magazine', icon: 'newspaper' },
      { id: 'preset-5', label: 'Timeline', icon: 'clock-history' }
    ],
    theme: [
      { id: 'default', label: 'Default', icon: 'palette' },
      { id: 'modern', label: 'Modern', icon: 'circle' },
      { id: 'classic', label: 'Classic', icon: 'gem' },
      { id: 'minimal', label: 'Minimal', icon: 'subtract' },
      { id: 'bold', label: 'Bold', icon: 'lightning' }
    ]
  };

  return presetConfigs[presetType] || [];
};

/**
 * Example usage components for different preset types
 */
export const PresetSelectorExamples = {
  Hero: ({ activePreset, onPresetChange }) => {
    const presets = usePresetConfig('hero');
    return (
      <MobilePresetSelector 
        title="Hero Style"
        presets={presets} 
        activePreset={activePreset}
        onPresetChange={onPresetChange}
      />
    );
  },

  Gallery: ({ activePreset, onPresetChange }) => {
    const presets = usePresetConfig('gallery');
    return (
      <MobilePresetSelector 
        title="Gallery Style"
        presets={presets} 
        activePreset={activePreset}
        onPresetChange={onPresetChange}
      />
    );
  },

  Rooms: ({ activePreset, onPresetChange }) => {
    const presets = usePresetConfig('rooms');
    return (
      <MobilePresetSelector 
        title="Room Layout"
        presets={presets} 
        activePreset={activePreset}
        onPresetChange={onPresetChange}
      />
    );
  },

  News: ({ activePreset, onPresetChange }) => {
    const presets = usePresetConfig('news');
    return (
      <MobilePresetSelector 
        title="News Style"
        presets={presets} 
        activePreset={activePreset}
        onPresetChange={onPresetChange}
      />
    );
  },

  Theme: ({ activePreset, onPresetChange }) => {
    const presets = usePresetConfig('theme');
    return (
      <MobilePresetSelector 
        title="Theme"
        presets={presets} 
        activePreset={activePreset}
        onPresetChange={onPresetChange}
      />
    );
  },

  Custom: ({ title, presets, activePreset, onPresetChange }) => {
    return (
      <MobilePresetSelector 
        title={title}
        presets={presets} 
        activePreset={activePreset}
        onPresetChange={onPresetChange}
      />
    );
  }
};

export default MobilePresetSelector;
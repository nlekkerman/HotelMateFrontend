import React, { useState, useRef, useEffect } from 'react';
import { Form, Button, ButtonGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import InlinePageBuilder from '@/components/builder/InlinePageBuilder';

/**
 * PresetSelector - Staff-only page editor bar
 * Shows style preset buttons (1-5) plus section editing and staff view controls
 * Only visible to authenticated staff on public page view
 * 
 * Responsive behavior:
 * - Desktop: Always visible - all buttons in a row
 * - Mobile: Toggle button that shows/hides page editing controls
 */
const PresetSelector = ({ 
  currentVariant = 1, 
  onVariantChange, 
  hotelSlug,
  loading = false,
  hotel = null,
  sections = [],
  onUpdate = null
}) => {
  const [selectedVariant, setSelectedVariant] = useState(currentVariant);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const builderRef = useRef();
  
  // Sync selectedVariant when currentVariant changes
  useEffect(() => {
    console.log('[PresetSelector] currentVariant changed to:', currentVariant);
    console.log('[PresetSelector] Full sections data:', sections);
    console.log('[PresetSelector] sections style_variants:', sections.map(s => ({ 
      name: s.name, 
      variant: s.style_variant,
      allKeys: Object.keys(s)
    })));
    setSelectedVariant(currentVariant);
  }, [currentVariant, sections]);

  const presets = [
    { value: 1, label: 'Modern', emoji: '✨' },
    { value: 2, label: 'Dark', emoji: '🌙' },
    { value: 3, label: 'Minimal', emoji: '⚡' },
    { value: 4, label: 'Vibrant', emoji: '🎨' },
    { value: 5, label: 'Professional', emoji: '💼' },
  ];

  const currentPresetLabel = presets.find(p => p.value === selectedVariant)?.label || 'Modern';
  
  const toggleMobileMenu = () => setIsMobileMenuOpen(prev => !prev);

  const handleVariantChange = async (variant) => {
    console.log('[PresetSelector] handleVariantChange called with variant:', variant);
    setSelectedVariant(variant);
    if (onVariantChange) {
      await onVariantChange(variant);
    }
    console.log('[PresetSelector] After variant change, selectedVariant:', variant);
  };

  return (
    <>
      {/* Inline Page Builder - Shows section counter and controls */}
      {hotel && sections && onUpdate && (
        <InlinePageBuilder 
          ref={builderRef}
          hotel={hotel}
          sections={sections}
          onUpdate={onUpdate}
        />
      )}
      
      <div className="preset-selector-bar bg-dark text-white py-3 shadow-sm" style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1050 }}>
        <div className="container-fluid">
          {/* Desktop Layout (≥992px) */}
          <div className="d-none d-lg-flex row align-items-center">
            <div className="col-auto">
              <strong className="text-white-50">
                <i className="bi bi-pencil-square me-2"></i>
                Edit Page:
              </strong>
            </div>
            
            <div className="col d-flex gap-2 align-items-center">
              <ButtonGroup>
                {presets.map((preset) => (
                  <button
                    key={preset.value}
                    onClick={() => handleVariantChange(preset.value)}
                    disabled={loading}
                    className={`preset-selector-variant-${preset.value} d-flex align-items-center gap-2 ${selectedVariant === preset.value ? 'active' : ''}`}
                    style={{ minWidth: '140px' }}
                  >
                    <span>{preset.emoji}</span>
                    <span>{preset.label}</span>
                    {selectedVariant === preset.value && (
                      <i className="bi bi-check-circle-fill ms-auto"></i>
                    )}
                  </button>
                ))}
              </ButtonGroup>
              
              <button 
                className="preset-selector-edit-sections ms-3"
                onClick={() => builderRef.current?.toggle()}
              >
                <i className="bi bi-plus-square me-2"></i>
                Sections
                {sections && sections.length > 0 && (
                  <span className="badge bg-warning text-dark ms-2">{sections.length}</span>
                )}
              </button>
              
              <Link 
                to={`/staff/${hotelSlug}/feed`}
                className="preset-selector-staff-view"
              >
                <i className="bi bi-person-badge me-2"></i>
                Staff View
              </Link>
            </div>
          </div>

          {/* Mobile Layout (<992px) */}
          <div className="d-lg-none">
            {/* Mobile Toggle Button */}
            <div className="d-flex justify-content-between align-items-center">
              <button
                className="preset-selector-mobile-toggle btn btn-outline-light d-flex align-items-center gap-2"
                onClick={toggleMobileMenu}
                aria-expanded={isMobileMenuOpen}
                disabled={loading}
              >
                <i className="bi bi-pencil-square"></i>
                <span>Edit: {currentPresetLabel}</span>
                <i className={`bi bi-chevron-${isMobileMenuOpen ? 'up' : 'down'}`}></i>
              </button>
              
            
            </div>

            {/* Mobile Preset Selector (Collapsible) */}
            <div className={`preset-selector-mobile-content ${isMobileMenuOpen ? 'show' : ''}`}>
              <div className="mt-3 pt-3 border-top border-secondary">
                <div className="row g-2">
                  {presets.map((preset) => (
                    <div key={preset.value} className="col-6">
                      <button
                        onClick={() => {
                          handleVariantChange(preset.value);
                          setIsMobileMenuOpen(false); // Close menu after selection
                        }}
                        disabled={loading}
                        className={`preset-selector-variant-${preset.value} btn w-100 d-flex align-items-center gap-2 ${selectedVariant === preset.value ? 'active' : ''}`}
                      >
                        <span>{preset.emoji}</span>
                        <span>{preset.label}</span>
                        {selectedVariant === preset.value && (
                          <i className="bi bi-check-circle-fill ms-auto"></i>
                        )}
                      </button>
                    </div>
                  ))}
                   
              <button 
                className="preset-selector-edit-sections ms-3"
                onClick={() => builderRef.current?.toggle()}
              >
                <i className="bi bi-plus-square me-2"></i>
                Sections
                {sections && sections.length > 0 && (
                  <span className="badge bg-warning text-dark ms-2">{sections.length}</span>
                )}
              </button>
              
              <Link 
                to={`/staff/${hotelSlug}/feed`}
                className="preset-selector-staff-view"
              >
                <i className="bi bi-person-badge me-2"></i>
                Staff View
              </Link>
                </div>
                
                {/* Current Style Preview/Info */}
                <div className="mt-3 p-2 bg-dark bg-opacity-50 rounded">
                  <small className="text-white-50">
                    <i className="bi bi-info-circle me-1"></i>
                    Active Style: <strong className="text-white">{currentPresetLabel}</strong> theme
                  </small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

PresetSelector.propTypes = {
  currentVariant: PropTypes.number,
  onVariantChange: PropTypes.func.isRequired,
  hotelSlug: PropTypes.string.isRequired,
  loading: PropTypes.bool,
  hotel: PropTypes.object,
  sections: PropTypes.array,
  onUpdate: PropTypes.func,
};

export default PresetSelector;

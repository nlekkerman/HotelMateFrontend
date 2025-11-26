import React, { useState, useRef, useEffect } from 'react';
import { Form, Button, ButtonGroup } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import InlinePageBuilder from '@/components/builder/InlinePageBuilder';

/**
 * PresetSelector - Staff-only preset switcher bar
 * Shows radio buttons to switch between style presets (1-5)
 * Only visible to authenticated staff on public page view
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
    { value: 1, label: 'Clean & Modern', emoji: '✨' },
    { value: 2, label: 'Dark & Elegant', emoji: '🌙' },
    { value: 3, label: 'Minimal & Sleek', emoji: '⚡' },
    { value: 4, label: 'Vibrant & Playful', emoji: '🎨' },
    { value: 5, label: 'Professional', emoji: '💼' },
  ];

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
        <div className="row align-items-center">
          <div className="col-auto">
            <strong className="text-white-50">
              <i className="bi bi-palette me-2"></i>
              Page Style:
            </strong>
          </div>
          
          <div className="col">
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
          </div>

          <div className="col-auto d-flex gap-2">
            <button 
              className="preset-selector-edit-sections"
              onClick={() => builderRef.current?.toggle()}
            >
              <i className="bi bi-pencil-square me-2"></i>
              Edit Sections
              {sections && sections.length > 0 && (
                <span className="badge bg-light text-dark ms-2">{sections.length}</span>
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

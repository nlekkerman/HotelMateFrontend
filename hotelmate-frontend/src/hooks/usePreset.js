import { useMemo } from 'react';
import { usePresets } from '../context/PresetsContext';

/**
 * Hook for selecting and using presets with automatic fallback to defaults
 * 
 * @param {string|null} presetKey - Specific preset key to use
 * @param {string} targetType - Type of preset (section, card, room_card, etc.)
 * @param {string|null} sectionType - Section type if targetType is 'section'
 * @returns {Object|null} Preset configuration object
 * 
 * @example
 * // Get a specific room card preset
 * const cardPreset = usePreset('room_card_luxury', 'room_card');
 * 
 * @example
 * // Get a section preset with fallback to default
 * const sectionPreset = usePreset(section.style_variant, 'section', 'rooms');
 * 
 * @example
 * // Get default header preset
 * const headerPreset = usePreset(null, 'section_header');
 */
export const usePreset = (presetKey, targetType, sectionType = null) => {
  const { presets, getPreset, getDefault } = usePresets();

  return useMemo(() => {
    // Wait for presets to load
    if (!presets) {
      return null;
    }

    // Try to find preset by key if provided
    if (presetKey) {
      const preset = getPreset(presetKey);
      if (preset) {
        return preset;
      }
      
      // Log warning if key not found (helps with debugging)
      console.warn(
        `[usePreset] Preset key "${presetKey}" not found. Falling back to default.`,
        { targetType, sectionType }
      );
    }

    // Fallback to default preset
    const defaultPreset = getDefault(targetType, sectionType);
    
    if (!defaultPreset) {
      console.warn(
        `[usePreset] No default preset found for targetType="${targetType}", sectionType="${sectionType}"`
      );
    }
    
    return defaultPreset;
  }, [presets, presetKey, targetType, sectionType, getPreset, getDefault]);
};

/**
 * Hook to get the configuration object from a preset
 * Returns empty object if preset is not available
 * 
 * @param {string|null} presetKey - Preset key
 * @param {string} targetType - Target type
 * @param {string|null} sectionType - Section type
 * @returns {Object} Configuration object
 * 
 * @example
 * const config = usePresetConfig('rooms_grid_3col', 'section', 'rooms');
 * // Returns: { layout: 'grid', columns: 3, gap: 'large', ... }
 */
export const usePresetConfig = (presetKey, targetType, sectionType = null) => {
  const preset = usePreset(presetKey, targetType, sectionType);
  return preset?.config || {};
};

export default usePreset;

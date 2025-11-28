/**
 * Presets Service
 * Manages preset configurations for all public page elements
 */

class PresetsService {
  constructor() {
    this.presets = null;
    this.loading = false;
    this.error = null;
  }

  /**
   * Fetch all presets from the API
   * @returns {Promise<Object>} Organized preset data
   */
  async fetchAll() {
    if (this.presets) {
      return this.presets;
    }
    
    this.loading = true;
    this.error = null;
    
    try {
      const baseURL = window.location.hostname === "localhost"
        ? "http://127.0.0.1:8000/api/"
        : import.meta.env.VITE_API_URL || "https://hotel-porter-d25ad83b12cf.herokuapp.com/api/";
      
      const response = await fetch(`${baseURL}public/presets/`);
      
      if (!response.ok) {
        // If presets endpoint doesn't exist, return empty presets
        console.warn('[PresetsService] Presets endpoint not available, using fallback');
        this.presets = {
          section: {},
          card: [],
          room_card: [],
          image: []
        };
        return this.presets;
      }
      
      this.presets = await response.json();
      return this.presets;
    } catch (error) {
      console.warn('[PresetsService] Failed to fetch presets, using fallback:', error);
      // Return empty presets structure to prevent crashes
      this.presets = {
        section: {},
        card: [],
        room_card: [],
        image: []
      };
      return this.presets;
    } finally {
      this.loading = false;
    }
  }

  /**
   * Get a specific preset by its key
   * @param {string} key - Unique preset key
   * @returns {Object|null} Preset object or null if not found
   */
  getPreset(key) {
    if (!this.presets || !key) {
      return null;
    }
    
    // Search all preset categories
    for (const category of Object.values(this.presets)) {
      if (Array.isArray(category)) {
        // Direct array categories (card, room_card, image, etc.)
        const preset = category.find(p => p.key === key);
        if (preset) return preset;
      } else if (typeof category === 'object') {
        // Nested section presets
        for (const sectionPresets of Object.values(category)) {
          if (Array.isArray(sectionPresets)) {
            const preset = sectionPresets.find(p => p.key === key);
            if (preset) return preset;
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Get the default preset for a target type
   * @param {string} targetType - Type of preset (section, card, room_card, etc.)
   * @param {string|null} sectionType - Section type if targetType is 'section'
   * @returns {Object|null} Default preset or null if not found
   */
  getDefault(targetType, sectionType = null) {
    if (!this.presets) {
      return null;
    }
    
    // Handle section presets with section_type
    if (sectionType && this.presets.section?.[sectionType]) {
      const defaultPreset = this.presets.section[sectionType].find(p => p.is_default);
      if (defaultPreset) return defaultPreset;
      // Fallback to first preset if no default
      return this.presets.section[sectionType][0] || null;
    }
    
    // Handle direct target type presets
    if (this.presets[targetType] && Array.isArray(this.presets[targetType])) {
      const defaultPreset = this.presets[targetType].find(p => p.is_default);
      if (defaultPreset) return defaultPreset;
      // Fallback to first preset if no default
      return this.presets[targetType][0] || null;
    }
    
    return null;
  }

  /**
   * Get all presets for a specific target type
   * @param {string} targetType - Type of preset
   * @param {string|null} sectionType - Section type if applicable
   * @returns {Array} Array of presets
   */
  getPresetsByType(targetType, sectionType = null) {
    if (!this.presets) {
      return [];
    }
    
    if (sectionType && this.presets.section?.[sectionType]) {
      return this.presets.section[sectionType];
    }
    
    if (this.presets[targetType] && Array.isArray(this.presets[targetType])) {
      return this.presets[targetType];
    }
    
    return [];
  }

  /**
   * Clear cached presets (useful for testing or forcing refresh)
   */
  clearCache() {
    this.presets = null;
    this.loading = false;
    this.error = null;
  }
}

// Export singleton instance
export default new PresetsService();

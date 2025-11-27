import { createContext, useContext, useEffect, useState } from 'react';
import presetsService from '../services/presetsService';

/**
 * Presets Context
 * Provides global access to preset configurations throughout the application
 */
const PresetsContext = createContext(null);

/**
 * Presets Provider Component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export const PresetsProvider = ({ children }) => {
  const [presets, setPresets] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPresets = async () => {
      try {
        setLoading(true);
        const data = await presetsService.fetchAll();
        setPresets(data);
        setError(null);
      } catch (err) {
        console.error('[PresetsContext] Failed to load presets:', err);
        setError(err);
        // Set empty presets to prevent null issues
        setPresets({
          section: {},
          card: [],
          room_card: [],
          image: [],
          news_block: [],
          section_header: [],
          page_theme: [],
        });
      } finally {
        setLoading(false);
      }
    };

    loadPresets();
  }, []);

  const value = {
    presets,
    loading,
    error,
    /**
     * Get a preset by key
     * @param {string} key - Preset key
     * @returns {Object|null}
     */
    getPreset: (key) => presetsService.getPreset(key),
    
    /**
     * Get default preset for a type
     * @param {string} targetType - Target type
     * @param {string|null} sectionType - Section type
     * @returns {Object|null}
     */
    getDefault: (targetType, sectionType = null) => 
      presetsService.getDefault(targetType, sectionType),
    
    /**
     * Get all presets by type
     * @param {string} targetType - Target type
     * @param {string|null} sectionType - Section type
     * @returns {Array}
     */
    getPresetsByType: (targetType, sectionType = null) => 
      presetsService.getPresetsByType(targetType, sectionType),
    
    /**
     * Refresh presets from API
     */
    refresh: async () => {
      presetsService.clearCache();
      setLoading(true);
      try {
        const data = await presetsService.fetchAll();
        setPresets(data);
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    },
  };

  return (
    <PresetsContext.Provider value={value}>
      {children}
    </PresetsContext.Provider>
  );
};

/**
 * Hook to access presets context
 * @returns {Object} Presets context value
 * @throws {Error} If used outside of PresetsProvider
 */
export const usePresets = () => {
  const context = useContext(PresetsContext);
  if (!context) {
    throw new Error('usePresets must be used within a PresetsProvider');
  }
  return context;
};

export default PresetsContext;

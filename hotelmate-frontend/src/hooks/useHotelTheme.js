import { useEffect } from 'react';

/**
 * Helper function to darken a hex color
 * @param {string} color - Hex color (e.g., '#3B82F6')
 * @param {number} percent - Percentage to darken (0-100)
 * @returns {string} - Darkened hex color
 */
const darkenColor = (color, percent) => {
  if (!color || !color.startsWith('#')) return color;
  
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) - amt;
  const G = (num >> 8 & 0x00FF) - amt;
  const B = (num & 0x0000FF) - amt;
  
  return '#' + (
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  ).toString(16).slice(1);
};

/**
 * useHotelTheme - Apply hotel branding colors as CSS variables
 * @param {Object} settings - Hotel public settings with branding colors
 */
const useHotelTheme = (settings) => {
  useEffect(() => {
    if (!settings) return;

    const root = document.documentElement;

    // Apply branding colors
    if (settings.primary_color) {
      root.style.setProperty('--hotel-primary', settings.primary_color);
      root.style.setProperty('--main-color', settings.primary_color);
      root.style.setProperty('--primary-color', settings.primary_color);
    }

    if (settings.secondary_color) {
      root.style.setProperty('--hotel-secondary', settings.secondary_color);
      root.style.setProperty('--secondary-color', settings.secondary_color);
    }

    if (settings.accent_color) {
      root.style.setProperty('--hotel-accent', settings.accent_color);
    }

    if (settings.background_color) {
      root.style.setProperty('--hotel-background', settings.background_color);
      root.style.setProperty('--background-color', settings.background_color);
    }

    if (settings.button_color) {
      root.style.setProperty('--hotel-button', settings.button_color);
      root.style.setProperty('--button-color', settings.button_color);
    }
    
    // Apply all customizable theme colors
    if (settings.button_text_color) {
      root.style.setProperty('--button-text-color', settings.button_text_color);
    }
    
    if (settings.button_hover_color) {
      root.style.setProperty('--button-hover-color', settings.button_hover_color);
    } else if (settings.button_color) {
      // Fallback: calculate hover color if not provided
      const hoverColor = darkenColor(settings.button_color, 15);
      root.style.setProperty('--button-hover-color', hoverColor);
    }
    
    if (settings.text_color) {
      root.style.setProperty('--text-color', settings.text_color);
    }
    
    if (settings.border_color) {
      root.style.setProperty('--border-color', settings.border_color);
    }
    
    if (settings.link_color) {
      root.style.setProperty('--link-color', settings.link_color);
    }
    
    if (settings.link_hover_color) {
      root.style.setProperty('--link-hover-color', settings.link_hover_color);
    }

    // Apply theme mode
    if (settings.theme_mode) {
      root.setAttribute('data-theme', settings.theme_mode);
      
      // Adjust contrast based on theme mode
      if (settings.theme_mode === 'dark') {
        root.style.setProperty('--text-dark', '#ffffff');
        root.style.setProperty('--text-gray', '#cbd5e0');
        root.style.setProperty('--bg-light', '#1a202c');
      } else {
        root.style.setProperty('--text-dark', '#1a202c');
        root.style.setProperty('--text-gray', '#4a5568');
        root.style.setProperty('--bg-light', '#f7fafc');
      }
    }

    // Cleanup function to reset to defaults
    return () => {
      // Optional: Remove custom properties on unmount
      // root.style.removeProperty('--hotel-primary');
      // etc...
    };
  }, [settings]);

  return {
    primaryColor: settings?.primary_color,
    secondaryColor: settings?.secondary_color,
    accentColor: settings?.accent_color,
    backgroundColor: settings?.background_color,
    buttonColor: settings?.button_color,
    themeMode: settings?.theme_mode,
  };
};

export { useHotelTheme };
export default useHotelTheme;

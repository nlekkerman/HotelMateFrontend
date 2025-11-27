// src/utils/applyTheme.js

/**
 * Apply theme colors globally using CSS variables
 * @param {Object} settings - Hotel settings containing theme colors
 */
export function applyThemeToApp(settings) {
  const root = document.documentElement;
  
  // Apply all theme colors as CSS variables
  if (settings.main_color) {
    root.style.setProperty('--color-primary', settings.main_color);
  }
  
  if (settings.secondary_color) {
    root.style.setProperty('--color-secondary', settings.secondary_color);
  }
  
  if (settings.background_color) {
    root.style.setProperty('--color-background', settings.background_color);
  }
  
  if (settings.text_color) {
    root.style.setProperty('--color-text', settings.text_color);
  }
  
  if (settings.border_color) {
    root.style.setProperty('--color-border', settings.border_color);
  }
  
  if (settings.button_color) {
    root.style.setProperty('--color-button', settings.button_color);
  }
  
  if (settings.button_text_color) {
    root.style.setProperty('--color-button-text', settings.button_text_color);
  }
  
  if (settings.button_hover_color) {
    root.style.setProperty('--color-button-hover', settings.button_hover_color);
  }
  
  if (settings.link_color) {
    root.style.setProperty('--color-link', settings.link_color);
  }
  
  if (settings.link_hover_color) {
    root.style.setProperty('--color-link-hover', settings.link_hover_color);
  }
  
  console.log('✅ Theme applied globally');
}

/**
 * Preview a single color change without saving
 * @param {string} colorType - The type of color (e.g., 'primary', 'secondary')
 * @param {string} value - The hex color value
 */
export function previewColor(colorType, value) {
  const root = document.documentElement;
  root.style.setProperty(`--color-${colorType}`, value);
}

/**
 * Get current theme colors from CSS variables
 * @returns {Object} Object containing current theme colors
 */
export function getCurrentTheme() {
  const root = document.documentElement;
  const computedStyle = getComputedStyle(root);
  
  return {
    main_color: computedStyle.getPropertyValue('--color-primary').trim(),
    secondary_color: computedStyle.getPropertyValue('--color-secondary').trim(),
    background_color: computedStyle.getPropertyValue('--color-background').trim(),
    text_color: computedStyle.getPropertyValue('--color-text').trim(),
    border_color: computedStyle.getPropertyValue('--color-border').trim(),
    button_color: computedStyle.getPropertyValue('--color-button').trim(),
    button_text_color: computedStyle.getPropertyValue('--color-button-text').trim(),
    button_hover_color: computedStyle.getPropertyValue('--color-button-hover').trim(),
    link_color: computedStyle.getPropertyValue('--color-link').trim(),
    link_hover_color: computedStyle.getPropertyValue('--color-link-hover').trim()
  };
}

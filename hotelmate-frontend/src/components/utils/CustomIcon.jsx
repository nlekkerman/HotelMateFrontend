import React from "react";
import { getCustomIcon } from "@/config/customIcons";

/**
 * CustomIcon Component
 * Renders custom icons from assets/icons directory
 * 
 * @param {Object} props
 * @param {string} props.name - Icon name from customIcons registry
 * @param {string} props.alt - Alt text for the icon
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Inline styles
 * @param {Function} props.onClick - Click handler
 * @param {number|string} props.size - Size of the icon (width/height)
 */
const CustomIcon = ({ 
  name, 
  alt = "", 
  className = "", 
  style = {}, 
  onClick,
  size = 24 
}) => {
  const iconPath = getCustomIcon(name);

  if (!iconPath) {
    console.warn(`CustomIcon: Icon "${name}" not found in registry`);
    return null;
  }

  const defaultStyle = {
    width: typeof size === 'number' ? `${size}px` : size,
    height: typeof size === 'number' ? `${size}px` : size,
    objectFit: "contain",
    cursor: onClick ? "pointer" : "default",
    ...style
  };

  return (
    <img
      src={iconPath}
      alt={alt || name}
      className={`custom-icon ${className}`}
      style={defaultStyle}
      onClick={onClick}
      loading="lazy"
    />
  );
};

export default CustomIcon;

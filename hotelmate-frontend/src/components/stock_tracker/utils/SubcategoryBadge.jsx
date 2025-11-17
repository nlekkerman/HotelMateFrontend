/**
 * SubcategoryBadge Component
 * Displays visual indicators for Minerals & Syrups subcategories
 */
import React from 'react';
import { Badge } from 'react-bootstrap';

const SUBCATEGORY_CONFIG = {
  SOFT_DRINKS: { icon: '🥤', color: 'primary', label: 'Soft Drinks' },
  SYRUPS: { icon: '🍯', color: 'warning', label: 'Syrups' },
  JUICES: { icon: '🧃', color: 'info', label: 'Juices' },
  CORDIALS: { icon: '🍶', color: 'secondary', label: 'Cordials' },
  BIB: { icon: '📦', color: 'success', label: 'BIB' },
  BULK_JUICES: { icon: '🍋', color: 'danger', label: 'Bulk Juices' }
};

export const SubcategoryBadge = ({ subcategory, size = 'xs' }) => {
  if (!subcategory) return null;
  
  const config = SUBCATEGORY_CONFIG[subcategory];
  if (!config) return null;
  
  const fontSize = size === 'xs' ? '0.65rem' : size === 'sm' ? '0.7rem' : '0.8rem';
  
  return (
    <Badge 
      bg={config.color} 
      style={{ fontSize, padding: '2px 6px' }}
      title={`Subcategory: ${config.label}`}
    >
      {config.icon} {config.label}
    </Badge>
  );
};

/**
 * Get help text for subcategories
 */
export const getSubcategoryHelpText = (subcategory) => {
  const helpText = {
    SOFT_DRINKS: 'Count full cases (12 bottles each) and loose bottles (0-11)',
    SYRUPS: 'Count full bottles (700ml or 1L) and ml in any open bottle',
    JUICES: 'Count full cases (12 bottles each) and bottles with decimals (e.g., 3.5 = 3 bottles + 500ml)',
    CORDIALS: 'Count full cases and individual bottles (no serving calculation)',
    BIB: 'Count full boxes (18L each) and liters remaining in current box',
    BULK_JUICES: 'Count whole bottles and fractional (0.5 = half bottle, not on menu)'
  };
  
  return helpText[subcategory] || null;
};

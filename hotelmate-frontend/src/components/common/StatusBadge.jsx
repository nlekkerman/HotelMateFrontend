import React from 'react';

/**
 * Generic Status Badge Component
 * Displays status badges with configurable colors and labels
 */
export default function StatusBadge({ 
  status, 
  mode = 'default',
  badgeData = null,
  size = 'md',
  className = '' 
}) {
  // If badgeData is provided, use it directly
  if (badgeData) {
    const sizeClass = size === 'sm' ? 'badge-sm' : size === 'lg' ? 'badge-lg' : '';
    const style = badgeData.bg_color ? { backgroundColor: badgeData.bg_color } : {};
    
    return (
      <span 
        className={`badge ${sizeClass} ${className}`}
        style={style}
        title={badgeData.label}
      >
        {badgeData.label}
      </span>
    );
  }

  // Default badge configurations
  const getBadgeConfig = (status, mode) => {
    if (mode === 'duty') {
      switch (status) {
        case 'on_duty':
          return { label: 'On Duty', className: 'bg-success' };
        case 'off_duty':
          return { label: 'Off Duty', className: 'bg-secondary' };
        case 'on_break':
          return { label: 'On Break', className: 'bg-warning' };
        default:
          return { label: status || 'Unknown', className: 'bg-secondary' };
      }
    }
    
    if (mode === 'attendance') {
      switch (status) {
        case 'active':
          return { label: 'Currently Active', className: 'bg-success' };
        case 'completed':
          return { label: 'Completed', className: 'bg-primary' };
        case 'issue':
          return { label: 'Has Issues', className: 'bg-danger' };
        case 'no_log':
          return { label: 'No Log', className: 'bg-light text-dark' };
        default:
          return { label: status || 'Unknown', className: 'bg-secondary' };
      }
    }
    
    // Default mode
    return { label: status || 'Unknown', className: 'bg-secondary' };
  };

  const config = getBadgeConfig(status, mode);
  const sizeClass = size === 'sm' ? 'badge-sm' : size === 'lg' ? 'badge-lg' : '';

  return (
    <span 
      className={`badge ${config.className} ${sizeClass} ${className}`}
      title={config.label}
    >
      {config.label}
    </span>
  );
}
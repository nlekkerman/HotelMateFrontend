import React from 'react';
import { Button } from 'react-bootstrap';
import { FaChartBar, FaBoxes, FaCalendarCheck, FaPlus } from 'react-icons/fa';

/**
 * Chart Empty State Component
 * 
 * Displays when no data is available for a chart
 */
const ChartEmptyState = ({ 
  height = 400, 
  width = '100%',
  message = 'No data available',
  actionText,
  onActionClick,
  icon: CustomIcon,
  type = 'general' // 'general', 'no-periods', 'no-items', 'no-data'
}) => {
  
  // Determine icon and default message based on type
  const getContent = () => {
    switch (type) {
      case 'no-periods':
        return {
          icon: FaCalendarCheck,
          defaultMessage: 'No closed periods found',
          defaultAction: 'Close a Period',
          iconColor: '#ffc107'
        };
      case 'no-items':
        return {
          icon: FaBoxes,
          defaultMessage: 'No stock items found',
          defaultAction: 'Add Stock Items',
          iconColor: '#17a2b8'
        };
      case 'no-data':
        return {
          icon: FaChartBar,
          defaultMessage: 'No data available for this period',
          defaultAction: 'Select Different Period',
          iconColor: '#6c757d'
        };
      default:
        return {
          icon: FaChartBar,
          defaultMessage: 'No data available',
          defaultAction: null,
          iconColor: '#6c757d'
        };
    }
  };

  const content = getContent();
  const Icon = CustomIcon || content.icon;
  const displayMessage = message || content.defaultMessage;
  const displayActionText = actionText || content.defaultAction;

  return (
    <div 
      className="chart-empty-state"
      style={{
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa',
        border: '2px dashed #dee2e6',
        borderRadius: '12px',
        padding: '40px 20px',
        textAlign: 'center'
      }}
    >
      <Icon 
        size={64} 
        style={{ 
          color: content.iconColor, 
          marginBottom: '20px',
          opacity: 0.6
        }} 
      />
      
      <h5 style={{ 
        color: '#495057', 
        marginBottom: '10px',
        fontWeight: '600'
      }}>
        {displayMessage}
      </h5>
      
      <p style={{ 
        color: '#6c757d', 
        fontSize: '14px',
        marginBottom: '20px',
        maxWidth: '400px'
      }}>
        {type === 'no-periods' && 'Close a stock period to view analytics and comparisons.'}
        {type === 'no-items' && 'Add stock items to your inventory to start tracking.'}
        {type === 'no-data' && 'This chart requires data from closed periods or specific filters.'}
        {type === 'general' && 'Try adjusting your filters or date range.'}
      </p>
      
      {displayActionText && onActionClick && (
        <Button 
          variant="primary" 
          onClick={onActionClick}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <FaPlus size={14} />
          {displayActionText}
        </Button>
      )}
    </div>
  );
};

export default ChartEmptyState;

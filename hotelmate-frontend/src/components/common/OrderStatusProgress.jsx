// src/components/common/OrderStatusProgress.jsx
import React from 'react';

/**
 * OrderStatusProgress - Visual component to show order progress (pending → accepted → completed)
 * Based on the new room service status workflow from ROOM_SERVICE_FRONTEND_INTEGRATION.md
 */
const OrderStatusProgress = ({ 
  status, 
  showPercentage = true, 
  size = 'md', 
  className = '' 
}) => {
  // Calculate progress percentage
  const getProgressPercentage = (orderStatus) => {
    switch (orderStatus) {
      case 'pending': return 33;
      case 'accepted': return 66;
      case 'completed': return 100;
      default: return 0;
    }
  };

  // Get status color
  const getStatusColor = (orderStatus) => {
    switch (orderStatus) {
      case 'pending': return '#ffd43b';
      case 'accepted': return '#74c0fc';
      case 'completed': return '#51cf66';
      default: return '#e9ecef';
    }
  };

  // Get gradient style
  const getGradientStyle = (orderStatus) => {
    const percentage = getProgressPercentage(orderStatus);
    if (orderStatus === 'completed') {
      return 'linear-gradient(90deg, #51cf66 0%, #51cf66 100%)';
    } else if (orderStatus === 'accepted') {
      return 'linear-gradient(90deg, #ffd43b 0%, #74c0fc 100%)';
    } else {
      return 'linear-gradient(90deg, #ffd43b 0%, #ffd43b 100%)';
    }
  };

  const progressPercentage = getProgressPercentage(status);
  const height = size === 'sm' ? '4px' : size === 'lg' ? '8px' : '6px';

  return (
    <div className={`order-status-progress ${className}`}>
      {showPercentage && (
        <div className="d-flex justify-content-between align-items-center mb-1">
          <small className="text-muted">Order Progress</small>
          <small className="text-muted">{progressPercentage}%</small>
        </div>
      )}
      <div className="progress" style={{ height }}>
        <div 
          className="progress-bar"
          role="progressbar" 
          style={{ 
            width: `${progressPercentage}%`,
            background: getGradientStyle(status),
            transition: 'width 0.3s ease'
          }}
          aria-valuenow={progressPercentage}
          aria-valuemin="0"
          aria-valuemax="100"
        ></div>
      </div>
      
      {/* Status steps indicator */}
      <div className="d-flex justify-content-between mt-2">
        <div className="text-center" style={{ width: '33%' }}>
          <div 
            className={`rounded-circle mx-auto mb-1 ${
              progressPercentage >= 33 ? 'bg-warning' : 'border border-muted'
            }`}
            style={{ 
              width: '12px', 
              height: '12px',
              backgroundColor: progressPercentage >= 33 ? '#ffd43b' : 'transparent'
            }}
          ></div>
          <small className="text-muted">Pending</small>
        </div>
        <div className="text-center" style={{ width: '33%' }}>
          <div 
            className={`rounded-circle mx-auto mb-1 ${
              progressPercentage >= 66 ? 'bg-info' : 'border border-muted'
            }`}
            style={{ 
              width: '12px', 
              height: '12px',
              backgroundColor: progressPercentage >= 66 ? '#74c0fc' : 'transparent'
            }}
          ></div>
          <small className="text-muted">Accepted</small>
        </div>
        <div className="text-center" style={{ width: '33%' }}>
          <div 
            className={`rounded-circle mx-auto mb-1 ${
              progressPercentage >= 100 ? 'bg-success' : 'border border-muted'
            }`}
            style={{ 
              width: '12px', 
              height: '12px',
              backgroundColor: progressPercentage >= 100 ? '#51cf66' : 'transparent'
            }}
          ></div>
          <small className="text-muted">Completed</small>
        </div>
      </div>
    </div>
  );
};

export default OrderStatusProgress;
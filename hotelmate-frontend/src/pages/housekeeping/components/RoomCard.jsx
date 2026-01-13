// src/pages/housekeeping/components/RoomCard.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

// Status styling mapping
const STATUS_STYLES = {
  'OCCUPIED': { bg: 'bg-dark', text: 'text-white' },
  'CHECKOUT_DIRTY': { bg: 'bg-warning', text: 'text-dark' },
  'CLEANING_IN_PROGRESS': { bg: 'bg-info', text: 'text-white' },
  'CLEANED_UNINSPECTED': { bg: 'bg-success', text: 'text-white' },
  'MAINTENANCE_REQUIRED': { bg: 'bg-secondary', text: 'text-white' },
  'OUT_OF_ORDER': { bg: 'bg-danger', text: 'text-white' },
  'READY_FOR_GUEST': { bg: 'bg-primary', text: 'text-white' }
};

// Quick action button configurations based on current status
const getQuickActions = (currentStatus) => {
  const actions = [];
  
  switch (currentStatus) {
    case 'CHECKOUT_DIRTY':
      actions.push({
        label: 'Start Cleaning',
        toStatus: 'CLEANING_IN_PROGRESS',
        variant: 'btn-info',
        icon: 'play-fill'
      });
      break;
      
    case 'CLEANING_IN_PROGRESS':
      actions.push({
        label: 'Mark Cleaned',
        toStatus: 'CLEANED_UNINSPECTED',
        variant: 'btn-success',
        icon: 'check-circle'
      });
      break;
      
    case 'CLEANED_UNINSPECTED':
      actions.push(
        {
          label: 'Mark Ready',
          toStatus: 'READY_FOR_GUEST',
          variant: 'btn-primary',
          icon: 'house-check'
        },
        {
          label: 'Needs Maintenance',
          toStatus: 'MAINTENANCE_REQUIRED',
          variant: 'btn-secondary',
          icon: 'tools'
        }
      );
      break;
      
    case 'MAINTENANCE_REQUIRED':
      actions.push({
        label: 'Mark Ready',
        toStatus: 'READY_FOR_GUEST',
        variant: 'btn-primary',
        icon: 'house-check'
      });
      break;
      
    case 'READY_FOR_GUEST':
      // No quick actions needed - room is ready
      break;
      
    case 'OUT_OF_ORDER':
      actions.push({
        label: 'Back in Service',
        toStatus: 'READY_FOR_GUEST',
        variant: 'btn-primary',
        icon: 'house-check'
      });
      break;
      
    default:
      // No quick actions for other statuses
      break;
  }

  return actions;
};

const RoomCard = ({ room, onAction, disabled = false }) => {
  const [processing, setProcessing] = useState(null); // Track which action is processing
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const statusStyle = STATUS_STYLES[room.room_status] || { bg: 'bg-light', text: 'text-dark' };
  const quickActions = getQuickActions(room.room_status);
  
  // Handle room click navigation
  const handleRoomClick = () => {
    if (user?.hotel_slug && room.room_number) {
      navigate(`/staff/hotel/${user.hotel_slug}/housekeeping/rooms/${room.room_number}`);
    }
  };

  const handleAction = async (toStatus) => {
    setProcessing(toStatus);
    try {
      await onAction(room.id, toStatus);
    } catch (error) {
      console.error('Room action failed:', error);
    } finally {
      setProcessing(null);
    }
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return null;
    try {
      return new Date(dateString).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
    } catch {
      return null;
    }
  };

  return (
    <div className="card h-100 shadow-sm" style={{ cursor: 'pointer' }} onClick={handleRoomClick}>
      <div className="card-body">
        {/* Room Header */}
        <div className="d-flex align-items-start justify-content-between mb-3">
          <div>
            <h5 className="card-title mb-1">
              Room {room.room_number || room.number}
            </h5>
            {room.room_type_name && (
              <small className="text-muted">{room.room_type_name}</small>
            )}
          </div>
          
          {/* Status Badge */}
          <span className={`badge ${statusStyle.bg} ${statusStyle.text}`}>
            {room.room_status_display || room.room_status}
          </span>
        </div>

        {/* Additional Info */}
        <div className="mb-3">
          {room.is_occupied && (
            <div className="badge bg-warning text-dark me-2 mb-1">
              <i className="bi bi-person-fill me-1"></i>
              Occupied
            </div>
          )}
          
          {room.is_out_of_order && (
            <div className="badge bg-danger me-2 mb-1">
              <i className="bi bi-exclamation-triangle me-1"></i>
              Out of Order
            </div>
          )}
        </div>

        {/* Timestamps */}
        {(room.last_cleaned_at || room.last_inspected_at) && (
          <div className="mb-3">
            {room.last_cleaned_at && (
              <small className="text-muted d-block">
                <i className="bi bi-check-circle me-1"></i>
                Cleaned: {formatDateTime(room.last_cleaned_at)}
              </small>
            )}
            {room.last_inspected_at && (
              <small className="text-muted d-block">
                <i className="bi bi-eye me-1"></i>
                Inspected: {formatDateTime(room.last_inspected_at)}
              </small>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <div className="card-footer bg-transparent pt-0" onClick={(e) => e.stopPropagation()}>
          <div className="d-grid gap-2">
            {quickActions.map(action => (
              <button
                key={action.toStatus}
                type="button"
                className={`btn ${action.variant} btn-sm d-flex align-items-center justify-content-center gap-2`}
                onClick={() => handleAction(action.toStatus)}
                disabled={disabled || processing !== null}
              >
                {processing === action.toStatus ? (
                  <>
                    <div className="spinner-border spinner-border-sm" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    Processing...
                  </>
                ) : (
                  <>
                    <i className={`bi bi-${action.icon}`}></i>
                    {action.label}
                  </>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomCard;
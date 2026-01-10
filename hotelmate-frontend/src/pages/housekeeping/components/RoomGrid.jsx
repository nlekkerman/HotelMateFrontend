// src/pages/housekeeping/components/RoomGrid.jsx
import React from 'react';
import RoomCard from './RoomCard';

const RoomGrid = ({ rooms, onRoomAction, loading }) => {
  if (!rooms || rooms.length === 0) {
    return (
      <div className="text-center py-5">
        <i className="bi bi-house text-muted" style={{ fontSize: '3rem' }}></i>
        <p className="text-muted mt-2">No rooms found for the selected filter.</p>
      </div>
    );
  }

  return (
    <div className="row">
      {rooms.map(room => (
        <div 
          key={room.id} 
          className="col-12 col-md-6 col-lg-4 mb-3"
        >
          <RoomCard 
            room={room}
            onAction={onRoomAction}
            disabled={loading}
          />
        </div>
      ))}
    </div>
  );
};

export default RoomGrid;
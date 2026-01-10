// src/pages/housekeeping/HousekeepingRooms.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useHousekeeping } from '@/realtime/stores/housekeepingStore';
import { useAuth } from '@/context/AuthContext';
import { toast } from 'react-toastify';
import HousekeepingHeader from './components/HousekeepingHeader';
import FilterPills from './components/FilterPills';
import RoomGrid from './components/RoomGrid';

// Filter mappings
const FILTER_MAPPINGS = {
  'all': null,
  'checkout-dirty': 'CHECKOUT_DIRTY',
  'cleaning': 'CLEANING_IN_PROGRESS',
  'cleaned': 'CLEANED_UNINSPECTED',
  'ready': 'READY_FOR_GUEST',
  'maintenance': 'MAINTENANCE_REQUIRED',
  'out-of-order': 'OUT_OF_ORDER',
  'occupied': 'OCCUPIED'
};

const HousekeepingRooms = () => {
  const { hotelSlug } = useParams();
  const { user } = useAuth();
  const {
    roomsById,
    counts,
    loading,
    error,
    loadDashboard,
    updateRoomStatus,
    handleRealtimeEvent,
    clearData
  } = useHousekeeping();

  const [activeFilter, setActiveFilter] = useState('all');
  const [pusherSubscribed, setPusherSubscribed] = useState(false);

  // Load dashboard data on mount
  useEffect(() => {
    if (hotelSlug) {
      loadDashboard(hotelSlug).catch(err => {
        console.error('Failed to load housekeeping dashboard:', err);
        toast.error('Failed to load housekeeping data');
      });
    }

    return () => {
      clearData();
    };
  }, [hotelSlug, loadDashboard, clearData]);

  // Setup Pusher subscription for realtime updates
  useEffect(() => {
    if (!hotelSlug || !window.pusher || pusherSubscribed) return;

    const channelName = `hotel-${hotelSlug}`;
    const channel = window.pusher.subscribe(channelName);

    const handleRoomStatusChanged = (eventData) => {
      console.log('[HousekeepingRooms] Received room-status-changed event:', eventData);
      handleRealtimeEvent({
        event: 'room-status-changed',
        data: eventData
      });
    };

    channel.bind('room-status-changed', handleRoomStatusChanged);
    setPusherSubscribed(true);

    return () => {
      if (channel) {
        channel.unbind('room-status-changed', handleRoomStatusChanged);
        window.pusher.unsubscribe(channelName);
      }
      setPusherSubscribed(false);
    };
  }, [hotelSlug, handleRealtimeEvent, pusherSubscribed]);

  // Filter rooms based on active filter
  const filteredRooms = React.useMemo(() => {
    const allRooms = Object.values(roomsById);
    
    if (activeFilter === 'all') {
      return allRooms;
    }

    const statusFilter = FILTER_MAPPINGS[activeFilter];
    if (!statusFilter) {
      return allRooms;
    }

    return allRooms.filter(room => {
      // Special handling for out-of-order
      if (activeFilter === 'out-of-order') {
        return room.room_status === 'OUT_OF_ORDER' || room.is_out_of_order;
      }
      
      return room.room_status === statusFilter;
    });
  }, [roomsById, activeFilter]);

  // Handle room status change
  const handleRoomAction = useCallback(async (roomId, toStatus, note = '') => {
    try {
      await updateRoomStatus(hotelSlug, roomId, toStatus, note);
      toast.success('Room status updated successfully');
    } catch (error) {
      console.error('Failed to update room status:', error);
      toast.error('Failed to update room status');
    }
  }, [hotelSlug, updateRoomStatus]);

  if (loading && Object.keys(roomsById).length === 0) {
    return (
      <div className="container mt-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="text-muted mt-3">Loading housekeeping data...</p>
        </div>
      </div>
    );
  }

  if (error && Object.keys(roomsById).length === 0) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error Loading Housekeeping Data</h4>
          <p>{error}</p>
          <button 
            className="btn btn-outline-danger" 
            onClick={() => loadDashboard(hotelSlug)}
          >
            <i className="bi bi-arrow-clockwise me-2"></i>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="housekeeping-rooms">
      <HousekeepingHeader 
        totalRooms={Object.keys(roomsById).length}
        isLive={pusherSubscribed}
        loading={loading}
      />
      
      <div className="container-fluid mt-3">
        <FilterPills 
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          counts={counts}
          roomsById={roomsById}
        />
        
        <RoomGrid 
          rooms={filteredRooms}
          onRoomAction={handleRoomAction}
          loading={loading}
        />
      </div>
    </div>
  );
};

export default HousekeepingRooms;
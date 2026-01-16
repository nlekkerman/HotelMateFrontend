// src/pages/housekeeping/HousekeepingRooms.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useRoomsState, roomsActions } from '@/realtime/stores/roomsStore';
import api from '@/services/api';
import { roomOperationsService } from '@/services/roomOperations';
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
  const { byRoomNumber, list } = useRoomsState();
  
  // Local UI state
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Load dashboard data on mount
  useEffect(() => {
    const loadRooms = async () => {
      if (!hotelSlug) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await api.get(`/staff/hotel/${hotelSlug}/housekeeping/dashboard/`);
        const { rooms_by_status = {} } = response.data;
        
        // Flatten all rooms from all status categories
        const allRooms = [];
        Object.entries(rooms_by_status).forEach(([status, rooms]) => {
          if (Array.isArray(rooms)) {
            rooms.forEach(room => {
              // Clone room to avoid mutating API objects
              allRooms.push({
                ...room,
                room_status: room.room_status || status,
              });
            });
          }
        });
        
        // Update roomsStore with loaded rooms
        roomsActions.bulkReplace(allRooms);
      } catch (err) {
        console.error('Failed to load housekeeping dashboard:', err);
        setError(err.response?.data?.message || err.message || 'Failed to load housekeeping data');
        toast.error('Failed to load housekeeping data');
      } finally {
        setLoading(false);
      }
    };
    
    loadRooms();
  }, [hotelSlug]);



  // Build rooms array from roomsStore
  const allRooms = React.useMemo(() => {
    return list.map(roomNumber => byRoomNumber[roomNumber]).filter(Boolean);
  }, [byRoomNumber, list]);
  
  // Compute counts from current rooms
  const counts = React.useMemo(() => {
    const c = {
      all: allRooms.length,
      'checkout-dirty': 0,
      cleaning: 0,
      cleaned: 0,
      ready: 0,
      maintenance: 0,
      'out-of-order': 0,
      occupied: 0,
    };

    for (const room of allRooms) {
      const s = room.room_status;

      if (s === 'CHECKOUT_DIRTY') c['checkout-dirty']++;
      if (s === 'CLEANING_IN_PROGRESS') c.cleaning++;
      if (s === 'CLEANED_UNINSPECTED') c.cleaned++;
      if (s === 'READY_FOR_GUEST') c.ready++;
      if (room.maintenance_required || s === 'MAINTENANCE_REQUIRED') c.maintenance++;
      if (room.is_out_of_order || s === 'OUT_OF_ORDER') c['out-of-order']++;
      if (s === 'OCCUPIED') c.occupied++;
    }

    return c;
  }, [allRooms]);

  // Filter rooms based on active filter
  const filteredRooms = React.useMemo(() => {
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
  }, [allRooms, activeFilter]);

  // Handle room status change
  const handleRoomAction = useCallback(async (roomId, toStatus, note = '') => {
    try {
      await roomOperationsService.updateStatus(hotelSlug, roomId, { 
        status: toStatus, 
        note 
      });
      toast.success('Room status update sent - waiting for realtime confirmation');
    } catch (error) {
      console.error('Failed to update room status:', error);
      toast.error(error.response?.data?.message || 'Failed to update room status');
    }
  }, [hotelSlug]);

  if (loading && allRooms.length === 0) {
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

  if (error && allRooms.length === 0) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">Error Loading Housekeeping Data</h4>
          <p>{error}</p>
          <button 
            className="btn btn-outline-danger" 
            onClick={() => window.location.reload()}
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
        totalRooms={allRooms.length}
        isLive={true}
        loading={loading}
      />
      
      <div className="container-fluid mt-3">
        <FilterPills 
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          counts={counts}
          rooms={allRooms}
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
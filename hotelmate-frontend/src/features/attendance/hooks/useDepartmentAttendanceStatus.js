import { useState, useEffect } from 'react';
import api from '@/services/api';

/**
 * Hook to fetch real-time attendance status by department
 */
export const useDepartmentAttendanceStatus = (hotelSlug, refreshKey = 0) => {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    if (!hotelSlug) {
      setData({});
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setError(null);
        const response = await api.get(`/staff/hotel/${hotelSlug}/attendance/clock-logs/department-status/`);
        setData(response.data || {});
      } catch (err) {
        console.error('Failed to fetch department attendance status:', err);
        setError(err.response?.data?.detail || 'Failed to load attendance data');
        setData({});
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [hotelSlug, refreshKey, refreshTrigger]);

  const refresh = () => setRefreshTrigger(prev => prev + 1);

  return { data, loading, error, refresh };
};

/**
 * Hook to handle approval/rejection of attendance logs
 */
export const useAttendanceApproval = (hotelSlug, onSuccess) => {
  const [approving, setApproving] = useState(new Set());

  const approveLog = async (logId) => {
    setApproving(prev => new Set([...prev, logId]));
    
    try {
      await api.post(`/staff/hotel/${hotelSlug}/attendance/clock-logs/${logId}/approve/`);
      
      if (onSuccess) {
        onSuccess('approved', logId);
      }
    } catch (error) {
      console.error('Failed to approve log:', error);
      throw new Error(error.response?.data?.detail || 'Failed to approve');
    } finally {
      setApproving(prev => {
        const newSet = new Set(prev);
        newSet.delete(logId);
        return newSet;
      });
    }
  };

  const rejectLog = async (logId) => {
    setApproving(prev => new Set([...prev, logId]));
    
    try {
      await api.post(`/staff/hotel/${hotelSlug}/attendance/clock-logs/${logId}/reject/`);
      
      if (onSuccess) {
        onSuccess('rejected', logId);
      }
    } catch (error) {
      console.error('Failed to reject log:', error);
      throw new Error(error.response?.data?.detail || 'Failed to reject');
    } finally {
      setApproving(prev => {
        const newSet = new Set(prev);
        newSet.delete(logId);
        return newSet;
      });
    }
  };

  return {
    approveLog,
    rejectLog,
    isApproving: (logId) => approving.has(logId)
  };
};
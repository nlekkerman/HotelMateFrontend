import React, { useState, useEffect } from "react";
import api from "@/services/api";
import { safeString, safeTimeSlice } from "../utils/safeUtils";

export default function TodayShiftsSection({ staffId, hotelSlug, staffStatus }) {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!staffId || !hotelSlug) return;
    
    const fetchTodayShifts = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const today = new Date().toISOString().split('T')[0];
        const response = await api.get(`/staff/${hotelSlug}/attendance/shifts/`, {
          params: {
            date: today,
            staff_id: staffId
          }
        });
        
        const shiftData = response.data?.results || [];
        setShifts(Array.isArray(shiftData) ? shiftData : []);
      } catch (err) {
        console.error("Failed to fetch today's shifts:", err);
        setError("Unable to load today's shifts");
      } finally {
        setLoading(false);
      }
    };

    fetchTodayShifts();
  }, [staffId, hotelSlug]);

  if (loading) {
    return (
      <div className="today-shifts-section mb-3">
        <h6 className="mb-2">
          <i className="bi bi-clock me-1"></i>
          Today's Shifts
        </h6>
        <div className="text-center py-2">
          <div className="spinner-border spinner-border-sm" role="status">
            <span className="visually-hidden">Loading shifts...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="today-shifts-section mb-3">
        <h6 className="mb-2">
          <i className="bi bi-clock me-1"></i>
          Today's Shifts
        </h6>
        <div className="alert alert-warning py-2 mb-0">
          <small>{error}</small>
        </div>
      </div>
    );
  }

  if (shifts.length === 0) {
    return (
      <div className="today-shifts-section mb-3">
        <h6 className="mb-2">
          <i className="bi bi-clock me-1"></i>
          Today's Shifts
        </h6>
        <div className="alert alert-info py-2 mb-0">
          <small>No shifts scheduled for today</small>
        </div>
      </div>
    );
  }

  const getShiftStatusBadge = (shift) => {
    const now = new Date();
    const currentTime = now.toTimeString().split(' ')[0].slice(0, 5); // HH:MM format
    
    const shiftStart = safeString(shift.shift_start);
    const shiftEnd = safeString(shift.shift_end);
    
    if (!shiftStart || !shiftEnd) {
      return { label: "Unknown", className: "bg-secondary" };
    }

    if (currentTime < shiftStart) {
      return { label: "Upcoming", className: "bg-primary" };
    } else if (currentTime >= shiftStart && currentTime <= shiftEnd) {
      return { label: "Active", className: "bg-success" };
    } else {
      return { label: "Completed", className: "bg-secondary" };
    }
  };

  const getDutyStatusDisplay = () => {
    const dutyStatus = staffStatus?.duty_status;
    const currentStatus = staffStatus?.current_status;
    
    if (dutyStatus === 'on_duty') {
      return (
        <span className="badge bg-success">
          <i className="bi bi-check-circle me-1"></i>
          On Duty {currentStatus ? `- ${currentStatus}` : ''}
        </span>
      );
    } else if (dutyStatus === 'on_break') {
      return (
        <span className="badge bg-warning">
          <i className="bi bi-pause-circle me-1"></i>
          On Break
        </span>
      );
    } else {
      return (
        <span className="badge bg-secondary">
          <i className="bi bi-x-circle me-1"></i>
          Off Duty
        </span>
      );
    }
  };

  return (
    <div className="today-shifts-section mb-3">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0">
          <i className="bi bi-clock me-1"></i>
          Today's Shifts
        </h6>
        {staffStatus && getDutyStatusDisplay()}
      </div>
      
      <div className="shifts-list">
        {shifts.map((shift, index) => {
          const statusBadge = getShiftStatusBadge(shift);
          const shiftStart = safeString(shift.shift_start);
          const shiftEnd = safeString(shift.shift_end);
          const department = safeString(shift.department_name) || safeString(shift.department);
          
          return (
            <div key={index} className="shift-item border rounded p-2 mb-2 bg-light">
              <div className="d-flex justify-content-between align-items-start">
                <div className="shift-details flex-grow-1">
                  <div className="d-flex align-items-center gap-2 mb-1">
                    <strong className="shift-time">
                      {shiftStart && shiftEnd ? `${shiftStart} - ${shiftEnd}` : 'Time not specified'}
                    </strong>
                    <span className={`badge ${statusBadge.className}`}>
                      {statusBadge.label}
                    </span>
                  </div>
                  
                  {department && (
                    <div className="shift-department text-muted small">
                      <i className="bi bi-building me-1"></i>
                      {department}
                    </div>
                  )}
                  
                  {shift.notes && (
                    <div className="shift-notes text-muted small mt-1">
                      <i className="bi bi-sticky me-1"></i>
                      {safeString(shift.notes)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
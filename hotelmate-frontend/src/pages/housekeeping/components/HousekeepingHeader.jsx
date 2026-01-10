// src/pages/housekeeping/components/HousekeepingHeader.jsx
import React from 'react';

const HousekeepingHeader = ({ totalRooms, isLive, loading }) => {
  return (
    <div className="bg-light border-bottom py-3">
      <div className="container-fluid">
        <div className="row align-items-center">
          <div className="col">
            <h1 className="h3 mb-1 d-flex align-items-center">
              <i className="bi bi-house-gear me-2 text-primary"></i>
              Housekeeping
            </h1>
            <div className="d-flex align-items-center gap-3">
              <span className="text-muted">
                <strong>Rooms</strong> • {totalRooms} total
              </span>
              {isLive && (
                <span className="badge bg-success d-flex align-items-center gap-1">
                  <i className="bi bi-circle-fill" style={{ fontSize: '0.5rem' }}></i>
                  Live
                </span>
              )}
              {loading && (
                <div className="spinner-border spinner-border-sm text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HousekeepingHeader;
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTheme } from "@/context/ThemeContext";
import SubmitMaintenanceRequest from "@/components/maintenance/SubmitMaintenanceRequest";
import MaintenanceRequests from "@/components/maintenance/MaintenanceRequests";

export default function Maintenance() {
  const navigate = useNavigate();
  const { hotelIdentifier } = useParams();
  const { mainColor } = useTheme();
  
  // nothing but composition: both share the same fetchRequests via refetch
  let refetch; // we'll wire this up via a ref in MaintenanceRequests

  return (
    <div className="container my-4">
      <h2 className="mb-4 text-center">Maintenance Center</h2>

      {/* Mobile Quick Actions - Same style as desktop */}
      <div 
        className="d-lg-none position-fixed start-0 end-0"
        style={{
          top: "60px",
          zIndex: 1045,
          background: "transparent",
        }}
      >
        <div className="container-fluid contextual-actions-container">
          <div className="d-flex align-items-center justify-content-center gap-2 py-2 px-2 flex-wrap">
            <button className="contextual-action-btn" onClick={() => navigate('/maintenance')} style={{ color: mainColor || '#3498db', boxShadow: `0 4px 15px ${mainColor ? `${mainColor}66` : 'rgba(52, 152, 219, 0.4)'}` }}>
              <i className="bi bi-tools" style={{ color: mainColor || '#3498db' }} />
              <span className="action-label" style={{ color: mainColor || '#3498db' }}>All Tasks</span>
            </button>
            <button className="contextual-action-btn" onClick={() => navigate('/rooms')} style={{ color: mainColor || '#3498db', boxShadow: `0 4px 15px ${mainColor ? `${mainColor}66` : 'rgba(52, 152, 219, 0.4)'}` }}>
              <i className="bi bi-door-open" style={{ color: mainColor || '#3498db' }} />
              <span className="action-label" style={{ color: mainColor || '#3498db' }}>Rooms</span>
            </button>
            <button className="contextual-action-btn" onClick={() => navigate(`/${hotelIdentifier}/staff`)} style={{ color: mainColor || '#3498db', boxShadow: `0 4px 15px ${mainColor ? `${mainColor}66` : 'rgba(52, 152, 219, 0.4)'}` }}>
              <i className="bi bi-people" style={{ color: mainColor || '#3498db' }} />
              <span className="action-label" style={{ color: mainColor || '#3498db' }}>Staff</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1) Submission Form */}
      <SubmitMaintenanceRequest
        onSuccess={() => refetch && refetch()}
      />

      {/* 2) Requests Display */}
      <MaintenanceRequests
        refetchSetter={(fn) => (refetch = fn)}
      />
    </div>
  );
}

// src/pages/Settings.jsx
import React from "react";
import ColorSelector from "@/components/utils/ColorSelector";
import QRRegistrationManager from "@/components/utils/QRRegistrationManager";

export default function Settings() {
  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <h2 className="mb-4">Hotel Settings</h2>
        </div>
      </div>
      
      <div className="row">
        {/* QR Registration Manager */}
        <div className="col-12 mb-4">
          <QRRegistrationManager />
        </div>
        
        {/* Color Selector */}
        <div className="col-12 mb-4">
          <div className="card shadow-sm">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">
                <i className="fas fa-palette me-2"></i>
                Theme Customization
              </h5>
            </div>
            <div className="card-body">
              <ColorSelector />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
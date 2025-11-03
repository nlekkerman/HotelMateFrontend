// src/pages/Settings.jsx
import React from "react";
import ColorSelector from "@/components/utils/ColorSelector";
import NotificationSettings from "@/components/utils/NotificationSettings";
import FCMStatusChecker from "@/components/utils/FCMStatusChecker";
import FCMTest from "@/components/utils/FCMTest";

export default function Settings() {
  return (
    <div className="container py-5">
      <h2 className="mb-4">Settings</h2>
      
      <div className="row g-4">
        <div className="col-12 col-lg-6">
          <h5 className="mb-3">Customize Hotel</h5>
          <ColorSelector />
        </div>
        
        <div className="col-12 col-lg-6">
          <h5 className="mb-3">Notifications</h5>
          <NotificationSettings />
        </div>
        
        {/* Status Checker - Shows what's ready */}
        <div className="col-12">
          <FCMStatusChecker />
        </div>
        
        {/* Debug Panel - Full testing tools */}
        <div className="col-12">
          <FCMTest />
        </div>
      </div>
    </div>
  );
}

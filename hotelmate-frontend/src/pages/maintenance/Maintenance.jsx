import React from "react";
import SubmitMaintenanceRequest from "@/components/maintenance/SubmitMaintenanceRequest";
import MaintenanceRequests from "@/components/maintenance/MaintenanceRequests";

export default function Maintenance() {
  // nothing but composition: both share the same fetchRequests via refetch
  let refetch; // we'll wire this up via a ref in MaintenanceRequests

  return (
    <div className="container my-4">
      <h2 className="mb-4 text-center">Maintenance Center</h2>

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

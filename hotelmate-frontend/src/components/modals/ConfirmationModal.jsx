import React from "react";

export default function ConfirmationModal({ title, message, onConfirm, onCancel }) {
  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.6)",
          zIndex: 9999,
        }}
        onClick={onCancel}
      />
      <div 
        style={{ 
          position: "fixed", 
          inset: 0, 
          zIndex: 10000, 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          pointerEvents: "none"
        }}
      >
        <div 
          className="modal-dialog"
          style={{ position: "relative", margin: 0, maxWidth: 450, pointerEvents: "auto" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="modal-content shadow-lg" style={{ backgroundColor: "white" }}>
            <div className="modal-header bg-warning text-dark">
              <h5 className="modal-title">
                <i className="bi bi-exclamation-circle-fill me-2"></i>
                {title}
              </h5>
              <button
                type="button"
                className="btn-close"
                onClick={onCancel}
              ></button>
            </div>
            <div className="modal-body">
              <p className="mb-0">{message}</p>
            </div>
            <div className="modal-footer d-flex justify-content-evenly">
              <button className="btn btn-secondary " onClick={onCancel}>
                Cancel
              </button>
              <button className="btn btn-primary" onClick={onConfirm}>
                <i className="bi bi-check-circle me-1"></i>
                Confirm
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

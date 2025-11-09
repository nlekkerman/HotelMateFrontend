import React, { useEffect } from "react";

export default function SuccessModal({ show, message = "Success!", onClose }) {
  // Auto-close after 2 seconds
  useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <>
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.6)",
          zIndex: 9999,
        }}
        onClick={onClose}
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
            <div className="modal-header bg-success text-white">
              <h5 className="modal-title">
                <i className="bi bi-check-circle-fill me-2"></i>
                Success
              </h5>
              <button
                type="button"
                className="btn-close btn-close-white"
                aria-label="Close"
                onClick={onClose}
              />
            </div>
            <div className="modal-body text-center">
              <p className="mb-0">{message}</p>
            </div>
            <div className="modal-footer d-flex justify-content-center">
              <button
                type="button"
                className="btn btn-success"
                onClick={onClose}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

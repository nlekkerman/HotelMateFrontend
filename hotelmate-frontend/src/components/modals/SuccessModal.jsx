import React from "react";

export default function SuccessModal({ show, message = "Success!", onClose }) {
  if (!show) return null;

  return (
    <div
      className="modal-backdrop main-bg"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
      onClick={onClose}
    >
      <div
        className="modal-content bg-white p-4 rounded shadow custom-main-bg-outline"
        style={{ minWidth: 300, maxWidth: 400 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h5 className="mb-3 main-text">Success</h5>
        <div className="mb-4 custom-main-text">{message}</div>
        <div className="d-flex justify-content-end">
          <button
            className="custom-button"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

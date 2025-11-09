// src/components/DeletionModal.jsx
import React from "react";

export default function DeletionModal({
  show,
  title = "Confirm Deletion",
  children,
  confirmText = "Delete",
  cancelText = "Cancel",
  onClose,
  onConfirm,
}) {
  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.6)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-dialog-centered"
        style={{ zIndex: 10000, maxWidth: 450, position: "relative" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content shadow-lg" style={{ backgroundColor: "white" }}>
          {/* Header */}
          <div className="modal-header bg-danger text-white">
            <h5 className="modal-title">
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {title}
            </h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              aria-label="Close"
              onClick={onClose}
            />
          </div>

          {/* Body */}
          <div className="modal-body">
            {children}
          </div>

          {/* Footer */}
          <div className="modal-footer d-flex justify-content-evenly">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              {cancelText}
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={onConfirm}
            >
              <i className="bi bi-trash me-1"></i>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
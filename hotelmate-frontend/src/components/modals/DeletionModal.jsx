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
      className="deletion-modal-backdrop"
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.3)",
        zIndex: 1050,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
      onClick={onClose}
    >
      <div
        className="deletion-modal-content bg-white p-4 rounded shadow"
        style={{ minWidth: 320, maxWidth: 400 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0">{title}</h5>
          <button
            type="button"
            className="btn-close"
            aria-label="Close"
            onClick={onClose}
          />
        </div>

        {/* Body */}
        <div className="mb-4">
          {children}
        </div>

        {/* Footer */}
        <div className="d-flex justify-content-end">
          <button
            type="button"
            className="btn btn-secondary me-2"
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={onConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
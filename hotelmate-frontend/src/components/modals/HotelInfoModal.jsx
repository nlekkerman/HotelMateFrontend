import React from "react";

export default function HotelInfoModal({ children, onClose }) {
    
  return (
    <div
      className="hotelinfo-modal-backdrop"
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
        className="hotelinfo-modal-content bg-white p-4 rounded shadow"
        style={{ minWidth: 320, maxWidth: 400 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="d-flex justify-content-end mb-2">
          <button
            className="btn-close"
            style={{ background: "none", border: "none", fontSize: "1.5rem", lineHeight: 1 }}
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

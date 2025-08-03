import React from "react";

export default function ImageModal({ src, alt = "Image", onClose }) {
  if (!src) return null;

  return (
    <div
      className="modal-backdrop"
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(0,0,0,0.85)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 1050,
        cursor: "zoom-out",
      }}
    >
      <img
        src={src}
        alt={alt}
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking image
        style={{
          maxWidth: "95%",
          maxHeight: "95%",
          objectFit: "contain",
          borderRadius: "8px",
        }}
      />
    </div>
  );
}

// src/pages/Settings.jsx
import React from "react";
import ColorSelector from "@/components/utils/ColorSelector";

export default function Settings() {
  return (
    <div className="container py-5">
      <h2 className="mb-4">Customize Hotel</h2>
      <ColorSelector />
    </div>
  );
}

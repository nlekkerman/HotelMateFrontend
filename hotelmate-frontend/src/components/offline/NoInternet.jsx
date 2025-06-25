// src/components/NoInternet.jsx
import React from "react";

export default function NoInternet() {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        textAlign: "center",
        padding: "20px",
      }}
    >
      <h1>⚠️ No Internet Connection</h1>
      <p>Please check your connection and try again.</p>
      <p>Try refreshing this page when you're back online.</p>
      {/* Optional: Add a simple offline game or animation here */}
    </div>
  );
}

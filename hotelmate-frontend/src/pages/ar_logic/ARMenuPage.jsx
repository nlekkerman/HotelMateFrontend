// src/pages/ARMenuPage.jsx
import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import api from "@/services/api";
import ARScene from "@/components/ar_logic/ARScene";

export default function ARMenuPage() {
  const { hotel_slug, restaurant_slug } = useParams();
  const [instruction, setInstruction] = useState("Loading…");
  const [error, setError] = useState(null);

  // logs array for UI
  const [logs, setLogs] = useState([]);

  const addLog = (msg) => {
    console.log(msg);
    setLogs((prev) => [...prev, msg]);
  };

  useEffect(() => {
    addLog(`🔍 Fetching AR instructions for ${hotel_slug}/${restaurant_slug}…`);
    api
      .get("/ar_navigation/ar-anchors/", {
        params: { hotel: hotel_slug, restaurant: restaurant_slug },
      })
      .then((res) => {
        addLog("📦 Raw response: " + JSON.stringify(res.data));
        const anchors = res.data.results || [];
        addLog(`✅ Found ${anchors.length} anchor(s).`);
        if (anchors.length) {
          addLog("ℹ️ Using instruction: " + anchors[0].instruction);
          setInstruction(anchors[0].instruction);
        } else {
          addLog("⚠️ No anchors—using fallback text.");
          setInstruction("Point your camera at the marker to see the menu.");
        }
      })
      .catch((err) => {
        console.error(err);
        addLog("❌ Fetch error: " + err.message);
        setError("Failed to load AR instructions.");
      });
  }, [hotel_slug, restaurant_slug]);

  if (error) {
    return <div className="text-danger">{error}</div>;
  }

  return (
    <div style={{ position: "relative" }}>
      {/* AR Scene */}
      <ARScene text={instruction} />

      {/* On-screen log panel */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: "25vh",
          overflowY: "auto",
          background: "rgba(0,0,0,0.6)",
          color: "white",
          fontSize: "0.75rem",
          padding: "0.5rem",
          fontFamily: "monospace",
        }}
      >
        <strong>Debug Logs:</strong>
        <ul style={{ margin: 0, padding: 0, listStyle: "none" }}>
          {logs.map((l, i) => (
            <li key={i}>{l}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

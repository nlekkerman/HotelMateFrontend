import React, { useEffect, useState } from 'react';
import api from '@/services/api';
import LoveMarkerAR from '@/components/ar_logic/LoveMarkerAR';

export default function ARMarkerViewer({ anchorId }) {
  const [anchor, setAnchor] = useState(null);
  const [status, setStatus] = useState("🔄 Initializing AR...");
  const [scanStatus, setScanStatus] = useState("🕵️‍♂️ Scanning...");
  const [cameraPos, setCameraPos] = useState("N/A");
  const [errors, setErrors] = useState(null);

  // Fetch anchor info
  useEffect(() => {
    setStatus("📡 Fetching anchor data...");
    api.get(`/ar_navigation/anchor/${anchorId}/`)
      .then(res => {
        setAnchor(res.data);
        setStatus(`✅ Loaded anchor: ${res.data.name}`);
        console.log(`[${new Date().toLocaleTimeString()}] Anchor data loaded`, res.data);
      })
      .catch(err => {
        console.error("❌ Anchor fetch error:", err);
        setStatus("❌ Failed to load anchor.");
        setErrors("Could not fetch AR anchor. Check network or backend.");
      });
  }, [anchorId]);

  // Detect when marker is seen
  useEffect(() => {
    const handler = () => {
      const marker = document.querySelector("a-marker");
      if (!marker) return;

      const onMarkerFound = () => {
        setScanStatus("🎯 Marker detected!");
        console.log(`[${new Date().toLocaleTimeString()}] Marker found`);
      };

      const onMarkerLost = () => {
        setScanStatus("🕵️‍♂️ Scanning...");
        console.log(`[${new Date().toLocaleTimeString()}] Marker lost`);
      };

      marker.addEventListener("markerFound", onMarkerFound);
      marker.addEventListener("markerLost", onMarkerLost);

      return () => {
        marker.removeEventListener("markerFound", onMarkerFound);
        marker.removeEventListener("markerLost", onMarkerLost);
      };
    };

    setTimeout(handler, 1000); // Wait 1s for scene to load
  }, [anchor]);

  // Live camera tracking (optional)
  useEffect(() => {
    const interval = setInterval(() => {
      const camera = document.querySelector("[camera]");
      if (camera && camera.object3D) {
        const pos = camera.object3D.position;
        setCameraPos(`x: ${pos.x.toFixed(2)}, y: ${pos.y.toFixed(2)}, z: ${pos.z.toFixed(2)}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!anchor) {
    return <p style={{ color: "white", padding: "2rem" }}>{status}</p>;
  }

  return (
    <div style={{ height: '100vh', width: '100vw', position: 'relative' }}>
      {/* Debug Panel (top-left) */}
      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: 'rgba(0,0,0,0.7)',
        color: 'white',
        padding: '12px 16px',
        borderRadius: '10px',
        fontSize: '0.85rem',
        zIndex: 999
      }}>
        <div><strong>Status:</strong> {status}</div>
        <div><strong>Scan:</strong> {scanStatus}</div>
        <div><strong>Anchor:</strong> {anchor.name}</div>
        <div><strong>Camera:</strong> {cameraPos}</div>
        {errors && <div style={{ color: 'red' }}>⚠️ {errors}</div>}
      </div>

      {/* Marker preview (top-right) */}
      <div style={{
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'white',
        padding: '6px',
        borderRadius: '8px',
        boxShadow: '0 0 10px rgba(0,0,0,0.3)',
        zIndex: 999
      }}>
        <img
          src={anchor.image_url}
          alt="Marker Preview"
          style={{
            height: '80px',
            borderRadius: '4px',
            objectFit: 'contain'
          }}
        />
      </div>

      {/* AR Scene */}
      <a-scene embedded arjs="sourceType: webcam; debugUIEnabled: false;">
        {anchor.name.toLowerCase().includes("love") ? (
          <LoveMarkerAR imageUrl={anchor.image_url} />
        ) : (
          <a-marker type={anchor.marker_type} url={anchor.image_url}>
            <a-text
              value={anchor.instruction}
              position="0 0.5 0"
              rotation="-90 0 0"
              scale="2 2 2"
              color="black"
            />
          </a-marker>
        )}
        <a-entity camera></a-entity>
      </a-scene>
    </div>
  );
}

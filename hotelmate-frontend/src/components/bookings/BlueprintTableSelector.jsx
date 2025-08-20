import React, { useState, useEffect } from "react";

export default function BlueprintTableSelector({
  tables,
  availableTableIds = [],
  objects: objectsWrapper,
  selectedTableId,
  selectedObjectId,
  onSelectTable,
  onSelectObject,
}) {
  const objects = Array.isArray(objectsWrapper?.results)
    ? objectsWrapper.results
    : objectsWrapper || [];

  const originalBpSize = { width: 800, height: 600 };
  const [bpSize, setBpSize] = useState(originalBpSize);

  const getBlueprintSize = () => {
    const width = window.innerWidth;
    if (width <= 576) return { width: 300, height: 200 };
    if (width <= 992) return { width: 600, height: 400 };
    return { width: 1000, height: 600 };
  };

  useEffect(() => {
    setBpSize(getBlueprintSize());
    const handleResize = () => setBpSize(getBlueprintSize());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const scaleX = (bpSize.width / originalBpSize.width) * 0.8;
  const scaleY = bpSize.height / originalBpSize.height;

  return (
    <div
      className="blueprint-tab"
      style={{
        width: bpSize.width,
        height: bpSize.height,
        position: "relative",
        border: "1px solid #ccc",
        marginTop: 10,
      }}
    >

      {/* Tables */}
      {tables.map((t) => {
        const pos = { x: t.x || 0, y: t.y || 0 };
        const width = (t.width || t.radius * 2 || 30) * scaleX;
        const height = (t.height || t.radius * 2 || 30) * scaleY;
        const left = Math.min(pos.x * scaleX, bpSize.width - width);
        const top = Math.min(pos.y * scaleY, bpSize.height - height);

        const isAvailable = availableTableIds.length === 0 || availableTableIds.includes(t.id);
        const shouldPulse = isAvailable && !selectedTableId;

        return (
          <div
            key={`table-${t.id}`}
            onClick={() => isAvailable && onSelectTable?.(t)}
            className={`dining-table ${shouldPulse ? "pulse" : ""}`}
            style={{
              position: "absolute",
              left,
              top,
              width,
              height,
              borderRadius: t.shape === "CIRCLE" ? "50%" : "0",
              backgroundColor: selectedTableId === t.id ? "#333" : isAvailable ? "#eee" : "#ccc",
              color: selectedTableId === t.id ? "#fff" : isAvailable ? "#000" : "#666",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              cursor: isAvailable ? "pointer" : "not-allowed",
              border: "1px solid #999",
              transform: `rotate(${t.rotation || 0}deg)`,
              opacity: isAvailable ? 1 : 0.5,
            }}
          >
            {t.code}
          </div>
        );
      })}

      {/* Objects */}
      {objects.map((o) => {
        const pos = { x: o.x || 0, y: o.y || 0 };
        const width = (o.width || 50) * scaleX;
        const height = (o.height || 50) * scaleY;
        const left = Math.min(pos.x * scaleX, bpSize.width - width);
        const top = Math.min(pos.y * scaleY, bpSize.height - height);

        return (
          <div
            key={`obj-${o.id}`}
            onClick={() => onSelectObject?.(o)}
            className="blueprint-object"
            style={{
              position: "absolute",
              left,
              top,
              width,
              height,
              background: selectedObjectId === o.id ? "#444" : "#eee",
              color: selectedObjectId === o.id ? "#fff" : "#000",
              border: "1px solid #999",
              cursor: "pointer",
              textAlign: "center",
              lineHeight: "1",
              transform: `rotate(${0}deg)`,
              transformOrigin: "center center",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {o.rotation % 180 === 90 ? (
              <span
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                }}
              >
                {(o.name || o.type?.name).split("").map((letter, i) => (
                  <span key={i}>{letter}</span>
                ))}
              </span>
            ) : (
              o.name || o.type?.name
            )}
          </div>
        );
      })}
    </div>
  );
}

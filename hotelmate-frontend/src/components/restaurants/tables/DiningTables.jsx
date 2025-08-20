import React, { useRef, useState, useEffect } from "react";
import Draggable from "react-draggable";
import { useDiningTable } from "@/components/restaurants/hooks/useDiningTable";
import CreateTableModal from "@/components/restaurants/modals/CreateTableModal";
import CreateBlueprintObjectModal from "@/components/restaurants/modals/CreateBlueprintObjectModal"; // <- new modal
import { useBlueprintObjects } from "@/components/restaurants/hooks/useBlueprintObjects"; // hook to manage objects

export default function DiningTables({
  hotelSlug,
  restaurantSlug,
  restaurantId,
  blueprint,
}) {
  // Tables
  const {
    tables = [],
    createTable,
    updateTable,
  } = useDiningTable(hotelSlug, restaurantSlug);
  const [showTableModal, setShowTableModal] = useState(false);

  // Blueprint objects
  const {
    objects = [],
    objectTypes = [],
    createObject,
    updateObject,
  } = useBlueprintObjects(hotelSlug, restaurantSlug, blueprint?.id);
  const [showObjectModal, setShowObjectModal] = useState(false);

  // Refs & scaling
  const tableRefs = useRef({});
  const objectRefs = useRef({});
  const originalBpSize = {
    width: blueprint?.width || 800,
    height: blueprint?.height || 600,
  };
  const [bpSize, setBpSize] = useState(originalBpSize);

  if (!blueprint) return <p>No blueprint available.</p>;

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

  const scaleX = bpSize.width / originalBpSize.width;
  const scaleY = bpSize.height / originalBpSize.height;

  // Drag handlers
  const handleTableDragStop = (tableId, data) => {
    updateTable(tableId, {
      x: Math.round(data.x / scaleX),
      y: Math.round(data.y / scaleY),
    });
  };
  const handleObjectDragStop = (objectId, data) => {
    updateObject(objectId, {
      x: Math.round(data.x / scaleX),
      y: Math.round(data.y / scaleY),
    });
  };

  const getScaledPosition = (item) => ({
    x: (item.x || 0) * scaleX,
    y: (item.y || 0) * scaleY,
  });

  return (
    <>
      {/* Controls */}
      <div className="controls mb-2">
        <button
          className="btn custom-button me-2"
          onClick={() => setShowTableModal(true)}
        >
          Add Table
        </button>
        <button
          className="btn btn-secondary"
          onClick={() => setShowObjectModal(true)}
        >
          Add Object
        </button>
      </div>

      {/* Modals */}
      <CreateTableModal
        show={showTableModal}
        onClose={() => setShowTableModal(false)}
        onCreate={(table) =>
          createTable({ ...table, restaurant: restaurantId, x: 0, y: 0 })
        }
        nextTableNumber={tables.length + 1}
      />

      <CreateBlueprintObjectModal
  show={showObjectModal}
  onClose={() => setShowObjectModal(false)}
  onCreate={(obj) =>
    createObject({
      name: obj.name,
      blueprint_id: blueprint.id,   // required
      type_id: obj.type_id,         // ✅ use type_id directly
      x: obj.x ?? 0,
      y: obj.y ?? 0,
      width: obj.width || 50,
      height: obj.height || 50,
      rotation: obj.rotation || 0,
    })
  }
  objectTypes={objectTypes}
/>


      {/* Blueprint */}
      <div
        className="blueprint-tab"
        style={{
          width: bpSize.width,
          height: bpSize.height,
          position: "relative",
          border: "1px solid #ccc",
        }}
      >
        {/* Render tables */}
        {tables.map((table) => {
          if (!tableRefs.current[table.id])
            tableRefs.current[table.id] = React.createRef();
          const width = (table.width || table.radius * 2 || 30) * scaleX;
          const height = (table.height || table.radius * 2 || 30) * scaleY;
          const pos = getScaledPosition(table);

          return (
            <Draggable
              key={table.id}
              nodeRef={tableRefs.current[table.id]}
              position={pos}
              bounds="parent"
              onStop={(e, data) => handleTableDragStop(table.id, data)}
            >
              <div
                ref={tableRefs.current[table.id]}
                className="dining-table"
                style={{
                  lineHeight: "1",
                  textAlign: "center",
                  cursor: "move",
                  width,
                  height,
                  borderRadius: table.shape === "CIRCLE" ? "50%" : "0",
                  transform: `rotate(${table.rotation || 0}deg)`,
                  position: "absolute",
                }}
              >
                {table.code}
                
              </div>
            </Draggable>
          );
        })}

        {/* Render blueprint objects */}
        {objects.map((obj) => {
          if (!objectRefs.current[obj.id])
            objectRefs.current[obj.id] = React.createRef();
          const width = (obj.width || 50) * scaleX;
          const height = (obj.height || 50) * scaleY;
          const pos = getScaledPosition(obj);

          return (
            <Draggable
              key={obj.id}
              nodeRef={objectRefs.current[obj.id]}
              position={pos}
              bounds="parent"
              onStop={(e, data) => handleObjectDragStop(obj.id, data)}
            >
              <div
                ref={objectRefs.current[obj.id]}
                className="blueprint-object"
                style={{
                  lineHeight: "1",
                  textAlign: "center",
                  cursor: "move",
                  width,
                  height,
                  transform: `rotate(${obj.rotation || 0}deg)`,
                  position: "absolute",
                  background: "#eee",
                  border: "1px solid #999",
                  borderRadius: obj.type.name === "Window" ? "5px" : "0",
                }}
              >
                {obj.name || obj.type.name}
              </div>
            </Draggable>
          );
        })}
      </div>
    </>
  );
}

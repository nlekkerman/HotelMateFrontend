import React, { useState, useEffect, useRef } from "react";
import Draggable from "react-draggable";
import { useDiningTable } from "@/components/restaurants/hooks/useDiningTable";
import { useBlueprintObjects } from "@/components/restaurants/hooks/useBlueprintObjects";
import CreateTableModal from "@/components/restaurants/modals/CreateTableModal";
import CreateBlueprintObjectModal from "@/components/restaurants/modals/CreateBlueprintObjectModal";
import EditTableModal from "@/components/restaurants/modals/EditTableModal";
import EditBlueprintObjectModal from "@/components/restaurants/modals/EditBlueprintObjectModal";

function DraggableTable({
  table,
  pos,
  scaleX,
  scaleY,
  onDrag,
  onStop,
  onEdit,
}) {
  const ref = useRef(null);
  const [hovered, setHovered] = useState(false);

  const width = (table.width || table.radius * 2 || 30) * scaleX;
  const height = (table.height || table.radius * 2 || 30) * scaleY;

  return (
    <Draggable
      nodeRef={ref}
      position={{ x: pos.x * scaleX, y: pos.y * scaleY }}
      bounds="parent"
      onDrag={(e, data) =>
        onDrag(table.id, { x: data.x / scaleX, y: data.y / scaleY })
      }
      onStop={(e, data) =>
        onStop(table.id, { x: data.x / scaleX, y: data.y / scaleY })
      }
    >
      <div
        ref={ref}
        className="dining-table"
        style={{
          width,
          height,
          cursor: "move",
          position: "absolute",
          borderRadius: table.shape === "CIRCLE" ? "50%" : "0",
          transform: `rotate(${table.rotation || 0}deg)`,
          lineHeight: "1",
          textAlign: "center",
          background: "#fff",
          border: "1px solid #333",
          transition: "box-shadow 0.2s",
          boxShadow: hovered ? "0 0 10px rgba(0,0,0,0.3)" : "none",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {table.code}

        {/* Hover icon */}
        <div
          onClick={(e) => {
            e.stopPropagation(); // Prevent drag
            onEdit(table);
          }}
          style={{
            position: "absolute",
            top: -10,
            right: -10,
            width: 24,
            height: 24,
            background: "#007bff",
            color: "#fff",
            borderRadius: "50%",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            fontSize: 14,
            cursor: "pointer",
            opacity: hovered ? 1 : 0,
            transition: "opacity 0.2s, transform 0.2s",
            transform: hovered ? "translate(0,0)" : "translate(5px,-5px)",
          }}
        >
          ✏️
        </div>
      </div>
    </Draggable>
  );
}

function DraggableObject({ obj, pos, scaleX, scaleY, onDrag, onStop, onEdit }) {
  const ref = useRef(null);
  const [hovered, setHovered] = useState(false);

  const width = (obj.width || 50) * scaleX;
  const height = (obj.height || 50) * scaleY;

  return (
    <Draggable
      nodeRef={ref}
      position={{ x: pos.x * scaleX, y: pos.y * scaleY }}
      bounds="parent"
      onDrag={(e, data) =>
        onDrag(obj.id, { x: data.x / scaleX, y: data.y / scaleY })
      }
      onStop={(e, data) =>
        onStop(obj.id, { x: data.x / scaleX, y: data.y / scaleY })
      }
    >
      <div
        ref={ref}
        className="blueprint-object"
        style={{
          width,
          height,
          cursor: "move",
          position: "absolute",
          transform: `rotate(${obj.rotation || 0}deg)`,
          background: "#eee",
          border: "1px solid #999",
          textAlign: "center",
          transition: "box-shadow 0.2s",
          boxShadow: hovered ? "0 0 8px rgba(0,0,0,0.3)" : "none",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {obj.rotation % 180 === 90 ? (
  <span style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
    {(obj.name || obj.type?.name).split("").map((letter, i) => (
      <span key={i}>{letter}</span>
    ))}
  </span>
) : (
  obj.name || obj.type?.name
)}



        {/* Hover edit icon */}
        {onEdit && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onEdit(obj);
            }}
            style={{
              position: "absolute",
              top: -10,
              right: -10,
              width: 24,
              height: 24,
              background: "#28a745",
              color: "#fff",
              borderRadius: "50%",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: 14,
              cursor: "pointer",
              opacity: hovered ? 1 : 0,
              transform: hovered
                ? "scale(1) translate(0,0)"
                : "scale(0.5) translate(5px,-5px)",
              transition: "opacity 0.2s, transform 0.2s",
            }}
          >
            ✏️
          </div>
        )}
      </div>
    </Draggable>
  );
}

export default function BlueprintFloorEditor({
  hotelSlug,
  restaurantSlug,
  restaurantId,
  blueprint,
}) {
  if (!blueprint) return <p>No blueprint available.</p>;

  // --- Dining Tables ---
  const {
    tables = [],
    createTable,
    updateTable,
    deleteTable,
  } = useDiningTable(hotelSlug, restaurantSlug);
  const [showTableModal, setShowTableModal] = useState(false);
  const [editingTable, setEditingTable] = useState(null);
  const [editingObject, setEditingObject] = useState(null);
  const [showEditObjectModal, setShowEditObjectModal] = useState(false);

  // --- Blueprint Objects ---
  const {
    objects = [],
    objectTypes = [],
    createObject,
    updateObject,
  } = useBlueprintObjects(hotelSlug, restaurantSlug, blueprint?.id);
  const [showObjectModal, setShowObjectModal] = useState(false);

  // --- Scaling ---
  const originalBpSize = {
    width: blueprint.width || 800,
    height: blueprint.height || 600,
  };
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

  const scaleX = bpSize.width / originalBpSize.width;
  const scaleY = bpSize.height / originalBpSize.height;

  // --- Controlled Positions (unscaled, DB values) ---
  const [tablePositions, setTablePositions] = useState({});
  const [objectPositions, setObjectPositions] = useState({});

  useEffect(() => {
    const newPositions = {};
    tables.forEach((t) => {
      newPositions[t.id] = { x: t.x || 0, y: t.y || 0 };
    });
    setTablePositions(newPositions);
  }, [tables]);

  useEffect(() => {
    const newPositions = {};
    objects.forEach((o) => {
      newPositions[o.id] = { x: o.x || 0, y: o.y || 0 };
    });
    setObjectPositions(newPositions);
  }, [objects]);

  // --- Table Handlers ---
  const handleTableDrag = (id, pos) => {
    setTablePositions((prev) => ({
      ...prev,
      [id]: pos,
    }));
    console.log("Dragging table", id, "to", pos);
  };

  const handleTableDragStop = (id, pos) => {
    // Optimistic update: update local tablePositions right away
    setTablePositions((prev) => ({
      ...prev,
      [id]: { x: Math.round(pos.x), y: Math.round(pos.y) },
    }));

    // Send to backend
    updateTable(id, {
      x: Math.round(pos.x),
      y: Math.round(pos.y),
    });
  };

  // --- Object Handlers ---
  const handleObjectDrag = (id, pos) => {
    setObjectPositions((prev) => ({
      ...prev,
      [id]: pos,
    }));
  };

  const handleObjectDragStop = (id, pos) => {
    updateObject(id, {
      x: Math.round(pos.x),
      y: Math.round(pos.y),
    });
  };
  // Close modal and reset
  const handleCloseTableModal = () => {
    setEditingTable(null);
    setShowTableModal(false);
  };

  // Handle delete
  const handleDeleteTable = async (tableId) => {
    if (window.confirm("Are you sure you want to delete this table?")) {
      await deleteTable(tableId);
      setTablePositions((prev) => {
        const newPositions = { ...prev };
        delete newPositions[tableId];
        return newPositions;
      });
    }
  };
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
            blueprint_id: blueprint.id,
            type_id: obj.type_id,
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
        {/* Render Tables */}
        {tables.map((t) => (
          <DraggableTable
            key={t.id}
            table={t}
            pos={tablePositions[t.id] || { x: 0, y: 0 }}
            scaleX={scaleX}
            scaleY={scaleY}
            onDrag={handleTableDrag}
            onStop={handleTableDragStop}
            onEdit={(table) => {
              setEditingTable(table);
              setShowTableModal(true);
            }}
          />
        ))}

        {/* Render Objects */}
        {objects.map((o) => (
          <DraggableObject
            key={o.id}
            obj={o}
            pos={objectPositions[o.id] || { x: 0, y: 0 }}
            scaleX={scaleX}
            scaleY={scaleY}
            onDrag={handleObjectDrag}
            onStop={handleObjectDragStop}
            onEdit={(obj) => {
              setEditingObject(obj);
              setShowEditObjectModal(true);
            }}
          />
        ))}
        <EditTableModal
          show={showTableModal}
          table={editingTable}
          onClose={handleCloseTableModal}
          onUpdate={(updatedTable) => {
            updateTable(editingTable.id, updatedTable);
            setShowTableModal(false);
          }}
          onDelete={handleDeleteTable}
        />

        {/* Edit Object Modal */}
        <EditBlueprintObjectModal
          show={showEditObjectModal}
          object={editingObject}
          onClose={() => {
            setEditingObject(null);
            setShowEditObjectModal(false);
          }}
          onUpdate={(updatedObj) => {
            if (!editingObject) return;
            updateObject(editingObject.id, updatedObj);
            setShowEditObjectModal(false);
          }}
          onDelete={async (objId) => {
            if (!window.confirm("Are you sure you want to delete this object?"))
              return;
            // Assuming you have a deleteObject method similar to tables
            await deleteObject(objId);
            setObjectPositions((prev) => {
              const newPositions = { ...prev };
              delete newPositions[objId];
              return newPositions;
            });
            setShowEditObjectModal(false);
          }}
        />
      </div>
    </>
  );
}

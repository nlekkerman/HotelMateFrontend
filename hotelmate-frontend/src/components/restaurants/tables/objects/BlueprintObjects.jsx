import React, { useRef, useState, useEffect } from "react";
import Draggable from "react-draggable";
import { useBlueprintObjects } from "@/components/restaurants/hooks/useBlueprintObjects";
import CreateBlueprintObjectModal from "@/components/restaurants/modals/CreateBlueprintObjectModal";

export default function BlueprintObjects({ hotelSlug, restaurantSlug, blueprint }) {
  console.log("BlueprintObjects props:", { hotelSlug, restaurantSlug, blueprint });

  const { objects = [], objectTypes = [], createObject, updateObject } = useBlueprintObjects(
    hotelSlug,
    restaurantSlug,
    blueprint?.id
  );

  console.log("Fetched objects:", objects);
  console.log("Fetched objectTypes:", objectTypes);

  const [showObjectModal, setShowObjectModal] = useState(false);
  const objectRefs = useRef({});
  const originalBpSize = { width: blueprint?.width || 800, height: blueprint?.height || 600 };
  const [bpSize, setBpSize] = useState(originalBpSize);

  if (!blueprint) {
    console.log("No blueprint available");
    return <p>No blueprint available.</p>;
  }

  // Responsive scaling
  const getBlueprintSize = () => {
    const width = window.innerWidth;
    let size;
    if (width <= 576) size = { width: 300, height: 200 };
    else if (width <= 992) size = { width: 600, height: 400 };
    else size = { width: 1000, height: 600 };
    console.log("Calculated blueprint size:", size);
    return size;
  };

  useEffect(() => {
    setBpSize(getBlueprintSize());
    const handleResize = () => {
      const newSize = getBlueprintSize();
      console.log("Window resized, new blueprint size:", newSize);
      setBpSize(newSize);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const scaleX = bpSize.width / originalBpSize.width;
  const scaleY = bpSize.height / originalBpSize.height;

  console.log("Scale factors:", { scaleX, scaleY });

  // Helpers
  const getScaledPosition = (item) => ({
    x: (item.x || 0) * scaleX,
    y: (item.y || 0) * scaleY,
  });

  const handleObjectDragStop = (objectId, data) => {
    console.log(`Object ${objectId} drag stopped`, data);
    updateObject(objectId, {
      x: Math.round(data.x / scaleX),
      y: Math.round(data.y / scaleY),
    });
    console.log(`Updated object ${objectId} position`);
  };

  return (
    <>
      {/* Controls */}
      <div className="controls mb-2">
        <button className="btn btn-secondary" onClick={() => {
          console.log("Opening object modal");
          setShowObjectModal(true);
        }}>
          Add Object
        </button>
      </div>

      {/* Modal */}
      <CreateBlueprintObjectModal
        show={showObjectModal}
        onClose={() => {
          console.log("Closing object modal");
          setShowObjectModal(false);
        }}
        onCreate={(obj) => {
          console.log("Creating object:", obj);
          createObject({ ...obj, blueprint: blueprint.id });
        }}
        objectTypes={objectTypes}
      />

      {/* Blueprint canvas */}
      <div
        className="blueprint-tab"
        style={{
          width: bpSize.width,
          height: bpSize.height,
          position: "relative",
          border: "1px solid #ccc",
        }}
      >
        {objects.map((obj) => {
          if (!objectRefs.current[obj.id]) objectRefs.current[obj.id] = React.createRef();

          const width = (obj.width || obj.type?.default_width || 50) * scaleX;
          const height = (obj.height || obj.type?.default_height || 50) * scaleY;
          const pos = getScaledPosition(obj);

          console.log(`Rendering object ${obj.id}:`, { width, height, pos });

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
                  width,
                  height,
                  cursor: "move",
                  position: "absolute",
                  textAlign: "center",
                  lineHeight: "1",
                  transform: `rotate(${obj.rotation || 0}deg)`,
                  background: obj.type?.icon ? `url(${obj.type.icon}) center/contain no-repeat` : "#eee",
                  border: "1px solid #999",
                  borderRadius: obj.type?.name === "Window" ? "5px" : "0",
                }}
              >
                {!obj.type?.icon && (obj.name || obj.type?.name)}
              </div>
            </Draggable>
          );
        })}
      </div>
    </>
  );
}

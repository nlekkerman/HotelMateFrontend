import React from "react";

const BlueprintViewer = ({ blueprint, onCreate, onUpdate, onDelete }) => {
  if (!blueprint) {
    return (
      <div>
        <p>No blueprint yet.</p>
        {onCreate && (
          <button className="btn btn-primary" onClick={onCreate}>
            Create Blueprint
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <p>
        Width: {blueprint.width} | Height: {blueprint.height} | Grid: {blueprint.grid_size}
      </p>
      <div className="mb-2">
        {onUpdate && (
          <button
            className="btn btn-success me-2"
            onClick={() => onUpdate({ ...blueprint, width: blueprint.width + 100 })}
          >
            Increase Width
          </button>
        )}
        {onDelete && (
          <button className="btn btn-danger" onClick={onDelete}>
            Delete Blueprint
          </button>
        )}
      </div>
    </div>
  );
};

export default BlueprintViewer;

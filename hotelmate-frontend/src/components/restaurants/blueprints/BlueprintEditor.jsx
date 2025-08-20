import React, { useState, useEffect } from "react";

const BlueprintEditor = ({ blueprint, onSave, onCancel }) => {
  const [width, setWidth] = useState(1000);
  const [height, setHeight] = useState(600);
  const [gridSize, setGridSize] = useState(25);

  useEffect(() => {
    if (blueprint) {
      setWidth(blueprint.width);
      setHeight(blueprint.height);
      setGridSize(blueprint.grid_size);
    }
  }, [blueprint]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSave) {
      onSave({ ...blueprint, width, height, grid_size: gridSize });
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="mb-2">
        <label className="form-label">Width (px)</label>
        <input
          type="number"
          className="form-control"
          value={width}
          onChange={(e) => setWidth(parseInt(e.target.value))}
        />
      </div>
      <div className="mb-2">
        <label className="form-label">Height (px)</label>
        <input
          type="number"
          className="form-control"
          value={height}
          onChange={(e) => setHeight(parseInt(e.target.value))}
        />
      </div>
      <div className="mb-2">
        <label className="form-label">Grid Size (px)</label>
        <input
          type="number"
          className="form-control"
          value={gridSize}
          onChange={(e) => setGridSize(parseInt(e.target.value))}
        />
      </div>
      <div className="d-flex gap-2 mt-3">
        <button type="submit" className="btn btn-success">
          Save
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
};

export default BlueprintEditor;

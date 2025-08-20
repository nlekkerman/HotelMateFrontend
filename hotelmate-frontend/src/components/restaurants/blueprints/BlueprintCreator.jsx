import React, { useState } from "react";

const BlueprintCreator = ({ show, toggle, createBlueprint }) => {
  const [width, setWidth] = useState(1000);
  const [height, setHeight] = useState(600);
  const [gridSize, setGridSize] = useState(25);
  const [loading, setLoading] = useState(false);

  if (!show) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createBlueprint({ width, height, grid_size: gridSize });
      toggle(); // close modal after creation
    } catch (err) {
      alert("Failed to create blueprint");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black opacity-50" onClick={toggle}></div>
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded shadow-lg w-full max-w-md z-50 p-4">
        <h5 className="mb-3">Create Blueprint</h5>
        <form onSubmit={handleSubmit}>
          <div className="mb-2">
            <label>Width</label>
            <input type="number" className="form-control" value={width} onChange={(e) => setWidth(+e.target.value)} />
          </div>
          <div className="mb-2">
            <label>Height</label>
            <input type="number" className="form-control" value={height} onChange={(e) => setHeight(+e.target.value)} />
          </div>
          <div className="mb-3">
            <label>Grid Size</label>
            <input type="number" className="form-control" value={gridSize} onChange={(e) => setGridSize(+e.target.value)} />
          </div>
          <div className="d-flex justify-content-end gap-2">
            <button type="button" className="btn btn-secondary" onClick={toggle}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Creating..." : "Create"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
};

export default BlueprintCreator;

import React, { useState, useEffect } from "react";

export default function CreateBlueprintObjectModal({
  show,
  onClose,
  onCreate,
  objectTypes,
  loadingTypes,
}) {
  const [typeId, setTypeId] = useState("");
  const [name, setName] = useState("");
  const [width, setWidth] = useState(50);
  const [height, setHeight] = useState(50);
  const [rotation, setRotation] = useState(0);

  // Set default type when objectTypes change
  useEffect(() => {
    if (!loadingTypes && objectTypes.length > 0) {
      setTypeId(objectTypes[0].id);
    }
  }, [objectTypes, loadingTypes]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!typeId) return;

    onCreate({
      type_id: Number(typeId),
      name,
      width: parseInt(width),
      height: parseInt(height),
      rotation: parseInt(rotation),
      x: 0,
      y: 0,
    });

    // Reset fields
    setName("");
    setWidth(50);
    setHeight(50);
    setRotation(0);
    onClose();
  };

  if (!show) return null;

  return (
    <div className="modal-backdrop">
      <div
        className="modal-content"
        style={{
          maxWidth: 400,
          margin: "100px auto",
          padding: 20,
          background: "#fff",
          borderRadius: 8,
        }}
      >
        <h5>Create Object</h5>
        <form onSubmit={handleSubmit}>
          <div className="form-group mb-2">
            <label>Type</label>
            {loadingTypes ? (
              <div>Loading types...</div>
            ) : (
              <select
                className="form-control"
                value={typeId}
                onChange={(e) => setTypeId(e.target.value)}
                disabled={objectTypes.length === 0}
              >
                {objectTypes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="form-group mb-2">
            <label>Name (optional)</label>
            <input
              type="text"
              className="form-control"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="form-group mb-2">
            <label>Width</label>
            <input
              type="number"
              className="form-control"
              value={width}
              onChange={(e) => setWidth(e.target.value)}
            />
          </div>

          <div className="form-group mb-2">
            <label>Height</label>
            <input
              type="number"
              className="form-control"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
            />
          </div>

          <div className="form-group mb-2">
            <label>Rotation (degrees)</label>
            <input
              type="number"
              className="form-control"
              value={rotation}
              onChange={(e) => setRotation(e.target.value)}
            />
          </div>

          <div className="d-flex justify-content-end mt-3">
            <button
              type="button"
              className="btn btn-secondary me-2"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loadingTypes || objectTypes.length === 0}
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

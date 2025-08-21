import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";

export default function EditTableModal({ show, table, onClose, onUpdate, onDelete }) {
  const [formData, setFormData] = useState({
    code: "",
    width: 30,
    height: 30,
    shape: "RECTANGLE",
    capacity: "4", // <-- new field
  });

  // Sync form data with the selected table
  useEffect(() => {
    if (table) {
      setFormData({
        code: table.code || "",
        width: table.width || 30,
        height: table.height || 30,
        shape: table.shape || "RECTANGLE",
        capacity: table.capacity?.toString() ?? "0",
         // <-- sync capacity
      });
    }
  }, [table]);

  if (!table) return null;

  const handleChange = (e) => {
  const { name, value } = e.target;
  setFormData((prev) => ({
    ...prev,
    [name]: value, // keep as string to allow clearing input
  }));
};


  const handleUpdate = () => {
  onUpdate({
    ...formData,
    width: Number(formData.width),
    height: Number(formData.height),
    capacity: Number(formData.capacity),
  });
};


  const handleDelete = () => {
    onDelete(table.id);
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit Table</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Table Code</Form.Label>
            <Form.Control
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              placeholder="Enter table code"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Width</Form.Label>
            <Form.Control
              type="number"
              name="width"
              value={formData.width}
              onChange={handleChange}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Height</Form.Label>
            <Form.Control
              type="number"
              name="height"
              value={formData.height}
              onChange={handleChange}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Shape</Form.Label>
            <Form.Select name="shape" value={formData.shape} onChange={handleChange}>
              <option value="RECTANGLE">Rectangle</option>
              <option value="CIRCLE">Circle</option>
            </Form.Select>
          </Form.Group>

          {/* NEW Capacity Field */}
          <Form.Group className="mb-3">
            <Form.Label>Capacity</Form.Label>
            <Form.Control
              type="number"
              name="capacity"
              value={formData.capacity}
              onChange={handleChange}
              min={1}
            />
          </Form.Group>
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="danger" onClick={handleDelete}>
          Delete
        </Button>
        <Button variant="primary" onClick={handleUpdate}>
          Update
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

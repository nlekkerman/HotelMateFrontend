import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";

export default function EditBlueprintObjectModal({
  show,
  object,
  onClose,
  onUpdate,
}) {
  const [formData, setFormData] = useState({
    name: "",
    width: 50,
    height: 50,
    rotation: 0,
  });

  useEffect(() => {
    if (object) {
      setFormData({
        name: object.name || "",
        width: object.width || 50,
        height: object.height || 50,
        rotation: object.rotation || 0,
      });
    }
  }, [object]);

  if (!object) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "width" || name === "height" || name === "rotation"
        ? Number(value)
        : value,
    }));
  };

  const handleUpdate = () => {
    onUpdate(formData);
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit Object</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>Object Name</Form.Label>
            <Form.Control
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
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
            <Form.Label>Rotation</Form.Label>
            <Form.Control
              type="number"
              name="rotation"
              value={formData.rotation}
              onChange={handleChange}
            />
          </Form.Group>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleUpdate}>
          Update
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

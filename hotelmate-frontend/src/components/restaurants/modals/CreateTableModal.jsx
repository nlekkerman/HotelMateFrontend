import React, { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";

export default function CreateTableModal({ show, onClose, onCreate }) {
  const [code, setCode] = useState(""); // new input for table code
  const [capacity, setCapacity] = useState(4);
  const [shape, setShape] = useState("RECT");
  const [width, setWidth] = useState(100);
  const [height, setHeight] = useState(80);
  const [radius, setRadius] = useState(50);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!code.trim()) {
      alert("Please enter a table code.");
      return;
    }

    const newTable = {
      id: Date.now(),
      code: code.trim(), // use user input
      capacity,
      shape,
      x: 50,
      y: 50,
      rotation: 0,
      width: shape !== "CIRCLE" ? width : undefined,
      height: shape !== "CIRCLE" ? height : undefined,
      radius: shape === "CIRCLE" ? radius : undefined,
    };

    onCreate(newTable);
    onClose();
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Add New Table</Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Table Code</Form.Label>
            <Form.Control
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter table code (e.g., A1, T5)"
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Capacity</Form.Label>
            <Form.Control
              type="number"
              min="1"
              value={capacity}
              onChange={(e) => setCapacity(Number(e.target.value))}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Shape</Form.Label>
            <Form.Select value={shape} onChange={(e) => setShape(e.target.value)}>
              <option value="RECT">Rectangle</option>
              <option value="OVAL">Oval</option>
              <option value="CIRCLE">Circle</option>
            </Form.Select>
          </Form.Group>

          {(shape === "RECT" || shape === "OVAL") && (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Width</Form.Label>
                <Form.Control
                  type="number"
                  min="10"
                  value={width}
                  onChange={(e) => setWidth(Number(e.target.value))}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Height</Form.Label>
                <Form.Control
                  type="number"
                  min="10"
                  value={height}
                  onChange={(e) => setHeight(Number(e.target.value))}
                />
              </Form.Group>
            </>
          )}

          {shape === "CIRCLE" && (
            <Form.Group className="mb-3">
              <Form.Label>Radius</Form.Label>
              <Form.Control
                type="number"
                min="5"
                value={radius}
                onChange={(e) => setRadius(Number(e.target.value))}
              />
            </Form.Group>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="success">Add Table</Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

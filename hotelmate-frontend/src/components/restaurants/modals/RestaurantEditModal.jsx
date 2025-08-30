import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";

const booleanFields = ["taking_bookings", "is_active"]; // add other boolean fields if needed

const RestaurantEditModal = ({
  show,
  onClose,
  fieldKey,
  label,
  value,
  handleChange,
  onSave,
  saving,
  error,
}) => {
  const [localValue, setLocalValue] = useState(value ?? false); // default false for booleans

  useEffect(() => {
    if (show) setLocalValue(value ?? (booleanFields.includes(fieldKey) ? false : ""));
  }, [value, show, fieldKey]);

  const handleInputChange = (e) => {
    const val = booleanFields.includes(fieldKey) ? e.target.checked : e.target.value;
    setLocalValue(val);
    handleChange(fieldKey, val);
  };

  const getInputType = () => {
    if (fieldKey === "opening_time" || fieldKey === "closing_time") return "time";
    if (typeof value === "number") return "number";
    return "text";
  };

  return (
    <Modal show={show} onHide={onClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Edit {label}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Form>
          <Form.Group className="mb-3">
            {booleanFields.includes(fieldKey) ? (
              <Form.Check
                type="switch"
                id={`switch-${fieldKey}`}
                label={label}
                checked={localValue}
                onChange={handleInputChange}
              />
            ) : (
              <>
                <Form.Label>{label}</Form.Label>
                <Form.Control
                  type={getInputType()}
                  value={localValue}
                  onChange={handleInputChange}
                  autoFocus
                />
              </>
            )}
          </Form.Group>
          {error && <p className="text-danger mt-2">{error}</p>}
        </Form>
      </Modal.Body>

      <Modal.Footer className="d-flex justify-content-between">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default RestaurantEditModal;

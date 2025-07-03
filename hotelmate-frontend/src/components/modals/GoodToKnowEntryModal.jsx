import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Spinner, Alert } from "react-bootstrap";
import api from "@/services/api";

export default function GoodToKnowEntryModal({ 
  show, 
  onClose, 
  hotelSlug, 
  entrySlug = null, 
  onSaved 
}) {
  const isEditMode = !!entrySlug;

  const [formData, setFormData] = useState({
    slug: "",
    title: "",
    content: "",
    extra_info: "",
    active: true,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch existing entry data when editing
  useEffect(() => {
    if (isEditMode) {
      setLoading(true);
      setError(null);
      api
        .get(`/hotel_info/good_to_know/${hotelSlug}/${entrySlug}/`)
        .then((res) => {
          const data = res.data;
          setFormData({
            slug: data.slug || "",
            title: data.title || "",
            content: data.content || "",
            extra_info: JSON.stringify(data.extra_info || {}, null, 2),
            active: data.active,
          });
        })
        .catch(() => setError("Failed to load entry data."))
        .finally(() => setLoading(false));
    } else {
      // Clear form on create mode
      setFormData({
        slug: "",
        title: "",
        content: "",
        extra_info: "",
        active: true,
      });
      setError(null);
    }
  }, [isEditMode, hotelSlug, entrySlug, show]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Parse extra_info JSON safely
    let parsedExtraInfo = {};
    try {
      parsedExtraInfo = formData.extra_info ? JSON.parse(formData.extra_info) : {};
    } catch {
      setError("Extra Info must be valid JSON.");
      setLoading(false);
      return;
    }

    const payload = {
      slug: formData.slug,
      title: formData.title,
      content: formData.content,
      extra_info: parsedExtraInfo,
      active: formData.active,
      hotel_slug: hotelSlug,
    };

    try {
      if (isEditMode) {
        await api.put(`/hotel_info/good_to_know/${hotelSlug}/${entrySlug}/`, payload);
      } else {
        await api.post(`/hotel_info/good_to_know/${hotelSlug}/`, payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError("Failed to save entry.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>{isEditMode ? "Edit" : "Create"} Good To Know Entry</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && <Alert variant="danger">{error}</Alert>}

        {loading ? (
          <div className="d-flex justify-content-center my-5">
            <Spinner animation="border" />
          </div>
        ) : (
          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3" controlId="slug">
              <Form.Label>Slug</Form.Label>
              <Form.Control
                type="text"
                name="slug"
                value={formData.slug}
                onChange={handleChange}
                placeholder="Unique slug (e.g. wifi-password)"
                required
                disabled={isEditMode} // usually slugs are immutable on edit
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="title">
              <Form.Label>Title</Form.Label>
              <Form.Control
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Entry title"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="content">
              <Form.Label>Content</Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                name="content"
                value={formData.content}
                onChange={handleChange}
                placeholder="Detailed content or explanation"
                required
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="extra_info">
              <Form.Label>Extra Info (JSON)</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                name="extra_info"
                value={formData.extra_info}
                onChange={handleChange}
                placeholder='Optional JSON data, e.g. {"key": "value"}'
              />
            </Form.Group>

            <Form.Group className="mb-3" controlId="active">
              <Form.Check
                type="checkbox"
                label="Active"
                name="active"
                checked={formData.active}
                onChange={handleChange}
              />
            </Form.Group>

            <Button variant="primary" type="submit" disabled={loading}>
              {isEditMode ? "Save Changes" : "Create Entry"}
            </Button>
          </Form>
        )}
      </Modal.Body>
    </Modal>
  );
}

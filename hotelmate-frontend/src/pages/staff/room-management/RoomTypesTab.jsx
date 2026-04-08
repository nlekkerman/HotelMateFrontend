import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Button, Form, Spinner, Badge } from 'react-bootstrap';
import { toast } from 'react-toastify';
import {
  fetchRoomTypes,
  createRoomType,
  updateRoomType,
  deleteRoomType,
  uploadRoomTypePhoto,
} from '@/services/roomManagementApi';

const EMPTY_FORM = {
  name: '',
  code: '',
  starting_price_from: '',
  currency: 'USD',
  max_occupancy: '',
  bed_setup: '',
  short_description: '',
  availability_message: '',
  is_active: true,
};

const CURRENCIES = ['USD', 'EUR', 'GBP', 'ZAR', 'KES', 'NGN', 'AUD', 'CAD'];

function validateRoomTypeForm(form) {
  const errors = {};
  if (!form.name?.trim()) errors.name = 'Name is required';
  if (!form.code?.trim()) errors.code = 'Code is required';
  if (!form.currency?.trim()) errors.currency = 'Currency is required';
  const price = Number(form.starting_price_from);
  if (form.starting_price_from !== '' && (isNaN(price) || price < 0)) {
    errors.starting_price_from = 'Price must be a positive number';
  }
  const occ = Number(form.max_occupancy);
  if (form.max_occupancy !== '' && (isNaN(occ) || occ < 1 || occ > 50)) {
    errors.max_occupancy = 'Occupancy must be between 1 and 50';
  }
  return errors;
}

const RoomTypesTab = ({ hotelSlug }) => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null); // null = create, object = edit
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState({});
  const [photoFile, setPhotoFile] = useState(null);

  // Fetch
  const { data: roomTypes = [], isLoading, isError, error } = useQuery({
    queryKey: ['roomManagement', 'roomTypes', hotelSlug],
    queryFn: () => fetchRoomTypes(hotelSlug),
    enabled: !!hotelSlug,
  });

  const list = Array.isArray(roomTypes) ? roomTypes : roomTypes.results || [];

  // Create / Update mutation
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editing) {
        return updateRoomType(hotelSlug, editing.id, payload);
      }
      return createRoomType(hotelSlug, payload);
    },
    onSuccess: async (data) => {
      // Upload photo if selected
      const roomTypeId = data?.id || editing?.id;
      if (photoFile && roomTypeId) {
        try {
          await uploadRoomTypePhoto(hotelSlug, roomTypeId, photoFile);
        } catch {
          toast.warning('Room type saved but photo upload failed');
        }
      }
      queryClient.invalidateQueries({ queryKey: ['roomManagement', 'roomTypes', hotelSlug] });
      toast.success(editing ? 'Room type updated' : 'Room type created');
      closeModal();
    },
    onError: (err) => {
      const serverErrors = err.response?.data;
      if (serverErrors && typeof serverErrors === 'object') {
        // Map field-level server errors
        const mapped = {};
        Object.entries(serverErrors).forEach(([key, val]) => {
          mapped[key] = Array.isArray(val) ? val.join(' ') : String(val);
        });
        setFieldErrors((prev) => ({ ...prev, ...mapped }));
      }
      toast.error(err.response?.data?.detail || 'Failed to save room type');
    },
  });

  // Delete / deactivate mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => deleteRoomType(hotelSlug, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roomManagement', 'roomTypes', hotelSlug] });
      toast.success('Room type removed');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to remove room type');
    },
  });

  // Helpers
  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setPhotoFile(null);
    setShowModal(true);
  };

  const openEdit = (rt) => {
    setEditing(rt);
    setForm({
      name: rt.name || '',
      code: rt.code || '',
      starting_price_from: rt.starting_price_from ?? '',
      currency: rt.currency || 'USD',
      max_occupancy: rt.max_occupancy ?? '',
      bed_setup: rt.bed_setup || '',
      short_description: rt.short_description || '',
      availability_message: rt.availability_message || '',
      is_active: rt.is_active !== false,
    });
    setFieldErrors({});
    setPhotoFile(null);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setPhotoFile(null);
  };

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errors = validateRoomTypeForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error('Please fix the highlighted fields');
      return;
    }
    // Build payload — send only non-empty fields
    const payload = { ...form };
    if (payload.starting_price_from === '') delete payload.starting_price_from;
    if (payload.max_occupancy === '') delete payload.max_occupancy;
    saveMutation.mutate(payload);
  };

  const handleDelete = (rt) => {
    if (!window.confirm(`Remove room type "${rt.name}"?`)) return;
    deleteMutation.mutate(rt.id);
  };

  // Render
  if (isLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-2">Loading room types...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="alert alert-danger">
        Failed to load room types: {error?.message}
      </div>
    );
  }

  return (
    <>
      {/* Header row */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <span className="text-muted">{list.length} room type{list.length !== 1 ? 's' : ''}</span>
        <Button variant="primary" size="sm" onClick={openCreate}>
          <i className="bi bi-plus-lg me-1"></i> New Room Type
        </Button>
      </div>

      {/* List */}
      {list.length === 0 ? (
        <div className="rm-empty-state">
          <i className="bi bi-layers"></i>
          <h5>No room types yet</h5>
          <p>Create your first room type to start building inventory.</p>
          <Button variant="primary" onClick={openCreate}>
            <i className="bi bi-plus-lg me-1"></i> Create Room Type
          </Button>
        </div>
      ) : (
        <div className="row g-3">
          {list.map((rt) => (
            <div className="col-sm-6 col-lg-4 col-xl-3" key={rt.id}>
              <div className="room-type-card h-100 d-flex flex-column">
                {rt.photo ? (
                  <img src={rt.photo} alt={rt.name} className="room-type-card-img" />
                ) : (
                  <div className="room-type-card-placeholder">
                    <i className="bi bi-image"></i>
                  </div>
                )}
                <div className="p-3 flex-grow-1 d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-1">
                    <h6 className="mb-0">{rt.name}</h6>
                    <Badge bg={rt.is_active !== false ? 'success' : 'secondary'} className="ms-2">
                      {rt.is_active !== false ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                  <small className="text-muted">Code: {rt.code}</small>
                  {rt.starting_price_from != null && (
                    <small className="text-muted">
                      From {rt.currency || ''} {rt.starting_price_from}
                    </small>
                  )}
                  {rt.max_occupancy && (
                    <small className="text-muted">Max occupancy: {rt.max_occupancy}</small>
                  )}
                  {rt.bed_setup && (
                    <small className="text-muted">Bed: {rt.bed_setup}</small>
                  )}
                  <div className="mt-auto pt-2 d-flex gap-2">
                    <Button variant="outline-primary" size="sm" onClick={() => openEdit(rt)}>
                      <i className="bi bi-pencil me-1"></i> Edit
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDelete(rt)}
                      disabled={deleteMutation.isPending}
                    >
                      <i className="bi bi-trash me-1"></i> Remove
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal show={showModal} onHide={closeModal} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>{editing ? 'Edit Room Type' : 'New Room Type'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            <div className="row g-3">
              {/* Name */}
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Name *</Form.Label>
                  <Form.Control
                    type="text"
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    isInvalid={!!fieldErrors.name}
                    placeholder="e.g. Deluxe Double"
                  />
                  <Form.Control.Feedback type="invalid">{fieldErrors.name}</Form.Control.Feedback>
                </Form.Group>
              </div>
              {/* Code */}
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Code *</Form.Label>
                  <Form.Control
                    type="text"
                    value={form.code}
                    onChange={(e) => updateField('code', e.target.value.toUpperCase())}
                    isInvalid={!!fieldErrors.code}
                    placeholder="e.g. DLX-DBL"
                  />
                  <Form.Control.Feedback type="invalid">{fieldErrors.code}</Form.Control.Feedback>
                </Form.Group>
              </div>
              {/* Price */}
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>Starting Price</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.starting_price_from}
                    onChange={(e) => updateField('starting_price_from', e.target.value)}
                    isInvalid={!!fieldErrors.starting_price_from}
                    placeholder="0.00"
                  />
                  <Form.Control.Feedback type="invalid">{fieldErrors.starting_price_from}</Form.Control.Feedback>
                </Form.Group>
              </div>
              {/* Currency */}
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>Currency *</Form.Label>
                  <Form.Select
                    value={form.currency}
                    onChange={(e) => updateField('currency', e.target.value)}
                    isInvalid={!!fieldErrors.currency}
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </Form.Select>
                  <Form.Control.Feedback type="invalid">{fieldErrors.currency}</Form.Control.Feedback>
                </Form.Group>
              </div>
              {/* Max occupancy */}
              <div className="col-md-4">
                <Form.Group>
                  <Form.Label>Max Occupancy</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    max="50"
                    value={form.max_occupancy}
                    onChange={(e) => updateField('max_occupancy', e.target.value)}
                    isInvalid={!!fieldErrors.max_occupancy}
                    placeholder="2"
                  />
                  <Form.Control.Feedback type="invalid">{fieldErrors.max_occupancy}</Form.Control.Feedback>
                </Form.Group>
              </div>
              {/* Bed setup */}
              <div className="col-md-6">
                <Form.Group>
                  <Form.Label>Bed Setup</Form.Label>
                  <Form.Control
                    type="text"
                    value={form.bed_setup}
                    onChange={(e) => updateField('bed_setup', e.target.value)}
                    placeholder="e.g. 1 King Bed"
                  />
                </Form.Group>
              </div>
              {/* Active */}
              <div className="col-md-6 d-flex align-items-end">
                <Form.Check
                  type="switch"
                  id="is_active_switch"
                  label="Active"
                  checked={form.is_active}
                  onChange={(e) => updateField('is_active', e.target.checked)}
                />
              </div>
              {/* Short description */}
              <div className="col-12">
                <Form.Group>
                  <Form.Label>Short Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={2}
                    value={form.short_description}
                    onChange={(e) => updateField('short_description', e.target.value)}
                    placeholder="Brief description shown on the public page"
                  />
                </Form.Group>
              </div>
              {/* Availability message */}
              <div className="col-12">
                <Form.Group>
                  <Form.Label>Availability Message</Form.Label>
                  <Form.Control
                    type="text"
                    value={form.availability_message}
                    onChange={(e) => updateField('availability_message', e.target.value)}
                    placeholder="e.g. Book early — limited availability"
                  />
                </Form.Group>
              </div>
              {/* Photo upload */}
              <div className="col-12">
                <Form.Group>
                  <Form.Label>Photo</Form.Label>
                  {editing?.photo && !photoFile && (
                    <div className="mb-2">
                      <img
                        src={editing.photo}
                        alt="Current"
                        style={{ maxHeight: 100, borderRadius: 6 }}
                      />
                    </div>
                  )}
                  <Form.Control
                    type="file"
                    accept="image/*"
                    onChange={(e) => setPhotoFile(e.target.files[0] || null)}
                  />
                  <Form.Text className="text-muted">
                    Upload a photo for this room type. Replaces existing photo.
                  </Form.Text>
                </Form.Group>
              </div>
            </div>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="outline-secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" variant="primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                <>
                  <Spinner animation="border" size="sm" className="me-1" />
                  Saving...
                </>
              ) : (
                editing ? 'Update' : 'Create'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </>
  );
};

export default RoomTypesTab;

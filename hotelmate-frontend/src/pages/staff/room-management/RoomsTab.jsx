import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal, Button, Form, Spinner, Badge, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import {
  fetchRooms,
  createRoom,
  bulkCreateRooms,
  updateRoom,
  deleteRoom,
} from '@/services/roomManagementApi';
import { fetchRoomTypes } from '@/services/roomManagementApi';

const EMPTY_ROOM = { room_number: '', room_type_id: '', floor: '', is_active: true };

function validateRoomForm(form) {
  const errors = {};
  if (!form.room_number?.toString().trim()) errors.room_number = 'Room number is required';
  if (!form.room_type_id) errors.room_type_id = 'Room type is required';
  return errors;
}

function validateBulkForm(form) {
  const errors = {};
  if (!form.room_type_id) errors.room_type_id = 'Room type is required';
  const from = Number(form.range_from);
  const to = Number(form.range_to);
  if (!form.range_from || isNaN(from) || from < 1) errors.range_from = 'Valid start number required';
  if (!form.range_to || isNaN(to) || to < 1) errors.range_to = 'Valid end number required';
  if (from && to && from > to) errors.range_to = 'End must be ≥ start';
  if (from && to && to - from + 1 > 500) errors.range_to = 'Max 500 rooms per batch';
  return errors;
}

const RoomsTab = ({ hotelSlug }) => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('single'); // 'single' | 'bulk' | 'edit'
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_ROOM);
  const [bulkForm, setBulkForm] = useState({ room_type_id: '', range_from: '', range_to: '', floor: '' });
  const [fieldErrors, setFieldErrors] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Fetch rooms from room-management endpoint
  const { data: roomsData = [], isLoading, isError, error } = useQuery({
    queryKey: ['roomManagement', 'rooms', hotelSlug],
    queryFn: () => fetchRooms(hotelSlug),
    enabled: !!hotelSlug,
  });

  // Normalize: support flat array or paginated { results: [] }
  const rooms = React.useMemo(() => {
    if (Array.isArray(roomsData)) return roomsData;
    if (roomsData?.results) return roomsData.results;
    return [];
  }, [roomsData]);

  // Fetch room types for dropdown
  const { data: roomTypesData = [] } = useQuery({
    queryKey: ['roomManagement', 'roomTypes', hotelSlug],
    queryFn: () => fetchRoomTypes(hotelSlug),
    enabled: !!hotelSlug,
  });

  const roomTypes = Array.isArray(roomTypesData) ? roomTypesData : roomTypesData.results || [];
  const hasRoomTypes = roomTypes.length > 0;

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (payload) => {
      if (editing) return updateRoom(hotelSlug, editing.id, payload);
      return createRoom(hotelSlug, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roomManagement', 'rooms', hotelSlug] });
      toast.success(editing ? 'Room updated' : 'Room created');
      closeModal();
    },
    onError: (err) => {
      const serverErrors = err.response?.data;
      if (serverErrors && typeof serverErrors === 'object') {
        const mapped = {};
        Object.entries(serverErrors).forEach(([key, val]) => {
          mapped[key] = Array.isArray(val) ? val.join(' ') : String(val);
        });
        setFieldErrors((prev) => ({ ...prev, ...mapped }));
      }
      toast.error(err.response?.data?.detail || 'Failed to save room');
    },
  });

  const bulkMutation = useMutation({
    mutationFn: ({ room_type_id, ...payload }) => bulkCreateRooms(hotelSlug, room_type_id, payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['roomManagement', 'rooms', hotelSlug] });
      const count = data?.created_count || data?.length || 'Multiple';
      toast.success(`${count} rooms created`);
      closeModal();
    },
    onError: (err) => {
      const serverErrors = err.response?.data;
      if (serverErrors && typeof serverErrors === 'object' && !serverErrors.detail) {
        const mapped = {};
        Object.entries(serverErrors).forEach(([key, val]) => {
          mapped[key] = Array.isArray(val) ? val.join(' ') : String(val);
        });
        setFieldErrors((prev) => ({ ...prev, ...mapped }));
      }
      toast.error(err.response?.data?.detail || 'Bulk create failed');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => deleteRoom(hotelSlug, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roomManagement', 'rooms', hotelSlug] });
      toast.success('Room removed');
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Failed to remove room');
    },
  });

  // Modal helpers
  const openCreate = () => {
    setEditing(null);
    setModalMode('single');
    setForm(EMPTY_ROOM);
    setFieldErrors({});
    setShowModal(true);
  };

  const openBulk = () => {
    setEditing(null);
    setModalMode('bulk');
    setBulkForm({ room_type_id: '', range_from: '', range_to: '', floor: '' });
    setFieldErrors({});
    setShowModal(true);
  };

  const openEdit = (room) => {
    setEditing(room);
    setModalMode('edit');
    setForm({
      room_number: room.room_number || '',
      room_type_id: room.room_type_id || room.room_type?.id || '',
      floor: room.floor || '',
      is_active: room.is_active !== false,
    });
    setFieldErrors({});
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditing(null);
    setFieldErrors({});
  };

  const updateField = (key, value, isBulk = false) => {
    const setter = isBulk ? setBulkForm : setForm;
    setter((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleSingleSubmit = (e) => {
    e.preventDefault();
    const errors = validateRoomForm(form);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error('Please fix the highlighted fields');
      return;
    }
    saveMutation.mutate(form);
  };

  const handleBulkSubmit = (e) => {
    e.preventDefault();
    const errors = validateBulkForm(bulkForm);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      toast.error('Please fix the highlighted fields');
      return;
    }
    bulkMutation.mutate({
      room_type_id: bulkForm.room_type_id,
      range_from: bulkForm.range_from,
      range_to: bulkForm.range_to,
      floor: bulkForm.floor,
    });
  };

  const handleDelete = (room) => {
    if (!window.confirm(`Remove room "${room.room_number}"?`)) return;
    deleteMutation.mutate(room.id);
  };

  // Filtering
  const filtered = React.useMemo(() => {
    return rooms.filter((r) => {
      const matchSearch =
        !searchQuery ||
        r.room_number?.toString().toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.room_type_name || r.room_type?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchType =
        !typeFilter ||
        String(r.room_type_id || r.room_type?.id) === typeFilter;
      return matchSearch && matchType;
    });
  }, [rooms, searchQuery, typeFilter]);

  const sorted = React.useMemo(() => {
    return [...filtered].sort((a, b) => {
      const na = Number(a.room_number) || 0;
      const nb = Number(b.room_number) || 0;
      return na - nb;
    });
  }, [filtered]);

  // Render
  if (isLoading) {
    return (
      <div className="text-center py-5">
        <Spinner animation="border" />
        <p className="mt-2">Loading rooms...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="alert alert-danger">
        Failed to load rooms: {error?.message}
      </div>
    );
  }

  return (
    <>
      {/* Warning when no room types */}
      {!hasRoomTypes && (
        <Alert variant="warning" className="mb-3">
          <i className="bi bi-exclamation-triangle me-2"></i>
          <strong>No room types found.</strong> Create a room type first before adding rooms.
        </Alert>
      )}

      {/* Header */}
      <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
        {/* Filters */}
        <div className="d-flex gap-2 flex-grow-1" style={{ maxWidth: 500 }}>
          <div className="input-group input-group-sm">
            <span className="input-group-text"><i className="bi bi-search"></i></span>
            <input
              type="text"
              className="form-control"
              placeholder="Search rooms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {roomTypes.length > 0 && (
            <Form.Select
              size="sm"
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{ maxWidth: 200 }}
            >
              <option value="">All Types</option>
              {roomTypes.map((rt) => (
                <option key={rt.id} value={String(rt.id)}>{rt.name}</option>
              ))}
            </Form.Select>
          )}
        </div>

        {/* Actions */}
        <div className="d-flex gap-2">
          <Button variant="outline-primary" size="sm" onClick={openBulk} disabled={!hasRoomTypes}>
            <i className="bi bi-collection me-1"></i> Bulk Create
          </Button>
          <Button variant="primary" size="sm" onClick={openCreate} disabled={!hasRoomTypes}>
            <i className="bi bi-plus-lg me-1"></i> New Room
          </Button>
        </div>
      </div>

      <p className="text-muted small mb-2">{sorted.length} room{sorted.length !== 1 ? 's' : ''}</p>

      {/* Table */}
      {sorted.length === 0 ? (
        <div className="rm-empty-state">
          <i className="bi bi-door-open"></i>
          <h5>No rooms yet</h5>
          <p>
            {hasRoomTypes
              ? 'Add rooms individually or use bulk create.'
              : 'Create a room type first, then add rooms here.'}
          </p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover room-inventory-table align-middle">
            <thead>
              <tr>
                <th>Room #</th>
                <th>Type</th>
                <th>Floor</th>
                <th>Status</th>
                <th className="text-end">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((room) => (
                <tr key={room.id}>
                  <td className="fw-semibold">{room.room_number}</td>
                  <td>{room.room_type_name || room.room_type?.name || '—'}</td>
                  <td>{room.floor || '—'}</td>
                  <td>
                    <Badge bg={room.is_active !== false ? 'success' : 'secondary'}>
                      {room.is_active !== false ? 'Active' : 'Inactive'}
                    </Badge>
                  </td>
                  <td className="text-end">
                    <Button variant="outline-primary" size="sm" className="me-1" onClick={() => openEdit(room)}>
                      <i className="bi bi-pencil"></i>
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDelete(room)}
                      disabled={deleteMutation.isPending}
                    >
                      <i className="bi bi-trash"></i>
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal show={showModal} onHide={closeModal} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {modalMode === 'bulk' ? 'Bulk Create Rooms' : editing ? 'Edit Room' : 'New Room'}
          </Modal.Title>
        </Modal.Header>

        {modalMode === 'bulk' ? (
          <Form onSubmit={handleBulkSubmit}>
            <Modal.Body>
              <Form.Group className="mb-3">
                <Form.Label>Room Type *</Form.Label>
                <Form.Select
                  value={bulkForm.room_type_id}
                  onChange={(e) => updateField('room_type_id', e.target.value, true)}
                  isInvalid={!!fieldErrors.room_type_id}
                >
                  <option value="">Select room type...</option>
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>{rt.name} ({rt.code})</option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{fieldErrors.room_type_id}</Form.Control.Feedback>
              </Form.Group>

              <div className="bulk-range-inputs mb-3">
                <Form.Group className="form-group">
                  <Form.Label>From Room #*</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={bulkForm.range_from}
                    onChange={(e) => updateField('range_from', e.target.value, true)}
                    isInvalid={!!fieldErrors.range_from}
                    placeholder="101"
                  />
                  <Form.Control.Feedback type="invalid">{fieldErrors.range_from}</Form.Control.Feedback>
                </Form.Group>
                <Form.Group className="form-group">
                  <Form.Label>To Room # *</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={bulkForm.range_to}
                    onChange={(e) => updateField('range_to', e.target.value, true)}
                    isInvalid={!!fieldErrors.range_to}
                    placeholder="110"
                  />
                  <Form.Control.Feedback type="invalid">{fieldErrors.range_to}</Form.Control.Feedback>
                </Form.Group>
              </div>

              <Form.Group className="mb-3">
                <Form.Label>Floor (optional)</Form.Label>
                <Form.Control
                  type="text"
                  value={bulkForm.floor}
                  onChange={(e) => updateField('floor', e.target.value, true)}
                  placeholder="e.g. 1"
                />
              </Form.Group>

              {bulkForm.range_from && bulkForm.range_to && Number(bulkForm.range_to) >= Number(bulkForm.range_from) && (
                <Alert variant="info" className="mb-0">
                  This will create {Number(bulkForm.range_to) - Number(bulkForm.range_from) + 1} rooms
                  (#{bulkForm.range_from} – #{bulkForm.range_to}).
                </Alert>
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="outline-secondary" onClick={closeModal}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={bulkMutation.isPending}>
                {bulkMutation.isPending ? (
                  <><Spinner animation="border" size="sm" className="me-1" /> Creating...</>
                ) : (
                  'Create Rooms'
                )}
              </Button>
            </Modal.Footer>
          </Form>
        ) : (
          <Form onSubmit={handleSingleSubmit}>
            <Modal.Body>
              <Form.Group className="mb-3">
                <Form.Label>Room Number *</Form.Label>
                <Form.Control
                  type="text"
                  value={form.room_number}
                  onChange={(e) => updateField('room_number', e.target.value)}
                  isInvalid={!!fieldErrors.room_number}
                  placeholder="e.g. 101"
                  disabled={!!editing}
                />
                <Form.Control.Feedback type="invalid">{fieldErrors.room_number}</Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Room Type *</Form.Label>
                <Form.Select
                  value={form.room_type_id}
                  onChange={(e) => updateField('room_type_id', e.target.value)}
                  isInvalid={!!fieldErrors.room_type_id}
                >
                  <option value="">Select room type...</option>
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>{rt.name} ({rt.code})</option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">{fieldErrors.room_type_id}</Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Floor (optional)</Form.Label>
                <Form.Control
                  type="text"
                  value={form.floor}
                  onChange={(e) => updateField('floor', e.target.value)}
                  placeholder="e.g. 1"
                />
              </Form.Group>

              {editing && (
                <Form.Check
                  type="switch"
                  id="room_is_active"
                  label="Active"
                  checked={form.is_active}
                  onChange={(e) => updateField('is_active', e.target.checked)}
                />
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="outline-secondary" onClick={closeModal}>Cancel</Button>
              <Button type="submit" variant="primary" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? (
                  <><Spinner animation="border" size="sm" className="me-1" /> Saving...</>
                ) : (
                  editing ? 'Update' : 'Create'
                )}
              </Button>
            </Modal.Footer>
          </Form>
        )}
      </Modal>
    </>
  );
};

export default RoomsTab;

/**
 * MovementsList Component
 * 
 * Displays the history of movements (purchases/waste) for a stocktake line
 * with ability to delete and edit individual movements.
 */
import React, { useState, useEffect } from 'react';
import { Button, Badge, Spinner, Alert, Modal, Table, Form } from 'react-bootstrap';
import { FaTrash, FaHistory, FaEdit } from 'react-icons/fa';
import api from '@/services/api';
import DeletionModal from '@/components/modals/DeletionModal';
import ConfirmationModal from '@/components/modals/ConfirmationModal';

export const MovementsList = ({ lineId, hotelSlug, isLocked, onMovementDeleted, itemName, itemSku }) => {
  const [movements, setMovements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [showModal, setShowModal] = useState(false);
  
  // Delete confirmation modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [movementToDelete, setMovementToDelete] = useState(null);
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [editingMovement, setEditingMovement] = useState(null);
  const [editForm, setEditForm] = useState({
    movement_type: '',
    quantity: '',
    unit_cost: '',
    reference: '',
    notes: ''
  });
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (showModal) {
      fetchMovements();
    }
  }, [showModal, lineId]);

  const fetchMovements = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching movements for line:', lineId);
      
      // ✅ CORRECT ENDPOINT: /api/stock_tracker/{hotel}/stocktake-lines/{id}/movements/
      const response = await api.get(
        `/stock_tracker/${hotelSlug}/stocktake-lines/${lineId}/movements/`
      );
      
      console.log('✅ Movements fetched:', response.data);
      
      // Backend returns { movements: [...], summary: {...} }
      const movementsArray = response.data.movements || response.data || [];
      
      console.log('📊 Movement count:', movementsArray.length);
      
      setMovements(movementsArray);
    } catch (err) {
      console.error('❌ Failed to fetch movements:', err);
      console.error('❌ Error response:', err.response?.data);
      setError(err.response?.data?.detail || 'Failed to load movement history');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (movement) => {
    setMovementToDelete(movement);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!movementToDelete) return;

    try {
      setDeleting(movementToDelete.id);
      setShowDeleteConfirm(false);
      
      // ✅ CORRECT ENDPOINT: /api/stock_tracker/{hotel}/stocktake-lines/{lineId}/delete-movement/{movementId}/
      const response = await api.delete(
        `/stock_tracker/${hotelSlug}/stocktake-lines/${lineId}/delete-movement/${movementToDelete.id}/`
      );

      console.log('✅ Movement deleted:', response.data);
      
      // Remove from local list
      setMovements(prev => prev.filter(m => m.id !== movementToDelete.id));
      
      // Notify parent with updated line data (includes recalculated variance)
      if (response.data.line && typeof onMovementDeleted === 'function') {
        onMovementDeleted(response.data.line);
      }
      
      setMovementToDelete(null);
    } catch (err) {
      console.error('Failed to delete movement:', err);
      setError(err.response?.data?.detail || 'Failed to delete movement');
    } finally {
      setDeleting(null);
    }
  };

  const handleEditMovement = (movement) => {
    setEditingMovement(movement);
    setEditForm({
      movement_type: movement.movement_type,
      quantity: parseFloat(movement.quantity).toString(),
      unit_cost: movement.unit_cost ? parseFloat(movement.unit_cost).toString() : '',
      reference: movement.reference || '',
      notes: movement.notes || ''
    });
    setShowEditModal(true);
  };

  const handleUpdateClick = () => {
    if (!editForm.quantity || parseFloat(editForm.quantity) <= 0) {
      setError('Please enter a valid quantity greater than 0');
      return;
    }
    setShowEditConfirm(true);
  };

  const handleUpdateConfirm = async () => {
    setShowEditConfirm(false);
    
    try {
      setUpdating(true);
      
      const payload = {
        movement_type: editForm.movement_type,
        quantity: parseFloat(editForm.quantity),
        notes: editForm.notes
      };

      // Add optional fields only if provided
      if (editForm.unit_cost) {
        payload.unit_cost = parseFloat(editForm.unit_cost);
      }
      if (editForm.reference) {
        payload.reference = editForm.reference;
      }

      console.log('✏️ Updating movement:', editingMovement.id, payload);

      // ✅ ENDPOINT: /api/stock_tracker/{hotel}/stocktake-lines/{lineId}/update-movement/{movementId}/
      const response = await api.patch(
        `/stock_tracker/${hotelSlug}/stocktake-lines/${lineId}/update-movement/${editingMovement.id}/`,
        payload
      );

      console.log('✅ Movement updated:', response.data);

      // Update local list with the updated movement
      setMovements(prev => 
        prev.map(m => m.id === editingMovement.id ? response.data.movement : m)
      );

      // Notify parent with updated line data (includes recalculated variance)
      if (response.data.line && typeof onMovementDeleted === 'function') {
        onMovementDeleted(response.data.line);
      }

      // Close edit modal
      setShowEditModal(false);
      setEditingMovement(null);
      
    } catch (err) {
      console.error('❌ Failed to update movement:', err);
      alert(err.response?.data?.detail || 'Failed to update movement');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <>
      <Button
        variant="outline-info"
        size="sm"
        onClick={() => setShowModal(true)}
        title="View movement history"
      >
        <FaHistory /> History
      </Button>

      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Movement History - {itemName || itemSku}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {error && (
            <Alert variant="danger" className="mb-3">
              {error}
            </Alert>
          )}

          {loading && movements.length === 0 && (
            <div className="text-center py-5">
              <Spinner animation="border" />
              <div className="mt-2"><strong>Loading movements...</strong></div>
            </div>
          )}

          {!loading && movements.length === 0 && !error && (
            <Alert variant="info" className="text-center">
              No movements recorded yet for this item
            </Alert>
          )}

          {movements.length > 0 && (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Quantity</th>
                  <th>Date</th>
                  <th>Notes</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((movement) => (
                  <tr key={movement.id}>
                    <td>
                      <Badge 
                        bg={movement.movement_type === 'PURCHASE' ? 'success' : 'danger'}
                        className="px-3 py-2"
                      >
                        {movement.movement_type}
                      </Badge>
                    </td>
                    <td>
                      <strong>{parseFloat(movement.quantity).toFixed(2)}</strong>
                    </td>
                    <td>
                      {new Date(movement.created_at || movement.timestamp).toLocaleString()}
                    </td>
                    <td>
                      <small className="text-muted">{movement.notes || '-'}</small>
                    </td>
                    <td>
                      {!isLocked && (
                        <div className="d-flex gap-2">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleEditMovement(movement)}
                            title="Edit movement"
                          >
                            <FaEdit />
                          </Button>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDeleteClick(movement)}
                            disabled={deleting === movement.id}
                            title="Delete movement"
                          >
                            {deleting === movement.id ? (
                              <Spinner animation="border" size="sm" />
                            ) : (
                              <FaTrash />
                            )}
                          </Button>
                        </div>
                      )}
                      {isLocked && (
                        <Badge bg="secondary">Locked</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Movement Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Movement</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editingMovement && (
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Movement Type</Form.Label>
                <Form.Select
                  value={editForm.movement_type}
                  onChange={(e) => setEditForm({ ...editForm, movement_type: e.target.value })}
                >
                  <option value="PURCHASE">Purchase</option>
                  <option value="WASTE">Waste</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Quantity *</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  value={editForm.quantity}
                  onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                  placeholder="Enter quantity"
                  required
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Unit Cost</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  value={editForm.unit_cost}
                  onChange={(e) => setEditForm({ ...editForm, unit_cost: e.target.value })}
                  placeholder="Optional unit cost"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Reference</Form.Label>
                <Form.Control
                  type="text"
                  value={editForm.reference}
                  onChange={(e) => setEditForm({ ...editForm, reference: e.target.value })}
                  placeholder="e.g., INV-12345"
                />
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Notes</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  placeholder="Optional notes about this movement"
                />
              </Form.Group>

              <Alert variant="info" className="mb-0">
                <small>
                  <strong>Original values:</strong><br />
                  Type: <Badge bg={editingMovement.movement_type === 'PURCHASE' ? 'success' : 'danger'}>
                    {editingMovement.movement_type}
                  </Badge>{' '}
                  Quantity: <strong>{parseFloat(editingMovement.quantity).toFixed(2)}</strong>
                </small>
              </Alert>
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)} disabled={updating}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleUpdateClick} disabled={updating}>
            {updating ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Updating...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Delete Confirmation Modal */}
      <DeletionModal
        show={showDeleteConfirm}
        title="Delete Movement"
        confirmText="Delete"
        cancelText="Cancel"
        onClose={() => {
          setShowDeleteConfirm(false);
          setMovementToDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
      >
        <p>
          Are you sure you want to delete this{' '}
          <strong>{movementToDelete?.movement_type.toLowerCase()}</strong> movement?
        </p>
        {movementToDelete && (
          <div className="mt-2">
            <small className="text-muted">
              Quantity: <strong>{parseFloat(movementToDelete.quantity).toFixed(2)}</strong>
              <br />
              Date: {new Date(movementToDelete.created_at || movementToDelete.timestamp).toLocaleString()}
            </small>
          </div>
        )}
      </DeletionModal>

      {/* Edit Confirmation Modal */}
      {showEditConfirm && (
        <ConfirmationModal
          title="Confirm Update"
          message="Are you sure you want to update this movement? This will recalculate the stocktake variance."
          onConfirm={handleUpdateConfirm}
          onCancel={() => setShowEditConfirm(false)}
        />
      )}
    </>
  );
};

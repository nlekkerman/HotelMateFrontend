import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { FaUnlock, FaUserPlus, FaTrash } from 'react-icons/fa';
import api from '@/services/api';
import { toast } from 'react-toastify';
import ConfirmationModal from '@/components/modals/ConfirmationModal';

export const ReopenPeriodModal = ({ show, onHide, period, hotelSlug, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [allStaff, setAllStaff] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [notes, setNotes] = useState('');
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (show) {
      fetchStaff();
      fetchPermissions();
    }
  }, [show, hotelSlug]);

  const fetchStaff = async () => {
    try {
      setLoadingStaff(true);
      const response = await api.get(`/staff/${hotelSlug}/`);
      setAllStaff(response.data.results || response.data);
    } catch (err) {
      console.error('Error fetching staff:', err);
      toast.error('Failed to load staff list');
    } finally {
      setLoadingStaff(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      setLoadingPermissions(true);
      const response = await api.get(`/stock_tracker/${hotelSlug}/periods/reopen_permissions/`);
      setPermissions(response.data);
    } catch (err) {
      console.error('Error fetching permissions:', err);
      // Don't show error toast if endpoint doesn't exist yet
      if (err.response?.status !== 404) {
        toast.error('Failed to load permissions');
      }
      setPermissions([]); // Set empty array on error
    } finally {
      setLoadingPermissions(false);
    }
  };

  const handleReopenClick = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmReopen = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    try {
      const response = await api.post(
        `/stock_tracker/${hotelSlug}/periods/${period.id}/reopen/`
      );

      if (response.data.success) {
        toast.success(response.data.message || 'Period reopened successfully! 🔓');
        if (onSuccess) onSuccess();
        onHide();
      }
    } catch (err) {
      console.error('Error reopening period:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || 'Failed to reopen period';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleGrantPermission = async () => {
    if (!selectedStaff) {
      toast.warning('Please select a staff member');
      return;
    }

    try {
      const response = await api.post(
        `/stock_tracker/${hotelSlug}/periods/grant_reopen_permission/`,
        {
          staff_id: parseInt(selectedStaff),
          notes: notes || undefined
        }
      );

      if (response.data.success) {
        toast.success(response.data.message || 'Permission granted successfully! ✅');
        setSelectedStaff('');
        setNotes('');
        fetchPermissions(); // Refresh list
      }
    } catch (err) {
      console.error('Error granting permission:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || 'Failed to grant permission';
      toast.error(errorMsg);
    }
  };

  const handleRevokePermission = async (staffId, staffName) => {
    const confirmed = window.confirm(
      `Are you sure you want to revoke reopen permission for ${staffName}?`
    );

    if (!confirmed) return;

    try {
      const response = await api.post(
        `/stock_tracker/${hotelSlug}/periods/revoke_reopen_permission/`,
        { staff_id: staffId }
      );

      if (response.data.success) {
        toast.success('Permission revoked successfully');
        fetchPermissions(); // Refresh list
      }
    } catch (err) {
      console.error('Error revoking permission:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || 'Failed to revoke permission';
      toast.error(errorMsg);
    }
  };

  return (
    <>
    <Modal show={show} onHide={onHide} size="lg" backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>
          <FaUnlock className="me-2 text-danger" />
          Reopen Period: {period?.period_name}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* Reopen Period Section */}
        <div className="mb-4 pb-4 border-bottom">
          <h5 className="mb-3">
            <FaUnlock className="me-2 text-danger" />
            Reopen This Period
          </h5>
          <Alert variant="warning">
            <strong>⚠️ Warning:</strong> Reopening this period will change the stocktake status to DRAFT and allow editing.
          </Alert>
          <Button 
            variant="danger" 
            onClick={handleReopenClick}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Reopening...
              </>
            ) : (
              <>
                <FaUnlock className="me-2" />
                Reopen Period Now
              </>
            )}
          </Button>
        </div>

        {/* Manage Permissions Section */}
        <div>
          <h5 className="mb-3">
            <FaUserPlus className="me-2 text-primary" />
            Manage Reopen Permissions (Superuser Only)
          </h5>

          {/* Grant Permission Form */}
          <div className="card mb-3">
            <div className="card-header bg-light">
              <strong>Grant Permission to Staff</strong>
            </div>
            <div className="card-body">
              <Form.Group className="mb-3">
                <Form.Label>Select Staff Member</Form.Label>
                {loadingStaff ? (
                  <div className="text-center py-2">
                    <Spinner animation="border" size="sm" />
                  </div>
                ) : (
                  <Form.Select 
                    value={selectedStaff}
                    onChange={(e) => setSelectedStaff(e.target.value)}
                  >
                    <option value="">-- Select Staff --</option>
                    {allStaff.map(staff => (
                      <option key={staff.id} value={staff.id}>
                        {staff.first_name} {staff.last_name} ({staff.email})
                      </option>
                    ))}
                  </Form.Select>
                )}
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Notes (Optional)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Why are you granting this permission?"
                />
              </Form.Group>

              <Button 
                variant="primary" 
                onClick={handleGrantPermission}
                disabled={!selectedStaff}
              >
                <FaUserPlus className="me-2" />
                Grant Permission
              </Button>
            </div>
          </div>

          {/* Current Permissions List */}
          <div className="card">
            <div className="card-header bg-light">
              <strong>Staff with Reopen Permission</strong>
            </div>
            <div className="card-body">
              {loadingPermissions ? (
                <div className="text-center py-3">
                  <Spinner animation="border" />
                </div>
              ) : permissions.length === 0 ? (
                <Alert variant="info" className="mb-0">
                  No staff have been granted reopen permission yet.
                </Alert>
              ) : (
                <div className="list-group">
                  {permissions
                    .filter(p => p.is_active)
                    .map(permission => (
                      <div key={permission.id} className="list-group-item d-flex justify-content-between align-items-center">
                        <div>
                          <strong>{permission.staff_name}</strong>
                          <br />
                          <small className="text-muted">
                            {permission.staff_email}
                            {permission.notes && (
                              <>
                                <br />
                                <em>Note: {permission.notes}</em>
                              </>
                            )}
                          </small>
                        </div>
                        <Button 
                          variant="outline-danger" 
                          size="sm"
                          onClick={() => handleRevokePermission(permission.staff_id, permission.staff_name)}
                        >
                          <FaTrash className="me-1" />
                          Revoke
                        </Button>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <ConfirmationModal
          title="Confirm Reopen Period"
          message={`Are you sure you want to reopen "${period?.period_name}"? This will change the period status to OPEN and the stocktake status to DRAFT, allowing editing of stocktake data.`}
          onConfirm={handleConfirmReopen}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}
    </>
  );
};

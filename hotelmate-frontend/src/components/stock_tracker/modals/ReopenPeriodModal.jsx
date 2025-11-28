import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { FaUnlock, FaUserPlus, FaTrash } from 'react-icons/fa';
import api from '@/services/api';
import { toast } from 'react-toastify';
import StaffConfirmationModal from '@/components/staff/modals/StaffConfirmationModal';
import { useAuth } from '@/context/AuthContext';

export const ReopenPeriodModal = ({ show, onHide, period, hotelSlug, onSuccess }) => {
  const { user } = useAuth();
  const isSuperuser = user?.is_superuser === true;
  
  const [loading, setLoading] = useState(false);
  const [allStaff, setAllStaff] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState('');
  const [notes, setNotes] = useState('');
  const [canGrantToOthers, setCanGrantToOthers] = useState(false);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadingPermissions, setLoadingPermissions] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showRevokeModal, setShowRevokeModal] = useState(false);
  const [staffToRevoke, setStaffToRevoke] = useState(null);

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

    // Check if staff already has permission
    const staffId = parseInt(selectedStaff);
    const alreadyHasPermission = permissions.some(
      p => p.is_active && p.staff_id === staffId
    );

    if (alreadyHasPermission) {
      const staffMember = allStaff.find(s => s.id === staffId);
      const staffName = staffMember ? `${staffMember.first_name} ${staffMember.last_name}` : 'This staff member';
      toast.warning(`${staffName} already has permission to reopen periods`);
      return;
    }

    try {
      const response = await api.post(
        `/stock_tracker/${hotelSlug}/periods/grant_reopen_permission/`,
        {
          staff_id: staffId,
          can_grant_to_others: isSuperuser ? canGrantToOthers : false,
          notes: notes || undefined
        }
      );

      if (response.data.success) {
        toast.success(response.data.message || 'Permission granted successfully! ✅');
        setSelectedStaff('');
        setNotes('');
        setCanGrantToOthers(false);
        fetchPermissions(); // Refresh list
      }
    } catch (err) {
      console.error('Error granting permission:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || 'Failed to grant permission';
      toast.error(errorMsg);
    }
  };

  const handleToggleManager = async (permission) => {
    if (!isSuperuser) {
      toast.error('Only superusers can grant manager-level permissions');
      return;
    }

    try {
      const response = await api.post(
        `/stock_tracker/${hotelSlug}/periods/grant_reopen_permission/`,
        {
          staff_id: permission.staff_id,
          can_grant_to_others: !permission.can_grant_to_others,
          notes: permission.notes
        }
      );

      if (response.data.success) {
        toast.success(
          permission.can_grant_to_others 
            ? 'Manager status removed' 
            : 'Manager status granted'
        );
        fetchPermissions(); // Refresh list
      }
    } catch (err) {
      console.error('Error toggling manager status:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || 'Failed to update manager status';
      toast.error(errorMsg);
    }
  };

  const handleRevokeClick = (staffId, staffName) => {
    setStaffToRevoke({ staffId, staffName });
    setShowRevokeModal(true);
  };

  const handleConfirmRevoke = async () => {
    setShowRevokeModal(false);
    
    if (!staffToRevoke) return;

    try {
      const response = await api.post(
        `/stock_tracker/${hotelSlug}/periods/revoke_reopen_permission/`,
        { staff_id: staffToRevoke.staffId }
      );

      if (response.data.success) {
        toast.success('Permission revoked successfully');
        fetchPermissions(); // Refresh list
      }
    } catch (err) {
      console.error('Error revoking permission:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.detail || 'Failed to revoke permission';
      toast.error(errorMsg);
    } finally {
      setStaffToRevoke(null);
    }
  };

  return (
    <>
    <Modal show={show} onHide={onHide} size="lg" backdrop="static">
      <Modal.Header closeButton closeVariant="white" className="bg-danger text-white">
        <Modal.Title className="w-100 text-center">
          Reopening Period for {period?.period_name}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* Reopen Period Section */}
        <div className="mb-4 pb-4 border-bottom">
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

              {/* Manager Level Checkbox - Only for Superusers */}
              {isSuperuser && (
                <Form.Group className="mb-3">
                  <Form.Check 
                    type="checkbox"
                    id="can-grant-to-others"
                    checked={canGrantToOthers}
                    onChange={(e) => setCanGrantToOthers(e.target.checked)}
                    label="Manager Level"
                  />
                </Form.Group>
              )}

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
                      <div key={permission.id} className="list-group-item">
                        <div className="d-flex justify-content-between align-items-start">
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <strong>{permission.staff_name}</strong>
                              {/* Manager Badge - Visible to Everyone */}
                              {permission.can_grant_to_others && (
                                <span className="badge bg-primary">
                                  👔 Manager
                                </span>
                              )}
                            </div>
                            {permission.notes && (
                              <small className="text-muted d-block">
                                <em>Note: {permission.notes}</em>
                              </small>
                            )}
                            
                            {/* Manager Level Checkbox - Only Superusers See This */}
                            {isSuperuser && (
                              <div className="mt-2">
                                <Form.Check 
                                  type="checkbox"
                                  id={`manager-${permission.id}`}
                                  checked={permission.can_grant_to_others || false}
                                  onChange={() => handleToggleManager(permission)}
                                  label={
                                    <small className="text-muted">
                                      Can grant permissions to others
                                    </small>
                                  }
                                />
                              </div>
                            )}
                          </div>
                          
                          <div className="text-end">
                            <Button 
                              variant="outline-danger" 
                              size="sm"
                              onClick={() => handleRevokeClick(permission.staff_id, permission.staff_name)}
                              className="mb-2"
                            >
                              <FaTrash className="me-1" />
                              Revoke
                            </Button>
                            {permission.granted_by_name && (
                              <div>
                                <small className="text-muted">
                                  Granted by: {permission.granted_by_name}
                                </small>
                              </div>
                            )}
                          </div>
                        </div>
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

      {/* Confirmation Modal for Reopening */}
      {showConfirmModal && (
        <StaffConfirmationModal
          show={showConfirmModal}
          title="Confirm Reopen Period"
          message={`Are you sure you want to reopen "${period?.period_name}"? This will change the period status to OPEN and the stocktake status to DRAFT, allowing editing of stocktake data.`}
          preset="approve_request"
          onConfirm={handleConfirmReopen}
          onCancel={() => setShowConfirmModal(false)}
        />
      )}

      {/* Confirmation Modal for Revoking Permission */}
      {showRevokeModal && staffToRevoke && (
        <StaffConfirmationModal
          show={showRevokeModal}
          title="Confirm Revoke Permission"
          message={`Are you sure you want to revoke reopen permission for ${staffToRevoke.staffName}?`}
          preset="reject_request"
          onConfirm={handleConfirmRevoke}
          onCancel={() => {
            setShowRevokeModal(false);
            setStaffToRevoke(null);
          }}
        />
      )}
    </>
  );
};

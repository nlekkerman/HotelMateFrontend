import React, { useState } from 'react';
import { Modal, Button, Alert } from 'react-bootstrap';
import { FaTrash, FaExclamationTriangle } from 'react-icons/fa';
import { toast } from 'react-toastify';
import api from '@/services/api';

/**
 * DeletePeriodModal Component
 * 
 * Shows a confirmation dialog before deleting a period.
 * Only accessible to superusers.
 * 
 * ⚠️ DANGER: Deletes period and ALL related data:
 * - Period record
 * - All stocktakes for this period
 * - All stocktake lines (250+ items)
 * - All stock snapshots
 */
export const DeletePeriodModal = ({ 
  show, 
  onHide, 
  period, 
  hotelSlug,
  onSuccess 
}) => {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);
  const [confirmText, setConfirmText] = useState('');

  const handleDelete = async () => {
    // Require user to type DELETE to confirm
    if (confirmText !== 'DELETE') {
      setError('Please type DELETE to confirm');
      return;
    }

    console.log('\n🗑️ ========================================');
    console.log('🗑️ DELETING PERIOD - Starting');
    console.log('🗑️ ========================================');
    console.log('📋 Period to delete:', {
      period_id: period.id,
      period_name: period.period_name,
      start_date: period.start_date,
      end_date: period.end_date,
      is_closed: period.is_closed,
      has_stocktake: !!period.stocktake_id
    });

    setDeleting(true);
    setError(null);

    try {
      console.log('🌐 Sending DELETE request...');
      console.log('   URL:', `/stock_tracker/${hotelSlug}/periods/${period.id}/`);

      const response = await api.delete(
        `/stock_tracker/${hotelSlug}/periods/${period.id}/`
      );

      console.log('\n✅ ========================================');
      console.log('✅ PERIOD DELETED SUCCESSFULLY');
      console.log('✅ ========================================');
      console.log('📊 Response:', {
        message: response.data.message,
        deleted_counts: response.data.deleted
      });
      console.log('\n📋 What was deleted:');
      console.log('   - Periods:', response.data.deleted.period);
      console.log('   - Stocktakes:', response.data.deleted.stocktakes);
      console.log('   - Stocktake Lines:', response.data.deleted.stocktake_lines);
      console.log('   - Snapshots:', response.data.deleted.snapshots);

      toast.success(
        `✅ Period "${period.period_name}" deleted successfully!\n\n` +
        `Deleted: ${response.data.deleted.stocktakes} stocktakes, ` +
        `${response.data.deleted.stocktake_lines} lines, ` +
        `${response.data.deleted.snapshots} snapshots`,
        { autoClose: 5000 }
      );

      // Reset form
      setConfirmText('');

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }

      // Close modal
      onHide();

    } catch (err) {
      console.error('\n❌ ========================================');
      console.error('❌ DELETE FAILED');
      console.error('❌ ========================================');
      console.error('Error:', err);
      console.error('Response:', err.response?.data);

      if (err.response?.status === 403) {
        console.error('❌ Permission denied:', {
          status: 403,
          error: 'Only superusers can delete periods',
          message: err.response.data.error
        });
        setError('Permission Denied: Only superusers can delete periods');
        toast.error('❌ Only superusers can delete periods');
      } else if (err.response?.status === 404) {
        console.error('❌ Period not found:', {
          status: 404,
          period_id: period.id,
          error: 'Period may have already been deleted'
        });
        setError('Period not found. It may have already been deleted.');
        toast.error('❌ Period not found');
      } else {
        const errorMsg = err.response?.data?.error || 
                        err.response?.data?.detail || 
                        'Failed to delete period';
        setError(errorMsg);
        toast.error(`❌ ${errorMsg}`);
      }
    } finally {
      setDeleting(false);
    }
  };

  const handleClose = () => {
    if (!deleting) {
      setError(null);
      setConfirmText('');
      onHide();
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title className="text-danger">
          <FaTrash className="me-2" />
          Delete Period and All Data?
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* Danger Warning */}
        <Alert variant="danger">
          <FaExclamationTriangle className="me-2" />
          <strong>⚠️ DANGER: This action CANNOT be undone!</strong>
        </Alert>

        {/* Period Info */}
        <div className="mb-3">
          <h5>You are about to delete:</h5>
          <div className="bg-light p-3 rounded">
            <p className="mb-2">
              <strong>Period:</strong> {period?.period_name}
            </p>
            <p className="mb-2">
              <strong>Dates:</strong> {period?.start_date} to {period?.end_date}
            </p>
            <p className="mb-0">
              <strong>Status:</strong>{' '}
              <span className={`badge ${period?.is_closed ? 'bg-secondary' : 'bg-success'}`}>
                {period?.is_closed ? 'Closed' : 'Open'}
              </span>
            </p>
          </div>
        </div>

        {/* What Gets Deleted */}
        <Alert variant="warning">
          <strong>This will permanently delete:</strong>
          <ul className="mb-0 mt-2">
            <li>The period record</li>
            <li>All stocktakes for this period</li>
            <li>All stocktake lines (250+ items)</li>
            <li>All stock snapshots</li>
          </ul>
        </Alert>

        {/* Confirmation Input */}
        <div className="mb-3">
          <label className="form-label fw-bold">
            Type <code>DELETE</code> to confirm:
          </label>
          <input
            type="text"
            className="form-control"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type DELETE"
            disabled={deleting}
            autoFocus
          />
          {confirmText && confirmText !== 'DELETE' && (
            <small className="text-muted">
              Please type exactly: DELETE
            </small>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="danger" className="mb-0">
            <strong>Error:</strong> {error}
          </Alert>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button 
          variant="secondary" 
          onClick={handleClose} 
          disabled={deleting}
        >
          Cancel
        </Button>
        <Button 
          variant="danger" 
          onClick={handleDelete} 
          disabled={deleting || confirmText !== 'DELETE'}
        >
          <FaTrash className="me-2" />
          {deleting ? 'Deleting...' : '⚠️ DELETE PERMANENTLY'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

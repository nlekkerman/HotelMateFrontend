import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Button } from 'react-bootstrap';

/**
 * ConfirmDeleteModal Component
 * Confirmation modal for deleting messages
 */
const ConfirmDeleteModal = ({
  show,
  onHide,
  onConfirm,
  hardDelete = false,
  deleting = false,
  messagePreview = '',
}) => {
  const handleConfirm = () => {
    // console.log('🗑️ Delete confirmed:', { hardDelete, messagePreview });
    onConfirm();
  };

  return (
    <Modal show={show} onHide={onHide} centered size="sm">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-trash me-2"></i>
          {hardDelete ? 'Permanently Delete Message?' : 'Delete Message?'}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {messagePreview && (
          <div className="confirm-delete-modal__preview">
            <strong>Message:</strong>
            <p className="text-muted">{messagePreview.substring(0, 100)}{messagePreview.length > 100 ? '...' : ''}</p>
          </div>
        )}
        
        {hardDelete ? (
          <div className="alert alert-danger mb-0">
            <i className="bi bi-exclamation-triangle me-2"></i>
            <strong>Warning:</strong> This message will be permanently deleted and cannot be recovered.
          </div>
        ) : (
          <p className="mb-0">
            This message will be marked as deleted. It will show as "[Message deleted]" to all participants.
          </p>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={onHide} disabled={deleting}>
          Cancel
        </Button>
        <Button 
          variant={hardDelete ? 'danger' : 'warning'} 
          onClick={handleConfirm}
          disabled={deleting}
        >
          {deleting ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status">
                <span className="visually-hidden">Deleting...</span>
              </span>
              Deleting...
            </>
          ) : (
            <>
              <i className={`bi ${hardDelete ? 'bi-trash-fill' : 'bi-trash'} me-2`}></i>
              {hardDelete ? 'Delete Permanently' : 'Delete'}
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

ConfirmDeleteModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  onConfirm: PropTypes.func.isRequired,
  hardDelete: PropTypes.bool,
  deleting: PropTypes.bool,
  messagePreview: PropTypes.string,
};

export default ConfirmDeleteModal;

import React, { useState } from 'react';
import { Modal, Button, Alert } from 'react-bootstrap';
import StaffErrorHandlingModal from './StaffErrorHandlingModal';

/**
 * PeriodFinalizeModal Component
 * Handles period finalization with confirmation and error handling
 */
const PeriodFinalizeModal = ({
  show,
  onHide,
  onConfirm,
  period,
  department,
  finalizing = false,
  error = null,
  canForce = false,
}) => {
  const [showErrorModal, setShowErrorModal] = useState(false);

  const handleConfirm = (force = false) => {
    onConfirm(force);
  };

  const handleClose = () => {
    setShowErrorModal(false);
    onHide();
  };

  const handleShowErrors = () => {
    setShowErrorModal(true);
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-check-circle me-2"></i>
          Finalize Period
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {!error ? (
          // Confirmation phase
          <div>
            <div className="text-center mb-3">
              <i className="bi bi-calendar-check" style={{ fontSize: '3rem', color: '#28a745' }}></i>
            </div>
            <p className="text-center mb-3">
              Are you sure you want to finalize this period for <strong>{department}</strong>?
            </p>
            <div className="bg-light p-3 rounded">
              <div className="d-flex justify-content-between">
                <span><strong>Period:</strong></span>
                <span>{period?.name || `${period?.start_date} to ${period?.end_date}`}</span>
              </div>
              <div className="d-flex justify-content-between">
                <span><strong>Department:</strong></span>
                <span>{department}</span>
              </div>
            </div>
            <div className="alert alert-warning mt-3">
              <i className="bi bi-info-circle me-2"></i>
              <strong>Note:</strong> Once finalized, this period cannot be modified unless reopened by an administrator.
            </div>
          </div>
        ) : (
          // Error phase - Show brief summary and button to open detailed error modal
          <div>
            <div className="text-center mb-3">
              <i className="bi bi-exclamation-triangle" style={{ fontSize: '3rem', color: '#dc3545' }}></i>
            </div>
            <Alert variant="danger">
              <Alert.Heading>Cannot Finalize Period</Alert.Heading>
              <p className="mb-3">There are issues that need to be resolved before this period can be finalized.</p>
              <Button 
                variant="outline-danger" 
                onClick={handleShowErrors}
                className="me-2"
              >
                <i className="bi bi-list-ul me-2"></i>
                View Details & Actions
              </Button>
              {canForce && (
                <Button 
                  variant="warning" 
                  onClick={() => handleConfirm(true)}
                  disabled={finalizing}
                >
                  {finalizing ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Force Finalizing...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-shield-exclamation me-2"></i>
                      Force Finalize (Admin)
                    </>
                  )}
                </Button>
              )}
            </Alert>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={finalizing}>
          {error ? 'Close' : 'Cancel'}
        </Button>
        
        {!error && (
          <Button 
            variant="success" 
            onClick={() => handleConfirm(false)}
            disabled={finalizing}
          >
            {finalizing ? (
              <>
                <span className="spinner-border spinner-border-sm me-2"></span>
                Finalizing...
              </>
            ) : (
              <>
                <i className="bi bi-check-circle me-2"></i>
                Finalize Period
              </>
            )}
          </Button>
        )}
      </Modal.Footer>

      {/* Detailed Error Modal */}
      <StaffErrorHandlingModal
        show={showErrorModal}
        onHide={() => setShowErrorModal(false)}
        title="Period Finalization Issues"
        errors={error}
        canForce={canForce}
        onForceAction={() => {
          setShowErrorModal(false);
          handleConfirm(true);
        }}
        onRetry={() => {
          setShowErrorModal(false);
          handleConfirm(false);
        }}
        actionLabel="Try Again"
        forceLabel="Force Finalize (Admin)"
        processing={finalizing}
      />
    </Modal>
  );
};

export default PeriodFinalizeModal;
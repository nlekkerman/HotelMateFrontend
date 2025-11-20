import React, { useState } from 'react';
import { Modal, Button, Spinner } from 'react-bootstrap';
import { FaCheckCircle } from 'react-icons/fa';

/**
 * Confirmation modal for voice commands
 * Displays parsed command details and allows user to confirm or cancel
 */
export const VoiceCommandPreview = ({ command, stocktake, onConfirm, onCancel }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!command) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirm(command);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatAction = (action) => {
    const actions = {
      count: 'Count',
      purchase: 'Purchase',
      waste: 'Waste',
    };
    return actions[action] || action;
  };

  return (
    <Modal show={true} onHide={onCancel} centered size="lg" backdrop="static">
      <Modal.Header closeButton className="bg-primary text-white">
        <Modal.Title>
          <FaCheckCircle className="me-2" />
          Confirm Voice Command
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="command-preview">
          <div className="preview-section mb-3">
            <div className="preview-row">
              <span className="label fw-bold">Action:</span>
              <span className="value">
                <span className={`badge bg-${command.action === 'count' ? 'info' : command.action === 'purchase' ? 'success' : 'warning'}`}>
                  {formatAction(command.action)}
                </span>
              </span>
            </div>

            <div className="preview-row">
              <span className="label fw-bold">Product:</span>
              <span className="value">{command.item_identifier}</span>
            </div>
          </div>

          {/* Show full_units and partial_units if provided by backend */}
          {command.full_units !== null && command.full_units !== undefined && (
            <div className="preview-section mb-3">
              <h6 className="text-muted mb-2">Breakdown:</h6>
              
              {command.full_units !== null && (
                <div className="preview-row">
                  <span className="label">Full Units (Dozen/Cases/Kegs):</span>
                  <span className="value fw-bold">{command.full_units}</span>
                </div>
              )}

              {command.partial_units !== null && (
                <div className="preview-row">
                  <span className="label">Partial Units (Bottles/Pints):</span>
                  <span className="value fw-bold">{command.partial_units}</span>
                </div>
              )}
            </div>
          )}

          {/* Total value */}
          <div className="preview-section mb-3 border-top pt-3">
            <div className="preview-row total">
              <span className="label fw-bold fs-5">Total:</span>
              <span className="value fw-bold fs-5 text-primary">{command.value}</span>
            </div>
          </div>

          {/* Transcription */}
          {command.transcription && (
            <div className="preview-section bg-light p-3 rounded">
              <div className="preview-row transcription">
                <span className="label text-muted small">You said:</span>
                <span className="value fst-italic">"{command.transcription}"</span>
              </div>
            </div>
          )}
        </div>
      </Modal.Body>

      <Modal.Footer>
        <Button 
          variant="secondary" 
          onClick={onCancel} 
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleConfirm} 
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Updating...
            </>
          ) : (
            'Confirm'
          )}
        </Button>
      </Modal.Footer>

      <style>{`
        .command-preview {
          padding: 0.5rem;
        }

        .preview-section {
          margin-bottom: 1rem;
        }

        .preview-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 0;
          border-bottom: 1px solid #eee;
        }

        .preview-row:last-child {
          border-bottom: none;
        }

        .preview-row.total {
          border-top: 2px solid #0d6efd;
          border-bottom: none;
          margin-top: 0.5rem;
        }

        .preview-row .label {
          color: #666;
        }

        .preview-row .value {
          text-align: right;
        }

        .preview-row.transcription {
          border: none;
          padding: 0;
        }

        .preview-row.transcription .label,
        .preview-row.transcription .value {
          display: block;
          text-align: left;
        }

        .preview-row.transcription .value {
          margin-top: 0.25rem;
        }
      `}</style>
    </Modal>
  );
};

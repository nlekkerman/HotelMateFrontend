import React, { useState, useRef } from 'react';
import { Alert, Button, Form, Card, Spinner } from 'react-bootstrap';

/**
 * Inline Acknowledge Overstay Form Component
 * Renders an inline form (not modal) for acknowledging overstay incidents
 */
const AcknowledgeOverstayForm = ({ 
  show, 
  bookingId, 
  isAcknowledging, 
  onConfirm, 
  onCancel 
}) => {
  const [dismissOverstay, setDismissOverstay] = useState(false);
  const textareaRef = useRef(null);

  // Hide the form when show is false
  if (!show) {
    return null;
  }

  const handleSubmit = () => {
    const note = textareaRef.current?.value || '';
    onConfirm(note, dismissOverstay);
  };

  const handleCancel = () => {
    // Reset form state
    if (textareaRef.current) {
      textareaRef.current.value = '';
    }
    setDismissOverstay(false);
    onCancel();
  };

  return (
    <Card className="mt-3 border-warning">
      <Card.Header className="bg-warning bg-opacity-10">
        <h6 className="mb-0 text-warning">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Acknowledge Overstay
        </h6>
      </Card.Header>
      <Card.Body>
        <Alert variant="info" className="mb-3">
          <div className="d-flex align-items-start">
            <i className="bi bi-info-circle-fill me-2 mt-1 text-info"></i>
            <div>
              <strong>Acknowledge overstay for booking {bookingId}</strong>
              <div className="mt-1 small">
                Add an optional note and choose whether to dismiss this overstay incident.
              </div>
            </div>
          </div>
        </Alert>

        <Form>
          <Form.Group className="mb-3">
            <Form.Label>
              Note <span className="text-muted">(Optional)</span>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              ref={textareaRef}
              placeholder="Add any notes about this overstay acknowledgment..."
              disabled={isAcknowledging}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Check
              type="checkbox"
              id="dismissOverstay"
              label={
                <>
                  <strong>Dismiss this overstay</strong>
                  <div className="text-muted small">
                    Check this to dismiss and hide this overstay incident after acknowledging
                  </div>
                </>
              }
              checked={dismissOverstay}
              onChange={(e) => setDismissOverstay(e.target.checked)}
              disabled={isAcknowledging}
            />
          </Form.Group>
        </Form>

        <div className="d-flex justify-content-end gap-2 pt-2 border-top">
          <Button 
            variant="outline-secondary" 
            onClick={handleCancel}
            disabled={isAcknowledging}
          >
            Cancel
          </Button>
          <Button 
            variant="warning" 
            onClick={handleSubmit}
            disabled={isAcknowledging}
          >
            {isAcknowledging ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Acknowledging...
              </>
            ) : (
              'Acknowledge'
            )}
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default AcknowledgeOverstayForm;
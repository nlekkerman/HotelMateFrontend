import React, { useState } from 'react';
import { Modal, Button, Form, Alert, Spinner } from 'react-bootstrap';
import { emailRegistrationPackage } from '@/services/registrationPackageApi';

export default function EmailRegistrationPackageModal({
  show,
  onHide,
  pkg,
  hotelSlug,
}) {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError(null);

    try {
      await emailRegistrationPackage(hotelSlug, pkg.id, {
        recipient_email: email,
        message: message || undefined,
      });
      setSuccess(true);
      setTimeout(() => {
        onHide();
        setSuccess(false);
        setEmail('');
        setMessage('');
      }, 1500);
    } catch (err) {
      setError(
        err.response?.data?.error ||
          err.response?.data?.detail ||
          err.message ||
          'Failed to send email'
      );
    } finally {
      setSending(false);
    }
  };

  const handleExited = () => {
    setEmail('');
    setMessage('');
    setError(null);
    setSuccess(false);
  };

  return (
    <Modal show={show} onHide={onHide} onExited={handleExited} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-envelope me-2"></i>
          Email Registration Package
        </Modal.Title>
      </Modal.Header>
      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && (
            <Alert variant="danger">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {error}
            </Alert>
          )}
          {success && (
            <Alert variant="success">
              <i className="bi bi-check-circle me-2"></i>
              Email sent successfully!
            </Alert>
          )}

          <div className="mb-3 p-2 bg-light rounded text-center">
            <small className="text-muted d-block">Package Code</small>
            <span className="font-monospace fw-bold">
              {pkg?.registration_code || pkg?.code}
            </span>
          </div>

          <Form.Group className="mb-3">
            <Form.Label>Recipient Email</Form.Label>
            <Form.Control
              type="email"
              required
              placeholder="employee@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={sending || success}
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>
              Message <small className="text-muted">(optional)</small>
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Additional instructions for the recipient..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sending || success}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={sending}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" disabled={sending || success}>
            {sending ? (
              <>
                <Spinner size="sm" className="me-1" /> Sending...
              </>
            ) : (
              <>
                <i className="bi bi-send me-1"></i> Send Email
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
}

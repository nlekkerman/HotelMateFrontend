import React, { useState } from 'react';
import { Container, Card, Button, Modal } from 'react-bootstrap';

/**
 * GuestPortalStub - Placeholder for guest portal access (PIN required)
 */
const GuestPortalStub = ({ hotel }) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <section className="guest-portal-stub py-4 bg-light border-top">
        <Container>
          <Card className="text-center border-0 shadow-sm" style={{ maxWidth: '600px', margin: '0 auto' }}>
            <Card.Body className="py-4">
              <h5 className="mb-2 fw-bold">Already staying with us?</h5>
              <p className="text-muted mb-3">Access your personalized guest portal with your room PIN</p>
              <Button variant="outline-primary" onClick={() => setShowModal(true)}>
                <i className="bi bi-key me-2"></i>
                Access your stay (PIN required)
              </Button>
            </Card.Body>
          </Card>
        </Container>
      </section>

      {/* Coming Soon Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-key me-2"></i>
            Guest Portal
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center py-5">
          <div className="mb-4">
            <i className="bi bi-hourglass-split text-muted" style={{ fontSize: '4rem' }}></i>
          </div>
          <h5 className="fw-bold mb-3">Coming Soon</h5>
          <p className="text-muted mb-0">
            The guest portal will be available soon. <br />
            Please contact reception for assistance.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default GuestPortalStub;

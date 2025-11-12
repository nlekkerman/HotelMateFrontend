import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { Modal } from 'react-bootstrap';

/**
 * SuccessModal Component
 * Success notification modal (auto-closes after delay)
 */
const SuccessModal = ({
  show,
  onHide,
  message = 'Action completed successfully!',
  icon = 'check-circle',
  autoCloseDelay = 2000,
}) => {
  useEffect(() => {
    if (show && autoCloseDelay > 0) {
      const timer = setTimeout(() => {
        //
        onHide();
      }, autoCloseDelay);
      
      return () => clearTimeout(timer);
    }
  }, [show, autoCloseDelay, onHide]);

  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      centered 
      size="sm"
      className="success-modal"
    >
      <Modal.Body className="text-center py-4">
        <div className="success-modal__icon mb-3">
          <i className={`bi bi-${icon} text-success`} style={{ fontSize: '48px' }}></i>
        </div>
        <p className="success-modal__message mb-0">
          {message}
        </p>
      </Modal.Body>
    </Modal>
  );
};

SuccessModal.propTypes = {
  show: PropTypes.bool.isRequired,
  onHide: PropTypes.func.isRequired,
  message: PropTypes.string,
  icon: PropTypes.string,
  autoCloseDelay: PropTypes.number,
};

export default SuccessModal;

import React, { useState } from 'react';
import { Modal, Button, Alert, Badge, ListGroup } from 'react-bootstrap';

/**
 * StaffErrorHandlingModal Component
 * Displays backend error messages with actionable guidance for staff
 */
const StaffErrorHandlingModal = ({
  show,
  onHide,
  title = "Action Required",
  errors = [],
  warnings = [],
  suggestions = [],
  canForce = false,
  onForceAction = null,
  onRetry = null,
  actionLabel = "Retry",
  forceLabel = "Force Continue (Admin)",
  processing = false
}) => {
  const [showForceConfirm, setShowForceConfirm] = useState(false);

  const handleClose = () => {
    setShowForceConfirm(false);
    onHide();
  };

  const handleForce = () => {
    if (onForceAction) {
      onForceAction();
    }
  };

  const getErrorIcon = (type) => {
    switch (type) {
      case 'conflict':
        return 'bi-clock-history';
      case 'validation':
        return 'bi-exclamation-triangle';
      case 'permission':
        return 'bi-shield-exclamation';
      case 'requirement':
        return 'bi-check-square';
      case 'attendance':
        return 'bi-person-check';
      case 'schedule':
        return 'bi-calendar-x';
      default:
        return 'bi-info-circle';
    }
  };

  const getErrorVariant = (type) => {
    switch (type) {
      case 'conflict':
      case 'validation':
        return 'danger';
      case 'permission':
        return 'warning';
      case 'requirement':
        return 'info';
      case 'attendance':
        return 'primary';
      default:
        return 'secondary';
    }
  };

  const formatErrorMessage = (error) => {
    // Handle different error message formats from backend
    if (typeof error === 'string') {
      return { message: error, type: 'validation' };
    }
    
    if (error.message) {
      return {
        message: error.message,
        type: error.type || 'validation',
        details: error.details,
        count: error.count,
        staff: error.staff,
        time: error.time,
        department: error.department
      };
    }
    
    return { message: 'Unknown error', type: 'validation' };
  };

  const parseErrorsFromText = (errorText) => {
    // Parse common error patterns from backend text
    const parsedErrors = [];
    
    if (errorText.includes('unresolved unrostered clock-in')) {
      const staffMatch = errorText.match(/from: (.+)$/);
      const countMatch = errorText.match(/(\d+) unresolved/);
      
      parsedErrors.push({
        type: 'attendance',
        message: 'Unresolved clock-in logs need attention',
        details: `${countMatch?.[1] || 'Several'} unrostered clock-ins need approval`,
        staff: staffMatch?.[1],
        action: 'Review and approve/reject unrostered clock-ins before finalizing'
      });
    }
    
    if (errorText.includes('overlapping shifts')) {
      parsedErrors.push({
        type: 'conflict',
        message: 'Schedule conflicts detected',
        details: 'Some staff have overlapping shift times',
        action: 'Adjust shift times to resolve conflicts'
      });
    }
    
    if (errorText.includes('minimum staffing')) {
      parsedErrors.push({
        type: 'requirement',
        message: 'Staffing requirements not met',
        details: 'Some shifts don\'t meet minimum staff requirements',
        action: 'Add more staff to understaffed shifts'
      });
    }
    
    if (errorText.includes('overtime')) {
      parsedErrors.push({
        type: 'validation',
        message: 'Overtime limits exceeded',
        details: 'Some staff would exceed maximum weekly hours',
        action: 'Reduce hours or get manager approval for overtime'
      });
    }
    
    if (errorText.includes('permission')) {
      parsedErrors.push({
        type: 'permission',
        message: 'Permission required',
        details: 'This action requires higher privileges',
        action: 'Contact your supervisor or administrator'
      });
    }
    
    // If no specific patterns found, treat as general validation error
    if (parsedErrors.length === 0) {
      parsedErrors.push({
        type: 'validation',
        message: errorText,
        action: 'Please review and correct the issues mentioned'
      });
    }
    
    return parsedErrors;
  };

  // Process errors - handle both array of objects and single error text
  const processedErrors = Array.isArray(errors) && errors.length > 0
    ? errors.map(formatErrorMessage)
    : typeof errors === 'string' 
    ? parseErrorsFromText(errors)
    : [];

  return (
    <Modal show={show} onHide={handleClose} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-exclamation-triangle-fill me-2 text-warning"></i>
          {title}
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <div className="text-center mb-4">
          <i className="bi bi-clipboard-x" style={{ fontSize: '3rem', color: '#dc3545' }}></i>
          <h5 className="mt-2">Issues Need Your Attention</h5>
          <p className="text-muted">
            Please resolve the following issues before continuing:
          </p>
        </div>

        {/* Error List */}
        {processedErrors.length > 0 && (
          <div className="mb-4">
            <h6 className="text-danger">
              <i className="bi bi-x-circle me-2"></i>
              Issues Found ({processedErrors.length})
            </h6>
            <ListGroup variant="flush">
              {processedErrors.map((error, index) => (
                <ListGroup.Item key={index} className="px-0">
                  <Alert variant={getErrorVariant(error.type)} className="mb-2">
                    <div className="d-flex align-items-start">
                      <i className={`bi ${getErrorIcon(error.type)} me-3 mt-1`}></i>
                      <div className="flex-grow-1">
                        <div className="fw-bold">{error.message}</div>
                        {error.details && (
                          <div className="small text-muted mt-1">{error.details}</div>
                        )}
                        {error.staff && (
                          <div className="mt-2">
                            <Badge bg="secondary">Staff: {error.staff}</Badge>
                          </div>
                        )}
                        {error.action && (
                          <div className="mt-2 p-2 bg-light rounded">
                            <small>
                              <i className="bi bi-lightbulb me-1"></i>
                              <strong>Action needed:</strong> {error.action}
                            </small>
                          </div>
                        )}
                      </div>
                    </div>
                  </Alert>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="mb-4">
            <h6 className="text-warning">
              <i className="bi bi-exclamation-triangle me-2"></i>
              Warnings ({warnings.length})
            </h6>
            <ListGroup variant="flush">
              {warnings.map((warning, index) => (
                <ListGroup.Item key={index} className="px-0">
                  <Alert variant="warning">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {warning}
                  </Alert>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="mb-4">
            <h6 className="text-info">
              <i className="bi bi-lightbulb me-2"></i>
              Suggestions
            </h6>
            <div className="bg-info bg-opacity-10 p-3 rounded">
              {suggestions.map((suggestion, index) => (
                <div key={index} className="mb-2">
                  <i className="bi bi-arrow-right me-2"></i>
                  {suggestion}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Force Option */}
        {canForce && !showForceConfirm && (
          <Alert variant="warning">
            <Alert.Heading>
              <i className="bi bi-shield-exclamation me-2"></i>
              Administrator Override Available
            </Alert.Heading>
            <p className="mb-2">
              As an administrator, you can force this action to complete despite the issues above.
            </p>
            <Button 
              variant="outline-warning" 
              size="sm"
              onClick={() => setShowForceConfirm(true)}
            >
              <i className="bi bi-gear me-1"></i>
              Show Override Options
            </Button>
          </Alert>
        )}

        {/* Force Confirmation */}
        {canForce && showForceConfirm && (
          <Alert variant="danger">
            <Alert.Heading>
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              Force Override Confirmation
            </Alert.Heading>
            <p className="mb-3">
              <strong>Warning:</strong> This will bypass all validation checks. 
              The issues above will not be automatically resolved and may cause problems later.
            </p>
            <p className="mb-3">Are you sure you want to continue?</p>
            <div className="d-flex gap-2">
              <Button 
                variant="outline-secondary"
                size="sm"
                onClick={() => setShowForceConfirm(false)}
              >
                Cancel Override
              </Button>
              <Button 
                variant="danger" 
                size="sm"
                onClick={handleForce}
                disabled={processing}
              >
                {processing ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2"></span>
                    Processing...
                  </>
                ) : (
                  <>
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {forceLabel}
                  </>
                )}
              </Button>
            </div>
          </Alert>
        )}
      </Modal.Body>

      <Modal.Footer className="justify-content-between">
        <div className="text-muted small">
          <i className="bi bi-info-circle me-1"></i>
          Review each issue carefully before proceeding
        </div>
        
        <div className="d-flex gap-2">
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
          {onRetry && (
            <Button 
              variant="primary" 
              onClick={onRetry}
              disabled={processing}
            >
              {processing ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Processing...
                </>
              ) : (
                <>
                  <i className="bi bi-arrow-clockwise me-2"></i>
                  {actionLabel}
                </>
              )}
            </Button>
          )}
        </div>
      </Modal.Footer>
    </Modal>
  );
};

export default StaffErrorHandlingModal;
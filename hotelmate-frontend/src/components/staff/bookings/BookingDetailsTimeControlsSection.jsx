import React from 'react';
import { Card, Alert, Badge, Button, Spinner } from 'react-bootstrap';
import { format } from 'date-fns';
import BookingTimeWarningBadges from './BookingTimeWarningBadges';

const BookingDetailsTimeControlsSection = ({ 
  booking,
  bookingWarnings,
  overstayState,
  onAcknowledgeOverstay,
  onExtendStay,
  onRetryOverstayStatus
}) => {
  const {
    overstayStatus,
    isLoadingOverstayStatus,
    overstayStatusError,
    isAcknowledging,
    isExtending
  } = overstayState;
  
  const warnings = bookingWarnings;
  const isExpired = booking.status === 'EXPIRED';
  
  // Show section if there are warnings or booking is expired
  if (!warnings.approval && !warnings.overstay && !isExpired) {
    return null;
  }

  return (
    <Card className="mb-3">
      <Card.Header>
        <h5 className="mb-0">
          <i className="bi bi-clock me-2"></i>
          Time Controls
        </h5>
      </Card.Header>
      <Card.Body>
        {/* EXPIRED Status Banner */}
        {isExpired && (
          <Alert variant="danger" className="mb-3">
            <Alert.Heading>
              <i className="bi bi-exclamation-triangle me-2"></i>
              EXPIRED: Booking expired due to approval timeout.
            </Alert.Heading>
            <p className="mb-1">
              This booking cannot be approved as it has exceeded the approval deadline.
            </p>
            {booking.expired_at && (
              <small className="text-muted">
                Expired: {format(new Date(booking.expired_at), 'MMM dd, yyyy HH:mm')}
              </small>
            )}
            {booking.auto_expire_reason_code && (
              <div>
                <small className="text-muted">
                  Reason: {booking.auto_expire_reason_code}
                </small>
              </div>
            )}
          </Alert>
        )}

        {/* Approval Section */}
        {warnings.approval && (
          <div className="mb-3">
            <div className="d-flex align-items-center mb-2">
              <strong className="me-2">Approval Status:</strong>
              <BookingTimeWarningBadges booking={booking} showTooltips={false} />
            </div>
            
            {warnings.approval.deadline && (
              <div className="small text-muted mb-1">
                <i className="bi bi-calendar-event me-1"></i>
                Deadline: {format(new Date(warnings.approval.deadline), 'MMM dd, yyyy HH:mm')}
              </div>
            )}
            
            {warnings.approval.isOverdue && (
              <div className="small text-danger mb-1">
                <i className="bi bi-exclamation-circle me-1"></i>
                Overdue by {warnings.approval.minutesOverdue} minutes
              </div>
            )}
            
            <div className="small text-muted">
              <i className="bi bi-lightbulb me-1"></i>
              Suggested action: Confirm or Decline booking
            </div>
          </div>
        )}

        {/* Overstay Section */}
        {warnings.overstay && (
          <div className="mb-3">
            <div className="d-flex align-items-center mb-2">
              <strong className="me-2">Checkout Status:</strong>
              <Badge bg={warnings.overstay.variant} className="me-2">
                <i className="bi bi-hourglass-split me-1"></i>
                {warnings.overstay.displayText}
              </Badge>
            </div>
            
            {warnings.overstay.deadline && (
              <div className="small text-muted mb-1">
                <i className="bi bi-calendar-event me-1"></i>
                Checkout deadline: {format(new Date(warnings.overstay.deadline), 'MMM dd, yyyy HH:mm')}
              </div>
            )}
            
            {warnings.overstay.isOverstay && (
              <div className="small text-danger mb-1">
                <i className="bi bi-exclamation-circle me-1"></i>
                Overstay by {warnings.overstay.minutesOverdue} minutes
              </div>
            )}
            
            {warnings.overstay.flaggedAt && (
              <div className="small text-warning mb-1">
                <i className="bi bi-flag me-1"></i>
                Flagged: {format(new Date(warnings.overstay.flaggedAt), 'MMM dd, yyyy HH:mm')}
              </div>
            )}
            
            {warnings.overstay.acknowledgedAt && (
              <div className="small text-success mb-1">
                <i className="bi bi-check-circle me-1"></i>
                Acknowledged: {format(new Date(warnings.overstay.acknowledgedAt), 'MMM dd, yyyy HH:mm')}
              </div>
            )}
            
            <div className="small text-muted mb-2">
              <i className="bi bi-lightbulb me-1"></i>
              Suggested action: Checkout guest or Extend stay
            </div>
            
            {/* Action Buttons - Now functional */}
            <div className="d-flex gap-2">
              {(() => {
                const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
                const hasIncident = overstayStatus?.incident !== null && overstayStatus?.incident !== undefined;
                const incidentStatus = overstayStatus?.incident?.status;
                const showExtend = hasIncident || (booking?.is_overstay === true);
                const showAcknowledge = hasIncident && incidentStatus === 'OPEN';
                const isAcknowledged = incidentStatus === 'ACKNOWLEDGED';
                const isResolved = incidentStatus === 'RESOLVED' || incidentStatus === 'DISMISSED';
                
                if (!isInHouse) return null;
                
                return (
                  <>
                    {showAcknowledge && (
                      <Button 
                        variant={isAcknowledged ? "outline-success" : "outline-warning"} 
                        size="sm" 
                        disabled={isAcknowledged || isAcknowledging}
                        onClick={onAcknowledgeOverstay}
                      >
                        <i className={`bi ${isAcknowledged ? 'bi-check-circle' : 'bi-flag'} me-1`}></i>
                        {isAcknowledging ? (
                          <>
                            <Spinner animation="border" size="sm" className="me-1" />
                            Acknowledging...
                          </>
                        ) : (
                          isAcknowledged ? 'Acknowledged ✓' : 'Acknowledge Overstay'
                        )}
                      </Button>
                    )}
                    {showExtend && !isResolved && (
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        disabled={isExtending}
                        onClick={onExtendStay}
                      >
                        <i className="bi bi-calendar-plus me-1"></i>
                        {isExtending ? (
                          <>
                            <Spinner animation="border" size="sm" className="me-1" />
                            Extending...
                          </>
                        ) : (
                          'Extend Stay'
                        )}
                      </Button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}
        
        {/* Overstay Incident Panel - Backend-backed overstay data */}
        {(overstayStatus || isLoadingOverstayStatus || booking?.checkout_overdue || warnings.overstay) && (
          <div className="mb-3">
            <div className="d-flex align-items-center justify-content-between mb-2">
              <strong>Overstay Incident:</strong>
              {isLoadingOverstayStatus && (
                <Spinner animation="border" size="sm" className="text-muted" />
              )}
            </div>
            
            {overstayStatus ? (
              <>
                {overstayStatus.incident ? (
                  <>
                    <Badge 
                      bg={
                        overstayStatus.incident.status === 'OPEN' ? 'danger' :
                        overstayStatus.incident.status === 'ACKNOWLEDGED' ? 'warning' :
                        overstayStatus.incident.status === 'RESOLVED' ? 'success' :
                        'secondary'
                      }
                      className="mb-2"
                    >
                      {overstayStatus.incident.status}
                    </Badge>
                  </>
                ) : (
                  <Badge bg="secondary" className="mb-2">
                    Not flagged yet
                  </Badge>
                )}
                
                {overstayStatus.incident ? (
                  <>
                    {overstayStatus.incident.expected_checkout_date && (
                      <div className="small text-muted mb-1">
                        <i className="bi bi-calendar-event me-1"></i>
                        Expected checkout: {format(new Date(overstayStatus.incident.expected_checkout_date), 'MMM dd, yyyy')}
                      </div>
                    )}
                    
                    {overstayStatus.incident.detected_at && (
                      <div className="small text-muted mb-1">
                        <i className="bi bi-clock me-1"></i>
                        Detected: {format(new Date(overstayStatus.incident.detected_at), 'MMM dd, yyyy HH:mm')}
                      </div>
                    )}
                    
                    {overstayStatus.incident.hours_overdue !== null && overstayStatus.incident.hours_overdue !== undefined && (
                      <div className="small text-danger mb-1">
                        <i className="bi bi-hourglass-split me-1"></i>
                        Hours overdue: {overstayStatus.incident.hours_overdue}
                      </div>
                    )}
                    
                    {/* Extensions Display */}
                    <div className="mt-2">
                      <div className="small fw-semibold text-muted mb-1">Extensions:</div>
                      {overstayStatus.incident.extensions && overstayStatus.incident.extensions.length > 0 ? (
                        <div className="small">
                          {overstayStatus.incident.extensions.map((ext, index) => (
                            <div key={index} className="mb-1 ps-2 border-start border-2 border-info">
                              {ext.created_at && (
                                <div className="text-muted">
                                  <i className="bi bi-clock me-1"></i>
                                  {format(new Date(ext.created_at), 'MMM dd, yyyy HH:mm')}
                                </div>
                              )}
                              {ext.extended_at && (
                                <div className="text-muted">
                                  <i className="bi bi-clock me-1"></i>
                                  {format(new Date(ext.extended_at), 'MMM dd, yyyy HH:mm')}
                                </div>
                              )}
                              {ext.minutes && (
                                <div className="text-info">
                                  <i className="bi bi-plus-circle me-1"></i>
                                  +{ext.minutes} minutes
                                </div>
                              )}
                              {ext.hours && (
                                <div className="text-info">
                                  <i className="bi bi-plus-circle me-1"></i>
                                  +{ext.hours} hours
                                </div>
                              )}
                              {ext.new_deadline && (
                                <div className="text-info">
                                  <i className="bi bi-calendar-event me-1"></i>
                                  New deadline: {format(new Date(ext.new_deadline), 'MMM dd, yyyy HH:mm')}
                                </div>
                              )}
                              {ext.expected_checkout_date && (
                                <div className="text-info">
                                  <i className="bi bi-calendar-event me-1"></i>
                                  New checkout: {format(new Date(ext.expected_checkout_date), 'MMM dd, yyyy')}
                                </div>
                              )}
                              {ext.staff_name && (
                                <div className="text-muted">
                                  <i className="bi bi-person me-1"></i>
                                  By: {ext.staff_name}
                                </div>
                              )}
                              {ext.staff_id && !ext.staff_name && (
                                <div className="text-muted">
                                  <i className="bi bi-person me-1"></i>
                                  Staff ID: {ext.staff_id}
                                </div>
                              )}
                              {ext.notes && (
                                <div className="text-muted">
                                  <i className="bi bi-chat me-1"></i>
                                  {ext.notes}
                                </div>
                              )}
                              {ext.reason && (
                                <div className="text-muted">
                                  <i className="bi bi-chat me-1"></i>
                                  {ext.reason}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="small text-muted">No extensions recorded.</div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="small text-info mb-1">
                    <i className="bi bi-info-circle me-1"></i>
                    Backend has not flagged overstay incident yet (flagging occurs at 12:00 hotel time)
                  </div>
                )}
              </>
            ) : isLoadingOverstayStatus ? (
              <div className="small text-muted">
                <i className="bi bi-clock me-1"></i>
                Loading overstay status...
              </div>
            ) : (
              <>
                {overstayStatusError ? (
                  <>
                    <div className="small text-warning mb-2">
                      <i className="bi bi-exclamation-triangle me-1"></i>
                      Incident details unavailable.
                    </div>
                    <Button 
                      variant="outline-primary" 
                      size="sm" 
                      onClick={onRetryOverstayStatus}
                      className="mb-2"
                    >
                      <i className="bi bi-arrow-clockwise me-1"></i>
                      Retry
                    </Button>
                  </>
                ) : (
                  <div className="small text-warning mb-1">
                    <i className="bi bi-exclamation-triangle me-1"></i>
                    Unable to load backend overstay status
                  </div>
                )}
                {(booking?.checkout_overdue || warnings.overstay) && (
                  <div className="small text-info mb-1">
                    <i className="bi bi-info-circle me-1"></i>
                    Frontend time warnings available (guest may be overdue)
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default BookingDetailsTimeControlsSection;
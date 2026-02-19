import React from 'react';
import { Card, Alert, Badge, Button, Spinner } from 'react-bootstrap';
import { format } from 'date-fns';
import AcknowledgeOverstayForm from '../modals/AcknowledgeOverstayForm';

/**
 * Format minutes into human-readable duration
 * Examples: 42 -> "42m", 90 -> "1h 30m", 1462 -> "24h 22m"
 */
function formatMinutesToHuman(minutes) {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
}

const BookingDetailsTimeControlsSection = ({ 
  booking,
  bookingWarnings,
  overstayState,
  onAcknowledgeOverstay,
  onExtendStay,
  onRetryOverstayStatus,
  acknowledgeForm
}) => {
  const {
    overstayStatus,
    isLoadingOverstayStatus,
    overstayStatusError,
    isAcknowledging,
    isExtending
  } = overstayState;
  
  const warnings = bookingWarnings;
  const activeWarning = warnings?.active;
  const isExpired = booking.status === 'EXPIRED';
  
  // Show expired banner OR active warning panel (not both)
  if (!activeWarning && !isExpired) {
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
        {/* EXPIRED Status Banner - Status only, not a warning */}
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

        {/* Active Warning Panels - Only for actionable states */}
        {activeWarning?.type === 'approval_issue' && (
          <div className="mb-3">
            <div className="d-flex align-items-center mb-2">
              <strong className="me-2">Approval Status:</strong>
              <Badge bg={activeWarning.variant} className="me-2">
                <i className="bi bi-clock me-1"></i>
                {activeWarning.displayText}
              </Badge>
            </div>
            
            {activeWarning.data.deadline && (
              <div className="small text-muted mb-1">
                <i className="bi bi-calendar-event me-1"></i>
                Deadline: {format(new Date(activeWarning.data.deadline), 'MMM dd, yyyy HH:mm')}
              </div>
            )}
            
            {activeWarning.data.isOverdue && (
              <div className="small text-danger mb-1">
                <i className="bi bi-exclamation-circle me-1"></i>
                Overdue by {formatMinutesToHuman(activeWarning.data.minutesOverdue)}
              </div>
            )}
            
            <div className="small text-muted">
              <i className="bi bi-lightbulb me-1"></i>
              Suggested action: Confirm or Decline booking
            </div>
          </div>
        )}

        {activeWarning?.type === 'checkout_overstay' && (
          <>
            <div className="mb-3">
              <div className="d-flex align-items-center mb-2">
                <strong className="me-2">Checkout Status:</strong>
                <Badge bg={activeWarning.variant} className="me-2">
                  <i className="bi bi-hourglass-split me-1"></i>
                  {(() => {
                    // Check if there's an acknowledged incident
                    const incident = overstayStatus?.overstay;
                    if (incident?.status === 'ACKED') {
                      return 'Checkout · Acknowledged';
                    }
                    return activeWarning.displayText;
                  })()} 
                </Badge>
              </div>
              
              {activeWarning.data.deadline && (
                <div className="small text-muted mb-1">
                  <i className="bi bi-calendar-event me-1"></i>
                  Checkout deadline: {format(new Date(activeWarning.data.deadline), 'MMM dd, yyyy HH:mm')}
                </div>
              )}
              
              {activeWarning.data.isOverstay && (
                <div className="small text-danger mb-1">
                  <i className="bi bi-exclamation-circle me-1"></i>
                  {(() => {
                    // Use backend incident data if available for consistency
                    const incident = overstayStatus?.overstay;
                    if (incident?.hours_overdue !== null && incident?.hours_overdue !== undefined) {
                      const totalMinutes = Math.round(incident.hours_overdue * 60);
                      return `Overdue by ${formatMinutesToHuman(totalMinutes)}`;
                    }
                    // Fallback to frontend calculation
                    return `Overdue by ${formatMinutesToHuman(activeWarning.data.minutesOverdue)}`;
                  })()} 
                </div>
              )}
              
              {activeWarning.data.flaggedAt && (
                <div className="small text-warning mb-1">
                  <i className="bi bi-flag me-1"></i>
                  Flagged: {format(new Date(activeWarning.data.flaggedAt), 'MMM dd, yyyy HH:mm')}
                </div>
              )}
              
              {activeWarning.data.acknowledgedAt && (
                <div className="small text-success mb-1">
                  <i className="bi bi-check-circle me-1"></i>
                  Acknowledged: {format(new Date(activeWarning.data.acknowledgedAt), 'MMM dd, yyyy HH:mm')}
                </div>
              )}
              
              {(() => {
                const checkoutDeadline = booking.checkout_deadline_at;
                if (!checkoutDeadline) return null;
                
                const now = new Date();
                const deadline = new Date(checkoutDeadline);
                
                // Calculate checkout time (typically check_out date at 11:00 AM)
                const checkoutDate = booking.check_out;
                if (!checkoutDate) return null;
                
                const checkoutTime = new Date(checkoutDate + 'T11:00:00');
                
                // Dynamic logic based on checkout deadline and current time
                let actionText = null;
                if (now < checkoutTime) {
                  actionText = `Guest checkout ${format(checkoutTime, 'MMM dd')} at ${format(checkoutTime, 'HH:mm')}`;
                } else if (now < deadline) {
                  actionText = "Checkout due soon";
                } else {
                  actionText = "Checkout guest or Extend stay";
                }
                
                // Only show suggested action if there's an urgent action needed
                if (now >= checkoutTime && actionText) {
                  return (
                    <div className="small text-muted mb-2">
                      <i className="bi bi-lightbulb me-1"></i>
                      Suggested action: {actionText}
                    </div>
                  );
                }
                
                return null; // No suggested action needed before checkout time
              })()}
              
              {/* Action Buttons - Now functional */}
              <div className="d-flex gap-2">
                {(() => {
                  const isInHouse = !!booking.checked_in_at && !booking.checked_out_at;
                  
                  // Use new backend contract for incident detection
                  const incidentState = overstayStatus?.incident_state;
                  const incident = overstayStatus?.overstay;
                  const hasIncident = (incidentState === "ACTIVE");
                  const incidentStatus = incident?.status;
                  const isOverstay = overstayStatus?.is_overstay === true;
                  
                  const showExtend = hasIncident || isOverstay;
                  const showAcknowledge = hasIncident && incidentStatus === 'OPEN';
                  const isAcknowledged = incidentStatus === 'ACKED';
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
              
              {/* Acknowledge Overstay Form - Directly Below Buttons */}
              {acknowledgeForm && (
                <div className="mt-3">
                  <AcknowledgeOverstayForm
                    show={acknowledgeForm.showAcknowledgeModal}
                    bookingId={booking?.booking_id}
                    isAcknowledging={isAcknowledging}
                    onConfirm={acknowledgeForm.onConfirm}
                    onCancel={() => {
                      acknowledgeForm.setShowAcknowledgeModal(false);
                      acknowledgeForm.setAcknowledgeNote('');
                      acknowledgeForm.setDismissOverstay(false);
                    }}
                  />
                </div>
              )}
            </div>
            
            {/* Overstay Incident Panel - Backend-backed overstay data - only for checkout overstay */}
            {(overstayStatus || isLoadingOverstayStatus || booking?.checkout_overdue) && (
              <div className="mb-3">
                <div className="d-flex align-items-center justify-content-between mb-2">
                  <strong>Overstay Incident:</strong>
                  {isLoadingOverstayStatus && (
                    <Spinner animation="border" size="sm" className="text-muted" />
                  )}
                </div>
                
                {overstayStatus ? (
                  <>
                    {(() => {
                      const incidentState = overstayStatus?.incident_state;
                      const isOverstay = overstayStatus?.is_overstay === true;
                      const incident = overstayStatus?.overstay;
                      
                      if (incidentState === "ACTIVE" && incident) {
                        return (
                          <Badge 
                            bg={
                              incident.status === 'OPEN' ? 'danger' :
                              incident.status === 'ACKED' ? 'warning' :
                              incident.status === 'RESOLVED' ? 'success' :
                              'secondary'
                            }
                            className="mb-2"
                          >
                            {(() => {
                              switch (incident.status) {
                                case 'OPEN': return 'Active overstay';
                                case 'ACKED': return 'Acknowledged by staff';
                                case 'RESOLVED': return 'Resolved';
                                default: return incident.status;
                              }
                            })()}
                          </Badge>
                        );
                      } else if (incidentState === "MISSING" && isOverstay) {
                        return (
                          <Badge bg="secondary" className="mb-2">
                            Incident not created yet
                          </Badge>
                        );
                      }
                      return null;
                    })()}
                    
                    {(() => {
                      const incidentState = overstayStatus?.incident_state;
                      const incident = overstayStatus?.overstay;
                      
                      if (incidentState === "ACTIVE" && incident) {
                        return (
                          <>
                            {incident.expected_checkout_date && (
                              <div className="small text-muted mb-1">
                                <i className="bi bi-calendar-event me-1"></i>
                                Expected checkout: {format(new Date(incident.expected_checkout_date), 'MMM dd, yyyy')}
                              </div>
                            )}
                            
                            {incident.detected_at && (
                              <div className="small text-muted mb-1">
                                <i className="bi bi-clock me-1"></i>
                                Detected: {format(new Date(incident.detected_at), 'MMM dd, yyyy HH:mm')}
                              </div>
                            )}
                        
                            {/* Extensions Display */}
                            <div className="mt-2">
                              <div className="small fw-semibold text-muted mb-1">Extensions:</div>
                              {incident.extensions && incident.extensions.length > 0 ? (
                                <div className="small">
                                  {incident.extensions.map((ext, index) => (
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
                        );
                      }
                      return null;
                    })()}
                    
                    {(() => {
                      const incidentState = overstayStatus?.incident_state;
                      const isOverstay = overstayStatus?.is_overstay === true;
                      
                      if (incidentState === "MISSING" && isOverstay) {
                        return (
                          <div className="small text-info mb-1">
                            <i className="bi bi-info-circle me-1"></i>
                            Overstay detected, incident will be created by the scheduled overstay check.
                          </div>
                        );
                      }
                      return null;
                    })()}
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
                    {booking?.checkout_overdue && (
                      <div className="small text-info mb-1">
                        <i className="bi bi-info-circle me-1"></i>
                        Frontend time warnings available (guest may be overdue)
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </Card.Body>
    </Card>
  );
};

export default BookingDetailsTimeControlsSection;
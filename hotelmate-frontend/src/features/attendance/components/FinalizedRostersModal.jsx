import React, { useState, useEffect } from "react";
import { Modal, Button, Spinner, Alert, Badge } from "react-bootstrap";
import { format } from "date-fns";
import api from "@/services/api";

export default function FinalizedRostersModal({ 
  show, 
  onHide, 
  hotelSlug, 
  department,
  onSelectPeriod 
}) {
  const [finalizedPeriods, setFinalizedPeriods] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (show && hotelSlug && department) {
      fetchFinalizedPeriods();
    }
  }, [show, hotelSlug, department]);

  const fetchFinalizedPeriods = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Use the api service with correct roster-periods endpoint and finalized filter
      const response = await api.get(
        `staff/hotel/${hotelSlug}/attendance/roster-periods/?is_finalized=true`
      );
      
      setFinalizedPeriods(response.data);
    } catch (err) {
      console.error('Error fetching finalized periods:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to fetch finalized periods');
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodClick = (period) => {
    onSelectPeriod(period);
    onHide();
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  const formatDateTime = (dateTimeString) => {
    try {
      return format(new Date(dateTimeString), 'MMM dd, yyyy HH:mm');
    } catch {
      return dateTimeString;
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Finalized Rosters - {department}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading && (
          <div className="text-center py-4">
            <Spinner animation="border" />
            <div className="mt-2">Loading finalized periods...</div>
          </div>
        )}

        {error && (
          <Alert variant="danger">
            <strong>Error:</strong> {error}
          </Alert>
        )}

        {!loading && !error && finalizedPeriods.length === 0 && (
          <div className="text-center py-4 text-muted">
            No finalized rosters found for {department} department.
          </div>
        )}

        {!loading && !error && finalizedPeriods.length > 0 && (
          <div className="list-group">
            {finalizedPeriods.map((period) => (
              <div
                key={period.id}
                className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                style={{ cursor: 'pointer' }}
                onClick={() => handlePeriodClick(period)}
              >
                <div>
                  <div className="fw-bold">{period.title}</div>
                  <div className="text-muted small">
                    {formatDate(period.start_date)} - {formatDate(period.end_date)}
                  </div>
                  {period.finalized_by_name && (
                    <div className="text-muted small">
                      Finalized by <strong>{period.finalized_by_name}</strong>
                      {period.finalized_at && (
                        <span> on {formatDateTime(period.finalized_at)}</span>
                      )}
                    </div>
                  )}
                </div>
                <div>
                  <Badge bg="danger">FINALIZED</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
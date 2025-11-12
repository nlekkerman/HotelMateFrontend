import React, { useState } from 'react';
import { Modal, Button, Form, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api from '@/services/api';

export const CreatePeriodModal = ({ show, onHide, hotelSlug, onSuccess }) => {
  const [periodType, setPeriodType] = useState('MONTHLY');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Auto-calculate end date based on period type and start date
  const handleStartDateChange = (date) => {
    setStartDate(date);
    if (!date) {
      setEndDate('');
      return;
    }

    const start = new Date(date);
    let end = new Date(date);

    switch (periodType) {
      case 'WEEKLY':
        end.setDate(start.getDate() + 6);
        break;
      case 'MONTHLY':
        end.setMonth(start.getMonth() + 1);
        end.setDate(0); // Last day of the month
        break;
      case 'QUARTERLY':
        end.setMonth(start.getMonth() + 3);
        end.setDate(0);
        break;
      case 'YEARLY':
        end.setFullYear(start.getFullYear() + 1);
        end.setDate(0);
        break;
      default:
        break;
    }

    setEndDate(end.toISOString().split('T')[0]);
  };

  const handlePeriodTypeChange = (type) => {
    setPeriodType(type);
    // Recalculate end date if start date is set
    if (startDate) {
      const start = new Date(startDate);
      let end = new Date(startDate);

      switch (type) {
        case 'WEEKLY':
          end.setDate(start.getDate() + 6);
          break;
        case 'MONTHLY':
          end.setMonth(start.getMonth() + 1);
          end.setDate(0);
          break;
        case 'QUARTERLY':
          end.setMonth(start.getMonth() + 3);
          end.setDate(0);
          break;
        case 'YEARLY':
          end.setFullYear(start.getFullYear() + 1);
          end.setDate(0);
          break;
        default:
          break;
      }

      setEndDate(end.toISOString().split('T')[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!startDate || !endDate) {
      setError('Please select both start and end dates');
      return;
    }

    console.log('📅 Creating period:', {
      start_date: startDate,
      end_date: endDate,
      period_type: periodType
    });

    setLoading(true);

    try {
      const payload = {
        period_type: periodType,
        start_date: startDate,
        end_date: endDate
      };

      const response = await api.post(`/stock_tracker/${hotelSlug}/periods/`, payload);

      console.log('✅ Period created:', {
        id: response.data.id,
        period_name: response.data.period_name,
        is_closed: response.data.is_closed
      });

      toast.success(`Period "${response.data.period_name}" created successfully! 🎉`);

      // Reset form
      setPeriodType('MONTHLY');
      setStartDate('');
      setEndDate('');

      // Call success callback
      if (onSuccess) {
        onSuccess(response.data);
      }

      // Close modal
      onHide();
    } catch (err) {
      console.error('❌ Error creating period:', err);
      const errorMsg = err.response?.data?.detail || 
                      err.response?.data?.error || 
                      'Failed to create period';
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError(null);
      setPeriodType('MONTHLY');
      setStartDate('');
      setEndDate('');
      onHide();
    }
  };

  return (
    <Modal show={show} onHide={handleClose} centered>
      <Modal.Header closeButton>
        <Modal.Title>Create New Period</Modal.Title>
      </Modal.Header>

      <Form onSubmit={handleSubmit}>
        <Modal.Body>
          {error && <Alert variant="danger">{error}</Alert>}

          <Alert variant="info" className="mb-3">
            <small>
              <strong>📋 Note:</strong> A period represents a time frame for tracking stock.
              After creating a period, you'll need to create a stocktake for it.
            </small>
          </Alert>

          {/* Period Type */}
          <Form.Group className="mb-3">
            <Form.Label>
              <strong>Period Type</strong>
            </Form.Label>
            <Form.Select
              value={periodType}
              onChange={(e) => handlePeriodTypeChange(e.target.value)}
              disabled={loading}
            >
              <option value="WEEKLY">Weekly (7 days)</option>
              <option value="MONTHLY">Monthly (Most Common)</option>
              <option value="QUARTERLY">Quarterly (3 months)</option>
              <option value="YEARLY">Yearly (1 year)</option>
            </Form.Select>
            <Form.Text className="text-muted">
              Monthly periods are most commonly used for stocktakes
            </Form.Text>
          </Form.Group>

          {/* Start Date */}
          <Form.Group className="mb-3">
            <Form.Label>
              <strong>Start Date</strong>
            </Form.Label>
            <Form.Control
              type="date"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              disabled={loading}
              required
            />
          </Form.Group>

          {/* End Date */}
          <Form.Group className="mb-3">
            <Form.Label>
              <strong>End Date</strong>
            </Form.Label>
            <Form.Control
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={loading}
              required
              min={startDate}
            />
            <Form.Text className="text-muted">
              {periodType === 'MONTHLY' && 'End date auto-calculated to last day of month'}
              {periodType === 'WEEKLY' && 'End date auto-calculated to 6 days after start'}
              {periodType === 'QUARTERLY' && 'End date auto-calculated to end of quarter'}
              {periodType === 'YEARLY' && 'End date auto-calculated to end of year'}
            </Form.Text>
          </Form.Group>

          {/* Preview */}
          {startDate && endDate && (
            <Alert variant="secondary">
              <small>
                <strong>Preview:</strong> Period from{' '}
                <strong>{new Date(startDate).toLocaleDateString('en-IE')}</strong> to{' '}
                <strong>{new Date(endDate).toLocaleDateString('en-IE')}</strong>
              </small>
            </Alert>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={loading || !startDate || !endDate}>
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Creating...
              </>
            ) : (
              'Create Period'
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

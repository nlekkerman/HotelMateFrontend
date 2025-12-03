import React, { useState } from "react";
import { Modal, Button, Form, Alert, Spinner } from "react-bootstrap";
import { usePeriodManagement } from "../hooks/usePeriodManagement";
import { useRosterPeriods } from "../hooks/useRosterPeriods";

/**
 * Modal component for creating roster periods
 * Supports weekly, custom, and duplicate period creation
 */
export default function PeriodCreationModal({ 
  show, 
  onHide, 
  hotelSlug, 
  onSuccess 
}) {
  const [mode, setMode] = useState('weekly'); // weekly, custom, duplicate
  const [formData, setFormData] = useState({
    weekDate: new Date().toISOString().split('T')[0],
    title: '',
    startDate: '',
    endDate: '',
    copyFromPeriod: '',
    sourcePeriodId: '',
    newStartDate: '',
    newTitle: ''
  });
  const [validationErrors, setValidationErrors] = useState({});

  const { 
    loading, 
    error, 
    createWeeklyPeriod, 
    createCustomPeriod, 
    duplicatePeriod 
  } = usePeriodManagement(hotelSlug);

  const { periods } = useRosterPeriods(hotelSlug);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (mode === 'weekly') {
      if (!formData.weekDate) {
        errors.weekDate = 'Please select a date for the weekly period';
      }
    } else if (mode === 'custom') {
      if (!formData.title) {
        errors.title = 'Period title is required';
      }
      if (!formData.startDate) {
        errors.startDate = 'Start date is required';
      }
      if (!formData.endDate) {
        errors.endDate = 'End date is required';
      }
      if (formData.startDate && formData.endDate && formData.startDate >= formData.endDate) {
        errors.endDate = 'End date must be after start date';
      }
    } else if (mode === 'duplicate') {
      if (!formData.sourcePeriodId) {
        errors.sourcePeriodId = 'Please select a period to duplicate';
      }
      if (!formData.newStartDate) {
        errors.newStartDate = 'New start date is required';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      let result;
      
      if (mode === 'weekly') {
        result = await createWeeklyPeriod(formData.weekDate);
      } else if (mode === 'custom') {
        result = await createCustomPeriod({
          title: formData.title,
          startDate: formData.startDate,
          endDate: formData.endDate,
          copyFromPeriod: formData.copyFromPeriod ? parseInt(formData.copyFromPeriod) : null
        });
      } else if (mode === 'duplicate') {
        result = await duplicatePeriod(parseInt(formData.sourcePeriodId), {
          newStartDate: formData.newStartDate,
          newTitle: formData.newTitle || undefined
        });
      }

      if (onSuccess) {
        onSuccess(result);
      }
      
      // Reset form
      setFormData({
        weekDate: new Date().toISOString().split('T')[0],
        title: '',
        startDate: '',
        endDate: '',
        copyFromPeriod: '',
        sourcePeriodId: '',
        newStartDate: '',
        newTitle: ''
      });
      setValidationErrors({});
      
      onHide();
    } catch (err) {
      console.error('Failed to create period:', err);
    }
  };

  const handleClose = () => {
    setValidationErrors({});
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Create Roster Period</Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        {/* Mode Selection */}
        <div className="mb-4">
          <div className="btn-group w-100" role="group">
            <Button
              variant={mode === 'weekly' ? 'primary' : 'outline-primary'}
              onClick={() => setMode('weekly')}
              disabled={loading}
            >
              📅 Create Weekly Period
            </Button>
            <Button
              variant={mode === 'custom' ? 'primary' : 'outline-primary'}
              onClick={() => setMode('custom')}
              disabled={loading}
            >
              🗓️ Create Custom Period
            </Button>
            <Button
              variant={mode === 'duplicate' ? 'primary' : 'outline-primary'}
              onClick={() => setMode('duplicate')}
              disabled={loading}
            >
              📋 Duplicate Period
            </Button>
          </div>
        </div>

        <Form onSubmit={handleSubmit}>
          {/* Weekly Mode */}
          {mode === 'weekly' && (
            <Form.Group className="mb-3">
              <Form.Label>Select Date in Target Week</Form.Label>
              <Form.Control
                type="date"
                value={formData.weekDate}
                onChange={(e) => handleInputChange('weekDate', e.target.value)}
                isInvalid={!!validationErrors.weekDate}
                disabled={loading}
              />
              <Form.Control.Feedback type="invalid">
                {validationErrors.weekDate}
              </Form.Control.Feedback>
              <Form.Text className="text-muted">
                The system will automatically create a Monday-Sunday period for the week containing this date.
              </Form.Text>
            </Form.Group>
          )}

          {/* Custom Mode */}
          {mode === 'custom' && (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Period Title *</Form.Label>
                <Form.Control
                  type="text"
                  value={formData.title}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  placeholder="e.g., Holiday Period, Special Event Week"
                  isInvalid={!!validationErrors.title}
                  disabled={loading}
                />
                <Form.Control.Feedback type="invalid">
                  {validationErrors.title}
                </Form.Control.Feedback>
              </Form.Group>
              
              <div className="row">
                <div className="col-md-6">
                  <Form.Group className="mb-3">
                    <Form.Label>Start Date *</Form.Label>
                    <Form.Control
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => handleInputChange('startDate', e.target.value)}
                      isInvalid={!!validationErrors.startDate}
                      disabled={loading}
                    />
                    <Form.Control.Feedback type="invalid">
                      {validationErrors.startDate}
                    </Form.Control.Feedback>
                  </Form.Group>
                </div>
                <div className="col-md-6">
                  <Form.Group className="mb-3">
                    <Form.Label>End Date *</Form.Label>
                    <Form.Control
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => handleInputChange('endDate', e.target.value)}
                      isInvalid={!!validationErrors.endDate}
                      disabled={loading}
                    />
                    <Form.Control.Feedback type="invalid">
                      {validationErrors.endDate}
                    </Form.Control.Feedback>
                  </Form.Group>
                </div>
              </div>

              <Form.Group className="mb-3">
                <Form.Label>Copy from Existing Period (Optional)</Form.Label>
                <Form.Select
                  value={formData.copyFromPeriod}
                  onChange={(e) => handleInputChange('copyFromPeriod', e.target.value)}
                  disabled={loading}
                >
                  <option value="">Select period to copy shifts from...</option>
                  {periods.items?.map(period => (
                    <option key={period.id} value={period.id}>
                      {period.title || period.name} ({period.start_date} - {period.end_date})
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  If selected, all shifts from the chosen period will be copied to the new period.
                </Form.Text>
              </Form.Group>
            </>
          )}

          {/* Duplicate Mode */}
          {mode === 'duplicate' && (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Source Period to Duplicate *</Form.Label>
                <Form.Select
                  value={formData.sourcePeriodId}
                  onChange={(e) => handleInputChange('sourcePeriodId', e.target.value)}
                  isInvalid={!!validationErrors.sourcePeriodId}
                  disabled={loading}
                >
                  <option value="">Select period to duplicate...</option>
                  {periods.items?.map(period => (
                    <option key={period.id} value={period.id}>
                      {period.title || period.name} ({period.start_date} - {period.end_date})
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {validationErrors.sourcePeriodId}
                </Form.Control.Feedback>
              </Form.Group>

              <div className="row">
                <div className="col-md-6">
                  <Form.Group className="mb-3">
                    <Form.Label>New Start Date *</Form.Label>
                    <Form.Control
                      type="date"
                      value={formData.newStartDate}
                      onChange={(e) => handleInputChange('newStartDate', e.target.value)}
                      isInvalid={!!validationErrors.newStartDate}
                      disabled={loading}
                    />
                    <Form.Control.Feedback type="invalid">
                      {validationErrors.newStartDate}
                    </Form.Control.Feedback>
                  </Form.Group>
                </div>
                <div className="col-md-6">
                  <Form.Group className="mb-3">
                    <Form.Label>New Title (Optional)</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.newTitle}
                      onChange={(e) => handleInputChange('newTitle', e.target.value)}
                      placeholder="Leave empty to auto-generate"
                      disabled={loading}
                    />
                  </Form.Group>
                </div>
              </div>
            </>
          )}
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSubmit} 
          disabled={loading}
        >
          {loading && <Spinner size="sm" className="me-2" />}
          {mode === 'weekly' ? 'Create Weekly Period' :
           mode === 'custom' ? 'Create Custom Period' :
           'Duplicate Period'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
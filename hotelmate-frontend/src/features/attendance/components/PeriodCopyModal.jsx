import React, { useState } from "react";
import { Modal, Button, Form, Alert, Spinner } from "react-bootstrap";
import { usePeriodManagement, useAdvancedCopyOperations } from "../hooks/usePeriodManagement";
import { useRosterPeriods } from "../hooks/useRosterPeriods";
import useStaffMetadata from "@/hooks/useStaffMetadata";

/**
 * Modal component for copying roster periods with advanced options
 */
export default function PeriodCopyModal({ 
  show, 
  onHide, 
  hotelSlug, 
  onSuccess 
}) {
  const [copyMode, setCopyMode] = useState('entire'); // entire, department, advanced
  const [formData, setFormData] = useState({
    sourcePeriodId: '',
    targetStartDate: '',
    targetTitle: '',
    createNewPeriod: true,
    // Department copy options
    departmentSlug: '',
    sourceDate: '',
    targetDates: [''],
    // Advanced options
    departments: [],
    staffIds: [],
    locations: [],
    excludeWeekends: false,
    checkAvailability: true,
    resolveOverlaps: true,
    balanceWorkload: false,
    maxHoursPerStaff: '',
    autoAssignAlternatives: false
  });
  const [validationErrors, setValidationErrors] = useState({});

  const { copyEntirePeriod } = usePeriodManagement(hotelSlug);
  const { 
    loading: advancedLoading, 
    error: advancedError,
    copyDepartmentDay,
    smartCopy 
  } = useAdvancedCopyOperations(hotelSlug);
  
  const { loading: periodsLoading, error: periodsError, items: periods } = useRosterPeriods(hotelSlug);
  const { departments } = useStaffMetadata(hotelSlug);

  const loading = advancedLoading;
  const error = advancedError;

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear validation error for this field
    if (validationErrors[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleArrayChange = (field, index, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].map((item, i) => i === index ? value : item)
    }));
  };

  const addTargetDate = () => {
    setFormData(prev => ({
      ...prev,
      targetDates: [...prev.targetDates, '']
    }));
  };

  const removeTargetDate = (index) => {
    if (formData.targetDates.length > 1) {
      setFormData(prev => ({
        ...prev,
        targetDates: prev.targetDates.filter((_, i) => i !== index)
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (copyMode === 'entire') {
      if (!formData.sourcePeriodId) {
        errors.sourcePeriodId = 'Please select a source period';
      }
      if (!formData.targetStartDate) {
        errors.targetStartDate = 'Target start date is required';
      }
    } else if (copyMode === 'department') {
      if (!formData.departmentSlug) {
        errors.departmentSlug = 'Please select a department';
      }
      if (!formData.sourceDate) {
        errors.sourceDate = 'Source date is required';
      }
      if (!formData.targetDates[0]) {
        errors.targetDates = 'At least one target date is required';
      }
    } else if (copyMode === 'advanced') {
      if (!formData.sourcePeriodId) {
        errors.sourcePeriodId = 'Please select a source period';
      }
      if (!formData.targetStartDate) {
        errors.targetStartDate = 'Target start date is required';
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
      
      if (copyMode === 'entire') {
        result = await copyEntirePeriod({
          sourcePeriodId: parseInt(formData.sourcePeriodId),
          targetStartDate: formData.targetStartDate,
          targetTitle: formData.targetTitle || undefined,
          createNewPeriod: formData.createNewPeriod,
          copyOptions: {}
        });
      } else if (copyMode === 'department') {
        const validTargetDates = formData.targetDates.filter(date => date);
        result = await copyDepartmentDay({
          departmentSlug: formData.departmentSlug,
          sourceDate: formData.sourceDate,
          targetDates: validTargetDates,
          checkAvailability: formData.checkAvailability
        });
      } else if (copyMode === 'advanced') {
        // Find or create target period
        const targetPeriod = periods?.find(p => 
          p.start_date <= formData.targetStartDate && 
          p.end_date >= formData.targetStartDate
        );
        
        if (!targetPeriod) {
          throw new Error('No target period found for the selected date. Please create a period first.');
        }

        result = await smartCopy({
          sourcePeriodId: parseInt(formData.sourcePeriodId),
          targetPeriodId: targetPeriod.id,
          checkAvailability: formData.checkAvailability,
          resolveOverlaps: formData.resolveOverlaps,
          balanceWorkload: formData.balanceWorkload,
          maxHoursPerStaff: formData.maxHoursPerStaff ? parseInt(formData.maxHoursPerStaff) : undefined,
          autoAssignAlternatives: formData.autoAssignAlternatives
        });
      }

      if (onSuccess) {
        onSuccess(result);
      }
      
      // Reset form
      setFormData({
        sourcePeriodId: '',
        targetStartDate: '',
        targetTitle: '',
        createNewPeriod: true,
        departmentSlug: '',
        sourceDate: '',
        targetDates: [''],
        departments: [],
        staffIds: [],
        locations: [],
        excludeWeekends: false,
        checkAvailability: true,
        resolveOverlaps: true,
        balanceWorkload: false,
        maxHoursPerStaff: '',
        autoAssignAlternatives: false
      });
      setValidationErrors({});
      
      onHide();
    } catch (err) {
      console.error('Failed to copy period:', err);
    }
  };

  const handleClose = () => {
    setValidationErrors({});
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Copy Roster Period</Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        {error && (
          <Alert variant="danger" className="mb-3">
            {error}
          </Alert>
        )}

        {/* Copy Mode Selection */}
        <div className="mb-4">
          <div className="btn-group w-100" role="group">
            <Button
              variant={copyMode === 'entire' ? 'primary' : 'outline-primary'}
              onClick={() => setCopyMode('entire')}
              disabled={loading}
            >
              📋 Copy Entire Period
            </Button>
            <Button
              variant={copyMode === 'department' ? 'primary' : 'outline-primary'}
              onClick={() => setCopyMode('department')}
              disabled={loading}
            >
              🏢 Copy Department Day
            </Button>
            <Button
              variant={copyMode === 'advanced' ? 'primary' : 'outline-primary'}
              onClick={() => setCopyMode('advanced')}
              disabled={loading}
            >
              🎛️ Smart Copy
            </Button>
          </div>
        </div>

        <Form onSubmit={handleSubmit}>
          {/* Entire Period Copy */}
          {copyMode === 'entire' && (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Source Period *</Form.Label>
                <Form.Select
                  value={formData.sourcePeriodId}
                  onChange={(e) => handleInputChange('sourcePeriodId', e.target.value)}
                  isInvalid={!!validationErrors.sourcePeriodId}
                  disabled={loading}
                >
                  <option value="">Select target period...</option>
                  {periods?.map(period => (
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
                    <Form.Label>Target Start Date *</Form.Label>
                    <Form.Control
                      type="date"
                      value={formData.targetStartDate}
                      onChange={(e) => handleInputChange('targetStartDate', e.target.value)}
                      isInvalid={!!validationErrors.targetStartDate}
                      disabled={loading}
                    />
                    <Form.Control.Feedback type="invalid">
                      {validationErrors.targetStartDate}
                    </Form.Control.Feedback>
                  </Form.Group>
                </div>
                <div className="col-md-6">
                  <Form.Group className="mb-3">
                    <Form.Label>Target Period Title (Optional)</Form.Label>
                    <Form.Control
                      type="text"
                      value={formData.targetTitle}
                      onChange={(e) => handleInputChange('targetTitle', e.target.value)}
                      placeholder="Auto-generated if empty"
                      disabled={loading}
                    />
                  </Form.Group>
                </div>
              </div>

              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  label="Create New Period (uncheck to use existing period)"
                  checked={formData.createNewPeriod}
                  onChange={(e) => handleInputChange('createNewPeriod', e.target.checked)}
                  disabled={loading}
                />
              </Form.Group>
            </>
          )}

          {/* Department Day Copy */}
          {copyMode === 'department' && (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Department *</Form.Label>
                <Form.Select
                  value={formData.departmentSlug}
                  onChange={(e) => handleInputChange('departmentSlug', e.target.value)}
                  isInvalid={!!validationErrors.departmentSlug}
                  disabled={loading}
                >
                  <option value="">Select department...</option>
                  {departments?.map(dept => (
                    <option key={dept.slug} value={dept.slug}>
                      {dept.name}
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {validationErrors.departmentSlug}
                </Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Source Date *</Form.Label>
                <Form.Control
                  type="date"
                  value={formData.sourceDate}
                  onChange={(e) => handleInputChange('sourceDate', e.target.value)}
                  isInvalid={!!validationErrors.sourceDate}
                  disabled={loading}
                />
                <Form.Control.Feedback type="invalid">
                  {validationErrors.sourceDate}
                </Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Target Dates *</Form.Label>
                {formData.targetDates.map((date, index) => (
                  <div key={index} className="d-flex align-items-center mb-2">
                    <Form.Control
                      type="date"
                      value={date}
                      onChange={(e) => handleArrayChange('targetDates', index, e.target.value)}
                      className="me-2"
                      disabled={loading}
                    />
                    {formData.targetDates.length > 1 && (
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => removeTargetDate(index)}
                        disabled={loading}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={addTargetDate}
                  disabled={loading}
                >
                  Add Target Date
                </Button>
                {validationErrors.targetDates && (
                  <div className="invalid-feedback d-block">
                    {validationErrors.targetDates}
                  </div>
                )}
              </Form.Group>
            </>
          )}

          {/* Advanced Copy Options */}
          {copyMode === 'advanced' && (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Source Period *</Form.Label>
                <Form.Select
                  value={formData.sourcePeriodId}
                  onChange={(e) => handleInputChange('sourcePeriodId', e.target.value)}
                  isInvalid={!!validationErrors.sourcePeriodId}
                  disabled={loading}
                >
                  <option value="">Select source period...</option>
                  {periods?.map(period => (
                    <option key={period.id} value={period.id}>
                      {period.title || period.name} ({period.start_date} - {period.end_date})
                    </option>
                  ))}
                </Form.Select>
                <Form.Control.Feedback type="invalid">
                  {validationErrors.sourcePeriodId}
                </Form.Control.Feedback>
              </Form.Group>

              <Form.Group className="mb-3">
                <Form.Label>Target Start Date *</Form.Label>
                <Form.Control
                  type="date"
                  value={formData.targetStartDate}
                  onChange={(e) => handleInputChange('targetStartDate', e.target.value)}
                  isInvalid={!!validationErrors.targetStartDate}
                  disabled={loading}
                />
                <Form.Control.Feedback type="invalid">
                  {validationErrors.targetStartDate}
                </Form.Control.Feedback>
              </Form.Group>

              <div className="row">
                <div className="col-md-6">
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      label="Check Availability"
                      checked={formData.checkAvailability}
                      onChange={(e) => handleInputChange('checkAvailability', e.target.checked)}
                      disabled={loading}
                    />
                  </Form.Group>
                </div>
                <div className="col-md-6">
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      label="Resolve Overlaps"
                      checked={formData.resolveOverlaps}
                      onChange={(e) => handleInputChange('resolveOverlaps', e.target.checked)}
                      disabled={loading}
                    />
                  </Form.Group>
                </div>
              </div>

              <div className="row">
                <div className="col-md-6">
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      label="Balance Workload"
                      checked={formData.balanceWorkload}
                      onChange={(e) => handleInputChange('balanceWorkload', e.target.checked)}
                      disabled={loading}
                    />
                  </Form.Group>
                </div>
                <div className="col-md-6">
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      label="Auto-Assign Alternatives"
                      checked={formData.autoAssignAlternatives}
                      onChange={(e) => handleInputChange('autoAssignAlternatives', e.target.checked)}
                      disabled={loading}
                    />
                  </Form.Group>
                </div>
              </div>

              {formData.balanceWorkload && (
                <Form.Group className="mb-3">
                  <Form.Label>Max Hours per Staff (Optional)</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    max="60"
                    value={formData.maxHoursPerStaff}
                    onChange={(e) => handleInputChange('maxHoursPerStaff', e.target.value)}
                    placeholder="e.g., 40"
                    disabled={loading}
                  />
                  <Form.Text className="text-muted">
                    Maximum hours per staff member per week for workload balancing.
                  </Form.Text>
                </Form.Group>
              )}
            </>
          )}

          {/* Common Options */}
          {(copyMode === 'department' || copyMode === 'advanced') && (
            <div className="border-top pt-3 mt-3">
              <Form.Group className="mb-3">
                <Form.Check
                  type="checkbox"
                  label="Check Staff Availability"
                  checked={formData.checkAvailability}
                  onChange={(e) => handleInputChange('checkAvailability', e.target.checked)}
                  disabled={loading}
                />
                <Form.Text className="text-muted">
                  Verify staff are available before creating shifts to avoid conflicts.
                </Form.Text>
              </Form.Group>
            </div>
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
          {copyMode === 'entire' ? 'Copy Entire Period' :
           copyMode === 'department' ? 'Copy Department Day' :
           'Smart Copy Period'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
import React, { useState } from 'react';
import { Modal, Form, Button, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { cancellationPolicyService } from '../../services/api';

/**
 * CreateCancellationPolicyModal Component
 * 
 * Modal for creating new cancellation policies
 * Handles form validation and API calls
 */
const CreateCancellationPolicyModal = ({ 
  show, 
  onHide, 
  hotelSlug, 
  onPolicyCreated,
  themeColor = '#0d6efd'
}) => {
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    template_type: 'flexible',
    hours_before_checkin: 48,
    penalty_type: 'first_night',
    penalty_amount: '',
    description: ''
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Template type options
  const templateTypes = [
    { value: 'flexible', label: 'Flexible (Free cancellation)' },
    { value: 'moderate', label: 'Moderate (Partial penalty)' },
    { value: 'strict', label: 'Strict (Non-refundable)' },
    { value: 'custom', label: 'Custom Policy' }
  ];

  // Penalty type options
  const penaltyTypes = [
    { value: 'first_night', label: 'First Night Charge' },
    { value: 'full_amount', label: 'Full Amount' },
    { value: 'percentage', label: 'Percentage of Total' },
    { value: 'fixed_fee', label: 'Fixed Fee' }
  ];

  // Handle form field changes
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      template_type: 'flexible',
      hours_before_checkin: 48,
      penalty_type: 'first_night',
      penalty_amount: '',
      description: ''
    });
    setError('');
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validation
    if (!formData.name.trim()) {
      setError('Policy name is required');
      setLoading(false);
      return;
    }

    if (formData.template_type !== 'flexible' && !formData.penalty_amount) {
      setError('Penalty amount is required for non-flexible policies');
      setLoading(false);
      return;
    }

    try {
      // Prepare payload
      const payload = {
        name: formData.name.trim(),
        template_type: formData.template_type,
        free_until_hours: parseInt(formData.hours_before_checkin),
        penalty_type: formData.penalty_type,
        description: formData.description.trim() || null
      };

      // Add penalty amount for non-flexible policies
      if (formData.template_type !== 'flexible' && formData.penalty_amount) {
        if (formData.penalty_type === 'percentage') {
          payload.penalty_percentage = parseFloat(formData.penalty_amount);
        } else if (formData.penalty_type === 'fixed_fee') {
          payload.penalty_amount = parseFloat(formData.penalty_amount);
        }
      }

      console.log('[CreateCancellationPolicyModal] Creating policy with payload:', payload);

      // Create the policy
      const newPolicy = await cancellationPolicyService.createCancellationPolicy(hotelSlug, payload);
      
      console.log('[CreateCancellationPolicyModal] Policy created successfully:', newPolicy);
      
      // Show success message
      toast.success(`Cancellation policy "${newPolicy.name}" created successfully!`);
      
      // Notify parent and close modal
      onPolicyCreated(newPolicy);
      resetForm();
      onHide();

    } catch (error) {
      console.error('[CreateCancellationPolicyModal] Failed to create policy:', error);
      
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.error || 
                          error.message || 
                          'Failed to create cancellation policy';
      
      setError(errorMessage);
      toast.error(`Failed to create policy: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle modal close
  const handleClose = () => {
    if (!loading) {
      resetForm();
      onHide();
    }
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-plus-circle me-2" style={{ color: themeColor }}></i>
          Create Cancellation Policy
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

          <Form.Group className="mb-3">
            <Form.Label>Policy Name <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Flexible 48h, Non-Refundable"
              disabled={loading}
              required
            />
            <Form.Text className="text-muted">
              Give your policy a clear, descriptive name
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Template Type</Form.Label>
            <Form.Select
              value={formData.template_type}
              onChange={(e) => handleChange('template_type', e.target.value)}
              disabled={loading}
            >
              {templateTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Cancellation Deadline</Form.Label>
            <div className="input-group">
              <Form.Control
                type="number"
                min="0"
                value={formData.hours_before_checkin}
                onChange={(e) => handleChange('hours_before_checkin', e.target.value)}
                disabled={loading}
              />
              <span className="input-group-text">hours before check-in</span>
            </div>
            <Form.Text className="text-muted">
              Guests can cancel free of charge until this deadline
            </Form.Text>
          </Form.Group>

          {formData.template_type !== 'flexible' && (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Penalty Type</Form.Label>
                <Form.Select
                  value={formData.penalty_type}
                  onChange={(e) => handleChange('penalty_type', e.target.value)}
                  disabled={loading}
                >
                  {penaltyTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>

              {(formData.penalty_type === 'percentage' || formData.penalty_type === 'fixed_fee') && (
                <Form.Group className="mb-3">
                  <Form.Label>
                    {formData.penalty_type === 'percentage' ? 'Penalty Percentage' : 'Fixed Fee Amount'} 
                    <span className="text-danger">*</span>
                  </Form.Label>
                  <div className="input-group">
                    <Form.Control
                      type="number"
                      min="0"
                      step={formData.penalty_type === 'percentage' ? '1' : '0.01'}
                      max={formData.penalty_type === 'percentage' ? '100' : undefined}
                      value={formData.penalty_amount}
                      onChange={(e) => handleChange('penalty_amount', e.target.value)}
                      placeholder={formData.penalty_type === 'percentage' ? '25' : '50.00'}
                      disabled={loading}
                      required
                    />
                    <span className="input-group-text">
                      {formData.penalty_type === 'percentage' ? '%' : '$'}
                    </span>
                  </div>
                </Form.Group>
              )}
            </>
          )}

          <Form.Group className="mb-3">
            <Form.Label>Description (Optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Additional details about this cancellation policy..."
              disabled={loading}
            />
          </Form.Group>

          <Alert variant="info">
            <i className="bi bi-info-circle me-2"></i>
            <strong>Note:</strong> After creating this policy, you can assign it as your hotel's default 
            or use it for specific rate plans.
          </Alert>
        </Modal.Body>

        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            variant="primary"
            disabled={loading}
            style={{ backgroundColor: themeColor, borderColor: themeColor }}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Creating...
              </>
            ) : (
              <>
                <i className="bi bi-plus-circle me-2"></i>
                Create Policy
              </>
            )}
          </Button>
        </Modal.Footer>
      </Form>
    </Modal>
  );
};

export default CreateCancellationPolicyModal;
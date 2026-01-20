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
    code: '',
    template_type: 'FLEXIBLE',
    hours_before_checkin: 48,
    penalty_type: 'FIRST_NIGHT',
    penalty_amount: '',
    description: ''
  });

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Template type options
  const templateTypes = [
    { value: 'FLEXIBLE', label: 'Flexible (Free cancellation)' },
    { value: 'MODERATE', label: 'Moderate (Partial penalty)' },
    { value: 'NON_REFUNDABLE', label: 'Non-Refundable (Strict)' },
    { value: 'CUSTOM', label: 'Custom Policy' }
  ];

  // Penalty type options
  const penaltyTypes = [
    { value: 'FIRST_NIGHT', label: 'First Night Charge' },
    { value: 'FULL_STAY', label: 'Full Amount' },
    { value: 'PERCENTAGE', label: 'Percentage of Total' },
    { value: 'FIXED', label: 'Fixed Fee' },
    { value: 'NONE', label: 'No Penalty' }
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
      code: '',
      template_type: 'FLEXIBLE',
      hours_before_checkin: 48,
      penalty_type: 'FIRST_NIGHT',
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

    if (!formData.code.trim()) {
      setError('Policy code is required');
      setLoading(false);
      return;
    }

    if (formData.template_type !== 'FLEXIBLE' && formData.template_type !== 'NON_REFUNDABLE' && !formData.penalty_amount) {
      setError('Penalty amount is required for non-flexible policies');
      setLoading(false);
      return;
    }

    try {
      // Prepare payload
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        template_type: formData.template_type,
        free_until_hours: parseInt(formData.hours_before_checkin),
        penalty_type: formData.penalty_type,
        description: formData.description.trim() || null
      };

      // Add penalty amount for applicable penalty types
      if (formData.penalty_amount && (formData.penalty_type === 'PERCENTAGE' || formData.penalty_type === 'FIXED')) {
        if (formData.penalty_type === 'PERCENTAGE') {
          payload.penalty_percentage = parseFloat(formData.penalty_amount);
        } else if (formData.penalty_type === 'FIXED') {
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
            <Form.Label>Policy Code <span className="text-danger">*</span></Form.Label>
            <Form.Control
              type="text"
              value={formData.code}
              onChange={(e) => handleChange('code', e.target.value)}
              placeholder="e.g., FLEX48, MOD24, NONREF"
              disabled={loading}
              required
              maxLength={20}
            />
            <Form.Text className="text-muted">
              Short identifier for this policy (will be converted to uppercase)
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

          {formData.template_type !== 'FLEXIBLE' && (
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

              {(formData.penalty_type === 'PERCENTAGE' || formData.penalty_type === 'FIXED') && (
                <Form.Group className="mb-3">
                  <Form.Label>
                    {formData.penalty_type === 'PERCENTAGE' ? 'Penalty Percentage' : 'Fixed Fee Amount'} 
                    <span className="text-danger">*</span>
                  </Form.Label>
                  <div className="input-group">
                    <Form.Control
                      type="number"
                      min="0"
                      step={formData.penalty_type === 'PERCENTAGE' ? '1' : '0.01'}
                      max={formData.penalty_type === 'PERCENTAGE' ? '100' : undefined}
                      value={formData.penalty_amount}
                      onChange={(e) => handleChange('penalty_amount', e.target.value)}
                      placeholder={formData.penalty_type === 'PERCENTAGE' ? '25' : '50.00'}
                      disabled={loading}
                      required
                    />
                    <span className="input-group-text">
                      {formData.penalty_type === 'PERCENTAGE' ? '%' : '$'}
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
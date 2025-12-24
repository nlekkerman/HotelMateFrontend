import React, { useState, useEffect } from 'react';
import { Form, Card, Button, Table, Spinner, Alert, Badge } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useTheme } from '../../context/ThemeContext';
import { cancellationPolicyService } from '../../services/api';
import CreateCancellationPolicyModal from './CreateCancellationPolicyModal';

/**
 * CancellationPolicyControl Component
 * 
 * Manages hotel cancellation policy configuration with 3-card layout:
 * 1. Hotel Default Policy (Global)
 * 2. Rate Plan Overrides 
 * 3. Booking Detail Display (Read-only)
 */
const CancellationPolicyControl = ({ hotelSlug }) => {
  // State management
  const [policies, setPolicies] = useState([]);
  const [ratePlans, setRatePlans] = useState([]);
  const [hotelSettings, setHotelSettings] = useState({});
  const [defaultPolicyId, setDefaultPolicyId] = useState(null);

  // Loading states per section
  const [policiesLoading, setPoliciesLoading] = useState(true);
  const [ratePlansLoading, setRatePlansLoading] = useState(true);
  const [settingsLoading, setSettingsLoading] = useState(true);

  // Error states per section  
  const [policiesError, setPoliciesError] = useState(null);
  const [ratePlansError, setRatePlansError] = useState(null);
  const [settingsError, setSettingsError] = useState(null);

  // Saving states
  const [savingSettings, setSavingSettings] = useState(false);
  const [updatingRatePlans, setUpdatingRatePlans] = useState({});

  // Modal state
  const [showCreatePolicyModal, setShowCreatePolicyModal] = useState(false);

  // Theme integration
  const { mainColor } = useTheme();
  
  const getThemeColor = () => {
    const cssVar = getComputedStyle(document.documentElement)
      .getPropertyValue('--main-color').trim();
    if (cssVar) return cssVar;
    if (mainColor) return mainColor;
    return '#0d6efd';
  };

  const themeColor = getThemeColor();

  // Load data on mount
  useEffect(() => {
    console.log('[CancellationPolicyControl] useEffect triggered with hotelSlug:', hotelSlug);
    if (!hotelSlug) {
      console.log('[CancellationPolicyControl] No hotel slug provided, skipping API calls');
      return;
    }
    
    console.log('[CancellationPolicyControl] Starting API calls...');
    loadPolicies();
    loadRatePlans();
    loadHotelSettings();
  }, [hotelSlug]);

  // Load cancellation policies
  const loadPolicies = async () => {
    try {
      setPoliciesLoading(true);
      setPoliciesError(null);
      
      console.log('[CancellationPolicyControl] Loading policies for hotel:', hotelSlug);
      const data = await cancellationPolicyService.getCancellationPolicies(hotelSlug);
      console.log('[CancellationPolicyControl] Policies API response:', data);
      
      setPolicies(data.results || data || []); // Handle both paginated and direct arrays
      console.log('[CancellationPolicyControl] Policies set to state:', data.results || data || []);
      
    } catch (error) {
      console.error('Failed to load cancellation policies:', error);
      console.error('Error details:', error.response?.data);
      setPoliciesError(`Failed to load cancellation policies: ${error.response?.data?.detail || error.message}`);
    } finally {
      setPoliciesLoading(false);
    }
  };

  // Load rate plans  
  const loadRatePlans = async () => {
    try {
      setRatePlansLoading(true);
      setRatePlansError(null);
      
      console.log('[CancellationPolicyControl] Loading rate plans for hotel:', hotelSlug);
      const data = await cancellationPolicyService.getRatePlans(hotelSlug);
      console.log('[CancellationPolicyControl] Rate plans API response:', data);
      
      setRatePlans(data.results || data || []);
      console.log('[CancellationPolicyControl] Rate plans set to state:', data.results || data || []);
      
    } catch (error) {
      console.error('Failed to load rate plans:', error);
      console.error('Error details:', error.response?.data);
      setRatePlansError(`Failed to load rate plans: ${error.response?.data?.detail || error.message}`);
    } finally {
      setRatePlansLoading(false);
    }
  };

  // Load hotel settings
  const loadHotelSettings = async () => {
    try {
      setSettingsLoading(true);
      setSettingsError(null);
      
      const data = await cancellationPolicyService.getHotelSettings(hotelSlug);
      setHotelSettings(data);
      setDefaultPolicyId(data.default_cancellation_policy_id || null);
      
    } catch (error) {
      console.error('Failed to load hotel settings:', error);
      setSettingsError('Failed to load hotel settings. Please try again.');
    } finally {
      setSettingsLoading(false);
    }
  };

  // Handle hotel default policy change
  const handleDefaultPolicyChange = (policyId) => {
    const numericId = policyId === 'none' ? null : parseInt(policyId);
    setDefaultPolicyId(numericId);
  };

  // Save hotel default policy
  const handleSaveDefaultPolicy = async () => {
    try {
      setSavingSettings(true);
      
      const payload = {
        default_cancellation_policy_id: defaultPolicyId
      };
      
      console.log('[CancellationPolicyControl] Saving hotel default policy:', payload);
      
      await cancellationPolicyService.patchHotelSettings(hotelSlug, payload);
      
      setHotelSettings(prev => ({
        ...prev,
        default_cancellation_policy_id: defaultPolicyId
      }));
      
      toast.success('Hotel default cancellation policy updated successfully');
      
    } catch (error) {
      console.error('Failed to save hotel settings:', error);
      toast.error('Failed to update hotel default policy. Please try again.');
      
      // Revert on error
      setDefaultPolicyId(hotelSettings.default_cancellation_policy_id || null);
      
    } finally {
      setSavingSettings(false);
    }
  };

  // Handle policy creation from modal
  const handlePolicyCreated = (newPolicy) => {
    console.log('[CancellationPolicyControl] New policy created:', newPolicy);
    
    // Add policy to the list
    setPolicies(prev => [...prev, newPolicy]);
    
    // Automatically select the new policy as default
    setDefaultPolicyId(newPolicy.id);
    
    toast.success(`Policy "${newPolicy.name}" created and selected as default!`);
  };

  // Handle rate plan policy change
  const handleRatePlanPolicyChange = async (ratePlanId, policyId) => {
    try {
      setUpdatingRatePlans(prev => ({ ...prev, [ratePlanId]: true }));
      
      const payload = {
        cancellation_policy_id: policyId === 'inherit' ? null : parseInt(policyId)
      };
      
      await cancellationPolicyService.patchRatePlan(hotelSlug, ratePlanId, payload);
      
      // Optimistic update
      setRatePlans(prev => 
        prev.map(plan => 
          plan.id === ratePlanId 
            ? { ...plan, cancellation_policy_id: payload.cancellation_policy_id }
            : plan
        )
      );
      
      toast.success('Rate plan cancellation policy updated successfully');
      
    } catch (error) {
      console.error('Failed to update rate plan:', error);
      toast.error('Failed to update rate plan policy. Please try again.');
      
      // Reload rate plans on error to sync state
      loadRatePlans();
      
    } finally {
      setUpdatingRatePlans(prev => ({ ...prev, [ratePlanId]: false }));
    }
  };

  // Card component for consistent layout
  const PolicyCard = ({ title, icon, children, loading, error, onRetry }) => (
    <Card className="shadow-sm mb-4">
      <Card.Header style={{ backgroundColor: themeColor, color: 'white' }}>
        <h5 className="mb-0">
          <i className={`bi ${icon} me-2`}></i>
          {title}
        </h5>
      </Card.Header>
      
      {loading ? (
        <Card.Body className="text-center py-4">
          <Spinner animation="border" variant="primary" className="mb-2" />
          <p className="mb-0">Loading...</p>
        </Card.Body>
      ) : error ? (
        <Card.Body className="text-center py-4">
          <div className="text-danger mb-3">
            <i className="bi bi-exclamation-triangle" style={{ fontSize: '2rem' }}></i>
          </div>
          <p className="text-danger mb-3">{error}</p>
          {onRetry && (
            <Button variant="outline-primary" onClick={onRetry}>
              Retry
            </Button>
          )}
        </Card.Body>
      ) : (
        children
      )}
    </Card>
  );

  // Get policy name by ID
  const getPolicyName = (policyId) => {
    if (!policyId) return 'None (DEFAULT mode)';
    const policy = policies.find(p => p.id === policyId);
    return policy ? policy.name : 'Unknown Policy';
  };

  // Check if policies are blocked (needed for both cards 1 & 2)
  const arePoliciesBlocked = policiesLoading || policiesError;

  // Check if hotel settings have unsaved changes
  const hasUnsavedChanges = defaultPolicyId !== (hotelSettings.default_cancellation_policy_id || null);

  return (
    <>
      {/* Card 1: Hotel Default Policy (Global) */}
      <PolicyCard
        title="Hotel Default Policy (Global)"
        icon="bi-shield-check"
        loading={settingsLoading || policiesLoading}
        error={settingsError || policiesError}
        onRetry={() => {
          if (settingsError) loadHotelSettings();
          if (policiesError) loadPolicies();
        }}
      >
        <Card.Body>
          <p className="text-muted mb-3">
            Controls which cancellation rules apply to new bookings when rate plans don't override.
          </p>
          
          <Form.Group className="mb-3">
            <Form.Label>Default Cancellation Policy</Form.Label>
            <Form.Select
              value={defaultPolicyId || 'none'}
              onChange={(e) => handleDefaultPolicyChange(e.target.value)}
              disabled={arePoliciesBlocked}
            >
              <option value="none">None (DEFAULT mode)</option>
              {policies.map(policy => (
                <option key={policy.id} value={policy.id}>
                  {policy.name} - {policy.template_type}
                </option>
              ))}
            </Form.Select>
            <Form.Text className="text-muted">
              This setting applies to all new bookings unless overridden by rate plan policies.
            </Form.Text>
            {policiesError && (
              <div className="text-danger small mt-2">
                <i className="bi bi-exclamation-triangle me-1"></i>
                {policiesError}
              </div>
            )}
            {policies.length === 0 && !policiesLoading && !policiesError && (
              <div className="text-info small mt-2">
                <i className="bi bi-info-circle me-1"></i>
                No cancellation policies found. Create your first policy below to get started.
              </div>
            )}
          </Form.Group>

          {/* Create Policy Section */}
          <div className="d-flex align-items-center justify-content-between p-3 bg-light rounded mb-3">
            <div>
              <h6 className="mb-1">Need a new cancellation policy?</h6>
              <small className="text-muted">
                Create custom policies with specific cancellation rules and penalties
              </small>
            </div>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={() => setShowCreatePolicyModal(true)}
              disabled={!hotelSlug}
              style={{ borderColor: themeColor, color: themeColor }}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Create Policy
            </Button>
          </div>
        </Card.Body>
        
        <Card.Footer className="d-flex justify-content-between align-items-center">
          <small className="text-muted">
            {hasUnsavedChanges ? 
              <span className="text-warning">
                <i className="bi bi-exclamation-triangle me-1"></i>
                Unsaved changes
              </span> : 
              <span className="text-success">
                <i className="bi bi-check-circle me-1"></i>
                Saved
              </span>
            }
          </small>
          <Button 
            variant="primary"
            style={{ backgroundColor: themeColor, borderColor: themeColor }}
            onClick={handleSaveDefaultPolicy}
            disabled={!hasUnsavedChanges || savingSettings || arePoliciesBlocked}
          >
            {savingSettings ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Saving...
              </>
            ) : (
              <>
                <i className="bi bi-save me-2"></i>
                Save Default Policy
              </>
            )}
          </Button>
        </Card.Footer>
      </PolicyCard>

      {/* Card 2: Rate Plan Overrides */}
      <PolicyCard
        title="Rate Plan Overrides"
        icon="bi-list-task"
        loading={ratePlansLoading}
        error={ratePlansError}
        onRetry={loadRatePlans}
      >
        <Card.Body>
          <p className="text-muted mb-3">
            Override cancellation policies for specific rate plans. Rate plans without overrides inherit the hotel default.
          </p>
          
          {ratePlans.length === 0 ? (
            <Alert variant="info">
              <i className="bi bi-info-circle me-2"></i>
              No rate plans found for this hotel.
            </Alert>
          ) : (
            <div className="table-responsive">
              <Table hover>
                <thead>
                  <tr>
                    <th>Rate Plan</th>
                    <th>Code</th>
                    <th className="text-center">Active</th>
                    <th>Cancellation Policy</th>
                  </tr>
                </thead>
                <tbody>
                  {ratePlans.map(plan => (
                    <tr key={plan.id}>
                      <td>
                        <strong>{plan.name}</strong>
                        {plan.description && (
                          <div className="text-muted small">{plan.description}</div>
                        )}
                      </td>
                      <td>
                        <code>{plan.code || plan.plan_code || 'N/A'}</code>
                      </td>
                      <td className="text-center">
                        {plan.is_active ? (
                          <Badge bg="success">Active</Badge>
                        ) : (
                          <Badge bg="secondary">Inactive</Badge>
                        )}
                      </td>
                      <td>
                        <Form.Select
                          value={plan.cancellation_policy_id || 'inherit'}
                          onChange={(e) => handleRatePlanPolicyChange(plan.id, e.target.value)}
                          disabled={!plan.is_active || arePoliciesBlocked || updatingRatePlans[plan.id]}
                          size="sm"
                        >
                          <option value="inherit">Inherit hotel default</option>
                          {policies.length === 0 && !policiesLoading ? (
                            <option value="" disabled>No policies available</option>
                          ) : (
                            policies.map(policy => (
                              <option key={policy.id} value={policy.id}>
                                {policy.name}
                              </option>
                            ))
                          )}
                        </Form.Select>
                        {updatingRatePlans[plan.id] && (
                          <div className="mt-1">
                            <Spinner animation="border" size="sm" />
                          </div>
                        )}
                        {arePoliciesBlocked && (
                          <div className="text-warning small mt-1">
                            <i className="bi bi-exclamation-triangle me-1"></i>
                            Policies loading failed
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card.Body>
      </PolicyCard>

      {/* Card 3: Booking Detail (Read-only) */}
      <PolicyCard
        title="Booking Detail Display"
        icon="bi-eye"
        loading={false}
        error={null}
      >
        <Card.Body>
          <p className="text-muted mb-3">
            This is how cancellation policies appear in booking details (read-only).
          </p>
          
          <div className="border rounded p-3 bg-light">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <strong>Cancellation Policy (locked):</strong>
              <div>
                <Badge bg="info" className="me-2">
                  POLICY
                </Badge>
                <Badge bg="secondary">
                  DEFAULT
                </Badge>
              </div>
            </div>
            
            <div className="mb-2">
              <span className="text-success">
                <i className="bi bi-shield-check me-1"></i>
                Flexible – Free until 48h (First Night)
              </span>
            </div>
            
            <div>
              <span className="text-warning">
                <i className="bi bi-exclamation-triangle me-1"></i>
                Non-Refundable
              </span>
            </div>
            
            <small className="text-muted mt-2 d-block">
              Policies are locked on bookings and cannot be edited after creation.
            </small>
          </div>
        </Card.Body>
      </PolicyCard>
      
      {/* Create Cancellation Policy Modal */}
      <CreateCancellationPolicyModal
        show={showCreatePolicyModal}
        onHide={() => setShowCreatePolicyModal(false)}
        hotelSlug={hotelSlug}
        onPolicyCreated={handlePolicyCreated}
        themeColor={themeColor}
      />
    </>
  );
};

export default CancellationPolicyControl;
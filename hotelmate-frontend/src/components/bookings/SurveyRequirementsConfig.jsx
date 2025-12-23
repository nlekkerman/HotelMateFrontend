import React, { useState, useEffect, useMemo } from 'react';
import { Form, Card, Button, Table, Spinner, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

/**
 * SurveyRequirementsConfig Component
 * 
 * Manages hotel survey requirements configuration
 * Allows staff to configure which fields are enabled/required for guest surveys
 * Mirrors PrecheckinRequirementsConfig.jsx patterns exactly
 */
const SurveyRequirementsConfig = ({ hotelSlug }) => {
  // State management - Mirror pre-check-in patterns
  const [config, setConfig] = useState({ 
    enabled: {}, 
    required: {},
    send_mode: 'AUTO_DELAYED',
    delay_hours: 24
  });
  const [originalConfig, setOriginalConfig] = useState({ 
    enabled: {}, 
    required: {},
    send_mode: 'AUTO_DELAYED', 
    delay_hours: 24
  });
  const [fieldRegistry, setFieldRegistry] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Theme integration - Exact mirror of pre-check-in
  const { mainColor } = useTheme();
  
  const getThemeColor = () => {
    // Priority 1: CSS variable
    const cssVar = getComputedStyle(document.documentElement)
      .getPropertyValue('--main-color').trim();
    if (cssVar) return cssVar;
    
    // Priority 2: Theme context
    if (mainColor) return mainColor;
    
    // Priority 3: Bootstrap fallback
    return '#0d6efd';
  };

  const themeColor = getThemeColor();

  // Load configuration on mount
  useEffect(() => {
    const loadConfig = async () => {
      if (!hotelSlug) {
        setError('Hotel slug is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        const response = await api.get(`/staff/hotel/${hotelSlug}/survey-config/`);
        
        const { enabled = {}, required = {}, send_mode = 'AUTO_DELAYED', delay_hours = 24, field_registry = {} } = response.data;
        
        const configData = { enabled, required, send_mode, delay_hours };
        setConfig(configData);
        setOriginalConfig(configData);
        setFieldRegistry(field_registry);
        
        console.log('Survey config loaded:', { configData, field_registry });
        
      } catch (err) {
        console.error('Failed to load survey config:', err);
        if (err.response?.status === 404) {
          setError('Survey configuration not found for this hotel. Please contact support.');
        } else {
          setError('Failed to load survey configuration. Please try again.');
        }
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [hotelSlug]);

  // Check if configuration has changes
  useEffect(() => {
    const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);
    setIsDirty(hasChanges);
  }, [config, originalConfig]);

  // Filter and sort fields based on search and registry
  const filteredFields = useMemo(() => {
    const fields = Object.entries(fieldRegistry).filter(([fieldKey, meta]) => {
      if (!searchFilter) return true;
      const searchLower = searchFilter.toLowerCase();
      return (
        fieldKey.toLowerCase().includes(searchLower) ||
        (meta.label || '').toLowerCase().includes(searchLower) ||
        (meta.description || '').toLowerCase().includes(searchLower)
      );
    });

    // Sort by order, then label, then key (stable sorting)
    fields.sort((a, b) => {
      const [keyA, metaA] = a;
      const [keyB, metaB] = b;
      
      // Primary sort: order
      if (metaA.order && metaB.order) {
        return metaA.order - metaB.order;
      }
      
      // Secondary sort: label or key
      return (metaA.label || keyA).localeCompare(metaB.label || keyB);
    });

    return fields;
  }, [fieldRegistry, searchFilter]);

  // Handle enabled toggle
  const handleEnabledChange = (fieldKey, isEnabled) => {
    setConfig(prev => {
      const newConfig = {
        ...prev,
        enabled: { ...prev.enabled, [fieldKey]: isEnabled }
      };
      
      // If disabling, also clear required
      if (!isEnabled) {
        newConfig.required = { ...prev.required, [fieldKey]: false };
      }
      
      return newConfig;
    });
  };

  // Handle required toggle
  const handleRequiredChange = (fieldKey, isRequired) => {
    // Only allow if enabled
    if (!config.enabled[fieldKey] && isRequired) return;
    
    setConfig(prev => ({
      ...prev,
      required: { ...prev.required, [fieldKey]: isRequired }
    }));
  };

  // Handle send mode change
  const handleSendModeChange = (newSendMode) => {
    setConfig(prev => ({
      ...prev,
      send_mode: newSendMode
    }));
  };

  // Handle delay hours change
  const handleDelayHoursChange = (hours) => {
    setConfig(prev => ({
      ...prev,
      delay_hours: parseInt(hours) || 24
    }));
  };

  // Save configuration
  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Sanitize payload - ensure Required ⊆ Enabled
      const sanitizedConfig = {
        enabled: config.enabled,
        required: {},
        send_mode: config.send_mode,
        delay_hours: config.delay_hours
      };
      
      // Only include required fields that are also enabled
      Object.entries(config.required).forEach(([fieldKey, isRequired]) => {
        if (isRequired && config.enabled[fieldKey]) {
          sanitizedConfig.required[fieldKey] = true;
        }
      });
      
      await api.post(`/staff/hotel/${hotelSlug}/survey-config/`, sanitizedConfig);
      
      setOriginalConfig(config);
      setIsDirty(false);
      toast.success('Survey configuration saved successfully!');
      
    } catch (err) {
      console.error('Failed to save survey config:', err);
      toast.error('Failed to save survey configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Reset configuration
  const handleReset = () => {
    setConfig(originalConfig);
    setIsDirty(false);
    setSearchFilter('');
    toast.info('Configuration reset to last saved state.');
  };

  // Loading state
  if (loading) {
    return (
      <Card className="shadow-sm">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" style={{ color: themeColor }} />
          <p className="mt-3 text-muted">Loading survey configuration...</p>
        </Card.Body>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="shadow-sm">
        <Card.Body>
          <Alert variant="danger">
            <div className="d-flex align-items-center">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {error}
            </div>
            <Button 
              variant="outline-danger" 
              size="sm" 
              className="mt-2"
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div>
      {/* Survey Field Configuration */}
      <Card className="shadow-sm mb-4">
        <Card.Header style={{ backgroundColor: themeColor, color: 'white' }}>
          <h5 className="mb-0">Survey Field Configuration</h5>
          <small>Configure which fields guests will see in the survey form</small>
        </Card.Header>
        <Card.Body>
          {Object.keys(fieldRegistry).length === 0 ? (
            <Alert variant="warning">
              <i className="bi bi-info-circle me-2"></i>
              No survey fields are available. Contact support to add survey fields to your hotel.
            </Alert>
          ) : (
            <>
              {/* Search Box */}
              {Object.keys(fieldRegistry).length > 5 && (
                <div className="mb-3">
                  <Form.Control
                    type="text"
                    placeholder="Filter fields..."
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    size="sm"
                  />
                </div>
              )}

              {/* Field Configuration Table */}
              <div className="table-responsive">
                <Table hover className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Field</th>
                      <th>Type</th>
                      <th className="text-center">Enabled</th>
                      <th className="text-center">Required</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFields.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-4">
                          {searchFilter ? 'No fields match your search' : 'No fields available'}
                        </td>
                      </tr>
                    ) : (
                      filteredFields.map(([fieldKey, meta]) => (
                        <tr key={fieldKey}>
                          <td>
                            <div>
                              <strong>{meta.label || fieldKey}</strong>
                              {meta.description && (
                                <div className="text-muted small">{meta.description}</div>
                              )}
                            </div>
                          </td>
                          <td>
                            <span className="badge bg-secondary">{meta.type || 'text'}</span>
                          </td>
                          <td className="text-center">
                            <Form.Check
                              type="switch"
                              id={`enabled-${fieldKey}`}
                              checked={config.enabled[fieldKey] || false}
                              onChange={(e) => handleEnabledChange(fieldKey, e.target.checked)}
                            />
                          </td>
                          <td className="text-center">
                            <Form.Check
                              type="switch"
                              id={`required-${fieldKey}`}
                              checked={config.required[fieldKey] || false}
                              disabled={!config.enabled[fieldKey]}
                              onChange={(e) => handleRequiredChange(fieldKey, e.target.checked)}
                            />
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </Table>
              </div>
            </>
          )}
        </Card.Body>
      </Card>

      {/* Survey Sending Policy */}
      <Card className="shadow-sm mb-4">
        <Card.Header style={{ backgroundColor: themeColor, color: 'white' }}>
          <h5 className="mb-0">Survey Sending Policy</h5>
          <small>Configure when surveys are sent to guests</small>
        </Card.Header>
        <Card.Body>
          <Form.Group className="mb-3">
            <Form.Label>When should surveys be sent?</Form.Label>
            <div>
              <Form.Check
                type="radio"
                id="send-immediate"
                label="Send immediately after checkout"
                value="AUTO_IMMEDIATE"
                checked={config.send_mode === 'AUTO_IMMEDIATE'}
                onChange={(e) => handleSendModeChange(e.target.value)}
                className="mb-2"
              />
              <Form.Check
                type="radio"
                id="send-delayed"
                label="Send after delay"
                value="AUTO_DELAYED"
                checked={config.send_mode === 'AUTO_DELAYED'}
                onChange={(e) => handleSendModeChange(e.target.value)}
                className="mb-2"
              />
              <Form.Check
                type="radio"
                id="send-manual"
                label="Manual sending only"
                value="MANUAL_ONLY"
                checked={config.send_mode === 'MANUAL_ONLY'}
                onChange={(e) => handleSendModeChange(e.target.value)}
              />
            </div>
          </Form.Group>

          {/* Delay Hours - Only visible when AUTO_DELAYED */}
          {config.send_mode === 'AUTO_DELAYED' && (
            <Form.Group className="mb-0">
              <Form.Label>Delay (hours)</Form.Label>
              <Form.Control
                type="number"
                min="1"
                max="168"
                value={config.delay_hours}
                onChange={(e) => handleDelayHoursChange(e.target.value)}
                style={{ maxWidth: '150px' }}
              />
              <Form.Text className="text-muted">
                Survey will be sent {config.delay_hours} hour{config.delay_hours !== 1 ? 's' : ''} after checkout
              </Form.Text>
            </Form.Group>
          )}
        </Card.Body>
      </Card>

      {/* Action Buttons */}
      <div className="d-flex gap-2 justify-content-end">
        <Button 
          variant="outline-secondary" 
          onClick={handleReset}
          disabled={!isDirty || saving}
        >
          Reset
        </Button>
        <Button 
          variant="primary"
          onClick={handleSave}
          disabled={!isDirty || saving}
          style={{ backgroundColor: themeColor, borderColor: themeColor }}
        >
          {saving ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Saving...
            </>
          ) : (
            'Save Configuration'
          )}
        </Button>
      </div>

      {isDirty && (
        <div className="mt-2">
          <small className="text-warning">
            <i className="bi bi-exclamation-triangle me-1"></i>
            You have unsaved changes
          </small>
        </div>
      )}
    </div>
  );
};

export default SurveyRequirementsConfig;
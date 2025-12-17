import React, { useState, useEffect } from 'react';
import { Form, Card, Button, Table, Spinner, Alert } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

/**
 * PrecheckinRequirementsConfig Component
 * 
 * Manages hotel pre-check-in requirements configuration
 * Allows staff to configure which fields are enabled/required for guests
 */
const PrecheckinRequirementsConfig = ({ hotelSlug }) => {
  // State management
  const [config, setConfig] = useState({ enabled: {}, required: {} });
  const [originalConfig, setOriginalConfig] = useState({ enabled: {}, required: {} });
  const [fieldRegistry, setFieldRegistry] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Theme integration
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
        
        const response = await api.get(`/staff/hotel/${hotelSlug}/precheckin-config/`);
        const { enabled, required, field_registry } = response.data;
        
        setConfig({ enabled: enabled || {}, required: required || {} });
        setOriginalConfig({ enabled: enabled || {}, required: required || {} });
        setFieldRegistry(field_registry || {});
        setIsDirty(false);
      } catch (err) {
        console.error('Failed to load precheckin config:', err);
        setError('Failed to load configuration. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadConfig();
  }, [hotelSlug]);

  // Handle enabled toggle
  const handleEnabledChange = (fieldKey, isEnabled) => {
    setConfig(prev => {
      const newConfig = {
        ...prev,
        enabled: { ...prev.enabled, [fieldKey]: isEnabled }
      };
      
      // If disabling, also clear required (Hard Rule: Required ⊆ Enabled)
      if (!isEnabled) {
        newConfig.required = { ...prev.required, [fieldKey]: false };
      }
      
      return newConfig;
    });
    setIsDirty(true);
  };

  // Handle required toggle
  const handleRequiredChange = (fieldKey, isRequired) => {
    // Hard Rule: Only allow if enabled
    if (!config.enabled[fieldKey] && isRequired) return;
    
    setConfig(prev => ({
      ...prev,
      required: { ...prev.required, [fieldKey]: isRequired }
    }));
    setIsDirty(true);
  };

  // Handle save operation
  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Enforce constraint before sending (Hard Rule validation)
      const sanitizedPayload = {
        enabled: config.enabled,
        required: Object.fromEntries(
          Object.entries(config.required).filter(
            ([key, value]) => value && config.enabled[key]
          )
        )
      };
      
      await api.post(`/staff/hotel/${hotelSlug}/precheckin-config/`, sanitizedPayload);
      
      setOriginalConfig(config);
      setIsDirty(false);
      toast.success('Configuration saved successfully!');
    } catch (err) {
      console.error('Failed to save precheckin config:', err);
      toast.error('Failed to save configuration. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Handle reset operation
  const handleReset = () => {
    setConfig(originalConfig);
    setIsDirty(false);
  };

  // Handle retry on error
  const handleRetry = () => {
    window.location.reload();
  };

  // Loading state
  if (loading) {
    return (
      <Card className="shadow-sm">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" className="mb-3" />
          <p className="mb-0">Loading configuration...</p>
        </Card.Body>
      </Card>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="shadow-sm">
        <Card.Body className="text-center py-5">
          <div className="text-danger mb-3">
            <i className="bi bi-exclamation-triangle" style={{ fontSize: '2rem' }}></i>
          </div>
          <p className="text-danger mb-3">{error}</p>
          <Button variant="outline-primary" onClick={handleRetry}>
            Retry
          </Button>
        </Card.Body>
      </Card>
    );
  }

  // Field row component
  const FieldRow = ({ fieldKey, fieldInfo }) => (
    <tr key={fieldKey}>
      <td>
        <div>
          <strong>{fieldInfo.label}</strong>
          {fieldInfo.description && (
            <div className="text-muted small">{fieldInfo.description}</div>
          )}
        </div>
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
          onChange={(e) => handleRequiredChange(fieldKey, e.target.checked)}
          disabled={!config.enabled[fieldKey]}
        />
      </td>
    </tr>
  );

  return (
    <Card className="shadow-sm">
      <Card.Header style={{ borderLeft: `4px solid ${themeColor}` }}>
        <h5 className="mb-1">Pre-check-in Requirements</h5>
        <small className="text-muted">Choose what guests must provide before arrival.</small>
      </Card.Header>
      
      <Card.Body>
        {Object.keys(fieldRegistry).length === 0 ? (
          <Alert variant="info">
            <i className="bi bi-info-circle me-2"></i>
            No precheckin fields are available for configuration.
          </Alert>
        ) : (
          <div className="table-responsive">
            <Table hover>
              <thead>
                <tr>
                  <th>Field</th>
                  <th className="text-center">Enabled</th>
                  <th className="text-center">Required</th>
                </tr>
              </thead>
              <tbody>
                {/* Dynamic field rendering - Hard Rule: Never hardcode field keys */}
                {Object.entries(fieldRegistry).map(([key, fieldInfo]) => (
                  <FieldRow key={key} fieldKey={key} fieldInfo={fieldInfo} />
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card.Body>
      
      <Card.Footer className="d-flex justify-content-between">
        <Button 
          variant="outline-secondary" 
          onClick={handleReset} 
          disabled={!isDirty}
        >
          Reset
        </Button>
        <Button 
          variant="primary"
          style={{ backgroundColor: themeColor, borderColor: themeColor }}
          onClick={handleSave} 
          disabled={!isDirty || saving || Object.keys(fieldRegistry).length === 0}
        >
          {saving ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Saving...
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </Card.Footer>
    </Card>
  );
};

export default PrecheckinRequirementsConfig;
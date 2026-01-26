import React, { useState, useEffect } from 'react';
import { Form, Card, Button, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

/**
 * ApprovalCutoffConfig Component
 * 
 * Manages hotel booking approval cutoff time configuration
 * Allows staff to configure automatic approval/decline timing for pending bookings
 */
const ApprovalCutoffConfig = ({ hotelSlug }) => {
  // Configuration state
  const [config, setConfig] = useState({ 
    approval_cutoff_time: '22:00',
    approval_cutoff_day_offset: 0
  });
  const [originalConfig, setOriginalConfig] = useState({ 
    approval_cutoff_time: '22:00',
    approval_cutoff_day_offset: 0
  });

  // UI states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

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
        
        const response = await api.get(`/staff/hotel/${hotelSlug}/access-config/`);
        const configData = {
          approval_cutoff_time: response.data.approval_cutoff_time || '22:00',
          approval_cutoff_day_offset: response.data.approval_cutoff_day_offset || 0
        };
        
        setConfig(configData);
        setOriginalConfig(configData);
        setIsDirty(false);
      } catch (err) {
        console.error('Failed to load approval cutoff config:', err);
        setError('Failed to load configuration. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    
    loadConfig();
  }, [hotelSlug]);

  // Track changes for save/reset buttons
  useEffect(() => {
    const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);
    setIsDirty(hasChanges);
  }, [config, originalConfig]);

  // Handle time input change
  const handleTimeChange = (newTime) => {
    setConfig(prev => ({
      ...prev,
      approval_cutoff_time: newTime
    }));
  };

  // Handle day offset change
  const handleDayOffsetChange = (newOffset) => {
    setConfig(prev => ({
      ...prev,
      approval_cutoff_day_offset: parseInt(newOffset)
    }));
  };

  // Handle quick toggle to next day (for UX warning)
  const handleToggleToNextDay = () => {
    setConfig(prev => ({
      ...prev,
      approval_cutoff_day_offset: 1
    }));
  };

  // Check for early morning warning
  const showEarlyMorningWarning = () => {
    if (!config.approval_cutoff_time || config.approval_cutoff_day_offset !== 0) {
      return false;
    }
    
    const [hours] = config.approval_cutoff_time.split(':');
    const hourNum = parseInt(hours);
    return hourNum < 6; // Before 6 AM
  };

  // Generate current rule display
  const getCurrentRuleText = () => {
    const time = config.approval_cutoff_time || '22:00';
    const dayText = config.approval_cutoff_day_offset === 1 ? 'next day' : 'same day';
    return `Approvals allowed until ${time} (${dayText})`;
  };

  // Handle save operation
  const handleSave = async () => {
    try {
      setSaving(true);
      
      const payload = {
        approval_cutoff_time: config.approval_cutoff_time,
        approval_cutoff_day_offset: config.approval_cutoff_day_offset
      };
      
      await api.patch(`/staff/hotel/${hotelSlug}/access-config/`, payload);
      
      // Optimistic update - update local state immediately
      setOriginalConfig(config);
      setIsDirty(false);
      
      toast.success('Approval cutoff updated successfully!');
      
      // TODO: Invalidate cache for real-time updates
      // This will be handled by Pusher events when implemented
    } catch (err) {
      console.error('Failed to save approval cutoff config:', err);
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

  return (
    <Card className="shadow-sm">
      <Card.Header style={{ borderLeft: `4px solid ${themeColor}` }}>
        <h5 className="mb-1">
          <i className="bi bi-clock me-2"></i>
          Approval Policy
        </h5>
        <small className="text-muted">
          Configure when bookings can be approved, based on your hotel's local timezone.
        </small>
      </Card.Header>
      
      <Card.Body>
        <Form>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>
                  <i className="bi bi-clock me-2"></i>
                  Approval Cutoff Time
                </Form.Label>
                <Form.Control
                  type="time"
                  value={config.approval_cutoff_time}
                  onChange={(e) => handleTimeChange(e.target.value)}
                />
                <Form.Text className="text-muted">
                  Time when approval window closes
                </Form.Text>
              </Form.Group>
            </Col>
            
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>
                  <i className="bi bi-calendar me-2"></i>
                  Cutoff Day
                </Form.Label>
                <div>
                  <Form.Check
                    type="radio"
                    id="same-day"
                    name="cutoffDay"
                    label="Same day (check-in date)"
                    value={0}
                    checked={config.approval_cutoff_day_offset === 0}
                    onChange={(e) => handleDayOffsetChange(e.target.value)}
                    className="mb-2"
                  />
                  <Form.Check
                    type="radio"
                    id="next-day"
                    name="cutoffDay"
                    label="Next day (morning after check-in)"
                    value={1}
                    checked={config.approval_cutoff_day_offset === 1}
                    onChange={(e) => handleDayOffsetChange(e.target.value)}
                  />
                </div>
                <Form.Text className="text-muted">
                  When the cutoff applies relative to check-in date
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>

          {/* Early morning warning */}
          {showEarlyMorningWarning() && (
            <Alert variant="warning" className="d-flex align-items-start">
              <i className="bi bi-exclamation-triangle me-2 mt-1"></i>
              <div className="flex-grow-1">
                <strong>Early Morning Time Warning</strong>
                <p className="mb-2">
                  <strong>{config.approval_cutoff_time}</strong> same-day means {config.approval_cutoff_time} at the start of the check-in date.
                  <br />
                  Did you mean <strong>Next day</strong>?
                </p>
                <Button 
                  variant="outline-warning" 
                  size="sm"
                  onClick={handleToggleToNextDay}
                >
                  Switch to Next day
                </Button>
              </div>
            </Alert>
          )}

          {/* Current rule display */}
          <Alert variant="info" className="mb-0">
            <i className="bi bi-info-circle me-2"></i>
            <strong>Current rule:</strong> {getCurrentRuleText()}
          </Alert>
        </Form>
      </Card.Body>
      
      <Card.Footer className="d-flex justify-content-between">
        <Button 
          variant="outline-secondary" 
          onClick={handleReset} 
          disabled={!isDirty || saving}
        >
          Reset
        </Button>
        <Button 
          variant="primary"
          style={{ backgroundColor: themeColor, borderColor: themeColor }}
          onClick={handleSave} 
          disabled={!isDirty || saving}
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
      </Card.Footer>
    </Card>
  );
};

export default ApprovalCutoffConfig;
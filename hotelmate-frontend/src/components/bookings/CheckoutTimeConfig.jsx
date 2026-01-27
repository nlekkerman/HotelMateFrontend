import React, { useState, useEffect } from 'react';
import { Form, Card, Button, Spinner, Alert, Row, Col } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { useHotelRealtime } from '../../hooks/useHotelRealtime';

/**
 * CheckoutTimeConfig Component
 * 
 * Manages hotel checkout time configuration
 * Allows staff to configure checkout time and grace period for guests
 */
const CheckoutTimeConfig = ({ hotelSlug }) => {
  // Configuration state
  const [config, setConfig] = useState({ 
    standard_checkout_time: '11:00',
    late_checkout_grace_minutes: 30
  });
  const [originalConfig, setOriginalConfig] = useState({ 
    standard_checkout_time: '11:00',
    late_checkout_grace_minutes: 30
  });

  // UI states
  const [saving, setSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Theme integration
  const { mainColor } = useTheme();
  const queryClient = useQueryClient();
  
  const getThemeColor = () => {
    const cssVar = getComputedStyle(document.documentElement)
      .getPropertyValue('--main-color').trim();
    if (cssVar) return cssVar;
    if (mainColor) return mainColor;
    return '#0d6efd';
  };

  const themeColor = getThemeColor();

  // Handle realtime hotel config updates
  const handleConfigUpdate = (data) => {
    // Check if this is an access-config update that affects our settings
    if (data && (data.standard_checkout_time !== undefined || data.late_checkout_grace_minutes !== undefined)) {
      console.log('[CheckoutTimeConfig] Received realtime config update:', data);
      
      // Invalidate queries to trigger refetch
      queryClient.invalidateQueries({ 
        queryKey: ['staff-access-config', hotelSlug] 
      });
      
      toast.info('Checkout configuration updated by another staff member');
    }
  };

  // Subscribe to realtime hotel events for access-config updates
  useHotelRealtime(hotelSlug, handleConfigUpdate, null, null);

  // TanStack Query for fetching configuration
  const { data: configData, isLoading: loading, error, refetch } = useQuery({
    queryKey: ['staff-access-config', hotelSlug],
    queryFn: async () => {
      if (!hotelSlug) {
        throw new Error('Hotel slug is required');
      }
      const response = await api.get(`/staff/hotel/${hotelSlug}/access-config/`);
      return response.data;
    },
    enabled: !!hotelSlug,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  // Update local state when data is fetched
  useEffect(() => {
    if (configData) {
      const newConfig = {
        standard_checkout_time: configData.standard_checkout_time || '11:00',
        late_checkout_grace_minutes: configData.late_checkout_grace_minutes || 30
      };
      setConfig(newConfig);
      setOriginalConfig(newConfig);
      setIsDirty(false);
    }
  }, [configData]);

  // Track changes for save/reset buttons
  useEffect(() => {
    const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);
    setIsDirty(hasChanges);
  }, [config, originalConfig]);

  // Mutation for updating configuration
  const updateConfigMutation = useMutation({
    mutationFn: async (newConfig) => {
      const payload = {
        standard_checkout_time: newConfig.standard_checkout_time,
        late_checkout_grace_minutes: newConfig.late_checkout_grace_minutes
      };
      await api.patch(`/staff/hotel/${hotelSlug}/access-config/`, payload);
      return payload;
    },
    onSuccess: (updatedConfig) => {
      // Optimistic update - update local state immediately
      setOriginalConfig(config);
      setIsDirty(false);
      
      toast.success('Checkout time configuration updated successfully!');
      
      // Invalidate cache to trigger refetch (for realtime updates to other instances)
      queryClient.invalidateQueries({ queryKey: ['staff-access-config', hotelSlug] });
    },
    onError: (err) => {
      console.error('Failed to save checkout time config:', err);
      toast.error('Failed to save configuration. Please try again.');
    }
  });

  // Handle time input change
  const handleTimeChange = (newTime) => {
    setConfig(prev => ({
      ...prev,
      standard_checkout_time: newTime
    }));
  };

  // Handle grace minutes change
  const handleGraceMinutesChange = (newGraceMinutes) => {
    const value = parseInt(newGraceMinutes) || 0;
    setConfig(prev => ({
      ...prev,
      late_checkout_grace_minutes: Math.max(0, Math.min(720, value)) // 0-720 minutes (12 hours max)
    }));
  };

  // Check for early morning warning
  const showEarlyMorningWarning = () => {
    if (!config.standard_checkout_time) return false;
    
    const [hours] = config.standard_checkout_time.split(':');
    const hourNum = parseInt(hours);
    return hourNum < 6; // Before 6 AM
  };

  // Generate current rule display
  const getCurrentRuleText = () => {
    const time = config.standard_checkout_time || '11:00';
    const grace = config.late_checkout_grace_minutes || 0;
    return `Checkout at ${time} (+${grace} min grace)`;
  };

  // Handle save operation
  const handleSave = async () => {
    // Client-side validation
    if (!config.standard_checkout_time) {
      toast.error('Checkout time is required');
      return;
    }

    if (config.late_checkout_grace_minutes < 0 || config.late_checkout_grace_minutes > 720) {
      toast.error('Grace minutes must be between 0 and 720');
      return;
    }

    setSaving(true);
    try {
      await updateConfigMutation.mutateAsync(config);
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
    refetch();
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
          <p className="text-danger mb-3">{error.message}</p>
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
          Checkout Time Configuration
        </h5>
        <small className="text-muted">
          Configure checkout time and grace period for your hotel's local timezone.
        </small>
      </Card.Header>
      
      <Card.Body>
        <Form>
          <Row>
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>
                  <i className="bi bi-clock me-2"></i>
                  Standard Checkout Time
                </Form.Label>
                <Form.Control
                  type="time"
                  value={config.standard_checkout_time}
                  onChange={(e) => handleTimeChange(e.target.value)}
                />
                <Form.Text className="text-muted">
                  Time when guests are expected to checkout
                </Form.Text>
              </Form.Group>
            </Col>
            
            <Col md={6}>
              <Form.Group className="mb-3">
                <Form.Label>
                  <i className="bi bi-hourglass-split me-2"></i>
                  Late Checkout Grace Period
                </Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  max="720"
                  step="5"
                  value={config.late_checkout_grace_minutes}
                  onChange={(e) => handleGraceMinutesChange(e.target.value)}
                />
                <Form.Text className="text-muted">
                  Grace period in minutes (0-720)
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
                <p className="mb-0">
                  <strong>{config.standard_checkout_time}</strong> applies to the start of the checkout date.
                  <br />
                  Early-morning checkout times apply to the start of the checkout date.
                </p>
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

export default CheckoutTimeConfig;
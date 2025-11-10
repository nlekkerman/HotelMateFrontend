// src/components/stock_tracker/analytics/AnalyticsSettingsModal.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import { FaSave, FaUndo } from 'react-icons/fa';

const STORAGE_KEY = 'analytics_dashboard_settings';

const DEFAULT_SETTINGS = {
  autoRefresh: true,
  refreshInterval: 5, // minutes
  chartHeight: 400,
  showKPICards: true,
  defaultChartType: 'bar',
  decimalPlaces: 2,
  compactView: false,
  animateCharts: true,
  showGridLines: true,
  colorScheme: 'default'
};

export default function AnalyticsSettingsModal({ show, onHide, onSettingsSaved }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem(STORAGE_KEY);
    if (savedSettings) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      } catch (error) {
        console.error('Error loading settings:', error);
      }
    }
  }, []);

  // Handle setting change
  const handleChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Save settings
  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setHasChanges(false);
    onSettingsSaved?.(settings);
    onHide();
  };

  // Reset to defaults
  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setHasChanges(true);
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton className="main-bg text-white">
        <Modal.Title>Analytics Dashboard Settings</Modal.Title>
      </Modal.Header>
      
      <Modal.Body>
        <Alert variant="info" className="mb-4">
          Customize your analytics dashboard experience. Settings are saved locally in your browser.
        </Alert>

        <Form>
          {/* Auto-Refresh Settings */}
          <div className="mb-4">
            <h6 className="fw-bold text-secondary mb-3">🔄 Auto-Refresh Settings</h6>
            <Row>
              <Col md={6}>
                <Form.Check
                  type="switch"
                  id="autoRefresh"
                  label="Enable Auto-Refresh"
                  checked={settings.autoRefresh}
                  onChange={(e) => handleChange('autoRefresh', e.target.checked)}
                  className="mb-3"
                />
              </Col>
              <Col md={6}>
                <Form.Group>
                  <Form.Label>Refresh Interval (minutes)</Form.Label>
                  <Form.Select
                    value={settings.refreshInterval}
                    onChange={(e) => handleChange('refreshInterval', parseInt(e.target.value))}
                    disabled={!settings.autoRefresh}
                  >
                    <option value="1">1 minute</option>
                    <option value="2">2 minutes</option>
                    <option value="5">5 minutes</option>
                    <option value="10">10 minutes</option>
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </div>

          <hr />

          {/* Chart Display Settings */}
          <div className="mb-4">
            <h6 className="fw-bold text-secondary mb-3">📊 Chart Display Settings</h6>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Default Chart Height (px)</Form.Label>
                  <Form.Select
                    value={settings.chartHeight}
                    onChange={(e) => handleChange('chartHeight', parseInt(e.target.value))}
                  >
                    <option value="300">Small (300px)</option>
                    <option value="400">Medium (400px)</option>
                    <option value="500">Large (500px)</option>
                    <option value="600">Extra Large (600px)</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Default Chart Type</Form.Label>
                  <Form.Select
                    value={settings.defaultChartType}
                    onChange={(e) => handleChange('defaultChartType', e.target.value)}
                  >
                    <option value="bar">Bar Chart</option>
                    <option value="line">Line Chart</option>
                    <option value="pie">Pie Chart</option>
                    <option value="area">Area Chart</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            <Row>
              <Col md={6}>
                <Form.Check
                  type="switch"
                  id="animateCharts"
                  label="Enable Chart Animations"
                  checked={settings.animateCharts}
                  onChange={(e) => handleChange('animateCharts', e.target.checked)}
                  className="mb-2"
                />
              </Col>
              <Col md={6}>
                <Form.Check
                  type="switch"
                  id="showGridLines"
                  label="Show Grid Lines"
                  checked={settings.showGridLines}
                  onChange={(e) => handleChange('showGridLines', e.target.checked)}
                  className="mb-2"
                />
              </Col>
            </Row>
          </div>

          <hr />

          {/* Data Display Settings */}
          <div className="mb-4">
            <h6 className="fw-bold text-secondary mb-3">🔢 Data Display Settings</h6>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Decimal Places</Form.Label>
                  <Form.Select
                    value={settings.decimalPlaces}
                    onChange={(e) => handleChange('decimalPlaces', parseInt(e.target.value))}
                  >
                    <option value="0">0 (Whole numbers)</option>
                    <option value="1">1 decimal place</option>
                    <option value="2">2 decimal places</option>
                    <option value="3">3 decimal places</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Color Scheme</Form.Label>
                  <Form.Select
                    value={settings.colorScheme}
                    onChange={(e) => handleChange('colorScheme', e.target.value)}
                  >
                    <option value="default">Default</option>
                    <option value="vibrant">Vibrant</option>
                    <option value="pastel">Pastel</option>
                    <option value="monochrome">Monochrome</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
          </div>

          <hr />

          {/* Layout Settings */}
          <div className="mb-4">
            <h6 className="fw-bold text-secondary mb-3">📐 Layout Settings</h6>
            <Row>
              <Col md={6}>
                <Form.Check
                  type="switch"
                  id="showKPICards"
                  label="Show KPI Summary Cards"
                  checked={settings.showKPICards}
                  onChange={(e) => handleChange('showKPICards', e.target.checked)}
                  className="mb-2"
                />
              </Col>
              <Col md={6}>
                <Form.Check
                  type="switch"
                  id="compactView"
                  label="Compact View Mode"
                  checked={settings.compactView}
                  onChange={(e) => handleChange('compactView', e.target.checked)}
                  className="mb-2"
                />
              </Col>
            </Row>
          </div>

          {hasChanges && (
            <Alert variant="warning" className="mt-3">
              <small>⚠️ You have unsaved changes. Click "Save Settings" to apply them.</small>
            </Alert>
          )}
        </Form>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="outline-secondary" onClick={handleReset}>
          <FaUndo className="me-2" />
          Reset to Defaults
        </Button>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleSave}
          className="main-bg border-0"
          disabled={!hasChanges}
        >
          <FaSave className="me-2" />
          Save Settings
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

// Export function to get current settings
export const getAnalyticsSettings = () => {
  const savedSettings = localStorage.getItem(STORAGE_KEY);
  if (savedSettings) {
    try {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
    } catch (error) {
      console.error('Error loading settings:', error);
      return DEFAULT_SETTINGS;
    }
  }
  return DEFAULT_SETTINGS;
};

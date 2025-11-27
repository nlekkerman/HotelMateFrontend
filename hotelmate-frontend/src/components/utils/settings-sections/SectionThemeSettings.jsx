// src/components/utils/settings-sections/SectionThemeSettings.jsx
import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Row, Col, Alert, Spinner } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { previewColor } from '@/utils/applyTheme';

export default function SectionThemeSettings() {
  const { hotelSlug } = useParams();
  const { 
    settings, 
    themeLoading, 
    updateTheme,
    mainColor,
    secondaryColor,
    backgroundColor,
    textColor,
    borderColor,
    buttonColor,
    buttonTextColor,
    buttonHoverColor,
    linkColor,
    linkHoverColor,
    refetchTheme
  } = useTheme();
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    main_color: mainColor,
    secondary_color: secondaryColor,
    background_color: backgroundColor,
    text_color: textColor,
    border_color: borderColor,
    button_color: buttonColor,
    button_text_color: buttonTextColor,
    button_hover_color: buttonHoverColor,
    link_color: linkColor,
    link_hover_color: linkHoverColor
  });

  // Update form when theme context loads
  useEffect(() => {
    if (settings) {
      setFormData({
        main_color: mainColor,
        secondary_color: secondaryColor,
        background_color: backgroundColor,
        text_color: textColor,
        border_color: borderColor,
        button_color: buttonColor,
        button_text_color: buttonTextColor,
        button_hover_color: buttonHoverColor,
        link_color: linkColor,
        link_hover_color: linkHoverColor
      });
    }
  }, [settings, mainColor, secondaryColor, backgroundColor, textColor, borderColor, buttonColor, buttonTextColor, buttonHoverColor, linkColor, linkHoverColor]);

  const handleColorChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Preview color in real-time
    const colorType = field.replace('_color', '').replace('_', '-');
    previewColor(colorType, value);
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await updateTheme(formData);
      await refetchTheme();
      setSuccess(true);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save theme settings');
      // Revert to saved settings on error
      handleReset();
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setFormData({
      main_color: mainColor,
      secondary_color: secondaryColor,
      background_color: backgroundColor,
      text_color: textColor,
      border_color: borderColor,
      button_color: buttonColor,
      button_text_color: buttonTextColor,
      button_hover_color: buttonHoverColor,
      link_color: linkColor,
      link_hover_color: linkHoverColor
    });
    // Refetch to ensure we're in sync
    refetchTheme();
  };

  const colorFields = [
    { key: 'main_color', label: 'Primary Color', description: 'Main brand color' },
    { key: 'secondary_color', label: 'Secondary Color', description: 'Accent color' },
    { key: 'background_color', label: 'Background Color', description: 'Main background' },
    { key: 'text_color', label: 'Text Color', description: 'Default text color' },
    { key: 'border_color', label: 'Border Color', description: 'Default border color' },
    { key: 'button_color', label: 'Button Color', description: 'Button background' },
    { key: 'button_text_color', label: 'Button Text Color', description: 'Text on buttons' },
    { key: 'button_hover_color', label: 'Button Hover Color', description: 'Button hover state' },
    { key: 'link_color', label: 'Link Color', description: 'Default link color' },
    { key: 'link_hover_color', label: 'Link Hover Color', description: 'Link hover state' }
  ];

  if (themeLoading) {
    return (
      <Card className="shadow-sm mb-4">
        <Card.Body className="p-4 text-center">
          <Spinner animation="border" role="status" className="me-2" />
          <span>Loading theme settings...</span>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm mb-4">
      <Card.Body className="p-4">
        <h4 className="mb-1">
          <i className="bi bi-palette-fill me-2"></i>
          Theme Settings
        </h4>
        <p className="text-muted mb-3">
          Customize your hotel's brand colors and appearance
        </p>
        
        <hr className="my-3" />

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            <i className="bi bi-exclamation-triangle me-2"></i>
            {error}
          </Alert>
        )}

        {success && (
          <Alert variant="success" dismissible onClose={() => setSuccess(false)}>
            <i className="bi bi-check-circle me-2"></i>
            Theme settings saved successfully!
          </Alert>
        )}

        <Row className="g-3">
          {colorFields.map(field => (
            <Col md={6} key={field.key}>
              <Form.Group>
                <Form.Label className="fw-bold small">
                  {field.label}
                  <span className="text-muted fw-normal ms-2">({field.description})</span>
                </Form.Label>
                <div className="d-flex gap-2 align-items-center">
                  <Form.Control
                    type="color"
                    value={formData[field.key]}
                    onChange={(e) => handleColorChange(field.key, e.target.value)}
                    style={{ width: '60px', height: '38px' }}
                  />
                  <Form.Control
                    type="text"
                    value={formData[field.key]}
                    onChange={(e) => handleColorChange(field.key, e.target.value)}
                    placeholder="#000000"
                    className="font-monospace"
                  />
                </div>
              </Form.Group>
            </Col>
          ))}
        </Row>

        {/* Preview Section */}
        <div className="mt-4 p-3 bg-light rounded">
          <h6 className="mb-3">Preview</h6>
          <div className="d-flex gap-2 flex-wrap">
            <Button 
              style={{
                backgroundColor: formData.button_color,
                color: formData.button_text_color,
                borderColor: formData.button_color
              }}
            >
              Sample Button
            </Button>
            <a 
              href="#" 
              style={{ color: formData.link_color }}
              onClick={(e) => e.preventDefault()}
            >
              Sample Link
            </a>
            <div 
              className="px-3 py-2 rounded"
              style={{
                backgroundColor: formData.background_color,
                color: formData.text_color,
                border: `1px solid ${formData.border_color}`
              }}
            >
              Sample Text
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="d-flex gap-2 mt-4">
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Saving...
              </>
            ) : (
              <>
                <i className="bi bi-save me-2"></i>
                Save Theme
              </>
            )}
          </Button>
          <Button
            variant="outline-secondary"
            onClick={handleReset}
            disabled={saving}
          >
            <i className="bi bi-arrow-counterclockwise me-2"></i>
            Reset
          </Button>
        </div>

        <Alert variant="info" className="mt-4 mb-0">
          <small>
            <i className="bi bi-info-circle me-1"></i>
            <strong>Note:</strong> Changes are previewed in real-time. Click "Save Theme" to apply them permanently.
          </small>
        </Alert>
      </Card.Body>
    </Card>
  );
}

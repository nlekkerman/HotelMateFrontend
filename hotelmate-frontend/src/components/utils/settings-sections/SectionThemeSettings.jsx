// src/components/utils/settings-sections/SectionThemeSettings.jsx
import React, { useState, useEffect } from 'react';
import { Card, Button, Form, Row, Col, Alert, Spinner, Badge, ButtonGroup } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import { useTheme } from '@/context/ThemeContext';
import { previewColor } from '@/utils/applyTheme';
import '../../../styles/theme-settings.css';

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
  const [hasChanges, setHasChanges] = useState(false);
  
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

  // Theme presets
  const themePresets = {
    light: {
      name: "Light",
      icon: "☀️",
      main_color: "#3498db",
      secondary_color: "#2ecc71",
      background_color: "#ffffff",
      text_color: "#333333",
      border_color: "#e1e5e9",
      button_color: "#3498db",
      button_text_color: "#ffffff",
      button_hover_color: "#2980b9",
      link_color: "#3498db",
      link_hover_color: "#2980b9"
    },
    dark: {
      name: "Dark",
      icon: "🌙",
      main_color: "#4dabf7",
      secondary_color: "#51cf66",
      background_color: "#1a1d29",
      text_color: "#e9ecef",
      border_color: "#343a46",
      button_color: "#4dabf7",
      button_text_color: "#ffffff",
      button_hover_color: "#339af0",
      link_color: "#4dabf7",
      link_hover_color: "#339af0"
    },
    classic: {
      name: "Hotel Classic",
      icon: "🏨",
      main_color: "#8b4513",
      secondary_color: "#cd853f",
      background_color: "#faf7f2",
      text_color: "#2c1810",
      border_color: "#d4c5a9",
      button_color: "#8b4513",
      button_text_color: "#ffffff",
      button_hover_color: "#6b3410",
      link_color: "#8b4513",
      link_hover_color: "#6b3410"
    },
    modern: {
      name: "Modern Blue",
      icon: "💎",
      main_color: "#4c6ef5",
      secondary_color: "#7c3aed",
      background_color: "#f8fafc",
      text_color: "#334155",
      border_color: "#cbd5e1",
      button_color: "#4c6ef5",
      button_text_color: "#ffffff",
      button_hover_color: "#364fc7",
      link_color: "#4c6ef5",
      link_hover_color: "#364fc7"
    },
    luxury: {
      name: "Luxury Black & Gold",
      icon: "👑",
      main_color: "#ffd700",
      secondary_color: "#ffed4e",
      background_color: "#0f0f0f",
      text_color: "#f5f5f5",
      border_color: "#2a2a2a",
      button_color: "#ffd700",
      button_text_color: "#000000",
      button_hover_color: "#e6c200",
      link_color: "#ffd700",
      link_hover_color: "#e6c200"
    }
  };

  // Update form when theme context loads
  useEffect(() => {
    if (settings) {
      const newFormData = {
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
      };
      setFormData(newFormData);
      setHasChanges(false);
    }
  }, [settings, mainColor, secondaryColor, backgroundColor, textColor, borderColor, buttonColor, buttonTextColor, buttonHoverColor, linkColor, linkHoverColor]);

  // Check for changes
  useEffect(() => {
    if (!settings) return;
    
    const hasChanges = Object.keys(formData).some(key => 
      formData[key] !== (settings[key] || '#000000')
    );
    setHasChanges(hasChanges);
  }, [formData, settings]);

  const handleColorChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Preview color in real-time
    const colorType = field.replace('_color', '').replace('_', '-');
    previewColor(colorType, value);
  };

  const applyPreset = (presetKey) => {
    const preset = themePresets[presetKey];
    if (!preset) return;
    
    const presetData = {
      main_color: preset.main_color,
      secondary_color: preset.secondary_color,
      background_color: preset.background_color,
      text_color: preset.text_color,
      border_color: preset.border_color,
      button_color: preset.button_color,
      button_text_color: preset.button_text_color,
      button_hover_color: preset.button_hover_color,
      link_color: preset.link_color,
      link_hover_color: preset.link_hover_color
    };

    setFormData(presetData);
    
    // Preview all colors
    Object.keys(presetData).forEach(key => {
      const colorType = key.replace('_color', '').replace('_', '-');
      previewColor(colorType, presetData[key]);
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await updateTheme(formData);
      await refetchTheme();
      setSuccess(true);
      setHasChanges(false);

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
    const resetData = {
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
    };
    
    setFormData(resetData);
    
    // Preview all colors
    Object.keys(resetData).forEach(key => {
      const colorType = key.replace('_color', '').replace('_', '-');
      previewColor(colorType, resetData[key]);
    });
    
    // Refetch to ensure we're in sync
    refetchTheme();
  };

  // Smart Color Control Component
  const ColorControl = ({ field, label, helperText, value, onChange }) => (
    <Form.Group className="mb-3">
      <Form.Label className="fw-semibold text-dark small mb-2">
        {label}
        {helperText && <div className="text-muted fw-normal small">{helperText}</div>}
      </Form.Label>
      <div className="d-flex gap-2 align-items-center">
        <div 
          className="position-relative border rounded color-picker-wrapper"
          style={{ 
            width: '50px', 
            height: '38px',
            overflow: 'hidden'
          }}
        >
          <Form.Control
            type="color"
            value={value}
            onChange={(e) => onChange(field, e.target.value)}
            className="position-absolute w-100 h-100 border-0"
            style={{ 
              transform: 'scale(1.2)',
              cursor: 'pointer'
            }}
          />
        </div>
        <Form.Control
          type="text"
          value={value}
          onChange={(e) => onChange(field, e.target.value)}
          placeholder="#000000"
          className="font-monospace small"
        />
      </div>
    </Form.Group>
  );

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
    <div className="theme-settings">
      {/* Header */}
      <Card className="shadow-sm mb-4 border-0">
        <Card.Body className="p-4">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <h3 className="mb-2 fw-bold">
                <i className="bi bi-palette-fill me-2 text-primary"></i>
                Brand & Appearance
              </h3>
              <p className="text-muted mb-0">
                Customize how your hotel looks and feels to guests and staff
              </p>
            </div>
            <Badge bg="light" text="dark" className="px-3 py-2">
              <i className="bi bi-eye me-1"></i>
              Preview updates instantly
            </Badge>
          </div>
        </Card.Body>
      </Card>

      {/* Alerts */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-4">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(false)} className="mb-4">
          <i className="bi bi-check-circle me-2"></i>
          Theme settings saved successfully!
        </Alert>
      )}

      {/* Theme Presets */}
      <Card className="shadow-sm mb-4 border-0">
        <Card.Body className="p-4">
          <div className="d-flex align-items-center gap-2 mb-3">
            <i className="bi bi-magic text-primary"></i>
            <h5 className="mb-0 fw-semibold">Theme Presets</h5>
            <Badge bg="primary" className="ms-2">Quick Start</Badge>
          </div>
          <p className="text-muted mb-3 small">
            Choose a preset to get started quickly, then customize any colors below
          </p>
          
          <hr className="subtle-divider" />
          <Row className="g-2">
            {Object.entries(themePresets).map(([key, preset]) => (
              <Col xs={6} md={4} lg={2} key={key}>
                <Button
                  variant="outline-light"
                  className={`w-100 p-3 border border-2 rounded-3 position-relative preset-button ${
                    formData.main_color === preset.main_color ? 'active' : ''
                  }`}
                  style={{ 
                    borderColor: formData.main_color === preset.main_color ? preset.main_color : '#dee2e6',
                    backgroundColor: formData.main_color === preset.main_color ? `${preset.main_color}10` : 'white'
                  }}
                  onClick={() => applyPreset(key)}
                >
                  <div className="text-center">
                    <div className="fs-4 mb-2">{preset.icon}</div>
                    <div className="small fw-semibold text-dark">{preset.name}</div>
                    <div className="d-flex justify-content-center gap-1 mt-2">
                      <div 
                        className="rounded-circle border"
                        style={{ width: '12px', height: '12px', backgroundColor: preset.main_color }}
                      ></div>
                      <div 
                        className="rounded-circle border"
                        style={{ width: '12px', height: '12px', backgroundColor: preset.secondary_color }}
                      ></div>
                      <div 
                        className="rounded-circle border"
                        style={{ width: '12px', height: '12px', backgroundColor: preset.button_color }}
                      ></div>
                    </div>
                  </div>
                  {formData.main_color === preset.main_color && (
                    <i 
                      className="bi bi-check-circle-fill position-absolute top-0 end-0 text-success"
                      style={{ transform: 'translate(25%, -25%)' }}
                    ></i>
                  )}
                </Button>
              </Col>
            ))}
          </Row>
        </Card.Body>
      </Card>

      <Row className="g-3 mb-4">
        {/* Brand Colors Card */}
        <Col className="col-4">
          <Card className="shadow-sm h-100 border-0">
            <Card.Body className="p-3">
              <div className="d-flex align-items-center gap-2 mb-3">
                <h6 className="mb-0 fw-semibold">🟦 Brand Colors</h6>
              </div>
              <p className="text-muted mb-3 small">
                This is how the hotel looks to humans.
              </p>
              
              <ColorControl
                field="main_color"
                label="Primary Color"
                helperText="Main brand color"
                value={formData.main_color}
                onChange={handleColorChange}
              />
              
              <ColorControl
                field="secondary_color"
                label="Secondary (Accent)"
                helperText="Highlights & accents"
                value={formData.secondary_color}
                onChange={handleColorChange}
              />
              
              <ColorControl
                field="link_color"
                label="Link / Link Hover"
                helperText="Link colors"
                value={formData.link_color}
                onChange={handleColorChange}
              />
            </Card.Body>
          </Card>
        </Col>

        {/* UI Surface Card */}
        <Col className="col-4">
          <Card className="shadow-sm h-100 border-0">
            <Card.Body className="p-3">
              <div className="d-flex align-items-center gap-2 mb-3">
                <h6 className="mb-0 fw-semibold">🟪 UI Surface</h6>
              </div>
              <p className="text-muted mb-3 small">
                This is how the app feels.
              </p>
              
              <ColorControl
                field="background_color"
                label="Background Color"
                helperText="Main surface color"
                value={formData.background_color}
                onChange={handleColorChange}
              />
              
              <ColorControl
                field="text_color"
                label="Text Color"
                helperText="Default text color"
                value={formData.text_color}
                onChange={handleColorChange}
              />
              
              <ColorControl
                field="border_color"
                label="Border Color"
                helperText="Lines & separators"
                value={formData.border_color}
                onChange={handleColorChange}
              />
            </Card.Body>
          </Card>
        </Col>

        {/* Buttons & Actions Card */}
        <Col className="col-4">
          <Card className="shadow-sm h-100 border-0 position-relative buttons-card">
            <Card.Body className="p-3">
              <div className="d-flex align-items-center gap-2 mb-3">
                <h6 className="mb-0 fw-semibold">🟩 Buttons & Actions</h6>
                <Badge bg="warning" text="dark" className="ms-auto small">Important</Badge>
              </div>
              <p className="text-muted mb-3 small">
                This is where clicks happen.
              </p>
              
              <ColorControl
                field="button_color"
                label="Button Color"
                helperText="Button background"
                value={formData.button_color}
                onChange={handleColorChange}
              />
              
              <ColorControl
                field="button_text_color"
                label="Button Text Color"
                helperText="Text on buttons"
                value={formData.button_text_color}
                onChange={handleColorChange}
              />
              
              <ColorControl
                field="button_hover_color"
                label="Button Hover Color"
                helperText="On hover"
                value={formData.button_hover_color}
                onChange={handleColorChange}
              />
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Sticky Save Button */}
      <div className="position-sticky bottom-0 save-bar py-3 mt-4" style={{ zIndex: 10 }}>
        <div className="d-flex gap-2 justify-content-end">
          <Button
            variant="outline-secondary"
            onClick={handleReset}
            disabled={saving || !hasChanges}
          >
            <i className="bi bi-arrow-counterclockwise me-2"></i>
            Reset
          </Button>
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            size="lg"
            style={{
              backgroundColor: hasChanges ? formData.main_color : undefined,
              borderColor: hasChanges ? formData.main_color : undefined,
              minWidth: '140px'
            }}
          >
            {saving ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Saving...
              </>
            ) : (
              <>
                <i className="bi bi-save me-2"></i>
                Save Theme {hasChanges && <Badge bg="light" text="dark" className="ms-1">●</Badge>}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

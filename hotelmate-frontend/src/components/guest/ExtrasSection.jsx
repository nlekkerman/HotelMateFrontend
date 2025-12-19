import React, { useState, useEffect } from 'react';
import { Card, Form, Row, Col } from 'react-bootstrap';

const ExtrasSection = ({ registry, enabled, required, values, onChange, errors, themeColor }) => {
  // Helper function for select options supporting both choices and options formats
  const getSelectOptions = (meta) => {
    if (Array.isArray(meta.choices)) return meta.choices.map(x => ({ value: x, label: x }));
    if (Array.isArray(meta.options)) {
      return meta.options.map(x => typeof x === 'string' ? ({ value: x, label: x }) : x);
    }
    return [];
  };
  // CSS for info-colored picker icons
  const pickerStyles = `
    .date-picker-info::-webkit-calendar-picker-indicator,
    .time-picker-info::-webkit-calendar-picker-indicator {
      filter: invert(42%) sepia(93%) saturate(1352%) hue-rotate(167deg) brightness(106%) contrast(101%);
      cursor: pointer;
    }
    
    .date-picker-info::-webkit-calendar-picker-indicator:hover,
    .time-picker-info::-webkit-calendar-picker-indicator:hover {
      filter: invert(42%) sepia(93%) saturate(1352%) hue-rotate(167deg) brightness(90%) contrast(101%);
    }
  `;

  // Add styles to head if not already present
  useEffect(() => {
    const styleId = 'picker-info-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = pickerStyles;
      document.head.appendChild(style);
    }
  }, []);
  // State for ETA time picker
  const [etaTime, setEtaTime] = useState('');

  // Initialize ETA time from existing value
  useEffect(() => {
    if (values.eta && !etaTime) {
      // Try to parse existing text value for time
      const etaValue = values.eta;
      const timeMatch = etaValue.match(/(\d{2}:\d{2})/);
      if (timeMatch) {
        setEtaTime(timeMatch[1]);
      }
    }
  }, [values.eta, etaTime]);

  // Handle ETA time change  
  const handleEtaTimeChange = (newTime) => {
    setEtaTime(newTime);
    const formattedEta = newTime ? `Arriving at ${formatTime(newTime)}` : '';
    onChange('eta', formattedEta);
  };

  // Format time to readable format
  const formatTime = (time) => {
    if (!time) return '';
    try {
      const [hours, minutes] = time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date.toLocaleString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      return time;
    }
  };

  // Get only enabled booking-scoped fields, sorted by order
  const bookingFields = Object.entries(registry)
    .filter(([fieldKey, meta]) => enabled[fieldKey] === true && (meta.scope || 'booking') === 'booking')
    .sort(([, a], [, b]) => (a.order || 0) - (b.order || 0));
  
  if (bookingFields.length === 0) {
    return null;
  }
  
  const renderField = (fieldKey, meta) => {
    const value = values[fieldKey] || '';
    const isRequired = required[fieldKey] === true;
    
    // Special handling for ETA field with time picker only
    if (fieldKey === 'eta' && meta.type === 'text') {
      return (
        <>
          <Form.Control
            type="time"
            value={etaTime}
            onChange={(e) => handleEtaTimeChange(e.target.value)}
            isInvalid={!!errors[fieldKey]}
            required={isRequired}
            style={{
              colorScheme: 'light',
              '--bs-border-color': themeColor || '#0dcaf0'
            }}
            className="time-picker-info"
          />
          {/* Display formatted preview */}
          {etaTime && (
            <div className="mt-2 p-2 bg-light rounded small">
              <strong>Preview:</strong> {formatTime(etaTime)}
            </div>
          )}
          {/* Hidden input for form compatibility */}
          <Form.Control
            type="hidden"
            value={value}
            readOnly
          />
        </>
      );
    }
    
    switch (meta.type) {
      case 'textarea':
        return (
          <Form.Control
            as="textarea"
            rows={3}
            value={value}
            onChange={(e) => onChange(fieldKey, e.target.value)}
            isInvalid={!!errors[fieldKey]}
            required={isRequired}
          />
        );
      case 'select':
        return (
          <Form.Select
            value={value}
            onChange={(e) => onChange(fieldKey, e.target.value)}
            isInvalid={!!errors[fieldKey]}
            required={isRequired}
          >
            <option value="">-- Select --</option>
            {getSelectOptions(meta).map((option, index) => (
              <option key={`${option.value}-${index}`} value={option.value}>
                {option.label}
              </option>
            ))}
          </Form.Select>
        );
      case 'checkbox':
        return (
          <Form.Check
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(fieldKey, e.target.checked)}
            isInvalid={!!errors[fieldKey]}
            required={isRequired}
          />
        );
      default: // text
        return (
          <Form.Control
            type="text"
            value={value}
            onChange={(e) => onChange(fieldKey, e.target.value)}
            isInvalid={!!errors[fieldKey]}
            required={isRequired}
          />
        );
    }
  };

  return (
    <Card className="shadow-sm mb-4">
      <Card.Header style={{ borderLeft: `4px solid ${themeColor}` }}>
        <h5 className="mb-1">Additional Information</h5>
        <small className="text-muted">Please complete the required fields</small>
      </Card.Header>
      <Card.Body>
        {bookingFields.map(([fieldKey, meta]) => (
          <Form.Group key={fieldKey} className="mb-3">
            <Form.Label>
              {meta.label}
              {required[fieldKey] && <span className="text-danger"> *</span>}
            </Form.Label>
            {meta.description && (
              <div className="form-text mb-2">{meta.description}</div>
            )}
            {renderField(fieldKey, meta)}
            {errors[fieldKey] && (
              <Form.Control.Feedback type="invalid" className="d-block">
                {errors[fieldKey]}
              </Form.Control.Feedback>
            )}
          </Form.Group>
        ))}
      </Card.Body>
    </Card>
  );
};

export default ExtrasSection;
import React, { useState } from 'react';
import { Collapse, Form, Row, Col, Button } from 'react-bootstrap';
import { 
  DATE_MODE_OPTIONS, 
  PRECHECKIN_OPTIONS, 
  STATUS_OPTIONS, 
  ORDERING_OPTIONS 
} from '@/types/bookingFilters';

/**
 * Advanced Filters Panel
 * Collapsible panel with all advanced filtering options
 */
const AdvancedFiltersPanel = ({ 
  filters, 
  onFilterChange, 
  show, 
  onToggle,
  roomTypes = [] 
}) => {
  const [localFilters, setLocalFilters] = useState(filters);

  const handleInputChange = (field, value) => {
    const newFilters = { ...localFilters, [field]: value };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleStatusChange = (status, checked) => {
    const currentStatus = localFilters.status || [];
    const newStatus = checked 
      ? [...currentStatus, status]
      : currentStatus.filter(s => s !== status);
    
    handleInputChange('status', newStatus);
  };

  const handleReset = () => {
    const resetFilters = {
      bucket: null,
      date_mode: 'stay',
      date_from: null,
      date_to: null,
      q: '',
      assigned: null,
      room_id: null,
      room_number: null,
      room_type: null,
      adults: null,
      children: null,
      party_size_min: null,
      party_size_max: null,
      precheckin: null,
      amount_min: null,
      amount_max: null,
      currency: null,
      payment_status: null,
      seen: null,
      seen_by_staff_id: null,
      status: [],
      ordering: null,
      include_counts: true
    };
    setLocalFilters(resetFilters);
    onFilterChange(resetFilters);
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <Button
          variant="outline-secondary"
          size="sm"
          onClick={onToggle}
          className="d-flex align-items-center gap-2"
        >
          <i className={`bi bi-chevron-${show ? 'up' : 'down'}`}></i>
          Advanced Filters
        </Button>
        
        <Button
          variant="outline-danger"
          size="sm"
          onClick={handleReset}
          className="d-flex align-items-center gap-1"
        >
          <i className="bi bi-arrow-counterclockwise"></i>
          Reset All
        </Button>
      </div>

      <Collapse in={show}>
        <div className="card">
          <div className="card-body">
            <Form>
              {/* Date Filtering */}
              <Row className="mb-3">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Date Mode</Form.Label>
                    <Form.Select
                      value={localFilters.date_mode || 'stay'}
                      onChange={(e) => handleInputChange('date_mode', e.target.value)}
                    >
                      {DATE_MODE_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>From Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={localFilters.date_from || ''}
                      onChange={(e) => handleInputChange('date_from', e.target.value || null)}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>To Date</Form.Label>
                    <Form.Control
                      type="date"
                      value={localFilters.date_to || ''}
                      onChange={(e) => handleInputChange('date_to', e.target.value || null)}
                    />
                  </Form.Group>
                </Col>
              </Row>

              {/* Room & Assignment */}
              <Row className="mb-3">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Assignment Status</Form.Label>
                    <Form.Select
                      value={localFilters.assigned === null ? '' : localFilters.assigned.toString()}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : e.target.value === 'true';
                        handleInputChange('assigned', value);
                      }}
                    >
                      <option value="">All</option>
                      <option value="true">Assigned</option>
                      <option value="false">Unassigned</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Room Number</Form.Label>
                    <Form.Control
                      type="text"
                      placeholder="e.g., 101, 201"
                      value={localFilters.room_number || ''}
                      onChange={(e) => handleInputChange('room_number', e.target.value || null)}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Room Type</Form.Label>
                    <Form.Select
                      value={localFilters.room_type || ''}
                      onChange={(e) => handleInputChange('room_type', e.target.value || null)}
                    >
                      <option value="">All Room Types</option>
                      {roomTypes.map(type => (
                        <option key={type.code || type.id} value={type.code || type.name}>
                          {type.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              {/* Guest Count */}
              <Row className="mb-3">
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Adults</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      value={localFilters.adults ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : parseInt(e.target.value, 10);
                        handleInputChange('adults', value);
                      }}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Children</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      value={localFilters.children ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : parseInt(e.target.value, 10);
                        handleInputChange('children', value);
                      }}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Party Size Min</Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
                      value={localFilters.party_size_min ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : parseInt(e.target.value, 10);
                        handleInputChange('party_size_min', value);
                      }}
                    />
                  </Form.Group>
                </Col>
                <Col md={3}>
                  <Form.Group>
                    <Form.Label>Party Size Max</Form.Label>
                    <Form.Control
                      type="number"
                      min="1"
                      value={localFilters.party_size_max ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : parseInt(e.target.value, 10);
                        handleInputChange('party_size_max', value);
                      }}
                    />
                  </Form.Group>
                </Col>
              </Row>

              {/* Amount Range */}
              <Row className="mb-3">
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Amount Min</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      step="0.01"
                      value={localFilters.amount_min ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : parseFloat(e.target.value);
                        handleInputChange('amount_min', value);
                      }}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Amount Max</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      step="0.01"
                      value={localFilters.amount_max ?? ''}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : parseFloat(e.target.value);
                        handleInputChange('amount_max', value);
                      }}
                    />
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Pre-checkin Status</Form.Label>
                    <Form.Select
                      value={localFilters.precheckin || ''}
                      onChange={(e) => handleInputChange('precheckin', e.target.value || null)}
                    >
                      {PRECHECKIN_OPTIONS.map(option => (
                        <option key={option.value || 'null'} value={option.value || ''}>
                          {option.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              {/* Status Multi-select */}
              <Row className="mb-3">
                <Col md={8}>
                  <Form.Group>
                    <Form.Label>Status Filters</Form.Label>
                    <div className="d-flex flex-wrap gap-2">
                      {STATUS_OPTIONS.map(status => (
                        <Form.Check
                          key={status}
                          type="checkbox"
                          id={`status-${status}`}
                          label={status.replace('_', ' ')}
                          checked={localFilters.status?.includes(status) || false}
                          onChange={(e) => handleStatusChange(status, e.target.checked)}
                          className="me-3"
                        />
                      ))}
                    </div>
                  </Form.Group>
                </Col>
                <Col md={4}>
                  <Form.Group>
                    <Form.Label>Sort Order</Form.Label>
                    <Form.Select
                      value={localFilters.ordering || ''}
                      onChange={(e) => handleInputChange('ordering', e.target.value || null)}
                    >
                      {ORDERING_OPTIONS.map(option => (
                        <option key={option.value || 'null'} value={option.value || ''}>
                          {option.label}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>

              {/* Additional Options */}
              <Row>
                <Col md={6}>
                  <Form.Group>
                    <Form.Label>Seen Status</Form.Label>
                    <Form.Select
                      value={localFilters.seen === null ? '' : localFilters.seen.toString()}
                      onChange={(e) => {
                        const value = e.target.value === '' ? null : e.target.value === 'true';
                        handleInputChange('seen', value);
                      }}
                    >
                      <option value="">All</option>
                      <option value="true">Seen</option>
                      <option value="false">Unseen</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                <Col md={6} className="d-flex align-items-end">
                  <Form.Check
                    type="checkbox"
                    id="include-counts"
                    label="Show Bucket Counts"
                    checked={localFilters.include_counts}
                    onChange={(e) => handleInputChange('include_counts', e.target.checked)}
                  />
                </Col>
              </Row>
            </Form>
          </div>
        </div>
      </Collapse>
    </>
  );
};

export default AdvancedFiltersPanel;
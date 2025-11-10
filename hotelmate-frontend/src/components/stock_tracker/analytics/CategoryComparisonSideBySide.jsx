import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Form, Alert, Badge } from 'react-bootstrap';
import { FaExchangeAlt } from 'react-icons/fa';
import CategoryBreakdownChart from './CategoryBreakdownChart';
import { getPeriodsList } from '../../../services/stockAnalytics';

/**
 * Category Comparison Side-by-Side Component
 * 
 * Displays two Category Breakdown charts side by side for easy comparison
 * Shows period over period changes and highlights differences
 */
const CategoryComparisonSideBySide = ({ 
  hotelSlug, 
  periods = [], // Array of period IDs
  height = 400
}) => {
  const [period1, setPeriod1] = useState(periods[0] || null);
  const [period2, setPeriod2] = useState(periods[1] || null);
  const [availablePeriods, setAvailablePeriods] = useState([]);

  useEffect(() => {
    if (hotelSlug) {
      fetchPeriods();
    }
  }, [hotelSlug]);

  useEffect(() => {
    // Update selected periods when periods prop changes
    if (periods.length > 0) {
      setPeriod1(periods[0]);
      if (periods.length > 1) {
        setPeriod2(periods[1]);
      }
    }
  }, [periods]);

  const fetchPeriods = async () => {
    try {
      const response = await getPeriodsList(hotelSlug, true); // Get closed periods only
      setAvailablePeriods(response);
    } catch (error) {
      console.error('Error fetching periods:', error);
    }
  };

  if (!periods || periods.length < 2) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-warning text-dark">
          <FaExchangeAlt className="me-2" />
          <span>Category Comparison</span>
        </Card.Header>
        <Card.Body>
          <Alert variant="warning">
            Please select at least 2 periods to compare categories
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-warning text-dark">
        <Row className="align-items-center">
          <Col>
            <FaExchangeAlt className="me-2" />
            <span>Category Comparison</span>
          </Col>
        </Row>
      </Card.Header>
      <Card.Body>
        {/* Period Selection */}
        <Row className="mb-3">
          <Col xs={12} md={6}>
            <Form.Group>
              <Form.Label className="small text-muted mb-1">Period 1</Form.Label>
              <Form.Select 
                size="sm" 
                value={period1 || ''} 
                onChange={(e) => setPeriod1(parseInt(e.target.value))}
              >
                <option value="">Select Period</option>
                {availablePeriods.map((period, index) => (
                  <option key={`period1-${period.id}-${index}`} value={period.id}>
                    {period.period_name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
          <Col xs={12} md={6}>
            <Form.Group>
              <Form.Label className="small text-muted mb-1">Period 2</Form.Label>
              <Form.Select 
                size="sm" 
                value={period2 || ''} 
                onChange={(e) => setPeriod2(parseInt(e.target.value))}
              >
                <option value="">Select Period</option>
                {availablePeriods.map((period, index) => (
                  <option key={`period2-${period.id}-${index}`} value={period.id}>
                    {period.period_name}
                  </option>
                ))}
              </Form.Select>
            </Form.Group>
          </Col>
        </Row>

        {/* Side by Side Charts */}
        {period1 && period2 ? (
          <Row>
            <Col xs={12} lg={6} className="mb-3 mb-lg-0">
              <CategoryBreakdownChart
                hotelSlug={hotelSlug}
                period={period1}
                height={height}
                defaultChartType="pie"
              />
            </Col>
            <Col xs={12} lg={6}>
              <CategoryBreakdownChart
                hotelSlug={hotelSlug}
                period={period2}
                height={height}
                defaultChartType="pie"
              />
            </Col>
          </Row>
        ) : (
          <Alert variant="info" className="text-center">
            Select two periods above to compare category breakdowns
          </Alert>
        )}

        {/* Comparison Insights */}
        {period1 && period2 && (
          <Alert variant="light" className="mt-3">
            <strong>💡 Tip:</strong> Compare category distributions to identify shifts in inventory composition between periods.
            Look for categories that have grown or shrunk significantly.
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
};

export default CategoryComparisonSideBySide;

import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Badge, Row, Col, Spinner } from 'react-bootstrap';
import { FiRefreshCw, FiFilter } from 'react-icons/fi';
import { getPeriodsList } from '@/services/stockAnalytics';

/**
 * Analytics Filters Component
 * 
 * Provides filtering controls for analytics dashboard:
 * - Multi-Period Selector (for compare/categories, trends, heatmap)
 * - Single Period Selectors (for two-period comparisons)
 * - Category Filter
 * - Refresh Button
 */
const AnalyticsFilters = ({ 
  hotelSlug,
  selectedPeriods = [],
  onPeriodsChange,
  period1,
  period2,
  onPeriod1Change,
  onPeriod2Change,
  selectedCategory,
  onCategoryChange,
  categories = [],
  onRefresh,
  loading = false
}) => {
  const [periods, setPeriods] = useState([]);
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  const [showAllPeriods, setShowAllPeriods] = useState(false);

  // Fetch periods list on mount
  useEffect(() => {
    if (hotelSlug) {
      fetchPeriods();
    }
  }, [hotelSlug]);

  const fetchPeriods = async () => {
    setLoadingPeriods(true);
    try {
      console.log('🔍 [AnalyticsFilters] Fetching periods for hotel:', hotelSlug);
      const response = await getPeriodsList(hotelSlug, true); // Get only closed periods
      console.log('📋 [AnalyticsFilters] Periods received from API:', response);
      
      if (response && Array.isArray(response)) {
        console.log(`✅ [AnalyticsFilters] Setting ${response.length} periods:`, 
          response.map(p => ({ id: p.id, name: p.period_name, closed: p.is_closed }))
        );
        setPeriods(response);
        
        // Auto-select last 3 periods for multi-period comparison
        if (selectedPeriods.length === 0 && response.length >= 3) {
          const lastThree = response.slice(0, 3).map(p => p.id);
          console.log('🎯 [AnalyticsFilters] Auto-selecting last 3 periods:', lastThree);
          onPeriodsChange?.(lastThree);
        }
        
        // Auto-select last 2 periods for two-period comparison
        if (!period1 && !period2 && response.length >= 2) {
          console.log('🎯 [AnalyticsFilters] Auto-selecting periods for comparison:', 
            { period1: response[1].id, period2: response[0].id }
          );
          onPeriod1Change?.(response[1].id);
          onPeriod2Change?.(response[0].id);
        }
      } else {
        console.warn('⚠️ [AnalyticsFilters] Response is not an array:', response);
      }
    } catch (error) {
      console.error('❌ [AnalyticsFilters] Error fetching periods:', error);
    } finally {
      setLoadingPeriods(false);
    }
  };

  // Handle multi-period checkbox toggle
  const handlePeriodToggle = (periodId) => {
    const newSelection = selectedPeriods.includes(periodId)
      ? selectedPeriods.filter(id => id !== periodId)
      : [...selectedPeriods, periodId];
    
    onPeriodsChange?.(newSelection);
  };

  // Handle select all periods
  const handleSelectAll = () => {
    const allPeriodIds = periods.map(p => p.id);
    onPeriodsChange?.(allPeriodIds);
  };

  // Handle clear all periods
  const handleClearAll = () => {
    onPeriodsChange?.([]);
  };

  // Get period name by ID
  const getPeriodName = (periodId) => {
    const period = periods.find(p => p.id === periodId);
    return period ? period.period_name : 'Unknown';
  };

  // Visible periods (show first 6 or all)
  const visiblePeriods = showAllPeriods ? periods : periods.slice(0, 6);

  return (
    <Card className="shadow-sm mb-4">
      <Card.Header className="bg-light">
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center gap-2">
            <FiFilter size={18} />
            <h6 className="mb-0">Analytics Filters</h6>
          </div>
          <Button 
            variant="outline-primary" 
            size="sm" 
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner animation="border" size="sm" className="me-1" />
                Refreshing...
              </>
            ) : (
              <>
                <FiRefreshCw className="me-1" />
                Refresh
              </>
            )}
          </Button>
        </div>
      </Card.Header>
      
      <Card.Body>
        <Row>
          {/* Multi-Period Selector */}
          <Col md={6} className="mb-3">
            <Form.Group>
              <Form.Label className="fw-bold">
                Multi-Period Selection
                <Badge bg="secondary" className="ms-2">{selectedPeriods.length} selected</Badge>
              </Form.Label>
              <div className="small text-muted mb-2">
                For Category Comparison, Trends, and Heatmap
              </div>
              
              {loadingPeriods ? (
                <div className="text-center py-3">
                  <Spinner animation="border" size="sm" />
                </div>
              ) : (
                <>
                  <div className="d-flex gap-2 mb-2">
                    <Button 
                      variant="outline-secondary" 
                      size="sm" 
                      onClick={handleSelectAll}
                      disabled={selectedPeriods.length === periods.length}
                    >
                      Select All
                    </Button>
                    <Button 
                      variant="outline-secondary" 
                      size="sm" 
                      onClick={handleClearAll}
                      disabled={selectedPeriods.length === 0}
                    >
                      Clear All
                    </Button>
                  </div>
                  
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }} className="border rounded p-2">
                    {visiblePeriods.map(period => (
                      <Form.Check
                        key={period.id}
                        type="checkbox"
                        id={`period-${period.id}`}
                        label={
                          <div className="d-flex justify-content-between align-items-center">
                            <span>{period.period_name}</span>
                            <small className="text-muted">
                              {period.start_date} - {period.end_date}
                            </small>
                          </div>
                        }
                        checked={selectedPeriods.includes(period.id)}
                        onChange={() => handlePeriodToggle(period.id)}
                        className="mb-1"
                      />
                    ))}
                  </div>
                  
                  {periods.length > 6 && (
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 mt-2"
                      onClick={() => setShowAllPeriods(!showAllPeriods)}
                    >
                      {showAllPeriods ? 'Show Less' : `Show All (${periods.length} periods)`}
                    </Button>
                  )}
                </>
              )}
            </Form.Group>
          </Col>

          {/* Two-Period Selectors */}
          <Col md={6}>
            <Row>
              <Col md={12} className="mb-3">
                <Form.Group>
                  <Form.Label className="fw-bold">
                    Two-Period Comparison
                  </Form.Label>
                  <div className="small text-muted mb-2">
                    For Top Movers, Cost Analysis, and Performance
                  </div>
                </Form.Group>
              </Col>
              
              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Period 1 (Baseline)</Form.Label>
                  <Form.Select 
                    value={period1 || ''} 
                    onChange={(e) => onPeriod1Change?.(e.target.value ? parseInt(e.target.value) : null)}
                    disabled={loadingPeriods}
                  >
                    <option value="">Select Period 1</option>
                    {periods.map(period => (
                      <option key={period.id} value={period.id}>
                        {period.period_name}
                      </option>
                    ))}
                  </Form.Select>
                  {period1 && (
                    <div className="small text-muted mt-1">
                      {getPeriodName(period1)}
                    </div>
                  )}
                </Form.Group>
              </Col>
              
              <Col md={6} className="mb-3">
                <Form.Group>
                  <Form.Label>Period 2 (Comparison)</Form.Label>
                  <Form.Select 
                    value={period2 || ''} 
                    onChange={(e) => onPeriod2Change?.(e.target.value ? parseInt(e.target.value) : null)}
                    disabled={loadingPeriods}
                  >
                    <option value="">Select Period 2</option>
                    {periods.map(period => (
                      <option key={period.id} value={period.id}>
                        {period.period_name}
                      </option>
                    ))}
                  </Form.Select>
                  {period2 && (
                    <div className="small text-muted mt-1">
                      {getPeriodName(period2)}
                    </div>
                  )}
                </Form.Group>
              </Col>
            </Row>
          </Col>
        </Row>

        {/* Category Filter */}
        {categories && categories.length > 0 && (
          <Row className="mt-2">
            <Col md={6}>
              <Form.Group>
                <Form.Label className="fw-bold">Category Filter</Form.Label>
                <Form.Select
                  value={selectedCategory || 'all'}
                  onChange={(e) => onCategoryChange?.(e.target.value === 'all' ? null : e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        )}

        {/* Quick Stats */}
        {periods.length > 0 && (
          <div className="mt-3 pt-3 border-top">
            <div className="row text-center small">
              <div className="col-4">
                <div className="text-muted">Available Periods</div>
                <div className="fw-bold">{periods.length}</div>
              </div>
              <div className="col-4">
                <div className="text-muted">Multi-Selection</div>
                <div className="fw-bold">{selectedPeriods.length} selected</div>
              </div>
              <div className="col-4">
                <div className="text-muted">Comparison</div>
                <div className="fw-bold">
                  {period1 && period2 ? '2 periods' : 'Not set'}
                </div>
              </div>
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default AnalyticsFilters;

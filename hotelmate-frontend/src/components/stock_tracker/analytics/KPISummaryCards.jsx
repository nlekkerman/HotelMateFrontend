import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner, Badge } from 'react-bootstrap';
import { 
  FaMoneyBillWave, 
  FaPercentage, 
  FaChartLine, 
  FaExclamationTriangle,
  FaArrowUp,
  FaBox
} from 'react-icons/fa';
import { 
  getKPISummary,
  formatCurrency 
} from '@/services/stockAnalytics';

const KPISummaryCards = ({ 
  hotelSlug, 
  period1, // Current period
  period2 = null, // Previous period for comparison (optional)
  selectedPeriods = [], // All selected periods for KPI calculations
  onCardClick = null
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [kpis, setKpis] = useState({
    totalStockValue: 0,
    currentPeriodName: null,
    valueChange: null,
    previousPeriodName: null,
    averageGP: 0,
    highestGPPeriod: null,
    lowestGPPeriod: null,
    topCategory: { name: '', value: 0 },
    lowStockCount: 0,
    topMoversCount: 0,
    performanceScore: 0,
    performanceRating: ''
  });

  useEffect(() => {
    if (hotelSlug && (selectedPeriods.length > 0 || period1)) {
      fetchKPIData();
    }
  }, [hotelSlug, period1, period2, selectedPeriods]);

  const fetchKPIData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Determine which periods to use for the KPI endpoint
      let periodIds = [];
      if (selectedPeriods && selectedPeriods.length > 0) {
        periodIds = selectedPeriods;
      } else if (period2) {
        periodIds = [period1, period2];
      } else {
        periodIds = [period1];
      }

      console.log('Fetching KPI data for periods:', periodIds);

      // Single API call - backend calculates EVERYTHING
      const response = await getKPISummary(hotelSlug, periodIds);
      const data = response.data;

      console.log('=== KPI BACKEND RESPONSE ===');
      console.log('Stock Value Metrics:', data.stock_value_metrics);
      console.log('Period Values (as received):', data.stock_value_metrics?.period_values);
      console.log('Profitability Metrics:', data.profitability_metrics);
      console.log('Category Performance:', data.category_performance);
      console.log('Inventory Health:', data.inventory_health);
      console.log('Period Comparison:', data.period_comparison);
      console.log('Performance Score:', data.performance_score);
      console.log('===========================');

      // Sort period_values by date to ensure chronological order
      const sortedPeriods = data.stock_value_metrics?.period_values 
        ? [...data.stock_value_metrics.period_values].sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateA - dateB;
          })
        : [];

      console.log('Sorted Periods (by date):', sortedPeriods);

      // Map backend response to component state - NO CALCULATIONS
      setKpis({
        // Stock Value
        totalStockValue: data.stock_value_metrics?.total_current_value || 0,
        // Current period is the LAST one after sorting by date (most recent)
        currentPeriodName: sortedPeriods.length > 0 
                           ? sortedPeriods[sortedPeriods.length - 1]?.period_name 
                           : null,
        valueChange: data.stock_value_metrics?.trend || null,
        // Previous period is the SECOND TO LAST after sorting by date
        previousPeriodName: sortedPeriods.length > 1 
                            ? sortedPeriods[sortedPeriods.length - 2]?.period_name 
                            : null,
        
        // Profitability
        averageGP: data.profitability_metrics?.average_gp_percentage || 0,
        highestGPPeriod: data.profitability_metrics?.highest_gp_period ? {
          gp: data.profitability_metrics.highest_gp_period.gp_percentage,
          periodName: data.profitability_metrics.highest_gp_period.period_name
        } : null,
        lowestGPPeriod: data.profitability_metrics?.lowest_gp_period ? {
          gp: data.profitability_metrics.lowest_gp_period.gp_percentage,
          periodName: data.profitability_metrics.lowest_gp_period.period_name
        } : null,
        
        // Category Performance
        topCategory: {
          name: data.category_performance?.top_by_value?.category_name || 'N/A',
          value: data.category_performance?.top_by_value?.total_value || 0,
          percentage: data.category_performance?.top_by_value?.percentage_of_total || 0
        },
        
        // Inventory Health
        lowStockCount: (data.inventory_health?.low_stock_count || 0) + 
                       (data.inventory_health?.out_of_stock_count || 0),
        
        // Period Comparison (only if 2+ periods)
        topMoversCount: data.period_comparison?.total_movers_count || 0,
        
        // Performance Score
        performanceScore: data.performance_score?.overall_score || 0,
        performanceRating: data.performance_score?.rating || 'N/A'
      });

    } catch (err) {
      console.error('Failed to fetch KPI data from backend:', err);
      setError(err.message || 'Failed to load KPI data');
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (kpiType) => {
    if (onCardClick) {
      onCardClick(kpiType, kpis[kpiType]);
    }
  };

  const getPerformanceBadge = (rating) => {
    const ratingUpper = rating?.toUpperCase() || '';
    if (ratingUpper === 'EXCELLENT') return <Badge bg="success">Excellent</Badge>;
    if (ratingUpper === 'GOOD') return <Badge bg="info">Good</Badge>;
    if (ratingUpper === 'FAIR') return <Badge bg="warning">Fair</Badge>;
    if (ratingUpper === 'POOR') return <Badge bg="danger">Poor</Badge>;
    return <Badge bg="secondary">{rating || 'N/A'}</Badge>;
  };

  const getTrendIcon = (trend, periodName = null) => {
    if (!trend) return null;
    const direction = trend.direction?.toLowerCase();
    const percentage = Math.abs(trend.percentage || 0);
    
    if (direction === 'increasing') {
      return (
        <div className="mt-1">
          <span className="text-success">
            <FaArrowUp size={12} /> +{percentage.toFixed(1)}%
          </span>
          {periodName && (
            <div className="text-muted" style={{ fontSize: '0.65rem', marginTop: '2px' }}>
              vs {periodName}
            </div>
          )}
        </div>
      );
    } else if (direction === 'decreasing') {
      return (
        <div className="mt-1">
          <span className="text-danger">
            <FaArrowUp size={12} style={{ transform: 'rotate(180deg)' }} /> -{percentage.toFixed(1)}%
          </span>
          {periodName && (
            <div className="text-muted" style={{ fontSize: '0.65rem', marginTop: '2px' }}>
              vs {periodName}
            </div>
          )}
        </div>
      );
    }
    return (
      <div className="mt-1">
        <span className="text-muted">→ Stable</span>
        {periodName && (
          <div className="text-muted" style={{ fontSize: '0.65rem', marginTop: '2px' }}>
            vs {periodName}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <Row className="g-3">
        {[1, 2, 3, 4, 5, 6].map(i => (
          <Col key={i} xs={12} sm={6} md={4} lg={2}>
            <Card className="shadow-sm text-center">
              <Card.Body>
                <Spinner animation="border" size="sm" variant="primary" />
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    );
  }

  return (
    <Row className="g-3">
      {/* Total Stock Value */}
      <Col xs={12} sm={6} md={4} lg={2}>
        <Card 
          className="shadow-sm h-100 hover-card"
          style={{ cursor: onCardClick ? 'pointer' : 'default' }}
          onClick={() => handleCardClick('totalStockValue')}
          title="Current total value of all stock on hand"
        >
          <Card.Body className="text-center">
            <FaMoneyBillWave size={32} className="text-success mb-2" />
            <div className="small text-muted mb-1">Current Stock Value</div>
            <h4 className="mb-0">{formatCurrency(kpis.totalStockValue)}</h4>
            {kpis.currentPeriodName && (
              <div className="text-muted" style={{ fontSize: '0.7rem', marginTop: '2px' }}>
                {kpis.currentPeriodName}
              </div>
            )}
            {kpis.valueChange && getTrendIcon(kpis.valueChange, kpis.previousPeriodName)}
          </Card.Body>
        </Card>
      </Col>

      {/* Average GP% */}
      <Col xs={12} sm={6} md={4} lg={2}>
        <Card 
          className="shadow-sm h-100 hover-card"
          style={{ cursor: onCardClick ? 'pointer' : 'default' }}
          onClick={() => handleCardClick('averageGP')}
        >
          <Card.Body className="text-center">
            <FaPercentage size={32} className="text-primary mb-2" />
            <div className="small text-muted mb-1">Average GP%</div>
            <h4 className="mb-0">{kpis.averageGP.toFixed(1)}%</h4>
            {kpis.highestGPPeriod && kpis.lowestGPPeriod && (
              <div className="mt-2">
                <div className="d-flex justify-content-between align-items-center gap-2" style={{ fontSize: '0.7rem' }}>
                  <div className="text-center flex-fill">
                    <div className="text-success"><FaArrowUp size={10} /> {kpis.highestGPPeriod.gp.toFixed(1)}%</div>
                    <div className="text-muted" style={{ fontSize: '0.6rem', marginTop: '2px' }}>
                      {kpis.highestGPPeriod.periodName}
                    </div>
                  </div>
                  <div className="text-center flex-fill">
                    <div className="text-danger"><FaArrowUp size={10} style={{ transform: 'rotate(180deg)' }} /> {kpis.lowestGPPeriod.gp.toFixed(1)}%</div>
                    <div className="text-muted" style={{ fontSize: '0.6rem', marginTop: '2px' }}>
                      {kpis.lowestGPPeriod.periodName}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Card.Body>
        </Card>
      </Col>

      {/* Top Category */}
      <Col xs={12} sm={6} md={4} lg={2}>
        <Card 
          className="shadow-sm h-100 hover-card"
          style={{ cursor: onCardClick ? 'pointer' : 'default' }}
          onClick={() => handleCardClick('topCategory')}
          title="Category with highest total stock value"
        >
          <Card.Body className="text-center">
            <FaChartLine size={32} className="text-info mb-2" />
            <div className="small text-muted mb-1">Top Category by Value</div>
            <h6 className="mb-0 text-truncate">{kpis.topCategory.name}</h6>
            <small className="text-muted">{formatCurrency(kpis.topCategory.value)}</small>
            <div className="mt-1" style={{ fontSize: '0.65rem', color: '#6c757d' }}>
              Highest total value
            </div>
          </Card.Body>
        </Card>
      </Col>

      {/* Low Stock Items */}
      <Col xs={12} sm={6} md={4} lg={2}>
        <Card 
          className="shadow-sm h-100 hover-card"
          style={{ cursor: onCardClick ? 'pointer' : 'default' }}
          onClick={() => handleCardClick('lowStockCount')}
          title="Items below par level or out of stock"
        >
          <Card.Body className="text-center">
            <FaExclamationTriangle size={32} className="text-warning mb-2" />
            <div className="small text-muted mb-1">Low Stock Items</div>
            <h4 className="mb-0">
              {kpis.lowStockCount}
              {kpis.lowStockCount > 10 && (
                <Badge bg="danger" className="ms-2">!</Badge>
              )}
            </h4>
            <div className="mt-1" style={{ fontSize: '0.65rem', color: '#6c757d' }}>
              Need attention
            </div>
          </Card.Body>
        </Card>
      </Col>

      {/* Top Movers */}
      {period2 && (
        <Col xs={12} sm={6} md={4} lg={2}>
          <Card 
            className="shadow-sm h-100 hover-card"
            style={{ cursor: onCardClick ? 'pointer' : 'default' }}
            onClick={() => handleCardClick('topMoversCount')}
            title="Items with big stock level changes between periods"
          >
            <Card.Body className="text-center">
              <FaChartLine size={32} className="text-success mb-2" />
              <div className="small text-muted mb-1">Stock Level Changes</div>
              <h4 className="mb-0">{kpis.topMoversCount}</h4>
              <div className="mt-1" style={{ fontSize: '0.65rem', color: '#6c757d' }}>
                Items with &gt;10% change
              </div>
            </Card.Body>
          </Card>
        </Col>
      )}

      {/* Performance Score */}
      <Col xs={12} sm={6} md={4} lg={2}>
        <Card 
          className="shadow-sm h-100 hover-card"
          style={{ cursor: onCardClick ? 'pointer' : 'default' }}
          onClick={() => handleCardClick('performanceScore')}
          title="Overall performance: profitability, stock health, turnover & variance"
        >
          <Card.Body className="text-center">
            <FaBox size={32} className="text-secondary mb-2" />
            <div className="small text-muted mb-1">Performance Score</div>
            <h4 className="mb-0">
              {kpis.performanceScore}
              <span className="fs-6 text-muted">/100</span>
            </h4>
            <div className="mt-1">{getPerformanceBadge(kpis.performanceRating)}</div>
            <div className="mt-1" style={{ fontSize: '0.65rem', color: '#6c757d' }}>
              Overall rating
            </div>
          </Card.Body>
        </Card>
      </Col>

      {/* Add hover effect styles */}
      <style>{`
        .hover-card {
          transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        }
        .hover-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
        }
      `}</style>
    </Row>
  );
};

export default KPISummaryCards;

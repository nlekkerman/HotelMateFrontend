import React, { useState, useEffect } from 'react';
import { Card, Row, Col, ProgressBar, Spinner, Badge } from 'react-bootstrap';
import { FaTrophy, FaChartBar } from 'react-icons/fa';
import { getKPISummary } from '@/services/stockAnalytics';

const PerformanceBreakdown = ({ hotelSlug, selectedPeriods, period1 }) => {
  const [loading, setLoading] = useState(true);
  const [performanceData, setPerformanceData] = useState({
    overall_score: 0,
    rating: 'N/A',
    breakdown: {
      profitability_score: 0,
      stock_health_score: 0,
      turnover_score: 0,
      variance_score: 0,
      movement_score: 0
    }
  });

  useEffect(() => {
    if (hotelSlug && (selectedPeriods?.length > 0 || period1)) {
      fetchPerformanceData();
    }
  }, [hotelSlug, selectedPeriods, period1]);

  const fetchPerformanceData = async () => {
    try {
      setLoading(true);
      
      const periodIds = selectedPeriods?.length > 0 
        ? selectedPeriods 
        : (period1 ? [period1] : []);
      
      const response = await getKPISummary(hotelSlug, { periodIds });
      const data = response.data?.performance_score || {};
      
      setPerformanceData({
        overall_score: data.overall_score || 0,
        rating: data.rating || 'N/A',
        breakdown: data.breakdown || {
          profitability_score: 0,
          stock_health_score: 0,
          turnover_score: 0,
          variance_score: 0,
          movement_score: 0
        }
      });
    } catch (error) {
      console.error('Error fetching performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'info';
    if (score >= 40) return 'warning';
    return 'danger';
  };

  const getScoreVariant = (score) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'info';
    if (score >= 40) return 'warning';
    return 'danger';
  };

  const getRatingColor = (rating) => {
    const ratingUpper = rating?.toUpperCase();
    if (ratingUpper === 'EXCELLENT') return 'success';
    if (ratingUpper === 'GOOD') return 'info';
    if (ratingUpper === 'FAIR') return 'warning';
    if (ratingUpper === 'POOR') return 'danger';
    return 'secondary';
  };

  const scoreMetrics = [
    { 
      key: 'profitability_score', 
      label: 'Profitability', 
      icon: '💰',
      description: 'GP% and pour cost performance'
    },
    { 
      key: 'stock_health_score', 
      label: 'Stock Health', 
      icon: '🏥',
      description: 'Low stock, overstock, dead stock balance'
    },
    { 
      key: 'turnover_score', 
      label: 'Turnover', 
      icon: '🔄',
      description: 'Inventory movement efficiency'
    },
    { 
      key: 'variance_score', 
      label: 'Variance Control', 
      icon: '📊',
      description: 'Period-to-period consistency'
    },
    { 
      key: 'movement_score', 
      label: 'Movement Activity', 
      icon: '📦',
      description: 'Purchase and transfer frequency'
    }
  ];

  if (loading) {
    return (
      <Card className="shadow-sm">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <div className="mt-3">Loading performance breakdown...</div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-white">
        <h5 className="mb-0">
          <FaTrophy className="me-2 text-warning" />
          Performance Breakdown
        </h5>
      </Card.Header>
      <Card.Body>
        {/* Overall Score */}
        <div className="text-center mb-4 pb-4 border-bottom">
          <h1 className="display-3 mb-2">
            {performanceData.overall_score}
            <span className="fs-4 text-muted">/100</span>
          </h1>
          <h4>
            <Badge bg={getRatingColor(performanceData.rating)} className="px-4 py-2">
              {performanceData.rating}
            </Badge>
          </h4>
          <p className="text-muted mt-2 mb-0">Overall Performance Score</p>
        </div>

        {/* Component Scores */}
        <Row className="g-3">
          {scoreMetrics.map((metric) => {
            const score = performanceData.breakdown[metric.key] || 0;
            return (
              <Col xs={12} key={metric.key}>
                <div className="mb-2">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <div>
                      <span className="me-2">{metric.icon}</span>
                      <strong>{metric.label}</strong>
                    </div>
                    <Badge bg={getScoreColor(score)}>
                      {score}
                    </Badge>
                  </div>
                  <ProgressBar 
                    now={score} 
                    variant={getScoreVariant(score)}
                    style={{ height: '20px' }}
                    label={`${score}%`}
                  />
                  <small className="text-muted">{metric.description}</small>
                </div>
              </Col>
            );
          })}
        </Row>

        {/* Score Legend */}
        <div className="mt-4 pt-3 border-top">
          <Row className="text-center small">
            <Col xs={3}>
              <Badge bg="success" className="w-100">80-100</Badge>
              <div className="text-muted mt-1">Excellent</div>
            </Col>
            <Col xs={3}>
              <Badge bg="info" className="w-100">60-79</Badge>
              <div className="text-muted mt-1">Good</div>
            </Col>
            <Col xs={3}>
              <Badge bg="warning" className="w-100">40-59</Badge>
              <div className="text-muted mt-1">Fair</div>
            </Col>
            <Col xs={3}>
              <Badge bg="danger" className="w-100">0-39</Badge>
              <div className="text-muted mt-1">Poor</div>
            </Col>
          </Row>
        </div>
      </Card.Body>
    </Card>
  );
};

export default PerformanceBreakdown;

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Spinner, Badge } from 'react-bootstrap';
import { 
  FaMoneyBillWave, 
  FaPercentage, 
  FaChartLine, 
  FaExclamationTriangle,
  FaTrendingUp,
  FaBox
} from 'react-icons/fa';
import { 
  getPeriodSnapshot, 
  getProfitabilityData, 
  getLowStockItems,
  getTopMovers,
  formatCurrency 
} from '@/services/stockAnalytics';

const KPISummaryCards = ({ 
  hotelSlug, 
  period1, // Current period
  period2 = null, // Previous period for comparison (optional)
  onCardClick = null
}) => {
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState({
    totalStockValue: 0,
    averageGP: 0,
    topCategory: { name: '', value: 0 },
    lowStockCount: 0,
    topMoversCount: 0,
    efficiencyScore: 0
  });

  useEffect(() => {
    if (hotelSlug && period1) {
      fetchAllData();
    }
  }, [hotelSlug, period1, period2]);

  const fetchAllData = async () => {
    try {
      setLoading(true);

      // Fetch data in parallel
      const [periodData, profitabilityData, lowStockData] = await Promise.all([
        getPeriodSnapshot(hotelSlug, period1),
        getProfitabilityData(hotelSlug, period1).catch(() => null),
        getLowStockItems(hotelSlug, period1).catch(() => ({ items: [] }))
      ]);

      // Fetch top movers only if period2 is provided
      let topMoversData = null;
      if (period2) {
        topMoversData = await getTopMovers(hotelSlug, period1, period2, 10).catch(() => null);
      }

      // Calculate KPIs
      const totalStockValue = parseFloat(periodData.total_stock_value || 0);
      const averageGP = profitabilityData 
        ? parseFloat(profitabilityData.summary?.average_gp_percentage || 0)
        : 0;

      // Find top category
      const categories = periodData.by_category || [];
      const topCat = categories.length > 0
        ? categories.reduce((max, cat) => 
            parseFloat(cat.total_value) > parseFloat(max.total_value) ? cat : max
          )
        : { category: 'N/A', total_value: 0 };

      const lowStockCount = lowStockData.items?.length || 0;

      const topMoversCount = topMoversData
        ? (topMoversData.biggest_increases?.length || 0) + 
          (topMoversData.biggest_decreases?.length || 0)
        : 0;

      // Calculate efficiency score (0-100)
      // Based on: GP% (40%), Low Stock % (30%), Stock Turnover proxy (30%)
      const gpScore = Math.min(averageGP, 100) * 0.4;
      const lowStockScore = Math.max(0, (1 - (lowStockCount / Math.max(periodData.items_count || 1, 1))) * 100) * 0.3;
      const turnoverScore = 70 * 0.3; // Placeholder - would need actual turnover data
      const efficiencyScore = Math.round(gpScore + lowStockScore + turnoverScore);

      setKpis({
        totalStockValue,
        averageGP,
        topCategory: {
          name: topCat.category,
          value: parseFloat(topCat.total_value || 0),
          percentage: parseFloat(topCat.percentage || 0)
        },
        lowStockCount,
        topMoversCount,
        efficiencyScore
      });

    } catch (err) {
      console.error('Failed to fetch KPI data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCardClick = (kpiType) => {
    if (onCardClick) {
      onCardClick(kpiType, kpis[kpiType]);
    }
  };

  const getEfficiencyBadge = (score) => {
    if (score >= 80) return <Badge bg="success">Excellent</Badge>;
    if (score >= 60) return <Badge bg="info">Good</Badge>;
    if (score >= 40) return <Badge bg="warning">Fair</Badge>;
    return <Badge bg="danger">Needs Improvement</Badge>;
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
        >
          <Card.Body className="text-center">
            <FaMoneyBillWave size={32} className="text-success mb-2" />
            <div className="small text-muted mb-1">Total Stock Value</div>
            <h4 className="mb-0">{formatCurrency(kpis.totalStockValue)}</h4>
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
          </Card.Body>
        </Card>
      </Col>

      {/* Top Category */}
      <Col xs={12} sm={6} md={4} lg={2}>
        <Card 
          className="shadow-sm h-100 hover-card"
          style={{ cursor: onCardClick ? 'pointer' : 'default' }}
          onClick={() => handleCardClick('topCategory')}
        >
          <Card.Body className="text-center">
            <FaChartLine size={32} className="text-info mb-2" />
            <div className="small text-muted mb-1">Top Category</div>
            <h6 className="mb-0 text-truncate">{kpis.topCategory.name}</h6>
            <small className="text-muted">{formatCurrency(kpis.topCategory.value)}</small>
          </Card.Body>
        </Card>
      </Col>

      {/* Low Stock Items */}
      <Col xs={12} sm={6} md={4} lg={2}>
        <Card 
          className="shadow-sm h-100 hover-card"
          style={{ cursor: onCardClick ? 'pointer' : 'default' }}
          onClick={() => handleCardClick('lowStockCount')}
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
          >
            <Card.Body className="text-center">
              <FaTrendingUp size={32} className="text-success mb-2" />
              <div className="small text-muted mb-1">Top Movers</div>
              <h4 className="mb-0">{kpis.topMoversCount}</h4>
            </Card.Body>
          </Card>
        </Col>
      )}

      {/* Efficiency Score */}
      <Col xs={12} sm={6} md={4} lg={2}>
        <Card 
          className="shadow-sm h-100 hover-card"
          style={{ cursor: onCardClick ? 'pointer' : 'default' }}
          onClick={() => handleCardClick('efficiencyScore')}
        >
          <Card.Body className="text-center">
            <FaBox size={32} className="text-secondary mb-2" />
            <div className="small text-muted mb-1">Efficiency Score</div>
            <h4 className="mb-0">
              {kpis.efficiencyScore}
              <span className="fs-6 text-muted">/100</span>
            </h4>
            <div className="mt-1">{getEfficiencyBadge(kpis.efficiencyScore)}</div>
          </Card.Body>
        </Card>
      </Col>

      {/* Add hover effect styles */}
      <style jsx>{`
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

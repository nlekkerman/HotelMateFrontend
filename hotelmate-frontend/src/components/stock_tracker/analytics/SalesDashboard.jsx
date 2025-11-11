// src/components/stock_tracker/analytics/SalesDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Spinner, Alert, Form, Table } from 'react-bootstrap';
import { FaCocktail, FaBoxes, FaChartPie } from 'react-icons/fa';
import { getSalesAnalysis } from '@/services/stockAnalytics';

/**
 * SalesDashboard Component
 * 
 * Displays combined sales analysis (Stock Items + Cocktails)
 * Based on COMPLETE_SALES_ANALYSIS_API_GUIDE.md
 * 
 * @param {string} hotelSlug - Hotel identifier
 * @param {number} periodId - Period ID to analyze
 * @param {number} height - Optional chart height (default: 400)
 */
const SalesDashboard = ({ hotelSlug, periodId, height = 400 }) => {
  const [salesData, setSalesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [includeCocktails, setIncludeCocktails] = useState(true);

  useEffect(() => {
    fetchSalesAnalysis();
  }, [hotelSlug, periodId, includeCocktails]);

  const fetchSalesAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSalesAnalysis(hotelSlug, periodId, {
        includeCocktails,
        includeCategoryBreakdown: true
      });
      setSalesData(data);
    } catch (err) {
      console.error('Failed to fetch sales analysis:', err);
      setError(err.response?.data?.detail || 'Failed to fetch sales analysis');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(value || 0);
  };

  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(2)}%`;
  };

  if (loading) {
    return (
      <Card className="text-center p-4">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted">Loading sales data...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error Loading Sales Analysis</Alert.Heading>
        {error}
      </Alert>
    );
  }

  if (!salesData) {
    return (
      <Alert variant="info">No sales data available for this period</Alert>
    );
  }

  return (
    <div className="sales-dashboard">
      {/* Header with Period Info and Toggle */}
      <Card className="mb-3">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={8}>
              <h4 className="mb-1">
                <FaChartPie className="me-2" />
                Sales Analysis - {salesData.period_name}
              </h4>
              <p className="text-muted mb-0 small">
                Period: {new Date(salesData.period_start).toLocaleDateString()} - {new Date(salesData.period_end).toLocaleDateString()}
                {salesData.period_is_closed && <Badge bg="success" className="ms-2">Closed</Badge>}
              </p>
            </Col>
            <Col md={4} className="text-end">
              <Form.Check
                type="switch"
                id="include-cocktails-switch"
                label="Include Cocktails"
                checked={includeCocktails}
                onChange={(e) => setIncludeCocktails(e.target.checked)}
                className="d-inline-block"
              />
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Combined Totals */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="h-100 border-primary stock-items">
            <Card.Body>
              <div className="d-flex align-items-center mb-2">
                <FaBoxes className="me-2 text-primary" />
                <h6 className="mb-0 text-muted">Total Revenue</h6>
              </div>
              <h3 className="mb-1 text-primary">
                {formatCurrency(salesData.combined_sales.total_revenue)}
              </h3>
              <small className="text-muted">Combined Total</small>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="h-100 border-danger">
            <Card.Body>
              <h6 className="mb-2 text-muted">Total Cost</h6>
              <h3 className="mb-1 text-danger">
                {formatCurrency(salesData.combined_sales.total_cost)}
              </h3>
              <small className="text-muted">COGS</small>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="h-100 border-success">
            <Card.Body>
              <h6 className="mb-2 text-muted">Gross Profit</h6>
              <h3 className="mb-1 text-success">
                {formatCurrency(salesData.combined_sales.profit)}
              </h3>
              <Badge bg="success">
                {formatPercentage(salesData.combined_sales.gp_percentage)} GP
              </Badge>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="h-100 border-info">
            <Card.Body>
              <h6 className="mb-2 text-muted">Items Sold</h6>
              <h3 className="mb-1 text-info">
                {salesData.combined_sales.total_count}
              </h3>
              <small className="text-muted">Total units</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Revenue Breakdown */}
      <Card className="mb-4">
        <Card.Header className="bg-light">
          <h5 className="mb-0">Revenue Breakdown</h5>
        </Card.Header>
        <Card.Body>
          <div className="breakdown-bar mb-3" style={{ height: '40px', display: 'flex', borderRadius: '8px', overflow: 'hidden' }}>
            <div 
              className="stock-segment"
              style={{
                width: `${salesData.breakdown_percentages.stock_revenue_percentage}%`,
                backgroundColor: '#4ECDC4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '0.9rem'
              }}
            >
              Stock Items: {formatPercentage(salesData.breakdown_percentages.stock_revenue_percentage)}
            </div>
            {includeCocktails && (
              <div 
                className="cocktail-segment"
                style={{
                  width: `${salesData.breakdown_percentages.cocktail_revenue_percentage}%`,
                  backgroundColor: '#FF6B6B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '0.9rem'
                }}
              >
                Cocktails: {formatPercentage(salesData.breakdown_percentages.cocktail_revenue_percentage)}
              </div>
            )}
          </div>

          <Row className="mt-3">
            <Col md={6}>
              <Card className="border-0 bg-light stock-items">
                <Card.Body>
                  <h6 className="text-muted mb-2">
                    <FaBoxes className="me-2" />
                    Stock Item Sales
                  </h6>
                  <p className="mb-1">Revenue: <strong>{formatCurrency(salesData.general_sales.revenue)}</strong></p>
                  <p className="mb-1">Cost: <strong>{formatCurrency(salesData.general_sales.cost)}</strong></p>
                  <p className="mb-1">Profit: <strong className="text-success">{formatCurrency(salesData.general_sales.profit)}</strong></p>
                  <p className="mb-1">GP: <Badge bg="success">{formatPercentage(salesData.general_sales.gp_percentage)}</Badge></p>
                  <p className="mb-0">Count: <strong>{salesData.general_sales.count}</strong></p>
                </Card.Body>
              </Card>
            </Col>

            {includeCocktails && (
              <Col md={6}>
                <Card className="border-0 bg-light cocktails">
                  <Card.Body>
                    <h6 className="text-muted mb-2">
                      <FaCocktail className="me-2" />
                      Cocktail Sales
                      <Badge bg="warning" text="dark" className="ms-2">Separate Tracking</Badge>
                    </h6>
                    <p className="mb-1">Revenue: <strong>{formatCurrency(salesData.cocktail_sales.revenue)}</strong></p>
                    <p className="mb-1">Cost: <strong>{formatCurrency(salesData.cocktail_sales.cost)}</strong></p>
                    <p className="mb-1">Profit: <strong className="text-success">{formatCurrency(salesData.cocktail_sales.profit)}</strong></p>
                    <p className="mb-1">GP: <Badge bg="success">{formatPercentage(salesData.cocktail_sales.gp_percentage)}</Badge></p>
                    <p className="mb-0">Count: <strong>{salesData.cocktail_sales.count}</strong></p>
                  </Card.Body>
                </Card>
              </Col>
            )}
          </Row>
        </Card.Body>
      </Card>

      {/* Category Performance Table */}
      {salesData.category_breakdown && salesData.category_breakdown.length > 0 && (
        <Card>
          <Card.Header className="bg-light">
            <h5 className="mb-0">Category Performance</h5>
          </Card.Header>
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Category</th>
                  <th className="text-end">Revenue</th>
                  <th className="text-end">Cost</th>
                  <th className="text-end">Profit</th>
                  <th className="text-end">GP%</th>
                  <th className="text-end">Count</th>
                </tr>
              </thead>
              <tbody>
                {salesData.category_breakdown.map((cat, index) => (
                  <tr 
                    key={cat.category_code}
                    className={cat.category_code === 'COCKTAILS' ? 'table-warning' : ''}
                  >
                    <td>
                      <strong>{cat.category_name}</strong>
                      <Badge 
                        bg={cat.category_code === 'COCKTAILS' ? 'warning' : 'secondary'} 
                        text={cat.category_code === 'COCKTAILS' ? 'dark' : 'light'}
                        className="ms-2"
                      >
                        {cat.category_code}
                      </Badge>
                    </td>
                    <td className="text-end">{formatCurrency(cat.revenue)}</td>
                    <td className="text-end">{formatCurrency(cat.cost)}</td>
                    <td className="text-end text-success">
                      <strong>{formatCurrency(cat.profit)}</strong>
                    </td>
                    <td className="text-end">
                      <Badge bg="success">{formatPercentage(cat.gp_percentage)}</Badge>
                    </td>
                    <td className="text-end">{cat.count}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      {/* Info Note */}
      <Alert variant="info" className="mt-3 mb-0">
        <strong>💡 Note:</strong> Cocktails are tracked separately from stock inventory. 
        This combined view is for reporting and analysis only. Stocktake calculations use stock items only.
      </Alert>

      {/* Styling */}
      <style jsx>{`
        .stock-items {
          border-left: 4px solid #4ECDC4 !important;
        }
        .cocktails {
          border-left: 4px solid #FF6B6B !important;
        }
        .breakdown-bar {
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
};

export default SalesDashboard;

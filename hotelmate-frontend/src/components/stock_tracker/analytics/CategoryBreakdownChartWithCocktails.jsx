// src/components/stock_tracker/analytics/CategoryBreakdownChartWithCocktails.jsx
import React, { useState, useEffect } from 'react';
import { Card, Form, Row, Col, Alert, Table, Spinner, Badge } from 'react-bootstrap';
import { FaChartPie, FaCocktail, FaBoxes } from 'react-icons/fa';
import UniversalChart from '../charts/UniversalChart';
import ChartErrorBoundary from '../charts/ChartErrorBoundary';
import ChartEmptyState from '../charts/ChartEmptyState';
import { getSalesAnalysis, formatCurrency } from '@/services/stockAnalytics';

/**
 * CategoryBreakdownChartWithCocktails
 * 
 * Enhanced version of CategoryBreakdownChart that includes COCKTAILS category
 * alongside D, B, S, W, M stock categories. Uses sales-analysis endpoint.
 * 
 * Visual distinction: Stock categories in blue/green tones, Cocktails in orange/red
 */
const CategoryBreakdownChartWithCocktails = ({ 
  hotelSlug, 
  periodId,
  height = 400,
  onCategoryClick = null,
  defaultChartType = 'pie', // 'pie' or 'donut'
  includeCocktails = true
}) => {
  
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState(defaultChartType);
  const [salesData, setSalesData] = useState(null);
  const [categoryDetails, setCategoryDetails] = useState([]);
  const [showCocktails, setShowCocktails] = useState(includeCocktails);

  useEffect(() => {
    if (hotelSlug && periodId) {
      fetchData();
    }
  }, [hotelSlug, periodId, showCocktails]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getSalesAnalysis(hotelSlug, periodId, {
        includeCocktails: showCocktails,
        includeCategoryBreakdown: true
      });
      
      setSalesData(data);
      
      // Transform category breakdown to chart data
      const transformedData = transformToChartData(data.category_breakdown || []);
      setChartData(transformedData);
      setCategoryDetails(data.category_breakdown || []);
    } catch (err) {
      console.error('Failed to fetch category breakdown:', err);
      setError(err.message || 'Failed to load category breakdown');
    } finally {
      setLoading(false);
    }
  };

  const transformToChartData = (categories) => {
    if (!categories || categories.length === 0) {
      return null;
    }

    // Color scheme: Stock categories in blue/teal, Cocktails in orange/red
    const colorMap = {
      'D': '#3498db', // Blue for Draught
      'B': '#2ecc71', // Green for Bottled
      'S': '#9b59b6', // Purple for Spirits
      'W': '#e74c3c', // Red for Wine
      'M': '#95a5a6', // Gray for Miscellaneous
      'COCKTAILS': '#ff6b6b' // Distinct orange-red for Cocktails
    };

    const dataPoints = categories.map(cat => ({
      name: cat.category_name,
      value: cat.revenue,
      itemColor: colorMap[cat.category_code] || '#34495e',
      category_code: cat.category_code,
      count: cat.count,
      cost: cat.cost,
      profit: cat.profit,
      gp_percentage: cat.gp_percentage
    }));

    return {
      series: [{
        name: 'Revenue',
        type: chartType === 'donut' ? 'pie' : 'pie',
        data: dataPoints,
        radius: chartType === 'donut' ? ['40%', '70%'] : '70%',
        label: {
          show: true,
          formatter: '{b}: {d}%'
        },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    };
  };

  const handleChartClick = (params) => {
    if (onCategoryClick && params.data) {
      onCategoryClick({
        category: params.data.category_code,
        name: params.data.name,
        value: params.data.value
      });
    }
  };

  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(2)}%`;
  };

  const getTotalRevenue = () => {
    return categoryDetails.reduce((sum, cat) => sum + (cat.revenue || 0), 0);
  };

  if (loading) {
    return (
      <Card>
        <Card.Body className="text-center p-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-2 text-muted">Loading category breakdown...</p>
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Card.Body>
          <Alert variant="danger">
            <Alert.Heading>Error Loading Data</Alert.Heading>
            {error}
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  if (!chartData || categoryDetails.length === 0) {
    return (
      <Card>
        <Card.Body>
          <ChartEmptyState message="No category data available" />
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="category-breakdown-chart">
      {/* Header */}
      <Card.Header className="bg-light d-flex justify-content-between align-items-center">
        <div>
          <h5 className="mb-1">
            <FaChartPie className="me-2" />
            Category Revenue Breakdown
          </h5>
          {salesData && (
            <small className="text-muted">
              {salesData.period_name} ({new Date(salesData.period_start).toLocaleDateString()} - {new Date(salesData.period_end).toLocaleDateString()})
            </small>
          )}
        </div>
        <div className="d-flex gap-2">
          <Form.Check
            type="switch"
            id="toggle-cocktails-category"
            label={<span className="small">Include Cocktails</span>}
            checked={showCocktails}
            onChange={(e) => setShowCocktails(e.target.checked)}
          />
          <Form.Select
            size="sm"
            value={chartType}
            onChange={(e) => setChartType(e.target.value)}
            style={{ width: '120px' }}
          >
            <option value="pie">Pie Chart</option>
            <option value="donut">Donut Chart</option>
          </Form.Select>
        </div>
      </Card.Header>

      {/* Chart */}
      <Card.Body>
        <ChartErrorBoundary>
          <UniversalChart
            data={chartData}
            height={height}
            onChartClick={handleChartClick}
          />
        </ChartErrorBoundary>

        {/* Summary Stats */}
        {salesData && (
          <Row className="mt-4 pt-3 border-top">
            <Col md={4} className="text-center">
              <div className="text-muted small">Total Revenue</div>
              <h5 className="text-primary mb-0">{formatCurrency(getTotalRevenue())}</h5>
            </Col>
            <Col md={4} className="text-center">
              <div className="text-muted small">Combined GP%</div>
              <h5 className="text-success mb-0">
                {formatPercentage(salesData.combined_sales.gp_percentage)}
              </h5>
            </Col>
            <Col md={4} className="text-center">
              <div className="text-muted small">Categories</div>
              <h5 className="text-info mb-0">{categoryDetails.length}</h5>
            </Col>
          </Row>
        )}

        {/* Category Details Table */}
        <div className="mt-4">
          <h6 className="text-muted mb-3">Category Details</h6>
          <Table responsive hover size="sm" className="mb-0">
            <thead className="table-light">
              <tr>
                <th>Category</th>
                <th className="text-end">Revenue</th>
                <th className="text-end">%</th>
                <th className="text-end">Cost</th>
                <th className="text-end">Profit</th>
                <th className="text-end">GP%</th>
                <th className="text-end">Count</th>
              </tr>
            </thead>
            <tbody>
              {categoryDetails
                .sort((a, b) => b.revenue - a.revenue)
                .map((cat, index) => {
                  const totalRevenue = getTotalRevenue();
                  const percentage = totalRevenue > 0 ? (cat.revenue / totalRevenue * 100) : 0;
                  const isCocktail = cat.category_code === 'COCKTAILS';
                  
                  return (
                    <tr 
                      key={cat.category_code}
                      className={isCocktail ? 'table-warning' : ''}
                      style={{ cursor: onCategoryClick ? 'pointer' : 'default' }}
                      onClick={() => onCategoryClick && onCategoryClick({
                        category: cat.category_code,
                        name: cat.category_name,
                        value: cat.revenue
                      })}
                    >
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div 
                            style={{
                              width: '12px',
                              height: '12px',
                              borderRadius: '3px',
                              backgroundColor: chartData.series[0].data[index]?.itemColor || '#ccc'
                            }}
                          />
                          <strong>{cat.category_name}</strong>
                          <Badge 
                            bg={isCocktail ? 'warning' : 'secondary'} 
                            text={isCocktail ? 'dark' : 'light'}
                          >
                            {cat.category_code}
                          </Badge>
                          {isCocktail && (
                            <FaCocktail className="text-warning" title="Separate tracking" />
                          )}
                          {!isCocktail && (
                            <FaBoxes className="text-muted" title="Stock items" />
                          )}
                        </div>
                      </td>
                      <td className="text-end">
                        <strong>{formatCurrency(cat.revenue)}</strong>
                      </td>
                      <td className="text-end">
                        <Badge bg="light" text="dark">{percentage.toFixed(1)}%</Badge>
                      </td>
                      <td className="text-end">{formatCurrency(cat.cost)}</td>
                      <td className="text-end text-success">
                        <strong>{formatCurrency(cat.profit)}</strong>
                      </td>
                      <td className="text-end">
                        <Badge bg="success">{formatPercentage(cat.gp_percentage)}</Badge>
                      </td>
                      <td className="text-end">{cat.count}</td>
                    </tr>
                  );
                })}
            </tbody>
            <tfoot className="table-secondary">
              <tr>
                <th>TOTAL</th>
                <th className="text-end">{formatCurrency(getTotalRevenue())}</th>
                <th className="text-end">100%</th>
                <th className="text-end">
                  {formatCurrency(categoryDetails.reduce((sum, cat) => sum + cat.cost, 0))}
                </th>
                <th className="text-end text-success">
                  <strong>
                    {formatCurrency(categoryDetails.reduce((sum, cat) => sum + cat.profit, 0))}
                  </strong>
                </th>
                <th className="text-end">
                  <Badge bg="success">
                    {salesData && formatPercentage(salesData.combined_sales.gp_percentage)}
                  </Badge>
                </th>
                <th className="text-end">
                  {categoryDetails.reduce((sum, cat) => sum + cat.count, 0)}
                </th>
              </tr>
            </tfoot>
          </Table>
        </div>

        {/* Info Note */}
        {showCocktails && (
          <Alert variant="info" className="mt-3 mb-0">
            <small>
              <strong>💡 Note:</strong> Cocktails (orange) are tracked separately from stock inventory items (blue/green tones). 
              This combined view is for analysis only.
            </small>
          </Alert>
        )}
      </Card.Body>

      {/* Styling */}
      <style jsx>{`
        .category-breakdown-chart tbody tr:hover {
          background-color: rgba(0, 0, 0, 0.02);
        }
      `}</style>
    </Card>
  );
};

export default CategoryBreakdownChartWithCocktails;

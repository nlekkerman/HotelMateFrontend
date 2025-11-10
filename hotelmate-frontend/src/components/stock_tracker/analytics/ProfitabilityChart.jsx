import React, { useState, useEffect } from 'react';
import { Card, Form, Row, Col, Alert, Badge, Spinner } from 'react-bootstrap';
import { FaChartBar, FaPercentage, FaMoneyBillWave } from 'react-icons/fa';
import UniversalChart from '../charts/UniversalChart';
import ChartErrorBoundary from '../charts/ChartErrorBoundary';
import ChartEmptyState from '../charts/ChartEmptyState';
import { getProfitabilityData, formatCurrency } from '@/services/stockAnalytics';

const ProfitabilityChart = ({ 
  hotelSlug, 
  period,
  height = 400,
  onItemClick = null,
  defaultView = 'category' // 'category' or 'item'
}) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState(defaultView);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [metricType, setMetricType] = useState('gp_percentage'); // 'gp_percentage', 'markup_percentage', 'pour_cost'
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (hotelSlug && period) {
      fetchData();
    }
  }, [hotelSlug, period, view, selectedCategory, metricType]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Note: getProfitabilityData doesn't accept period parameter - uses current data
      const data = await getProfitabilityData(hotelSlug, selectedCategory !== 'all' ? selectedCategory : undefined);
      
      // API returns array of items directly
      const itemsList = Array.isArray(data) ? data : [];
      
      // Group by category for summary
      const summary = calculateSummary(itemsList);
      setSummary(summary);
      
      const transformedData = transformToChartData({ by_category: summary?.by_category || [], by_item: itemsList }, view, selectedCategory, metricType);
      setChartData(transformedData);
    } catch (err) {
      console.error('Failed to fetch profitability data:', err);
      setError(err.message || 'Failed to load profitability data');
    } finally {
      setLoading(false);
    }
  };

  const calculateSummary = (items) => {
    if (!items || items.length === 0) return null;
    
    let totalGP = 0;
    let totalMarkup = 0;
    let totalGrossProfit = 0;
    let count = 0;
    
    items.forEach(item => {
      totalGP += parseFloat(item.gross_profit_percentage || 0);
      totalMarkup += parseFloat(item.markup_percentage || 0);
      totalGrossProfit += parseFloat(item.total_stock_value || 0) * (parseFloat(item.gross_profit_percentage || 0) / 100);
      count++;
    });
    
    return {
      average_gp_percentage: count > 0 ? (totalGP / count).toFixed(2) : 0,
      average_markup_percentage: count > 0 ? (totalMarkup / count).toFixed(2) : 0,
      total_gross_profit: totalGrossProfit.toFixed(2),
      by_category: groupItemsByCategory(items)
    };
  };
  
  const groupItemsByCategory = (items) => {
    const categoryMap = {};
    
    items.forEach(item => {
      const cat = item.category_name || item.category || 'Unknown';
      if (!categoryMap[cat]) {
        categoryMap[cat] = {
          category: cat,
          items: [],
          total_gp: 0,
          count: 0
        };
      }
      categoryMap[cat].items.push(item);
      categoryMap[cat].total_gp += parseFloat(item.gross_profit_percentage || 0);
      categoryMap[cat].count++;
    });
    
    return Object.values(categoryMap).map(cat => ({
      category: cat.category,
      gp_percentage: (cat.total_gp / cat.count).toFixed(2),
      markup_percentage: (cat.items.reduce((sum, item) => sum + parseFloat(item.markup_percentage || 0), 0) / cat.count).toFixed(2),
      pour_cost: (100 - (cat.total_gp / cat.count)).toFixed(2)
    }));
  };

  const transformToChartData = (data, currentView, category, metric) => {
    let sourceData;
    
    if (currentView === 'category') {
      sourceData = data.by_category || [];
    } else {
      // Filter items by category if selected
      sourceData = data.by_item || [];
      if (category && category !== 'all') {
        sourceData = sourceData.filter(item => item.category === category || item.category_name === category);
      }
    }

    if (!sourceData || sourceData.length === 0) {
      return null;
    }

    const labels = sourceData.map(item => 
      currentView === 'category' ? item.category : (item.item_name || item.name)
    );

    const metricData = sourceData.map(item => {
      switch(metric) {
        case 'gp_percentage':
          return parseFloat(item.gp_percentage || item.gross_profit_percentage || 0);
        case 'markup_percentage':
          return parseFloat(item.markup_percentage || 0);
        case 'pour_cost':
          return parseFloat(item.pour_cost || (100 - parseFloat(item.gp_percentage || item.gross_profit_percentage || 0)) || 0);
        default:
          return 0;
      }
    });

    return {
      labels,
      datasets: [{
        label: getMetricLabel(metric),
        data: metricData,
        backgroundColor: getMetricColor(metric),
        borderColor: getMetricBorderColor(metric),
        borderWidth: 2,
        // Store additional metadata
        costValues: sourceData.map(item => item.cost || 0),
        sellingPrices: sourceData.map(item => item.selling_price || 0),
        grossProfits: sourceData.map(item => item.gross_profit || 0),
      }]
    };
  };

  const getMetricLabel = (metric) => {
    const labels = {
      gp_percentage: 'Gross Profit %',
      markup_percentage: 'Markup %',
      pour_cost: 'Pour Cost %'
    };
    return labels[metric] || 'Value';
  };

  const getMetricColor = (metric) => {
    const colors = {
      gp_percentage: 'rgba(75, 192, 192, 0.6)',
      markup_percentage: 'rgba(54, 162, 235, 0.6)',
      pour_cost: 'rgba(255, 99, 132, 0.6)'
    };
    return colors[metric] || 'rgba(153, 102, 255, 0.6)';
  };

  const getMetricBorderColor = (metric) => {
    const colors = {
      gp_percentage: 'rgb(75, 192, 192)',
      markup_percentage: 'rgb(54, 162, 235)',
      pour_cost: 'rgb(255, 99, 132)'
    };
    return colors[metric] || 'rgb(153, 102, 255)';
  };

  const handleChartClick = (dataIndex) => {
    if (onItemClick && chartData) {
      const label = chartData.labels[dataIndex];
      onItemClick({ 
        label, 
        view,
        category: view === 'item' ? selectedCategory : null 
      });
    }
  };

  const getCategories = () => {
    if (!summary || !summary.by_category) return [];
    return summary.by_category.map(cat => cat.category);
  };

  if (loading) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-primary text-white d-flex align-items-center">
          <FaChartBar className="me-2" />
          <span>Profitability Analysis</span>
        </Card.Header>
        <Card.Body className="d-flex justify-content-center align-items-center" style={{ height }}>
          <Spinner animation="border" variant="primary" />
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-primary text-white d-flex align-items-center">
          <FaChartBar className="me-2" />
          <span>Profitability Analysis</span>
        </Card.Header>
        <Card.Body>
          <Alert variant="danger">{error}</Alert>
        </Card.Body>
      </Card>
    );
  }

  if (!chartData) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-primary text-white d-flex align-items-center">
          <FaChartBar className="me-2" />
          <span>Profitability Analysis</span>
        </Card.Header>
        <Card.Body>
          <ChartEmptyState type="no-data" message="No profitability data available for this period" />
        </Card.Body>
      </Card>
    );
  }

  return (
    <ChartErrorBoundary onRetry={fetchData}>
      <Card className="shadow-sm">
        <Card.Header className="bg-primary text-white">
          <Row className="align-items-center">
            <Col>
              <FaChartBar className="me-2" />
              <span>Profitability Analysis</span>
            </Col>
          </Row>
        </Card.Header>
        <Card.Body>
          {/* Summary Stats */}
          {summary && (
            <Alert variant="info" className="mb-3">
              <Row>
                <Col xs={12} md={4}>
                  <FaPercentage className="me-2" />
                  <strong>Avg GP:</strong> {summary.average_gp_percentage}%
                </Col>
                <Col xs={12} md={4}>
                  <FaPercentage className="me-2" />
                  <strong>Avg Markup:</strong> {summary.average_markup_percentage}%
                </Col>
                <Col xs={12} md={4}>
                  <FaMoneyBillWave className="me-2" />
                  <strong>Total GP:</strong> {formatCurrency(summary.total_gross_profit)}
                </Col>
              </Row>
            </Alert>
          )}

          {/* Controls */}
          <Row className="mb-3">
            <Col xs={12} md={4}>
              <Form.Group>
                <Form.Label className="small text-muted mb-1">View</Form.Label>
                <Form.Select 
                  size="sm" 
                  value={view} 
                  onChange={(e) => setView(e.target.value)}
                >
                  <option value="category">By Category</option>
                  <option value="item">By Item</option>
                </Form.Select>
              </Form.Group>
            </Col>

            {view === 'item' && (
              <Col xs={12} md={4}>
                <Form.Group>
                  <Form.Label className="small text-muted mb-1">Category</Form.Label>
                  <Form.Select 
                    size="sm" 
                    value={selectedCategory} 
                    onChange={(e) => setSelectedCategory(e.target.value)}
                  >
                    <option value="all">All Categories</option>
                    {getCategories().map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            )}

            <Col xs={12} md={4}>
              <Form.Group>
                <Form.Label className="small text-muted mb-1">Metric</Form.Label>
                <Form.Select 
                  size="sm" 
                  value={metricType} 
                  onChange={(e) => setMetricType(e.target.value)}
                >
                  <option value="gp_percentage">Gross Profit %</option>
                  <option value="markup_percentage">Markup %</option>
                  <option value="pour_cost">Pour Cost %</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          {/* Chart */}
          <UniversalChart
            type="bar"
            data={chartData}
            config={{
              showLegend: false,
              showGrid: true
            }}
            height={height}
            onDataClick={handleChartClick}
          />

          {/* Info Footer */}
          <div className="mt-3 text-center">
            <small className="text-muted">
              <Badge bg="secondary" className="me-2">GP% = (Selling Price - Cost) / Selling Price × 100</Badge>
              <Badge bg="secondary" className="me-2">Markup% = (Selling Price - Cost) / Cost × 100</Badge>
              <Badge bg="secondary">Pour Cost% = Cost / Selling Price × 100</Badge>
            </small>
          </div>
        </Card.Body>
      </Card>
    </ChartErrorBoundary>
  );
};

export default ProfitabilityChart;

import React, { useState, useEffect } from 'react';
import { Card, Form, Row, Col, Alert, Badge, Spinner, Table } from 'react-bootstrap';
import { FaExclamationTriangle, FaBox } from 'react-icons/fa';
import UniversalChart from '../charts/UniversalChart';
import ChartErrorBoundary from '../charts/ChartErrorBoundary';
import ChartEmptyState from '../charts/ChartEmptyState';
import { getLowStockItems, formatCurrency } from '@/services/stockAnalytics';

const LowStockChart = ({ 
  hotelSlug, 
  period,
  height = 400,
  onItemClick = null,
  servingsThreshold = 50, // Alert when servings below this number
  thresholds = {
    critical: 20,    // < 20 servings = red
    warning: 35,     // 20-35 servings = orange
    caution: 50      // 35-50 servings = yellow
  }
}) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all'); // 'all', 'critical', 'warning', 'caution'
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (hotelSlug) {
      fetchData();
    }
  }, [hotelSlug]);

  useEffect(() => {
    if (items.length > 0) {
      const transformedData = transformToChartData(items, selectedCategory, severityFilter);
      setChartData(transformedData);
    }
  }, [items, selectedCategory, severityFilter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getLowStockItems(hotelSlug, servingsThreshold);
      console.log('Low Stock API Response:', data);
      
      // API returns array of low stock items directly
      const lowStockItems = Array.isArray(data) ? data : [];
      console.log('Low Stock Items Count:', lowStockItems.length);
      
      if (lowStockItems.length === 0) {
        setChartData(null);
        setItems([]);
        setError('Great news! All items have sufficient stock levels.');
        return;
      }

      // Add severity level to each item based on servings remaining
      const itemsWithSeverity = lowStockItems.map(item => {
        const servingsRemaining = parseFloat(item.total_stock_in_servings || 0);
        const parLevel = parseFloat(item.par_level || servingsThreshold);
        const stockPercentage = parLevel > 0 ? (servingsRemaining / parLevel) * 100 : 0;
        
        return {
          ...item,
          current_stock: servingsRemaining,
          par_level: parLevel,
          servings_remaining: servingsRemaining,
          stock_percentage: stockPercentage,
          item_name: item.name,
          category: item.category_name || getCategoryName(item.category),
          severity: getSeverity(servingsRemaining),
          color: getSeverityColor(servingsRemaining)
        };
      });

      setItems(itemsWithSeverity);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(itemsWithSeverity.map(item => item.category))];
      setCategories(uniqueCategories);

    } catch (err) {
      console.error('Failed to fetch low stock items:', err);
      setError(err.message || 'Failed to load low stock items');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryName = (categoryCode) => {
    const categoryMap = {
      'S': 'Spirits',
      'W': 'Wine',
      'B': 'Bottled Beer',
      'D': 'Draught Beer',
      'M': 'Minerals & Syrups'
    };
    return categoryMap[categoryCode] || categoryCode;
  };

  const getSeverity = (servings) => {
    if (servings < thresholds.critical) return 'critical';
    if (servings < thresholds.warning) return 'warning';
    if (servings < thresholds.caution) return 'caution';
    return 'ok';
  };

  const getSeverityColor = (servings) => {
    if (servings < thresholds.critical) return 'rgba(255, 99, 132, 0.7)'; // Red
    if (servings < thresholds.warning) return 'rgba(255, 159, 64, 0.7)'; // Orange
    if (servings < thresholds.caution) return 'rgba(255, 206, 86, 0.7)'; // Yellow
    return 'rgba(75, 192, 192, 0.7)'; // Green
  };

  const transformToChartData = (allItems, category, severity) => {
    let filteredItems = [...allItems];

    // Filter by category
    if (category && category !== 'all') {
      filteredItems = filteredItems.filter(item => item.category === category);
    }

    // Filter by severity
    if (severity && severity !== 'all') {
      filteredItems = filteredItems.filter(item => item.severity === severity);
    }

    if (filteredItems.length === 0) {
      return null;
    }

    // Sort by servings remaining (lowest first)
    filteredItems.sort((a, b) => a.servings_remaining - b.servings_remaining);

    // Limit to top 15 for readability
    const topItems = filteredItems.slice(0, 15);

    const labels = topItems.map(item => item.item_name);
    const percentages = topItems.map(item => item.stock_percentage);
    const colors = topItems.map(item => item.color);

    return {
      labels,
      datasets: [{
        label: 'Stock Level %',
        data: percentages,
        backgroundColor: colors,
        borderColor: colors.map(c => c.replace('0.7', '1')),
        borderWidth: 2,
        // Store metadata
        servingsRemaining: topItems.map(item => item.servings_remaining || 0),
        parLevel: topItems.map(item => item.par_level || servingsThreshold),
        categories: topItems.map(item => item.category),
        severities: topItems.map(item => item.severity)
      }]
    };
  };

  const handleChartClick = (dataIndex) => {
    if (onItemClick && chartData) {
      const itemName = chartData.labels[dataIndex];
      const item = items.find(i => i.item_name === itemName);
      if (item) {
        onItemClick(item);
      }
    }
  };

  const getSeverityBadge = (severity) => {
    const badges = {
      critical: <Badge bg="danger">Critical</Badge>,
      warning: <Badge bg="warning" text="dark">Warning</Badge>,
      caution: <Badge bg="info">Caution</Badge>,
      ok: <Badge bg="success">OK</Badge>
    };
    return badges[severity] || <Badge bg="secondary">Unknown</Badge>;
  };

  const getSeverityCounts = () => {
    return {
      critical: items.filter(i => i.severity === 'critical').length,
      warning: items.filter(i => i.severity === 'warning').length,
      caution: items.filter(i => i.severity === 'caution').length,
      total: items.length
    };
  };

  if (loading) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-warning text-dark d-flex align-items-center">
          <FaExclamationTriangle className="me-2" />
          <span>Low Stock Alert</span>
        </Card.Header>
        <Card.Body className="d-flex justify-content-center align-items-center" style={{ height }}>
          <Spinner animation="border" variant="warning" />
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-warning text-dark d-flex align-items-center">
          <FaExclamationTriangle className="me-2" />
          <span>Low Stock Alert</span>
        </Card.Header>
        <Card.Body>
          <Alert variant="danger">{error}</Alert>
        </Card.Body>
      </Card>
    );
  }

  if (items.length === 0 && !error) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-warning text-dark d-flex align-items-center">
          <FaExclamationTriangle className="me-2" />
          <span>Low Stock Alert</span>
        </Card.Header>
        <Card.Body>
          <ChartEmptyState 
            type="no-data" 
            message="Great news! No items are currently below their par levels." 
          />
        </Card.Body>
      </Card>
    );
  }

  if (!chartData) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-warning text-dark d-flex align-items-center">
          <FaExclamationTriangle className="me-2" />
          <span>Low Stock Alert</span>
        </Card.Header>
        <Card.Body>
          <ChartEmptyState type="no-data" message="No items match the selected filters" />
        </Card.Body>
      </Card>
    );
  }

  const counts = getSeverityCounts();

  return (
    <ChartErrorBoundary onRetry={fetchData}>
      <Card className="shadow-sm">
        <Card.Header className="bg-warning text-dark">
          <Row className="align-items-center">
            <Col>
              <FaExclamationTriangle className="me-2" />
              <span>Low Stock Alert</span>
              <Badge bg="danger" className="ms-2">{counts.total}</Badge>
            </Col>
          </Row>
        </Card.Header>
        <Card.Body>
          {/* Summary Stats */}
          <Alert variant="warning" className="mb-3">
            <Row>
              <Col xs={6} md={3}>
                <Badge bg="danger" className="me-1">{counts.critical}</Badge>
                <strong>Critical</strong><br />
                <small>{'<'}{thresholds.critical} servings</small>
              </Col>
              <Col xs={6} md={3}>
                <Badge bg="warning" text="dark" className="me-1">{counts.warning}</Badge>
                <strong>Warning</strong><br />
                <small>{thresholds.critical}-{thresholds.warning} servings</small>
              </Col>
              <Col xs={6} md={3}>
                <Badge bg="info" className="me-1">{counts.caution}</Badge>
                <strong>Caution</strong><br />
                <small>{thresholds.warning}-{thresholds.caution} servings</small>
              </Col>
              <Col xs={6} md={3}>
                <FaBox className="me-1" />
                <strong>Total Items</strong><br />
                <small>{counts.total} below par</small>
              </Col>
            </Row>
          </Alert>

          {/* Controls */}
          <Row className="mb-3">
            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label className="small text-muted mb-1">Category</Form.Label>
                <Form.Select 
                  size="sm" 
                  value={selectedCategory} 
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12} md={6}>
              <Form.Group>
                <Form.Label className="small text-muted mb-1">Severity</Form.Label>
                <Form.Select 
                  size="sm" 
                  value={severityFilter} 
                  onChange={(e) => setSeverityFilter(e.target.value)}
                >
                  <option value="all">All Levels</option>
                  <option value="critical">Critical Only</option>
                  <option value="warning">Warning Only</option>
                  <option value="caution">Caution Only</option>
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>

          {/* Low Stock Items List with Progress Bars */}
          <div className="border rounded p-2" style={{ maxHeight: height, overflowY: 'auto' }}>
            {chartData.labels.map((itemName, index) => {
              const servings = chartData.datasets[0].data[index];
              const threshold = chartData.datasets[0].parLevel[index];
              const percentage = parseFloat(((servings / threshold) * 100).toFixed(1));
              const severity = chartData.datasets[0].severities[index];
              const color = chartData.datasets[0].backgroundColor[index];
              
              // Determine bar variant based on severity
              const barVariant = 
                severity === 'critical' ? 'danger' : 
                severity === 'warning' ? 'warning' : 
                severity === 'caution' ? 'info' : 'success';
              
              return (
                <div 
                  key={index} 
                  className="p-2 border-bottom"
                  style={{ cursor: onItemClick ? 'pointer' : 'default' }}
                  onClick={() => handleChartClick(index)}
                >
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <strong>{itemName}</strong>
                    <span style={{ color: color.replace('0.7', '1'), fontWeight: 'bold' }}>
                      {percentage}%
                    </span>
                  </div>
                  <div className="progress mb-1" style={{ height: '20px' }}>
                    <div 
                      className={`progress-bar bg-${barVariant}`}
                      role="progressbar" 
                      style={{ width: `${Math.min(percentage, 100)}%` }}
                      aria-valuenow={percentage} 
                      aria-valuemin="0" 
                      aria-valuemax="100"
                    >
                      {percentage > 10 && `${percentage}%`}
                    </div>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <small className="text-muted">
                      {servings.toFixed(1)} / {threshold} servings
                    </small>
                    <small className={
                      severity === 'critical' ? 'text-danger' : 
                      severity === 'warning' ? 'text-warning' : 
                      severity === 'caution' ? 'text-info' : 'text-muted'
                    }>
                      {severity.toUpperCase()}
                    </small>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Detailed Table */}
          <div className="mt-3" style={{ maxHeight: '250px', overflowY: 'auto' }}>
            <Table striped bordered hover size="sm">
              <thead className="sticky-top bg-light">
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th className="text-end">Servings</th>
                  <th className="text-end">Threshold</th>
                  <th className="text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {items
                  .filter(item => {
                    if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
                    if (severityFilter !== 'all' && item.severity !== severityFilter) return false;
                    return true;
                  })
                  .sort((a, b) => a.servings_remaining - b.servings_remaining)
                  .map((item, idx) => (
                    <tr 
                      key={idx}
                      style={{ cursor: onItemClick ? 'pointer' : 'default' }}
                      onClick={() => onItemClick && onItemClick(item)}
                    >
                      <td>{item.item_name}</td>
                      <td>{item.category}</td>
                      <td className="text-end">{item.servings_remaining?.toFixed(1) || 0}</td>
                      <td className="text-end">{item.par_level || servingsThreshold}</td>
                      <td className="text-center">{getSeverityBadge(item.severity)}</td>
                    </tr>
                  ))}
              </tbody>
            </Table>
          </div>

          {/* Info Footer */}
          <div className="mt-3 text-center">
            <small className="text-muted">
              Showing items with less than {servingsThreshold} servings remaining. Servings = total stock that can be served to customers.
            </small>
          </div>
        </Card.Body>
      </Card>
    </ChartErrorBoundary>
  );
};

export default LowStockChart;

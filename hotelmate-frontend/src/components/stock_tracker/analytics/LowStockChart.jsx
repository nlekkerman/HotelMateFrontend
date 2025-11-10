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
  thresholds = {
    critical: 50,    // < 50% = red
    warning: 80,     // 50-80% = orange
    caution: 100     // 80-100% = yellow
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

      const data = await getLowStockItems(hotelSlug);
      console.log('Low Stock API Response:', data);
      console.log('Is Array?', Array.isArray(data));
      console.log('Data type:', typeof data);
      
      // API returns array of items, not {items: [...]}
      const itemsList = Array.isArray(data) ? data : (data.items || []);
      console.log('Items List:', itemsList);
      console.log('Items List Length:', itemsList.length);
      
      // Filter for low stock items (items below par level)
      const lowStockItems = itemsList.filter(item => {
        const currentStock = parseFloat(item.current_full_units || 0) + parseFloat(item.current_partial_units || 0);
        const parLevel = parseFloat(item.par_level || 0);
        const isBelowPar = parLevel > 0 && currentStock < parLevel;
        
        // Log first few items to see par levels
        if (itemsList.indexOf(item) < 5) {
          console.log(`Item: ${item.name}, Current: ${currentStock}, Par: ${parLevel}, Below Par: ${isBelowPar}`);
        }
        
        return isBelowPar;
      });
      
      const itemsWithParLevels = itemsList.filter(i => parseFloat(i.par_level || 0) > 0).length;
      console.log('Total items with par levels:', itemsWithParLevels);
      console.log('Items below par level:', lowStockItems.length);
      
      if (lowStockItems.length === 0) {
        setChartData(null);
        setItems([]);
        // Set appropriate error message based on whether par levels are configured
        if (itemsWithParLevels === 0) {
          setError('No par levels configured. Please set par levels for your items to track low stock.');
        }
        return;
      }

      // Add severity level to each item and calculate stock percentage
      const itemsWithSeverity = lowStockItems.map(item => {
        const currentStock = parseFloat(item.current_full_units || 0) + parseFloat(item.current_partial_units || 0);
        const parLevel = parseFloat(item.par_level || 0);
        const stockPercentage = parLevel > 0 ? (currentStock / parLevel) * 100 : 0;
        
        return {
          ...item,
          current_stock: currentStock,
          par_level: parLevel,
          stock_percentage: stockPercentage,
          item_name: item.name,
          category: item.category_name || item.category,
          severity: getSeverity(stockPercentage),
          color: getSeverityColor(stockPercentage)
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

  const getSeverity = (percentage) => {
    if (percentage < thresholds.critical) return 'critical';
    if (percentage < thresholds.warning) return 'warning';
    if (percentage < thresholds.caution) return 'caution';
    return 'ok';
  };

  const getSeverityColor = (percentage) => {
    if (percentage < thresholds.critical) return 'rgba(255, 99, 132, 0.7)'; // Red
    if (percentage < thresholds.warning) return 'rgba(255, 159, 64, 0.7)'; // Orange
    if (percentage < thresholds.caution) return 'rgba(255, 206, 86, 0.7)'; // Yellow
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

    // Sort by stock percentage (lowest first)
    filteredItems.sort((a, b) => a.stock_percentage - b.stock_percentage);

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
        currentStock: topItems.map(item => item.current_stock || 0),
        parLevel: topItems.map(item => item.par_level || 0),
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
                <small>{'<'}50% stock</small>
              </Col>
              <Col xs={6} md={3}>
                <Badge bg="warning" text="dark" className="me-1">{counts.warning}</Badge>
                <strong>Warning</strong><br />
                <small>50-80% stock</small>
              </Col>
              <Col xs={6} md={3}>
                <Badge bg="info" className="me-1">{counts.caution}</Badge>
                <strong>Caution</strong><br />
                <small>80-100% stock</small>
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

          {/* Chart */}
          <UniversalChart
            type="bar"
            data={chartData}
            config={{
              indexAxis: 'y', // Horizontal bars
              xKey: 'item',
              bars: [{
                dataKey: 'percentage',
                name: 'Stock Level %',
                fill: 'rgba(255, 159, 64, 0.7)'
              }],
              showLegend: false,
              tooltipFormatter: (value, name, props) => {
                const dataset = chartData.datasets[0];
                const index = props.index;
                return [
                  `${chartData.labels[index]}`,
                  `Stock Level: ${value.toFixed(1)}%`,
                  `Current: ${dataset.currentStock[index]}`,
                  `Par Level: ${dataset.parLevel[index]}`,
                  `Category: ${dataset.categories[index]}`,
                  `Status: ${dataset.severities[index].toUpperCase()}`
                ].join('\n');
              }
            }}
            height={height}
            onDataClick={handleChartClick}
          />

          {/* Detailed Table */}
          <div className="mt-3" style={{ maxHeight: '250px', overflowY: 'auto' }}>
            <Table striped bordered hover size="sm">
              <thead className="sticky-top bg-light">
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th className="text-end">Current</th>
                  <th className="text-end">Par Level</th>
                  <th className="text-end">%</th>
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
                  .sort((a, b) => a.stock_percentage - b.stock_percentage)
                  .map((item, idx) => (
                    <tr 
                      key={idx}
                      style={{ cursor: onItemClick ? 'pointer' : 'default' }}
                      onClick={() => onItemClick && onItemClick(item)}
                    >
                      <td>{item.item_name}</td>
                      <td>{item.category}</td>
                      <td className="text-end">{item.current_stock || 0}</td>
                      <td className="text-end">{item.par_level || 0}</td>
                      <td className="text-end">{item.stock_percentage.toFixed(1)}%</td>
                      <td className="text-center">{getSeverityBadge(item.severity)}</td>
                    </tr>
                  ))}
              </tbody>
            </Table>
          </div>

          {/* Info Footer */}
          <div className="mt-3 text-center">
            <small className="text-muted">
              Stock Level % = (Current Stock / Par Level) × 100
            </small>
          </div>
        </Card.Body>
      </Card>
    </ChartErrorBoundary>
  );
};

export default LowStockChart;

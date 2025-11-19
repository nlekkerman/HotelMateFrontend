import React, { useState, useEffect } from 'react';
import { Card, Form, Row, Col, Alert, Badge, Spinner, Table, Button } from 'react-bootstrap';
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
  const [selectedCategory, setSelectedCategory] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all'); // 'all', 'critical', 'warning', 'caution'
  const [categories, setCategories] = useState([]);
  const [categorySummary, setCategorySummary] = useState(null);
  const [loadingItems, setLoadingItems] = useState(false);
  const [showAllItems, setShowAllItems] = useState(false);

  // Initial load: fetch category summary on mount
  useEffect(() => {
    if (hotelSlug && period) {
      console.log('🔄 Fetching low stock data for current period:', period);
      fetchCategorySummary();
    }
  }, [hotelSlug, period]);

  // Load items when category is selected
  useEffect(() => {
    if (selectedCategory && selectedCategory !== '' && period) {
      fetchItemsForCategory(selectedCategory);
    } else {
      setItems([]);
      setChartData(null);
    }
  }, [selectedCategory, period]);

  // Update chart when items or filters change
  useEffect(() => {
    if (items.length > 0) {
      const transformedData = transformToChartData(items, severityFilter);
      setChartData(transformedData);
    }
  }, [items, severityFilter]);



  // Fetch category summary (counts per category)
  const fetchCategorySummary = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getLowStockItems(hotelSlug, servingsThreshold, period);
      console.log('📦 Low Stock API Response for Period:', period, data);
      
      // API returns array of low stock items directly
      const lowStockItems = Array.isArray(data) ? data : [];
      console.log('📊 Low Stock Items Count:', lowStockItems.length);
      console.log('🔍 Period ID being used:', period);
      
      if (lowStockItems.length === 0) {
        setError('Great news! All items have sufficient stock levels.');
        setCategorySummary(null);
        setCategories([]);
        return;
      }

      // Group items by category and count
      const categoryGroups = {};
      lowStockItems.forEach(item => {
        const categoryName = item.category_name || getCategoryName(item.category);
        if (!categoryGroups[categoryName]) {
          categoryGroups[categoryName] = {
            count: 0,
            critical: 0,
            warning: 0,
            caution: 0
          };
        }
        categoryGroups[categoryName].count++;
        
        // Calculate severity using physical units
        const currentStock = parseFloat(item.total_stock_in_physical_units || 0);
        const threshold = parseFloat(item.low_stock_threshold || 0);
        const severity = getSeverity(currentStock, threshold);
        
        if (severity === 'critical') categoryGroups[categoryName].critical++;
        else if (severity === 'warning') categoryGroups[categoryName].warning++;
        else if (severity === 'caution') categoryGroups[categoryName].caution++;
      });

      setCategorySummary(categoryGroups);
      setCategories(Object.keys(categoryGroups));

    } catch (err) {
      console.error('Failed to fetch low stock summary:', err);
      setError(err.message || 'Failed to load low stock data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch items for a specific category
  const fetchItemsForCategory = async (category) => {
    try {
      setLoadingItems(true);

      const data = await getLowStockItems(hotelSlug, servingsThreshold, period);
      const lowStockItems = Array.isArray(data) ? data : [];
      
      // Filter by selected category
      const filteredItems = lowStockItems.filter(item => {
        const itemCategory = item.category_name || getCategoryName(item.category);
        return itemCategory === category;
      });

      // Add severity level to each item
      const itemsWithSeverity = filteredItems.map(item => {
        const categoryName = item.category_name || getCategoryName(item.category);
        const isBottleCategory = ['Wine', 'Spirits', 'Bottled Beer'].includes(categoryName);
        
        // For bottle categories: use only full/unopened units (no decimals)
        // For other categories: use unopened units as well
        let currentStock = parseFloat(item.unopened_units_count || 0);
        
        // Round to whole numbers for bottle-based items (no partial bottles)
        if (isBottleCategory) {
          currentStock = Math.floor(currentStock);
        }
        
        const threshold = parseFloat(item.low_stock_threshold || 0);
        const stockPercentage = threshold > 0 ? (currentStock / threshold) * 100 : 0;
        
        return {
          ...item,
          current_stock: currentStock,
          threshold: threshold,
          stock_percentage: stockPercentage,
          item_name: item.name,
          category: categoryName,
          severity: getSeverity(currentStock, threshold),
          color: getSeverityColor(currentStock, threshold)
        };
      });

      setItems(itemsWithSeverity);

    } catch (err) {
      console.error('Failed to fetch items for category:', err);
      setError(err.message || 'Failed to load items');
    } finally {
      setLoadingItems(false);
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

  const getCategoryCode = (categoryName) => {
    const codeMap = {
      'Spirits': 'S',
      'Wine': 'W',
      'Bottled Beer': 'B',
      'Draught Beer': 'D',
      'Minerals & Syrups': 'M'
    };
    return codeMap[categoryName] || categoryName;
  };

  const getSeverity = (currentStock, threshold) => {
    if (threshold === 0) return 'ok';
    const percentage = (currentStock / threshold) * 100;
    if (percentage === 0 || percentage < 40) return 'critical'; // 0-40% of threshold
    if (percentage < 70) return 'warning'; // 40-70% of threshold
    if (percentage < 100) return 'caution'; // 70-100% of threshold
    return 'ok';
  };

  const getSeverityColor = (currentStock, threshold) => {
    if (threshold === 0) return 'rgba(40, 167, 69, 0.7)';
    const percentage = (currentStock / threshold) * 100;
    if (percentage === 0 || percentage < 40) return 'rgba(220, 53, 69, 0.7)'; // Red
    if (percentage < 70) return 'rgba(255, 193, 7, 0.7)'; // Yellow
    if (percentage < 100) return 'rgba(23, 162, 184, 0.7)'; // Cyan
    return 'rgba(40, 167, 69, 0.7)'; // Green
  };

  const transformToChartData = (allItems, severity) => {
    let filteredItems = [...allItems];

    // Filter by severity only (category already filtered)
    if (severity && severity !== 'all') {
      filteredItems = filteredItems.filter(item => item.severity === severity);
    }

    if (filteredItems.length === 0) {
      return null;
    }

    // Sort by current stock (lowest first)
    filteredItems.sort((a, b) => a.current_stock - b.current_stock);

    // Show top 10 by default, or all if expanded
    const topItems = showAllItems ? filteredItems : filteredItems.slice(0, 10);

    const labels = topItems.map(item => {
      const stockInfo = item.current_stock === 0 ? ' [OUT OF STOCK]' : '';
      return `${item.item_name}${stockInfo}`;
    });
    // For visualization: show 0 stock as 0.1 so it's visible on chart (will show as 0 in tooltip)
    const currentStocks = topItems.map(item => item.current_stock === 0 ? 0.1 : item.current_stock);
    const actualStocks = topItems.map(item => item.current_stock); // Keep actual values for tooltips
    const colors = topItems.map(item => item.color);

    console.log('Chart Data:', topItems.map(item => ({
      name: item.item_name,
      current: item.current_stock,
      threshold: item.threshold
    })));

    return {
      labels,
      datasets: [
        {
          label: 'Current Stock (Physical Units)',
          data: currentStocks,
          backgroundColor: colors,
          borderColor: colors.map(c => c.replace('0.7', '1')),
          borderWidth: 2,
          barThickness: 'flex',
          maxBarThickness: 40,
          minBarLength: 2,
          // Store metadata
          actualStocks: actualStocks, // Real values for tooltips
          thresholds: topItems.map(item => item.threshold),
          categories: topItems.map(item => item.category),
          severities: topItems.map(item => item.severity)
        }
      ]
    };
  };

  // Transform category summary to chart data
  const transformCategorySummaryToChart = () => {
    if (!categorySummary) return null;

    const categories = Object.keys(categorySummary);
    const counts = categories.map(cat => categorySummary[cat].count);
    
    // Color palette for categories
    const categoryColors = [
      'rgba(255, 99, 132, 0.8)',   // Red/Pink
      'rgba(54, 162, 235, 0.8)',   // Blue
      'rgba(255, 206, 86, 0.8)',   // Yellow
      'rgba(75, 192, 192, 0.8)',   // Teal
      'rgba(153, 102, 255, 0.8)',  // Purple
      'rgba(255, 159, 64, 0.8)',   // Orange
      'rgba(46, 204, 113, 0.8)',   // Green
      'rgba(231, 76, 60, 0.8)',    // Red
      'rgba(52, 152, 219, 0.8)',   // Light Blue
      'rgba(241, 196, 15, 0.8)'    // Gold
    ];

    const backgroundColors = categories.map((_, idx) => categoryColors[idx % categoryColors.length]);
    const borderColors = backgroundColors.map(color => color.replace('0.8', '1'));

    return {
      labels: categories,
      datasets: [
        {
          label: 'Low Stock Items',
          data: counts,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 2
        }
      ]
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

  if (!categorySummary && !error) {
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

  const counts = items.length > 0 ? getSeverityCounts() : null;
  const categorySummaryChart = transformCategorySummaryToChart();
  const totalLowStockItems = categorySummary 
    ? Object.values(categorySummary).reduce((sum, cat) => sum + cat.count, 0) 
    : 0;

  return (
    <ChartErrorBoundary onRetry={fetchCategorySummary}>
      <Card className="shadow-sm">
        <Card.Header className="bg-warning text-dark">
          <Row className="align-items-center">
            <Col md={4}>
              <FaExclamationTriangle className="me-2" />
              <span>Low Stock Alert</span>
              <Badge bg="danger" className="ms-2">{totalLowStockItems}</Badge>
            </Col>
            <Col md={6}>
              <Form.Group className="mb-0">
                <Form.Label className="small text-dark mb-1">Category</Form.Label>
                <Form.Select 
                  size="sm" 
                  value={selectedCategory} 
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  disabled={!period || !categorySummary}
                >
                  <option value="">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat} ({categorySummary?.[cat]?.count || 0} items)
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Header>
        <Card.Body>
          {/* Chart - Shows categories by default, items when category selected */}
          {(categorySummaryChart || chartData) && (
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0">
                  {selectedCategory 
                    ? `Low Stock Items - ${selectedCategory}` 
                    : 'Low Stock Items by Category'}
                </h6>
                {period && (
                  <small className="text-muted d-block mt-1">
                    Monitoring current period: {period}
                  </small>
                )}
              </div>
              <UniversalChart
                type="bar"
                data={selectedCategory && chartData ? chartData : categorySummaryChart}
                config={{
                  indexAxis: 'y',
                  stacked: false,
                  showGrid: true,
                  showLegend: true,
                  legendPosition: 'top',
                  maintainAspectRatio: false,
                  scales: {
                    x: {
                      beginAtZero: true,
                      title: {
                        display: true,
                        text: selectedCategory ? 'Physical Units (Bottles/Kegs/Boxes)' : 'Number of Items'
                      }
                    }
                  },
                  tooltipCallbacks: selectedCategory ? {
                    label: function(context) {
                      const label = context.dataset.label || '';
                      // Use actual stock values for tooltip (not the 0.1 visualization value)
                      const actualValue = context.dataset.actualStocks?.[context.dataIndex] ?? context.parsed.x;
                      if (label === 'Current Stock (Physical Units)') {
                        const threshold = context.dataset.thresholds?.[context.dataIndex] || 0;
                        const percentage = threshold > 0 ? ((actualValue / threshold) * 100).toFixed(1) : 0;
                        if (actualValue === 0) {
                          return `${label}: 0 units (OUT OF STOCK)`;
                        }
                        return `${label}: ${actualValue.toFixed(2)} units (${percentage}% of threshold)`;
                      }
                      return `${label}: ${actualValue.toFixed(2)} units`;
                    }
                  } : undefined
                }}
                height={selectedCategory ? Math.max(400, Math.min(showAllItems ? items.length : 10, 50) * 30) : 300}
              />
              <div className="mt-2 text-center">
                <small className="text-muted">
                  {selectedCategory 
                    ? `Showing ${showAllItems ? items.length : Math.min(items.length, 10)} of ${items.length} low stock items` 
                    : 'Select a category below to view detailed items'}
                </small>
                {selectedCategory && items.length > 10 && (
                  <div className="mt-2">
                    <Button 
                      variant="outline-primary" 
                      size="sm"
                      onClick={() => setShowAllItems(!showAllItems)}
                    >
                      {showAllItems ? 'Show Top 10 Only' : `Show All ${items.length} Items`}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Severity Filter - Only shown when category selected */}
          {selectedCategory && (
            <Row className="mb-3">
              <Col xs={12} md={6}>
                <Form.Group>
                  <Form.Label className="small text-muted mb-1">Severity Filter</Form.Label>
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
          )}

          {/* Loading state for items */}
          {loadingItems && (
            <div className="text-center py-4">
              <Spinner animation="border" variant="warning" />
              <p className="mt-2">Loading items for {selectedCategory}...</p>
            </div>
          )}

          {/* Items Section - Only shown when category is selected */}
          {selectedCategory && !loadingItems && items.length > 0 && (
            <>
              {/* Summary Stats for Selected Category */}
              {counts && (
                <Alert variant="warning" className="mb-3">
                  <Row>
                    <Col xs={6} md={3}>
                      <Badge bg="danger" className="me-1">{counts.critical}</Badge>
                      <strong>Critical</strong><br />
                      <small>{'<'}40% of threshold</small>
                    </Col>
                    <Col xs={6} md={3}>
                      <Badge bg="warning" className="me-1">{counts.warning}</Badge>
                      <strong>Warning</strong><br />
                      <small>40-70% of threshold</small>
                    </Col>
                    <Col xs={6} md={3}>
                      <Badge bg="info" className="me-1">{counts.caution}</Badge>
                      <strong>Caution</strong><br />
                      <small>70-100% of threshold</small>
                    </Col>
                    <Col xs={6} md={3}>
                      <FaBox className="me-1" />
                      <strong>Total Items</strong><br />
                      <small>{counts.total} items</small>
                    </Col>
                  </Row>
                </Alert>
              )}

              {/* Detailed Table */}
              <div className="mt-3" style={{ maxHeight: '250px', overflowY: 'auto' }}>
                <Table striped bordered hover size="sm">
                  <thead className="sticky-top bg-light">
                    <tr>
                      <th>Item</th>
                      <th className="text-end">Current Stock</th>
                      <th className="text-end">Threshold</th>
                      <th className="text-center">Stock %</th>
                      <th className="text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items
                      .filter(item => {
                        if (severityFilter !== 'all' && item.severity !== severityFilter) return false;
                        return true;
                      })
                      .sort((a, b) => a.current_stock - b.current_stock)
                      .map((item, idx) => (
                        <tr 
                          key={idx}
                          style={{ cursor: onItemClick ? 'pointer' : 'default' }}
                          onClick={() => onItemClick && onItemClick(item)}
                        >
                          <td>{item.item_name}</td>
                          <td className="text-end">{item.current_stock?.toFixed(2) || 0}</td>
                          <td className="text-end">{item.threshold?.toFixed(0) || 0}</td>
                          <td className="text-end">{item.stock_percentage?.toFixed(1) || 0}%</td>
                          <td className="text-center">{getSeverityBadge(item.severity)}</td>
                        </tr>
                      ))}
                  </tbody>
                </Table>
              </div>

              {/* Info Footer */}
              <div className="mt-3 text-center">
                <small className="text-muted">
                  Showing low stock items for <strong>{selectedCategory}</strong>. 
                  Stock levels are calculated based on category-specific thresholds.
                </small>
              </div>
            </>
          )}

          {/* Empty state when category selected but no items match filters */}
          {selectedCategory && !loadingItems && items.length > 0 && !chartData && (
            <Alert variant="info" className="mt-3">
              No items match the selected severity filter.
            </Alert>
          )}

          {/* Empty state when no category selected */}
          {!selectedCategory && !loadingItems && (
            <Alert variant="info" className="text-center mt-3">
              <FaBox className="me-2" />
              Please select a category from the dropdown above to view detailed low stock items.
            </Alert>
          )}
        </Card.Body>
      </Card>
    </ChartErrorBoundary>
  );
};

export default LowStockChart;

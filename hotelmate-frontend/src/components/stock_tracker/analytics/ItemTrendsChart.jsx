import React, { useState, useEffect } from 'react';
import { Card, Form, Spinner, Badge, Button } from 'react-bootstrap';
import UniversalChart from '../charts/UniversalChart';
import ChartErrorBoundary from '../charts/ChartErrorBoundary';
import ChartEmptyState from '../charts/ChartEmptyState';
import { getTrendAnalysis, formatCurrency } from '@/services/stockAnalytics';

/**
 * Item Trends Chart Component
 * 
 * Uses NEW /compare/trend-analysis/?periods=X,Y,Z&category=S endpoint
 * Multi-line chart showing item value trends over time
 * Supports category filtering and shows trend indicators
 */
const ItemTrendsChart = ({ 
  hotelSlug, 
  selectedPeriods = [],
  categories = [],
  onItemClick,
  height = 400
}) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedItems, setSelectedItems] = useState([]);
  const [chartType, setChartType] = useState('line');
  const [availableCategories, setAvailableCategories] = useState([]);

  // Fetch data when periods or filters change
  useEffect(() => {
    if (!hotelSlug || !selectedPeriods || selectedPeriods.length < 2) {
      if (selectedPeriods && selectedPeriods.length > 0 && selectedPeriods.length < 2) {
        setError('Please select at least 2 periods to view trends');
      } else {
        setError(null);
      }
      setChartData(null);
      setLoading(false);
      return;
    }

    fetchTrendData();
  }, [hotelSlug, selectedPeriods, selectedCategory, selectedItems]);

  const fetchTrendData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = {
        periods: selectedPeriods,
        category: selectedCategory !== 'all' ? selectedCategory : undefined,
        items: selectedItems.length > 0 ? selectedItems : undefined
      };

      const response = await getTrendAnalysis(hotelSlug, params.periods, params.category, params.items);
      
      // API returns {items: [...], periods: [...], filters: {...}}
      const itemsData = response.items || [];
      
      if (!itemsData || itemsData.length === 0) {
        setError('No trend data available for selected filters');
        setChartData(null);
        return;
      }

      // Extract unique categories from items
      const uniqueCategories = [...new Set(itemsData.map(item => item.category).filter(Boolean))];
      setAvailableCategories(uniqueCategories);

      // Transform API response to chart data
      const transformedData = transformToChartData(response);
      setChartData(transformedData);
    } catch (err) {
      console.error('Error fetching trend analysis:', err);
      setError(err.message || 'Failed to load trend data');
      setChartData(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Transform API response to chart data format
   * 
   * API Response Format:
   * {
   *   periods: [
   *     { id: 1, name: "Jan 2024", start_date: "...", end_date: "..." }
   *   ],
   *   items: [
   *     {
   *       item_id: 123,
   *       name: "Beer",
   *       category: "S",
   *       trend_data: [
   *         { period_id: 1, value: 1000, servings: 150, waste: 50 }
   *       ],
   *       trend_direction: "increasing",
   *       volatility: "low",
   *       average_value: 1100
   *     }
   *   ],
   *   filters: { category: "S", item_count: 25 }
   * }
   */
  const transformToChartData = (apiResponse) => {
    const { items, periods, filters } = apiResponse;

    if (!items || items.length === 0) {
      return null;
    }

    // Create period lookup map for names
    const periodMap = {};
    if (periods && Array.isArray(periods)) {
      periods.forEach(p => {
        periodMap[p.id] = p.name;
      });
    }

    // Extract period labels from first item's trend_data and map to names
    const periodLabels = items[0]?.trend_data?.map(td => periodMap[td.period_id] || `Period ${td.period_id}`) || [];

    // Filter items based on category and limit to top items by average value
    let filteredItems = [...items];
    
    // Filter by category if selected (note: backend already filters, but double-check)
    if (selectedCategory && selectedCategory !== 'all') {
      filteredItems = filteredItems.filter(item => item.category === selectedCategory);
    }
    
    // Sort by average value and take top 10 items
    filteredItems.sort((a, b) => (b.average_value || 0) - (a.average_value || 0));
    const topItems = filteredItems.slice(0, 10);

    // Create datasets - one per item
    const datasets = topItems.map((item, idx) => {
      const colors = [
        'rgb(75, 192, 192)',
        'rgb(255, 99, 132)',
        'rgb(54, 162, 235)',
        'rgb(255, 205, 86)',
        'rgb(153, 102, 255)',
        'rgb(255, 159, 64)',
        'rgb(199, 199, 199)',
        'rgb(83, 102, 255)',
        'rgb(255, 99, 255)',
        'rgb(99, 255, 132)'
      ];

      const dataset = {
        label: item.name,
        data: item.trend_data?.map(td => parseFloat(td.value || 0)) || [],
        borderColor: colors[idx % colors.length],
        backgroundColor: colors[idx % colors.length].replace('rgb', 'rgba').replace(')', ', 0.1)'),
        trend_direction: item.trend_direction,
        volatility: item.volatility,
        average_value: item.average_value,
        item_id: item.item_id
      };
      return dataset;
    });

    // Build summary from filters or calculate it
    const summary = filters ? {
      category: filters.category || 'All',
      item_count: filters.item_count || items.length,
      period_count: periods?.length || 0
    } : {
      item_count: items.length,
      period_count: periods?.length || 0
    };

    return {
      labels: periodLabels,
      datasets: datasets,
      summary: summary
    };
  };

  // Handle category filter change
  const handleCategoryChange = (e) => {
    setSelectedCategory(e.target.value);
  };

  // Handle chart type change
  const handleChartTypeChange = (e) => {
    setChartType(e.target.value);
  };

  // Retry handler
  const handleRetry = () => {
    fetchTrendData();
  };

  // Get trend icon
  const getTrendIcon = (direction) => {
    switch (direction) {
      case 'increasing': return '📈';
      case 'decreasing': return '📉';
      case 'stable': return '➡️';
      default: return '〰️';
    }
  };

  // Get volatility badge
  const getVolatilityBadge = (volatility) => {
    const badges = {
      'low': { bg: 'success', text: 'Low' },
      'medium': { bg: 'warning', text: 'Medium' },
      'high': { bg: 'danger', text: 'High' }
    };
    return badges[volatility] || { bg: 'secondary', text: 'Unknown' };
  };

  // Chart configuration
  const chartConfig = {
    smooth: true,
    showGrid: true,
    showLegend: true,
    legendPosition: 'top',
    tooltipCallbacks: {
      label: function(context) {
        const datasetLabel = context.dataset.label || '';
        const value = context.parsed.y || context.parsed || 0;
        const avgValue = context.dataset.average_value || 0;
        const trend = context.dataset.trend_direction || '';
        
        let label = `${datasetLabel}: ${formatCurrency(value)}`;
        if (avgValue) {
          label += `\nAverage: ${formatCurrency(avgValue)}`;
        }
        if (trend) {
          label += `\nTrend: ${trend}`;
        }
        
        return label;
      }
    }
  };

  // Render loading state
  if (loading) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-info text-white">
          <h5 className="mb-0">Item Trends Analysis</h5>
        </Card.Header>
        <Card.Body className="text-center" style={{ height: height }}>
          <Spinner animation="border" variant="info" />
          <p className="mt-3">Loading trend data...</p>
        </Card.Body>
      </Card>
    );
  }

  // Render error state
  if (error && !chartData) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-info text-white">
          <h5 className="mb-0">Item Trends Analysis</h5>
        </Card.Header>
        <Card.Body style={{ height: height }}>
          <ChartEmptyState
            type={selectedPeriods.length < 2 ? 'no-periods' : 'no-data'}
            message={error}
            actionLabel="Retry"
            onActionClick={handleRetry}
          />
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-info text-white">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">Item Trends Analysis</h5>
            <small>Showing top 10 items by value</small>
          </div>
          <div className="d-flex gap-2">
            <Badge bg="light" text="dark">
              {selectedPeriods.length} periods
            </Badge>
            {chartData && (
              <Badge bg="success">
                {chartData.datasets.length} items
              </Badge>
            )}
          </div>
        </div>
      </Card.Header>

      <Card.Body>
        {/* Filters */}
        <div className="d-flex gap-3 mb-3 align-items-center flex-wrap">
          <Form.Group className="mb-0">
            <Form.Label className="mb-1 small">Category</Form.Label>
            <Form.Select 
              size="sm" 
              value={selectedCategory} 
              onChange={handleCategoryChange}
              style={{ width: '180px' }}
            >
              <option value="all">All Categories</option>
              {(categories.length > 0 ? categories : availableCategories).map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </Form.Select>
          </Form.Group>

          <Form.Group className="mb-0">
            <Form.Label className="mb-1 small">Chart Type</Form.Label>
            <Form.Select 
              size="sm" 
              value={chartType} 
              onChange={handleChartTypeChange}
              style={{ width: '150px' }}
            >
              <option value="line">Line Chart</option>
              <option value="area">Area Chart</option>
            </Form.Select>
          </Form.Group>
        </div>

        {/* Summary Info */}
        {chartData?.summary && (
          <div className="alert alert-info mb-3 py-2">
            <small>
              <strong>Displaying:</strong> {chartData.datasets.length} items across {chartData.summary.period_count} periods
              {chartData.summary.category !== 'All' && ` (Category: ${chartData.summary.category})`}
              {' • Total items in database: '}{chartData.summary.item_count}
            </small>
          </div>
        )}

        {/* Chart */}
        {chartData ? (
          <div style={{ marginBottom: '20px' }}>
            <ChartErrorBoundary onRetry={handleRetry}>
              <UniversalChart
                type={chartType}
                data={chartData}
                config={chartConfig}
                height={height}
                onDataClick={(data) => {
                  if (onItemClick && data.datasetIndex !== undefined) {
                    const dataset = chartData.datasets[data.datasetIndex];
                    onItemClick({
                      item_id: dataset.item_id,
                      item_name: dataset.label,
                      trend: dataset.trend_direction,
                      volatility: dataset.volatility
                    });
                  }
                }}
              />
            </ChartErrorBoundary>
          </div>
        ) : (
          <ChartEmptyState
            type="no-items"
            message="No items to display for selected filters"
          />
        )}

        {/* Trend Summary Table */}
        {chartData?.datasets && chartData.datasets.length > 0 && (
          <div className="mt-3">
            <h6 className="mb-2">Trend Summary</h6>
            <div className="table-responsive" style={{ maxHeight: '200px', overflowY: 'auto' }}>
              <table className="table table-sm table-hover">
                <thead className="table-light sticky-top">
                  <tr>
                    <th>Item</th>
                    <th>Trend</th>
                    <th>Volatility</th>
                    <th>Average Value</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.datasets.map((dataset, idx) => {
                    const volatilityBadge = getVolatilityBadge(dataset.volatility);
                    return (
                      <tr key={idx}>
                        <td>{dataset.label}</td>
                        <td>
                          <span title={dataset.trend_direction}>
                            {getTrendIcon(dataset.trend_direction)} {dataset.trend_direction}
                          </span>
                        </td>
                        <td>
                          <Badge bg={volatilityBadge.bg} className="text-capitalize">
                            {volatilityBadge.text}
                          </Badge>
                        </td>
                        <td>{formatCurrency(dataset.average_value)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default ItemTrendsChart;

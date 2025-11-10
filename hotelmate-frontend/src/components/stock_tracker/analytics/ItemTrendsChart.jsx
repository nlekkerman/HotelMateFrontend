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

  // Fetch data when periods or filters change
  useEffect(() => {
    if (!hotelSlug || !selectedPeriods || selectedPeriods.length < 2) {
      setError('Please select at least 2 periods to view trends');
      setChartData(null);
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
      
      if (!response || !response.trends || response.trends.length === 0) {
        setError('No trend data available for selected filters');
        setChartData(null);
        return;
      }

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
   *   trends: [
   *     {
   *       item_id: 1,
   *       item_name: "Beer",
   *       category: "Beverages",
   *       values: [
   *         { period_id: 1, period_name: "Jan", value: 1000 },
   *         { period_id: 2, period_name: "Feb", value: 1200 }
   *       ],
   *       trend_direction: "increasing",
   *       volatility: "low",
   *       average_value: 1100
   *     }
   *   ]
   * }
   */
  const transformToChartData = (apiResponse) => {
    const { trends } = apiResponse;

    // Extract period labels from first item
    const periodLabels = trends[0]?.values.map(v => v.period_name) || [];

    // Create datasets - one per item
    const datasets = trends.map((item, idx) => {
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

      return {
        label: item.item_name,
        data: item.values.map(v => v.value),
        borderColor: colors[idx % colors.length],
        backgroundColor: colors[idx % colors.length].replace('rgb', 'rgba').replace(')', ', 0.1)'),
        trend_direction: item.trend_direction,
        volatility: item.volatility,
        average_value: item.average_value,
        item_id: item.item_id
      };
    });

    return {
      labels: periodLabels,
      datasets: datasets,
      summary: apiResponse.summary
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
            <small>Multi-period value trends</small>
          </div>
          <Badge bg="light" text="dark">
            {selectedPeriods.length} periods
          </Badge>
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
              {categories.map(cat => (
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

        {/* Chart */}
        {chartData ? (
          <ChartErrorBoundary onRetry={handleRetry}>
            <UniversalChart
              type={chartType}
              data={chartData}
              config={chartConfig}
              height={height}
              onDataClick={(data) => {
                console.log('Trend data clicked:', data);
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

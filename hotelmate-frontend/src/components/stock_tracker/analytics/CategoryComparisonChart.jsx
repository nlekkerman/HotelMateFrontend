import React, { useState, useEffect } from 'react';
import { Card, Form, Spinner, Alert, Badge } from 'react-bootstrap';
import UniversalChart from '../charts/UniversalChart';
import ChartErrorBoundary from '../charts/ChartErrorBoundary';
import ChartEmptyState from '../charts/ChartEmptyState';
import { getCompareCategories, formatCurrency } from '@/services/stockAnalytics';

/**
 * Category Comparison Chart Component
 * 
 * Uses NEW /compare/categories/?periods=X,Y,Z endpoint
 * Shows category values across multiple periods (2-6 periods)
 * Supports grouped or stacked bar charts
 */
const CategoryComparisonChart = ({ 
  hotelSlug, 
  selectedPeriods = [],
  onPeriodClick,
  height = 400,
  defaultChartType = 'bar'
}) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState(defaultChartType);
  const [isStacked, setIsStacked] = useState(false);

  // Fetch data when periods change
  useEffect(() => {
    if (!hotelSlug || !selectedPeriods || selectedPeriods.length < 2) {
      if (selectedPeriods && selectedPeriods.length > 0 && selectedPeriods.length < 2) {
        setError('Please select at least 2 periods to compare');
      } else {
        setError(null);
      }
      setChartData(null);
      setLoading(false);
      return;
    }

    fetchComparisonData();
  }, [hotelSlug, selectedPeriods]);

  const fetchComparisonData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getCompareCategories(hotelSlug, selectedPeriods);
      
      // Comprehensive data validation
      if (!response) {
        console.warn('CategoryComparisonChart: No response from API');
        setError('No response from server');
        setChartData(null);
        return;
      }

      if (!response.categories) {
        console.warn('CategoryComparisonChart: Response missing categories property');
        setError('Invalid data format received');
        setChartData(null);
        return;
      }

      if (!Array.isArray(response.categories)) {
        console.warn('CategoryComparisonChart: Categories is not an array:', typeof response.categories);
        setError('Invalid data format received');
        setChartData(null);
        return;
      }

      if (response.categories.length === 0) {
        console.warn('CategoryComparisonChart: Categories array is empty');
        setError('No category data available for selected periods');
        setChartData(null);
        return;
      }

      // Transform API response to chart data format
      const transformedData = transformToChartData(response);
      
      if (!transformedData) {
        console.warn('CategoryComparisonChart: Transformation returned null');
        setError('Invalid or empty category data received');
        setChartData(null);
        return;
      }
      
      setChartData(transformedData);
    } catch (err) {
      console.error('CategoryComparisonChart: Error fetching category comparison:', err);
      setError(err.message || 'Failed to load category comparison data');
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
   *   categories: [
   *     {
   *       category: "Food",
   *       periods: [
   *         { period_id: 1, period_name: "Jan 2024", total_value: 5000, items_count: 50 },
   *         { period_id: 2, period_name: "Feb 2024", total_value: 5500, items_count: 52 }
   *       ]
   *     }
   *   ],
   *   summary: { ... }
   * }
   */
  const transformToChartData = (apiResponse) => {
    const { categories, periods } = apiResponse;

    // Validate categories data
    if (!Array.isArray(categories) || categories.length === 0) {
      console.warn('CategoryComparisonChart: Invalid or empty categories array');
      return null;
    }

    // Extract unique period names for labels
    // Try to get from top-level periods array first, then fall back to nested structure
    let periodLabels = [];
    if (Array.isArray(periods) && periods.length > 0) {
      periodLabels = periods.map(p => p.period_name || p.name || p);
    } else if (categories[0]?.periods) {
      periodLabels = categories[0].periods.map(p => p.period_name || p.name || p);
    } else {
    }

    // Validate that we have periods data
    if (periodLabels.length === 0) {
      console.warn('CategoryComparisonChart: No period labels found');
      return null;
    }

    // Create datasets - one per category
    const datasets = categories.map((category, idx) => {
      const colors = [
        'rgba(75, 192, 192, 0.6)',
        'rgba(255, 99, 132, 0.6)',
        'rgba(54, 162, 235, 0.6)',
        'rgba(255, 205, 86, 0.6)',
        'rgba(153, 102, 255, 0.6)',
        'rgba(255, 159, 64, 0.6)'
      ];

      // Handle different data structures
      let dataValues = [];
      let itemsCounts = [];

      if (Array.isArray(category.periods_data)) {
        // Backend returns periods_data array
        dataValues = category.periods_data.map(p => p.total_value || 0);
        itemsCounts = category.periods_data.map(p => p.item_count || 0);
      } else if (Array.isArray(category.periods)) {
        // Alternative: category has periods array
        dataValues = category.periods.map(p => p.total_value || 0);
        itemsCounts = category.periods.map(p => p.items_count || p.item_count || 0);
      } else if (Array.isArray(category.values)) {
        // Flat structure: category has values array matching period order
        dataValues = category.values.map(v => v.total_value || v || 0);
        itemsCounts = category.values.map(v => v.items_count || v.item_count || 0);
      }

      console.log(`CategoryComparisonChart: Dataset for ${category.name || category.code}:`, dataValues);

      return {
        label: category.name || category.code || 'Unknown',
        data: dataValues,
        backgroundColor: colors[idx % colors.length],
        borderColor: colors[idx % colors.length].replace('0.6', '1'),
        itemsCount: itemsCounts // Store for tooltips
      };
    });

    return {
      labels: periodLabels,
      datasets: datasets,
      summary: apiResponse.summary
    };
  };

  // Handle chart type change
  const handleChartTypeChange = (e) => {
    setChartType(e.target.value);
  };

  // Handle stacked toggle
  const handleStackedToggle = (e) => {
    setIsStacked(e.target.checked);
  };

  // Retry handler
  const handleRetry = () => {
    fetchComparisonData();
  };

  // Render loading state
  if (loading) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Category Comparison</h5>
        </Card.Header>
        <Card.Body className="text-center" style={{ height: height }}>
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading category comparison data...</p>
        </Card.Body>
      </Card>
    );
  }

  // Render error state
  if (error && !chartData) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-primary text-white d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Category Comparison</h5>
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

  // Chart configuration
  const chartConfig = {
    stacked: isStacked,
    showGrid: true,
    showLegend: true,
    legendPosition: 'top',
    tooltipCallbacks: {
      label: function(context) {
        const datasetLabel = context.dataset.label || '';
        const value = context.parsed.y || context.parsed || 0;
        const itemsCount = context.dataset.itemsCount?.[context.dataIndex] || 0;
        return `${datasetLabel}: ${formatCurrency(value)} (${itemsCount} items)`;
      }
    }
  };

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-primary text-white">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">Category Comparison</h5>
            <small>Multi-period category analysis</small>
          </div>
          <div>
            <Badge bg="light" text="dark">
              {selectedPeriods.length} periods selected
            </Badge>
          </div>
        </div>
      </Card.Header>

      <Card.Body>
        {/* Chart Controls */}
        <div className="d-flex gap-3 mb-3 align-items-center">
          <Form.Group className="mb-0">
            <Form.Label className="mb-1 small">Chart Type</Form.Label>
            <Form.Select 
              size="sm" 
              value={chartType} 
              onChange={handleChartTypeChange}
              style={{ width: '150px' }}
            >
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
              <option value="area">Area Chart</option>
            </Form.Select>
          </Form.Group>

          {chartType === 'bar' && (
            <Form.Group className="mb-0">
              <Form.Check
                type="checkbox"
                label="Stacked"
                checked={isStacked}
                onChange={handleStackedToggle}
                className="mt-4"
              />
            </Form.Group>
          )}
        </div>

        {/* Chart */}
        <ChartErrorBoundary onRetry={handleRetry}>
          <UniversalChart
            type={chartType}
            data={chartData}
            config={chartConfig}
            height={height}
            onDataClick={(data) => {
              console.log('Category clicked:', data);
              if (onPeriodClick) {
                onPeriodClick(data);
              }
            }}
          />
        </ChartErrorBoundary>

        {/* Summary Stats */}
        {chartData?.summary && (
          <div className="mt-3 pt-3 border-top">
            <div className="row text-center">
              <div className="col-md-4">
                <div className="text-muted small">Total Value</div>
                <div className="h5 mb-0">{formatCurrency(chartData.summary.total_value || 0)}</div>
              </div>
              <div className="col-md-4">
                <div className="text-muted small">Total Items</div>
                <div className="h5 mb-0">{chartData.summary.total_items || 0}</div>
              </div>
              <div className="col-md-4">
                <div className="text-muted small">Categories</div>
                <div className="h5 mb-0">{chartData.summary.categories_count || 0}</div>
              </div>
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default CategoryComparisonChart;


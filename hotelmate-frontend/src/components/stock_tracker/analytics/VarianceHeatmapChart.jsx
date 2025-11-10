import React, { useState, useEffect } from 'react';
import { Card, Spinner } from 'react-bootstrap';
import ChartErrorBoundary from '../charts/ChartErrorBoundary';
import ChartEmptyState from '../charts/ChartEmptyState';
import { getVarianceHeatmap } from '@/services/stockAnalytics';
import ReactECharts from 'echarts-for-react';

/**
 * Variance Heatmap Chart Component
 * 
 * Uses NEW /compare/variance-heatmap/?periods=X,Y,Z endpoint
 * Shows variance by category and period in heatmap format
 * Uses color_scale from API for visual intensity
 */
const VarianceHeatmapChart = ({ 
  hotelSlug, 
  selectedPeriods = [],
  onCellClick,
  height = 450
}) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch data when periods change
  useEffect(() => {
    if (!hotelSlug || !selectedPeriods || selectedPeriods.length < 2) {
      setError('Please select at least 2 periods to view variance heatmap');
      setChartData(null);
      return;
    }

    fetchHeatmapData();
  }, [hotelSlug, selectedPeriods]);

  const fetchHeatmapData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getVarianceHeatmap(hotelSlug, selectedPeriods);
      
      if (!response || !response.heatmap_data) {
        setError('No variance heatmap data available');
        setChartData(null);
        return;
      }

      setChartData(response);
    } catch (err) {
      console.error('Error fetching variance heatmap:', err);
      setError(err.message || 'Failed to load variance heatmap data');
      setChartData(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Generate ECharts heatmap option
   */
  const getHeatmapOption = () => {
    if (!chartData || !chartData.heatmap_data) return null;

    const { heatmap_data, categories, periods } = chartData;

    // Transform heatmap data for ECharts format
    // ECharts heatmap expects data as: [[x, y, value], ...]
    const data = [];
    const values = []; // For color scale calculation
    
    heatmap_data.forEach((row, categoryIdx) => {
      row.values.forEach((cell, periodIdx) => {
        data.push([periodIdx, categoryIdx, cell.variance_percentage]);
        values.push(cell.variance_percentage);
      });
    });

    // Calculate min/max for color scale
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);

    return {
      title: {
        text: 'Variance Heatmap by Category & Period',
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        position: 'top',
        formatter: function(params) {
          const categoryName = categories[params.value[1]];
          const periodName = periods[params.value[0]];
          const variance = params.value[2];
          
          return `<b>${categoryName}</b><br/>
                  Period: ${periodName}<br/>
                  Variance: ${variance >= 0 ? '+' : ''}${variance.toFixed(1)}%`;
        }
      },
      grid: {
        height: '70%',
        top: '15%',
        left: '15%'
      },
      xAxis: {
        type: 'category',
        data: periods,
        splitArea: {
          show: true
        },
        axisLabel: {
          rotate: 30,
          fontSize: 11
        }
      },
      yAxis: {
        type: 'category',
        data: categories,
        splitArea: {
          show: true
        },
        axisLabel: {
          fontSize: 11
        }
      },
      visualMap: {
        min: minValue,
        max: maxValue,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '5%',
        inRange: {
          color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
        },
        text: ['High Variance', 'Low Variance']
      },
      series: [
        {
          name: 'Variance',
          type: 'heatmap',
          data: data,
          label: {
            show: true,
            formatter: (params) => {
              return `${params.value[2].toFixed(1)}%`;
            },
            fontSize: 10
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          }
        }
      ]
    };
  };

  // Handle chart click
  const onChartClick = (params) => {
    if (onCellClick && chartData) {
      const categoryName = chartData.categories[params.value[1]];
      const periodName = chartData.periods[params.value[0]];
      const variance = params.value[2];
      
      onCellClick({
        category: categoryName,
        period: periodName,
        variance: variance
      });
    }
  };

  const onEvents = {
    'click': onChartClick
  };

  // Retry handler
  const handleRetry = () => {
    fetchHeatmapData();
  };

  // Render loading state
  if (loading) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-secondary text-white">
          <h5 className="mb-0">Variance Heatmap</h5>
        </Card.Header>
        <Card.Body className="text-center" style={{ height: height }}>
          <Spinner animation="border" variant="secondary" />
          <p className="mt-3">Loading variance heatmap...</p>
        </Card.Body>
      </Card>
    );
  }

  // Render error state
  if (error && !chartData) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-secondary text-white">
          <h5 className="mb-0">Variance Heatmap</h5>
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

  const chartOption = getHeatmapOption();

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-secondary text-white">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">Variance Heatmap</h5>
            <small>Category variance across periods</small>
          </div>
        </div>
      </Card.Header>

      <Card.Body>
        {/* Chart */}
        {chartOption ? (
          <ChartErrorBoundary onRetry={handleRetry}>
            <ReactECharts
              option={chartOption}
              style={{ height: height, width: '100%' }}
              onEvents={onEvents}
              notMerge={true}
              lazyUpdate={true}
            />
          </ChartErrorBoundary>
        ) : (
          <ChartEmptyState
            type="no-data"
            message="No variance data available for selected periods"
          />
        )}

        {/* Summary Stats */}
        {chartData?.summary && (
          <div className="mt-3 pt-3 border-top">
            <div className="row text-center">
              <div className="col-md-4">
                <div className="text-muted small">Highest Variance</div>
                <div className="h6 mb-0 text-danger">
                  {chartData.summary.highest_variance?.toFixed(1)}%
                  {chartData.summary.highest_variance_category && (
                    <small className="d-block text-muted" style={{ fontSize: '0.75rem' }}>
                      {chartData.summary.highest_variance_category}
                    </small>
                  )}
                </div>
              </div>
              <div className="col-md-4">
                <div className="text-muted small">Average Variance</div>
                <div className="h6 mb-0">
                  {chartData.summary.average_variance?.toFixed(1)}%
                </div>
              </div>
              <div className="col-md-4">
                <div className="text-muted small">Lowest Variance</div>
                <div className="h6 mb-0 text-success">
                  {chartData.summary.lowest_variance?.toFixed(1)}%
                  {chartData.summary.lowest_variance_category && (
                    <small className="d-block text-muted" style={{ fontSize: '0.75rem' }}>
                      {chartData.summary.lowest_variance_category}
                    </small>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Legend Help */}
        <div className="mt-3 small text-muted text-center">
          <i className="bi bi-info-circle"></i> Higher percentages (red) indicate greater variance from expected values
        </div>
      </Card.Body>
    </Card>
  );
};

export default VarianceHeatmapChart;

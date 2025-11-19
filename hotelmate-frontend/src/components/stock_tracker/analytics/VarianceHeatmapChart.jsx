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
      if (selectedPeriods && selectedPeriods.length > 0 && selectedPeriods.length < 2) {
        setError('Please select at least 2 periods to view variance heatmap');
      } else {
        setError(null);
      }
      setChartData(null);
      setLoading(false);
      return;
    }

    fetchHeatmapData();
  }, [hotelSlug, selectedPeriods]);

  const fetchHeatmapData = async () => {
    setLoading(true);
    setError(null);

    console.log('🔍 VarianceHeatmapChart: Fetching heatmap data...', {
      hotelSlug,
      selectedPeriods,
      periodsCount: selectedPeriods.length
    });

    try {
      const response = await getVarianceHeatmap(hotelSlug, selectedPeriods);
      
      console.log('📦 VarianceHeatmapChart: Raw API Response:', response);
      
      if (!response || !response.heatmap_data) {
        console.error('❌ VarianceHeatmapChart: No heatmap data in response');
        setError('No variance heatmap data available');
        setChartData(null);
        return;
      }

      console.log('✅ VarianceHeatmapChart: Heatmap data received:', {
        heatmapDataType: Array.isArray(response.heatmap_data) ? 'array' : typeof response.heatmap_data,
        heatmapDataLength: response.heatmap_data?.length,
        categoriesCount: response.categories?.length,
        periodsCount: response.periods?.length
      });

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
   * Map category codes to full names
   */
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

  /**
   * Generate ECharts heatmap option
   */
  const getHeatmapOption = () => {
    console.log('🔧 VarianceHeatmapChart: Generating chart option...', chartData);
    
    if (!chartData || !chartData.heatmap_data) {
      console.error('❌ VarianceHeatmapChart: No chart data available');
      return null;
    }

    const { heatmap_data, categories, periods } = chartData;
    
    console.log('📋 VarianceHeatmapChart: Chart data structure:', {
      heatmap_data: heatmap_data?.slice(0, 3), // First 3 items
      categories,
      periods
    });
    
    // Map category codes to full names
    const categoryNames = categories.map(cat => getCategoryName(cat));

    // Validate data structure
    if (!Array.isArray(heatmap_data) || !Array.isArray(categories) || !Array.isArray(periods)) {
      console.error('❌ VarianceHeatmapChart: Invalid data structure:', {
        heatmap_data: Array.isArray(heatmap_data),
        categories: Array.isArray(categories),
        periods: Array.isArray(periods)
      });
      return null;
    }

    console.log('✅ VarianceHeatmapChart: Data structure validated');

    // Transform heatmap data for ECharts format
    // ECharts heatmap expects data as: [[x, y, value], ...]
    const data = [];
    const values = []; // For color scale calculation
    
    // Check if data is already in flat array format [x, y, value, severity]
    if (Array.isArray(heatmap_data) && heatmap_data.length > 0 && Array.isArray(heatmap_data[0])) {
      // Data is in flat format: [[x, y, value, severity], ...]
      heatmap_data.forEach((row) => {
        if (Array.isArray(row) && row.length >= 3) {
          // ECharts needs only [x, y, value], ignore the 4th element (severity)
          const [x, y, value] = row;
          if (typeof value === 'number' && !isNaN(value)) {
            data.push([x, y, value]);
            values.push(value);
          }
        }
      });
    } else if (Array.isArray(heatmap_data)) {
      // Data might be in nested object format
      heatmap_data.forEach((row, categoryIdx) => {
        // Validate row has values array
        if (row && Array.isArray(row.values)) {
          row.values.forEach((cell, periodIdx) => {
            if (cell && typeof cell.variance_percentage === 'number') {
              data.push([periodIdx, categoryIdx, cell.variance_percentage]);
              values.push(cell.variance_percentage);
            }
          });
        }
      });
    }

    // Validate we have data
    if (data.length === 0 || values.length === 0) {
      console.error('❌ VarianceHeatmapChart: No valid data after transformation');
      return null;
    }

    console.log('✅ VarianceHeatmapChart: Data transformed successfully:', {
      dataPoints: data.length,
      sampleData: data.slice(0, 5),
      valuesRange: { min: Math.min(...values), max: Math.max(...values) }
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
          const categoryName = categoryNames[params.value[1]];
          const periodName = periods[params.value[0]];
          const variance = params.value[2];
          
          return `<b>${categoryName}</b><br/>
                  Period: ${periodName}<br/>
                  Variance: ${variance >= 0 ? '+' : ''}${variance.toFixed(1)}%`;
        }
      },
      grid: {
        height: '60%',
        top: '15%',
        left: '15%',
        bottom: '20%'
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
        data: categoryNames,
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
        bottom: '2%',
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
      const categoryCode = chartData.categories[params.value[1]];
      const categoryName = getCategoryName(categoryCode);
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

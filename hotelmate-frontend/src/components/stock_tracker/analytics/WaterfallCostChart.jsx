import React, { useState, useEffect } from 'react';
import { Card, Spinner, Alert } from 'react-bootstrap';
import ChartErrorBoundary from '../charts/ChartErrorBoundary';
import ChartEmptyState from '../charts/ChartEmptyState';
import { getCostAnalysis, formatCurrency } from '@/services/stockAnalytics';
import ReactECharts from 'echarts-for-react';

/**
 * Waterfall Cost Analysis Chart Component
 * 
 * Uses NEW /compare/cost-analysis/?period1=X&period2=Y endpoint
 * Shows cost breakdown: Opening Stock → +Purchases → -Waste → -Transfers → Closing Stock → Usage/COGS
 * Uses ECharts for proper waterfall visualization
 */
const WaterfallCostChart = ({ 
  hotelSlug, 
  period1,
  period2,
  onSegmentClick,
  height = 450
}) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch data when periods change
  useEffect(() => {
    if (!hotelSlug || !period1 || !period2) {
      setError('Please select two periods to compare');
      setChartData(null);
      return;
    }

    fetchCostAnalysisData();
  }, [hotelSlug, period1, period2]);

  const fetchCostAnalysisData = async () => {
    setLoading(true);
    setError(null);

    console.log('🔍 WaterfallCostChart: Fetching cost analysis data...', {
      hotelSlug,
      period1,
      period2
    });

    try {
      const response = await getCostAnalysis(hotelSlug, period1, period2);
      
      console.log('📦 WaterfallCostChart: Raw API Response:', response);
      
      if (!response || !response.waterfall_data) {
        console.error('❌ WaterfallCostChart: No waterfall data in response');
        setError('No cost analysis data available');
        setChartData(null);
        return;
      }

      console.log('✅ WaterfallCostChart: Waterfall data received:', {
        waterfallDataLength: response.waterfall_data?.length,
        sampleData: response.waterfall_data?.slice(0, 3)
      });

      setChartData(response);
    } catch (err) {
      console.error('Error fetching cost analysis:', err);
      setError(err.message || 'Failed to load cost analysis data');
      setChartData(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Generate ECharts waterfall chart option
   */
  const getWaterfallOption = () => {
    console.log('🔧 WaterfallCostChart: Generating chart option...', chartData);
    
    if (!chartData || !chartData.waterfall_data) {
      console.error('❌ WaterfallCostChart: No chart data available');
      return null;
    }

    const waterfallData = chartData.waterfall_data;
    
    console.log('📋 WaterfallCostChart: Processing waterfall data:', {
      itemsCount: waterfallData.length,
      items: waterfallData.map(d => ({ label: d.label, value: d.value, type: d.type }))
    });

    // Prepare data for waterfall chart
    // ECharts doesn't have built-in waterfall, so we create it using stacked bars
    const categories = waterfallData.map(item => item.label);
    
    // Calculate cumulative values for positioning
    const values = waterfallData.map(item => item.value);
    const types = waterfallData.map(item => item.type); // 'positive', 'negative', 'total'
    
    // Create invisible bars for positioning
    const invisibleData = [];
    const visibleData = [];
    const colors = [];
    
    let runningTotal = 0;
    waterfallData.forEach((item, idx) => {
      if (item.type === 'total') {
        // Total bars start from 0
        invisibleData.push(0);
        visibleData.push(item.value);
        colors.push('#5470C6'); // Blue for totals
      } else {
        // Positive/negative bars positioned relative to running total
        invisibleData.push(Math.min(runningTotal, runningTotal + item.value));
        visibleData.push(Math.abs(item.value));
        colors.push(item.type === 'positive' ? '#91CC75' : '#EE6666'); // Green/Red
      }
      
      runningTotal += item.value;
    });

    return {
      title: {
        text: 'Cost Analysis Waterfall',
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow'
        },
        formatter: function(params) {
          const dataIndex = params[0].dataIndex;
          const item = waterfallData[dataIndex];
          const value = item.value;
          const percentage = item.percentage || 0;
          
          let tooltip = `<b>${item.label}</b><br/>`;
          tooltip += `Value: ${formatCurrency(Math.abs(value))}<br/>`;
          if (item.type !== 'total') {
            tooltip += `Change: ${value >= 0 ? '+' : ''}${formatCurrency(value)}<br/>`;
          }
          if (percentage) {
            tooltip += `Percentage: ${percentage.toFixed(1)}%`;
          }
          
          return tooltip;
        }
      },
      legend: {
        data: ['Invisible', 'Value'],
        show: false
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: {
          interval: 0,
          rotate: 30,
          fontSize: 11
        }
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: (value) => formatCurrency(value)
        }
      },
      series: [
        {
          name: 'Invisible',
          type: 'bar',
          stack: 'total',
          itemStyle: {
            borderColor: 'transparent',
            color: 'transparent'
          },
          emphasis: {
            itemStyle: {
              borderColor: 'transparent',
              color: 'transparent'
            }
          },
          data: invisibleData
        },
        {
          name: 'Value',
          type: 'bar',
          stack: 'total',
          label: {
            show: true,
            position: 'top',
            formatter: (params) => {
              const item = waterfallData[params.dataIndex];
              return formatCurrency(Math.abs(item.value));
            },
            fontSize: 10
          },
          itemStyle: {
            color: (params) => colors[params.dataIndex]
          },
          data: visibleData
        }
      ]
    };
  };

  // Handle chart click
  const onChartClick = (params) => {
    if (onSegmentClick && chartData?.waterfall_data) {
      const segment = chartData.waterfall_data[params.dataIndex];
      onSegmentClick(segment);
    }
  };

  const onEvents = {
    'click': onChartClick
  };

  // Retry handler
  const handleRetry = () => {
    fetchCostAnalysisData();
  };

  // Render loading state
  if (loading) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-warning text-dark">
          <h5 className="mb-0">Cost Analysis Waterfall</h5>
        </Card.Header>
        <Card.Body className="text-center" style={{ height: height }}>
          <Spinner animation="border" variant="warning" />
          <p className="mt-3">Loading cost analysis data...</p>
        </Card.Body>
      </Card>
    );
  }

  // Render error state
  if (error && !chartData) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-warning text-dark">
          <h5 className="mb-0">Cost Analysis Waterfall</h5>
        </Card.Header>
        <Card.Body style={{ height: height }}>
          <ChartEmptyState
            type="no-data"
            message={error}
            actionLabel="Retry"
            onActionClick={handleRetry}
          />
        </Card.Body>
      </Card>
    );
  }

  const chartOption = getWaterfallOption();

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-warning text-dark">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">Cost Analysis Waterfall</h5>
            <small>Flow from opening to closing stock</small>
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
            message="No waterfall data available for selected periods"
          />
        )}

        {/* Summary Stats */}
        {chartData?.summary && (
          <div className="mt-3 pt-3 border-top">
            <div className="row text-center">
              <div className="col-md-3">
                <div className="text-muted small">Opening Stock</div>
                <div className="h6 mb-0">{formatCurrency(chartData.summary.opening_stock || 0)}</div>
              </div>
              <div className="col-md-3">
                <div className="text-success small">+ Purchases</div>
                <div className="h6 mb-0">{formatCurrency(chartData.summary.total_purchases || 0)}</div>
              </div>
              <div className="col-md-3">
                <div className="text-danger small">- Usage/COGS</div>
                <div className="h6 mb-0">{formatCurrency(chartData.summary.total_usage || 0)}</div>
              </div>
              <div className="col-md-3">
                <div className="text-primary small">Closing Stock</div>
                <div className="h6 mb-0">{formatCurrency(chartData.summary.closing_stock || 0)}</div>
              </div>
            </div>

            {/* Cost Breakdown Details */}
            {chartData.breakdown && (
              <div className="mt-3">
                <h6 className="mb-2">Cost Breakdown</h6>
                <div className="row small">
                  <div className="col-md-4">
                    <div className="d-flex justify-content-between">
                      <span>Waste:</span>
                      <span className="text-danger">{formatCurrency(chartData.breakdown.waste || 0)}</span>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="d-flex justify-content-between">
                      <span>Transfers Out:</span>
                      <span className="text-warning">{formatCurrency(chartData.breakdown.transfers_out || 0)}</span>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="d-flex justify-content-between">
                      <span>Transfers In:</span>
                      <span className="text-success">{formatCurrency(chartData.breakdown.transfers_in || 0)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Legend */}
        <div className="mt-3 d-flex justify-content-center gap-3 small">
          <div><span style={{ color: '#5470C6' }}>■</span> Totals</div>
          <div><span style={{ color: '#91CC75' }}>■</span> Increases</div>
          <div><span style={{ color: '#EE6666' }}>■</span> Decreases</div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default WaterfallCostChart;

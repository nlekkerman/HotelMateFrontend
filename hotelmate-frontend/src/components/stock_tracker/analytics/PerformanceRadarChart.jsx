import React, { useState, useEffect } from 'react';
import { Card, Spinner, Badge, Alert } from 'react-bootstrap';
import UniversalChart from '../charts/UniversalChart';
import ChartErrorBoundary from '../charts/ChartErrorBoundary';
import ChartEmptyState from '../charts/ChartEmptyState';
import { getPerformanceScorecard } from '@/services/stockAnalytics';

/**
 * Performance Scorecard Radar Chart Component
 * 
 * Uses NEW /compare/performance-scorecard/?period1=X&period2=Y endpoint
 * Shows radar chart with KPIs: Value Management, Waste Control, Turnover, Variance Control
 * Displays overall_score and improvement indicators
 */
const PerformanceRadarChart = ({ 
  hotelSlug, 
  period1,
  period2,
  height = 450
}) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch data when periods change
  useEffect(() => {
    if (!hotelSlug || !period1 || !period2) {
      setError('Please select two periods to compare performance');
      setChartData(null);
      return;
    }

    fetchPerformanceData();
  }, [hotelSlug, period1, period2]);

  const fetchPerformanceData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getPerformanceScorecard(hotelSlug, period1, period2);
      
      if (!response || !response.radar_chart_data) {
        setError('No performance scorecard data available');
        setChartData(null);
        return;
      }

      // Transform API response to chart data
      const transformedData = transformToRadarData(response);
      const finalData = { ...response, radarData: transformedData };
      setChartData(finalData);
    } catch (err) {
      console.error('Error fetching performance scorecard:', err);
      setError(err.message || 'Failed to load performance scorecard');
      setChartData(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Transform API response to radar chart format
   * 
   * API Response Format:
   * {
   *   radar_chart_data: {
   *     labels: ["Value Management", "Waste Control", "Turnover", "Variance Control"],
   *     period1: [85, 70, 60, 75],
   *     period2: [90, 75, 65, 80]
   *   },
   *   period1: { id: 8, name: "September 2025" },
   *   period2: { id: 7, name: "October 2025" },
   *   overall_score: { period1: 72.5, period2: 77.5, improvement: 5.0 },
   *   metrics: [ ... ]
   * }
   */
  const transformToRadarData = (apiResponse) => {
    const { radar_chart_data, period1, period2 } = apiResponse;

    return {
      labels: radar_chart_data.labels,
      datasets: [
        {
          label: period1?.name || 'Period 1',
          data: radar_chart_data.period1,
          borderColor: 'rgb(54, 162, 235)',
          backgroundColor: 'rgba(54, 162, 235, 0.2)',
          pointBackgroundColor: 'rgb(54, 162, 235)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(54, 162, 235)'
        },
        {
          label: period2?.name || 'Period 2',
          data: radar_chart_data.period2,
          borderColor: 'rgb(75, 192, 192)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          pointBackgroundColor: 'rgb(75, 192, 192)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgb(75, 192, 192)'
        }
      ]
    };
  };

  // Get score badge color
  const getScoreBadge = (score) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'warning';
    return 'danger';
  };

  // Get improvement badge
  const getImprovementBadge = (improvement) => {
    if (improvement > 0) return { bg: 'success', icon: '↑', text: `+${improvement.toFixed(1)}%` };
    if (improvement < 0) return { bg: 'danger', icon: '↓', text: `${improvement.toFixed(1)}%` };
    return { bg: 'secondary', icon: '→', text: 'No Change' };
  };

  // Chart configuration
  const chartConfig = {
    showLegend: true,
    legendPosition: 'top',
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 20
        }
      }
    }
  };

  // Retry handler
  const handleRetry = () => {
    fetchPerformanceData();
  };

  // Render loading state
  if (loading) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-dark text-white">
          <h5 className="mb-0">Performance Scorecard</h5>
        </Card.Header>
        <Card.Body className="text-center" style={{ height: height }}>
          <Spinner animation="border" variant="dark" />
          <p className="mt-3">Loading performance data...</p>
        </Card.Body>
      </Card>
    );
  }

  // Render error state
  if (error && !chartData) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-dark text-white">
          <h5 className="mb-0">Performance Scorecard</h5>
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

  const improvementBadge = chartData?.overall_score?.improvement 
    ? getImprovementBadge(chartData.overall_score.improvement)
    : null;

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-dark text-white">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">Performance Scorecard</h5>
            <small>KPI comparison across periods</small>
          </div>
          {chartData?.overall_score && (
            <div className="d-flex align-items-center gap-2">
              <Badge bg={getScoreBadge(chartData.overall_score.period2)}>
                Score: {chartData.overall_score.period2.toFixed(1)}
              </Badge>
              {improvementBadge && (
                <Badge bg={improvementBadge.bg}>
                  {improvementBadge.icon} {improvementBadge.text}
                </Badge>
              )}
            </div>
          )}
        </div>
      </Card.Header>

      <Card.Body>
        {/* Overall Score Display */}
        {chartData?.overall_score && (
          <Alert variant="info" className="mb-3">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <strong>Overall Performance Score</strong>
              </div>
              <div className="d-flex gap-3">
                <span>
                  Period 1: <strong>{chartData.overall_score.period1.toFixed(1)}</strong>
                </span>
                <span>
                  Period 2: <strong>{chartData.overall_score.period2.toFixed(1)}</strong>
                </span>
              </div>
            </div>
          </Alert>
        )}

        {/* Radar Chart */}
        {chartData?.radarData ? (
          <ChartErrorBoundary onRetry={handleRetry}>
            <UniversalChart
              type="radar"
              data={chartData.radarData}
              config={chartConfig}
              height={height - 150}
            />
          </ChartErrorBoundary>
        ) : (
          <ChartEmptyState
            type="no-data"
            message="No performance data available for selected periods"
          />
        )}

        {/* Metrics Breakdown */}
        {chartData?.metrics && Array.isArray(chartData.metrics) && (
          <div className="mt-3 pt-3 border-top">
            <h6 className="mb-3">Performance Metrics Breakdown</h6>
            <div className="row">
              {chartData.metrics.map((metric) => {
                const change = metric.period2_score - metric.period1_score;
                const changePercent = metric.period1_score > 0 
                  ? ((change / metric.period1_score) * 100).toFixed(1)
                  : '0.0';
                const isImproved = change > 0;
                const isUnchanged = change === 0;
                
                return (
                  <div key={metric.name} className="col-md-6 mb-3">
                    <Card className="h-100">
                      <Card.Body className="p-2">
                        <div className="d-flex justify-content-between align-items-start">
                          <div>
                            <div className="small text-muted">{metric.name}</div>
                            <div className="d-flex align-items-baseline gap-2">
                              <span className="h6 mb-0">{metric.period2_score.toFixed(1)}</span>
                              {!isUnchanged && (
                                <Badge 
                                  bg={isImproved ? 'success' : 'danger'} 
                                  className="small"
                                >
                                  {isImproved ? '↑' : '↓'} {Math.abs(parseFloat(changePercent))}%
                                </Badge>
                              )}
                              {isUnchanged && (
                                <Badge bg="secondary" className="small">
                                  No Change
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-end">
                            <div className="small text-muted">Previous</div>
                            <div className="small">{metric.period1_score.toFixed(1)}</div>
                          </div>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="progress mt-2" style={{ height: '6px' }}>
                          <div 
                            className={`progress-bar ${isImproved ? 'bg-success' : isUnchanged ? 'bg-secondary' : 'bg-danger'}`}
                            style={{ width: `${metric.period2_score}%` }}
                          ></div>
                        </div>
                      </Card.Body>
                    </Card>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Performance Insights */}
        {chartData?.insights && chartData.insights.length > 0 && (
          <div className="mt-3">
            <h6 className="mb-2">Key Insights</h6>
            <ul className="small mb-0">
              {chartData.insights.map((insight, idx) => (
                <li key={idx} className="mb-1">{insight}</li>
              ))}
            </ul>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default PerformanceRadarChart;

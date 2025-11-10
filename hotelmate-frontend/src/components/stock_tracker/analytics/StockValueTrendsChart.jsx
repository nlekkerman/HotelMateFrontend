import React, { useState, useEffect } from 'react';
import { Card, Form, Row, Col, Alert, Badge, Spinner } from 'react-bootstrap';
import { FaChartLine, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import UniversalChart from '../charts/UniversalChart';
import ChartErrorBoundary from '../charts/ChartErrorBoundary';
import ChartEmptyState from '../charts/ChartEmptyState';
import { getPeriodsList, formatCurrency } from '@/services/stockAnalytics';

const StockValueTrendsChart = ({ 
  hotelSlug, 
  height = 400,
  periodCount = 12, // Show last 12 periods by default
  onPeriodClick = null,
  defaultChartType = 'line' // 'line' or 'area'
}) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState(defaultChartType);
  const [periods, setPeriods] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [showAverage, setShowAverage] = useState(true);
  const [showMinMax, setShowMinMax] = useState(false);

  useEffect(() => {
    if (hotelSlug) {
      fetchData();
    }
  }, [hotelSlug, periodCount]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getPeriodsList(hotelSlug);
      
      // API returns array directly, not {periods: [...]}
      const periodsList = Array.isArray(data) ? data : (data.periods || data.results || []);
      
      if (!periodsList || periodsList.length === 0) {
        setChartData(null);
        return;
      }

      // Filter only closed periods with stocktakes
      const closedPeriodsWithStocktakes = periodsList.filter(p => p.is_closed && p.stocktake);

      if (closedPeriodsWithStocktakes.length === 0) {
        setError('No closed periods with stocktakes available');
        setChartData(null);
        return;
      }

      // Sort periods by start_date (oldest first for chronological chart)
      const sortedPeriods = [...closedPeriodsWithStocktakes].sort((a, b) => 
        new Date(a.start_date) - new Date(b.start_date)
      );

      // Take last N periods
      const recentPeriods = sortedPeriods.slice(-periodCount);
      setPeriods(recentPeriods);

      const stats = calculateStatistics(recentPeriods);
      setStatistics(stats);

      const transformedData = transformToChartData(recentPeriods, stats);
      setChartData(transformedData);
    } catch (err) {
      console.error('Failed to fetch stock value trends:', err);
      setError(err.message || 'Failed to load stock value trends');
    } finally {
      setLoading(false);
    }
  };

  const calculateStatistics = (periodsList) => {
    if (!periodsList || periodsList.length === 0) {
      return null;
    }

    // Use manual_purchases_amount as the stock value
    const values = periodsList.map(p => parseFloat(p.manual_purchases_amount || 0));
    
    const sum = values.reduce((acc, val) => acc + val, 0);
    const average = sum / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);

    // Calculate trend (compare first and last periods)
    const firstValue = values[0];
    const lastValue = values[values.length - 1];
    const trendChange = lastValue - firstValue;
    const trendPercentage = firstValue > 0 ? (trendChange / firstValue) * 100 : 0;

    return {
      average,
      max,
      min,
      total: sum,
      count: periodsList.length,
      trendChange,
      trendPercentage,
      trendDirection: trendPercentage > 0 ? 'up' : trendPercentage < 0 ? 'down' : 'flat'
    };
  };

  const transformToChartData = (periodsList, stats) => {
    if (!periodsList || periodsList.length === 0) {
      return null;
    }

    const labels = periodsList.map(p => p.period_name || 'Unknown');
    // Use manual_purchases_amount as the stock value
    const values = periodsList.map(p => parseFloat(p.manual_purchases_amount || 0));

    const datasets = [
      {
        label: 'Purchases Amount',
        data: values,
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        borderColor: 'rgb(54, 162, 235)',
        borderWidth: 2,
        fill: chartType === 'area',
        tension: 0.4,
        pointRadius: 5,
        pointHoverRadius: 7,
        // Store metadata
        periodIds: periodsList.map(p => p.id)
      }
    ];

    // Add average line if enabled
    if (showAverage && stats) {
      datasets.push({
        label: 'Average',
        data: Array(values.length).fill(stats.average),
        backgroundColor: 'rgba(255, 206, 86, 0)',
        borderColor: 'rgb(255, 206, 86)',
        borderWidth: 2,
        borderDash: [5, 5],
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 0
      });
    }

    // Add min/max lines if enabled
    if (showMinMax && stats) {
      datasets.push({
        label: 'Maximum',
        data: Array(values.length).fill(stats.max),
        backgroundColor: 'rgba(75, 192, 192, 0)',
        borderColor: 'rgb(75, 192, 192)',
        borderWidth: 1,
        borderDash: [3, 3],
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 0
      });
      datasets.push({
        label: 'Minimum',
        data: Array(values.length).fill(stats.min),
        backgroundColor: 'rgba(255, 99, 132, 0)',
        borderColor: 'rgb(255, 99, 132)',
        borderWidth: 1,
        borderDash: [3, 3],
        fill: false,
        pointRadius: 0,
        pointHoverRadius: 0
      });
    }

    return {
      labels,
      datasets
    };
  };

  const handleChartClick = (dataIndex) => {
    if (onPeriodClick && periods[dataIndex]) {
      onPeriodClick(periods[dataIndex]);
    }
  };

  const getTrendBadge = () => {
    if (!statistics) return null;

    const { trendDirection, trendPercentage } = statistics;
    
    if (trendDirection === 'up') {
      return (
        <Badge bg="success">
          <FaArrowUp className="me-1" />
          {Math.abs(trendPercentage).toFixed(2)}%
        </Badge>
      );
    } else if (trendDirection === 'down') {
      return (
        <Badge bg="danger">
          <FaArrowDown className="me-1" />
          {Math.abs(trendPercentage).toFixed(2)}%
        </Badge>
      );
    } else {
      return <Badge bg="secondary">Flat</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-success text-white d-flex align-items-center">
          <FaChartLine className="me-2" />
          <span>Stock Value Trends</span>
        </Card.Header>
        <Card.Body className="d-flex justify-content-center align-items-center" style={{ height }}>
          <Spinner animation="border" variant="success" />
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-success text-white d-flex align-items-center">
          <FaChartLine className="me-2" />
          <span>Stock Value Trends</span>
        </Card.Header>
        <Card.Body>
          <Alert variant="danger">{error}</Alert>
        </Card.Body>
      </Card>
    );
  }

  if (!chartData) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-success text-white d-flex align-items-center">
          <FaChartLine className="me-2" />
          <span>Stock Value Trends</span>
        </Card.Header>
        <Card.Body>
          <ChartEmptyState type="no-periods" message="No period data available to show trends" />
        </Card.Body>
      </Card>
    );
  }

  return (
    <ChartErrorBoundary onRetry={fetchData}>
      <Card className="shadow-sm">
        <Card.Header className="bg-success text-white">
          <Row className="align-items-center">
            <Col>
              <FaChartLine className="me-2" />
              <span>Purchases Trends</span>
              <span className="ms-2 small">(Last {periods.length} periods)</span>
            </Col>
          </Row>
        </Card.Header>
        <Card.Body>
          {/* Statistics Summary */}
          {statistics && (
            <Alert variant="success" className="mb-3">
              <Row>
                <Col xs={6} md={3}>
                  <strong>Average:</strong><br />
                  {formatCurrency(statistics.average)}
                </Col>
                <Col xs={6} md={3}>
                  <strong>Maximum:</strong><br />
                  {formatCurrency(statistics.max)}
                </Col>
                <Col xs={6} md={3}>
                  <strong>Minimum:</strong><br />
                  {formatCurrency(statistics.min)}
                </Col>
                <Col xs={6} md={3}>
                  <strong>Trend:</strong><br />
                  {getTrendBadge()}
                </Col>
              </Row>
            </Alert>
          )}

          {/* Controls */}
          <Row className="mb-3">
            <Col xs={12} md={4}>
              <Form.Group>
                <Form.Label className="small text-muted mb-1">Chart Type</Form.Label>
                <Form.Select 
                  size="sm" 
                  value={chartType} 
                  onChange={(e) => setChartType(e.target.value)}
                >
                  <option value="line">Line Chart</option>
                  <option value="area">Area Chart</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={6} md={4}>
              <Form.Check 
                type="switch"
                id="show-average"
                label="Show Average Line"
                checked={showAverage}
                onChange={(e) => setShowAverage(e.target.checked)}
                className="mt-4"
              />
            </Col>
            <Col xs={6} md={4}>
              <Form.Check 
                type="switch"
                id="show-minmax"
                label="Show Min/Max Lines"
                checked={showMinMax}
                onChange={(e) => setShowMinMax(e.target.checked)}
                className="mt-4"
              />
            </Col>
          </Row>

          {/* Chart */}
          <UniversalChart
            type={chartType}
            data={chartData}
            config={{
              showLegend: true,
              showGrid: true,
              smooth: true
            }}
            height={height}
            onDataClick={handleChartClick}
          />

          {/* Info Footer */}
          <div className="mt-3 text-center">
            <small className="text-muted">
              Click on a point to view detailed period information
            </small>
          </div>
        </Card.Body>
      </Card>
    </ChartErrorBoundary>
  );
};

export default StockValueTrendsChart;

import React, { useState, useEffect } from 'react';
import { Card, Spinner, Badge, Nav } from 'react-bootstrap';
import UniversalChart from '../charts/UniversalChart';
import ChartErrorBoundary from '../charts/ChartErrorBoundary';
import ChartEmptyState from '../charts/ChartEmptyState';
import { getTopMovers, formatCurrency, calculatePercentageChange } from '@/services/stockAnalytics';

/**
 * Top Movers Chart Component
 * 
 * Uses NEW /compare/top-movers/?period1=X&period2=Y endpoint
 * Shows biggest increases/decreases between two periods
 * Color coded: green (increase), red (decrease)
 * Shows new/discontinued items
 */
const TopMoversChart = ({ 
  hotelSlug, 
  period1,
  period2,
  limit = 10,
  onItemClick,
  height = 400
}) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('all'); // all, increases, decreases, new, discontinued

  // Fetch data when periods change
  useEffect(() => {
    if (!hotelSlug || !period1 || !period2) {
      setError('Please select two periods to compare');
      setChartData(null);
      return;
    }

    fetchTopMoversData();
  }, [hotelSlug, period1, period2, limit]);

  const fetchTopMoversData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getTopMovers(hotelSlug, period1, period2, limit);
      
      if (!response) {
        setError('No top movers data available');
        setChartData(null);
        return;
      }

      setChartData(response);
    } catch (err) {
      console.error('Error fetching top movers:', err);
      setError(err.message || 'Failed to load top movers data');
      setChartData(null);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Transform data for chart display based on active tab
   */
  const getChartDataForTab = () => {
    if (!chartData) return null;

    let items = [];
    let title = '';
    
    switch (activeTab) {
      case 'increases':
        items = chartData.biggest_increases || [];
        title = 'Top Increases';
        break;
      case 'decreases':
        items = chartData.biggest_decreases || [];
        title = 'Top Decreases';
        break;
      case 'new':
        items = chartData.new_items || [];
        title = 'New Items';
        break;
      case 'discontinued':
        items = chartData.discontinued_items || [];
        title = 'Discontinued Items';
        break;
      default:
        // Combine increases and decreases for 'all'
        items = [
          ...(chartData.biggest_increases || []).slice(0, 5),
          ...(chartData.biggest_decreases || []).slice(0, 5)
        ];
        title = 'Top Movers (All)';
    }

    if (items.length === 0) {
      return null;
    }

    // Transform to horizontal bar chart format
    const labels = items.map(item => item.item_name);
    const values = items.map(item => item.value_change || item.value);
    const percentages = items.map(item => item.percentage_change || 0);
    
    // Color coding: green for positive, red for negative
    const colors = items.map(item => {
      const change = item.value_change || 0;
      if (activeTab === 'new') return 'rgba(54, 162, 235, 0.6)'; // blue for new
      if (activeTab === 'discontinued') return 'rgba(153, 102, 255, 0.6)'; // purple for discontinued
      return change >= 0 ? 'rgba(75, 192, 192, 0.6)' : 'rgba(255, 99, 132, 0.6)';
    });

    const borderColors = colors.map(c => c.replace('0.6', '1'));

    return {
      labels: labels,
      datasets: [{
        label: title,
        data: values,
        backgroundColor: colors,
        borderColor: borderColors,
        borderWidth: 1,
        percentages: percentages, // Store for tooltips
        items: items // Store full item data
      }],
      title: title
    };
  };

  // Chart configuration for horizontal bars
  const chartConfig = {
    indexAxis: 'y', // Horizontal bars
    showGrid: true,
    showLegend: false,
    tooltipCallbacks: {
      label: function(context) {
        const value = context.parsed.x || context.parsed || 0;
        const percentage = context.dataset.percentages?.[context.dataIndex] || 0;
        const item = context.dataset.items?.[context.dataIndex];
        
        let label = formatCurrency(value);
        if (percentage !== 0) {
          label += ` (${percentage > 0 ? '+' : ''}${percentage.toFixed(1)}%)`;
        }
        
        if (item) {
          if (item.period1_value !== undefined) {
            label += `\nPeriod 1: ${formatCurrency(item.period1_value)}`;
          }
          if (item.period2_value !== undefined) {
            label += `\nPeriod 2: ${formatCurrency(item.period2_value)}`;
          }
        }
        
        return label;
      }
    }
  };

  // Retry handler
  const handleRetry = () => {
    fetchTopMoversData();
  };

  // Tab counts
  const getTabCount = (tab) => {
    if (!chartData) return 0;
    switch (tab) {
      case 'increases': return chartData.biggest_increases?.length || 0;
      case 'decreases': return chartData.biggest_decreases?.length || 0;
      case 'new': return chartData.new_items?.length || 0;
      case 'discontinued': return chartData.discontinued_items?.length || 0;
      default: return 0;
    }
  };

  // Render loading state
  if (loading) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-success text-white">
          <h5 className="mb-0">Top Movers</h5>
        </Card.Header>
        <Card.Body className="text-center" style={{ height: height }}>
          <Spinner animation="border" variant="success" />
          <p className="mt-3">Loading top movers data...</p>
        </Card.Body>
      </Card>
    );
  }

  // Render error state
  if (error && !chartData) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-success text-white">
          <h5 className="mb-0">Top Movers</h5>
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

  const currentChartData = getChartDataForTab();

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-success text-white">
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <h5 className="mb-0">Top Movers</h5>
            <small>Biggest changes between periods</small>
          </div>
        </div>
      </Card.Header>

      <Card.Body>
        {/* Tab Navigation */}
        <Nav variant="tabs" className="mb-3">
          <Nav.Item>
            <Nav.Link 
              active={activeTab === 'all'} 
              onClick={() => setActiveTab('all')}
            >
              All
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link 
              active={activeTab === 'increases'} 
              onClick={() => setActiveTab('increases')}
            >
              Increases <Badge bg="success">{getTabCount('increases')}</Badge>
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link 
              active={activeTab === 'decreases'} 
              onClick={() => setActiveTab('decreases')}
            >
              Decreases <Badge bg="danger">{getTabCount('decreases')}</Badge>
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link 
              active={activeTab === 'new'} 
              onClick={() => setActiveTab('new')}
            >
              New <Badge bg="info">{getTabCount('new')}</Badge>
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link 
              active={activeTab === 'discontinued'} 
              onClick={() => setActiveTab('discontinued')}
            >
              Discontinued <Badge bg="secondary">{getTabCount('discontinued')}</Badge>
            </Nav.Link>
          </Nav.Item>
        </Nav>

        {/* Chart */}
        {currentChartData ? (
          <ChartErrorBoundary onRetry={handleRetry}>
            <UniversalChart
              type="bar"
              data={currentChartData}
              config={chartConfig}
              height={height}
              onDataClick={(data) => {
                console.log('Item clicked:', data);
                if (onItemClick && data.dataIndex !== undefined) {
                  const item = currentChartData.datasets[0].items[data.dataIndex];
                  onItemClick(item);
                }
              }}
            />
          </ChartErrorBoundary>
        ) : (
          <ChartEmptyState
            type="no-items"
            message={`No ${activeTab === 'all' ? 'movers' : activeTab} found for selected periods`}
          />
        )}

        {/* Summary Stats */}
        {chartData?.summary && (
          <div className="mt-3 pt-3 border-top">
            <div className="row text-center">
              <div className="col-3">
                <div className="text-success small">↑ Increases</div>
                <div className="h6 mb-0">{chartData.summary.increases_count || 0}</div>
              </div>
              <div className="col-3">
                <div className="text-danger small">↓ Decreases</div>
                <div className="h6 mb-0">{chartData.summary.decreases_count || 0}</div>
              </div>
              <div className="col-3">
                <div className="text-info small">★ New</div>
                <div className="h6 mb-0">{chartData.summary.new_items_count || 0}</div>
              </div>
              <div className="col-3">
                <div className="text-secondary small">✕ Discontinued</div>
                <div className="h6 mb-0">{chartData.summary.discontinued_count || 0}</div>
              </div>
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default TopMoversChart;

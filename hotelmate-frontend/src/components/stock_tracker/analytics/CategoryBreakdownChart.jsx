import React, { useState, useEffect } from 'react';
import { Card, Form, Row, Col, Alert, Table, Spinner } from 'react-bootstrap';
import { FaPieChart } from 'react-icons/fa';
import UniversalChart from '../charts/UniversalChart';
import ChartErrorBoundary from '../charts/ChartErrorBoundary';
import ChartEmptyState from '../charts/ChartEmptyState';
import { getPeriodSnapshot, formatCurrency } from '@/services/stockAnalytics';

const CategoryBreakdownChart = ({ 
  hotelSlug, 
  period,
  height = 400,
  onCategoryClick = null,
  defaultChartType = 'pie' // 'pie' or 'donut'
}) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState(defaultChartType);
  const [periodInfo, setPeriodInfo] = useState(null);
  const [categoryDetails, setCategoryDetails] = useState([]);

  useEffect(() => {
    if (hotelSlug && period) {
      fetchData();
    }
  }, [hotelSlug, period]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getPeriodSnapshot(hotelSlug, period);
      setPeriodInfo({
        name: data.period_name,
        start_date: data.start_date,
        end_date: data.end_date,
        total_value: data.total_stock_value
      });
      
      const transformedData = transformToChartData(data.by_category || []);
      setChartData(transformedData);
      setCategoryDetails(data.by_category || []);
    } catch (err) {
      console.error('Failed to fetch category breakdown:', err);
      setError(err.message || 'Failed to load category breakdown');
    } finally {
      setLoading(false);
    }
  };

  const transformToChartData = (categories) => {
    if (!categories || categories.length === 0) {
      return null;
    }

    const labels = categories.map(cat => cat.category);
    const values = categories.map(cat => parseFloat(cat.total_value || 0));
    const percentages = categories.map(cat => parseFloat(cat.percentage || 0));

    // Color palette for pie/donut
    const colors = [
      'rgba(255, 99, 132, 0.8)',
      'rgba(54, 162, 235, 0.8)',
      'rgba(255, 206, 86, 0.8)',
      'rgba(75, 192, 192, 0.8)',
      'rgba(153, 102, 255, 0.8)',
      'rgba(255, 159, 64, 0.8)',
      'rgba(199, 199, 199, 0.8)',
      'rgba(83, 102, 255, 0.8)',
      'rgba(255, 99, 255, 0.8)',
      'rgba(99, 255, 132, 0.8)'
    ];

    return {
      labels,
      datasets: [{
        data: values,
        backgroundColor: colors.slice(0, labels.length),
        borderColor: colors.slice(0, labels.length).map(c => c.replace('0.8', '1')),
        borderWidth: 2,
        // Store additional metadata
        percentages,
        itemCounts: categories.map(cat => cat.items_count || 0)
      }]
    };
  };

  const handleChartClick = (dataIndex) => {
    if (onCategoryClick && chartData) {
      const category = chartData.labels[dataIndex];
      const value = chartData.datasets[0].data[dataIndex];
      const percentage = chartData.datasets[0].percentages[dataIndex];
      onCategoryClick({ category, value, percentage });
    }
  };

  if (loading) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-info text-white d-flex align-items-center">
          <FaPieChart className="me-2" />
          <span>Category Breakdown</span>
        </Card.Header>
        <Card.Body className="d-flex justify-content-center align-items-center" style={{ height }}>
          <Spinner animation="border" variant="info" />
        </Card.Body>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-info text-white d-flex align-items-center">
          <FaPieChart className="me-2" />
          <span>Category Breakdown</span>
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
        <Card.Header className="bg-info text-white d-flex align-items-center">
          <FaPieChart className="me-2" />
          <span>Category Breakdown</span>
        </Card.Header>
        <Card.Body>
          <ChartEmptyState type="no-data" message="No category data available for this period" />
        </Card.Body>
      </Card>
    );
  }

  return (
    <ChartErrorBoundary onRetry={fetchData}>
      <Card className="shadow-sm">
        <Card.Header className="bg-info text-white">
          <Row className="align-items-center">
            <Col>
              <FaPieChart className="me-2" />
              <span>Category Breakdown</span>
              {periodInfo && <span className="ms-2 small">({periodInfo.name})</span>}
            </Col>
            <Col xs="auto">
              <Form.Select 
                size="sm" 
                value={chartType} 
                onChange={(e) => setChartType(e.target.value)}
                className="text-dark"
              >
                <option value="pie">Pie Chart</option>
                <option value="donut">Donut Chart</option>
              </Form.Select>
            </Col>
          </Row>
        </Card.Header>
        <Card.Body>
          {/* Summary Info */}
          {periodInfo && (
            <Alert variant="info" className="mb-3">
              <Row>
                <Col xs={12} md={6}>
                  <strong>Total Stock Value:</strong> {formatCurrency(periodInfo.total_value)}
                </Col>
                <Col xs={12} md={6}>
                  <strong>Categories:</strong> {categoryDetails.length}
                </Col>
              </Row>
            </Alert>
          )}

          {/* Chart */}
          <div style={{ height: height - 150 }}>
            <UniversalChart
              type={chartType}
              data={chartData}
              config={{
                showLegend: true,
                legendPosition: 'right',
                tooltipFormatter: (value, name, props) => {
                  const dataset = chartData.datasets[0];
                  const index = props.index;
                  return [
                    `${name}`,
                    `Value: ${formatCurrency(value)}`,
                    `Percentage: ${dataset.percentages[index].toFixed(2)}%`,
                    `Items: ${dataset.itemCounts[index]}`
                  ].join('\n');
                }
              }}
              height={height - 150}
              onDataClick={handleChartClick}
            />
          </div>

          {/* Category Details Table */}
          <div className="mt-3" style={{ maxHeight: '200px', overflowY: 'auto' }}>
            <Table striped bordered hover size="sm">
              <thead className="sticky-top bg-light">
                <tr>
                  <th>Category</th>
                  <th className="text-end">Value</th>
                  <th className="text-end">%</th>
                  <th className="text-end">Items</th>
                </tr>
              </thead>
              <tbody>
                {categoryDetails
                  .sort((a, b) => parseFloat(b.total_value) - parseFloat(a.total_value))
                  .map((cat, idx) => (
                    <tr 
                      key={idx}
                      style={{ cursor: onCategoryClick ? 'pointer' : 'default' }}
                      onClick={() => onCategoryClick && handleChartClick(idx)}
                    >
                      <td>
                        <span 
                          className="d-inline-block me-2" 
                          style={{ 
                            width: '12px', 
                            height: '12px', 
                            backgroundColor: chartData.datasets[0].backgroundColor[idx],
                            borderRadius: '2px'
                          }}
                        />
                        {cat.category}
                      </td>
                      <td className="text-end">{formatCurrency(cat.total_value)}</td>
                      <td className="text-end">{parseFloat(cat.percentage).toFixed(2)}%</td>
                      <td className="text-end">{cat.items_count}</td>
                    </tr>
                  ))}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>
    </ChartErrorBoundary>
  );
};

export default CategoryBreakdownChart;

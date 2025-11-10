import React, { useState, useEffect } from 'react';
import { Card, Spinner } from 'react-bootstrap';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { FaChartPie } from 'react-icons/fa';
import { getKPISummary, formatCurrency } from '@/services/stockAnalytics';

const CategoryDistributionChart = ({ hotelSlug, selectedPeriods, period1, height = 400 }) => {
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    if (hotelSlug && (selectedPeriods?.length > 0 || period1)) {
      fetchCategoryData();
    }
  }, [hotelSlug, selectedPeriods, period1]);

  const fetchCategoryData = async () => {
    try {
      setLoading(true);
      
      const periodIds = selectedPeriods?.length > 0 
        ? selectedPeriods 
        : (period1 ? [period1] : []);
      
      const response = await getKPISummary(hotelSlug, { periodIds });
      const distribution = response.data?.category_performance?.distribution || [];
      
      // Format data for recharts
      const formattedData = distribution.map(item => ({
        name: item.category_name,
        value: item.total_value,
        percentage: item.percentage_of_total,
        items: item.item_count
      }));
      
      setChartData(formattedData);
    } catch (error) {
      console.error('Error fetching category distribution:', error);
    } finally {
      setLoading(false);
    }
  };

  // Color palette for categories
  const COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8',
    '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border rounded shadow-sm p-3">
          <p className="fw-bold mb-2">{data.name}</p>
          <p className="mb-1 small">
            <strong>Value:</strong> {formatCurrency(data.value)}
          </p>
          <p className="mb-1 small">
            <strong>Percentage:</strong> {data.percentage?.toFixed(1)}%
          </p>
          <p className="mb-0 small">
            <strong>Items:</strong> {data.items}
          </p>
        </div>
      );
    }
    return null;
  };

  const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percentage }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Only show label if percentage is significant enough
    if (percentage < 5) return null;

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        style={{ fontSize: '12px', fontWeight: 'bold' }}
      >
        {`${percentage.toFixed(0)}%`}
      </text>
    );
  };

  if (loading) {
    return (
      <Card className="shadow-sm">
        <Card.Body className="text-center" style={{ height }}>
          <Spinner animation="border" variant="primary" />
          <div className="mt-3">Loading category distribution...</div>
        </Card.Body>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="shadow-sm">
        <Card.Header className="bg-white">
          <h5 className="mb-0">
            <FaChartPie className="me-2" />
            Category Distribution
          </h5>
        </Card.Header>
        <Card.Body className="text-center" style={{ height }}>
          <p className="text-muted">No category data available</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-white">
        <h5 className="mb-0">
          <FaChartPie className="me-2" />
          Category Distribution by Stock Value
        </h5>
      </Card.Header>
      <Card.Body>
        <ResponsiveContainer width="100%" height={height}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={renderCustomLabel}
              outerRadius={height / 3}
              fill="#8884d8"
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value, entry) => {
                const percentage = entry.payload.percentage?.toFixed(1) || 0;
                return `${value} (${percentage}%)`;
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Summary Table */}
        <div className="mt-3 pt-3 border-top">
          <h6 className="text-muted mb-3">Category Breakdown</h6>
          <div className="table-responsive">
            <table className="table table-sm table-hover">
              <thead className="table-light">
                <tr>
                  <th>Category</th>
                  <th className="text-end">Value</th>
                  <th className="text-end">%</th>
                  <th className="text-end">Items</th>
                </tr>
              </thead>
              <tbody>
                {chartData.map((category, idx) => (
                  <tr key={idx}>
                    <td>
                      <span 
                        className="d-inline-block me-2 rounded" 
                        style={{ 
                          width: '12px', 
                          height: '12px', 
                          backgroundColor: COLORS[idx % COLORS.length] 
                        }}
                      />
                      {category.name}
                    </td>
                    <td className="text-end">{formatCurrency(category.value)}</td>
                    <td className="text-end">{category.percentage?.toFixed(1)}%</td>
                    <td className="text-end">{category.items}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
};

export default CategoryDistributionChart;

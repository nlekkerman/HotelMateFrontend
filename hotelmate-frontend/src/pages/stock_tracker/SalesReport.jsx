import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Badge, Spinner, Alert, Button, Table } from 'react-bootstrap';
import { FaArrowLeft, FaCalendarAlt, FaBoxes, FaShoppingCart, FaCocktail, FaChartPie } from 'react-icons/fa';
import api from '@/services/api';
import { getSales, getSalesSummary, groupSalesByMonth } from '@/services/salesAnalytics';
import CategoryBreakdownChartWithCocktails from '@/components/stock_tracker/analytics/CategoryBreakdownChartWithCocktails';

export default function SalesReport() {
  const { hotel_slug } = useParams();
  const navigate = useNavigate();
  
  const [availableMonths, setAvailableMonths] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // For month-based view
  const [salesData, setSalesData] = useState(null);
  const [salesSummary, setSalesSummary] = useState(null);

  // Category definitions
  const categories = {
    'D': { name: 'Draught Beers', code: 'D' },
    'B': { name: 'Bottled Beers', code: 'B' },
    'S': { name: 'Spirits', code: 'S' },
    'M': { name: 'Minerals/Syrups', code: 'M' },
    'W': { name: 'Wine', code: 'W' }
  };

  useEffect(() => {
    fetchAvailableMonths();
  }, [hotel_slug]);

  useEffect(() => {
    if (selectedMonth) {
      fetchSalesData();
    }
  }, [selectedMonth]);

  const fetchAvailableMonths = async () => {
    try {
      setLoading(true);
      console.log('📅 Fetching all sales to determine available months...');
      
      // Fetch ALL sales
      const allSales = await getSales(hotel_slug, {});
      
      console.log('✅ Fetched sales:', allSales.length);
      
      if (allSales.length === 0) {
        setError('No sales found. Please create some sales first.');
        setLoading(false);
        return;
      }
      
      // Group sales by month
      const groupedByMonth = groupSalesByMonth(allSales);
      
      console.log('📊 Available months:', groupedByMonth.map(m => m.monthLabel));
      
      setAvailableMonths(groupedByMonth);
      
      // Select most recent month by default
      if (groupedByMonth.length > 0) {
        setSelectedMonth(groupedByMonth[0].monthKey); // Most recent month
      }
    } catch (err) {
      console.error('❌ Error fetching available months:', err);
      setError(err.response?.data?.detail || 'Failed to fetch sales data');
      setLoading(false);
    }
  };

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📊 Fetching sales summary for month:', selectedMonth);

      // Fetch sales for selected month
      const sales = await getSales(hotel_slug, { month: selectedMonth });
      
      console.log('✅ Sales for', selectedMonth, ':', sales.length);
      
      // Calculate summary
      const summary = await getSalesSummary(hotel_slug, { month: selectedMonth });
      
      console.log('✅ Summary:', summary);
      
      setSalesData(sales);
      setSalesSummary(summary);
    } catch (err) {
      console.error('❌ Error fetching sales data:', err);
      setError(err.message || err.response?.data?.detail || 'Failed to fetch sales data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(value || 0);
  };

  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(2)}%`;
  };

  const handleMonthChange = (e) => {
    setSelectedMonth(e.target.value);
  };
  
  const getSelectedMonthData = () => {
    return availableMonths.find(m => m.monthKey === selectedMonth);
  };

  if (loading) {
    return (
      <Container className="mt-4 text-center">
        <Spinner animation="border" />
        <p className="mt-2">Loading stock data...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          <Alert.Heading>Error</Alert.Heading>
          {error}
        </Alert>
        <Button variant="secondary" onClick={() => navigate(`/stock_tracker/${hotel_slug}`)}>
          <FaArrowLeft className="me-2" />
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  if (!salesSummary || !salesData) {
    return (
      <Container className="mt-4">
        <Alert variant="info">No sales data available for the selected month</Alert>
        <Button variant="secondary" onClick={() => navigate(`/stock_tracker/${hotel_slug}`)}>
          <FaArrowLeft className="me-2" />
          Back to Dashboard
        </Button>
      </Container>
    );
  }
  
  const selectedMonthData = getSelectedMonthData();

  return (
    <Container fluid className="mt-4">
      {/* Sticky Back Button - Top Left */}
      <Button 
        variant="outline-secondary"
        className="shadow"
        onClick={() => navigate(`/stock_tracker/${hotel_slug}`)}
        style={{
          position: 'fixed',
          top: '80px',
          left: '120px',
          zIndex: 1050,
          borderRadius: '8px',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '1rem',
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 1)';
          e.currentTarget.style.color = '#212529';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
          e.currentTarget.style.color = '';
        }}
        title="Back to Stock Tracker"
      >
        <FaArrowLeft /> Back
      </Button>

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="d-inline">
            <FaChartPie className="me-2" />
            Sales Analysis Report
          </h2>
          <Badge bg="success" className="ms-3">MONTH-BASED VIEW</Badge>
        </div>
      </div>

      {/* Month Selector */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={4}>
              <label className="form-label">
                <FaCalendarAlt className="me-2" />
                Select Month
              </label>
              <select 
                className="form-select"
                value={selectedMonth || ''}
                onChange={handleMonthChange}
              >
                {availableMonths.map(month => (
                  <option key={month.monthKey} value={month.monthKey}>
                    {month.monthLabel}
                  </option>
                ))}
              </select>
            </Col>
            <Col md={8}>
              <div className="text-muted small">
                Displaying sales for: <strong>{selectedMonthData?.monthLabel}</strong>
                <Badge bg="primary" className="ms-2">MONTH: {selectedMonth}</Badge>
                <Badge bg="info" className="ms-2">{salesData?.length || 0} sales</Badge>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Sales Navigation Cards */}
      <Card className="mb-4 border-success">
        <Card.Header className="bg-success text-white">
          <h5 className="mb-0">
            <FaShoppingCart className="me-2" />
            Sales Operations
          </h5>
        </Card.Header>
        <Card.Body>
          <Row className="g-3">
            <Col md={4}>
              <Card 
                className="h-100 border-primary"
                style={{ cursor: 'pointer', transition: 'transform 0.2s', opacity: 1 }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <Card.Body className="text-center">
                  <FaChartPie size={48} className="text-primary mb-3" />
                  <h5>Sales Analysis</h5>
                  <p className="text-muted small mb-0">
                    📊 You are here - View comprehensive sales reports
                  </p>
                  <Badge bg="primary" className="mt-2">Current Page</Badge>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card 
                className="h-100 border-info"
                style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                onClick={() => navigate(`/stock_tracker/${hotel_slug}/sales/list`)}
              >
                <Card.Body className="text-center">
                  <FaBoxes size={48} className="text-info mb-3" />
                  <h5>Sales History</h5>
                  <p className="text-muted small mb-0">
                    📋 View all individual sale transactions
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col md={4}>
              <Card 
                className="h-100 border-success"
                style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                onClick={() => navigate(`/stock_tracker/${hotel_slug}/sales/entry`)}
              >
                <Card.Body className="text-center">
                  <FaShoppingCart size={48} className="text-success mb-3" />
                  <h5>Enter Sales</h5>
                  <p className="text-muted small mb-0">
                    ✍️ Record new sales transactions
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Month Summary Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="border-primary">
            <Card.Body>
              <small className="text-muted">Total Revenue</small>
              <h3 className="mb-0 text-primary">{formatCurrency(salesSummary?.overall?.total_revenue || 0)}</h3>
              <small className="text-muted">{salesSummary?.overall?.total_sales || 0} sales</small>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-danger">
            <Card.Body>
              <small className="text-muted">Total Cost</small>
              <h3 className="mb-0 text-danger">{formatCurrency(salesSummary?.overall?.total_cost || 0)}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-success">
            <Card.Body>
              <small className="text-muted">Gross Profit</small>
              <h3 className="mb-0 text-success">{formatCurrency(salesSummary?.overall?.gross_profit || 0)}</h3>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card className="border-info">
            <Card.Body>
              <small className="text-muted">GP %</small>
              <h3 className="mb-0 text-info">{formatPercentage(salesSummary?.overall?.gp_percentage || 0)}</h3>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Category Breakdown Table */}
      <Card className="mb-4">
        <Card.Header className="bg-primary text-white">
          <h5 className="mb-0">
            <FaBoxes className="me-2" />
            Sales by Category
          </h5>
        </Card.Header>
        <Card.Body>
          <Table responsive hover>
            <thead>
              <tr>
                <th>Category</th>
                <th className="text-end">Sales</th>
                <th className="text-end">Quantity</th>
                <th className="text-end">Revenue</th>
                <th className="text-end">Cost</th>
                <th className="text-end">Profit</th>
                <th className="text-end">GP %</th>
              </tr>
            </thead>
            <tbody>
              {salesSummary?.by_category?.map(cat => (
                <tr key={cat.category_code}>
                  <td>
                    <Badge bg="light" text="dark">
                      {cat.category_code}
                    </Badge>
                    {' '}
                    <strong>{cat.category_name}</strong>
                  </td>
                  <td className="text-end">{cat.count}</td>
                  <td className="text-end">{parseFloat(cat.quantity || 0).toFixed(0)}</td>
                  <td className="text-end">
                    <strong>{formatCurrency(cat.revenue)}</strong>
                  </td>
                  <td className="text-end text-muted">{formatCurrency(cat.cost)}</td>
                  <td className="text-end text-success">
                    <strong>{formatCurrency(cat.profit)}</strong>
                  </td>
                  <td className="text-end">
                    <Badge bg="success">{formatPercentage(cat.gp_percentage)}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="table-secondary">
              <tr>
                <th>TOTAL</th>
                <th className="text-end">{salesSummary?.overall?.total_sales || 0}</th>
                <th className="text-end">{parseFloat(salesSummary?.overall?.total_quantity || 0).toFixed(0)}</th>
                <th className="text-end">
                  <strong>{formatCurrency(salesSummary?.overall?.total_revenue)}</strong>
                </th>
                <th className="text-end">{formatCurrency(salesSummary?.overall?.total_cost)}</th>
                <th className="text-end text-success">
                  <strong>{formatCurrency(salesSummary?.overall?.gross_profit)}</strong>
                </th>
                <th className="text-end">
                  <Badge bg="success">{formatPercentage(salesSummary?.overall?.gp_percentage)}</Badge>
                </th>
              </tr>
            </tfoot>
          </Table>
        </Card.Body>
      </Card>

      {/* Info Alert */}
      <Alert variant="success" className="mt-4">
        <Alert.Heading>✅ Month-Based Sales Analysis</Alert.Heading>
        <p className="mb-0">
          This report displays sales for <strong>{selectedMonthData?.monthLabel}</strong>. 
          All sales created in this month are automatically grouped and displayed here, 
          regardless of which specific date you selected in the calendar.
        </p>
        <hr />
        <p className="mb-0 small">
          <strong>💡 Tip:</strong> When you create a sale and select ANY date in September 
          (like Sep 5th, Sep 15th, or Sep 30th), it will appear under "September 2025" in this dropdown.
        </p>
      </Alert>
    </Container>
  );
}

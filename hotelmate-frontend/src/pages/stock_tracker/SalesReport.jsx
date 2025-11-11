import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Badge, Spinner, Alert, Button, Table } from 'react-bootstrap';
import { FaArrowLeft, FaCalendarAlt, FaBoxes, FaShoppingCart, FaCocktail, FaChartPie } from 'react-icons/fa';
import api from '@/services/api';
import { getSalesAnalysis } from '@/services/salesAnalytics';
import SalesDashboard from '@/components/stock_tracker/analytics/SalesDashboard';
import CategoryBreakdownChartWithCocktails from '@/components/stock_tracker/analytics/CategoryBreakdownChartWithCocktails';

export default function SalesReport() {
  const { hotel_slug } = useParams();
  const navigate = useNavigate();
  
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('combined'); // 'combined' or 'legacy'
  
  // For combined view
  const [salesData, setSalesData] = useState(null);

  // Category definitions
  const categories = {
    'D': { name: 'Draught Beers', code: 'D' },
    'B': { name: 'Bottled Beers', code: 'B' },
    'S': { name: 'Spirits', code: 'S' },
    'M': { name: 'Minerals/Syrups', code: 'M' },
    'W': { name: 'Wine', code: 'W' }
  };

  useEffect(() => {
    fetchPeriods();
  }, [hotel_slug]);

  useEffect(() => {
    if (selectedPeriod) {
      fetchSalesData();
    }
  }, [selectedPeriod, viewMode]);

  const fetchPeriods = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/stock_tracker/${hotel_slug}/periods/`);
      const allPeriods = response.data.results || response.data;
      
      const closedPeriods = allPeriods.filter(p => p.is_closed);
      setPeriods(closedPeriods);

      if (closedPeriods.length >= 1) {
        setSelectedPeriod(closedPeriods[closedPeriods.length - 1]);
      } else {
        setError('No closed periods found');
        setLoading(false);
      }
    } catch (err) {
      console.error('Error fetching periods:', err);
      setError(err.response?.data?.detail || 'Failed to fetch periods');
      setLoading(false);
    }
  };

  const fetchSalesData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch comprehensive sales analysis (stock + cocktails)
      const data = await getSalesAnalysis(hotel_slug, selectedPeriod.id, {
        includeCocktails: true,
        includeCategoryBreakdown: true
      });

      setSalesData(data);
    } catch (err) {
      console.error('Error fetching sales data:', err);
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

  const handlePeriodChange = (e) => {
    const periodId = parseInt(e.target.value);
    const selected = periods.find(p => p.id === periodId);
    if (selected) {
      setSelectedPeriod(selected);
    }
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

  if (!salesData) {
    return (
      <Container className="mt-4">
        <Alert variant="info">No sales data available for this period</Alert>
        <Button variant="secondary" onClick={() => navigate(`/stock_tracker/${hotel_slug}`)}>
          <FaArrowLeft className="me-2" />
          Back to Dashboard
        </Button>
      </Container>
    );
  }

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
          <Badge bg="success" className="ms-3">NEW - Combined View</Badge>
        </div>
      </div>

      {/* Period Selector */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={4}>
              <label className="form-label">
                <FaCalendarAlt className="me-2" />
                Select Period
              </label>
              <select 
                className="form-select"
                value={selectedPeriod?.id || ''}
                onChange={handlePeriodChange}
              >
                {periods.map(period => (
                  <option key={period.id} value={period.id}>
                    {period.period_name}
                  </option>
                ))}
              </select>
            </Col>
            <Col md={8}>
              <div className="text-muted small">
                Displaying sales for date range: <strong>{new Date(selectedPeriod?.start_date).toLocaleDateString()}</strong>
                {' '} to <strong>{new Date(selectedPeriod?.end_date).toLocaleDateString()}</strong>
                <Badge bg="info" className="ms-2">DATE-BASED</Badge>
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

      {/* Sales Dashboard - Combined View */}
      <SalesDashboard 
        hotelSlug={hotel_slug} 
        periodId={selectedPeriod.id} 
        height={400}
      />

      {/* Category Breakdown Chart */}
      <div className="mt-4">
        <CategoryBreakdownChartWithCocktails
          hotelSlug={hotel_slug}
          periodId={selectedPeriod.id}
          height={450}
          includeCocktails={true}
        />
      </div>

      {/* Quick Stats Row */}
      <Row className="mt-4">
        <Col md={6}>
          <Card className="border-0 bg-light">
            <Card.Body>
              <h6 className="text-muted mb-3">
                <FaBoxes className="me-2" />
                Stock Items Performance
              </h6>
              <Table borderless size="sm" className="mb-0">
                <tbody>
                  <tr>
                    <td>Revenue:</td>
                    <td className="text-end"><strong>{formatCurrency(salesData.general_sales.revenue)}</strong></td>
                  </tr>
                  <tr>
                    <td>Cost (COGS):</td>
                    <td className="text-end">{formatCurrency(salesData.general_sales.cost)}</td>
                  </tr>
                  <tr>
                    <td>Gross Profit:</td>
                    <td className="text-end text-success">
                      <strong>{formatCurrency(salesData.general_sales.profit)}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td>GP%:</td>
                    <td className="text-end">
                      <Badge bg="success">{formatPercentage(salesData.general_sales.gp_percentage)}</Badge>
                    </td>
                  </tr>
                  <tr>
                    <td>Items Sold:</td>
                    <td className="text-end">{salesData.general_sales.count}</td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          <Card className="border-0 bg-light">
            <Card.Body>
              <h6 className="text-muted mb-3">
                <FaCocktail className="me-2" />
                Cocktails Performance
                <Badge bg="warning" text="dark" className="ms-2 small">Separate Tracking</Badge>
              </h6>
              <Table borderless size="sm" className="mb-0">
                <tbody>
                  <tr>
                    <td>Revenue:</td>
                    <td className="text-end"><strong>{formatCurrency(salesData.cocktail_sales.revenue)}</strong></td>
                  </tr>
                  <tr>
                    <td>Cost:</td>
                    <td className="text-end">{formatCurrency(salesData.cocktail_sales.cost)}</td>
                  </tr>
                  <tr>
                    <td>Gross Profit:</td>
                    <td className="text-end text-success">
                      <strong>{formatCurrency(salesData.cocktail_sales.profit)}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td>GP%:</td>
                    <td className="text-end">
                      <Badge bg="success">{formatPercentage(salesData.cocktail_sales.gp_percentage)}</Badge>
                    </td>
                  </tr>
                  <tr>
                    <td>Cocktails Sold:</td>
                    <td className="text-end">{salesData.cocktail_sales.count}</td>
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Info Alert */}
      <Alert variant="success" className="mt-4">
        <Alert.Heading>✅ Real Sales Analysis</Alert.Heading>
        <p className="mb-0">
          This report displays <strong>real sales data</strong> from your backend combining stock item sales 
          and cocktail sales for comprehensive business intelligence. All calculations are performed by the backend.
        </p>
      </Alert>
    </Container>
  );
}

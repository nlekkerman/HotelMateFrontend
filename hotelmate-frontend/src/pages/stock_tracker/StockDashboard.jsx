// src/pages/stock_tracker/StockDashboard.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Badge, Spinner, Alert, Button, Table, Form } from 'react-bootstrap';
import { FaBoxes, FaChartLine, FaExclamationTriangle, FaClipboardList, FaExchangeAlt, FaCocktail, FaMoneyBillWave, FaCalendarAlt, FaDollarSign, FaPercentage } from 'react-icons/fa';
import api from '@/services/api';

export default function StockDashboard() {
  const { hotel_slug } = useParams();
  const navigate = useNavigate();
  
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [stockValueReport, setStockValueReport] = useState(null);
  const [reportsLoading, setReportsLoading] = useState(true);
  const [reportsError, setReportsError] = useState(null);
  
  // Fetch periods on mount
  useEffect(() => {
    fetchPeriods();
  }, [hotel_slug]);
  
  // Fetch reports when period changes
  useEffect(() => {
    if (selectedPeriod) {
      console.log('useEffect triggered - fetching reports for:', selectedPeriod.period_name, 'ID:', selectedPeriod.id);
      fetchBackendReports(selectedPeriod.id);
    }
  }, [selectedPeriod?.id]); // Only trigger when ID changes

  const fetchPeriods = async () => {
    try {
      console.log('Fetching periods for:', hotel_slug);
      
      const periodsResponse = await api.get(`/stock_tracker/${hotel_slug}/periods/`);
      const allPeriods = periodsResponse.data.results || periodsResponse.data;
      
      console.log('All periods:', allPeriods);
      
      // Filter closed periods and sort by end_date descending
      const closedPeriods = allPeriods
        .filter(p => p.is_closed)
        .sort((a, b) => new Date(b.end_date) - new Date(a.end_date));
      
      console.log('Closed periods:', closedPeriods);
      
      setPeriods(closedPeriods);
      
      // Auto-select the most recent period
      if (closedPeriods.length > 0) {
        setSelectedPeriod(closedPeriods[0]);
      } else {
        setReportsError('No closed periods found. Close a period first to see reports.');
        setReportsLoading(false);
      }
    } catch (err) {
      console.error('Error fetching periods:', err);
      setReportsError(err.response?.data?.detail || err.message || 'Failed to load periods');
      setReportsLoading(false);
    }
  };

  const fetchBackendReports = async (periodId) => {
    try {
      setReportsLoading(true);
      setReportsError(null);
      
      console.log('==========================================');
      console.log('🔄 FETCHING REPORTS FOR PERIOD ID:', periodId);
      console.log('Hotel Slug:', hotel_slug);
      console.log('==========================================');
      
      const stockValueUrl = `/stock_tracker/${hotel_slug}/reports/stock-value/?period=${periodId}`;
      
      console.log('📡 Stock Value URL:', stockValueUrl);
      
      // Fetch stock value report
      const stockValueResp = await api.get(stockValueUrl);
      
      console.log('✅ Stock Value Report Response:', stockValueResp.data);
      console.log('   - Period:', stockValueResp.data.period.period_name);
      console.log('   - Cost Value:', stockValueResp.data.totals.cost_value);
      
      setStockValueReport(stockValueResp.data);
      
    } catch (err) {
      console.error('❌ Error fetching backend reports:', err);
      console.error('Error details:', err.response?.data || err.message);
      setReportsError(err.response?.data?.detail || err.message || 'Failed to load reports');
    } finally {
      setReportsLoading(false);
      console.log('==========================================');
    }
  };

  const handlePeriodChange = (e) => {
    const periodId = parseInt(e.target.value);
    console.log('Period changed to ID:', periodId);
    const period = periods.find(p => p.id === periodId);
    if (period) {
      console.log('Selected period:', period.period_name);
      setSelectedPeriod(period);
    }
  };
  
  if (reportsLoading) {
    return (
      <Container className="mt-4 text-center">
        <Spinner animation="border" />
        <p className="mt-2">Loading stock reports from backend...</p>
      </Container>
    );
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  return (
    <Container fluid className="mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <FaBoxes className="me-2" />
          Stock Tracker Dashboard
        </h2>
      </div>

      {/* Period Selector */}
      {periods.length > 0 && (
        <Card className="mb-4 border-primary">
          <Card.Header className="bg-primary text-white">
            <h6 className="mb-0">
              <FaCalendarAlt className="me-2" />
              Period Selection
            </h6>
          </Card.Header>
          <Card.Body>
            <Row className="align-items-center">
              <Col md={5}>
                <Form.Group>
                  <Form.Label className="fw-bold">Choose Period to View:</Form.Label>
                  <Form.Select 
                    value={selectedPeriod?.id || ''} 
                    onChange={handlePeriodChange}
                    size="lg"
                    disabled={reportsLoading}
                  >
                    {periods.map(period => (
                      <option key={period.id} value={period.id}>
                        {period.period_name} ({new Date(period.start_date).toLocaleDateString('en-IE')} - {new Date(period.end_date).toLocaleDateString('en-IE')})
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={7}>
                <Alert variant="info" className="mb-0">
                  <div className="d-flex align-items-center">
                    <div className="flex-grow-1">
                      <strong>Currently Viewing:</strong> {selectedPeriod?.period_name}
                      <Badge bg="success" className="ms-2">Closed Period</Badge>
                    </div>
                    {reportsLoading && (
                      <Spinner animation="border" size="sm" />
                    )}
                  </div>
                  <small className="d-block mt-1">
                    Period End: {selectedPeriod && new Date(selectedPeriod.end_date).toLocaleDateString('en-IE', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </small>
                </Alert>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {/* Loading State */}
      {reportsLoading && (
        <Card className="mb-4">
          <Card.Body className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-3 mb-0">Loading reports for {selectedPeriod?.period_name}...</p>
          </Card.Body>
        </Card>
      )}

      {/* Backend Reports Section */}
      {!reportsLoading && stockValueReport ? (
        <>
          {/* Stock Value Report Card */}
          <Card className="mb-4 border-info">
            <Card.Header className="bg-info text-white">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <FaDollarSign className="me-2" />
                  {stockValueReport.period.period_name} - Stock Value Analysis
                  <small className="ms-2">(Period ID: {stockValueReport.period.id})</small>
                </h5>
                <Badge bg="light" text="dark">
                  Closed: {new Date(stockValueReport.period.end_date).toLocaleDateString('en-IE')}
                </Badge>
              </div>
            </Card.Header>
            <Card.Body>
              <Row className="mb-3">
                <Col md={4}>
                  <div className="p-3 bg-light rounded text-center">
                    <p className="text-muted mb-1 small">Cost Value</p>
                    <h4 className="text-primary mb-0">{formatCurrency(stockValueReport.totals.cost_value)}</h4>
                    <small className="text-muted">What you paid</small>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="p-3 bg-light rounded text-center">
                    <p className="text-muted mb-1 small">Potential Profit</p>
                    <h4 className="text-success mb-0">{formatCurrency(stockValueReport.totals.potential_profit)}</h4>
                    <small className="text-muted">Your markup</small>
                  </div>
                </Col>
                <Col md={4}>
                  <div className="p-3 bg-light rounded text-center">
                    <p className="text-muted mb-1 small">Markup %</p>
                    <h4 className="text-info mb-0">{stockValueReport.totals.markup_percentage.toFixed(1)}%</h4>
                    <small className="text-muted">Profit margin</small>
                  </div>
                </Col>
              </Row>
              
              <Table responsive hover size="sm">
                <thead className="table-light">
                  <tr>
                    <th>Category</th>
                    <th className="text-end">Cost Value</th>
                    <th className="text-end">Potential Profit</th>
                    <th className="text-end">Markup %</th>
                  </tr>
                </thead>
                <tbody>
                  {stockValueReport.categories.map(cat => (
                    <tr key={cat.category}>
                      <td>
                        <strong>{cat.name}</strong>
                        <Badge bg="secondary" className="ms-2">{cat.category}</Badge>
                      </td>
                      <td className="text-end">{formatCurrency(cat.cost_value)}</td>
                      <td className="text-end text-success"><strong>{formatCurrency(cat.potential_profit)}</strong></td>
                      <td className="text-end">
                        <Badge bg={cat.markup_percentage >= 200 ? 'success' : cat.markup_percentage >= 150 ? 'info' : 'warning'}>
                          {cat.markup_percentage.toFixed(1)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="table-secondary">
                  <tr>
                    <th>TOTAL</th>
                    <th className="text-end">{formatCurrency(stockValueReport.totals.cost_value)}</th>
                    <th className="text-end">{formatCurrency(stockValueReport.totals.potential_profit)}</th>
                    <th className="text-end">{stockValueReport.totals.markup_percentage.toFixed(1)}%</th>
                  </tr>
                </tfoot>
              </Table>
            </Card.Body>
          </Card>
        </>
      ) : reportsError ? (
        <Alert variant="danger" className="mb-4">
          <h5>Unable to Load Reports</h5>
          <p>{reportsError}</p>
          <small>Check console for details or contact support.</small>
        </Alert>
      ) : null}

      {/* Quick Actions */}
      <Card>
        <Card.Header>
          <h5 className="mb-0">Quick Actions</h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={3} className="mb-2">
              <Button 
                variant="outline-primary" 
                className="w-100"
                onClick={() => navigate(`/stock_tracker/${hotel_slug}/items`)}
              >
                <FaClipboardList className="me-2" />
                View All Items
              </Button>
            </Col>
            <Col md={3} className="mb-2">
              <Button 
                variant="outline-success" 
                className="w-100"
                onClick={() => navigate(`/stock_tracker/${hotel_slug}/profitability`)}
              >
                <FaChartLine className="me-2" />
                Profitability
              </Button>
            </Col>
            <Col md={3} className="mb-2">
              <Button 
                variant="outline-warning" 
                className="w-100"
                onClick={() => navigate(`/stock_tracker/${hotel_slug}/items?lowStock=true`)}
              >
                <FaExclamationTriangle className="me-2" />
                Low Stock
              </Button>
            </Col>
            <Col md={3} className="mb-2">
              <Button 
                variant="outline-info" 
                className="w-100"
                onClick={() => navigate(`/stock_tracker/${hotel_slug}/stocktakes`)}
              >
                <FaBoxes className="me-2" />
                Stocktakes
              </Button>
            </Col>
            <Col md={3} className="mb-2">
              <Button 
                variant="outline-secondary" 
                className="w-100"
                onClick={() => navigate(`/stock_tracker/${hotel_slug}/movements`)}
              >
                <FaExchangeAlt className="me-2" />
                Movements
              </Button>
            </Col>
            <Col md={3} className="mb-2">
              <Button 
                variant="outline-dark" 
                className="w-100"
                onClick={() => navigate(`/stock_tracker/${hotel_slug}/periods`)}
              >
                <FaClipboardList className="me-2" />
                Closed Stocktakes
              </Button>
            </Col>
            <Col md={4} className="mb-2">
              <Button 
                variant="outline-primary" 
                className="w-100"
                onClick={() => navigate(`/stock_tracker/${hotel_slug}/comparison`)}
              >
                <FaChartLine className="me-2" />
                Compare Periods
              </Button>
            </Col>
            <Col md={4} className="mb-2">
              <Button 
                variant="outline-info" 
                className="w-100"
                onClick={() => navigate(`/stock_tracker/${hotel_slug}/cocktails`)}
              >
                <FaCocktail className="me-2" />
                Cocktails
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </Container>
  );
}

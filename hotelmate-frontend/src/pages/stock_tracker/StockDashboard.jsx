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

      {/* Quick Actions */}
      <Card>
        <Card.Header>
          <h5 className="mb-0">Quick Actions</h5>
        </Card.Header>
        <Card.Body>
          <Row className="g-4">
            <Col xs={6} md={4} lg={4}>
              <Button 
                variant="outline-primary" 
                className="w-100 d-flex flex-column align-items-center justify-content-center"
                style={{ height: '150px', fontSize: '1.1rem' }}
                onClick={() => navigate(`/stock_tracker/${hotel_slug}/items`)}
              >
                <FaClipboardList size={40} className="mb-3" />
                <span>View All Items</span>
              </Button>
            </Col>
            <Col xs={6} md={4} lg={4}>
              <Button 
                variant="outline-success" 
                className="w-100 d-flex flex-column align-items-center justify-content-center"
                style={{ height: '150px', fontSize: '1.1rem' }}
                onClick={() => navigate(`/stock_tracker/${hotel_slug}/analytics`)}
              >
                <FaChartLine size={40} className="mb-3" />
                <span>Analytics</span>
              </Button>
            </Col>
            <Col xs={6} md={4} lg={4}>
              <Button 
                variant="outline-info" 
                className="w-100 d-flex flex-column align-items-center justify-content-center"
                style={{ height: '150px', fontSize: '1.1rem' }}
                onClick={() => navigate(`/stock_tracker/${hotel_slug}/operations`)}
              >
                <FaBoxes size={40} className="mb-3" />
                <span>Stock Operations</span>
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </Container>
  );
}

// src/pages/stock_tracker/StockDashboard.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Badge, Spinner, Alert, Button, Table, Form } from 'react-bootstrap';
import { FaBoxes, FaChartLine, FaExclamationTriangle, FaClipboardList, FaExchangeAlt, FaCocktail, FaMoneyBillWave, FaCalendarAlt, FaDollarSign, FaPercentage } from 'react-icons/fa';
import api from '@/services/api';
import analyticsIcon from '@/assets/icons/analytics-btn.png';
import stocktakeOpsIcon from '@/assets/icons/stocktake-ops.png';
import stockItemsIcon from '@/assets/icons/stock-items.png';

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
          <Row className="g-4 justify-content-center">
            <Col xs="auto" className="d-flex justify-content-center">
              <div
                onClick={() => navigate(`/stock_tracker/${hotel_slug}/items`)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = '3px solid gold';
                  e.currentTarget.querySelector('.hover-overlay').style.opacity = '1';
                  e.currentTarget.querySelector('span').style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.border = '1px solid rgba(108, 117, 125, 0.3)';
                  e.currentTarget.querySelector('.hover-overlay').style.opacity = '0';
                  e.currentTarget.querySelector('span').style.color = 'black';
                }}
                style={{
                  width: '180px',
                  height: '220px',
                  margin: '10px',
                  padding: '5px',
                  cursor: 'pointer',
                  border: '1px solid rgba(108, 117, 125, 0.3)',
                  borderRadius: '0.375rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease'
                }}
              >
                <div 
                  className="hover-overlay"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    opacity: 0,
                    transition: 'opacity 0.3s ease',
                    pointerEvents: 'none',
                    zIndex: 0
                  }}
                ></div>
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  padding: '8px',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  position: 'relative',
                  zIndex: 1
                }}>
                  <img 
                    src={stockItemsIcon} 
                    alt="View All Items" 
                    style={{ 
                      width: '120px', 
                      height: '120px', 
                      objectFit: 'contain',
                      display: 'block'
                    }} 
                  />
                </div>
                <span style={{ 
                  fontSize: '1rem', 
                  fontWeight: '600', 
                  position: 'relative', 
                  zIndex: 1,
                  textAlign: 'center',
                  maxWidth: '120px',
                  wordWrap: 'break-word',
                  lineHeight: '1.2',
                  color: 'black',
                  transition: 'color 0.3s ease'
                }}>View All Items</span>
              </div>
            </Col>
            <Col xs="auto" className="d-flex justify-content-center">
              <div
                onClick={() => navigate(`/stock_tracker/${hotel_slug}/analytics`)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = '3px solid gold';
                  e.currentTarget.querySelector('.hover-overlay').style.opacity = '1';
                  e.currentTarget.querySelector('span').style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.border = '1px solid rgba(108, 117, 125, 0.3)';
                  e.currentTarget.querySelector('.hover-overlay').style.opacity = '0';
                  e.currentTarget.querySelector('span').style.color = 'black';
                }}
                style={{
                  width: '180px',
                  height: '220px',
                  margin: '10px',
                  padding: '5px',
                  cursor: 'pointer',
                  border: '1px solid rgba(108, 117, 125, 0.3)',
                  borderRadius: '0.375rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease'
                }}
              >
                <div 
                  className="hover-overlay"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    opacity: 0,
                    transition: 'opacity 0.3s ease',
                    pointerEvents: 'none',
                    zIndex: 0
                  }}
                ></div>
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  padding: '8px',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  position: 'relative',
                  zIndex: 1
                }}>
                  <img 
                    src={analyticsIcon} 
                    alt="Analytics" 
                    style={{ 
                      width: '120px', 
                      height: '120px', 
                      objectFit: 'contain',
                      display: 'block'
                    }} 
                  />
                </div>
                <span style={{ 
                  fontSize: '1rem', 
                  fontWeight: '600', 
                  position: 'relative', 
                  zIndex: 1,
                  textAlign: 'center',
                  maxWidth: '120px',
                  wordWrap: 'break-word',
                  lineHeight: '1.2',
                  color: 'black',
                  transition: 'color 0.3s ease'
                }}>Analytics</span>
              </div>
            </Col>
            <Col xs="auto" className="d-flex justify-content-center">
              <div
                onClick={() => navigate(`/stock_tracker/${hotel_slug}/operations`)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = '3px solid gold';
                  e.currentTarget.querySelector('.hover-overlay').style.opacity = '1';
                  e.currentTarget.querySelector('span').style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.border = '1px solid rgba(108, 117, 125, 0.3)';
                  e.currentTarget.querySelector('.hover-overlay').style.opacity = '0';
                  e.currentTarget.querySelector('span').style.color = 'black';
                }}
                style={{
                  width: '180px',
                  height: '220px',
                  margin: '10px',
                  padding: '5px',
                  cursor: 'pointer',
                  border: '1px solid rgba(108, 117, 125, 0.3)',
                  borderRadius: '0.375rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease'
                }}
              >
                <div 
                  className="hover-overlay"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    opacity: 0,
                    transition: 'opacity 0.3s ease',
                    pointerEvents: 'none',
                    zIndex: 0
                  }}
                ></div>
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  padding: '8px',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  position: 'relative',
                  zIndex: 1
                }}>
                  <img 
                    src={stocktakeOpsIcon} 
                    alt="Stock Operations" 
                    style={{ 
                      width: '120px', 
                      height: '120px', 
                      objectFit: 'contain',
                      display: 'block'
                    }} 
                  />
                </div>
                <span style={{ 
                  fontSize: '1rem', 
                  fontWeight: '600', 
                  position: 'relative', 
                  zIndex: 1,
                  textAlign: 'center',
                  maxWidth: '120px',
                  wordWrap: 'break-word',
                  lineHeight: '1.2',
                  color: 'black',
                  transition: 'color 0.3s ease'
                }}>Stock Operations</span>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </Container>
  );
}

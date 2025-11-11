// src/pages/stock_tracker/SalesListView.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Table, Badge, Spinner, Alert, Button, Form, Accordion } from 'react-bootstrap';
import { FaArrowLeft, FaFilter, FaFileExport, FaLink, FaLockOpen, FaCalendarAlt, FaChevronDown } from 'react-icons/fa';
import { getAllSales, groupSalesByMonth, calculateSalesTotals, formatCurrency, formatSaleDate } from '@/services/salesAnalytics';

/**
 * SalesListView Component
 * 
 * Displays ALL individual sale records grouped by MONTH (using real sale_date)
 * NOT grouped by period - shows actual calendar months
 */
const SalesListView = () => {
  const { hotel_slug } = useParams();
  const navigate = useNavigate();

  const [sales, setSales] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Category definitions
  const categories = {
    'D': { name: 'Draught', color: '#3498db' },
    'B': { name: 'Bottled', color: '#2ecc71' },
    'S': { name: 'Spirits', color: '#9b59b6' },
    'W': { name: 'Wine', color: '#e74c3c' },
    'M': { name: 'Miscellaneous', color: '#95a5a6' }
  };

  // Fetch all sales on mount and when category changes
  useEffect(() => {
    fetchAllSales();
  }, [hotel_slug, selectedCategory]);

  const fetchAllSales = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('\n📊 === SALES LIST VIEW - FETCHING DATA ===');
      console.log('Hotel:', hotel_slug);
      console.log('Selected Category:', selectedCategory);

      const filters = selectedCategory !== 'all' ? { category: selectedCategory } : {};
      console.log('Filters:', filters);
      console.log('Calling getAllSales...');

      const data = await getAllSales(hotel_slug, filters);

      console.log('✅ API Response received:');
      console.log('  Raw data type:', typeof data);
      console.log('  Is array?', Array.isArray(data));
      console.log('  Has results?', !!data?.results);
      console.log('  Data:', data);

      const salesArray = Array.isArray(data) ? data : data.results || [];
      console.log('  Final sales array length:', salesArray.length);
      
      if (salesArray.length > 0) {
        console.log('  First sale sample:', salesArray[0]);
        console.log('  Total sales found:', salesArray.length);
      } else {
        console.warn('⚠️ No sales returned from API!');
        console.warn('Expected: 17 sales from Sept 11, 2025');
        console.warn('Check backend endpoint: /api/stock_tracker/' + hotel_slug + '/sales/');
      }

      setSales(salesArray);
    } catch (err) {
      console.error('❌ Error fetching sales:', err);
      console.error('Error details:', err.response?.data);
      setError(err.response?.data?.detail || 'Failed to fetch sales');
    } finally {
      setLoading(false);
    }
  };

  // Group sales by month using real sale_date
  const salesByMonth = useMemo(() => {
    const grouped = {};
    
    sales.forEach(sale => {
      const saleDate = new Date(sale.sale_date);
      const monthKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = saleDate.toLocaleDateString('en-IE', { year: 'numeric', month: 'long' });
      
      if (!grouped[monthKey]) {
        grouped[monthKey] = {
          monthKey,
          monthLabel,
          sales: [],
          totals: {
            revenue: 0,
            cost: 0,
            profit: 0,
            quantity: 0,
            count: 0
          }
        };
      }
      
      grouped[monthKey].sales.push(sale);
      grouped[monthKey].totals.revenue += parseFloat(sale.total_revenue || 0);
      grouped[monthKey].totals.cost += parseFloat(sale.total_cost || 0);
      grouped[monthKey].totals.profit += parseFloat(sale.gross_profit || (sale.total_revenue - sale.total_cost) || 0);
      grouped[monthKey].totals.quantity += parseFloat(sale.quantity || 0);
      grouped[monthKey].totals.count += 1;
    });
    
    // Sort by month (most recent first)
    return Object.values(grouped).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [sales]);

  // Calculate overall totals
  const grandTotals = useMemo(() => {
    return sales.reduce((acc, sale) => ({
      revenue: acc.revenue + parseFloat(sale.total_revenue || 0),
      cost: acc.cost + parseFloat(sale.total_cost || 0),
      profit: acc.profit + parseFloat(sale.gross_profit || (sale.total_revenue - sale.total_cost) || 0),
      quantity: acc.quantity + parseFloat(sale.quantity || 0)
    }), { revenue: 0, cost: 0, profit: 0, quantity: 0 });
  }, [sales]);

  const averageGP = grandTotals.revenue > 0 
    ? ((grandTotals.profit / grandTotals.revenue) * 100).toFixed(2) 
    : 0;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(value || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IE', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <Container className="mt-4 text-center">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted">Loading all sales data...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="mt-4">
      {/* Sticky Back Button */}
      <Button 
        variant="outline-secondary"
        className="shadow mb-3"
        onClick={() => navigate(`/stock_tracker/${hotel_slug}/sales/analysis`)}
        style={{
          position: 'fixed',
          top: '80px',
          left: '120px',
          zIndex: 1050,
          borderRadius: '8px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)'
        }}
      >
        <FaArrowLeft className="me-2" /> Back to Sales Dashboard
      </Button>

      {/* Header */}
      <Row className="mb-4">
        <Col>
          <h2>
            <FaCalendarAlt className="me-2" />
            Sales by Month
            <Badge bg="info" className="ms-3">{sales.length} Total Sales</Badge>
          </h2>
          <p className="text-muted">
            Grouped by calendar month using real sale dates (not periods)
          </p>
        </Col>
      </Row>

      {/* Simple Filter */}
      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={4}>
              <Form.Group>
                <Form.Label>
                  <FaFilter className="me-2" />
                  Filter by Category
                </Form.Label>
                <Form.Select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                >
                  <option value="all">All Categories</option>
                  {Object.entries(categories).map(([code, cat]) => (
                    <option key={code} value={code}>
                      {cat.name}
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={8} className="d-flex align-items-end">
              <Alert variant="info" className="mb-0 flex-grow-1">
                <small>
                  <FaLink className="me-2" />
                  Each sale shows a badge: <Badge bg="primary">Period Name</Badge> if linked or <Badge bg="secondary">Independent</Badge> if standalone
                </small>
              </Alert>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Grand Total Summary Cards */}
      {sales.length > 0 && (
        <Row className="mb-4">
          <Col md={3}>
            <Card className="border-primary">
              <Card.Body>
                <small className="text-muted">Total Revenue</small>
                <h4 className="mb-0 text-primary">{formatCurrency(grandTotals.revenue)}</h4>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-danger">
              <Card.Body>
                <small className="text-muted">Total Cost</small>
                <h4 className="mb-0 text-danger">{formatCurrency(grandTotals.cost)}</h4>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-success">
              <Card.Body>
                <small className="text-muted">Gross Profit</small>
                <h4 className="mb-0 text-success">{formatCurrency(grandTotals.profit)}</h4>
                <Badge bg="success">{averageGP}% GP</Badge>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-info">
              <Card.Body>
                <small className="text-muted">Items Sold</small>
                <h4 className="mb-0 text-info">{grandTotals.quantity.toFixed(0)}</h4>
                <small className="text-muted">{sales.length} transactions</small>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Sales Grouped by Month */}
      {sales.length === 0 ? (
        <Card>
          <Card.Body className="text-center p-5">
            <p className="text-muted mb-3">No sales records found</p>
            <Button 
              variant="primary" 
              onClick={() => navigate(`/stock_tracker/${hotel_slug}/sales/entry`)}
            >
              Enter Sales Records
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <Accordion defaultActiveKey="0">
          {salesByMonth.map((monthData, idx) => {
            const monthGP = monthData.totals.revenue > 0 
              ? ((monthData.totals.profit / monthData.totals.revenue) * 100).toFixed(2)
              : 0;

            return (
              <Accordion.Item eventKey={String(idx)} key={monthData.monthKey}>
                <Accordion.Header>
                  <div className="w-100 d-flex justify-content-between align-items-center pe-3">
                    <div>
                      <FaCalendarAlt className="me-2" />
                      <strong>{monthData.monthLabel}</strong>
                      <Badge bg="secondary" className="ms-2">{monthData.totals.count} sales</Badge>
                    </div>
                    <div className="d-flex gap-3">
                      <span className="text-primary">
                        <strong>Revenue:</strong> {formatCurrency(monthData.totals.revenue)}
                      </span>
                      <span className="text-success">
                        <strong>Profit:</strong> {formatCurrency(monthData.totals.profit)}
                      </span>
                      <Badge bg="success">{monthGP}% GP</Badge>
                    </div>
                  </div>
                </Accordion.Header>
                <Accordion.Body className="p-0">
                  <Table responsive hover className="mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Item</th>
                        <th>Category</th>
                        <th className="text-end">Qty</th>
                        <th className="text-end">Unit Price</th>
                        <th className="text-end">Unit Cost</th>
                        <th className="text-end">Revenue</th>
                        <th className="text-end">Cost</th>
                        <th className="text-end">Profit</th>
                        <th className="text-end">GP%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {monthData.sales.map(sale => {
                        const saleGP = sale.gross_profit_percentage || 
                          (sale.total_revenue > 0 
                            ? ((parseFloat(sale.gross_profit || 0) / parseFloat(sale.total_revenue)) * 100).toFixed(1)
                            : 0);
                        
                        return (
                          <tr key={sale.id}>
                            <td>
                              <strong>{formatDate(sale.sale_date)}</strong>
                            </td>
                            <td>
                              {sale.stocktake_period_name ? (
                                <Badge bg="primary" className="d-flex align-items-center gap-1" style={{ width: 'fit-content' }}>
                                  <FaLink size={10} />
                                  {sale.stocktake_period_name}
                                </Badge>
                              ) : (
                                <Badge bg="secondary" className="d-flex align-items-center gap-1" style={{ width: 'fit-content' }}>
                                  <FaLockOpen size={10} />
                                  Independent
                                </Badge>
                              )}
                            </td>
                            <td>
                              <strong>{sale.item_name || sale.item?.name}</strong>
                              <br />
                              <small className="text-muted">{sale.item_sku || sale.item?.sku}</small>
                            </td>
                            <td>
                              <Badge 
                                bg="light" 
                                text="dark"
                                style={{ 
                                  borderLeft: `3px solid ${categories[sale.category_code || sale.item?.category?.code]?.color || '#ccc'}`
                                }}
                              >
                                {sale.category_name || sale.item?.category?.name || sale.category_code}
                              </Badge>
                            </td>
                            <td className="text-end">{parseFloat(sale.quantity).toFixed(0)}</td>
                            <td className="text-end">{formatCurrency(sale.unit_price)}</td>
                            <td className="text-end text-muted">{formatCurrency(sale.unit_cost)}</td>
                            <td className="text-end">
                              <strong>{formatCurrency(sale.total_revenue)}</strong>
                            </td>
                            <td className="text-end text-muted">
                              {formatCurrency(sale.total_cost)}
                            </td>
                            <td className="text-end text-success">
                              <strong>{formatCurrency(sale.gross_profit || (sale.total_revenue - sale.total_cost))}</strong>
                            </td>
                            <td className="text-end">
                              <Badge bg="success">
                                {saleGP}%
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="table-secondary">
                      <tr>
                        <th colSpan="4">MONTH TOTALS</th>
                        <th className="text-end">{monthData.totals.quantity.toFixed(0)}</th>
                        <th colSpan="2"></th>
                        <th className="text-end">
                          <strong>{formatCurrency(monthData.totals.revenue)}</strong>
                        </th>
                        <th className="text-end">{formatCurrency(monthData.totals.cost)}</th>
                        <th className="text-end text-success">
                          <strong>{formatCurrency(monthData.totals.profit)}</strong>
                        </th>
                        <th className="text-end">
                          <Badge bg="success">{monthGP}%</Badge>
                        </th>
                      </tr>
                    </tfoot>
                  </Table>
                </Accordion.Body>
              </Accordion.Item>
            );
          })}
        </Accordion>
      )}

      {/* Info Note */}
      <Alert variant="info" className="mt-4">
        <strong>ℹ️ About Sales Records:</strong>
        <ul className="mb-0 mt-2">
          <li><Badge bg="primary">Linked</Badge> sales are associated with a specific period/stocktake</li>
          <li><Badge bg="secondary">Independent</Badge> sales were saved standalone (can be linked later)</li>
          <li>All sales contribute to analytics and reports</li>
        </ul>
      </Alert>
    </Container>
  );
};

export default SalesListView;

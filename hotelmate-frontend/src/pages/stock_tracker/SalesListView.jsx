// src/pages/stock_tracker/SalesListView.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Table, Badge, Spinner, Alert, Button, Form } from 'react-bootstrap';
import { FaArrowLeft, FaFilter, FaFileExport, FaLink, FaLockOpen } from 'react-icons/fa';
import { getAllSales } from '@/services/stockAnalytics';
import api from '@/services/api';

/**
 * SalesListView Component
 * 
 * Displays ALL individual sale records (independent + linked to periods)
 * Shows badges indicating if sales are linked to a period/stocktake or independent
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

      const filters = selectedCategory !== 'all' ? { category: selectedCategory } : {};
      const data = await getAllSales(hotel_slug, filters);

      setSales(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error('Error fetching sales:', err);
      setError(err.response?.data?.detail || 'Failed to fetch sales');
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals
  const totals = sales.reduce((acc, sale) => ({
    revenue: acc.revenue + parseFloat(sale.total_revenue || 0),
    cost: acc.cost + parseFloat(sale.total_cost || 0),
    profit: acc.profit + parseFloat(sale.gross_profit || 0),
    quantity: acc.quantity + parseFloat(sale.quantity || 0)
  }), { revenue: 0, cost: 0, profit: 0, quantity: 0 });

  const averageGP = totals.revenue > 0 
    ? ((totals.profit / totals.revenue) * 100).toFixed(2) 
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
        onClick={() => navigate(`/stock_tracker/${hotel_slug}`)}
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
        <FaArrowLeft className="me-2" /> Back
      </Button>

      {/* Header */}
      <Row className="mb-4">
        <Col>
          <h2>
            All Sales Transactions
            <Badge bg="success" className="ms-3">All Records</Badge>
          </h2>
          <p className="text-muted">
            <FaLockOpen className="me-2" />
            Viewing all sales (independent + linked to periods)
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

      {/* Summary Cards */}
      {sales.length > 0 && (
        <Row className="mb-4">
          <Col md={3}>
            <Card className="border-primary">
              <Card.Body>
                <small className="text-muted">Total Revenue</small>
                <h4 className="mb-0 text-primary">{formatCurrency(totals.revenue)}</h4>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-danger">
              <Card.Body>
                <small className="text-muted">Total Cost</small>
                <h4 className="mb-0 text-danger">{formatCurrency(totals.cost)}</h4>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-success">
              <Card.Body>
                <small className="text-muted">Gross Profit</small>
                <h4 className="mb-0 text-success">{formatCurrency(totals.profit)}</h4>
                <Badge bg="success">{averageGP}% GP</Badge>
              </Card.Body>
            </Card>
          </Col>
          <Col md={3}>
            <Card className="border-info">
              <Card.Body>
                <small className="text-muted">Items Sold</small>
                <h4 className="mb-0 text-info">{totals.quantity.toFixed(0)}</h4>
                <small className="text-muted">{sales.length} transactions</small>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

      {/* Sales Table */}
      <Card>
        <Card.Header className="bg-light d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            Sales Transactions
            {sales.length > 0 && (
              <Badge bg="secondary" className="ms-2">{sales.length} records</Badge>
            )}
          </h5>
          {sales.length > 0 && (
            <Button variant="outline-success" size="sm">
              <FaFileExport className="me-2" />
              Export CSV
            </Button>
          )}
        </Card.Header>
        <Card.Body className="p-0">
          {loading ? (
            <div className="text-center p-5">
              <Spinner animation="border" variant="primary" />
              <p className="mt-2 text-muted">Loading sales...</p>
            </div>
          ) : sales.length === 0 ? (
            <div className="text-center p-5">
              <p className="text-muted mb-0">No sales records found for selected filters</p>
              <Button 
                variant="link" 
                onClick={() => navigate(`/stock_tracker/${hotel_slug}/sales/entry`)}
              >
                Enter Sales Records
              </Button>
            </div>
          ) : (
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
                {sales.map(sale => (
                  <tr key={sale.id}>
                    <td>{formatDate(sale.sale_date)}</td>
                    <td>
                      {sale.stocktake_period_name ? (
                        <Badge bg="primary" className="d-flex align-items-center gap-1">
                          <FaLink size={10} />
                          {sale.stocktake_period_name}
                        </Badge>
                      ) : (
                        <Badge bg="secondary" className="d-flex align-items-center gap-1">
                          <FaLockOpen size={10} />
                          Independent
                        </Badge>
                      )}
                    </td>
                    <td>
                      <strong>{sale.item_name}</strong>
                      <br />
                      <small className="text-muted">{sale.item_sku}</small>
                    </td>
                    <td>
                      <Badge 
                        bg="light" 
                        text="dark"
                        style={{ 
                          borderLeft: `3px solid ${categories[sale.category_code]?.color || '#ccc'}`
                        }}
                      >
                        {sale.category_name || sale.category_code}
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
                      <strong>{formatCurrency(sale.gross_profit)}</strong>
                    </td>
                    <td className="text-end">
                      <Badge bg="success">
                        {parseFloat(sale.gross_profit_percentage || 0).toFixed(1)}%
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="table-secondary">
                <tr>
                  <th colSpan="4">TOTALS</th>
                  <th className="text-end">{totals.quantity.toFixed(0)}</th>
                  <th colSpan="2"></th>
                  <th className="text-end">
                    <strong>{formatCurrency(totals.revenue)}</strong>
                  </th>
                  <th className="text-end">{formatCurrency(totals.cost)}</th>
                  <th className="text-end text-success">
                    <strong>{formatCurrency(totals.profit)}</strong>
                  </th>
                  <th className="text-end">
                    <Badge bg="success">{averageGP}%</Badge>
                  </th>
                </tr>
              </tfoot>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Info Note */}
      <Alert variant="info" className="mt-3">
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

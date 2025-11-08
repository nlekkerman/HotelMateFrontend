import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Badge, Spinner, Alert, Button, Table } from 'react-bootstrap';
import { FaArrowLeft, FaCalendarAlt, FaBoxes, FaShoppingCart } from 'react-icons/fa';
import api from '@/services/api';

export default function SalesReport() {
  const { hotel_slug } = useParams();
  const navigate = useNavigate();
  
  const [periods, setPeriods] = useState([]);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      fetchStockData();
    }
  }, [selectedPeriod]);

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

  const fetchStockData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [snapshotsData, purchasesData] = await Promise.all([
        api.get(`/stock_tracker/${hotel_slug}/snapshots/?period=${selectedPeriod.id}`),
        api.get(`/stock_tracker/${hotel_slug}/movements/?period=${selectedPeriod.id}&movement_type=PURCHASE`)
      ]);

      setSnapshots(snapshotsData.data.results || snapshotsData.data);
      setPurchases(purchasesData.data.results || purchasesData.data);
    } catch (err) {
      console.error('Error fetching stock data:', err);
      setError(err.response?.data?.detail || 'Failed to fetch stock data');
    } finally {
      setLoading(false);
    }
  };

  // Simple grouping by category - NO calculations, just display backend data
  const getStockValueByCategory = () => {
    const categoryData = {};
    
    Object.keys(categories).forEach(code => {
      categoryData[code] = {
        name: categories[code].name,
        code: code,
        costValue: 0,
        itemCount: 0,
        items: []
      };
    });

    snapshots.forEach(snapshot => {
      const category = snapshot.item.category;
      if (categoryData[category]) {
        categoryData[category].costValue += parseFloat(snapshot.closing_stock_value || 0);
        categoryData[category].itemCount += 1;
        categoryData[category].items.push(snapshot);
      }
    });

    return categoryData;
  };

  const getPurchasesByCategory = () => {
    const categoryData = {};
    
    Object.keys(categories).forEach(code => {
      categoryData[code] = {
        name: categories[code].name,
        purchaseValue: 0,
        purchaseCount: 0
      };
    });

    purchases.forEach(purchase => {
      const category = purchase.item.sku[0];
      if (categoryData[category]) {
        const purchaseValue = parseFloat(purchase.quantity || 0) * parseFloat(purchase.unit_cost || 0);
        categoryData[category].purchaseValue += purchaseValue;
        categoryData[category].purchaseCount += 1;
      }
    });

    return categoryData;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(value);
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

  if (!snapshots.length) {
    return (
      <Container className="mt-4">
        <Alert variant="info">No stock data available for this period</Alert>
        <Button variant="secondary" onClick={() => navigate(`/stock_tracker/${hotel_slug}`)}>
          <FaArrowLeft className="me-2" />
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  const stockByCategory = getStockValueByCategory();
  const purchasesByCategory = getPurchasesByCategory();
  
  const totalCostValue = Object.values(stockByCategory).reduce((sum, cat) => sum + cat.costValue, 0);
  const totalPurchases = Object.values(purchasesByCategory).reduce((sum, cat) => sum + cat.purchaseValue, 0);
  const totalItems = snapshots.length;

  return (
    <Container fluid className="mt-4">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button 
            variant="outline-secondary" 
            size="sm"
            className="me-3"
            onClick={() => navigate(`/stock_tracker/${hotel_slug}`)}
          >
            <FaArrowLeft className="me-2" />
            Back
          </Button>
          <h2 className="d-inline">
            <FaBoxes className="me-2" />
            Stock Value Report
          </h2>
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
                Displaying closing stock value for <strong>{selectedPeriod?.period_name}</strong>
                {' '}({new Date(selectedPeriod?.end_date).toLocaleDateString()})
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Summary Cards */}
      <Row className="mb-4">
        <Col md={4}>
          <Card className="h-100 border-primary">
            <Card.Body>
              <p className="text-muted mb-1 small">💰 Stock Cost Value</p>
              <h3 className="text-primary mb-0">{formatCurrency(totalCostValue)}</h3>
              <small className="text-muted">What you paid for inventory</small>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          <Card className="h-100 border-info">
            <Card.Body>
              <p className="text-muted mb-1 small">📦 Total Items</p>
              <h3 className="text-info mb-0">{totalItems}</h3>
              <small className="text-muted">In closing stock</small>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={4}>
          <Card className="h-100 border-warning">
            <Card.Body>
              <p className="text-muted mb-1 small">🛒 Period Purchases</p>
              <h3 className="text-warning mb-0">{formatCurrency(totalPurchases)}</h3>
              <small className="text-muted">⚠️ Mock data for display</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Warning Banner */}
      <Alert variant="warning" className="mb-4">
        <Alert.Heading>⚠️ Display Only</Alert.Heading>
        <p className="mb-0">
          This shows stock values from backend calculations. Purchase data is mock data for demonstration purposes.
          Revenue and sales calculations will come from backend when real POS data is integrated.
        </p>
      </Alert>

      {/* Stock Value by Category */}
      <Card className="mb-4">
        <Card.Header className="bg-primary text-white">
          <h5 className="mb-0">Stock Value by Category</h5>
        </Card.Header>
        <Card.Body className="p-0">
          <Table responsive hover className="mb-0">
            <thead className="table-light">
              <tr>
                <th>Category</th>
                <th className="text-end">Items</th>
                <th className="text-end">Stock Cost Value</th>
                <th className="text-end">Period Purchases</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(stockByCategory).map(category => (
                <tr key={category.code}>
                  <td>
                    <strong>{category.name}</strong>
                    <Badge bg="secondary" className="ms-2">{category.code}</Badge>
                  </td>
                  <td className="text-end">{category.itemCount}</td>
                  <td className="text-end"><strong>{formatCurrency(category.costValue)}</strong></td>
                  <td className="text-end text-muted">
                    {formatCurrency(purchasesByCategory[category.code]?.purchaseValue || 0)}
                    {purchasesByCategory[category.code]?.purchaseCount > 0 && (
                      <small className="ms-1">({purchasesByCategory[category.code].purchaseCount} items)</small>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="table-secondary">
              <tr>
                <th>TOTAL</th>
                <th className="text-end">{totalItems}</th>
                <th className="text-end">{formatCurrency(totalCostValue)}</th>
                <th className="text-end">{formatCurrency(totalPurchases)}</th>
              </tr>
            </tfoot>
          </Table>
        </Card.Body>
      </Card>

      {/* Purchases Detail (if any) */}
      {purchases.length > 0 && (
        <Card className="mb-4">
          <Card.Header className="bg-warning text-dark">
            <h5 className="mb-0">
              <FaShoppingCart className="me-2" />
              Period Purchases (Mock Data)
            </h5>
          </Card.Header>
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0" size="sm">
              <thead className="table-light">
                <tr>
                  <th>Date</th>
                  <th>SKU</th>
                  <th>Item</th>
                  <th className="text-end">Quantity</th>
                  <th className="text-end">Unit Cost</th>
                  <th className="text-end">Total</th>
                  <th>Reference</th>
                </tr>
              </thead>
              <tbody>
                {purchases.slice(0, 20).map(purchase => (
                  <tr key={purchase.id}>
                    <td>{new Date(purchase.timestamp).toLocaleDateString()}</td>
                    <td><code>{purchase.item.sku}</code></td>
                    <td>{purchase.item.name}</td>
                    <td className="text-end">{parseFloat(purchase.quantity).toFixed(2)}</td>
                    <td className="text-end">{formatCurrency(parseFloat(purchase.unit_cost))}</td>
                    <td className="text-end">
                      <strong>
                        {formatCurrency(parseFloat(purchase.quantity) * parseFloat(purchase.unit_cost))}
                      </strong>
                    </td>
                    <td><small className="text-muted">{purchase.reference}</small></td>
                  </tr>
                ))}
              </tbody>
            </Table>
            {purchases.length > 20 && (
              <div className="p-3 text-center text-muted">
                <small>Showing first 20 of {purchases.length} purchases</small>
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {/* Info Card */}
      <Card className="mb-4 border-info">
        <Card.Body>
          <h5>📊 About This Report</h5>
          <ul className="mb-0">
            <li><strong>Stock Cost Value</strong>: What you paid for current inventory (from backend <code>closing_stock_value</code>)</li>
            <li><strong>Period Purchases</strong>: Mock purchase data for demonstration (replace with real data)</li>
            <li><strong>Sales Value & Revenue</strong>: Will be calculated by backend when real POS data is integrated</li>
            <li><strong>All calculations</strong>: Performed by backend, frontend displays only</li>
          </ul>
        </Card.Body>
      </Card>
    </Container>
  );
}

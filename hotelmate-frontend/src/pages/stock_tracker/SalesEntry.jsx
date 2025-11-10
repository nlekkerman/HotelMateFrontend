import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Table, Form, Alert, Spinner, Badge } from 'react-bootstrap';
import { FaArrowLeft, FaMoneyBillWave, FaSave, FaUndo, FaSearch } from 'react-icons/fa';
import api from '@/services/api';

export default function SalesEntry() {
  const { hotel_slug } = useParams();
  const navigate = useNavigate();
  
  const [stockItems, setStockItems] = useState([]);
  const [salesData, setSalesData] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [saleDate, setSaleDate] = useState(new Date().toISOString().split('T')[0]);
  const [stocktakeId, setStocktakeId] = useState('');
  const [periods, setPeriods] = useState([]);
  const [linkToStocktake, setLinkToStocktake] = useState(false);

  // Category definitions
  const categories = {
    'D': 'Draught Beer',
    'B': 'Bottled Beer',
    'S': 'Spirits',
    'W': 'Wine',
    'M': 'Minerals/Syrups'
  };

  useEffect(() => {
    fetchPeriods();
    fetchStockItems();
  }, [hotel_slug]);

  const fetchPeriods = async () => {
    try {
      const response = await api.get(`/stock_tracker/${hotel_slug}/periods/`);
      const allPeriods = response.data.results || response.data;
      const openPeriods = allPeriods.filter(p => !p.is_closed);
      setPeriods(openPeriods);
      
      // Don't auto-select - let user choose if they want to link
    } catch (err) {
      console.error('Error fetching periods:', err);
    }
  };

  const fetchStockItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/stock_tracker/${hotel_slug}/items/`, {
        params: {
          active: true,
          available_on_menu: true
        }
      });
      
      const items = response.data.results || response.data;
      setStockItems(items);
      
      // Initialize sales data
      const initialData = {};
      items.forEach(item => {
        initialData[item.id] = {
          quantity: 0,
          revenue: 0,
          cogs: 0,
          profit: 0
        };
      });
      setSalesData(initialData);
    } catch (err) {
      console.error('Error fetching stock items:', err);
      setError(err.response?.data?.detail || 'Failed to fetch stock items');
    } finally {
      setLoading(false);
    }
  };

  const handleQuantityChange = (itemId, quantity) => {
    const item = stockItems.find(i => i.id === itemId);
    if (!item) return;
    
    const qty = parseFloat(quantity) || 0;
    const revenue = qty * (item.menu_price || 0);
    const cogs = qty * (item.cost_per_serving || 0);
    const profit = revenue - cogs;
    
    setSalesData(prev => ({
      ...prev,
      [itemId]: { quantity: qty, revenue, cogs, profit }
    }));
  };

  const calculateTotals = () => {
    let totalRevenue = 0;
    let totalCogs = 0;
    
    Object.values(salesData).forEach(sale => {
      totalRevenue += sale.revenue;
      totalCogs += sale.cogs;
    });
    
    const profit = totalRevenue - totalCogs;
    const gp = totalRevenue > 0 ? ((profit / totalRevenue) * 100).toFixed(2) : 0;
    
    return {
      revenue: totalRevenue.toFixed(2),
      cogs: totalCogs.toFixed(2),
      profit: profit.toFixed(2),
      gp: gp
    };
  };

  const handleSave = async (shouldLinkToStocktake = false) => {
    // If linking to stocktake, validate that one is selected
    if (shouldLinkToStocktake && !stocktakeId) {
      setError('Please select a period/stocktake to link these sales to');
      return;
    }

    // Filter out items with zero quantity
    const salesArray = Object.entries(salesData)
      .filter(([itemId, data]) => data.quantity > 0)
      .map(([itemId, data]) => {
        const saleData = {
          item: parseInt(itemId),
          quantity: data.quantity,
          sale_date: saleDate
        };
        
        // ONLY add stocktake if user chose to link
        if (shouldLinkToStocktake && stocktakeId) {
          saleData.stocktake = parseInt(stocktakeId);
        }
        
        return saleData;
      });
    
    if (salesArray.length === 0) {
      setError('No sales entered. Please enter quantities for at least one item.');
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      const response = await api.post(
        `/stock_tracker/${hotel_slug}/sales/bulk-create/`,
        { sales: salesArray }
      );
      
      if (response.data.success) {
        const message = shouldLinkToStocktake 
          ? `✅ ${response.data.created} sales saved and linked to stocktake!`
          : `✅ ${response.data.created} sales saved successfully (standalone)!`;
        setSuccess(message);
        
        // Reset form
        const initialData = {};
        stockItems.forEach(item => {
          initialData[item.id] = {
            quantity: 0,
            revenue: 0,
            cogs: 0,
            profit: 0
          };
        });
        setSalesData(initialData);
        
        // Scroll to top to show success message
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    } catch (err) {
      console.error('Error saving sales:', err);
      setError(err.response?.data?.detail || 'Failed to save sales');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    const initialData = {};
    stockItems.forEach(item => {
      initialData[item.id] = {
        quantity: 0,
        revenue: 0,
        cogs: 0,
        profit: 0
      };
    });
    setSalesData(initialData);
    setSuccess(null);
    setError(null);
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(value);
  };

  // Filter items based on search and category
  const filteredItems = stockItems.filter(item => {
    const matchesSearch = !searchTerm || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !categoryFilter || item.category.code === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const totals = calculateTotals();

  if (loading) {
    return (
      <Container className="mt-4 text-center">
        <Spinner animation="border" />
        <p className="mt-2">Loading stock items...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="mt-4 mb-5">
      {/* Back Button */}
      <Button 
        variant="outline-secondary"
        className="mb-3"
        onClick={() => navigate(`/stock_tracker/${hotel_slug}/operations`)}
      >
        <FaArrowLeft className="me-2" />
        Back to Operations
      </Button>

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>
          <FaMoneyBillWave className="me-2" />
          Sales Entry
        </h2>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}
      
      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Info Banner */}
      <Alert variant="info" className="mb-4">
        <Alert.Heading>📊 Sales Entry to Live Stock Items</Alert.Heading>
        <p className="mb-2">
          Enter quantities sold for each stock item. This records sales directly to individual items 
          (not snapshots), using current prices and costs.
        </p>
        <hr />
        <div className="d-flex gap-4">
          <div>
            <strong>💾 Standalone Save:</strong> Save sales independently (can link to stocktake later)
          </div>
          <div>
            <strong>🔗 Link to Stocktake:</strong> Save sales and merge with a stocktake period immediately
          </div>
        </div>
      </Alert>

      {/* Filters and Date Selection */}
      <Card className="mb-4">
        <Card.Body>
          <Row className="g-3">
            <Col md={3}>
              <Form.Group>
                <Form.Label><strong>Sale Date</strong></Form.Label>
                <Form.Control
                  type="date"
                  value={saleDate}
                  onChange={(e) => setSaleDate(e.target.value)}
                />
              </Form.Group>
            </Col>
            
            <Col md={3}>
              <Form.Group>
                <Form.Label><strong>Link to Period (Optional)</strong></Form.Label>
                <Form.Select
                  value={stocktakeId}
                  onChange={(e) => setStocktakeId(e.target.value)}
                >
                  <option value="">None (Standalone)</option>
                  {periods.map(period => (
                    <option key={period.id} value={period.id}>
                      {period.period_name}
                    </option>
                  ))}
                </Form.Select>
                <Form.Text className="text-muted">
                  Only required if linking to a stocktake
                </Form.Text>
              </Form.Group>
            </Col>
            
            <Col md={3}>
              <Form.Group>
                <Form.Label><FaSearch className="me-2" /><strong>Search Items</strong></Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Search by name or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </Form.Group>
            </Col>
            
            <Col md={3}>
              <Form.Group>
                <Form.Label><strong>Filter by Category</strong></Form.Label>
                <Form.Select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                >
                  <option value="">All Categories</option>
                  {Object.entries(categories).map(([code, name]) => (
                    <option key={code} value={code}>{name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Sales Entry Table */}
      <Card className="mb-4">
        <Card.Header className="bg-primary text-white">
          <h5 className="mb-0">Enter Sales Quantities</h5>
        </Card.Header>
        <Card.Body className="p-0">
          <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
            <Table responsive hover className="mb-0">
              <thead className="table-light sticky-top" style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                <tr>
                  <th>SKU</th>
                  <th>Item Name</th>
                  <th>Category</th>
                  <th className="text-end">Menu Price</th>
                  <th className="text-end">Cost/Serving</th>
                  <th className="text-center" style={{ width: '120px' }}>Qty Sold</th>
                  <th className="text-end">Revenue</th>
                  <th className="text-end">COGS</th>
                  <th className="text-end">Profit</th>
                  <th className="text-end">GP%</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="text-center text-muted py-4">
                      No items found matching your filters
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(item => {
                    const saleData = salesData[item.id] || { quantity: 0, revenue: 0, cogs: 0, profit: 0 };
                    const gp = saleData.revenue > 0 
                      ? ((saleData.profit / saleData.revenue) * 100).toFixed(2) 
                      : '0.00';
                    
                    return (
                      <tr key={item.id} className={saleData.quantity > 0 ? 'table-success' : ''}>
                        <td><code>{item.sku}</code></td>
                        <td>{item.name}</td>
                        <td>
                          <Badge bg="secondary">{item.category.code}</Badge>
                          <small className="ms-1 text-muted">{item.category.name}</small>
                        </td>
                        <td className="text-end">{formatCurrency(item.menu_price || 0)}</td>
                        <td className="text-end">{formatCurrency(item.cost_per_serving || 0)}</td>
                        <td className="text-center">
                          <Form.Control
                            type="number"
                            step="0.25"
                            min="0"
                            value={saleData.quantity || ''}
                            onChange={(e) => handleQuantityChange(item.id, e.target.value)}
                            placeholder="0"
                            size="sm"
                            style={{ width: '100px', textAlign: 'center' }}
                          />
                        </td>
                        <td className="text-end">
                          <strong>{formatCurrency(saleData.revenue)}</strong>
                        </td>
                        <td className="text-end text-danger">
                          {formatCurrency(saleData.cogs)}
                        </td>
                        <td className="text-end text-success">
                          <strong>{formatCurrency(saleData.profit)}</strong>
                        </td>
                        <td className="text-end">
                          <Badge bg={parseFloat(gp) > 70 ? 'success' : parseFloat(gp) > 50 ? 'warning' : 'danger'}>
                            {gp}%
                          </Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </Table>
          </div>
        </Card.Body>
      </Card>

      {/* Totals Card */}
      <Card className="mb-4 border-primary">
        <Card.Header className="bg-primary text-white">
          <h5 className="mb-0">Totals</h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={3}>
              <div className="text-center p-3 border rounded">
                <h6 className="text-muted mb-2">Total Revenue</h6>
                <h3 className="text-primary mb-0">{formatCurrency(totals.revenue)}</h3>
              </div>
            </Col>
            <Col md={3}>
              <div className="text-center p-3 border rounded">
                <h6 className="text-muted mb-2">Total COGS</h6>
                <h3 className="text-danger mb-0">{formatCurrency(totals.cogs)}</h3>
              </div>
            </Col>
            <Col md={3}>
              <div className="text-center p-3 border rounded">
                <h6 className="text-muted mb-2">Gross Profit</h6>
                <h3 className="text-success mb-0">{formatCurrency(totals.profit)}</h3>
              </div>
            </Col>
            <Col md={3}>
              <div className="text-center p-3 border rounded">
                <h6 className="text-muted mb-2">GP %</h6>
                <h3 className={`mb-0 ${parseFloat(totals.gp) > 70 ? 'text-success' : parseFloat(totals.gp) > 50 ? 'text-warning' : 'text-danger'}`}>
                  {totals.gp}%
                </h3>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Action Buttons */}
      <Card className="mb-4">
        <Card.Body>
          <h5 className="mb-3 text-center">Save Options</h5>
          <Row className="g-3">
            <Col md={6}>
              <div className="d-grid">
                <Button 
                  variant="primary" 
                  size="lg"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FaSave className="me-2" />
                      Save Sales (Standalone)
                    </>
                  )}
                </Button>
                <small className="text-muted mt-2 text-center">
                  💾 Save independently - can link to stocktake later
                </small>
              </div>
            </Col>
            
            <Col md={6}>
              <div className="d-grid">
                <Button 
                  variant="success" 
                  size="lg"
                  onClick={() => handleSave(true)}
                  disabled={saving || !stocktakeId}
                >
                  {saving ? (
                    <>
                      <Spinner animation="border" size="sm" className="me-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FaSave className="me-2" />
                      Save & Link to Stocktake
                    </>
                  )}
                </Button>
                <small className={`mt-2 text-center ${!stocktakeId ? 'text-danger' : 'text-muted'}`}>
                  {!stocktakeId ? '⚠️ Select a period above first' : '🔗 Merge with selected stocktake period'}
                </small>
              </div>
            </Col>
          </Row>
          
          <hr className="my-3" />
          
          <div className="text-center">
            <Button 
              variant="outline-secondary" 
              onClick={handleReset}
              disabled={saving}
            >
              <FaUndo className="me-2" />
              Reset Form
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* Helper Text */}
      <div className="text-center text-muted">
        <small>
          💡 Tip: Items with entered quantities will be highlighted in green. 
          Use increments of 0.25 for partial servings.
        </small>
      </div>
    </Container>
  );
}

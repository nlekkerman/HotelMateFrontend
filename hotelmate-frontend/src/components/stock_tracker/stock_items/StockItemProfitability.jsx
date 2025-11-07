import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Table, Badge, Form, Alert, Spinner } from 'react-bootstrap';
import { FaArrowLeft, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import api from '@/services/api';

const StockItemProfitability = () => {
  const { hotel_slug } = useParams();
  const navigate = useNavigate();
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('gp_desc'); // gp_desc, markup_desc, pour_cost_asc
  
  useEffect(() => {
    fetchProfitabilityData();
  }, [hotel_slug, selectedCategory]);
  
  const fetchProfitabilityData = async () => {
    try {
      setLoading(true);
      const endpoint = selectedCategory === 'all' 
        ? `/stock_tracker/${hotel_slug}/items/profitability/`
        : `/stock_tracker/${hotel_slug}/items/profitability/?category=${selectedCategory}`;
      
      const response = await api.get(endpoint);
      setItems(response.data.results || response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching profitability data:', err);
      setError(err.response?.data?.detail || 'Failed to fetch profitability data');
    } finally {
      setLoading(false);
    }
  };
  
  const getSortedItems = () => {
    const sorted = [...items];
    
    switch(sortBy) {
      case 'gp_desc':
        return sorted.sort((a, b) => (b.gross_profit_percentage || 0) - (a.gross_profit_percentage || 0));
      case 'gp_asc':
        return sorted.sort((a, b) => (a.gross_profit_percentage || 0) - (b.gross_profit_percentage || 0));
      case 'markup_desc':
        return sorted.sort((a, b) => (b.markup_percentage || 0) - (a.markup_percentage || 0));
      case 'markup_asc':
        return sorted.sort((a, b) => (a.markup_percentage || 0) - (b.markup_percentage || 0));
      case 'pour_cost_asc':
        return sorted.sort((a, b) => (a.pour_cost_percentage || 0) - (b.pour_cost_percentage || 0));
      case 'pour_cost_desc':
        return sorted.sort((a, b) => (b.pour_cost_percentage || 0) - (a.pour_cost_percentage || 0));
      default:
        return sorted;
    }
  };
  
  const getGPBadge = (gp) => {
    if (gp >= 70) return 'success';
    if (gp >= 60) return 'info';
    if (gp >= 50) return 'warning';
    return 'danger';
  };
  
  const getPourCostBadge = (pourCost, category) => {
    // Spirits: 15-20%, Beer/Draught: 20-25%, Wine: 25-35%
    if (category === 'S' && pourCost >= 15 && pourCost <= 20) return 'success';
    if (category === 'B' && pourCost >= 20 && pourCost <= 25) return 'success';
    if (category === 'D' && pourCost >= 20 && pourCost <= 25) return 'success';
    if (category === 'W' && pourCost >= 25 && pourCost <= 35) return 'success';
    return 'warning';
  };
  
  const getMarkupBadge = (markup) => {
    if (markup >= 300) return 'success';
    if (markup >= 200) return 'info';
    return 'warning';
  };
  
  const categories = [
    { code: 'all', name: 'All Categories' },
    { code: 'D', name: 'Draught Beer' },
    { code: 'B', name: 'Bottled Beer' },
    { code: 'S', name: 'Spirits' },
    { code: 'W', name: 'Wine' },
    { code: 'M', name: 'Minerals & Syrups' },
  ];
  
  const sortedItems = getSortedItems();
  
  // Calculate summary stats
  const avgGP = items.length > 0 
    ? items.reduce((sum, item) => sum + (item.gross_profit_percentage || 0), 0) / items.length 
    : 0;
  const totalStockValue = items.reduce((sum, item) => sum + parseFloat(item.current_stock_value || 0), 0);
  const belowTargetCount = items.filter(item => (item.gross_profit_percentage || 0) < 70).length;
  
  if (loading) {
    return (
      <Container className="py-4 text-center">
        <Spinner animation="border" />
      </Container>
    );
  }
  
  return (
    <Container fluid className="py-3">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <button 
            className="btn btn-outline-secondary btn-sm me-2" 
            onClick={() => navigate(`/stock_tracker/${hotel_slug}`)}
          >
            <FaArrowLeft /> Back
          </button>
          <h4 className="d-inline">Profitability Analysis</h4>
        </div>
      </div>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      {/* Summary Cards */}
      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <Card>
            <Card.Body>
              <div className="text-muted small">Total Items</div>
              <h3>{items.length}</h3>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-3">
          <Card>
            <Card.Body>
              <div className="text-muted small">Average GP %</div>
              <h3>
                <Badge bg={getGPBadge(avgGP)}>
                  {avgGP.toFixed(1)}%
                </Badge>
              </h3>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-3">
          <Card>
            <Card.Body>
              <div className="text-muted small">Total Stock Value</div>
              <h3 className="text-success">€{totalStockValue.toFixed(2)}</h3>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-3">
          <Card>
            <Card.Body>
              <div className="text-muted small">Below Target (&lt;70%)</div>
              <h3 className="text-danger">{belowTargetCount}</h3>
            </Card.Body>
          </Card>
        </div>
      </div>
      
      {/* Filters */}
      <Card className="mb-3">
        <Card.Body>
          <div className="row g-3">
            <div className="col-md-4">
              <Form.Label>Category</Form.Label>
              <Form.Select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat.code} value={cat.code}>{cat.name}</option>
                ))}
              </Form.Select>
            </div>
            <div className="col-md-4">
              <Form.Label>Sort By</Form.Label>
              <Form.Select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="gp_desc">GP % (High to Low)</option>
                <option value="gp_asc">GP % (Low to High)</option>
                <option value="markup_desc">Markup % (High to Low)</option>
                <option value="markup_asc">Markup % (Low to High)</option>
                <option value="pour_cost_asc">Pour Cost % (Low to High)</option>
                <option value="pour_cost_desc">Pour Cost % (High to Low)</option>
              </Form.Select>
            </div>
          </div>
        </Card.Body>
      </Card>
      
      {/* Industry Benchmarks */}
      <Card className="mb-3">
        <Card.Header><strong>Industry Benchmarks</strong></Card.Header>
        <Card.Body>
          <div className="row small">
            <div className="col-md-3">
              <strong>Gross Profit %:</strong> 70-85% (Target)
            </div>
            <div className="col-md-3">
              <strong>Markup %:</strong> 300-500% (Target)
            </div>
            <div className="col-md-3">
              <strong>Spirits Pour Cost:</strong> 15-20%
            </div>
            <div className="col-md-3">
              <strong>Beer Pour Cost:</strong> 20-25%
            </div>
          </div>
          <div className="row small mt-2">
            <div className="col-md-3">
              <strong>Wine Pour Cost:</strong> 25-35%
            </div>
          </div>
        </Card.Body>
      </Card>
      
      {/* Profitability Table */}
      <Card>
        <Card.Body className="p-0">
          <div className="table-responsive">
            <Table hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Status</th>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th className="text-end">Unit Cost</th>
                  <th className="text-end">Menu Price</th>
                  <th className="text-end">Cost/Serving</th>
                  <th className="text-end">GP €</th>
                  <th className="text-end">GP %</th>
                  <th className="text-end">Markup %</th>
                  <th className="text-end">Pour Cost %</th>
                  <th className="text-end">Stock Value</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="text-center text-muted py-4">
                      No items found
                    </td>
                  </tr>
                ) : (
                  sortedItems.map(item => {
                    const gp = item.gross_profit_percentage || 0;
                    const isGood = gp >= 70;
                    
                    return (
                      <tr key={item.id}>
                        <td>
                          {isGood ? (
                            <FaCheckCircle className="text-success" title="Meets Target" />
                          ) : (
                            <FaExclamationTriangle className="text-warning" title="Below Target" />
                          )}
                        </td>
                        <td><code>{item.sku}</code></td>
                        <td><strong>{item.name}</strong></td>
                        <td>
                          <Badge bg="secondary">{item.category}</Badge>
                        </td>
                        <td className="text-end">€{parseFloat(item.unit_cost || 0).toFixed(2)}</td>
                        <td className="text-end">€{parseFloat(item.menu_price || 0).toFixed(2)}</td>
                        <td className="text-end">€{parseFloat(item.cost_per_serving || 0).toFixed(2)}</td>
                        <td className="text-end">€{parseFloat(item.gross_profit || 0).toFixed(2)}</td>
                        <td className="text-end">
                          <Badge bg={getGPBadge(gp)}>
                            {gp.toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="text-end">
                          <Badge bg={getMarkupBadge(item.markup_percentage || 0)}>
                            {parseFloat(item.markup_percentage || 0).toFixed(0)}%
                          </Badge>
                        </td>
                        <td className="text-end">
                          <Badge bg={getPourCostBadge(item.pour_cost_percentage || 0, item.category)}>
                            {parseFloat(item.pour_cost_percentage || 0).toFixed(1)}%
                          </Badge>
                        </td>
                        <td className="text-end text-success">
                          <strong>€{parseFloat(item.current_stock_value || 0).toFixed(2)}</strong>
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
    </Container>
  );
};

export default StockItemProfitability;

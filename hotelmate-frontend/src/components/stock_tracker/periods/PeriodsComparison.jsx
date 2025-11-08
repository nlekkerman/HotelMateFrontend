import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Container, Card, Row, Col, Form, Table, Badge, Spinner, Alert } from 'react-bootstrap';
import { FaArrowUp, FaArrowDown, FaEquals, FaCalendarAlt } from 'react-icons/fa';
import api from '../../../services/api';
import { formatCurrency as formatCurrencyUtil } from '../utils/stockDisplayUtils';

export const PeriodsComparison = () => {
  const { hotel_slug } = useParams();
  
  const [periods, setPeriods] = useState([]);
  const [period1Id, setPeriod1Id] = useState('');
  const [period2Id, setPeriod2Id] = useState('');
  const [comparisonData, setComparisonData] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPeriods();
  }, [hotel_slug]);

  useEffect(() => {
    if (period1Id && period2Id) {
      fetchComparison();
    }
  }, [period1Id, period2Id]);

  const fetchPeriods = async () => {
    try {
      const response = await api.get(`/stock_tracker/${hotel_slug}/periods/`);
      // Only show closed periods for comparison
      const closedPeriods = response.data.filter(p => p.status === 'Closed');
      setPeriods(closedPeriods);
      
      // Auto-select last two periods if available
      if (closedPeriods.length >= 2) {
        setPeriod1Id(closedPeriods[closedPeriods.length - 2].id);
        setPeriod2Id(closedPeriods[closedPeriods.length - 1].id);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch periods');
    }
  };

  const fetchComparison = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get(
        `/stock_tracker/${hotel_slug}/periods/compare/?period1=${period1Id}&period2=${period2Id}`
      );
      setComparisonData(response.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to fetch comparison');
      setComparisonData(null);
    } finally {
      setLoading(false);
    }
  };

  const getChangeIcon = (change) => {
    if (change > 0) return <FaArrowUp className="text-danger" />;
    if (change < 0) return <FaArrowDown className="text-success" />;
    return <FaEquals className="text-muted" />;
  };

  const getChangeBadge = (changePercent) => {
    if (changePercent === 0) return <Badge bg="secondary">0%</Badge>;
    
    const variant = changePercent > 0 ? 'danger' : 'success';
    const sign = changePercent > 0 ? '+' : '';
    
    return (
      <Badge bg={variant}>
        {sign}{changePercent.toFixed(1)}%
      </Badge>
    );
  };

  const formatCurrency = formatCurrencyUtil;

  // Filter and group data
  const filteredItems = comparisonData?.items.filter(item => 
    !selectedCategory || item.category_code === selectedCategory
  ) || [];

  const categories = comparisonData?.categories || [];
  
  // Calculate category totals
  const categoryTotals = categories.map(cat => {
    const categoryItems = comparisonData.items.filter(item => item.category_code === cat.code);
    
    const period1Total = categoryItems.reduce((sum, item) => sum + parseFloat(item.period1_value || 0), 0);
    const period2Total = categoryItems.reduce((sum, item) => sum + parseFloat(item.period2_value || 0), 0);
    const changeValue = period2Total - period1Total;
    const changePercent = period1Total !== 0 ? (changeValue / period1Total) * 100 : 0;
    
    return {
      ...cat,
      period1Total,
      period2Total,
      changeValue,
      changePercent
    };
  });

  const selectedPeriod1 = periods.find(p => p.id === parseInt(period1Id));
  const selectedPeriod2 = periods.find(p => p.id === parseInt(period2Id));

  return (
    <Container fluid className="mt-4">
      <h4 className="mb-4">
        <FaCalendarAlt className="me-2" />
        Periods Comparison
      </h4>

      <Card className="mb-4">
        <Card.Body>
          <Row>
            <Col md={6}>
              <Form.Group>
                <Form.Label><strong>Period 1 (Baseline)</strong></Form.Label>
                <Form.Select 
                  value={period1Id} 
                  onChange={(e) => setPeriod1Id(e.target.value)}
                  disabled={loading}
                >
                  <option value="">Select Period...</option>
                  {periods.map(period => (
                    <option key={period.id} value={period.id}>
                      {period.name} ({new Date(period.start_date).toLocaleDateString()} - {new Date(period.end_date).toLocaleDateString()})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label><strong>Period 2 (Compare To)</strong></Form.Label>
                <Form.Select 
                  value={period2Id} 
                  onChange={(e) => setPeriod2Id(e.target.value)}
                  disabled={loading}
                >
                  <option value="">Select Period...</option>
                  {periods.map(period => (
                    <option key={period.id} value={period.id}>
                      {period.name} ({new Date(period.start_date).toLocaleDateString()} - {new Date(period.end_date).toLocaleDateString()})
                    </option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {error && <Alert variant="danger">{error}</Alert>}

      {loading && (
        <div className="text-center my-5">
          <Spinner animation="border" />
          <p className="mt-2">Loading comparison...</p>
        </div>
      )}

      {!loading && comparisonData && (
        <>
          <Card className="mb-4">
            <Card.Header className="bg-light">
              <Row>
                <Col md={6}>
                  <strong>Comparing:</strong>
                </Col>
                <Col md={6}>
                  <Form.Group>
                    <Form.Select
                      size="sm"
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                    >
                      <option value="">All Categories</option>
                      {categories.map(cat => (
                        <option key={cat.code} value={cat.code}>
                          {cat.name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={5}>
                  <div className="p-3 bg-light rounded">
                    <h6 className="text-muted mb-1">Period 1</h6>
                    <h5>{selectedPeriod1?.name}</h5>
                    <p className="mb-0 small">
                      {new Date(selectedPeriod1?.start_date).toLocaleDateString()} - {new Date(selectedPeriod1?.end_date).toLocaleDateString()}
                    </p>
                  </div>
                </Col>
                <Col md={2} className="text-center d-flex align-items-center justify-content-center">
                  <h3 className="text-muted">vs</h3>
                </Col>
                <Col md={5}>
                  <div className="p-3 bg-light rounded">
                    <h6 className="text-muted mb-1">Period 2</h6>
                    <h5>{selectedPeriod2?.name}</h5>
                    <p className="mb-0 small">
                      {new Date(selectedPeriod2?.start_date).toLocaleDateString()} - {new Date(selectedPeriod2?.end_date).toLocaleDateString()}
                    </p>
                  </div>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {/* Category Totals Summary */}
          <Card className="mb-4">
            <Card.Header className="bg-primary text-white">
              <h5 className="mb-0">Category Totals</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <Table hover className="mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Category</th>
                    <th className="text-end">Period 1 Value</th>
                    <th className="text-end">Period 2 Value</th>
                    <th className="text-end">Change (€)</th>
                    <th className="text-end">Change (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryTotals.map(cat => (
                    <tr key={cat.code}>
                      <td><strong>{cat.name}</strong></td>
                      <td className="text-end">{formatCurrency(cat.period1Total)}</td>
                      <td className="text-end">{formatCurrency(cat.period2Total)}</td>
                      <td className="text-end">
                        {getChangeIcon(cat.changeValue)}
                        {' '}
                        {formatCurrency(Math.abs(cat.changeValue))}
                      </td>
                      <td className="text-end">
                        {getChangeBadge(cat.changePercent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          {/* Detailed Items Comparison */}
          <Card>
            <Card.Header className="bg-secondary text-white">
              <h5 className="mb-0">Item Details</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table hover size="sm" className="mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>SKU</th>
                      <th>Item Name</th>
                      <th>Category</th>
                      <th className="text-end">P1 Servings</th>
                      <th className="text-end">P1 Value</th>
                      <th className="text-end">P2 Servings</th>
                      <th className="text-end">P2 Value</th>
                      <th className="text-end">Change (€)</th>
                      <th className="text-end">Change (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredItems.map(item => {
                      const changeValue = parseFloat(item.period2_value || 0) - parseFloat(item.period1_value || 0);
                      const changePercent = parseFloat(item.period1_value || 0) !== 0 
                        ? (changeValue / parseFloat(item.period1_value)) * 100 
                        : 0;
                      
                      return (
                        <tr key={item.item_id}>
                          <td><code>{item.item_sku}</code></td>
                          <td>
                            <strong>{item.item_name}</strong>
                            {item.item_size && (
                              <><br /><small className="text-muted">{item.item_size}</small></>
                            )}
                          </td>
                          <td><Badge bg="info">{item.category_name}</Badge></td>
                          <td className="text-end">{parseFloat(item.period1_servings || 0).toFixed(2)}</td>
                          <td className="text-end">{formatCurrency(item.period1_value || 0)}</td>
                          <td className="text-end">{parseFloat(item.period2_servings || 0).toFixed(2)}</td>
                          <td className="text-end">{formatCurrency(item.period2_value || 0)}</td>
                          <td className="text-end">
                            {getChangeIcon(changeValue)}
                            {' '}
                            {formatCurrency(Math.abs(changeValue))}
                          </td>
                          <td className="text-end">
                            {getChangeBadge(changePercent)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>
            </Card.Body>
          </Card>

          {filteredItems.length === 0 && (
            <Alert variant="info" className="mt-3">
              No items found for the selected category.
            </Alert>
          )}
        </>
      )}

      {!loading && !comparisonData && period1Id && period2Id && (
        <Alert variant="warning">
          Please select two different periods to compare.
        </Alert>
      )}
    </Container>
  );
};

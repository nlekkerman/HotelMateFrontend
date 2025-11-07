import React, { useState } from 'react';
import { Container, Form, Button, Row, Col, Alert, Card, Badge } from 'react-bootstrap';
import { FaArrowLeft, FaSave, FaTrash } from 'react-icons/fa';

const StockItemDetail = ({ item, categories, onBack, onUpdate, onDelete }) => {
  const [formData, setFormData] = useState({
    name: item.name || '',
    sku: item.sku || '',
    category: item.category || '',
    size: item.size || '',
    size_value: item.size_value || '',
    size_unit: item.size_unit || '',
    uom: item.uom || '',
    unit_cost: item.unit_cost || '',
    current_full_units: item.current_full_units || 0,
    current_partial_units: item.current_partial_units || 0,
    menu_price: item.menu_price || '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await onUpdate(item.id, formData);
      setIsEditing(false);
    } catch (err) {
      setError(`Error updating item: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      try {
        await onDelete(item.id);
        onBack();
      } catch (err) {
        setError('Error deleting item: ' + err.message);
      }
    }
  };

  return (
    <Container fluid className="py-3 px-2">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center gap-2">
          <Button variant="outline-secondary" size="sm" onClick={onBack}>
            <FaArrowLeft /> Back
          </Button>
          <h4 className="mb-0">{item.name}</h4>
        </div>
        <div className="d-flex gap-2">
          {!isEditing ? (
            <>
              <Button variant="primary" size="sm" onClick={() => setIsEditing(true)}>
                Edit
              </Button>
              <Button variant="danger" size="sm" onClick={handleDelete}>
                <FaTrash /> Delete
              </Button>
            </>
          ) : (
            <>
              <Button variant="success" size="sm" onClick={handleSave} disabled={saving}>
                <FaSave /> {saving ? 'Saving...' : 'Save'}
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setIsEditing(false)} disabled={saving}>
                Cancel
              </Button>
            </>
          )}
        </div>
      </div>

      {error && <Alert variant="danger" dismissible onClose={() => setError(null)}>{error}</Alert>}

      {/* Basic Information */}
      <Card className="mb-3">
        <Card.Header><strong>Basic Information</strong></Card.Header>
        <Card.Body>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>SKU</Form.Label>
                <Form.Control
                  name="sku"
                  value={formData.sku}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Name</Form.Label>
                <Form.Control
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Category</Form.Label>
                <Form.Select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  disabled={!isEditing}
                >
                  {categories.map(cat => (
                    <option key={cat.code} value={cat.code}>{cat.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Label>Category Info</Form.Label>
              <div>
                <Badge bg="secondary">{item.category}</Badge>
                <span className="ms-2 text-muted">{item.category_name}</span>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Size & UOM */}
      <Card className="mb-3">
        <Card.Header><strong>Size & Measurement</strong></Card.Header>
        <Card.Body>
          <Row className="g-3">
            <Col md={4}>
              <Form.Group>
                <Form.Label>Size</Form.Label>
                <Form.Control
                  name="size"
                  value={formData.size}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Size Value</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  name="size_value"
                  value={formData.size_value}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Size Unit</Form.Label>
                <Form.Select
                  name="size_unit"
                  value={formData.size_unit}
                  onChange={handleChange}
                  disabled={!isEditing}
                >
                  <option value="ml">ml</option>
                  <option value="cl">cl</option>
                  <option value="L">L</option>
                  <option value="g">g</option>
                  <option value="kg">kg</option>
                  <option value="unit">unit</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={12}>
              <Form.Group>
                <Form.Label>UOM (Units of Measure)</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  name="uom"
                  value={formData.uom}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
                <Form.Text className="text-muted">
                  Pints per keg, shots per bottle, bottles per case, etc.
                </Form.Text>
              </Form.Group>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Stock Levels */}
      <Card className="mb-3">
        <Card.Header><strong>Stock Levels</strong></Card.Header>
        <Card.Body>
          <Row className="g-3">
            <Col md={4}>
              <Form.Group>
                <Form.Label>Full Units</Form.Label>
                <Form.Control
                  type="number"
                  step="1"
                  name="current_full_units"
                  value={formData.current_full_units}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
                <Form.Text className="text-muted">Kegs/cases/bottles</Form.Text>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Partial Units</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  name="current_partial_units"
                  value={formData.current_partial_units}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
                <Form.Text className="text-muted">Pints/shots/individual</Form.Text>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Label>Total Units</Form.Label>
              <div className="pt-2">
                <h5 className="text-primary">{parseFloat(item.total_units || 0).toFixed(2)}</h5>
                <small className="text-muted">Backend calculated</small>
              </div>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Pricing & Profitability */}
      <Card className="mb-3">
        <Card.Header><strong>Pricing & Profitability</strong></Card.Header>
        <Card.Body>
          <Row className="g-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Unit Cost (€)</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  name="unit_cost"
                  value={formData.unit_cost}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
                <Form.Text className="text-muted">Cost per keg/case/bottle</Form.Text>
              </Form.Group>
            </Col>
            <Col md={6}>
              <Form.Group>
                <Form.Label>Menu Price (€)</Form.Label>
                <Form.Control
                  type="number"
                  step="0.01"
                  name="menu_price"
                  value={formData.menu_price}
                  onChange={handleChange}
                  disabled={!isEditing}
                />
                <Form.Text className="text-muted">Price per serving</Form.Text>
              </Form.Group>
            </Col>
          </Row>

          {/* Backend Calculated Values */}
          <Row className="mt-3">
            <Col md={3}>
              <div className="text-muted">Stock Value</div>
              <h5 className="text-success">€{parseFloat(item.total_stock_value || 0).toFixed(2)}</h5>
            </Col>
            <Col md={3}>
              <div className="text-muted">Cost per Serving</div>
              <h5>€{parseFloat(item.cost_per_serving || 0).toFixed(2)}</h5>
            </Col>
            <Col md={2}>
              <div className="text-muted">GP %</div>
              <h5>
                <Badge bg={
                  item.gross_profit_percentage >= 70 ? 'success' :
                  item.gross_profit_percentage >= 60 ? 'info' :
                  item.gross_profit_percentage >= 50 ? 'warning' : 'danger'
                }>
                  {parseFloat(item.gross_profit_percentage || 0).toFixed(1)}%
                </Badge>
              </h5>
            </Col>
            <Col md={2}>
              <div className="text-muted">Markup %</div>
              <h5>{parseFloat(item.markup_percentage || 0).toFixed(1)}%</h5>
            </Col>
            <Col md={2}>
              <div className="text-muted">Pour Cost %</div>
              <h5>{parseFloat(item.pour_cost_percentage || 0).toFixed(1)}%</h5>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default StockItemDetail;

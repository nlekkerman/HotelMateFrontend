import React, { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Badge, Spinner, Alert, Button } from 'react-bootstrap';
import { FaBoxes, FaChartLine, FaExclamationTriangle, FaClipboardList } from 'react-icons/fa';
import { useStockItems } from '../hooks/useStockItems';

export const StockDashboard = () => {
  const { hotel_slug } = useParams();
  const navigate = useNavigate();
  const { items, loading, error } = useStockItems(hotel_slug);
  
  // Calculate totals using useMemo for performance
  const stats = useMemo(() => {
    if (!items || items.length === 0) {
      return {
        totalValue: 0,
        totalItems: 0,
        lowStockCount: 0,
        categoryBreakdown: {},
        categoryGP: {}
      };
    }

    const totalValue = items.reduce((sum, item) => 
      sum + parseFloat(item.total_stock_value || 0), 0
    );
    
    const lowStockCount = items.filter(item => 
      parseFloat(item.current_full_units || 0) <= 2
    ).length;
    
    const categoryBreakdown = items.reduce((acc, item) => {
      const cat = item.category_name || 'Unknown';
      if (!acc[cat]) {
        acc[cat] = {
          code: item.category,
          value: 0,
          count: 0,
          servings: 0
        };
      }
      acc[cat].value += parseFloat(item.total_stock_value || 0);
      acc[cat].count += 1;
      acc[cat].servings += parseFloat(item.total_stock_in_servings || 0);
      return acc;
    }, {});

    const categoryGP = items.reduce((acc, item) => {
      const cat = item.category_name || 'Unknown';
      if (!acc[cat]) {
        acc[cat] = {
          totalGP: 0,
          count: 0
        };
      }
      acc[cat].totalGP += parseFloat(item.gross_profit_percentage || 0);
      acc[cat].count += 1;
      return acc;
    }, {});

    // Calculate average GP per category
    Object.keys(categoryGP).forEach(cat => {
      categoryGP[cat].avgGP = categoryGP[cat].totalGP / categoryGP[cat].count;
    });

    return {
      totalValue,
      totalItems: items.length,
      lowStockCount,
      categoryBreakdown,
      categoryGP
    };
  }, [items]);

  if (loading) {
    return (
      <Container className="mt-4 text-center">
        <Spinner animation="border" />
        <p className="mt-2">Loading stock overview...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">{error}</Alert>
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
          Stock Overview
        </h2>
        <div>
          <Button 
            variant="primary" 
            className="me-2"
            onClick={() => navigate(`/stock_tracker/${hotel_slug}/items`)}
          >
            View All Items
          </Button>
          <Button 
            variant="success"
            onClick={() => navigate(`/stock_tracker/${hotel_slug}/profitability`)}
          >
            <FaChartLine className="me-1" />
            Profitability
          </Button>
        </div>
      </div>

      {/* Top Summary Cards */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted mb-1">Total Stock Value</p>
                  <h3 className="text-success mb-0">{formatCurrency(stats.totalValue)}</h3>
                </div>
                <div className="text-success" style={{ fontSize: '3rem' }}>
                  <FaBoxes />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted mb-1">Total Items</p>
                  <h3 className="text-primary mb-0">{stats.totalItems}</h3>
                  <small className="text-muted">Active stock items</small>
                </div>
                <div className="text-primary" style={{ fontSize: '3rem' }}>
                  <FaClipboardList />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="h-100 border-warning">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted mb-1">Low Stock Items</p>
                  <h3 className="text-warning mb-0">{stats.lowStockCount}</h3>
                  <small className="text-muted">Need reordering</small>
                </div>
                <div className="text-warning" style={{ fontSize: '3rem' }}>
                  <FaExclamationTriangle />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
        
        <Col md={3}>
          <Card className="h-100">
            <Card.Body>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <p className="text-muted mb-1">Categories</p>
                  <h3 className="text-info mb-0">{Object.keys(stats.categoryBreakdown).length}</h3>
                  <small className="text-muted">Product categories</small>
                </div>
                <div className="text-info" style={{ fontSize: '3rem' }}>
                  <FaChartLine />
                </div>
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Category Breakdown */}
      <Card className="mb-4">
        <Card.Header className="bg-primary text-white">
          <h5 className="mb-0">Stock Value by Category</h5>
        </Card.Header>
        <Card.Body>
          <Row>
            {Object.entries(stats.categoryBreakdown).map(([categoryName, data]) => (
              <Col md={4} lg={3} key={categoryName} className="mb-3">
                <Card className="h-100 border">
                  <Card.Body>
                    <div className="d-flex justify-content-between align-items-start mb-2">
                      <h6 className="mb-0">{categoryName}</h6>
                      <Badge bg="secondary">{data.code}</Badge>
                    </div>
                    <h4 className="text-primary mb-2">{formatCurrency(data.value)}</h4>
                    <div className="small text-muted">
                      <div className="d-flex justify-content-between mb-1">
                        <span>Items:</span>
                        <strong>{data.count}</strong>
                      </div>
                      <div className="d-flex justify-content-between mb-1">
                        <span>Servings:</span>
                        <strong>{parseFloat(data.servings).toFixed(0)}</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span>Avg GP%:</span>
                        <Badge bg={
                          stats.categoryGP[categoryName]?.avgGP >= 70 ? 'success' :
                          stats.categoryGP[categoryName]?.avgGP >= 60 ? 'info' :
                          'warning'
                        }>
                          {stats.categoryGP[categoryName]?.avgGP?.toFixed(1) || 0}%
                        </Badge>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Card.Body>
      </Card>

      {/* Quick Actions */}
      <Card>
        <Card.Header>
          <h5 className="mb-0">Quick Actions</h5>
        </Card.Header>
        <Card.Body>
          <Row>
            <Col md={3}>
              <Button 
                variant="outline-primary" 
                className="w-100 mb-2"
                onClick={() => navigate(`/stock_tracker/${hotel_slug}/items`)}
              >
                <FaClipboardList className="me-2" />
                View All Items
              </Button>
            </Col>
            <Col md={3}>
              <Button 
                variant="outline-success" 
                className="w-100 mb-2"
                onClick={() => navigate(`/stock_tracker/${hotel_slug}/profitability`)}
              >
                <FaChartLine className="me-2" />
                Profitability Analysis
              </Button>
            </Col>
            <Col md={3}>
              <Button 
                variant="outline-warning" 
                className="w-100 mb-2"
                onClick={() => navigate(`/stock_tracker/${hotel_slug}/items?lowStock=true`)}
              >
                <FaExclamationTriangle className="me-2" />
                Low Stock Items
              </Button>
            </Col>
            <Col md={3}>
              <Button 
                variant="outline-info" 
                className="w-100 mb-2"
                onClick={() => navigate(`/stock_tracker/${hotel_slug}/stocktakes`)}
              >
                <FaBoxes className="me-2" />
                Stocktakes
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </Container>
  );
};

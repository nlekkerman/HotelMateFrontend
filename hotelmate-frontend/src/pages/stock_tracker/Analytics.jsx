// src/pages/stock_tracker/Analytics.jsx
import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { FaChartLine, FaExclamationTriangle, FaBalanceScale, FaArrowLeft, FaExchangeAlt } from 'react-icons/fa';

export default function Analytics() {
  const { hotel_slug } = useParams();
  const navigate = useNavigate();

  return (
    <Container fluid className="mt-4">
      <div className="d-flex justify-content-center align-items-center mb-4 position-relative">
        <h2 className="mb-0">
          <FaChartLine className="me-2" />
          Analytics Dashboard
        </h2>
        <Button 
          variant="outline-secondary"
          className="position-absolute end-0"
          onClick={() => navigate(`/stock_tracker/${hotel_slug}`)}
        >
          <FaArrowLeft className="me-2" />
          Back to Dashboard
        </Button>
      </div>

      <Card>
        <Card.Header>
          <h5 className="mb-0">Analytics Tools</h5>
        </Card.Header>
        <Card.Body>
          <Row className="g-4">
            <Col xs={12} md={6} lg={3}>
              <Button 
                variant="outline-success" 
                className="w-100 d-flex flex-column align-items-center justify-content-center"
                style={{ height: '180px', fontSize: '1.2rem' }}
                onClick={() => navigate(`/stock_tracker/${hotel_slug}/profitability`)}
              >
                <FaChartLine size={50} className="mb-3" />
                <span className="fw-bold">Profitability Analysis</span>
                <small className="text-muted mt-2">View profit margins and markup analysis</small>
              </Button>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <Button 
                variant="outline-warning" 
                className="w-100 d-flex flex-column align-items-center justify-content-center"
                style={{ height: '180px', fontSize: '1.2rem' }}
                onClick={() => navigate(`/stock_tracker/${hotel_slug}/items?lowStock=true`)}
              >
                <FaExclamationTriangle size={50} className="mb-3" />
                <span className="fw-bold">Low Stock Alert</span>
                <small className="text-muted mt-2">Items below minimum stock levels</small>
              </Button>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <Button 
                variant="outline-primary" 
                className="w-100 d-flex flex-column align-items-center justify-content-center"
                style={{ height: '180px', fontSize: '1.2rem' }}
                onClick={() => navigate(`/stock_tracker/${hotel_slug}/comparison`)}
              >
                <FaBalanceScale size={50} className="mb-3" />
                <span className="fw-bold">Compare Periods</span>
                <small className="text-muted mt-2">Compare stock data across time periods</small>
              </Button>
            </Col>
            <Col xs={12} md={6} lg={3}>
              <Button 
                variant="outline-secondary" 
                className="w-100 d-flex flex-column align-items-center justify-content-center"
                style={{ height: '180px', fontSize: '1.2rem' }}
                onClick={() => navigate(`/stock_tracker/${hotel_slug}/movements`)}
              >
                <FaExchangeAlt size={50} className="mb-3" />
                <span className="fw-bold">Stock Movements</span>
                <small className="text-muted mt-2">Track stock in/out movements</small>
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>
    </Container>
  );
}

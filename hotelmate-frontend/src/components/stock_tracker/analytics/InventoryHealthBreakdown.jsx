import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Accordion, Spinner, ListGroup } from 'react-bootstrap';
import { 
  FaCheckCircle, 
  FaExclamationTriangle, 
  FaTimesCircle,
  FaBoxes,
  FaSkull
} from 'react-icons/fa';
import { getKPISummary } from '@/services/stockAnalytics';

const InventoryHealthBreakdown = ({ hotelSlug, selectedPeriods, period1 }) => {
  const [loading, setLoading] = useState(true);
  const [healthData, setHealthData] = useState({
    overall_health_score: 0,
    health_rating: 'N/A',
    low_stock_count: 0,
    low_stock_items: [],
    out_of_stock_count: 0,
    out_of_stock_items: [],
    overstocked_count: 0,
    overstocked_items: [],
    dead_stock_count: 0,
    dead_stock_items: []
  });

  useEffect(() => {
    if (hotelSlug && (selectedPeriods?.length > 0 || period1)) {
      fetchHealthData();
    }
  }, [hotelSlug, selectedPeriods, period1]);

  const fetchHealthData = async () => {
    try {
      setLoading(true);
      
      const periodIds = selectedPeriods?.length > 0 
        ? selectedPeriods 
        : (period1 ? [period1] : []);
      
      const response = await getKPISummary(hotelSlug, { periodIds });
      const data = response.data?.inventory_health || {};
      
      setHealthData({
        overall_health_score: data.overall_health_score || 0,
        health_rating: data.health_rating || 'N/A',
        low_stock_count: data.low_stock_count || 0,
        low_stock_items: data.low_stock_items || [],
        out_of_stock_count: data.out_of_stock_count || 0,
        out_of_stock_items: data.out_of_stock_items || [],
        overstocked_count: data.overstocked_count || 0,
        overstocked_items: data.overstocked_items || [],
        dead_stock_count: data.dead_stock_count || 0,
        dead_stock_items: data.dead_stock_items || []
      });
    } catch (error) {
      console.error('Error fetching health data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (rating) => {
    const ratingUpper = rating?.toUpperCase();
    if (ratingUpper === 'EXCELLENT') return 'success';
    if (ratingUpper === 'GOOD') return 'info';
    if (ratingUpper === 'FAIR') return 'warning';
    if (ratingUpper === 'POOR') return 'danger';
    return 'secondary';
  };

  const getHealthIcon = (rating) => {
    const ratingUpper = rating?.toUpperCase();
    if (ratingUpper === 'EXCELLENT' || ratingUpper === 'GOOD') 
      return <FaCheckCircle size={40} className="text-success" />;
    if (ratingUpper === 'FAIR') 
      return <FaExclamationTriangle size={40} className="text-warning" />;
    return <FaTimesCircle size={40} className="text-danger" />;
  };

  if (loading) {
    return (
      <Card className="shadow-sm">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <div className="mt-3">Loading inventory health data...</div>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-white">
        <h5 className="mb-0">
          <FaBoxes className="me-2" />
          Inventory Health Breakdown
        </h5>
      </Card.Header>
      <Card.Body>
        {/* Overall Health Score */}
        <Row className="mb-4">
          <Col xs={12} className="text-center">
            <div className="mb-3">{getHealthIcon(healthData.health_rating)}</div>
            <h2 className="mb-2">
              {healthData.overall_health_score}
              <span className="fs-5 text-muted">/100</span>
            </h2>
            <h4>
              <Badge bg={getHealthColor(healthData.health_rating)} className="px-3 py-2">
                {healthData.health_rating}
              </Badge>
            </h4>
            <p className="text-muted mt-2">Overall Inventory Health</p>
          </Col>
        </Row>

        {/* Health Issues Accordion */}
        <Accordion defaultActiveKey={null}>
          {/* Low Stock Items */}
          {healthData.low_stock_count > 0 && (
            <Accordion.Item eventKey="low-stock">
              <Accordion.Header>
                <FaExclamationTriangle className="text-warning me-2" />
                <strong>Low Stock Items</strong>
                <Badge bg="warning" className="ms-2">{healthData.low_stock_count}</Badge>
              </Accordion.Header>
              <Accordion.Body>
                <ListGroup variant="flush">
                  {healthData.low_stock_items.slice(0, 10).map((item, idx) => (
                    <ListGroup.Item key={idx} className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{item.item_name}</strong>
                        <div className="small text-muted">{item.category_name}</div>
                      </div>
                      <div className="text-end">
                        <Badge bg="warning">
                          {item.current_servings} servings
                        </Badge>
                        <div className="small text-muted">
                          Par: {item.par_level} servings
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))}
                  {healthData.low_stock_items.length > 10 && (
                    <ListGroup.Item className="text-center text-muted small">
                      ... and {healthData.low_stock_items.length - 10} more
                    </ListGroup.Item>
                  )}
                </ListGroup>
              </Accordion.Body>
            </Accordion.Item>
          )}

          {/* Out of Stock Items */}
          {healthData.out_of_stock_count > 0 && (
            <Accordion.Item eventKey="out-of-stock">
              <Accordion.Header>
                <FaTimesCircle className="text-danger me-2" />
                <strong>Out of Stock</strong>
                <Badge bg="danger" className="ms-2">{healthData.out_of_stock_count}</Badge>
              </Accordion.Header>
              <Accordion.Body>
                <ListGroup variant="flush">
                  {healthData.out_of_stock_items.map((item, idx) => (
                    <ListGroup.Item key={idx} className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{item.item_name || item}</strong>
                        {item.category_name && (
                          <div className="small text-muted">{item.category_name}</div>
                        )}
                      </div>
                      <Badge bg="danger">0 servings</Badge>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </Accordion.Body>
            </Accordion.Item>
          )}

          {/* Overstocked Items */}
          {healthData.overstocked_count > 0 && (
            <Accordion.Item eventKey="overstocked">
              <Accordion.Header>
                <FaBoxes className="text-info me-2" />
                <strong>Overstocked Items</strong>
                <Badge bg="info" className="ms-2">{healthData.overstocked_count}</Badge>
              </Accordion.Header>
              <Accordion.Body>
                <p className="text-muted small mb-3">
                  Items significantly above par level (potential waste or capital tied up)
                </p>
                <ListGroup variant="flush">
                  {healthData.overstocked_items.slice(0, 10).map((item, idx) => (
                    <ListGroup.Item key={idx} className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{item.item_name}</strong>
                        <div className="small text-muted">{item.category_name}</div>
                      </div>
                      <div className="text-end">
                        <Badge bg="info">
                          {item.current_servings} servings
                        </Badge>
                        <div className="small text-muted">
                          Par: {item.par_level} servings
                        </div>
                      </div>
                    </ListGroup.Item>
                  ))}
                  {healthData.overstocked_items.length > 10 && (
                    <ListGroup.Item className="text-center text-muted small">
                      ... and {healthData.overstocked_items.length - 10} more
                    </ListGroup.Item>
                  )}
                </ListGroup>
              </Accordion.Body>
            </Accordion.Item>
          )}

          {/* Dead Stock */}
          {healthData.dead_stock_count > 0 && (
            <Accordion.Item eventKey="dead-stock">
              <Accordion.Header>
                <FaSkull className="text-danger me-2" />
                <strong>Dead Stock</strong>
                <Badge bg="danger" className="ms-2">{healthData.dead_stock_count}</Badge>
              </Accordion.Header>
              <Accordion.Body>
                <p className="text-muted small mb-3">
                  Items with no movement across analyzed periods (consider removing or promoting)
                </p>
                <ListGroup variant="flush">
                  {healthData.dead_stock_items.map((item, idx) => (
                    <ListGroup.Item key={idx} className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{item.item_name || item}</strong>
                        {item.category_name && (
                          <div className="small text-muted">{item.category_name}</div>
                        )}
                      </div>
                      <Badge bg="secondary">No movement</Badge>
                    </ListGroup.Item>
                  ))}
                </ListGroup>
              </Accordion.Body>
            </Accordion.Item>
          )}
        </Accordion>

        {/* All Good Message */}
        {healthData.low_stock_count === 0 && 
         healthData.out_of_stock_count === 0 && 
         healthData.overstocked_count === 0 && 
         healthData.dead_stock_count === 0 && (
          <div className="text-center text-success mt-4">
            <FaCheckCircle size={32} className="mb-2" />
            <p className="mb-0">All inventory levels are healthy! 🎉</p>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default InventoryHealthBreakdown;

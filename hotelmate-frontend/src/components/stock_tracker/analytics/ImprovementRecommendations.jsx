import React, { useState, useEffect } from 'react';
import { Card, Alert, Badge, ListGroup, Spinner, Row, Col } from 'react-bootstrap';
import { 
  FaLightbulb, 
  FaExclamationCircle, 
  FaInfoCircle, 
  FaCheckCircle,
  FaStar
} from 'react-icons/fa';
import { getKPISummary } from '@/services/stockAnalytics';

const ImprovementRecommendations = ({ hotelSlug, selectedPeriods, period1 }) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    improvement_areas: [],
    strengths: []
  });

  useEffect(() => {
    if (hotelSlug && (selectedPeriods?.length > 0 || period1)) {
      fetchRecommendations();
    }
  }, [hotelSlug, selectedPeriods, period1]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      
      const periodIds = selectedPeriods?.length > 0 
        ? selectedPeriods 
        : (period1 ? [period1] : []);
      
      const response = await getKPISummary(hotelSlug, { periodIds });
      const performanceData = response.data?.performance_score || {};
      
      setData({
        improvement_areas: performanceData.improvement_areas || [],
        strengths: performanceData.strengths || []
      });
    } catch (error) {
      console.error('Error fetching recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityIcon = (priority) => {
    const priorityUpper = priority?.toUpperCase();
    if (priorityUpper === 'HIGH') 
      return <FaExclamationCircle className="text-danger" />;
    if (priorityUpper === 'MEDIUM') 
      return <FaInfoCircle className="text-warning" />;
    return <FaLightbulb className="text-info" />;
  };

  const getPriorityVariant = (priority) => {
    const priorityUpper = priority?.toUpperCase();
    if (priorityUpper === 'HIGH') return 'danger';
    if (priorityUpper === 'MEDIUM') return 'warning';
    return 'info';
  };

  const getPriorityBadge = (priority) => {
    const priorityUpper = priority?.toUpperCase();
    return (
      <Badge bg={getPriorityVariant(priority)}>
        {priorityUpper || 'LOW'}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className="shadow-sm">
        <Card.Body className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <div className="mt-3">Loading recommendations...</div>
        </Card.Body>
      </Card>
    );
  }

  const hasImprovements = data.improvement_areas.length > 0;
  const hasStrengths = data.strengths.length > 0;

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-white">
        <h5 className="mb-0">
          <FaLightbulb className="me-2 text-warning" />
          Actionable Insights
        </h5>
      </Card.Header>
      <Card.Body>
        <Row>
          {/* Improvement Areas */}
          <Col xs={12} lg={hasStrengths ? 6 : 12} className="mb-3">
            <h6 className="text-muted mb-3">
              <FaExclamationCircle className="me-2" />
              Areas for Improvement
            </h6>
            
            {hasImprovements ? (
              <ListGroup variant="flush">
                {data.improvement_areas.map((area, idx) => {
                  // Handle both string and object formats
                  const isString = typeof area === 'string';
                  const text = isString ? area : area.recommendation;
                  const priority = isString ? 'low' : area.priority;
                  
                  return (
                    <ListGroup.Item 
                      key={idx}
                      className="d-flex align-items-start gap-2 border-0 px-0"
                    >
                      <div className="mt-1">
                        {getPriorityIcon(priority)}
                      </div>
                      <div className="flex-grow-1">
                        <div className="d-flex justify-content-between align-items-start">
                          <p className="mb-0">{text}</p>
                          {getPriorityBadge(priority)}
                        </div>
                      </div>
                    </ListGroup.Item>
                  );
                })}
              </ListGroup>
            ) : (
              <Alert variant="success" className="mb-0">
                <FaCheckCircle className="me-2" />
                Great job! No major improvement areas identified.
              </Alert>
            )}
          </Col>

          {/* Strengths */}
          {hasStrengths && (
            <Col xs={12} lg={6} className="mb-3">
              <h6 className="text-muted mb-3">
                <FaStar className="me-2 text-warning" />
                Your Strengths
              </h6>
              
              <ListGroup variant="flush">
                {data.strengths.map((strength, idx) => (
                  <ListGroup.Item 
                    key={idx}
                    className="d-flex align-items-start gap-2 border-0 px-0"
                  >
                    <FaCheckCircle className="text-success mt-1" />
                    <span>{strength}</span>
                  </ListGroup.Item>
                ))}
              </ListGroup>
            </Col>
          )}
        </Row>

        {/* Priority Legend */}
        {hasImprovements && (
          <div className="mt-3 pt-3 border-top">
            <small className="text-muted d-flex align-items-center gap-3">
              <span>Priority levels:</span>
              <Badge bg="danger">High</Badge>
              <span className="text-muted">Immediate attention</span>
              <Badge bg="warning">Medium</Badge>
              <span className="text-muted">Plan to address</span>
              <Badge bg="info">Low</Badge>
              <span className="text-muted">Consider when possible</span>
            </small>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default ImprovementRecommendations;

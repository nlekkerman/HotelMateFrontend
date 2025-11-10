// src/pages/stock_tracker/StockOperations.jsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { FaBoxes, FaClipboardList, FaCocktail, FaArrowLeft, FaDownload } from 'react-icons/fa';
import StocktakeDownload from '../../components/stock_tracker/downloads/StocktakeDownload';

export default function StockOperations() {
  const { hotel_slug } = useParams();
  const navigate = useNavigate();
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  return (
    <Container fluid className="mt-4">
      <div className="d-flex justify-content-center align-items-center mb-4 position-relative">
        <h2 className="mb-0">
          <FaBoxes className="me-2" />
          Stock Operations
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
          <h5 className="mb-0">Stock Management Tools</h5>
        </Card.Header>
        <Card.Body>
          <Row className="g-4">
            <Col xs={12} md={6} lg={4}>
              <Button 
                variant="outline-info" 
                className="w-100 d-flex flex-column align-items-center justify-content-center"
                style={{ height: '180px', fontSize: '1.2rem' }}
                onClick={() => navigate(`/stock_tracker/${hotel_slug}/stocktakes`)}
              >
                <FaBoxes size={50} className="mb-3" />
                <span className="fw-bold">Stocktakes</span>
                <small className="text-muted mt-2">Current stocktake operations</small>
              </Button>
            </Col>
            <Col xs={12} md={6} lg={4}>
              <Button 
                variant="outline-dark" 
                className="w-100 d-flex flex-column align-items-center justify-content-center"
                style={{ height: '180px', fontSize: '1.2rem' }}
                onClick={() => navigate(`/stock_tracker/${hotel_slug}/periods`)}
              >
                <FaClipboardList size={50} className="mb-3" />
                <span className="fw-bold">Periods</span>
                <small className="text-muted mt-2">(closed stocktakes)</small>
              </Button>
            </Col>
            <Col xs={12} md={6} lg={4}>
              <Button 
                variant="outline-primary" 
                className="w-100 d-flex flex-column align-items-center justify-content-center"
                style={{ height: '180px', fontSize: '1.2rem' }}
                onClick={() => navigate(`/stock_tracker/${hotel_slug}/cocktails`)}
              >
                <FaCocktail size={50} className="mb-3" />
                <span className="fw-bold">Cocktails</span>
                <small className="text-muted mt-2">Manage cocktail recipes and calculations</small>
              </Button>
            </Col>
            <Col xs={12} md={6} lg={4}>
              <Button 
                variant="outline-success" 
                className="w-100 d-flex flex-column align-items-center justify-content-center"
                style={{ height: '180px', fontSize: '1.2rem' }}
                onClick={() => setShowDownloadModal(true)}
              >
                <FaDownload size={50} className="mb-3" />
                <span className="fw-bold">Download Stocktake</span>
                <small className="text-muted mt-2">Export stocktakes and periods data</small>
              </Button>
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Download Modal */}
      <StocktakeDownload
        show={showDownloadModal}
        onHide={() => setShowDownloadModal(false)}
        hotelSlug={hotel_slug}
      />
    </Container>
  );
}

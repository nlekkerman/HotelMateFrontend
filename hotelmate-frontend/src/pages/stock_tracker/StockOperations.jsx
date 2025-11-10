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
          <Row className="g-4 justify-content-center">
            <Col xs="auto" className="d-flex justify-content-center">
              <div
                onClick={() => navigate(`/stock_tracker/${hotel_slug}/stocktakes`)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = '3px solid gold';
                  e.currentTarget.querySelector('.hover-overlay').style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.border = '1px solid rgba(108, 117, 125, 0.3)';
                  e.currentTarget.querySelector('.hover-overlay').style.opacity = '0';
                }}
                style={{
                  width: '180px',
                  height: '220px',
                  margin: '10px',
                  padding: '5px',
                  cursor: 'pointer',
                  border: '1px solid rgba(108, 117, 125, 0.3)',
                  borderRadius: '0.375rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease'
                }}
              >
                <div 
                  className="hover-overlay"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    opacity: 0,
                    transition: 'opacity 0.3s ease',
                    pointerEvents: 'none',
                    zIndex: 0
                  }}
                ></div>
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  padding: '8px',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  position: 'relative',
                  zIndex: 1
                }}>
                  <FaBoxes size={120} style={{ position: 'relative', zIndex: 1 }} />
                </div>
                <span style={{ 
                  fontSize: '1rem', 
                  fontWeight: '600', 
                  position: 'relative', 
                  zIndex: 1,
                  textAlign: 'center',
                  maxWidth: '160px',
                  wordWrap: 'break-word',
                  lineHeight: '1.2'
                }}>Stocktakes</span>
              </div>
            </Col>
            <Col xs="auto" className="d-flex justify-content-center">
              <div
                onClick={() => navigate(`/stock_tracker/${hotel_slug}/periods`)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = '3px solid gold';
                  e.currentTarget.querySelector('.hover-overlay').style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.border = '1px solid rgba(108, 117, 125, 0.3)';
                  e.currentTarget.querySelector('.hover-overlay').style.opacity = '0';
                }}
                style={{
                  width: '180px',
                  height: '220px',
                  margin: '10px',
                  padding: '5px',
                  cursor: 'pointer',
                  border: '1px solid rgba(108, 117, 125, 0.3)',
                  borderRadius: '0.375rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease'
                }}
              >
                <div 
                  className="hover-overlay"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    opacity: 0,
                    transition: 'opacity 0.3s ease',
                    pointerEvents: 'none',
                    zIndex: 0
                  }}
                ></div>
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  padding: '8px',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  position: 'relative',
                  zIndex: 1
                }}>
                  <FaClipboardList size={120} style={{ position: 'relative', zIndex: 1 }} />
                </div>
                <span style={{ 
                  fontSize: '1rem', 
                  fontWeight: '600', 
                  position: 'relative', 
                  zIndex: 1,
                  textAlign: 'center',
                  maxWidth: '160px',
                  wordWrap: 'break-word',
                  lineHeight: '1.2'
                }}>Periods</span>
              </div>
            </Col>
            <Col xs="auto" className="d-flex justify-content-center">
              <div
                onClick={() => navigate(`/stock_tracker/${hotel_slug}/cocktails`)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = '3px solid gold';
                  e.currentTarget.querySelector('.hover-overlay').style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.border = '1px solid rgba(108, 117, 125, 0.3)';
                  e.currentTarget.querySelector('.hover-overlay').style.opacity = '0';
                }}
                style={{
                  width: '180px',
                  height: '220px',
                  margin: '10px',
                  padding: '5px',
                  cursor: 'pointer',
                  border: '1px solid rgba(108, 117, 125, 0.3)',
                  borderRadius: '0.375rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease'
                }}
              >
                <div 
                  className="hover-overlay"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    opacity: 0,
                    transition: 'opacity 0.3s ease',
                    pointerEvents: 'none',
                    zIndex: 0
                  }}
                ></div>
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  padding: '8px',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  position: 'relative',
                  zIndex: 1
                }}>
                  <FaCocktail size={120} style={{ position: 'relative', zIndex: 1 }} />
                </div>
                <span style={{ 
                  fontSize: '1rem', 
                  fontWeight: '600', 
                  position: 'relative', 
                  zIndex: 1,
                  textAlign: 'center',
                  maxWidth: '160px',
                  wordWrap: 'break-word',
                  lineHeight: '1.2'
                }}>Cocktails</span>
              </div>
            </Col>
            <Col xs="auto" className="d-flex justify-content-center">
              <div
                onClick={() => setShowDownloadModal(true)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.border = '3px solid gold';
                  e.currentTarget.querySelector('.hover-overlay').style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.border = '1px solid rgba(108, 117, 125, 0.3)';
                  e.currentTarget.querySelector('.hover-overlay').style.opacity = '0';
                }}
                style={{
                  width: '180px',
                  height: '220px',
                  margin: '10px',
                  padding: '5px',
                  cursor: 'pointer',
                  border: '1px solid rgba(108, 117, 125, 0.3)',
                  borderRadius: '0.375rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  transition: 'all 0.3s ease'
                }}
              >
                <div 
                  className="hover-overlay"
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    opacity: 0,
                    transition: 'opacity 0.3s ease',
                    pointerEvents: 'none',
                    zIndex: 0
                  }}
                ></div>
                <div style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  padding: '8px',
                  borderRadius: '8px',
                  marginBottom: '8px',
                  position: 'relative',
                  zIndex: 1
                }}>
                  <FaDownload size={120} style={{ position: 'relative', zIndex: 1 }} />
                </div>
                <span style={{ 
                  fontSize: '1rem', 
                  fontWeight: '600', 
                  position: 'relative', 
                  zIndex: 1,
                  textAlign: 'center',
                  maxWidth: '160px',
                  wordWrap: 'break-word',
                  lineHeight: '1.2'
                }}>Download Stocktake</span>
              </div>
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

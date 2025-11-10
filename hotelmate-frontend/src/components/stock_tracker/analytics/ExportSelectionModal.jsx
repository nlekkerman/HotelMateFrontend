// src/components/stock_tracker/analytics/ExportSelectionModal.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Button, Form, Row, Col, Badge } from 'react-bootstrap';
import { FaDownload, FaTimes, FaCheckSquare, FaSquare } from 'react-icons/fa';

// Available charts with display names
const AVAILABLE_CHARTS = [
  { id: 'categoryComparison', name: 'Category Comparison', icon: '📊' },
  { id: 'topMovers', name: 'Top Movers', icon: '🚀' },
  { id: 'waterfallCost', name: 'Cost Waterfall', icon: '💧' },
  { id: 'itemTrends', name: 'Item Trends', icon: '📈' },
  { id: 'varianceHeatmap', name: 'Variance Heatmap', icon: '🔥' },
  { id: 'performanceRadar', name: 'Performance Radar', icon: '🎯' },
  { id: 'stockValueTrends', name: 'Stock Trends', icon: '💰' },
  { id: 'lowStock', name: 'Low Stock', icon: '⚠️' },
  { id: 'profitability', name: 'Profitability', icon: '💵' },
  { id: 'categoryBreakdown', name: 'Category Breakdown', icon: '🥧' },
  { id: 'categoryComparisonSideBySide', name: 'Side by Side', icon: '↔️' },
  { id: 'categoryComparisonTable', name: 'Comparison Table', icon: '📋' },
  { id: 'inventoryHealth', name: 'Inventory Health', icon: '❤️' },
  { id: 'performanceBreakdown', name: 'Performance Breakdown', icon: '📊' },
  { id: 'improvementRecommendations', name: 'Recommendations', icon: '💡' },
  { id: 'categoryDistribution', name: 'Category Distribution', icon: '🎨' }
];

export default function ExportSelectionModal({ 
  show, 
  onHide, 
  onExport,
  isExporting = false 
}) {
  const [selectedCharts, setSelectedCharts] = useState([]);

  // Reset selection when modal opens
  useEffect(() => {
    if (show) {
      setSelectedCharts([]);
    }
  }, [show]);

  // Toggle individual chart selection
  const toggleChart = (chartId) => {
    setSelectedCharts(prev => 
      prev.includes(chartId)
        ? prev.filter(id => id !== chartId)
        : [...prev, chartId]
    );
  };

  // Select all charts
  const selectAll = () => {
    setSelectedCharts(AVAILABLE_CHARTS.map(chart => chart.id));
  };

  // Deselect all charts
  const deselectAll = () => {
    setSelectedCharts([]);
  };

  // Handle export
  const handleExport = () => {
    if (selectedCharts.length > 0) {
      onExport(selectedCharts);
    }
  };

  const allSelected = selectedCharts.length === AVAILABLE_CHARTS.length;

  return (
    <Modal 
      show={show} 
      onHide={onHide} 
      size="lg"
      centered
      backdrop={isExporting ? 'static' : true}
      keyboard={!isExporting}
    >
      <Modal.Header closeButton={!isExporting}>
        <Modal.Title>
          <FaDownload className="me-2" />
          Select Charts to Export
        </Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* Selection Controls */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div>
            <Badge bg="primary" className="me-2">
              {selectedCharts.length} selected
            </Badge>
            {selectedCharts.length > 0 && (
              <span className="text-muted small">
                Click Export to generate PDF
              </span>
            )}
          </div>
          <div>
            <Button 
              variant="outline-secondary" 
              size="sm" 
              onClick={allSelected ? deselectAll : selectAll}
              className="me-2"
            >
              {allSelected ? <FaSquare className="me-1" /> : <FaCheckSquare className="me-1" />}
              {allSelected ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
        </div>

        {/* Chart Selection Grid */}
        <Row className="g-3">
          {AVAILABLE_CHARTS.map(chart => {
            const isSelected = selectedCharts.includes(chart.id);
            
            return (
              <Col xs={6} sm={4} key={chart.id}>
                <div
                  className={`export-chart-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => !isExporting && toggleChart(chart.id)}
                  style={{ 
                    cursor: isExporting ? 'not-allowed' : 'pointer',
                    opacity: isExporting ? 0.6 : 1
                  }}
                >
                  <div className="export-chart-icon">{chart.icon}</div>
                  <div className="export-chart-name">{chart.name}</div>
                  {isSelected && (
                    <div className="export-chart-checkmark">
                      <FaCheckSquare />
                    </div>
                  )}
                </div>
              </Col>
            );
          })}
        </Row>

        {selectedCharts.length === 0 && (
          <div className="text-center text-muted mt-4 py-4">
            <p>👆 Select at least one chart to export</p>
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        <Button 
          variant="secondary" 
          onClick={onHide}
          disabled={isExporting}
        >
          <FaTimes className="me-2" />
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleExport}
          disabled={selectedCharts.length === 0 || isExporting}
        >
          <FaDownload className="me-2" />
          {isExporting ? 'Exporting...' : `Export ${selectedCharts.length} Chart${selectedCharts.length !== 1 ? 's' : ''}`}
        </Button>
      </Modal.Footer>

      {/* Styles */}
      <style>{`
        .export-chart-card {
          position: relative;
          border: 2px solid #dee2e6;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          transition: all 0.3s ease;
          background: white;
        }

        .export-chart-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          border-color: #0d6efd;
        }

        .export-chart-card.selected {
          border-color: #0d6efd;
          background: #e7f1ff;
          box-shadow: 0 2px 8px rgba(13, 110, 253, 0.2);
        }

        .export-chart-icon {
          font-size: 2rem;
          margin-bottom: 10px;
        }

        .export-chart-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: #495057;
        }

        .export-chart-card.selected .export-chart-name {
          color: #0d6efd;
        }

        .export-chart-checkmark {
          position: absolute;
          top: 8px;
          right: 8px;
          color: #0d6efd;
          font-size: 1.2rem;
        }
      `}</style>
    </Modal>
  );
}

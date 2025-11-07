import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Badge, Alert, Spinner, Card, Modal } from "react-bootstrap";
import { FaArrowLeft, FaLock, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import api from "@/services/api";
import { StocktakeLines } from './StocktakeLines';
import { CategoryTotalsSummary } from './CategoryTotalsSummary';

export const StocktakeDetail = () => {
  const { hotel_slug, id } = useParams();
  const navigate = useNavigate();
  
  const [stocktake, setStocktake] = useState(null);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [populating, setPopulating] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approving, setApproving] = useState(false);

  useEffect(() => {
    if (id) fetchStocktake();
  }, [id, hotel_slug]);

  const fetchStocktake = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/stock_tracker/${hotel_slug}/stocktakes/${id}/`);
      setStocktake(response.data);
      setLines(response.data.lines || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to fetch stocktake");
    } finally {
      setLoading(false);
    }
  };

  const handlePopulate = async () => {
    try {
      setPopulating(true);
      await api.post(`/stock_tracker/${hotel_slug}/stocktakes/${id}/populate/`);
      await fetchStocktake();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to populate");
    } finally {
      setPopulating(false);
    }
  };

  const handleUpdateLine = async (lineId, fullUnits, partialUnits) => {
    try {
      await api.patch(`/stock_tracker/${hotel_slug}/stocktake-lines/${lineId}/`, {
        counted_full_units: fullUnits,
        counted_partial_units: partialUnits
      });
      await fetchStocktake();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update line");
    }
  };

  const handleApprove = async () => {
    try {
      setApproving(true);
      await api.post(`/stock_tracker/${hotel_slug}/stocktakes/${id}/approve/`);
      await fetchStocktake();
      setShowApproveModal(false);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to approve stocktake");
    } finally {
      setApproving(false);
    }
  };

  if (loading) return <div className="container mt-4 text-center"><Spinner animation="border" /></div>;
  if (!stocktake) return <div className="container mt-4"><Alert variant="warning">Not found</Alert></div>;

  const isLocked = stocktake.status === 'APPROVED';
  const countedLines = lines.filter(l => l.counted_full_units !== null && l.counted_full_units !== undefined).length;
  const canApprove = !isLocked && lines.length > 0 && countedLines === lines.length;

  return (
    <div className="container-fluid mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button variant="outline-secondary" size="sm" className="me-2" onClick={() => navigate(`/stock_tracker/${hotel_slug}/stocktakes`)}>
            <FaArrowLeft /> Back
          </Button>
          <h4 className="d-inline">Stocktake #{stocktake.id}</h4>
          {isLocked ? <Badge bg="secondary" className="ms-2"><FaLock /> Approved</Badge> : <Badge bg="warning" className="ms-2">Draft</Badge>}
        </div>
        <div>
          {!isLocked && lines.length === 0 && (
            <Button variant="primary" onClick={handlePopulate} disabled={populating}>
              {populating ? 'Populating...' : 'Populate Lines'}
            </Button>
          )}
          {canApprove && (
            <Button variant="success" onClick={() => setShowApproveModal(true)} className="ms-2">
              <FaCheckCircle /> Approve Stocktake
            </Button>
          )}
        </div>
      </div>
      {error && <Alert variant="danger">{error}</Alert>}
      <Card className="mb-4">
        <Card.Body>
          <div className="row">
            <div className="col-md-3">
              <strong>Period:</strong> {new Date(stocktake.period_start).toLocaleDateString()} - {new Date(stocktake.period_end).toLocaleDateString()}
            </div>
            <div className="col-md-3">
              <strong>Lines:</strong> <Badge bg="primary">{lines.length}</Badge>
            </div>
            <div className="col-md-3">
              <strong>Counted:</strong> <Badge bg={countedLines === lines.length ? "success" : "warning"}>
                {countedLines} / {lines.length}
              </Badge>
            </div>
            <div className="col-md-3">
              {stocktake.approved_at && (
                <div><strong>Approved:</strong> {new Date(stocktake.approved_at).toLocaleString()}</div>
              )}
            </div>
          </div>
        </Card.Body>
      </Card>
      
      {lines.length === 0 ? (
        <Alert variant="info">Click Populate Lines to begin</Alert>
      ) : (
        <>
          {!isLocked && countedLines < lines.length && (
            <Alert variant="warning">
              <FaExclamationTriangle /> Please count all items before approving ({countedLines}/{lines.length} counted)
            </Alert>
          )}
          
          {/* Category Totals Summary */}
          {countedLines > 0 && (
            <CategoryTotalsSummary stocktakeId={id} hotelSlug={hotel_slug} />
          )}
          
          {/* Stocktake Lines */}
          <StocktakeLines lines={lines} isLocked={isLocked} onUpdateLine={handleUpdateLine} />
        </>
      )}

      <Modal show={showApproveModal} onHide={() => setShowApproveModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Approve Stocktake</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning">
            <FaExclamationTriangle className="me-2" />
            <strong>Warning:</strong> Approving this stocktake will:
          </Alert>
          <ul>
            <li>Lock the stocktake - no further edits allowed</li>
            <li>Create stock adjustments for all variances</li>
            <li>Update current stock levels in the system</li>
            <li>Close the current stock period</li>
          </ul>
          <p className="mb-0"><strong>Are you sure you want to proceed?</strong></p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowApproveModal(false)}>
            Cancel
          </Button>
          <Button variant="success" onClick={handleApprove} disabled={approving}>
            {approving ? 'Approving...' : 'Yes, Approve'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

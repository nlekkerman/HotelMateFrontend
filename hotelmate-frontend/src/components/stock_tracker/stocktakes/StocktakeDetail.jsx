import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Badge, Alert, Spinner, Card, Modal } from "react-bootstrap";
import { FaArrowLeft, FaLock, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import api from "@/services/api";
import { StocktakeLines } from './StocktakeLines';
// import { CategoryTotalsSummary } from './CategoryTotalsSummary'; // TODO: Enable when summary endpoint exists

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
      
      // DEBUG: Log full stocktake response
      console.log('========================================');
      console.log('FULL STOCKTAKE API RESPONSE');
      console.log('========================================');
      console.log('Complete response:', response.data);
      console.log('\n--- STOCKTAKE INFO ---');
      console.log('ID:', response.data.id);
      console.log('Period:', response.data.period_start, 'to', response.data.period_end);
      console.log('Status:', response.data.status);
      console.log('Total lines:', response.data.total_lines);
      console.log('Total items:', response.data.total_items);
      console.log('Total value:', response.data.total_value);
      console.log('Total variance value:', response.data.total_variance_value);
      
      console.log('\n--- SNAPSHOTS (Period Data) ---');
      console.log('Snapshots array length:', response.data.snapshots?.length || 0);
      if (response.data.snapshots && response.data.snapshots.length > 0) {
        const snapshot = response.data.snapshots[0];
        console.log('First snapshot sample:', snapshot);
        console.log('Snapshot opening display:', {
          opening_display_full_units: snapshot.opening_display_full_units,
          opening_display_partial_units: snapshot.opening_display_partial_units
        });
        console.log('Snapshot closing display:', {
          closing_display_full_units: snapshot.closing_display_full_units,
          closing_display_partial_units: snapshot.closing_display_partial_units
        });
      }
      
      console.log('\n--- LINES (Stocktake Counting Data) ---');
      console.log('Lines array length:', response.data.lines?.length || 0);
      if (response.data.lines && response.data.lines.length > 0) {
        // Find a line with ACTUAL stock data (not zero)
        const lineWithData = response.data.lines.find(line => 
          parseFloat(line.opening_qty || 0) > 0 || 
          parseFloat(line.expected_qty || 0) > 0 ||
          parseFloat(line.counted_qty || 0) > 0
        );
        
        if (!lineWithData) {
          console.log('⚠️ No lines with stock found! All items have zero stock.');
          return;
        }
        
        console.log('✅ Found line with stock data:', lineWithData.item_name, '(SKU:', lineWithData.item_sku + ')');
        console.log('\nLine opening:', {
          opening_qty: lineWithData.opening_qty,
          opening_display_full_units: lineWithData.opening_display_full_units,
          opening_display_partial_units: lineWithData.opening_display_partial_units
        });
        console.log('Line movements:', {
          purchases: lineWithData.purchases,
          sales: lineWithData.sales,
          waste: lineWithData.waste,
          transfers_in: lineWithData.transfers_in,
          transfers_out: lineWithData.transfers_out
        });
        console.log('Line expected:', {
          expected_qty: lineWithData.expected_qty,
          expected_display_full_units: lineWithData.expected_display_full_units,
          expected_display_partial_units: lineWithData.expected_display_partial_units,
          expected_value: lineWithData.expected_value
        });
        console.log('Line counted:', {
          counted_full_units: lineWithData.counted_full_units,
          counted_partial_units: lineWithData.counted_partial_units,
          counted_qty: lineWithData.counted_qty,
          counted_display_full_units: lineWithData.counted_display_full_units,
          counted_display_partial_units: lineWithData.counted_display_partial_units,
          counted_value: lineWithData.counted_value
        });
        console.log('Line variance:', {
          variance_qty: lineWithData.variance_qty,
          variance_display_full_units: lineWithData.variance_display_full_units,
          variance_display_partial_units: lineWithData.variance_display_partial_units,
          variance_value: lineWithData.variance_value
        });
      }
      console.log('========================================\n');
      
      setStocktake(response.data);
      setLines(response.data.lines || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to fetch stocktake");
    } finally {
      setLoading(false);
    }
  };

  const fetchPreviousPeriod = async () => {
    try {
      // Fetch all periods and find the previous closed one
      const response = await api.get(`/stock_tracker/${hotel_slug}/periods/`);
      const periods = response.data;
      
      // Sort by start_date descending to get most recent first
      const sortedPeriods = periods.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));
      
      // Find the most recent closed/approved period
      const closedPeriod = sortedPeriods.find(p => p.is_closed || p.status === 'APPROVED');
      
      if (closedPeriod) {
        // Fetch summary for that period
        const summaryResponse = await api.get(`/stock-tracker/${hotel_slug}/periods/${closedPeriod.id}/summary/`);
        setPreviousPeriod(summaryResponse.data);
      }
    } catch (err) {
      console.error("Could not fetch previous period:", err);
      // Don't show error to user - this is optional data
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

  const handleUpdateLine = async (lineId, fullUnits, partialUnits, salesQuantity = null) => {
    try {
      const payload = {
        counted_full_units: fullUnits,
        counted_partial_units: partialUnits
      };
      
      // Only include sales_quantity if provided
      if (salesQuantity !== null && salesQuantity !== undefined && salesQuantity !== '') {
        payload.sales_quantity = salesQuantity;
      }
      
      // Save in background without re-fetching (optimistic update)
      // This keeps the UI smooth - inputs stay filled
      api.patch(`/stock_tracker/${hotel_slug}/stocktake-lines/${lineId}/`, payload)
        .catch(err => {
          setError(err.response?.data?.detail || "Failed to update line");
        });
      
      // Optionally: Update local lines state optimistically
      setLines(prevLines => 
        prevLines.map(line => 
          line.id === lineId 
            ? { ...line, counted_full_units: fullUnits, counted_partial_units: partialUnits, sales_quantity: salesQuantity }
            : line
        )
      );
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
          
          {/* Category Totals Summary - TODO: Enable when summary endpoint exists */}
          {/* {countedLines > 0 && (
            <CategoryTotalsSummary stocktakeId={id} hotelSlug={hotel_slug} />
          )} */}
          
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

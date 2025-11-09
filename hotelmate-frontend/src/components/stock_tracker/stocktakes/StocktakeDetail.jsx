import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button, Badge, Alert, Spinner, Card, Modal } from "react-bootstrap";
import { FaArrowLeft, FaLock, FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import { toast } from "react-toastify";
import api from "@/services/api";
import { StocktakeLines } from './StocktakeLines';
import { StocktakeManualValues } from './StocktakeManualValues';
import { usePusherContext } from '@/staff_chat/context/PusherProvider';
import { useStocktakeRealtime } from '../hooks/useStocktakeRealtime';
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

  // Get Pusher instance for real-time updates
  const { pusher, isReady } = usePusherContext();

  // Pusher callbacks
  const handleLineUpdatedFromPusher = useCallback((updatedLine) => {
    console.log('📡 Real-time line update received:', updatedLine.item_sku);
    setLines(prevLines =>
      prevLines.map(line =>
        line.id === updatedLine.id ? updatedLine : line
      )
    );
    toast.info(`${updatedLine.item_sku} updated by another user`, {
      autoClose: 2000,
      position: 'bottom-right'
    });
  }, []);

  const handleStocktakeUpdatedFromPusher = useCallback((updatedStocktake) => {
    console.log('📡 Real-time stocktake status change:', updatedStocktake.status);
    setStocktake(updatedStocktake);
    
    if (updatedStocktake.status === 'APPROVED') {
      toast.success('Stocktake has been approved and locked', {
        autoClose: 5000
      });
    }
  }, []);

  const handleStocktakePopulatedFromPusher = useCallback((data) => {
    console.log('📡 Real-time stocktake populated:', data.lines_created);
    toast.success(`${data.lines_created} items loaded into stocktake`, {
      autoClose: 3000
    });
    // Refresh the full stocktake to get all lines
    fetchStocktake();
  }, []);

  // Subscribe to real-time updates
  useStocktakeRealtime(
    pusher,
    hotel_slug,
    id ? parseInt(id) : null,
    handleLineUpdatedFromPusher,
    handleStocktakeUpdatedFromPusher,
    handleStocktakePopulatedFromPusher,
    isReady && !!id // Only enable when Pusher is ready and we have a stocktake ID
  );

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

  const handleUpdateLine = async (lineId, fullUnits, partialUnits, wasteQuantity = null, purchases = null, transfersIn = null, transfersOut = null, adjustments = null) => {
    console.log('\n🔵 ========================================');
    console.log('🔵 PARENT HANDLER - handleUpdateLine CALLED');
    console.log('🔵 ========================================');
    
    try {
      // Find the line being updated
      const currentLine = lines.find(l => l.id === lineId);
      if (!currentLine) {
        console.error('❌ Line not found:', lineId);
        return;
      }
      
      console.log('📋 Target Line:', {
        id: lineId,
        name: currentLine.item_name,
        sku: currentLine.item_sku,
        category: currentLine.category_code
      });
      
      // Handle movements through add_movement endpoint (purchases and waste are read-only in serializer)
      let movementsAdded = false;
      
      if (purchases !== null && purchases !== undefined && purchases !== '') {
        const purchasePayload = {
          movement_type: 'PURCHASE',
          quantity: parseFloat(purchases),
          notes: 'Purchases recorded during stocktake'
        };
        console.log('🛒 SENDING PURCHASE:', purchasePayload);
        const purchaseResponse = await api.post(`/stock_tracker/${hotel_slug}/stocktake-lines/${lineId}/add-movement/`, purchasePayload);
        console.log('✅ PURCHASE RESPONSE:', purchaseResponse.data);
        movementsAdded = true;
      }
      
      if (wasteQuantity !== null && wasteQuantity !== undefined && wasteQuantity !== '') {
        const wastePayload = {
          movement_type: 'WASTE',
          quantity: parseFloat(wasteQuantity),
          notes: 'Waste recorded during stocktake'
        };
        console.log('💥 SENDING WASTE:', wastePayload);
        const wasteResponse = await api.post(`/stock_tracker/${hotel_slug}/stocktake-lines/${lineId}/add-movement/`, wastePayload);
        console.log('✅ WASTE RESPONSE:', wasteResponse.data);
        movementsAdded = true;
      }
      
      const payload = {
        counted_full_units: fullUnits,
        counted_partial_units: partialUnits
      };

      if (transfersIn !== null && transfersIn !== undefined && transfersIn !== '') {
        payload.transfers_in = transfersIn;
      }

      if (transfersOut !== null && transfersOut !== undefined && transfersOut !== '') {
        payload.transfers_out = transfersOut;
      }

      if (adjustments !== null && adjustments !== undefined && adjustments !== '') {
        payload.adjustments = adjustments;
      }
      
      console.log('\n📦 Final Payload to API:', JSON.stringify(payload, null, 2));
      
      // Update the line with counted values and purchases
      console.log('\n🌐 SENDING PATCH TO UPDATE LINE');
      console.log('─────────────────────────────────────────');
      const response = await api.patch(`/stock_tracker/${hotel_slug}/stocktake-lines/${lineId}/`, payload);
      
      console.log('\n✅ DATABASE RESPONSE RECEIVED');
      console.log('─────────────────────────────────────────');
      console.log('Full Response:', JSON.stringify(response.data, null, 2));
      
      console.log('\n� CHECKING WHAT DB RETURNED:');
      console.log('─────────────────────────────────────────');
      
      console.log('\n📊 Movement Values from DB:');
      console.log('  🛒 Purchases (DB):', response.data.purchases, '← DID THIS UPDATE?');
      console.log('  💥 Waste (DB):', response.data.waste, '← DID THIS UPDATE?');
      
      console.log('\n📊 Stock Calculations from DB:');
      console.log('  Opening Qty (DB):', response.data.opening_qty);
      console.log('  Expected Qty (DB):', response.data.expected_qty, '← Should be: opening + purchases - waste');
      console.log('  Expected Value (DB):', response.data.expected_value);
      console.log('  Counted Qty (DB):', response.data.counted_qty);
      console.log('  Variance Qty (DB):', response.data.variance_qty);
      console.log('  Variance Value (DB):', response.data.variance_value);
      
      console.log('\n🧮 VERIFY BACKEND FORMULA:');
      const db_opening = parseFloat(response.data.opening_qty) || 0;
      const db_purchases = parseFloat(response.data.purchases) || 0;
      const db_waste = parseFloat(response.data.waste) || 0;
      const db_expected = parseFloat(response.data.expected_qty) || 0;
      const calculated_expected = db_opening + db_purchases - db_waste;
      console.log(`  Formula: ${db_opening} + ${db_purchases} - ${db_waste} = ${calculated_expected.toFixed(4)}`);
      console.log(`  DB Expected: ${db_expected.toFixed(4)}`);
      console.log(`  Match: ${Math.abs(calculated_expected - db_expected) < 0.01 ? '✅' : '❌ MISMATCH!'}`);
      
      console.log('\n🔍 Input Fields Sent vs Returned:');
      console.log('  SENT purchases:', payload.purchases ?? 'not sent');
      console.log('  RETURNED purchases:', response.data.purchases);
      console.log('  ⚠️ Match:', payload.purchases == response.data.purchases ? '✅' : '❌ VALUES DIFFERENT!');
      
      console.log('  SENT waste_quantity:', payload.waste_quantity ?? 'not sent');
      console.log('  RETURNED waste:', response.data.waste);
      console.log('  ⚠️ Match:', payload.waste_quantity == response.data.waste ? '✅' : '❌ VALUES DIFFERENT!');
      
      console.log('\n🔍 Display Values (DB):');
      console.log('  Expected Full:', response.data.expected_display_full_units);
      console.log('  Expected Partial:', response.data.expected_display_partial_units);
      console.log('  Counted Full:', response.data.counted_display_full_units);
      console.log('  Counted Partial:', response.data.counted_display_partial_units);
      console.log('  Variance Full:', response.data.variance_display_full_units);
      console.log('  Variance Partial:', response.data.variance_display_partial_units);
      
      // Step 3: Replace optimistic data with backend's authoritative calculations
      console.log('\n🔄 STEP 3: REPLACING OPTIMISTIC WITH DB VALUES');
      console.log('─────────────────────────────────────────');
      
      // If we added any movements (purchases or waste), refetch just this line to get fresh data
      // Movement POSTs happen separately, so PATCH response has stale movement data
      if (movementsAdded) {
        console.log('\n🔄 Movements were added - refetching single line to get fresh data...');
        const freshLine = await api.get(`/stock_tracker/${hotel_slug}/stocktake-lines/${lineId}/`);
        console.log('✅ Fresh line data received:', freshLine.data);
        
        setLines(prevLines => 
          prevLines.map(line => 
            line.id === lineId ? freshLine.data : line
          )
        );
      } else {
        // No movements - just use the PATCH response
        setLines(prevLines => 
          prevLines.map(line => {
            if (line.id === lineId) {
              console.log('✅ Replacing line', lineId, 'with DB data');
              console.log('  Old line.expected_qty:', line.expected_qty);
              console.log('  New line.expected_qty:', response.data.expected_qty);
              return response.data;
            }
            return line;
          })
        );
      }
      
      console.log('\n✅ ========================================');
      console.log('✅ UPDATE COMPLETE - UI NOW SHOWS DB VALUES');
      console.log('✅ ========================================\n');
      
    } catch (err) {
      console.error('\n❌ ========================================');
      console.error('❌ ERROR IN handleUpdateLine');
      console.error('❌ ========================================');
      console.error('Error:', err);
      console.error('Response:', err.response?.data);
      
      setError(err.response?.data?.detail || "Failed to update line");
      // Revert optimistic update on error by refetching
      console.log('🔄 Reverting optimistic update by refetching from DB...');
      await fetchStocktake();
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
  <div className="container-fluid mt-4 px-3" style={{ width: '100%', maxWidth: '100%', overflowX: 'auto', margin: '0 auto', paddingTop: '12px', paddingBottom: '12px' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button variant="outline-secondary" size="sm" className="me-2" onClick={() => navigate(`/stock_tracker/${hotel_slug}/stocktakes`)}>
            <FaArrowLeft /> Back
          </Button>
          <h4 className="d-inline">Stocktake #{stocktake.id}</h4>
          {isLocked ? <Badge bg="secondary" className="ms-2"><FaLock /> Approved</Badge> : <Badge bg="warning" className="ms-2">Draft</Badge>}
          {isReady && (
            <Badge bg="success" className="ms-2" title="Real-time updates active">
              <span style={{ fontSize: '0.8em' }}>● Live</span>
            </Badge>
          )}
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
          
          {/* Stocktake-Level Manual Financial Values */}
          {!isLocked && (
            <Card className="mb-4 border-success">
              <Card.Header className="bg-success text-white">
                <h5 className="mb-0">💰 Stocktake Total Manual Financial Values</h5>
              </Card.Header>
              <Card.Body>
                <StocktakeManualValues 
                  stocktakeId={id}
                  hotelSlug={hotel_slug}
                  stocktake={stocktake}
                />
              </Card.Body>
            </Card>
          )}
          
          {/* Stocktake Lines */}
          <StocktakeLines 
            lines={lines} 
            isLocked={isLocked} 
            onUpdateLine={handleUpdateLine}
            onLineUpdated={(updatedLine) => {
              // Direct line update callback - replaces line in state
              setLines(prevLines => 
                prevLines.map(line => 
                  line.id === updatedLine.id ? updatedLine : line
                )
              );
            }}
            hotelSlug={hotel_slug}
            stocktakeId={id}
          />
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

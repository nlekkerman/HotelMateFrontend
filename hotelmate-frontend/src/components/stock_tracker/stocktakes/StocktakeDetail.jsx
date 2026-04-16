import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  Button,
  Badge,
  Alert,
  Spinner,
  Card,
  Modal,
  Row,
  Col,
  Table,
  Form,
} from "react-bootstrap";
import {
  FaArrowLeft,
  FaLock,
  FaCheckCircle,
  FaExclamationTriangle,
  FaMoneyBillWave,
} from "react-icons/fa";
import { FileDown, FileSpreadsheet } from "lucide-react";
import { toast } from "react-toastify";
// TODO: migrate this domain to centralized realtime (eventBus + store)
// See src/migration/realtime-migration.md for full tracking
import Pusher from "pusher-js";
import api from "@/services/api";
import { StocktakeLines } from "./StocktakeLines";
import { StocktakeCloseModal } from "./StocktakeCloseModal";
import { useStocktakeRealtime } from "../hooks/useStocktakeRealtime";
import { useCategoryTotals } from "../hooks/useCategoryTotals";
// import { CategoryTotalsSummary } from './CategoryTotalsSummary'; // TODO: Enable when summary endpoint exists

export const StocktakeDetail = () => {
  const { hotel_slug, id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stocktake, setStocktake] = useState(null);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [populating, setPopulating] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [pusher, setPusher] = useState(null);
  const [pusherReady, setPusherReady] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Fetch category totals for calculating grand total
  const { categoryTotals } = useCategoryTotals(hotel_slug, id);

  // Get unique categories and subcategories from lines (must be before conditional returns)
  const categoryOptions = React.useMemo(() => {
    const categories = {};
    lines.forEach(line => {
      const catCode = line.category_code;
      const catName = line.category_name || catCode;
      
      if (!categories[catCode]) {
        categories[catCode] = {
          name: catName,
          subcategories: new Set()
        };
      }
      
      if (line.subcategory) {
        categories[catCode].subcategories.add(line.subcategory);
      }
    });
    return categories;
  }, [lines]);

  // Initialize Pusher instance for real-time updates
  useEffect(() => {
    const pusherKey = import.meta.env.VITE_PUSHER_KEY;
    const pusherCluster = import.meta.env.VITE_PUSHER_CLUSTER || "mt1";

    if (!pusherKey) {
      return;
    }


    const pusherInstance = new Pusher(pusherKey, {
      cluster: pusherCluster,
      encrypted: true,
    });

    pusherInstance.connection.bind("connected", () => {
      setPusherReady(true);
    });

    pusherInstance.connection.bind("disconnected", () => {
      setPusherReady(false);
    });

    pusherInstance.connection.bind("error", (err) => {
      console.error("❌ Pusher error:", err);
    });

    setPusher(pusherInstance);

    // Cleanup on unmount
    return () => {
      pusherInstance.disconnect();
    };
  }, []);

  // Pusher callbacks
  const handleLineUpdatedFromPusher = useCallback((updatedLine) => {
    setLines((prevLines) =>
      prevLines.map((line) => (line.id === updatedLine.id ? updatedLine : line))
    );
    // Silent update - no toast notification
  }, []);

  const handleStocktakeUpdatedFromPusher = useCallback((updatedStocktake) => {
    setStocktake(updatedStocktake);

    if (updatedStocktake.status === "APPROVED") {
      toast.success("Stocktake has been approved and locked", {
        autoClose: 5000,
      });
    }
  }, []);

  const handleStocktakePopulatedFromPusher = useCallback((data) => {
    toast.success(`${data.lines_created} items loaded into stocktake`, {
      autoClose: 3000,
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
    pusherReady && !!id // Only enable when Pusher is ready and we have a stocktake ID
  );

  useEffect(() => {
    if (id) fetchStocktake();
  }, [id, hotel_slug]);

  const fetchStocktake = async () => {
    try {
      setLoading(true);
      const response = await api.get(
        `/stock_tracker/${hotel_slug}/stocktakes/${id}/`
      );
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
      const sortedPeriods = periods.sort(
        (a, b) => new Date(b.start_date) - new Date(a.start_date)
      );

      // Find the most recent closed/approved period
      const closedPeriod = sortedPeriods.find(
        (p) => p.is_closed || p.status === "APPROVED"
      );

      if (closedPeriod) {
        // Fetch summary for that period
        const summaryResponse = await api.get(
          `/stock-tracker/${hotel_slug}/periods/${closedPeriod.id}/summary/`
        );
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
      
      
      const response = await api.post(`/stock_tracker/${hotel_slug}/stocktakes/${id}/populate/`);
      
      
      
      // Fetch updated stocktake
      await fetchStocktake();
      
      // Verify opening balances
      const verifyResponse = await api.get(`/stock_tracker/${hotel_slug}/stocktakes/${id}/`);
      const populatedStocktake = verifyResponse.data;
      
      // Check for zeros
      const allZero = populatedStocktake.lines.every(line => 
        parseFloat(line.opening_qty) === 0
      );
      
      if (allZero) {
        console.error('❌ WARNING: All opening balances are ZERO!');
        toast.warning('⚠️ All opening balances are zero - please check previous period');
      } else {
        toast.success('Stocktake populated successfully! 🎉');
      }
      
    } catch (err) {
      console.error('\n❌ ========================================');
      console.error('❌ POPULATE FAILED');
      console.error('❌ ========================================');
      console.error('Error:', err);
      console.error('Response:', err.response?.data);
      
      setError(err.response?.data?.detail || "Failed to populate");
      toast.error('Failed to populate stocktake');
    } finally {
      setPopulating(false);
    }
  };

  const handleUpdateLine = async (
    lineId,
    fullUnits,
    partialUnits,
    wasteQuantity = null,
    purchases = null,
    transfersIn = null,
    transfersOut = null,
    adjustments = null
  ) => {

    try {
      // Find the line being updated
      const currentLine = lines.find((l) => l.id === lineId);
      if (!currentLine) {
        console.error("❌ Line not found:", lineId);
        return;
      }


      // Handle movements through add_movement endpoint (purchases and waste are read-only in serializer)
      let movementsAdded = false;

      if (purchases !== null && purchases !== undefined && purchases !== "") {
        const purchasePayload = {
          movement_type: "PURCHASE",
          quantity: parseFloat(purchases),
          notes: "Purchases recorded during stocktake",
        };
        await api.post(
          `/stock_tracker/${hotel_slug}/stocktake-lines/${lineId}/add-movement/`,
          purchasePayload
        );
        movementsAdded = true;
      }

      if (
        wasteQuantity !== null &&
        wasteQuantity !== undefined &&
        wasteQuantity !== ""
      ) {
        const wastePayload = {
          movement_type: "WASTE",
          quantity: parseFloat(wasteQuantity),
          notes: "Waste recorded during stocktake",
        };
        await api.post(
          `/stock_tracker/${hotel_slug}/stocktake-lines/${lineId}/add-movement/`,
          wastePayload
        );
        movementsAdded = true;
      }

      const payload = {
        counted_full_units: fullUnits,
        counted_partial_units: partialUnits,
      };

      if (
        transfersIn !== null &&
        transfersIn !== undefined &&
        transfersIn !== ""
      ) {
        payload.transfers_in = transfersIn;
      }

      if (
        transfersOut !== null &&
        transfersOut !== undefined &&
        transfersOut !== ""
      ) {
        payload.transfers_out = transfersOut;
      }

      if (
        adjustments !== null &&
        adjustments !== undefined &&
        adjustments !== ""
      ) {
        payload.adjustments = adjustments;
      }


      // Update the line with counted values and purchases
      const response = await api.patch(
        `/stock_tracker/${hotel_slug}/stocktake-lines/${lineId}/`,
        payload
      );


      // Step 3: Replace optimistic data with backend's authoritative calculations

      // If we added any movements (purchases or waste), refetch just this line to get fresh data
      // Movement POSTs happen separately, so PATCH response has stale movement data
      if (movementsAdded) {
        const freshLine = await api.get(
          `/stock_tracker/${hotel_slug}/stocktake-lines/${lineId}/`
        );

        setLines((prevLines) =>
          prevLines.map((line) => (line.id === lineId ? freshLine.data : line))
        );
      } else {
        // No movements - just use the PATCH response
        setLines((prevLines) =>
          prevLines.map((line) => {
            if (line.id === lineId) {
              return response.data;
            }
            return line;
          })
        );
      }

      
      // Check for large variances and warn user
      const finalLine = movementsAdded 
        ? await api.get(`/stock_tracker/${hotel_slug}/stocktake-lines/${lineId}/`)
        : response;
      
      const varianceQty = parseFloat(finalLine.data?.variance_qty || response.data.variance_qty);
      const varianceValue = parseFloat(finalLine.data?.variance_value || response.data.variance_value);
      
      if (Math.abs(varianceQty) > 10) {
        
        if (varianceQty < -10) {
          toast.warning(`⚠️ Large shortage detected: ${currentLine.item_name} (${varianceQty.toFixed(2)} units)`, {
            autoClose: 5000
          });
        } else if (varianceQty > 10) {
          toast.warning(`⚠️ Large surplus detected: ${currentLine.item_name} (+${varianceQty.toFixed(2)} units)`, {
            autoClose: 5000
          });
        }
      }
      
    } catch (err) {
      console.error("\n❌ ========================================");
      console.error("❌ ERROR IN handleUpdateLine");
      console.error("❌ ========================================");
      console.error("Error:", err);
      console.error("Response:", err.response?.data);

      setError(err.response?.data?.detail || "Failed to update line");
      toast.error('Failed to update line');
      
      // Revert optimistic update on error by refetching
      await fetchStocktake();
    }
  };

  const handleApproveSuccess = async () => {
    // Called after successful approval from modal
    // Refresh stocktake to get calculated metrics
    await fetchStocktake();
    toast.success("Stocktake closed successfully! 🎉", {
      autoClose: 5000,
    });
  };


  if (loading)
    return (
      <div className="container mt-4 text-center">
        <Spinner animation="border" />
      </div>
    );
  if (!stocktake)
    return (
      <div className="container mt-4">
        <Alert variant="warning">Not found</Alert>
      </div>
    );

  const isLocked = stocktake.status === "APPROVED";
  const countedLines = lines.filter(
    (l) => l.counted_full_units !== null && l.counted_full_units !== undefined
  ).length;
  const canApprove =
    !isLocked && lines.length > 0 && countedLines === lines.length;

  // Filter lines based on category selection
  const filteredLines = categoryFilter === 'all' 
    ? lines 
    : lines.filter(line => {
        // Handle subcategory filters (e.g., "M:SOFT_DRINKS")
        if (categoryFilter.includes(':')) {
          const [catCode, subcat] = categoryFilter.split(':');
          return line.category_code === catCode && line.subcategory === subcat;
        }
        // Handle regular category filters
        return line.category_code === categoryFilter;
      });

  return (
    <div
      className="container-fluid mt-4 px-3"
      style={{
        width: "100%",
        maxWidth: "100%",
        overflowX: "auto",
        margin: "0 auto",
        paddingTop: "12px",
        paddingBottom: "12px",
      }}
    >
      {/* Sticky Back Button - Top Left */}
      <Button
        variant="outline-secondary"
        className="shadow"
        onClick={() => navigate(`/stock_tracker/${hotel_slug}/stocktakes`)}
        style={{
          position: "fixed",
          top: "60px",
          left: "60px",
          zIndex: 1050,
          borderRadius: "8px",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "1rem",
          backgroundColor: "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(8px)",
          transition: "all 0.3s ease",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 1)";
          e.currentTarget.style.color = "#212529";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "rgba(255, 255, 255, 0.7)";
          e.currentTarget.style.color = "";
        }}
        title="Back to Stocktakes"
      >
        <FaArrowLeft /> Back
      </Button>

      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="d-inline">Stocktake #{stocktake.id}</h4>
          {isLocked ? (
            <Badge bg="secondary" className="ms-2">
              <FaLock /> Approved
            </Badge>
          ) : (
            <Badge bg="warning" className="ms-2">
              Draft
            </Badge>
          )}
          {pusherReady && (
            <Badge
              bg="success"
              className="ms-2"
              title="Real-time updates active"
            >
              <span style={{ fontSize: "0.8em" }}>● Live</span>
            </Badge>
          )}
        </div>
        <div className="d-flex gap-2">
          {isLocked && (
            <>
              <Button
                variant="outline-primary"
                size="sm"
                onClick={async () => {
                  try {
                    await downloadStocktakePDF(hotel_slug, parseInt(id), api.get);
                  } catch (err) {
                    alert(err.message || 'Failed to download PDF. Please try again.');
                  }
                }}
                title="Download Stocktake PDF Report"
              >
                <FileDown size={16} /> PDF
              </Button>
              <Button
                variant="outline-success"
                size="sm"
                onClick={async () => {
                  try {
                    await downloadStocktakeExcel(hotel_slug, parseInt(id), api.get);
                  } catch (err) {
                    alert(err.message || 'Failed to download Excel. Please try again.');
                  }
                }}
                title="Download Stocktake Excel Workbook"
              >
                <FileSpreadsheet size={16} /> Excel
              </Button>
            </>
          )}
          {!isLocked && lines.length === 0 && (
            <Button
              variant="primary"
              onClick={handlePopulate}
              disabled={populating}
            >
              {populating ? "Populating..." : "Populate Lines"}
            </Button>
          )}
          {canApprove && (
            <Button
              variant="success"
              onClick={() => setShowApproveModal(true)}
            >
              <FaCheckCircle /> Approve & Close Period
            </Button>
          )}
        </div>
      </div>
      {error && <Alert variant="danger">{error}</Alert>}
      <Card className="mb-4">
        <Card.Body>
          <div className="row">
            <div className="col-md-3">
              <strong>Period:</strong>{" "}
              {new Date(stocktake.period_start).toLocaleDateString()} -{" "}
              {new Date(stocktake.period_end).toLocaleDateString()}
            </div>
            <div className="col-md-3">
              <strong>Lines:</strong> <Badge bg="primary">{lines.length}</Badge>
            </div>
            <div className="col-md-3">
              <strong>Counted:</strong>{" "}
              <Badge bg={countedLines === lines.length ? "success" : "warning"}>
                {countedLines} / {lines.length}
              </Badge>
            </div>
            <div className="col-md-3">
              <strong>Total Stock Value:</strong>{" "}
              <Badge bg="success">
                €{(() => {
                  // DEBUG: Log the data we're working with
                  
                  // Try to use backend field first (when it's available)
                  if (stocktake.total_counted_value) {
                    return Number(stocktake.total_counted_value).toFixed(2);
                  }
                  // Fallback: Calculate from category totals
                  if (categoryTotals && Object.keys(categoryTotals).length > 0) {
                    const total = Object.values(categoryTotals).reduce((sum, cat) => {
                      return sum + parseFloat(cat.counted_value || 0);
                    }, 0);
                    return Number(total).toFixed(2);
                  }
                  return "0.00";
                })()}
              </Badge>
            </div>
          </div>
          {stocktake.approved_at && (
            <div className="row mt-2">
              <div className="col-md-12">
                <small className="text-muted">
                  <strong>Approved:</strong>{" "}
                  {new Date(stocktake.approved_at).toLocaleString()}
                </small>
              </div>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* ==================== STOCKTAKE REPORT SUMMARY - PDF MATCH ==================== */}
      {isLocked && (
        <Card className="mb-4 border-primary shadow-lg">
          <Card.Header className="bg-primary bg-gradient text-white">
            <h4 className="mb-0">
              <i className="bi bi-file-earmark-text-fill me-2"></i>
              Stocktake Report - {stocktake.hotel_name || 'Hotel'}
              <Badge bg="light" text="primary" className="ms-2">PDF Summary</Badge>
            </h4>
          </Card.Header>
          <Card.Body>
            {/* Report Header Info */}
            <div className="alert alert-info mb-4">
              <div className="row g-3">
                <div className="col-12 col-md-4">
                  <strong>Period:</strong><br />
                  {new Date(stocktake.period_start).toLocaleDateString()} to {new Date(stocktake.period_end).toLocaleDateString()}
                </div>
                <div className="col-6 col-md-4">
                  <strong>Status:</strong><br />
                  <Badge bg="secondary" className="fs-6">{stocktake.status}</Badge>
                </div>
                <div className="col-6 col-md-4">
                  <strong>Created:</strong><br />
                  {new Date(stocktake.created_at).toLocaleString()}
                </div>
                {stocktake.approved_at && stocktake.approved_by_name && (
                  <div className="col-12">
                    <strong>Approved:</strong> {new Date(stocktake.approved_at).toLocaleString()} 
                    <span className="ms-2">by <strong>{stocktake.approved_by_name}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Summary Section */}
            <div className="row mb-4">
              <div className="col-12">
                <h5 className="border-bottom pb-2 mb-3">
                  <i className="bi bi-clipboard-data me-2"></i>Summary
                </h5>
              </div>
              <div className="col-6 col-md-3 mb-3">
                <Card className="border-primary h-100">
                  <Card.Body className="text-center p-3" style={{ backgroundColor: '#E3F2FD' }}>
                    <small className="text-muted d-block mb-1">Total Items</small>
                    <h4 className="mb-0 text-primary">{lines.length}</h4>
                  </Card.Body>
                </Card>
              </div>
              <div className="col-6 col-md-3 mb-3">
                <Card className="border-info h-100">
                  <Card.Body className="text-center p-3" style={{ backgroundColor: '#E1F5FE' }}>
                    <small className="text-muted d-block mb-1">Expected Stock Value</small>
                    <h5 className="mb-0 text-info">
                      {stocktake.total_expected_value 
                        ? `€${parseFloat(stocktake.total_expected_value).toFixed(2)}`
                        : '€0.00'}
                    </h5>
                  </Card.Body>
                </Card>
              </div>
              <div className="col-6 col-md-3 mb-3">
                <Card className="border-success h-100">
                  <Card.Body className="text-center p-3" style={{ backgroundColor: '#E8F5E9' }}>
                    <small className="text-muted d-block mb-1">Counted Stock Value</small>
                    <h5 className="mb-0 text-success">
                      {(() => {
                        if (stocktake.total_counted_value) {
                          return `€${parseFloat(stocktake.total_counted_value).toFixed(2)}`;
                        }
                        if (categoryTotals && Object.keys(categoryTotals).length > 0) {
                          const total = Object.values(categoryTotals).reduce((sum, cat) => {
                            return sum + parseFloat(cat.counted_value || 0);
                          }, 0);
                          return `€${total.toFixed(2)}`;
                        }
                        return '€0.00';
                      })()}
                    </h5>
                  </Card.Body>
                </Card>
              </div>
              <div className="col-6 col-md-3 mb-3">
                <Card className={`h-100 ${stocktake.total_variance >= 0 ? 'border-success' : 'border-danger'}`}>
                  <Card.Body className="text-center p-3" style={{ 
                    backgroundColor: stocktake.total_variance >= 0 ? '#E8F5E9' : '#FFEBEE' 
                  }}>
                    <small className="text-muted d-block mb-1">Variance</small>
                    <h5 className={`mb-0 ${stocktake.total_variance >= 0 ? 'text-success' : 'text-danger'}`}>
                      {stocktake.total_variance 
                        ? `€${parseFloat(stocktake.total_variance).toFixed(2)}`
                        : '€0.00'}
                    </h5>
                  </Card.Body>
                </Card>
              </div>
            </div>

            {/* Financial Metrics Row */}
            {(stocktake.total_cogs || stocktake.total_revenue) && (
              <div className="row mb-4">
                <div className="col-12 col-md-6 col-lg-3 mb-3">
                  <Card className="border-danger h-100">
                    <Card.Body className="text-center p-3" style={{ backgroundColor: '#FFEBEE' }}>
                      <small className="text-muted d-block mb-1">Total COGS</small>
                      <h5 className="mb-0 text-danger">
                        {stocktake.total_cogs 
                          ? `€${parseFloat(stocktake.total_cogs).toFixed(2)}`
                          : '€0.00'}
                      </h5>
                    </Card.Body>
                  </Card>
                </div>
                <div className="col-12 col-md-6 col-lg-3 mb-3">
                  <Card className="border-success h-100">
                    <Card.Body className="text-center p-3" style={{ backgroundColor: '#E8F5E9' }}>
                      <small className="text-muted d-block mb-1">Total Revenue</small>
                      <h5 className="mb-0 text-success">
                        {stocktake.total_revenue 
                          ? `€${parseFloat(stocktake.total_revenue).toFixed(2)}`
                          : '€0.00'}
                      </h5>
                    </Card.Body>
                  </Card>
                </div>
                <div className="col-12 col-md-6 col-lg-3 mb-3">
                  <Card className="border-primary h-100">
                    <Card.Body className="text-center p-3" style={{ backgroundColor: '#E3F2FD' }}>
                      <small className="text-muted d-block mb-1">GP%</small>
                      <h5 className="mb-0 text-primary">
                        {stocktake.gross_profit_percentage 
                          ? `${parseFloat(stocktake.gross_profit_percentage).toFixed(2)}%`
                          : '0.00%'}
                      </h5>
                    </Card.Body>
                  </Card>
                </div>
                <div className="col-12 col-md-6 col-lg-3 mb-3">
                  <Card className="border-warning h-100">
                    <Card.Body className="text-center p-3" style={{ backgroundColor: '#FFF8E1' }}>
                      <small className="text-muted d-block mb-1">Pour Cost%</small>
                      <h5 className="mb-0 text-warning">
                        {stocktake.pour_cost_percentage 
                          ? `${parseFloat(stocktake.pour_cost_percentage).toFixed(2)}%`
                          : '0.00%'}
                      </h5>
                    </Card.Body>
                  </Card>
                </div>
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {/* ==================== CATEGORY TOTALS - PDF MATCH ==================== */}
      {isLocked && categoryTotals && Object.keys(categoryTotals).length > 0 && (() => {
        return (
          <Card className="mb-4 border-success shadow-lg">
            <Card.Header className="bg-success bg-gradient text-white">
              <h5 className="mb-0">
                <i className="bi bi-diagram-3-fill me-2"></i>
                Category Totals
                <Badge bg="light" text="success" className="ms-2">PDF Breakdown</Badge>
              </h5>
            </Card.Header>
            <Card.Body className="p-0">
              <div className="table-responsive">
                <Table hover bordered className="mb-0">
                  <thead className="table-dark">
                    <tr>
                      <th>Category</th>
                      <th className="text-end bg-primary text-white">Opening</th>
                      <th className="text-end bg-info text-white">Purchases</th>
                      <th className="text-end bg-warning text-dark">Expected</th>
                      <th className="text-end bg-success text-white">Counted</th>
                      <th className="text-end">Variance</th>
                      <th className="text-end">Value €</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(categoryTotals).map(([categoryCode, cat]) => {
                      const variance = parseFloat(cat.variance_value || 0);
                      const openingValue = parseFloat(cat.opening_value || 0);
                      const purchasesValue = parseFloat(cat.purchases_value || 0);
                      
                      return (
                        <tr key={categoryCode}>
                          <td><strong>{cat.category_name || categoryCode}</strong></td>
                          <td className="text-end" style={{ backgroundColor: '#E3F2FD' }}>
                            <strong className="text-primary">
                              {openingValue.toFixed(2)}
                            </strong>
                          </td>
                          <td className="text-end" style={{ backgroundColor: '#E1F5FE' }}>
                            <strong className="text-info">
                              {purchasesValue.toFixed(2)}
                            </strong>
                          </td>
                          <td className="text-end" style={{ backgroundColor: '#FFF8E1' }}>
                            <strong className="text-warning">
                              {cat.expected_value ? parseFloat(cat.expected_value).toFixed(2) : '0.00'}
                            </strong>
                          </td>
                          <td className="text-end" style={{ backgroundColor: '#E8F5E9' }}>
                            <strong className="text-success">
                              {cat.counted_value ? parseFloat(cat.counted_value).toFixed(2) : '0.00'}
                            </strong>
                          </td>
                          <td className={`text-end ${variance >= 0 ? 'bg-success bg-opacity-10' : 'bg-danger bg-opacity-10'}`}>
                            <strong className={variance >= 0 ? 'text-success' : 'text-danger'}>
                              {variance >= 0 ? '+' : ''}{variance.toFixed(2)}
                            </strong>
                          </td>
                          <td className="text-end">
                            <strong className={variance >= 0 ? 'text-success' : 'text-danger'}>
                              €{Math.abs(variance).toFixed(2)}
                            </strong>
                          </td>
                        </tr>
                      );
                    })}
                    {/* TOTALS ROW */}
                    <tr className="table-active border-top border-3 border-dark">
                      <td><strong className="fs-5">TOTAL</strong></td>
                      <td className="text-end" style={{ backgroundColor: '#E3F2FD' }}>
                        <strong className="fs-5 text-primary">
                          {Object.values(categoryTotals).reduce((sum, cat) => 
                            sum + parseFloat(cat.opening_value || 0), 0).toFixed(2)}
                        </strong>
                      </td>
                      <td className="text-end" style={{ backgroundColor: '#E1F5FE' }}>
                        <strong className="fs-5 text-info">
                          {Object.values(categoryTotals).reduce((sum, cat) => 
                            sum + parseFloat(cat.purchases_value || 0), 0).toFixed(2)}
                        </strong>
                      </td>
                      <td className="text-end" style={{ backgroundColor: '#FFF8E1' }}>
                        <strong className="fs-5 text-warning">
                          {stocktake.total_expected_value 
                            ? parseFloat(stocktake.total_expected_value).toFixed(2)
                            : '0.00'}
                        </strong>
                      </td>
                      <td className="text-end" style={{ backgroundColor: '#E8F5E9' }}>
                        <strong className="fs-5 text-success">
                          {(() => {
                            if (stocktake.total_counted_value) {
                              return parseFloat(stocktake.total_counted_value).toFixed(2);
                            }
                            const total = Object.values(categoryTotals).reduce((sum, cat) => 
                              sum + parseFloat(cat.counted_value || 0), 0);
                            return total.toFixed(2);
                          })()}
                        </strong>
                      </td>
                      <td className={`text-end ${(() => {
                        const totalVariance = Object.values(categoryTotals).reduce((sum, cat) => 
                          sum + parseFloat(cat.variance_value || 0), 0);
                        return totalVariance >= 0 ? 'bg-success bg-opacity-25' : 'bg-danger bg-opacity-25';
                      })()}`}>
                        <strong className={`fs-5 ${(() => {
                          const totalVariance = Object.values(categoryTotals).reduce((sum, cat) => 
                            sum + parseFloat(cat.variance_value || 0), 0);
                          return totalVariance >= 0 ? 'text-success' : 'text-danger';
                        })()}`}>
                          {(() => {
                            const totalVariance = Object.values(categoryTotals).reduce((sum, cat) => 
                              sum + parseFloat(cat.variance_value || 0), 0);
                            return `${totalVariance >= 0 ? '+' : ''}${totalVariance.toFixed(2)}`;
                          })()}
                        </strong>
                      </td>
                      <td className="text-end">
                        <strong className={`fs-5 ${(() => {
                          const totalVariance = Object.values(categoryTotals).reduce((sum, cat) => 
                            sum + parseFloat(cat.variance_value || 0), 0);
                          return totalVariance >= 0 ? 'text-success' : 'text-danger';
                        })()}`}>
                          €{(() => {
                            const totalVariance = Object.values(categoryTotals).reduce((sum, cat) => 
                              sum + parseFloat(cat.variance_value || 0), 0);
                            return Math.abs(totalVariance).toFixed(2);
                          })()}
                        </strong>
                      </td>
                    </tr>
                  </tbody>
                </Table>
              </div>
            </Card.Body>
            <Card.Footer className="bg-light">
              <small className="text-muted">
                <i className="bi bi-info-circle me-1"></i>
                <strong>Note:</strong> These calculations match your PDF download. 
                Opening & Purchases calculated from individual items | Expected = Opening + Purchases | Variance = Counted - Expected
              </small>
            </Card.Footer>
          </Card>
        );
      })()}

      {/* Financial Results - Only show for approved/locked stocktakes */}
      {isLocked && (stocktake.total_cogs || stocktake.total_revenue) && (
        <Card className="mb-4 border-success">
          <Card.Header className="bg-success text-white">
            <h5 className="mb-0">
              <FaMoneyBillWave className="me-2" />
              Financial Results
            </h5>
          </Card.Header>
          <Card.Body>
            <Row className="g-3">
              <Col md={6} lg={3}>
                <Card className="text-center border-0 bg-danger text-white">
                  <Card.Body>
                    <small className="d-block mb-1 opacity-75">
                      Total COGS
                    </small>
                    <small
                      className="d-block mb-2 opacity-75"
                      style={{ fontSize: "0.75rem" }}
                    >
                      (Cost of Goods Sold)
                    </small>
                    <h2 className="mb-0 fw-bold">
                      {stocktake.total_cogs
                        ? `€${parseFloat(stocktake.total_cogs).toFixed(2)}`
                        : "—"}
                    </h2>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6} lg={3}>
                <Card className="text-center border-0 bg-success text-white">
                  <Card.Body>
                    <small className="d-block mb-1 opacity-75">
                      Total Revenue
                    </small>
                    <small
                      className="d-block mb-2 opacity-75"
                      style={{ fontSize: "0.75rem" }}
                    >
                      &nbsp;
                    </small>
                    <h2 className="mb-0 fw-bold">
                      {stocktake.total_revenue
                        ? `€${parseFloat(stocktake.total_revenue).toFixed(2)}`
                        : "—"}
                    </h2>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6} lg={3}>
                <Card className="text-center border-0 bg-primary text-white">
                  <Card.Body>
                    <small className="d-block mb-1 opacity-75">
                      Gross Profit €
                    </small>
                    <small
                      className="d-block mb-2 opacity-75"
                      style={{ fontSize: "0.75rem" }}
                    >
                      (GP:{" "}
                      {stocktake.gross_profit_percentage
                        ? `${parseFloat(
                            stocktake.gross_profit_percentage
                          ).toFixed(2)}%`
                        : "—"}
                      )
                    </small>
                    <h2 className="mb-0 fw-bold">
                      {stocktake.total_revenue && stocktake.total_cogs
                        ? `€${(
                            parseFloat(stocktake.total_revenue) -
                            parseFloat(stocktake.total_cogs)
                          ).toFixed(2)}`
                        : "—"}
                    </h2>
                  </Card.Body>
                </Card>
              </Col>
              <Col md={6} lg={3}>
                <Card className="text-center border-0 bg-dark text-white">
                  <Card.Body>
                    <small className="d-block mb-1 opacity-75">
                      Pour Cost %
                    </small>
                    <small
                      className="d-block mb-2 opacity-75"
                      style={{ fontSize: "0.75rem" }}
                    >
                      (COGS / Revenue)
                    </small>
                    <h2 className="mb-0 fw-bold text-warning">
                      {stocktake.pour_cost_percentage
                        ? `${parseFloat(stocktake.pour_cost_percentage).toFixed(
                            2
                          )}%`
                        : "—"}
                    </h2>
                  </Card.Body>
                </Card>
              </Col>
            </Row>
          </Card.Body>
        </Card>
      )}

      {lines.length === 0 ? (
        <Alert variant="info">
          <strong>Step 1:</strong> Click "Populate Lines" to load all inventory items into this stocktake.
          <br />
          <small className="text-muted">
            This will create stocktake lines with opening balances from the previous period's closing stock.
          </small>
        </Alert>
      ) : (
        <>
          {!isLocked && countedLines === 0 && (
            <Alert variant="info">
              <strong>Step 2:</strong> Count your physical inventory and enter the quantities below.
              <br />
              <small className="text-muted">
                Enter full units (cases/kegs/bottles) and partial units (bottles/pints/shots) for each item.
              </small>
            </Alert>
          )}
          
          {!isLocked && countedLines > 0 && countedLines < lines.length && (
            <Alert variant="warning">
              <FaExclamationTriangle /> <strong>Step 2 (In Progress):</strong> Please count all items before approving
              ({countedLines}/{lines.length} counted)
              <br />
              <small className="text-muted">
                You must count every item to proceed with approval.
              </small>
            </Alert>
          )}
          
          {!isLocked && countedLines === lines.length && (
            <Alert variant="success">
              <FaCheckCircle /> <strong>Step 3:</strong> All items counted! Ready to approve.
              <br />
              <small className="text-muted">
                Click "Approve & Close Period" to lock this stocktake and close the period.
              </small>
            </Alert>
          )}

          {/* Category Filter */}
          {lines.length > 0 && (
            <Card className="mb-3">
              <Card.Body>
                <Row className="align-items-center">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label className="fw-bold mb-2">
                        <i className="bi bi-funnel me-2"></i>
                        Filter by Category
                      </Form.Label>
                      <Form.Select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        size="lg"
                      >
                        <option value="all">All Categories ({lines.length} items)</option>
                        
                        {Object.entries(categoryOptions).map(([code, { name, subcategories }]) => {
                          const categoryLines = lines.filter(l => l.category_code === code);
                          
                          if (subcategories.size === 0) {
                            // No subcategories - simple option
                            return (
                              <option key={code} value={code}>
                                {name} ({categoryLines.length} items)
                              </option>
                            );
                          } else {
                            // Has subcategories - use optgroup
                            return (
                              <optgroup key={code} label={`${name} (${categoryLines.length} items)`}>
                                <option value={code}>→ All {name}</option>
                                {Array.from(subcategories).sort().map(subcat => {
                                  const subcatLines = lines.filter(
                                    l => l.category_code === code && l.subcategory === subcat
                                  );
                                  const subcatLabel = subcat.split('_').map(w => 
                                    w.charAt(0) + w.slice(1).toLowerCase()
                                  ).join(' ');
                                  return (
                                    <option key={`${code}:${subcat}`} value={`${code}:${subcat}`}>
                                      → {subcatLabel} ({subcatLines.length} items)
                                    </option>
                                  );
                                })}
                              </optgroup>
                            );
                          }
                        })}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  
                  <Col md={6}>
                    <div className="text-muted small">
                      {categoryFilter !== 'all' && (
                        <>
                          Showing <strong>{filteredLines.length}</strong> of <strong>{lines.length}</strong> items
                          {' '}
                          <Button 
                            variant="link" 
                            size="sm" 
                            className="p-0 ms-2"
                            onClick={() => setCategoryFilter('all')}
                          >
                            Clear filter
                          </Button>
                        </>
                      )}
                      {categoryFilter === 'all' && (
                        <>Showing all <strong>{lines.length}</strong> items across all categories</>
                      )}
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          )}

        

          {/* Stocktake Lines */}
          <StocktakeLines
            lines={filteredLines}
            isLocked={isLocked}
            onUpdateLine={handleUpdateLine}
            stocktakeId={id}
            hotelSlug={hotel_slug}
            onLineUpdated={(updatedLine) => {
              // Direct line update callback - replaces line in state

              setLines((prevLines) => {
                const lineIndex = prevLines.findIndex(l => l.id === updatedLine.id);
                
                if (lineIndex === -1) {
                  console.error("❌ PARENT: Line not found in state! ID:", updatedLine.id);
                  return prevLines;
                }
                
                const oldLine = prevLines[lineIndex];
                
                const newLines = prevLines.map((line) => {
                  if (line.id === updatedLine.id) {
                    return updatedLine;
                  }
                  return line;
                });
                
                return newLines;
              });
            }}
          />
        </>
      )}

      {/* New Stocktake Close Modal with Manual Values */}
      <StocktakeCloseModal
        show={showApproveModal}
        onHide={() => setShowApproveModal(false)}
        stocktake={stocktake}
        hotelSlug={hotel_slug}
        onSuccess={handleApproveSuccess}
      />

    </div>
  );
};

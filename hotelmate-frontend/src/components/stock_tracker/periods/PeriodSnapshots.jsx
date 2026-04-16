import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "@/services/api";
import { formatCurrency } from '../utils/stockDisplayUtils';
import { ReopenPeriodModal } from '../modals/ReopenPeriodModal';
import { CreatePeriodModal } from '../modals/CreatePeriodModal';
import { DeletePeriodModal } from '../modals/DeletePeriodModal';
import { useAuth } from '@/context/AuthContext';

export const PeriodSnapshots = () => {
  const { hotel_slug } = useParams();
  const navigate = useNavigate();
  
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [reopening, setReopening] = useState(null);
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(null);
  const [showCreatePeriodModal, setShowCreatePeriodModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [periodToDelete, setPeriodToDelete] = useState(null);
  
  const { user } = useAuth();
  const isSuperuser = user?.is_superuser === true;

  useEffect(() => {
    fetchPeriods();
  }, [hotel_slug]);

  const fetchPeriods = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/stock_tracker/${hotel_slug}/periods/`);
      const periodsData = response.data.results || response.data;
      
      setPeriods(periodsData);
      setError(null);
    } catch (err) {
      console.error('Error fetching periods:', err);
      setError(err.response?.data?.detail || "Failed to fetch periods");
    } finally {
      setLoading(false);
    }
  };

  const getPeriodBadge = (period, allPeriods) => {
    
    if (period.is_closed) {
      return <span className="badge bg-secondary">{period.period_name}</span>;
    }
    
    // For open periods, check if this is the most recent one
    const openPeriods = allPeriods.filter(p => !p.is_closed);
    
    const mostRecentOpen = openPeriods.sort((a, b) => 
      new Date(b.start_date) - new Date(a.start_date)
    )[0];
    
    
    // Only the most recent open period is "Current Period"
    if (mostRecentOpen?.id === period.id) {
      return <span className="badge bg-success">Current Period</span>;
    }
    
    // Older open periods show "Open"
    return <span className="badge bg-info">Open</span>;
  };

  const filteredPeriods = periods.filter(period => {
    
    if (statusFilter === "all") {
      return true;
    }
    if (statusFilter === "open") {
      const include = !period.is_closed;
      return include;
    }
    if (statusFilter === "closed") {
      const include = period.is_closed;
      return include;
    }
    return true;
  });
  

  const handleReopenClick = (e, period) => {
    e.stopPropagation(); // Prevent card click
    setSelectedPeriod(period);
    setShowReopenModal(true);
  };

  const handleDeleteClick = (e, period) => {
    e.stopPropagation(); // Prevent card click
    setPeriodToDelete(period);
    setShowDeleteModal(true);
  };

  const handleModalSuccess = async () => {
    // Refresh periods data after reopening or deleting
    await fetchPeriods();
  };

  const handlePeriodClick = async (period) => {

    // FLOW:
    // 1. If period has stocktake → Go to stocktake details
    // 2. If period has NO stocktake → CREATE stocktake for that period → POPULATE → Go to stocktake details
    
    if (period.stocktake?.id) {
      // Has stocktake - go directly to stocktake details
      navigate(`/stock_tracker/${hotel_slug}/stocktakes/${period.stocktake.id}`);
      return;
    }
    
    // No stocktake - search for existing stocktake first
    try {
      const response = await api.get(`/stock_tracker/${hotel_slug}/stocktakes/`);
      const stocktakes = response.data.results || response.data;
      
      
      // Find stocktake that matches this period's dates
      // Use date-only string comparison to avoid timezone issues
      const periodStartDate = period.start_date.split('T')[0]; // Get YYYY-MM-DD
      const periodEndDate = period.end_date.split('T')[0]; // Get YYYY-MM-DD
      
      
      const matchingStocktake = stocktakes.find(st => {
        const stStartDate = st.period_start.split('T')[0];
        const stEndDate = st.period_end.split('T')[0];
        return stStartDate === periodStartDate && stEndDate === periodEndDate;
      });
      
      if (matchingStocktake) {
        navigate(`/stock_tracker/${hotel_slug}/stocktakes/${matchingStocktake.id}`);
        return;
      }
      
      // No stocktake exists - CREATE ONE for this period
      toast.info(`Creating stocktake for ${period.period_name}...`);
      
      const createPayload = {
        period_start: period.start_date,
        period_end: period.end_date,
        status: 'DRAFT'
      };
      
      
      const createResponse = await api.post(`/stock_tracker/${hotel_slug}/stocktakes/`, createPayload);
      const newStocktake = createResponse.data;
      
      
      // POPULATE the stocktake with inventory items
      toast.info('Loading inventory items...');
      
      
      try {
        const populateResponse = await api.post(`/stock_tracker/${hotel_slug}/stocktakes/${newStocktake.id}/populate/`);
        
        // Verify opening balances
        const verifyResponse = await api.get(`/stock_tracker/${hotel_slug}/stocktakes/${newStocktake.id}/`);
        const populatedStocktake = verifyResponse.data;
        
        // Alert if all opening balances are zero
        const allZero = populatedStocktake.lines.every(line => 
          parseFloat(line.opening_qty) === 0
        );
        
        if (allZero) {
          console.error('❌ WARNING: All opening balances are ZERO!');
          console.error('This indicates a backend issue. Contact support.');
          toast.warning('⚠️ Opening balances are all zero - this may need attention');
        }
        
        toast.success(`Stocktake created and populated for ${period.period_name}! 🎉`);
      } catch (populateErr) {
        console.error('\n❌ ========================================');
        console.error('❌ POPULATE FAILED');
        console.error('❌ ========================================');
        console.error('Error:', populateErr);
        console.error('Response:', populateErr.response?.data);
        
        toast.warning('Stocktake created but failed to populate. Click "Populate Lines" button.');
      }
      
      
      // Navigate to the new stocktake
      navigate(`/stock_tracker/${hotel_slug}/stocktakes/${newStocktake.id}`);
      
    } catch (err) {
      console.error('\n❌ ========================================');
      console.error('❌ ERROR IN handlePeriodClick');
      console.error('❌ ========================================');
      console.error('Error:', err);
      console.error('Response:', err.response?.data);
      
      toast.error(err.response?.data?.detail || 'Failed to create stocktake');
    }
  };

  return (
    <div className="container mt-4">
      {/* Sticky Back Button - Top Left */}
      <button 
        className="btn btn-outline-secondary shadow"
        onClick={() => navigate(`/stock_tracker/${hotel_slug}`)}
        style={{
          position: 'fixed',
          top: '80px',
          left: '120px',
          zIndex: 1050,
          borderRadius: '8px',
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '1rem',
          backgroundColor: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 1)';
          e.currentTarget.style.color = '#212529';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.7)';
          e.currentTarget.style.color = '';
        }}
        title="Back to Stock Tracker"
      >
        <i className="bi bi-arrow-left"></i> Back
      </button>

      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="d-inline">Period History</h2>
          <small className="text-muted ms-2">View all accounting periods and their stocktakes</small>
        </div>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreatePeriodModal(true)}
          title="Create a new period"
        >
          <i className="bi bi-plus-circle me-2"></i>
          Create New Period
        </button>
      </div>

      {/* Filter */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row align-items-end">
            <div className="col-md-4">
              <label className="form-label">Status</label>
              <select 
                className="form-select" 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Periods</option>
                <option value="open">Current Period</option>
                <option value="closed">Closed Periods</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Periods List */}
      {loading && <div className="text-center"><div className="spinner-border" role="status"></div></div>}
      {error && <div className="alert alert-danger">{error}</div>}
      
      {!loading && !error && (
        <div className="row g-3">
          {filteredPeriods.length === 0 ? (
            <div className="col-12">
              <div className="alert alert-info text-center">
                No periods found.
              </div>
            </div>
          ) : (
            filteredPeriods.map(period => (
              <div key={period.id} className="col-12 col-md-6 col-lg-4">
                <div className="card h-100 shadow-sm hover-shadow" style={{ cursor: "pointer" }}
                     onClick={() => handlePeriodClick(period)}>
                  {/* Period Header */}
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center gap-2">
                      <strong>{period.period_name}</strong>
                      {getPeriodBadge(period, periods)}
                    </div>
                    
                    {/* Delete Button - Superusers Only */}
                    {isSuperuser && (
                      <button 
                        className="btn btn-sm btn-outline-danger"
                        onClick={(e) => handleDeleteClick(e, period)}
                        title="Delete period and all related data (superuser only)"
                        style={{ zIndex: 10 }}
                      >
                        <i className="bi bi-trash"></i>
                      </button>
                    )}
                  </div>
                  
                  <div className="card-body">
                    {/* Stocktake Information */}
                    {period.stocktake ? (
                      <div className="mb-2">
                        {/* Status Badge + Reopen Badge + Reopen Button */}
                        <div className="mb-2 d-flex align-items-center justify-content-between">
                          <span className={`badge ${period.stocktake.status === 'APPROVED' ? 'bg-success' : 'bg-warning text-dark'}`}>
                            {period.stocktake.status}
                          </span>
                          
                          <div className="d-flex align-items-center gap-1">
                            {/* Reopened indicator badge */}
                            {period.reopened_at && (
                              <span 
                                className={`badge ${period.is_closed ? 'bg-secondary' : 'bg-info'}`}
                                title={`Reopened on ${new Date(period.reopened_at).toLocaleString('en-IE')}`}
                              >
                                <i className="bi bi-arrow-counterclockwise"></i> {period.is_closed ? 'Was Reopened' : 'Reopened'}
                              </span>
                            )}
                            
                            {/* Reopen Button - Superusers OR staff with permission, when closed */}
                            {period.is_closed && (isSuperuser || period.can_reopen) && (
                              <button 
                                className="btn btn-sm btn-danger"
                                onClick={(e) => handleReopenClick(e, period)}
                                title="Reopen this period and manage permissions"
                              >
                                <i className="bi bi-unlock"></i> Reopen
                              </button>
                            )}
                          </div>
                        </div>
                        
                        {/* Stocktake Month */}
                        <div className="mb-3">
                          <small className="text-muted">Stocktake for:</small>{" "}
                          <strong>{period.period_name}</strong>
                        </div>
                        
                        {/* Items Summary */}
                        <div className="mb-2">
                          <small className="text-muted d-block mb-1">Items Counted:</small>
                          <span className="badge bg-primary">
                            {period.stocktake.lines_counted || 0} / {period.stocktake.total_lines || 0}
                          </span>
                          {period.stocktake.lines_at_zero > 0 && (
                            <span className="badge bg-secondary ms-1">
                              {period.stocktake.lines_at_zero} at zero
                            </span>
                          )}
                        </div>

                        {/* Audit Trail - Show who closed/reopened and when */}
                        {(period.closed_at || period.reopened_at) && (
                          <div className="mt-3 pt-2 border-top">
                            <small className="text-muted d-block mb-1"><strong>History:</strong></small>
                            {period.closed_at && (
                              <small className="text-muted d-block">
                                🔒 Closed: {new Date(period.closed_at).toLocaleString('en-IE', { 
                                  dateStyle: 'short', 
                                  timeStyle: 'short' 
                                })}
                                {period.closed_by_name && ` by ${period.closed_by_name}`}
                              </small>
                            )}
                            {period.reopened_at && (
                              <small className="text-success d-block">
                                🔓 Reopened: {new Date(period.reopened_at).toLocaleString('en-IE', { 
                                  dateStyle: 'short', 
                                  timeStyle: 'short' 
                                })}
                                {period.reopened_by_name && ` by ${period.reopened_by_name}`}
                              </small>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mb-2">
                        <span className="badge bg-secondary">No Stocktake</span>
                        <div className="mt-2">
                          <small className="text-muted">⚠️ No stocktake created for this period</small>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Action Button */}
                  <div className="card-footer bg-transparent">
                    <button className="btn btn-sm btn-outline-primary w-100">
                      {period.stocktake 
                        ? (period.is_closed && period.stocktake.status === 'APPROVED' 
                            ? 'View Stocktake Lines (Locked)' 
                            : 'Continue Counting') 
                        : 'Create Stocktake'
                      } <i className="bi bi-arrow-right ms-1"></i>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create Period Modal */}
      <CreatePeriodModal
        show={showCreatePeriodModal}
        onHide={() => setShowCreatePeriodModal(false)}
        hotelSlug={hotel_slug}
        onSuccess={handleModalSuccess}
      />

      {/* Reopen Period Modal */}
      {selectedPeriod && (
        <ReopenPeriodModal
          show={showReopenModal}
          onHide={() => setShowReopenModal(false)}
          period={selectedPeriod}
          hotelSlug={hotel_slug}
          onSuccess={handleModalSuccess}
        />
      )}

      {/* Delete Period Modal - Superusers Only */}
      {periodToDelete && (
        <DeletePeriodModal
          show={showDeleteModal}
          onHide={() => {
            setShowDeleteModal(false);
            setPeriodToDelete(null);
          }}
          period={periodToDelete}
          hotelSlug={hotel_slug}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
};

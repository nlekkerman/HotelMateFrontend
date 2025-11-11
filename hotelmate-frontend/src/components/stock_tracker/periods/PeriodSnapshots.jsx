import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import api from "@/services/api";
import { formatCurrency } from '../utils/stockDisplayUtils';
import { ReopenPeriodModal } from '../modals/ReopenPeriodModal';

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
  
  // Check if user is superuser from localStorage
  const getUserFromLocalStorage = () => {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch (err) {
      console.error('Error reading user from localStorage:', err);
      return null;
    }
  };
  
  const user = getUserFromLocalStorage();
  const isSuperuser = user?.is_superuser === true;

  useEffect(() => {
    fetchPeriods();
  }, [hotel_slug]);

  const fetchPeriods = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/stock_tracker/${hotel_slug}/periods/`);
      const periodsData = response.data.results || response.data;
      
      console.log('📊 Periods (MONTHS) data received:', periodsData);
      if (periodsData.length > 0) {
        console.log('📋 Sample PERIOD structure:', {
          period_id: periodsData[0].id,
          period_name: periodsData[0].period_name,
          year: periodsData[0].year,
          month: periodsData[0].month,
          is_closed: periodsData[0].is_closed,
          closed_at: periodsData[0].closed_at,
          closed_by: periodsData[0].closed_by,
          reopened_at: periodsData[0].reopened_at,
          reopened_by: periodsData[0].reopened_by,
          has_stocktake: !!periodsData[0].stocktake,
          stocktake_object: periodsData[0].stocktake,
          all_keys: Object.keys(periodsData[0])
        });
        console.log('💡 RELATIONSHIP: Period = Month, Stocktake = belongs to that month');
        
        if (periodsData[0].stocktake) {
          console.log('✅ Stocktake data:', periodsData[0].stocktake);
        }
      }
      
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
    console.log('🏷️ Badge for period:', period.period_name, 'is_closed:', period.is_closed);
    
    if (period.is_closed) {
      console.log('   → Closed period badge');
      return <span className="badge bg-secondary">{period.period_name}</span>;
    }
    
    // For open periods, check if this is the most recent one
    const openPeriods = allPeriods.filter(p => !p.is_closed);
    console.log('   → Open periods count:', openPeriods.length);
    console.log('   → Open periods:', openPeriods.map(p => ({ name: p.period_name, start: p.start_date })));
    
    const mostRecentOpen = openPeriods.sort((a, b) => 
      new Date(b.start_date) - new Date(a.start_date)
    )[0];
    
    console.log('   → Most recent open:', mostRecentOpen?.period_name);
    console.log('   → Current period ID:', period.id, 'Most recent ID:', mostRecentOpen?.id);
    
    // Only the most recent open period is "Current Period"
    if (mostRecentOpen?.id === period.id) {
      console.log('   → ✅ This is CURRENT period');
      return <span className="badge bg-success">Current Period</span>;
    }
    
    // Older open periods show "Open"
    console.log('   → ⚠️ This is older OPEN period');
    return <span className="badge bg-info">Open</span>;
  };

  const filteredPeriods = periods.filter(period => {
    console.log('🔍 Filtering period:', period.period_name, 'statusFilter:', statusFilter, 'is_closed:', period.is_closed);
    
    if (statusFilter === "all") {
      console.log('   → Filter: ALL - include');
      return true;
    }
    if (statusFilter === "open") {
      const include = !period.is_closed;
      console.log('   → Filter: OPEN - include?', include);
      return include;
    }
    if (statusFilter === "closed") {
      const include = period.is_closed;
      console.log('   → Filter: CLOSED - include?', include);
      return include;
    }
    console.log('   → Filter: default - include');
    return true;
  });
  
  console.log('📋 Filtered periods result:', filteredPeriods.length, 'of', periods.length);
  console.log('📊 Filtered period names:', filteredPeriods.map(p => p.period_name));

  const handleReopenClick = (e, period) => {
    e.stopPropagation(); // Prevent card click
    setSelectedPeriod(period);
    setShowReopenModal(true);
  };

  const handleModalSuccess = async () => {
    // Refresh periods data after reopening
    await fetchPeriods();
  };

  const handlePeriodClick = async (period) => {
    // FLOW:
    // 1. If period has stocktake → Go to stocktake details
    // 2. If period has NO stocktake → CREATE stocktake for that period → Go to new stocktake details
    
    if (period.stocktake?.id) {
      // Has stocktake - go directly to stocktake details
      console.log('✅ Period has stocktake ID:', period.stocktake.id);
      navigate(`/stock_tracker/${hotel_slug}/stocktakes/${period.stocktake.id}`);
      return;
    }
    
    // No stocktake - search for existing stocktake first
    console.warn('⚠️ Period missing stocktake, searching for existing stocktake...');
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
        console.log('✅ Found existing stocktake:', matchingStocktake.id, 'for period', period.period_name);
        navigate(`/stock_tracker/${hotel_slug}/stocktakes/${matchingStocktake.id}`);
        return;
      }
      
      // No stocktake exists - CREATE ONE for this period
      console.log('📝 Creating new stocktake for period:', period.period_name);
      toast.info(`Creating stocktake for ${period.period_name}...`);
      
      const createPayload = {
        period_start: period.start_date,
        period_end: period.end_date,
        status: 'DRAFT'
      };
      
      const createResponse = await api.post(`/stock_tracker/${hotel_slug}/stocktakes/`, createPayload);
      const newStocktake = createResponse.data;
      
      console.log('✅ Stocktake created:', newStocktake.id);
      
      // POPULATE the stocktake with inventory items
      console.log('📦 Populating stocktake with items...');
      toast.info('Loading inventory items...');
      
      try {
        await api.post(`/stock_tracker/${hotel_slug}/stocktakes/${newStocktake.id}/populate/`);
        console.log('✅ Stocktake populated successfully');
        toast.success(`Stocktake created and populated for ${period.period_name}! 🎉`);
      } catch (populateErr) {
        console.warn('⚠️ Failed to populate stocktake:', populateErr);
        toast.warning('Stocktake created but failed to populate. Click "Populate Lines" button.');
      }
      
      // Navigate to the new stocktake
      navigate(`/stock_tracker/${hotel_slug}/stocktakes/${newStocktake.id}`);
      
    } catch (err) {
      console.error('❌ Error with stocktake:', err);
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
                    <strong>{period.period_name}</strong>
                    {getPeriodBadge(period, periods)}
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
    </div>
  );
};

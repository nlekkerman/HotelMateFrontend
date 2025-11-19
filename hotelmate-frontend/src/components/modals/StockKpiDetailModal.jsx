import React, { useState, useEffect } from 'react';
import { Modal, Table, Badge, Spinner, Alert, Tabs, Tab } from 'react-bootstrap';
import { formatCurrency } from '@/services/stockAnalytics';
import { 
  getLowStockItems, 
  getTopMovers,
  getProfitabilityData
} from '@/services/stockAnalytics';

/**
 * Stock KPI Detail Modal
 * Displays detailed breakdowns when a KPI card is clicked
 */
const StockKpiDetailModal = ({ 
  show, 
  onClose, 
  kpiType, 
  kpiData,
  hotelSlug,
  period1,
  period2,
  allKpisData 
}) => {
  const [detailData, setDetailData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (show && kpiType && hotelSlug) {
      fetchDetailData();
    }
  }, [show, kpiType, hotelSlug, period1, period2]);

  const fetchDetailData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      switch (kpiType) {
        case 'lowStockCount':
          const lowStockRes = await getLowStockItems(hotelSlug, 50);
          setDetailData(lowStockRes);
          break;
          
        case 'topMoversCount':
          // First check if data is already in allKpisData
          if (allKpisData?.period_comparison?.top_movers) {
            console.log('✅ Using top movers from KPI data:', allKpisData.period_comparison.top_movers);
            setDetailData(allKpisData.period_comparison.top_movers);
          } else if (allKpisData?.period_comparison) {
            console.log('✅ Using full period_comparison data:', allKpisData.period_comparison);
            setDetailData(allKpisData.period_comparison);
          } else if (period1 && period2) {
            console.log('⚠️ Fetching top movers via API:', { period1, period2 });
            const moversRes = await getTopMovers(hotelSlug, period2, period1, 50);
            console.log('API response:', moversRes);
            setDetailData(moversRes);
          } else {
            console.log('❌ No period comparison data available');
            console.log('allKpisData:', allKpisData);
            setDetailData(null);
          }
          break;
          
        case 'topCategory':
        case 'totalItems':
          // Use data already in allKpisData
          setDetailData(allKpisData);
          break;
          
        default:
          setDetailData(allKpisData);
      }
    } catch (err) {
      console.error('Error fetching detail data:', err);
      setError(err.message || 'Failed to load details');
    } finally {
      setLoading(false);
    }
  };

  const renderModalTitle = () => {
    const titles = {
      totalStockValue: '💰 Current Stock Value Details',
      averageGP: '📊 GP% Analysis',
      topCategory: '🏆 Top Categories Breakdown',
      lowStockCount: '⚠️ Low Stock Items',
      topMoversCount: '📈 Top Stock Movers',
      performanceScore: '⭐ Performance Score Breakdown',
      overstockedCount: '📦 Overstocked Items',
      deadStockCount: '☠️ Dead Stock Items',
      totalItems: '📋 All Items Overview',
    };
    return titles[kpiType] || 'Details';
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="text-center py-5">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading details...</p>
        </div>
      );
    }

    if (error) {
      return (
        <Alert variant="danger">
          <strong>Error:</strong> {error}
        </Alert>
      );
    }

    switch (kpiType) {
      case 'totalStockValue':
        return renderStockValueDetails();
      case 'averageGP':
        return renderGPDetails();
      case 'topCategory':
        return renderTopCategoriesDetails();
      case 'lowStockCount':
        return renderLowStockDetails();
      case 'topMoversCount':
        return renderTopMoversDetails();
      case 'performanceScore':
        return renderPerformanceDetails();
      case 'overstockedCount':
        return renderOverstockedDetails();
      case 'deadStockCount':
        return renderDeadStockDetails();
      case 'totalItems':
        return renderTotalItemsDetails();
      default:
        return <p className="text-muted">No details available for this metric.</p>;
    }
  };

  const renderStockValueDetails = () => {
    if (!allKpisData?.stock_value_metrics) return null;

    const metrics = allKpisData.stock_value_metrics;
    const periodValues = metrics.period_values || [];

    return (
      <div>
        <Alert variant="info">
          <h6>📊 Current Stock Value</h6>
          <h4 className="mb-0">{formatCurrency(metrics.total_current_value)}</h4>
        </Alert>

        {periodValues.length > 0 && (
          <div className="mt-3">
            <h6>Historical Values</h6>
            <Table striped bordered hover size="sm">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Date</th>
                  <th className="text-end">Stock Value</th>
                </tr>
              </thead>
              <tbody>
                {periodValues.map((period, idx) => (
                  <tr key={idx}>
                    <td>{period.period_name}</td>
                    <td>{new Date(period.date).toLocaleDateString()}</td>
                    <td className="text-end">{formatCurrency(period.value)}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </div>
    );
  };

  const renderGPDetails = () => {
    if (!allKpisData?.profitability_metrics) return null;

    const metrics = allKpisData.profitability_metrics;

    return (
      <div>
        <Alert variant="success">
          <h6>Average Gross Profit</h6>
          <h4 className="mb-0">{metrics.average_gp_percentage?.toFixed(1)}%</h4>
        </Alert>

        <div className="row mt-3">
          <div className="col-6">
            <div className="card bg-light">
              <div className="card-body text-center">
                <small className="text-muted">Highest GP%</small>
                <h5 className="text-success mb-0">
                  {metrics.highest_gp_period?.gp_percentage?.toFixed(1)}%
                </h5>
                <small>{metrics.highest_gp_period?.period_name}</small>
              </div>
            </div>
          </div>
          <div className="col-6">
            <div className="card bg-light">
              <div className="card-body text-center">
                <small className="text-muted">Lowest GP%</small>
                <h5 className="text-danger mb-0">
                  {metrics.lowest_gp_period?.gp_percentage?.toFixed(1)}%
                </h5>
                <small>{metrics.lowest_gp_period?.period_name}</small>
              </div>
            </div>
          </div>
        </div>

        {metrics.average_pour_cost_percentage && (
          <div className="mt-3">
            <p className="mb-1">
              <strong>Average Pour Cost:</strong>{' '}
              {metrics.average_pour_cost_percentage.toFixed(1)}%
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderTopCategoriesDetails = () => {
    if (!allKpisData?.category_performance?.distribution) return null;

    const categories = allKpisData.category_performance.distribution;
    const sortedCategories = [...categories].sort((a, b) => b.total_value - a.total_value);

    return (
      <div>
        <Alert variant="info">
          <h6>Top Category</h6>
          <h5>{allKpisData.category_performance.top_by_value?.category_name}</h5>
          <p className="mb-0">
            {formatCurrency(allKpisData.category_performance.top_by_value?.total_value)}
            {' '}({allKpisData.category_performance.top_by_value?.percentage_of_total?.toFixed(1)}% of total)
          </p>
        </Alert>

        <h6 className="mt-4">All Categories Breakdown</h6>
        <Table striped bordered hover size="sm">
          <thead>
            <tr>
              <th>Category</th>
              <th className="text-end">Total Value</th>
              <th className="text-end">% of Total</th>
              <th className="text-end">Items</th>
            </tr>
          </thead>
          <tbody>
            {sortedCategories.map((cat, idx) => (
              <tr key={idx}>
                <td>
                  <strong>{cat.category_name}</strong>
                  {idx === 0 && <Badge bg="success" className="ms-2">Top</Badge>}
                </td>
                <td className="text-end">{formatCurrency(cat.total_value)}</td>
                <td className="text-end">{cat.percentage_of_total?.toFixed(1)}%</td>
                <td className="text-end">{cat.item_count}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    );
  };

  const renderLowStockDetails = () => {
    if (!detailData || !Array.isArray(detailData)) {
      return <p className="text-muted">No low stock items found.</p>;
    }

    // Low stock is based on category-specific thresholds (bottles, cases, kegs)
    // All items are already filtered by backend based on their category thresholds
    const criticalItems = detailData.filter(item => {
      const current = parseFloat(item.total_stock_in_servings || 0);
      const threshold = parseFloat(item.low_stock_threshold || 0);
      const percentage = threshold > 0 ? (current / threshold) * 100 : 0;
      return percentage < 40; // < 40% of threshold
    });
    const warningItems = detailData.filter(item => {
      const current = parseFloat(item.total_stock_in_servings || 0);
      const threshold = parseFloat(item.low_stock_threshold || 0);
      const percentage = threshold > 0 ? (current / threshold) * 100 : 0;
      return percentage >= 40 && percentage < 70; // 40-70% of threshold
    });
    const cautionItems = detailData.filter(item => {
      const current = parseFloat(item.total_stock_in_servings || 0);
      const threshold = parseFloat(item.low_stock_threshold || 0);
      const percentage = threshold > 0 ? (current / threshold) * 100 : 0;
      return percentage >= 70 && percentage < 100; // 70-100% of threshold
    });

    const allLowStockItems = [...criticalItems, ...warningItems, ...cautionItems];

    if (allLowStockItems.length === 0) {
      return (
        <Alert variant="success">
          <h6>✅ All Items Have Adequate Stock!</h6>
          <p className="mb-0">All items are at or above their category-specific reorder thresholds. No immediate restocking needed.</p>
        </Alert>
      );
    }

    return (
      <div>
        <Alert variant="warning">
          <h6>⚠️ Low Stock Items</h6>
          <p className="mb-1">
            <strong>{allLowStockItems.length} items</strong> below their category reorder thresholds
          </p>
          <div className="row mt-2">
            <div className="col-4">
              <span className="text-danger">🔴 {criticalItems.length} Critical</span>
              <br /><small className="text-muted">&lt;40% of threshold</small>
            </div>
            <div className="col-4">
              <span className="text-warning">🟡 {warningItems.length} Warning</span>
              <br /><small className="text-muted">40-70% of threshold</small>
            </div>
            <div className="col-4">
              <span className="text-info">🔵 {cautionItems.length} Caution</span>
              <br /><small className="text-muted">70-100% of threshold</small>
            </div>
          </div>
        </Alert>

        {criticalItems.length > 0 && (
          <div className="mb-3">
            <h6 className="text-danger">🔴 Critical Stock ({criticalItems.length})</h6>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <Table striped bordered hover size="sm">
                <thead className="sticky-top bg-white">
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th className="text-end">Servings</th>
                    <th className="text-end">Stock %</th>
                  </tr>
                </thead>
                <tbody>
                  {criticalItems.map((item, idx) => {
                    const current = parseFloat(item.total_stock_in_servings || 0);
                    const threshold = parseFloat(item.low_stock_threshold || 0);
                    const percentage = threshold > 0 ? (current / threshold) * 100 : 0;
                    return (
                      <tr key={idx} className="table-danger">
                        <td>{item.name || item.item_name}</td>
                        <td><Badge bg="secondary">{item.category_name || item.category || 'N/A'}</Badge></td>
                        <td className="text-end">{current.toFixed(1)}</td>
                        <td className="text-end text-danger">{percentage.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          </div>
        )}

        {warningItems.length > 0 && (
          <div className="mb-3">
            <h6 className="text-warning">🟡 Warning Stock ({warningItems.length})</h6>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <Table striped bordered hover size="sm">
                <thead className="sticky-top bg-white">
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th className="text-end">Servings</th>
                    <th className="text-end">Stock %</th>
                  </tr>
                </thead>
                <tbody>
                  {warningItems.map((item, idx) => {
                    const current = parseFloat(item.total_stock_in_servings || 0);
                    const threshold = parseFloat(item.low_stock_threshold || 0);
                    const percentage = threshold > 0 ? (current / threshold) * 100 : 0;
                    return (
                      <tr key={idx} className="table-warning">
                        <td>{item.name || item.item_name}</td>
                        <td><Badge bg="secondary">{item.category_name || item.category || 'N/A'}</Badge></td>
                        <td className="text-end">{current.toFixed(1)}</td>
                        <td className="text-end text-warning">{percentage.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          </div>
        )}

        {cautionItems.length > 0 && (
          <div className="mb-3">
            <h6 className="text-info">🔵 Caution Stock ({cautionItems.length})</h6>
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              <Table striped bordered hover size="sm">
                <thead className="sticky-top bg-white">
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th className="text-end">Servings</th>
                    <th className="text-end">Stock %</th>
                  </tr>
                </thead>
                <tbody>
                  {cautionItems.map((item, idx) => {
                    const current = parseFloat(item.total_stock_in_servings || 0);
                    const threshold = parseFloat(item.low_stock_threshold || 0);
                    const percentage = threshold > 0 ? (current / threshold) * 100 : 0;
                    return (
                      <tr key={idx} className="table-info">
                        <td>{item.name || item.item_name}</td>
                        <td><Badge bg="secondary">{item.category_name || item.category || 'N/A'}</Badge></td>
                        <td className="text-end">{current.toFixed(1)}</td>
                        <td className="text-end text-info">{percentage.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          </div>
        )}

        <div className="mt-4">
          <Alert variant="info">
            <h6>ℹ️ About Low Stock Tracking</h6>
            <p className="mb-0">
              Low stock items are identified using category-specific reorder thresholds (bottles, cases, kegs, etc.):
              <br />• <strong className="text-danger">Critical</strong>: Below 40% of reorder threshold
              <br />• <strong className="text-warning">Warning</strong>: 40-70% of reorder threshold
              <br />• <strong className="text-info">Caution</strong>: 70-100% of reorder threshold
              <br /><br />
              <small>Thresholds vary by category: Spirits (2 bottles), Wine (10 bottles), Draught (2 kegs), etc.</small>
            </p>
          </Alert>
        </div>
      </div>
    );
  };

  const renderTopMoversDetails = () => {
    // Try to get movers from multiple possible sources
    let moversData = null;
    
    console.log('=== Rendering Top Movers ===');
    console.log('detailData:', detailData);
    console.log('detailData keys:', detailData ? Object.keys(detailData) : 'null');
    console.log('allKpisData.period_comparison:', allKpisData?.period_comparison);
    console.log('period_comparison keys:', allKpisData?.period_comparison ? Object.keys(allKpisData.period_comparison) : 'null');
    
    // Source 1: From detailData.movers (direct API call structure)
    if (detailData?.movers) {
      console.log('✅ Source: detailData.movers');
      moversData = detailData.movers;
    }
    // Source 2: From detailData.top_movers (KPI response structure)
    else if (detailData?.top_movers) {
      console.log('✅ Source: detailData.top_movers');
      moversData = detailData.top_movers;
    }
    // Source 3: From allKpisData period_comparison.top_movers
    else if (allKpisData?.period_comparison?.top_movers) {
      console.log('✅ Source: allKpisData.period_comparison.top_movers');
      moversData = allKpisData.period_comparison.top_movers;
    }
    // Source 4: Check if detailData has biggest_increases/biggest_decreases (period_comparison structure)
    else if (detailData && (detailData.biggest_increases || detailData.biggest_decreases)) {
      console.log('✅ Source: detailData (period_comparison with biggest_increases/biggest_decreases)');
      moversData = {
        increases: detailData.biggest_increases || [],
        decreases: detailData.biggest_decreases || []
      };
    }
    // Source 5: Check if detailData itself is the movers object with increases/decreases
    else if (detailData && (detailData.increases || detailData.decreases)) {
      console.log('✅ Source: detailData (direct object with increases/decreases)');
      moversData = detailData;
    }
    // Source 6: Check if detailData.movers_data exists
    else if (detailData?.movers_data) {
      console.log('✅ Source: detailData.movers_data');
      moversData = detailData.movers_data;
    }
    // Source 7: Check if it's the period_comparison object itself with items
    else if (detailData && detailData.total_movers_count !== undefined) {
      console.log('✅ Source: detailData is period_comparison object - checking for item arrays');
      // The backend might return different property names
      const possibleKeys = ['items', 'movers', 'top_items', 'changes'];
      for (const key of possibleKeys) {
        if (detailData[key] && Array.isArray(detailData[key])) {
          console.log(`Found items in detailData.${key}`);
          const items = detailData[key];
          const increases = items.filter(item => (item.percentage_change || item.change_percentage || 0) > 0);
          const decreases = items.filter(item => (item.percentage_change || item.change_percentage || 0) < 0);
          moversData = { increases, decreases };
          break;
        }
      }
    }
    // Source 7: Check if detailData is an array
    else if (detailData && Array.isArray(detailData)) {
      console.log('✅ Source: detailData (array - grouping)');
      const increases = detailData.filter(item => (item.percentage_change || item.change_percentage || 0) > 0);
      const decreases = detailData.filter(item => (item.percentage_change || item.change_percentage || 0) < 0);
      moversData = { increases, decreases };
    }

    console.log('Final moversData:', moversData);

    if (!moversData) {
      return (
        <Alert variant="warning">
          <h6>⚠️ No Top Movers Data</h6>
          <p className="mb-0">Top movers are calculated when comparing periods. The system tracks items with stock level changes greater than 10%.</p>
          <hr />
          <small className="text-muted">
            <strong>Debug Info:</strong><br/>
            - Period Comparison Available: {allKpisData?.period_comparison ? 'Yes' : 'No'}<br/>
            - Detail Data Type: {detailData ? typeof detailData : 'null'}<br/>
            - Detail Data Keys: {detailData ? Object.keys(detailData).join(', ') : 'none'}<br/>
            - Has total_movers_count: {detailData?.total_movers_count ? 'Yes (' + detailData.total_movers_count + ')' : 'No'}
          </small>
        </Alert>
      );
    }

    const increases = moversData.increases || [];
    const decreases = moversData.decreases || [];
    const totalMovers = increases.length + decreases.length;

    // Get period comparison info if available
    const periodsCompared = detailData?.periods_compared || allKpisData?.period_comparison?.periods_compared;
    const thresholdPercentage = detailData?.threshold_percentage || allKpisData?.period_comparison?.threshold_percentage || 10;

    return (
      <div>
        <Alert variant="success">
          <h6>📊 Stock Level Changes</h6>
          <p className="mb-1">
            <strong>{totalMovers} items</strong> had significant stock level changes (&gt;{thresholdPercentage}%)
          </p>
          {periodsCompared && (
            <small className="text-muted d-block mb-2">
              Comparing: <strong>{periodsCompared.period1_name}</strong> vs <strong>{periodsCompared.period2_name}</strong>
            </small>
          )}
          <div className="row mt-2">
            <div className="col-6 text-center">
              <span className="text-success">📈 {increases.length} Increases</span>
            </div>
            <div className="col-6 text-center">
              <span className="text-danger">📉 {decreases.length} Decreases</span>
            </div>
          </div>
        </Alert>

        <Tabs defaultActiveKey="increases" className="mb-3">
          <Tab eventKey="increases" title={`📈 Increases (${increases.length})`}>
          {increases.length > 0 ? (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <Table striped bordered hover size="sm">
                <thead className="sticky-top bg-white">
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th className="text-end">Change</th>
                    <th className="text-end">% Change</th>
                  </tr>
                </thead>
                <tbody>
                  {increases.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.item_name || item.name}</td>
                      <td><Badge bg="secondary">{item.category || 'N/A'}</Badge></td>
                      <td className="text-end text-success">
                        +{formatCurrency(Math.abs(item.value_change || 0))}
                      </td>
                      <td className="text-end text-success">
                        +{Math.abs(item.percentage_change || 0).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <p className="text-muted text-center py-3">No increases found.</p>
          )}
        </Tab>

        <Tab eventKey="decreases" title={`📉 Decreases (${decreases.length})`}>
          {decreases.length > 0 ? (
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <Table striped bordered hover size="sm">
                <thead className="sticky-top bg-white">
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th className="text-end">Change</th>
                    <th className="text-end">% Change</th>
                  </tr>
                </thead>
                <tbody>
                  {decreases.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.item_name || item.name}</td>
                      <td><Badge bg="secondary">{item.category || 'N/A'}</Badge></td>
                      <td className="text-end text-danger">
                        {formatCurrency(item.value_change || 0)}
                      </td>
                      <td className="text-end text-danger">
                        {(item.percentage_change || 0).toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          ) : (
            <p className="text-muted text-center py-3">No decreases found.</p>
          )}
        </Tab>
      </Tabs>
      </div>
    );
  };

  const renderPerformanceDetails = () => {
    if (!allKpisData?.performance_score) return null;

    const score = allKpisData.performance_score;
    const breakdown = score.breakdown || {};

    return (
      <div>
        <Alert variant="info">
          <h6>Overall Performance Score</h6>
          <h2 className="mb-0">
            {score.overall_score}/100{' '}
            <Badge bg={score.rating === 'EXCELLENT' ? 'success' : score.rating === 'GOOD' ? 'info' : 'warning'}>
              {score.rating}
            </Badge>
          </h2>
        </Alert>

        <h6 className="mt-4">Score Breakdown</h6>
        <Table striped bordered size="sm">
          <tbody>
            <tr>
              <td>Profitability Score</td>
              <td className="text-end"><strong>{breakdown.profitability_score || 0}/20</strong></td>
            </tr>
            <tr>
              <td>Inventory Health Score</td>
              <td className="text-end"><strong>{breakdown.inventory_health_score || 0}/20</strong></td>
            </tr>
            <tr>
              <td>Stock Turnover Score</td>
              <td className="text-end"><strong>{breakdown.stock_turnover_score || 0}/20</strong></td>
            </tr>
            <tr>
              <td>Category Distribution Score</td>
              <td className="text-end"><strong>{breakdown.category_distribution_score || 0}/20</strong></td>
            </tr>
            <tr>
              <td>Variance Management Score</td>
              <td className="text-end"><strong>{breakdown.variance_management_score || 0}/20</strong></td>
            </tr>
          </tbody>
        </Table>

        {score.strengths && score.strengths.length > 0 && (
          <div className="mt-3">
            <h6 className="text-success">✅ Strengths</h6>
            <ul>
              {score.strengths.map((strength, idx) => (
                <li key={idx}>{strength}</li>
              ))}
            </ul>
          </div>
        )}

        {score.improvement_areas && score.improvement_areas.length > 0 && (
          <div className="mt-3">
            <h6 className="text-warning">⚠️ Areas for Improvement</h6>
            <ul>
              {score.improvement_areas.map((area, idx) => (
                <li key={idx}>{area}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  };

  const renderOverstockedDetails = () => {
    if (!allKpisData?.inventory_health?.overstocked_items) {
      return <p className="text-muted">No overstocked items data available.</p>;
    }

    const items = allKpisData.inventory_health.overstocked_items;

    return (
      <div>
        <Alert variant="info">
          <strong>{items.length} items</strong> are above their par levels
        </Alert>

        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <Table striped bordered hover size="sm">
            <thead className="sticky-top bg-white">
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th className="text-end">Current</th>
                <th className="text-end">Par Level</th>
                <th className="text-end">Excess</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.name}</td>
                  <td><Badge bg="secondary">{item.category}</Badge></td>
                  <td className="text-end">{item.current_quantity}</td>
                  <td className="text-end">{item.par_level}</td>
                  <td className="text-end text-warning">
                    +{item.current_quantity - item.par_level}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </div>
    );
  };

  const renderDeadStockDetails = () => {
    if (!allKpisData?.inventory_health?.dead_stock_items) {
      return <p className="text-muted">No dead stock items data available.</p>;
    }

    const items = allKpisData.inventory_health.dead_stock_items;

    return (
      <div>
        <Alert variant="danger">
          <strong>{items.length} items</strong> have had no movement across periods
        </Alert>

        <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
          <Table striped bordered hover size="sm">
            <thead className="sticky-top bg-white">
              <tr>
                <th>Item</th>
                <th>Category</th>
                <th className="text-end">Current Stock</th>
                <th className="text-end">Value</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx}>
                  <td>{item.name}</td>
                  <td><Badge bg="secondary">{item.category}</Badge></td>
                  <td className="text-end">{item.current_quantity}</td>
                  <td className="text-end">{formatCurrency(item.total_value)}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </div>
    );
  };

  const renderTotalItemsDetails = () => {
    if (!allKpisData?.category_performance?.distribution) return null;

    const categories = allKpisData.category_performance.distribution;
    const totalItems = allKpisData.additional_metrics?.total_items_count || 0;
    const activeItems = allKpisData.additional_metrics?.active_items_count || 0;

    return (
      <div>
        <Alert variant="primary">
          <div className="row">
            <div className="col-6 text-center">
              <h6>Total Items</h6>
              <h3 className="mb-0">{totalItems}</h3>
            </div>
            <div className="col-6 text-center">
              <h6>Active Items</h6>
              <h3 className="mb-0">{activeItems}</h3>
            </div>
          </div>
        </Alert>

        <h6 className="mt-4">Items by Category</h6>
        <Table striped bordered hover size="sm">
          <thead>
            <tr>
              <th>Category</th>
              <th className="text-end">Item Count</th>
              <th className="text-end">Total Value</th>
              <th className="text-end">% of Total</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat, idx) => (
              <tr key={idx}>
                <td><strong>{cat.category_name}</strong></td>
                <td className="text-end">{cat.item_count}</td>
                <td className="text-end">{formatCurrency(cat.total_value)}</td>
                <td className="text-end">{cat.percentage_of_total?.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>
    );
  };

  return (
    <Modal show={show} onHide={onClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>{renderModalTitle()}</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {renderContent()}
      </Modal.Body>
      <Modal.Footer>
        <button className="btn btn-secondary" onClick={onClose}>
          Close
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default StockKpiDetailModal;

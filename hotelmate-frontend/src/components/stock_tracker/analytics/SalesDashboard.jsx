// src/components/stock_tracker/analytics/SalesDashboard.jsx
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Badge, Spinner, Alert, Form, Table } from 'react-bootstrap';
import { FaCocktail, FaBoxes, FaChartPie } from 'react-icons/fa';
import { getSalesAnalysis } from '@/services/salesAnalytics';

/**
 * SalesDashboard Component
 * 
 * Displays combined sales analysis (Stock Items + Cocktails)
 * Based on COMPLETE_SALES_ANALYSIS_API_GUIDE.md
 * 
 * @param {string} hotelSlug - Hotel identifier
 * @param {number} periodId - Period ID to analyze
 * @param {number} height - Optional chart height (default: 400)
 */
const SalesDashboard = ({ hotelSlug, periodId, height = 400 }) => {
  const [salesData, setSalesData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [includeCocktails, setIncludeCocktails] = useState(true);

  useEffect(() => {
    fetchSalesAnalysis();
  }, [hotelSlug, periodId, includeCocktails]);

  const fetchSalesAnalysis = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🌐 Fetching Sales Analysis (Standalone Sales by Date)...');
      console.log('  Hotel:', hotelSlug);
      console.log('  Period ID:', periodId);
      console.log('  Include Cocktails:', includeCocktails);
      console.log('  Primary URL:', `stock_tracker/${hotelSlug}/periods/${periodId}/sales-analysis/`);
      console.log('  Fallback URL (if needed):', `stock_tracker/${hotelSlug}/sales/?start_date=X&end_date=Y`);
      console.log('  Note: Backend has working date filter - ensure sales-analysis uses it');
      
      const data = await getSalesAnalysis(hotelSlug, periodId, {
        includeCocktails,
        includeCategoryBreakdown: true
      });
      setSalesData(data);
      
      // === TOP ANALYTICS LOGGING - SALES ONLY (NOT STOCKTAKE) ===
      console.log('\n' + '='.repeat(80));
      console.log('💰 TOP ANALYTICS: SALES DASHBOARD (SEPARATE FROM STOCKTAKE)');
      console.log('='.repeat(80));
      console.log('📅 Period:', data.period_name);
      console.log('📆 Date Range:', data.period_start, 'to', data.period_end);
      console.log('🔒 Status:', data.period_is_closed ? 'CLOSED' : 'OPEN');
      console.log('⚠️  NOTE: Sales are tracked separately from stocktake inventory');
      
      // Log raw data for debugging
      console.log('\n🔍 RAW API RESPONSE:');
      console.log('Full data object:', JSON.stringify(data, null, 2));
      
      // Check for data inconsistencies
      console.log('\n🔎 DATA VALIDATION:');
      console.log('  - Has general_sales?', !!data.general_sales);
      console.log('  - Has cocktail_sales?', !!data.cocktail_sales);
      console.log('  - Has combined_sales?', !!data.combined_sales);
      console.log('  - Has category_breakdown?', !!data.category_breakdown);
      console.log('  - Category breakdown length:', data.category_breakdown?.length || 0);
      console.log('  - Period is closed?', data.period_is_closed);
      
      console.log('\n💰 === GENERAL SALES (Stock Items) ===');
      if (data.general_sales) {
        console.log('  Revenue:', '€' + data.general_sales.revenue?.toFixed(2));
        console.log('  Cost:', '€' + data.general_sales.cost?.toFixed(2));
        console.log('  Profit:', '€' + data.general_sales.profit?.toFixed(2));
        console.log('  GP%:', data.general_sales.gp_percentage?.toFixed(2) + '%');
        console.log('  Count:', data.general_sales.count, 'items sold');
      }
      
      if (includeCocktails && data.cocktail_sales) {
        console.log('\n🍹 === COCKTAIL SALES ===');
        console.log('  Revenue:', '€' + data.cocktail_sales.revenue?.toFixed(2));
        console.log('  Cost:', '€' + data.cocktail_sales.cost?.toFixed(2));
        console.log('  Profit:', '€' + data.cocktail_sales.profit?.toFixed(2));
        console.log('  GP%:', data.cocktail_sales.gp_percentage?.toFixed(2) + '%');
        console.log('  Count:', data.cocktail_sales.count, 'cocktails sold');
      }
      
      if (data.combined_sales) {
        console.log('\n📊 === COMBINED TOTALS (Stock + Cocktails) ===');
        console.log('  Total Revenue:', '€' + data.combined_sales.total_revenue?.toFixed(2));
        console.log('  Total Cost:', '€' + data.combined_sales.total_cost?.toFixed(2));
        console.log('  Total Profit:', '€' + data.combined_sales.profit?.toFixed(2));
        console.log('  Combined GP%:', data.combined_sales.gp_percentage?.toFixed(2) + '%');
        console.log('  Total Items Sold:', data.combined_sales.total_count);
        
        // Warning for no sales data
        if (data.combined_sales.total_revenue === 0 && data.combined_sales.total_count === 0) {
          console.warn('\n⚠️ WARNING: No sales data found for this period!');
          console.warn('');
          console.warn('🔍 DIAGNOSTIC INFORMATION:');
          console.warn(`  Period: ${data.period_name} (ID: ${data.period_id})`);
          console.warn(`  Date Range: ${data.period_start} to ${data.period_end}`);
          console.warn(`  Period Status: ${data.period_is_closed ? 'CLOSED' : 'OPEN'}`);
          console.warn('');
          console.warn('💡 POSSIBLE REASONS:');
          console.warn('  1. No sales exist within this period\'s date range');
          console.warn('  2. Sales exist but have dates outside the period range');
          console.warn('  3. Backend sales-analysis endpoint is not querying by date correctly');
          console.warn('  4. Backend might be filtering by stocktake instead of date range');
          console.warn('  5. Sale dates might be in different format/timezone');
          console.warn('');
          console.warn('🔧 TROUBLESHOOTING STEPS:');
          console.warn('  1. Check Django Admin: Do sales from Sept 11, 2025 fall within period dates?');
          console.warn('  2. Check backend logs for SQL queries from sales-analysis endpoint');
          console.warn('  3. Verify backend is using date range filtering (NOT stocktake relationship)');
          console.warn('  4. Check if sale_date field matches period start/end dates');
          console.warn('  5. Ensure backend uses: sale_date__gte AND sale_date__lte');
          console.warn('');
          console.warn('📊 REQUIRED BACKEND IMPLEMENTATION (Sales are standalone):');
          console.warn('');
          console.warn('  Backend sales-analysis endpoint MUST query by date range:');
          console.warn(`  Sale.objects.filter(`);
          console.warn(`    sale_date__gte='${data.period_start}',`);
          console.warn(`    sale_date__lte='${data.period_end}'`);
          console.warn(`  ).aggregate(`);
          console.warn(`    revenue=Sum('total_revenue'),`);
          console.warn(`    cost=Sum('total_cost'),`);
          console.warn(`    count=Count('id')`);
          console.warn(`  )`);
          console.warn('');
          console.warn('🔧 BACKEND FIX NEEDED:');
          console.warn('  The sales-analysis endpoint is returning zeros because:');
          console.warn('  ❌ It may be querying by stocktake (which has NO linked sales)');
          console.warn('  ✅ It needs to query by DATE RANGE instead');
          console.warn('');
          console.warn('📊 KNOWN DATA FROM BACKEND CHECK:');
          console.warn('  - Database has 17 standalone sales on Sept 11, 2025');
          console.warn('  - Total Revenue: €67,308.75');
          console.warn('  - Total Cost: €23,510.05');
          console.warn('  - Gross Profit: €43,798.70 (GP: 65.07%)');
          console.warn(`  - Sept 11 IS within this period (${data.period_start} to ${data.period_end})`);
          console.warn('  - These sales are NOT linked to any stocktake');
          console.warn('  - Backend script confirms: "No sales linked to stocktake periods"');
          console.warn('');
          console.warn('📝 BACKEND DEVELOPER ACTION REQUIRED:');
          console.warn(`  Fix /stock_tracker/<hotel_identifier>/periods/${data.period_id}/sales-analysis/ endpoint:`);
          console.warn('');
          console.warn('  ISSUE: Endpoint exists but returns zeros');
          console.warn('  REASON: Likely filtering by stocktake instead of date range');
          console.warn('');
          console.warn('  ✅ GOOD NEWS: SaleViewSet already has date filtering working!');
          console.warn(`     GET /api/stock_tracker/<hotel_identifier>/sales/?start_date=${data.period_start}&end_date=${data.period_end}`);
          console.warn('     Returns: Filtered sales by sale_date__gte and sale_date__lte');
          console.warn('');
          console.warn('  🔧 FIX: Update sales-analysis endpoint to use the SAME logic:');
          console.warn(`     period = StockPeriod.objects.get(id=${data.period_id})`);
          console.warn(`     sales = Sale.objects.filter(`);
          console.warn(`       sale_date__gte=period.start_date,  # ${data.period_start}`);
          console.warn(`       sale_date__lte=period.end_date     # ${data.period_end}`);
          console.warn(`     )`);
          console.warn('');
          console.warn('  📊 Expected Result for this period:');
          console.warn('     - 17 sales from Sept 11, 2025');
          console.warn('     - Total Revenue: €67,308.75');
          console.warn('     - Total Cost: €23,510.05');
          console.warn('     - GP: 65.07%');
          console.warn('');
          console.warn('  💡 REFERENCE: Check SaleViewSet.get_queryset() for working implementation');
        }
      }
      
      if (data.breakdown_percentages) {
        console.log('\n📈 === BREAKDOWN PERCENTAGES ===');
        console.log('  Stock Revenue %:', (data.breakdown_percentages.stock_revenue_percentage ?? 0).toFixed(2) + '%');
        console.log('  Cocktail Revenue %:', (data.breakdown_percentages.cocktail_revenue_percentage ?? 0).toFixed(2) + '%');
        console.log('  Stock Cost %:', (data.breakdown_percentages.stock_cost_percentage ?? 0).toFixed(2) + '%');
        console.log('  Cocktail Cost %:', (data.breakdown_percentages.cocktail_cost_percentage ?? 0).toFixed(2) + '%');
      }
      
      if (data.category_breakdown && data.category_breakdown.length > 0) {
        console.log('\n📦 === CATEGORY BREAKDOWN ===');
        data.category_breakdown.forEach(category => {
          console.log(`  ${category.category_code} - ${category.category_name}:`);
          console.log(`    Revenue: €${category.revenue?.toFixed(2)}, Cost: €${category.cost?.toFixed(2)}`);
          console.log(`    Profit: €${category.profit?.toFixed(2)}, GP: ${category.gp_percentage?.toFixed(2)}%`);
          console.log(`    Count: ${category.count} items`);
        });
      }
      
      console.log('\n' + '='.repeat(80));
      console.log('END SALES DASHBOARD ANALYTICS (SEPARATE FROM STOCKTAKE)');
      console.log('='.repeat(80) + '\n');
      
    } catch (err) {
      console.error('❌ Failed to fetch sales analysis:', err);
      setError(err.response?.data?.detail || 'Failed to fetch sales analysis');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-IE', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 2
    }).format(value || 0);
  };

  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(2)}%`;
  };

  if (loading) {
    return (
      <Card className="text-center p-4">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2 text-muted">Loading sales data...</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error Loading Sales Analysis</Alert.Heading>
        {error}
      </Alert>
    );
  }

  if (!salesData) {
    return (
      <Alert variant="info">No sales data available for this period</Alert>
    );
  }

  return (
    <div className="sales-dashboard">
      {/* Header with Period Info and Toggle */}
      <Card className="mb-3">
        <Card.Body>
          <Row className="align-items-center">
            <Col md={8}>
              <h4 className="mb-1">
                <FaChartPie className="me-2" />
                Sales Analysis - {salesData.period_name}
              </h4>
              <p className="text-muted mb-0 small">
                <strong>Sales Date Range:</strong> {new Date(salesData.period_start).toLocaleDateString()} - {new Date(salesData.period_end).toLocaleDateString()}
                <Badge bg="info" className="ms-2">DATE-BASED FILTER</Badge>
                {salesData.period_is_closed && <Badge bg="success" className="ms-2">Period Closed</Badge>}
              </p>
            </Col>
            <Col md={4} className="text-end">
              <Form.Check
                type="switch"
                id="include-cocktails-switch"
                label="Include Cocktails"
                checked={includeCocktails}
                onChange={(e) => setIncludeCocktails(e.target.checked)}
                className="d-inline-block"
              />
            </Col>
          </Row>
        </Card.Body>
      </Card>

      {/* Combined Totals */}
      <Row className="mb-4">
        <Col md={3}>
          <Card className="h-100 border-primary stock-items">
            <Card.Body>
              <div className="d-flex align-items-center mb-2">
                <FaBoxes className="me-2 text-primary" />
                <h6 className="mb-0 text-muted">Total Revenue</h6>
              </div>
              <h3 className="mb-1 text-primary">
                {formatCurrency(salesData.combined_sales.total_revenue)}
              </h3>
              <small className="text-muted">Combined Total</small>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="h-100 border-danger">
            <Card.Body>
              <h6 className="mb-2 text-muted">Total Cost</h6>
              <h3 className="mb-1 text-danger">
                {formatCurrency(salesData.combined_sales.total_cost)}
              </h3>
              <small className="text-muted">COGS</small>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="h-100 border-success">
            <Card.Body>
              <h6 className="mb-2 text-muted">Gross Profit</h6>
              <h3 className="mb-1 text-success">
                {formatCurrency(salesData.combined_sales.profit)}
              </h3>
              <Badge bg="success">
                {formatPercentage(salesData.combined_sales.gp_percentage)} GP
              </Badge>
            </Card.Body>
          </Card>
        </Col>

        <Col md={3}>
          <Card className="h-100 border-info">
            <Card.Body>
              <h6 className="mb-2 text-muted">Items Sold</h6>
              <h3 className="mb-1 text-info">
                {salesData.combined_sales.total_count}
              </h3>
              <small className="text-muted">Total units</small>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Revenue Breakdown */}
      <Card className="mb-4">
        <Card.Header className="bg-light">
          <h5 className="mb-0">Revenue Breakdown</h5>
        </Card.Header>
        <Card.Body>
          <div className="breakdown-bar mb-3" style={{ height: '40px', display: 'flex', borderRadius: '8px', overflow: 'hidden' }}>
            <div 
              className="stock-segment"
              style={{
                width: `${salesData.breakdown_percentages.stock_revenue_percentage}%`,
                backgroundColor: '#4ECDC4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '0.9rem'
              }}
            >
              Stock Items: {formatPercentage(salesData.breakdown_percentages.stock_revenue_percentage)}
            </div>
            {includeCocktails && (
              <div 
                className="cocktail-segment"
                style={{
                  width: `${salesData.breakdown_percentages.cocktail_revenue_percentage}%`,
                  backgroundColor: '#FF6B6B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 'bold',
                  fontSize: '0.9rem'
                }}
              >
                Cocktails: {formatPercentage(salesData.breakdown_percentages.cocktail_revenue_percentage)}
              </div>
            )}
          </div>

          <Row className="mt-3">
            <Col md={6}>
              <Card className="border-0 bg-light stock-items">
                <Card.Body>
                  <h6 className="text-muted mb-2">
                    <FaBoxes className="me-2" />
                    Stock Item Sales
                  </h6>
                  <p className="mb-1">Revenue: <strong>{formatCurrency(salesData.general_sales.revenue)}</strong></p>
                  <p className="mb-1">Cost: <strong>{formatCurrency(salesData.general_sales.cost)}</strong></p>
                  <p className="mb-1">Profit: <strong className="text-success">{formatCurrency(salesData.general_sales.profit)}</strong></p>
                  <p className="mb-1">GP: <Badge bg="success">{formatPercentage(salesData.general_sales.gp_percentage)}</Badge></p>
                  <p className="mb-0">Count: <strong>{salesData.general_sales.count}</strong></p>
                </Card.Body>
              </Card>
            </Col>

            {includeCocktails && (
              <Col md={6}>
                <Card className="border-0 bg-light cocktails">
                  <Card.Body>
                    <h6 className="text-muted mb-2">
                      <FaCocktail className="me-2" />
                      Cocktail Sales
                      <Badge bg="warning" text="dark" className="ms-2">Separate Tracking</Badge>
                    </h6>
                    <p className="mb-1">Revenue: <strong>{formatCurrency(salesData.cocktail_sales.revenue)}</strong></p>
                    <p className="mb-1">Cost: <strong>{formatCurrency(salesData.cocktail_sales.cost)}</strong></p>
                    <p className="mb-1">Profit: <strong className="text-success">{formatCurrency(salesData.cocktail_sales.profit)}</strong></p>
                    <p className="mb-1">GP: <Badge bg="success">{formatPercentage(salesData.cocktail_sales.gp_percentage)}</Badge></p>
                    <p className="mb-0">Count: <strong>{salesData.cocktail_sales.count}</strong></p>
                  </Card.Body>
                </Card>
              </Col>
            )}
          </Row>
        </Card.Body>
      </Card>

      {/* Category Performance Table */}
      {salesData.category_breakdown && salesData.category_breakdown.length > 0 && (
        <Card>
          <Card.Header className="bg-light">
            <h5 className="mb-0">Category Performance</h5>
          </Card.Header>
          <Card.Body className="p-0">
            <Table responsive hover className="mb-0">
              <thead className="table-light">
                <tr>
                  <th>Category</th>
                  <th className="text-end">Revenue</th>
                  <th className="text-end">Cost</th>
                  <th className="text-end">Profit</th>
                  <th className="text-end">GP%</th>
                  <th className="text-end">Count</th>
                </tr>
              </thead>
              <tbody>
                {salesData.category_breakdown.map((cat, index) => (
                  <tr 
                    key={cat.category_code}
                    className={cat.category_code === 'COCKTAILS' ? 'table-warning' : ''}
                  >
                    <td>
                      <strong>{cat.category_name}</strong>
                      <Badge 
                        bg={cat.category_code === 'COCKTAILS' ? 'warning' : 'secondary'} 
                        text={cat.category_code === 'COCKTAILS' ? 'dark' : 'light'}
                        className="ms-2"
                      >
                        {cat.category_code}
                      </Badge>
                    </td>
                    <td className="text-end">{formatCurrency(cat.revenue)}</td>
                    <td className="text-end">{formatCurrency(cat.cost)}</td>
                    <td className="text-end text-success">
                      <strong>{formatCurrency(cat.profit)}</strong>
                    </td>
                    <td className="text-end">
                      <Badge bg="success">{formatPercentage(cat.gp_percentage)}</Badge>
                    </td>
                    <td className="text-end">{cat.count}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Card.Body>
        </Card>
      )}

      {/* Info Note */}
      <Alert variant="info" className="mt-3 mb-0">
        <strong>💡 Note:</strong> Cocktails are tracked separately from stock inventory. 
        This combined view is for reporting and analysis only. Stocktake calculations use stock items only.
      </Alert>

      {/* Styling */}
      <style jsx>{`
        .stock-items {
          border-left: 4px solid #4ECDC4 !important;
        }
        .cocktails {
          border-left: 4px solid #FF6B6B !important;
        }
        .breakdown-bar {
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
      `}</style>
    </div>
  );
};

export default SalesDashboard;

// src/pages/stock_tracker/Analytics.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Alert } from 'react-bootstrap';
import { 
  FaChartLine, 
  FaArrowLeft, 
  FaCog, 
  FaDownload, 
  FaTimes
} from 'react-icons/fa';
import { useMediaQuery } from 'react-responsive';

// Import Analytics Components
import AnalyticsFilters from '@/components/stock_tracker/analytics/AnalyticsFilters';
import CategoryComparisonChart from '@/components/stock_tracker/analytics/CategoryComparisonChart';
import TopMoversChart from '@/components/stock_tracker/analytics/TopMoversChart';
import WaterfallCostChart from '@/components/stock_tracker/analytics/WaterfallCostChart';
import ItemTrendsChart from '@/components/stock_tracker/analytics/ItemTrendsChart';
import VarianceHeatmapChart from '@/components/stock_tracker/analytics/VarianceHeatmapChart';
import PerformanceRadarChart from '@/components/stock_tracker/analytics/PerformanceRadarChart';
// Legacy/Supporting Charts
import KPISummaryCards from '@/components/stock_tracker/analytics/KPISummaryCards';
import ProfitabilityChart from '@/components/stock_tracker/analytics/ProfitabilityChart';
import CategoryBreakdownChart from '@/components/stock_tracker/analytics/CategoryBreakdownChart';
import CategoryComparisonSideBySide from '@/components/stock_tracker/analytics/CategoryComparisonSideBySide';
import CategoryComparisonTable from '@/components/stock_tracker/analytics/CategoryComparisonTable';
import StockValueTrendsChart from '@/components/stock_tracker/analytics/StockValueTrendsChart';
import LowStockChart from '@/components/stock_tracker/analytics/LowStockChart';

export default function Analytics() {
  const { hotel_slug } = useParams();
  const navigate = useNavigate();
  const isMobile = useMediaQuery({ maxWidth: 768 });

  // Filter states
  const [selectedPeriods, setSelectedPeriods] = useState([]);
  const [period1, setPeriod1] = useState(null);
  const [period2, setPeriod2] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Visibility state for analytics sections
  const [visibleSections, setVisibleSections] = useState({
    categoryComparison: false,
    topMovers: false,
    waterfallCost: false,
    itemTrends: false,
    varianceHeatmap: false,
    performanceRadar: false,
    stockValueTrends: false,
    lowStock: false,
    profitability: false,
    categoryBreakdown: false,
    categoryComparisonSideBySide: false,
    categoryComparisonTable: false
  });

  // Track order of opened sections (newest first)
  const [sectionOrder, setSectionOrder] = useState([]);

  // Toggle section visibility
  const toggleSection = (section) => {
    const isCurrentlyVisible = visibleSections[section];
    
    setVisibleSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));

    // Update section order - add to top if opening, remove if closing
    if (!isCurrentlyVisible) {
      // Opening: add to the beginning (top)
      setSectionOrder(prev => [section, ...prev.filter(s => s !== section)]);
    } else {
      // Closing: remove from order
      setSectionOrder(prev => prev.filter(s => s !== section));
    }
  };

  // Close a specific section
  const closeSection = (section) => {
    setVisibleSections(prev => ({
      ...prev,
      [section]: false
    }));
    // Remove from order
    setSectionOrder(prev => prev.filter(s => s !== section));
  };

  // Refresh handler
  const handleRefresh = () => {
    setLoading(true);
    setLastUpdated(new Date());
    // Trigger re-render of all charts by updating a key or timestamp
    setTimeout(() => {
      setLoading(false);
    }, 500);
  };

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      handleRefresh();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  // Format last updated time
  const formatLastUpdated = () => {
    const now = new Date();
    const diff = Math.floor((now - lastUpdated) / 1000 / 60); // minutes
    
    if (diff < 1) return 'Just now';
    if (diff === 1) return '1 minute ago';
    if (diff < 60) return `${diff} minutes ago`;
    
    const hours = Math.floor(diff / 60);
    if (hours === 1) return '1 hour ago';
    return `${hours} hours ago`;
  };

  // Get chart height based on screen size
  const chartHeight = isMobile ? 300 : 400;

  return (
    <Container fluid className="mt-4 pb-5">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center gap-3">
          <Button 
            variant="outline-secondary"
            size={isMobile ? 'sm' : 'md'}
            onClick={() => navigate(`/stock_tracker/${hotel_slug}`)}
          >
            <FaArrowLeft className="me-2" />
            {!isMobile && 'Back'}
          </Button>
          <h2 className="mb-0">
            <FaChartLine className="me-2" />
            Analytics Dashboard
          </h2>
        </div>
        
        <div className="d-flex gap-2">
          <Button 
            variant="outline-secondary"
            size="sm"
            onClick={() => {/* TODO: Export functionality */}}
          >
            <FaDownload className="me-1" />
            {!isMobile && 'Export'}
          </Button>
          <Button 
            variant="outline-primary"
            size="sm"
            onClick={() => {/* TODO: Chart settings modal */}}
          >
            <FaCog />
          </Button>
        </div>
      </div>

      {/* Info Alert */}
      <Alert variant="info" className="mb-4">
        <strong>New Analytics Dashboard:</strong> Compare multiple periods, analyze trends, and track performance with interactive charts. 
        Select periods below to get started.
      </Alert>

      {/* Filters */}
      <AnalyticsFilters
        hotelSlug={hotel_slug}
        selectedPeriods={selectedPeriods}
        onPeriodsChange={setSelectedPeriods}
        period1={period1}
        period2={period2}
        onPeriod1Change={setPeriod1}
        onPeriod2Change={setPeriod2}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        categories={categories}
        onRefresh={handleRefresh}
        loading={loading}
      />

      {/* KPI Summary Cards */}
      {period1 && (
        <div className="mb-4">
          <KPISummaryCards
            hotelSlug={hotel_slug}
            period1={period1}
            period2={period2}
            selectedPeriods={selectedPeriods}
          />
        </div>
      )}

      {/* Big Square Toggle Buttons */}
      {period1 && (
        <div className="mb-4">
          <h5 className="mb-3 text-muted">Analytics Sections</h5>
          <Row className="g-3">
            {/* Category Comparison Button */}
            <Col xs={6} sm={4} md={3} lg={2}>
              <Button
                variant={visibleSections.categoryComparison ? "primary" : "outline-primary"}
                className="w-100 stock-analytics-toggle-btn"
                onClick={() => toggleSection('categoryComparison')}
                style={{ 
                  height: '120px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  fontSize: '0.85rem',
                  fontWeight: '600'
                }}
              >
                <div className="stock-analytics-icon-placeholder mb-2"></div>
                <div className="text-center">Category Comparison</div>
              </Button>
            </Col>

            {/* Top Movers Button */}
            <Col xs={6} sm={4} md={3} lg={2}>
              <Button
                variant={visibleSections.topMovers ? "success" : "outline-success"}
                className="w-100 stock-analytics-toggle-btn"
                onClick={() => toggleSection('topMovers')}
                style={{ 
                  height: '120px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  fontSize: '0.85rem',
                  fontWeight: '600'
                }}
              >
                <div className="stock-analytics-icon-placeholder mb-2"></div>
                <div className="text-center">Top Movers</div>
              </Button>
            </Col>

            {/* Waterfall Cost Button */}
            <Col xs={6} sm={4} md={3} lg={2}>
              <Button
                variant={visibleSections.waterfallCost ? "info" : "outline-info"}
                className="w-100 stock-analytics-toggle-btn"
                onClick={() => toggleSection('waterfallCost')}
                style={{ 
                  height: '120px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  fontSize: '0.85rem',
                  fontWeight: '600'
                }}
              >
                <div className="stock-analytics-icon-placeholder mb-2"></div>
                <div className="text-center">Cost Waterfall</div>
              </Button>
            </Col>

            {/* Item Trends Button */}
            <Col xs={6} sm={4} md={3} lg={2}>
              <Button
                variant={visibleSections.itemTrends ? "warning" : "outline-warning"}
                className="w-100 stock-analytics-toggle-btn"
                onClick={() => toggleSection('itemTrends')}
                style={{ 
                  height: '120px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  fontSize: '0.85rem',
                  fontWeight: '600'
                }}
              >
                <div className="stock-analytics-icon-placeholder mb-2"></div>
                <div className="text-center">Item Trends</div>
              </Button>
            </Col>

            {/* Variance Heatmap Button */}
            <Col xs={6} sm={4} md={3} lg={2}>
              <Button
                variant={visibleSections.varianceHeatmap ? "danger" : "outline-danger"}
                className="w-100 stock-analytics-toggle-btn"
                onClick={() => toggleSection('varianceHeatmap')}
                style={{ 
                  height: '120px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  fontSize: '0.85rem',
                  fontWeight: '600'
                }}
              >
                <div className="stock-analytics-icon-placeholder mb-2"></div>
                <div className="text-center">Variance Heatmap</div>
              </Button>
            </Col>

            {/* Performance Radar Button */}
            <Col xs={6} sm={4} md={3} lg={2}>
              <Button
                variant={visibleSections.performanceRadar ? "secondary" : "outline-secondary"}
                className="w-100 stock-analytics-toggle-btn"
                onClick={() => toggleSection('performanceRadar')}
                style={{ 
                  height: '120px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  fontSize: '0.85rem',
                  fontWeight: '600'
                }}
              >
                <div className="stock-analytics-icon-placeholder mb-2"></div>
                <div className="text-center">Performance Radar</div>
              </Button>
            </Col>

            {/* Stock Value Trends Button */}
            <Col xs={6} sm={4} md={3} lg={2}>
              <Button
                variant={visibleSections.stockValueTrends ? "primary" : "outline-primary"}
                className="w-100 stock-analytics-toggle-btn"
                onClick={() => toggleSection('stockValueTrends')}
                style={{ 
                  height: '120px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  fontSize: '0.85rem',
                  fontWeight: '600'
                }}
              >
                <div className="stock-analytics-icon-placeholder mb-2"></div>
                <div className="text-center">Stock Trends</div>
              </Button>
            </Col>

            {/* Low Stock Button */}
            <Col xs={6} sm={4} md={3} lg={2}>
              <Button
                variant={visibleSections.lowStock ? "warning" : "outline-warning"}
                className="w-100 stock-analytics-toggle-btn"
                onClick={() => toggleSection('lowStock')}
                style={{ 
                  height: '120px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  fontSize: '0.85rem',
                  fontWeight: '600'
                }}
              >
                <div className="stock-analytics-icon-placeholder mb-2"></div>
                <div className="text-center">Low Stock</div>
              </Button>
            </Col>

            {/* Profitability Button */}
            <Col xs={6} sm={4} md={3} lg={2}>
              <Button
                variant={visibleSections.profitability ? "success" : "outline-success"}
                className="w-100 stock-analytics-toggle-btn"
                onClick={() => toggleSection('profitability')}
                style={{ 
                  height: '120px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  fontSize: '0.85rem',
                  fontWeight: '600'
                }}
              >
                <div className="stock-analytics-icon-placeholder mb-2"></div>
                <div className="text-center">Profitability</div>
              </Button>
            </Col>

            {/* Category Breakdown Button */}
            <Col xs={6} sm={4} md={3} lg={2}>
              <Button
                variant={visibleSections.categoryBreakdown ? "info" : "outline-info"}
                className="w-100 stock-analytics-toggle-btn"
                onClick={() => toggleSection('categoryBreakdown')}
                style={{ 
                  height: '120px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  fontSize: '0.85rem',
                  fontWeight: '600'
                }}
              >
                <div className="stock-analytics-icon-placeholder mb-2"></div>
                <div className="text-center">Category Breakdown</div>
              </Button>
            </Col>

            {/* Side by Side Comparison Button */}
            <Col xs={6} sm={4} md={3} lg={2}>
              <Button
                variant={visibleSections.categoryComparisonSideBySide ? "secondary" : "outline-secondary"}
                className="w-100 stock-analytics-toggle-btn"
                onClick={() => toggleSection('categoryComparisonSideBySide')}
                style={{ 
                  height: '120px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  fontSize: '0.85rem',
                  fontWeight: '600'
                }}
              >
                <div className="stock-analytics-icon-placeholder mb-2"></div>
                <div className="text-center">Side by Side</div>
              </Button>
            </Col>

            {/* Comparison Table Button */}
            <Col xs={6} sm={4} md={3} lg={2}>
              <Button
                variant={visibleSections.categoryComparisonTable ? "dark" : "outline-dark"}
                className="w-100 stock-analytics-toggle-btn"
                onClick={() => toggleSection('categoryComparisonTable')}
                style={{ 
                  height: '120px', 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  fontSize: '0.85rem',
                  fontWeight: '600'
                }}
              >
                <div className="stock-analytics-icon-placeholder mb-2"></div>
                <div className="text-center">Comparison Table</div>
              </Button>
            </Col>
          </Row>
        </div>
      )}

      {/* Analytics Charts - Vertically Stacked (One Below Another) */}
      <div className="stock-analytics-sections-container">
        {/* Render charts in order - newest at top */}
        {sectionOrder.map(section => {
          if (!visibleSections[section]) return null;
          
          // Chart component mapping
          const chartComponents = {
            categoryComparison: (
              <CategoryComparisonChart
                hotelSlug={hotel_slug}
                selectedPeriods={selectedPeriods}
                height={chartHeight}
              />
            ),
            topMovers: (
              <TopMoversChart
                hotelSlug={hotel_slug}
                period1={period1}
                period2={period2}
                limit={10}
                height={chartHeight}
              />
            ),
            waterfallCost: (
              <WaterfallCostChart
                hotelSlug={hotel_slug}
                period1={period1}
                period2={period2}
                height={chartHeight + 50}
              />
            ),
            itemTrends: (
              <ItemTrendsChart
                hotelSlug={hotel_slug}
                selectedPeriods={selectedPeriods}
                categories={categories}
                height={chartHeight}
              />
            ),
            varianceHeatmap: (
              <VarianceHeatmapChart
                hotelSlug={hotel_slug}
                selectedPeriods={selectedPeriods}
                height={chartHeight + 50}
              />
            ),
            performanceRadar: (
              <PerformanceRadarChart
                hotelSlug={hotel_slug}
                period1={period1}
                period2={period2}
                height={chartHeight + 50}
              />
            ),
            stockValueTrends: period1 ? (
              <StockValueTrendsChart
                hotelSlug={hotel_slug}
                height={chartHeight}
                periodCount={12}
              />
            ) : null,
            lowStock: period1 ? (
              <LowStockChart
                hotelSlug={hotel_slug}
                period={period1}
                height={chartHeight}
              />
            ) : null,
            profitability: period1 ? (
              <ProfitabilityChart
                hotelSlug={hotel_slug}
                period={period1}
                height={chartHeight}
                defaultView="category"
              />
            ) : null,
            categoryBreakdown: period1 ? (
              <CategoryBreakdownChart
                hotelSlug={hotel_slug}
                period={period1}
                height={chartHeight}
                defaultChartType="pie"
              />
            ) : null,
            categoryComparisonSideBySide: (
              <CategoryComparisonSideBySide
                hotelSlug={hotel_slug}
                periods={selectedPeriods}
                height={chartHeight}
              />
            ),
            categoryComparisonTable: (
              <CategoryComparisonTable
                hotelSlug={hotel_slug}
                periods={selectedPeriods}
              />
            )
          };

          const chartComponent = chartComponents[section];
          if (!chartComponent) return null;

          return (
            <div key={section} className="position-relative mb-4">
              <Button
                variant="light"
                size="sm"
                className="position-absolute top-0 end-0 m-2 stock-analytics-chart-close-btn"
                style={{ zIndex: 10 }}
                onClick={() => closeSection(section)}
              >
                <FaTimes />
              </Button>
              {chartComponent}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="text-center text-muted small mt-5 pb-3">
        <div>Last updated: {formatLastUpdated()}</div>
        <div className="mt-1">
          Using <strong>NEW</strong> comparison analytics endpoints • Auto-refreshes every 5 minutes
        </div>
      </div>

      {/* Styles for Analytics Dashboard Components */}
      <style>{`
        .stock-analytics-toggle-btn {
          transition: all 0.3s ease;
          border-radius: 12px;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        
        .stock-analytics-toggle-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        
        .stock-analytics-toggle-btn:active {
          transform: translateY(-1px);
        }

        .stock-analytics-sections-container .card {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border-radius: 12px;
        }

        .stock-analytics-chart-close-btn {
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
          transition: all 0.2s ease;
        }

        .stock-analytics-chart-close-btn:hover {
          background-color: #f8f9fa;
          transform: scale(1.1);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }

        .stock-analytics-icon-placeholder {
          width: 32px;
          height: 32px;
          background-color: #ddd;
          border-radius: 4px;
        }
      `}</style>
    </Container>
  );
}

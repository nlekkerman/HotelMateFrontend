// src/pages/stock_tracker/Analytics.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button, Alert } from 'react-bootstrap';
import { FaChartLine, FaArrowLeft, FaCog, FaDownload } from 'react-icons/fa';
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
          />
        </div>
      )}

      {/* Main Analytics Charts Grid */}
      <Row className="g-4 mb-4">
        {/* Category Comparison - Full width on mobile, half on desktop */}
        <Col xs={12} lg={6}>
          <CategoryComparisonChart
            hotelSlug={hotel_slug}
            selectedPeriods={selectedPeriods}
            height={chartHeight}
          />
        </Col>

        {/* Top Movers */}
        <Col xs={12} lg={6}>
          <TopMoversChart
            hotelSlug={hotel_slug}
            period1={period1}
            period2={period2}
            limit={10}
            height={chartHeight}
          />
        </Col>
      </Row>

      <Row className="g-4 mb-4">
        {/* Waterfall Cost Analysis */}
        <Col xs={12} lg={6}>
          <WaterfallCostChart
            hotelSlug={hotel_slug}
            period1={period1}
            period2={period2}
            height={chartHeight + 50}
          />
        </Col>

        {/* Item Trends */}
        <Col xs={12} lg={6}>
          <ItemTrendsChart
            hotelSlug={hotel_slug}
            selectedPeriods={selectedPeriods}
            categories={categories}
            height={chartHeight}
          />
        </Col>
      </Row>

      {/* Advanced Analytics Section */}
      <div className="mt-4 mb-3">
        <h4 className="text-muted">Advanced Analytics</h4>
      </div>

      <Row className="g-4 mb-4">
        {/* Variance Heatmap */}
        <Col xs={12} lg={6}>
          <VarianceHeatmapChart
            hotelSlug={hotel_slug}
            selectedPeriods={selectedPeriods}
            height={chartHeight + 50}
          />
        </Col>

        {/* Performance Radar */}
        <Col xs={12} lg={6}>
          <PerformanceRadarChart
            hotelSlug={hotel_slug}
            period1={period1}
            period2={period2}
            height={chartHeight + 50}
          />
        </Col>
      </Row>

      {/* Operational Analytics Section */}
      {period1 && (
        <>
          <div className="mt-5 mb-3">
            <h4 className="text-muted">Operational Analytics</h4>
          </div>

          <Row className="g-4 mb-4">
            {/* Stock Value Trends */}
            <Col xs={12} lg={6}>
              <StockValueTrendsChart
                hotelSlug={hotel_slug}
                height={chartHeight}
                periodCount={12}
              />
            </Col>

            {/* Low Stock Alert */}
            <Col xs={12} lg={6}>
              <LowStockChart
                hotelSlug={hotel_slug}
                period={period1}
                height={chartHeight}
              />
            </Col>
          </Row>

          <Row className="g-4 mb-4">
            {/* Profitability Analysis */}
            <Col xs={12} lg={6}>
              <ProfitabilityChart
                hotelSlug={hotel_slug}
                period={period1}
                height={chartHeight}
                defaultView="category"
              />
            </Col>

            {/* Category Breakdown */}
            <Col xs={12} lg={6}>
              <CategoryBreakdownChart
                hotelSlug={hotel_slug}
                period={period1}
                height={chartHeight}
                defaultChartType="pie"
              />
            </Col>
          </Row>
        </>
      )}

      {/* Footer */}
      <div className="text-center text-muted small mt-5 pb-3">
        <div>Last updated: {formatLastUpdated()}</div>
        <div className="mt-1">
          Using <strong>NEW</strong> comparison analytics endpoints • Auto-refreshes every 5 minutes
        </div>
      </div>
    </Container>
  );
}

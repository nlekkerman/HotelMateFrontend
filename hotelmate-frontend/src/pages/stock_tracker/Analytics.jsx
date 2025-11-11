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
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import stockMovementIcon from '@/assets/icons/stock-movment.png';

// Import Analytics Components
import AnalyticsFilters from '@/components/stock_tracker/analytics/AnalyticsFilters';
import ExportSelectionModal from '@/components/stock_tracker/analytics/ExportSelectionModal';
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
// NEW Enhanced KPI Components
import InventoryHealthBreakdown from '@/components/stock_tracker/analytics/InventoryHealthBreakdown';
import PerformanceBreakdown from '@/components/stock_tracker/analytics/PerformanceBreakdown';
import ImprovementRecommendations from '@/components/stock_tracker/analytics/ImprovementRecommendations';
import CategoryDistributionChart from '@/components/stock_tracker/analytics/CategoryDistributionChart';

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
    filters: true, // Filters visibility
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
    categoryComparisonTable: false,
    // NEW Enhanced KPI sections
    inventoryHealth: false,
    performanceBreakdown: false,
    improvementRecommendations: false,
    categoryDistribution: false
  });

  // Track order of opened sections (newest first)
  const [sectionOrder, setSectionOrder] = useState([]);

  // Export modal state
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedChartsToExport, setSelectedChartsToExport] = useState([]);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

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
      
      // Scroll to the chart after a short delay to allow rendering
      setTimeout(() => {
        const chartElement = document.querySelector(`[data-chart-section="${section}"]`);
        if (chartElement) {
          chartElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'start',
            inline: 'nearest'
          });
        }
      }, 100);
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

  // Handle export from modal
  const handleExportSelected = async (selectedChartIds) => {
    if (!selectedChartIds || selectedChartIds.length === 0) {
      alert('Please select at least one chart to export');
      return;
    }

    setIsExporting(true);
    setExportProgress(0);

    // Track which charts we opened temporarily (to close them after export)
    const chartsToCloseAfter = [];

    try {
      console.log('🚀 Starting export for charts:', selectedChartIds);
      
      // First, ensure all selected charts are open
      console.log('📂 Opening selected charts...');
      for (const chartId of selectedChartIds) {
        if (!visibleSections[chartId]) {
          console.log(`Opening chart: ${chartId}`);
          chartsToCloseAfter.push(chartId);
          toggleSection(chartId);
        }
      }

      // Wait for all charts to open and render
      if (chartsToCloseAfter.length > 0) {
        console.log(`⏳ Waiting for ${chartsToCloseAfter.length} charts to render...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      
      // Create a new jsPDF instance
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      let exportedCount = 0;

      // Process each selected chart
      for (let i = 0; i < selectedChartIds.length; i++) {
        const chartId = selectedChartIds[i];
        console.log(`\n📊 Processing chart ${i + 1}/${selectedChartIds.length}: ${chartId}`);
        setExportProgress(Math.round(((i + 1) / selectedChartIds.length) * 100));

        // Find the chart element using data attribute
        const chartElement = document.querySelector(`[data-chart-section="${chartId}"]`);

        if (!chartElement) {
          console.warn(`❌ Chart ${chartId} not found or not visible. Skipping...`);
          continue;
        }

        console.log(`✅ Chart element found:`, {
          width: chartElement.offsetWidth,
          height: chartElement.offsetHeight,
          scrollWidth: chartElement.scrollWidth,
          scrollHeight: chartElement.scrollHeight
        });

        // Wait for charts to load - check for SVG or canvas elements
        let attempts = 0;
        const maxAttempts = 20; // 10 seconds max wait
        
        while (attempts < maxAttempts) {
          const hasContent = chartElement.querySelector('svg, canvas, .recharts-wrapper, .card-body');
          const hasMinHeight = chartElement.offsetHeight > 100;
          
          if (hasContent && hasMinHeight) {
            console.log(`✅ Chart content loaded (attempt ${attempts + 1})`);
            break;
          }
          
          console.log(`⏳ Waiting for chart content... (attempt ${attempts + 1}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, 500));
          attempts++;
        }

        if (attempts >= maxAttempts) {
          console.warn(`⚠️ Chart ${chartId} did not fully load after ${maxAttempts} attempts`);
        }

        // Additional wait for animations
        await new Promise(resolve => setTimeout(resolve, 1000));

        console.log('📸 Capturing chart with html2canvas...');

        // Capture the chart as canvas with improved settings
        const canvas = await html2canvas(chartElement, {
          scale: 2,
          useCORS: true,
          logging: true, // Enable logging for debugging
          backgroundColor: '#ffffff',
          windowWidth: chartElement.scrollWidth,
          windowHeight: chartElement.scrollHeight,
          allowTaint: true,
          foreignObjectRendering: false,
          onclone: (clonedDoc) => {
            console.log('🔄 Document cloned for capture');
          }
        });

        console.log(`📐 Canvas created:`, {
          width: canvas.width,
          height: canvas.height
        });

        // Check if canvas is empty
        if (canvas.width === 0 || canvas.height === 0) {
          console.error(`❌ Canvas is empty for chart ${chartId}. Skipping...`);
          continue;
        }

        // Calculate dimensions to fit on A4 page
        const pageWidth = 190; // A4 width in mm minus margins
        const pageHeight = 277; // A4 height in mm minus margins
        const margin = 10;
        const spacing = 5; // Space between charts
        
        // Calculate chart dimensions maintaining aspect ratio
        let chartWidth = pageWidth;
        let chartHeight = (canvas.height * pageWidth) / canvas.width;
        
        // If chart is too tall for half page, scale it down
        const maxChartHeight = (pageHeight - spacing) / 2; // Allow 2 charts per page
        if (chartHeight > maxChartHeight) {
          chartHeight = maxChartHeight;
          chartWidth = (canvas.width * maxChartHeight) / canvas.height;
        }
        
        console.log(`📄 Chart dimensions:`, {
          chartWidth,
          chartHeight,
          currentY: exportedCount === 0 ? margin : undefined
        });
        
        // Track Y position for current page
        if (exportedCount === 0) {
          // First chart - start new page
          var currentY = margin;
          var currentPageCharts = 0;
        } else {
          // Check if chart fits on current page
          const remainingSpace = pageHeight - currentY;
          
          if (chartHeight + spacing > remainingSpace) {
            // Chart doesn't fit, start new page
            console.log(`📄 Starting new page (remaining space: ${remainingSpace}mm, needed: ${chartHeight}mm)`);
            pdf.addPage();
            currentY = margin;
            currentPageCharts = 0;
          } else {
            // Add spacing between charts on same page
            currentY += spacing;
          }
        }
        
        console.log(`📍 Placing chart at Y: ${currentY}mm`);
        
        // Add image to PDF at calculated position
        const imgData = canvas.toDataURL('image/png');
        const xPosition = margin + (pageWidth - chartWidth) / 2; // Center horizontally
        pdf.addImage(imgData, 'PNG', xPosition, currentY, chartWidth, chartHeight);
        
        // Update Y position for next chart
        currentY += chartHeight;
        currentPageCharts++;

        exportedCount++;
        console.log(`✅ Chart ${chartId} exported successfully (${exportedCount} total, ${currentPageCharts} on current page)`);

        // Small delay between charts
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      if (exportedCount === 0) {
        alert('No charts were successfully exported. Please make sure the selected charts are open and fully loaded.');
        setIsExporting(false);
        setExportProgress(0);
        return;
      }

      // Generate filename with timestamp
      const timestamp = new Date().toISOString().split('T')[0];
      const filename = `${hotel_slug}_analytics_${timestamp}.pdf`;

      console.log(`💾 Saving PDF as: ${filename}`);
      console.log(`✅ Total charts exported: ${exportedCount}`);

      // Save the PDF
      pdf.save(filename);

      // Close temporarily opened charts
      if (chartsToCloseAfter.length > 0) {
        console.log(`🧹 Closing ${chartsToCloseAfter.length} temporarily opened charts...`);
        await new Promise(resolve => setTimeout(resolve, 500));
        chartsToCloseAfter.forEach(chartId => {
          closeSection(chartId);
        });
      }

      // Close modal and reset progress
      setShowExportModal(false);
      setIsExporting(false);
      setExportProgress(0);
    } catch (error) {
      console.error('❌ Error exporting charts:', error);
      alert(`Failed to export charts: ${error.message}`);
      
      // Clean up: close temporarily opened charts even if export failed
      if (chartsToCloseAfter.length > 0) {
        console.log(`🧹 Cleaning up: closing temporarily opened charts...`);
        chartsToCloseAfter.forEach(chartId => {
          closeSection(chartId);
        });
      }
      
      setIsExporting(false);
      setExportProgress(0);
    }
  };

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
      </div>

      {/* Info Alert */}
      <Alert variant="info" className="mb-4">
        <strong>New Analytics Dashboard:</strong> Compare multiple periods, analyze trends, and track performance with interactive charts. 
        Select periods below to get started.
      </Alert>

      {/* Control Buttons - Centered */}
      <div className="d-flex justify-content-center gap-3 mb-4 flex-wrap">
        <Button 
          variant="outline-secondary"
          size="sm"
          className={`stock-analytics-control-btn ${visibleSections.filters ? 'main-bg text-white' : ''}`}
          onClick={() => setVisibleSections(prev => ({ ...prev, filters: !prev.filters }))}
        >
          <FaCog className="me-1" />
          {visibleSections.filters ? 'Hide Filters' : 'Show Filters'}
        </Button>
        <Button 
          variant="outline-secondary"
          size="sm"
          className="stock-analytics-control-btn"
          onClick={() => setShowExportModal(true)}
          disabled={!period1}
          title="Select and export charts as PDF"
        >
          <FaDownload className="me-1" />
          Export PDF
        </Button>
        {period1 && (
          <Button
            variant="outline-secondary"
            className={`stock-analytics-expand-all-btn ${Object.entries(visibleSections).some(([k, v]) => v && k !== 'filters') ? 'main-bg text-white' : ''}`}
            onClick={() => {
              const anyVisible = Object.entries(visibleSections).some(([k, v]) => v && k !== 'filters');
              if (anyVisible) {
                // Collapse all charts (keep filters state)
                setVisibleSections(prev => ({
                  ...prev,
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
                  categoryComparisonTable: false,
                  inventoryHealth: false,
                  performanceBreakdown: false,
                  improvementRecommendations: false,
                  categoryDistribution: false
                }));
                setSectionOrder([]);
              } else {
                // Expand all charts
                setVisibleSections(prev => ({
                  ...prev,
                  categoryComparison: true,
                  topMovers: true,
                  waterfallCost: true,
                  itemTrends: true,
                  varianceHeatmap: true,
                  performanceRadar: true,
                  stockValueTrends: true,
                  lowStock: true,
                  profitability: true,
                  categoryBreakdown: true,
                  categoryComparisonSideBySide: true,
                  categoryComparisonTable: true,
                  inventoryHealth: true,
                  performanceBreakdown: true,
                  improvementRecommendations: true,
                  categoryDistribution: true
                }));
                setSectionOrder([
                  'categoryDistribution',
                  'improvementRecommendations',
                  'performanceBreakdown',
                  'inventoryHealth',
                  'categoryComparisonTable',
                  'categoryComparisonSideBySide',
                  'categoryBreakdown',
                  'profitability',
                  'lowStock',
                  'stockValueTrends',
                  'performanceRadar',
                  'varianceHeatmap',
                  'itemTrends',
                  'waterfallCost',
                  'topMovers',
                  'categoryComparison'
                ]);
              }
            }}
          >
            {Object.entries(visibleSections).some(([k, v]) => v && k !== 'filters') ? 'Collapse All Charts' : 'Expand All Charts'}
          </Button>
        )}
      </div>

      {/* Filters */}
      {visibleSections.filters && (
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
      )}

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
          <h5 className="mb-3 text-muted text-center">Analytics Sections</h5>
          <Row className="g-3">
            {/* Category Comparison Button */}
            <Col xs={6} sm={4} md={3} lg={2}>
              <Button
                variant="outline-secondary"
                className={`w-100 stock-analytics-toggle-btn ${visibleSections.categoryComparison ? 'main-bg text-white' : ''}`}
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
                variant="outline-secondary"
                className={`w-100 stock-analytics-toggle-btn ${visibleSections.topMovers ? 'main-bg text-white' : ''}`}
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
                <img 
                  src={stockMovementIcon} 
                  alt="Top Movers" 
                  className="stock-analytics-button-icon"
                  style={{ 
                    filter: visibleSections.topMovers ? 'brightness(0) invert(1)' : 'none'
                  }} 
                />
                <div className="text-center">Top Movers</div>
              </Button>
            </Col>

            {/* Waterfall Cost Button */}
            <Col xs={6} sm={4} md={3} lg={2}>
              <Button
                variant="outline-secondary"
                className={`w-100 stock-analytics-toggle-btn ${visibleSections.waterfallCost ? 'main-bg text-white' : ''}`}
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
                variant="outline-secondary"
                className={`w-100 stock-analytics-toggle-btn ${visibleSections.itemTrends ? 'main-bg text-white' : ''}`}
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
                variant="outline-secondary"
                className={`w-100 stock-analytics-toggle-btn ${visibleSections.varianceHeatmap ? 'main-bg text-white' : ''}`}
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
                variant="outline-secondary"
                className={`w-100 stock-analytics-toggle-btn ${visibleSections.performanceRadar ? 'main-bg text-white' : ''}`}
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
                variant="outline-secondary"
                className={`w-100 stock-analytics-toggle-btn ${visibleSections.stockValueTrends ? 'main-bg text-white' : ''}`}
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
                variant="outline-secondary"
                className={`w-100 stock-analytics-toggle-btn ${visibleSections.lowStock ? 'main-bg text-white' : ''}`}
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
                variant="outline-secondary"
                className={`w-100 stock-analytics-toggle-btn ${visibleSections.profitability ? 'main-bg text-white' : ''}`}
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
                variant="outline-secondary"
                className={`w-100 stock-analytics-toggle-btn ${visibleSections.categoryBreakdown ? 'main-bg text-white' : ''}`}
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
                variant="outline-secondary"
                className={`w-100 stock-analytics-toggle-btn ${visibleSections.categoryComparisonSideBySide ? 'main-bg text-white' : ''}`}
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
                variant="outline-secondary"
                className={`w-100 stock-analytics-toggle-btn ${visibleSections.categoryComparisonTable ? 'main-bg text-white' : ''}`}
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

            {/* NEW: Inventory Health Breakdown Button */}
            <Col xs={6} sm={4} md={3} lg={2}>
              <Button
                variant="outline-secondary"
                className={`w-100 stock-analytics-toggle-btn ${visibleSections.inventoryHealth ? 'main-bg text-white' : ''}`}
                onClick={() => toggleSection('inventoryHealth')}
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
                <div className="text-center">Inventory Health</div>
              </Button>
            </Col>

            {/* NEW: Performance Breakdown Button */}
            <Col xs={6} sm={4} md={3} lg={2}>
              <Button
                variant="outline-secondary"
                className={`w-100 stock-analytics-toggle-btn ${visibleSections.performanceBreakdown ? 'main-bg text-white' : ''}`}
                onClick={() => toggleSection('performanceBreakdown')}
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
                <div className="text-center">Performance Breakdown</div>
              </Button>
            </Col>

            {/* NEW: Improvement Recommendations Button */}
            <Col xs={6} sm={4} md={3} lg={2}>
              <Button
                variant="outline-secondary"
                className={`w-100 stock-analytics-toggle-btn ${visibleSections.improvementRecommendations ? 'main-bg text-white' : ''}`}
                onClick={() => toggleSection('improvementRecommendations')}
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
                <div className="text-center">Recommendations</div>
              </Button>
            </Col>

            {/* NEW: Category Distribution Button */}
            <Col xs={6} sm={4} md={3} lg={2}>
              <Button
                variant="outline-secondary"
                className={`w-100 stock-analytics-toggle-btn ${visibleSections.categoryDistribution ? 'main-bg text-white' : ''}`}
                onClick={() => toggleSection('categoryDistribution')}
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
                <div className="text-center">Category Distribution</div>
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
            ),
            // NEW Enhanced KPI Components
            inventoryHealth: (
              <InventoryHealthBreakdown
                hotelSlug={hotel_slug}
                selectedPeriods={selectedPeriods}
                period1={period1}
              />
            ),
            performanceBreakdown: (
              <PerformanceBreakdown
                hotelSlug={hotel_slug}
                selectedPeriods={selectedPeriods}
                period1={period1}
              />
            ),
            improvementRecommendations: (
              <ImprovementRecommendations
                hotelSlug={hotel_slug}
                selectedPeriods={selectedPeriods}
                period1={period1}
              />
            ),
            categoryDistribution: (
              <CategoryDistributionChart
                hotelSlug={hotel_slug}
                selectedPeriods={selectedPeriods}
                period1={period1}
                height={chartHeight}
              />
            )
          };

          const chartComponent = chartComponents[section];
          if (!chartComponent) return null;

          return (
            <div key={section} className="position-relative mb-4" data-chart-section={section}>
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

      {/* Export Selection Modal */}
      <ExportSelectionModal
        show={showExportModal}
        onHide={() => setShowExportModal(false)}
        onExport={handleExportSelected}
        isExporting={isExporting}
      />

      {/* Export Progress Overlay */}
      {isExporting && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div 
            style={{
              backgroundColor: 'white',
              padding: '2rem',
              borderRadius: '12px',
              textAlign: 'center',
              minWidth: '300px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div style={{ marginBottom: '1rem' }}>
              <FaDownload size={48} style={{ color: '#0d6efd' }} />
            </div>
            <h5 style={{ marginBottom: '1rem' }}>Exporting Charts...</h5>
            <div 
              style={{
                width: '100%',
                height: '8px',
                backgroundColor: '#e9ecef',
                borderRadius: '4px',
                overflow: 'hidden',
                marginBottom: '0.5rem'
              }}
            >
              <div 
                style={{
                  width: `${exportProgress}%`,
                  height: '100%',
                  backgroundColor: '#0d6efd',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
            <p style={{ margin: 0, color: '#6c757d' }}>{exportProgress}% Complete</p>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-muted small mt-5 pb-3">
        <div>Last updated: {formatLastUpdated()}</div>
        <div className="mt-1">
          Using <strong>ENHANCED</strong> KPI Summary API with comprehensive analytics
        </div>
        <div className="mt-1 text-success">
          ✨ <strong>NEW:</strong> Inventory Health, Performance Breakdown, Recommendations & Category Distribution
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

        .stock-analytics-button-icon {
          width: 80px;
          height: 80px;
          object-fit: contain;
          margin-bottom: 8px;
          transition: filter 0.3s ease;
        }

        .stock-analytics-control-btn {
          transition: all 0.3s ease;
        }

        .stock-analytics-control-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
        }

        .stock-analytics-expand-all-btn {
          padding: 12px 24px;
          font-size: 1rem;
          font-weight: 600;
          border-radius: 8px;
          min-width: 180px;
          transition: all 0.3s ease;
        }

        .stock-analytics-expand-all-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
      `}</style>
    </Container>
  );
}

import React, { Suspense, lazy } from 'react';
import { useChartPreferences } from '@/context/ChartPreferencesContext';
import ChartLoadingSkeleton from './ChartLoadingSkeleton';

// Lazy load chart libraries to optimize bundle size
const RechartsRenderer = lazy(() => import('./recharts/RechartsRenderer'));
const ChartJSRenderer = lazy(() => import('./chartjs/ChartJSRenderer'));
const VictoryRenderer = lazy(() => import('./victory/VictoryRenderer'));
const EChartsRenderer = lazy(() => import('./echarts/EChartsRenderer'));

/**
 * Universal Chart Component
 * 
 * Wrapper component that renders charts using the user's preferred library.
 * Supports: Recharts, Chart.js, Victory, and Apache ECharts
 * 
 * @param {Object} props
 * @param {string} props.type - Chart type: 'bar', 'line', 'area', 'pie', 'radar', 'waterfall', 'heatmap'
 * @param {Array} props.data - Chart data array
 * @param {Object} props.config - Chart configuration options
 * @param {string} props.title - Optional chart title
 * @param {number} props.height - Chart height in pixels (default: 400)
 * @param {number} props.width - Chart width (default: 100%)
 * @param {Function} props.onDataClick - Optional click handler for data points
 * @param {string} props.className - Optional CSS class
 */
const UniversalChart = ({
  type = 'bar',
  data = [],
  config = {},
  title,
  height = 400,
  width = '100%',
  onDataClick,
  className = '',
  ...rest
}) => {
  const { chartLibrary } = useChartPreferences();

  // Validate data
  if (!data || data.length === 0) {
    return (
      <div 
        className={`universal-chart-empty ${className}`}
        style={{ 
          height, 
          width, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          border: '1px dashed #ccc',
          borderRadius: '8px',
          color: '#999'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <i className="bi bi-bar-chart" style={{ fontSize: '48px', marginBottom: '10px' }}></i>
          <p>No data available</p>
        </div>
      </div>
    );
  }

  // Common props to pass to all chart renderers
  const commonProps = {
    type,
    data,
    config,
    title,
    height,
    width,
    onDataClick,
    ...rest
  };

  // Select appropriate chart renderer based on user preference
  const renderChart = () => {
    switch (chartLibrary) {
      case 'recharts':
        return <RechartsRenderer {...commonProps} />;
      
      case 'chartjs':
        return <ChartJSRenderer {...commonProps} />;
      
      case 'victory':
        return <VictoryRenderer {...commonProps} />;
      
      case 'echarts':
        return <EChartsRenderer {...commonProps} />;
      
      default:
        console.warn(`Unknown chart library: ${chartLibrary}. Falling back to Recharts.`);
        return <RechartsRenderer {...commonProps} />;
    }
  };

  return (
    <div className={`universal-chart-wrapper ${className}`} style={{ width }}>
      {title && (
        <div className="chart-title" style={{ 
          fontWeight: 'bold', 
          fontSize: '16px', 
          marginBottom: '10px',
          padding: '10px',
          borderBottom: '2px solid #007bff'
        }}>
          {title}
        </div>
      )}
      
      <Suspense fallback={<ChartLoadingSkeleton height={height} />}>
        {renderChart()}
      </Suspense>
    </div>
  );
};

export default UniversalChart;

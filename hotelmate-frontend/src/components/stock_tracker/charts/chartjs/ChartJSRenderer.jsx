import React, { useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line, Pie, Doughnut, Radar } from 'react-chartjs-2';

// Register ChartJS components globally
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
);

const COLORS = [
  'rgb(75, 192, 192)',
  'rgb(255, 99, 132)',
  'rgb(54, 162, 235)',
  'rgb(255, 205, 86)',
  'rgb(153, 102, 255)',
  'rgb(255, 159, 64)',
  'rgb(199, 199, 199)',
  'rgb(83, 102, 255)',
  'rgb(255, 99, 255)',
  'rgb(99, 255, 132)'
];

const COLORS_ALPHA = [
  'rgba(75, 192, 192, 0.6)',
  'rgba(255, 99, 132, 0.6)',
  'rgba(54, 162, 235, 0.6)',
  'rgba(255, 205, 86, 0.6)',
  'rgba(153, 102, 255, 0.6)',
  'rgba(255, 159, 64, 0.6)',
  'rgba(199, 199, 199, 0.6)',
  'rgba(83, 102, 255, 0.6)',
  'rgba(255, 99, 255, 0.6)',
  'rgba(99, 255, 132, 0.6)'
];

/**
 * ChartJS Renderer Component
 * Renders charts using Chart.js library
 * Supports: bar, line, area (filled line), pie, donut, radar
 */
const ChartJSRenderer = ({ type, data, config = {}, title, height = 400, onDataClick }) => {
  // Default options common to all charts
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: config.legendPosition || 'top',
        display: config.showLegend !== false,
      },
      title: {
        display: !!title,
        text: title,
        font: {
          size: 16,
          weight: 'bold'
        }
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        intersect: false,
        callbacks: config.tooltipCallbacks || {}
      }
    },
    onClick: onDataClick ? (event, activeElements) => {
      if (activeElements.length > 0) {
        const element = activeElements[0];
        const datasetIndex = element.datasetIndex;
        const dataIndex = element.index;
        const clickedData = {
          datasetIndex,
          dataIndex,
          value: data.datasets[datasetIndex].data[dataIndex],
          label: data.labels[dataIndex],
          datasetLabel: data.datasets[datasetIndex].label
        };
        onDataClick(clickedData);
      }
    } : undefined
  };

  // Bar chart specific options
  const barOptions = {
    ...commonOptions,
    scales: {
      x: {
        stacked: config.stacked || false,
        grid: {
          display: config.showGrid !== false
        }
      },
      y: {
        stacked: config.stacked || false,
        beginAtZero: true,
        grid: {
          display: config.showGrid !== false
        }
      }
    }
  };

  // Line/Area chart specific options
  const lineOptions = {
    ...commonOptions,
    scales: {
      x: {
        grid: {
          display: config.showGrid !== false
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          display: config.showGrid !== false
        }
      }
    },
    elements: {
      line: {
        tension: config.smooth ? 0.4 : 0
      }
    }
  };

  // Pie/Donut chart specific options
  const pieOptions = {
    ...commonOptions,
    plugins: {
      ...commonOptions.plugins,
      tooltip: {
        ...commonOptions.plugins.tooltip,
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          },
          ...(config.tooltipCallbacks || {})
        }
      }
    }
  };

  // Radar chart specific options
  const radarOptions = {
    ...commonOptions,
    scales: {
      r: {
        beginAtZero: true,
        grid: {
          display: config.showGrid !== false
        },
        angleLines: {
          display: true
        },
        pointLabels: {
          font: {
            size: 12
          }
        }
      }
    }
  };

  // Format data based on chart type
  const formatChartData = () => {
    // For pie/donut charts - single dataset with multiple colors
    if (type === 'pie' || type === 'donut') {
      return {
        labels: data.labels || data.map(item => item.name || item.label),
        datasets: [{
          label: config.datasetLabel || 'Value',
          data: data.datasets ? data.datasets[0].data : data.map(item => item.value),
          backgroundColor: config.colors || COLORS_ALPHA,
          borderColor: config.colors?.map(c => c.replace('0.6', '1')) || COLORS,
          borderWidth: 1
        }]
      };
    }

    // For radar charts
    if (type === 'radar') {
      return {
        labels: data.labels || [],
        datasets: (data.datasets || []).map((dataset, idx) => ({
          label: dataset.label || `Dataset ${idx + 1}`,
          data: dataset.data || [],
          backgroundColor: dataset.backgroundColor || COLORS_ALPHA[idx % COLORS_ALPHA.length],
          borderColor: dataset.borderColor || COLORS[idx % COLORS.length],
          borderWidth: 2,
          pointBackgroundColor: dataset.borderColor || COLORS[idx % COLORS.length],
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: dataset.borderColor || COLORS[idx % COLORS.length]
        }))
      };
    }

    // For bar/line/area charts - support multiple datasets
    return {
      labels: data.labels || [],
      datasets: (data.datasets || []).map((dataset, idx) => ({
        label: dataset.label || `Dataset ${idx + 1}`,
        data: dataset.data || [],
        backgroundColor: dataset.backgroundColor || COLORS_ALPHA[idx % COLORS_ALPHA.length],
        borderColor: dataset.borderColor || COLORS[idx % COLORS.length],
        borderWidth: 2,
        fill: type === 'area' ? true : (dataset.fill || false),
        tension: type === 'area' || config.smooth ? 0.4 : 0
      }))
    };
  };

  const chartData = formatChartData();

  // Render appropriate chart component
  const renderChart = () => {
    switch (type) {
      case 'bar':
        return <Bar data={chartData} options={barOptions} height={height} />;
      
      case 'line':
        return <Line data={chartData} options={lineOptions} height={height} />;
      
      case 'area':
        return <Line data={chartData} options={lineOptions} height={height} />;
      
      case 'pie':
        return <Pie data={chartData} options={pieOptions} height={height} />;
      
      case 'donut':
        return <Doughnut data={chartData} options={pieOptions} height={height} />;
      
      case 'radar':
        return <Radar data={chartData} options={radarOptions} height={height} />;
      
      default:
        return (
          <div style={{ 
            height: height, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: '#999' 
          }}>
            <p>Unsupported chart type: {type}</p>
          </div>
        );
    }
  };

  return (
    <div style={{ height: height, width: '100%' }}>
      {renderChart()}
    </div>
  );
};

export default ChartJSRenderer;

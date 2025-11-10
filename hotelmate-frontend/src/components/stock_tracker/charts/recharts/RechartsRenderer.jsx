import React from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  ComposedChart
} from 'recharts';

/**
 * Recharts Renderer
 * 
 * Renders charts using the Recharts library
 */
const RechartsRenderer = ({
  type,
  data,
  config = {},
  height,
  width,
  onDataClick,
  title
}) => {
  // Default colors
  const COLORS = config.colors || [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', 
    '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#a4de6c'
  ];

  /**
   * Transform Chart.js format data to Recharts format
   * Chart.js format: { labels: [], datasets: [{label, data, ...}] }
   * Recharts format: Array of objects
   */
  const transformData = (rawData, chartType) => {
    // If data is already an array, return as-is
    if (Array.isArray(rawData)) {
      return rawData;
    }

    // If data has Chart.js format (labels + datasets)
    if (rawData && rawData.labels && rawData.datasets) {
      const { labels, datasets } = rawData;

      // For radar charts, transform to Recharts radar format
      if (chartType === 'radar') {
        return labels.map((label, index) => {
          const point = { label };
          datasets.forEach(dataset => {
            point[dataset.label || 'value'] = dataset.data[index];
          });
          return point;
        });
      }

      // For bar/line charts with horizontal orientation (indexAxis: 'y')
      if (config.indexAxis === 'y') {
        return labels.map((label, index) => {
          const point = { name: label };
          datasets.forEach(dataset => {
            point[dataset.label || 'value'] = dataset.data[index];
          });
          return point;
        });
      }

      // Default transformation
      return labels.map((label, index) => {
        const point = { name: label };
        datasets.forEach(dataset => {
          point[dataset.label || 'value'] = dataset.data[index];
        });
        return point;
      });
    }

    // Return original data if format is unrecognized
    return rawData;
  };

  // Transform data to Recharts format
  const chartData = transformData(data, type);

  // Ensure chartData is an array
  if (!Array.isArray(chartData)) {
    console.error('RechartsRenderer: data must be an array or Chart.js format object', data);
    return (
      <div style={{ 
        height, 
        width, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: '#dc3545',
        padding: '20px',
        textAlign: 'center'
      }}>
        <div>
          <strong>Invalid chart data format</strong>
          <p style={{ fontSize: '0.875rem', marginTop: '8px' }}>
            Expected an array or Chart.js format object
          </p>
        </div>
      </div>
    );
  }

  // Common chart props
  const commonProps = {
    data: chartData,
    margin: config.margin || { top: 20, right: 30, left: 20, bottom: 20 }
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold', marginBottom: '5px' }}>
            {label || payload[0].name}
          </p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: 0, color: entry.color }}>
              {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Render different chart types
  switch (type) {
    case 'bar':
      // Extract dataset keys from the data
      const barKeys = chartData.length > 0 
        ? Object.keys(chartData[0]).filter(key => key !== 'name' && key !== 'label')
        : [];

      // Check if horizontal bar chart
      const isHorizontal = config.indexAxis === 'y';

      return (
        <ResponsiveContainer width={width} height={height}>
          <BarChart 
            {...commonProps} 
            layout={isHorizontal ? 'vertical' : 'horizontal'}
          >
            {config.showGrid !== false && <CartesianGrid strokeDasharray="3 3" />}
            {isHorizontal ? (
              <>
                <XAxis type="number" />
                <YAxis type="category" dataKey={config.yKey || 'name'} width={150} />
              </>
            ) : (
              <>
                <XAxis type="category" dataKey={config.xKey || 'name'} />
                <YAxis type="number" />
              </>
            )}
            <Tooltip content={<CustomTooltip />} />
            {config.showLegend !== false && <Legend />}
            {config.bars?.map((bar, idx) => (
              <Bar
                key={idx}
                dataKey={bar.key}
                fill={bar.color || COLORS[idx % COLORS.length]}
                name={bar.name || bar.key}
                onClick={onDataClick}
                cursor={onDataClick ? 'pointer' : 'default'}
              />
            )) || barKeys.map((key, idx) => (
              <Bar
                key={idx}
                dataKey={key}
                fill={COLORS[idx % COLORS.length]}
                name={key}
                onClick={onDataClick}
                cursor={onDataClick ? 'pointer' : 'default'}
              >
                {/* Apply individual colors if provided in datasets */}
                {data.datasets?.[0]?.backgroundColor && chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={data.datasets[0].backgroundColor[index] || COLORS[index % COLORS.length]} 
                  />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      );

    case 'line':
      // Extract line keys from the transformed data or use config.lines
      const lineKeys = config.lines 
        ? config.lines 
        : chartData.length > 0 
          ? Object.keys(chartData[0]).filter(key => key !== 'name' && key !== 'label')
          : [];

      return (
        <ResponsiveContainer width={width} height={height}>
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={config.xKey || 'name'} />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {config.lines?.map((line, idx) => (
              <Line
                key={idx}
                type={line.type || 'monotone'}
                dataKey={line.key}
                stroke={line.color || COLORS[idx % COLORS.length]}
                strokeWidth={2}
                name={line.name || line.key}
                dot={{ r: 4 }}
                activeDot={{ r: 6, onClick: onDataClick }}
              />
            )) || lineKeys.map((key, idx) => {
              // Try to find matching dataset color from original data
              const datasetColor = data.datasets?.find(ds => ds.label === key)?.borderColor;
              return (
                <Line
                  key={idx}
                  type="monotone"
                  dataKey={key}
                  stroke={datasetColor || COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  name={key}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6, onClick: onDataClick }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      );

    case 'area':
      // Extract area keys from the transformed data or use config.areas
      const areaKeys = config.areas 
        ? config.areas 
        : chartData.length > 0 
          ? Object.keys(chartData[0]).filter(key => key !== 'name' && key !== 'label')
          : [];

      return (
        <ResponsiveContainer width={width} height={height}>
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={config.xKey || 'name'} />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {config.areas?.map((area, idx) => (
              <Area
                key={idx}
                type={area.type || 'monotone'}
                dataKey={area.key}
                stroke={area.color || COLORS[idx % COLORS.length]}
                fill={area.color || COLORS[idx % COLORS.length]}
                fillOpacity={0.6}
                name={area.name || area.key}
              />
            )) || areaKeys.map((key, idx) => {
              // Try to find matching dataset color from original data
              const dataset = data.datasets?.find(ds => ds.label === key);
              const strokeColor = dataset?.borderColor || COLORS[idx % COLORS.length];
              const fillColor = dataset?.backgroundColor || strokeColor;
              return (
                <Area
                  key={idx}
                  type="monotone"
                  dataKey={key}
                  stroke={strokeColor}
                  fill={fillColor}
                  fillOpacity={0.6}
                  name={key}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      );

    case 'pie':
    case 'donut':
      // Transform pie/donut data format
      const pieData = (() => {
        if (Array.isArray(chartData)) return chartData;
        if (data && data.labels && data.datasets && data.datasets[0]) {
          // Chart.js format: convert to array of {name, value}
          return data.labels.map((label, index) => ({
            name: label,
            value: data.datasets[0].data[index]
          }));
        }
        return [];
      })();
      
      return (
        <ResponsiveContainer width={width} height={height}>
          <PieChart>
            <Pie
              data={pieData}
              dataKey={config.valueKey || 'value'}
              nameKey={config.nameKey || 'name'}
              cx="50%"
              cy="50%"
              innerRadius={type === 'donut' ? '40%' : 0}
              outerRadius="70%"
              label={config.showLabels !== false}
              onClick={onDataClick}
              cursor={onDataClick ? 'pointer' : 'default'}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );

    case 'radar':
      // Extract dataset keys from the transformed data
      const radarKeys = chartData.length > 0 
        ? Object.keys(chartData[0]).filter(key => key !== 'label')
        : [];

      return (
        <ResponsiveContainer width={width} height={height}>
          <RadarChart {...commonProps} cx="50%" cy="50%" outerRadius="80%">
            <PolarGrid />
            <PolarAngleAxis dataKey={config.angleKey || 'label'} />
            <PolarRadiusAxis 
              angle={90} 
              domain={config.scales?.r ? [config.scales.r.beginAtZero ? 0 : 'auto', config.scales.r.max || 'auto'] : [0, 'auto']}
            />
            <Tooltip content={<CustomTooltip />} />
            {config.showLegend !== false && <Legend />}
            {config.radars?.map((radar, idx) => (
              <Radar
                key={idx}
                dataKey={radar.key}
                stroke={radar.color || COLORS[idx % COLORS.length]}
                fill={radar.color || COLORS[idx % COLORS.length]}
                fillOpacity={0.6}
                name={radar.name || radar.key}
              />
            )) || radarKeys.map((key, idx) => (
              <Radar
                key={idx}
                dataKey={key}
                stroke={COLORS[idx % COLORS.length]}
                fill={COLORS[idx % COLORS.length]}
                fillOpacity={0.3}
                name={key}
              />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      );

    case 'composed':
      return (
        <ResponsiveContainer width={width} height={height}>
          <ComposedChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={config.xKey || 'name'} />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {config.bars?.map((bar, idx) => (
              <Bar
                key={`bar-${idx}`}
                dataKey={bar.key}
                fill={bar.color || COLORS[idx % COLORS.length]}
                name={bar.name || bar.key}
              />
            ))}
            {config.lines?.map((line, idx) => (
              <Line
                key={`line-${idx}`}
                type="monotone"
                dataKey={line.key}
                stroke={line.color || COLORS[(config.bars?.length || 0) + idx % COLORS.length]}
                strokeWidth={2}
                name={line.name || line.key}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      );

    default:
      return (
        <div style={{ 
          height, 
          width, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#999'
        }}>
          Unsupported chart type: {type}
        </div>
      );
  }
};

export default RechartsRenderer;

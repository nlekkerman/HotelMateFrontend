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

  // Common chart props
  const commonProps = {
    data,
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
      return (
        <ResponsiveContainer width={width} height={height}>
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={config.xKey || 'name'} />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {config.bars?.map((bar, idx) => (
              <Bar
                key={idx}
                dataKey={bar.key}
                fill={bar.color || COLORS[idx % COLORS.length]}
                name={bar.name || bar.key}
                onClick={onDataClick}
                cursor={onDataClick ? 'pointer' : 'default'}
              />
            )) || <Bar dataKey="value" fill={COLORS[0]} onClick={onDataClick} />}
          </BarChart>
        </ResponsiveContainer>
      );

    case 'line':
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
            )) || <Line type="monotone" dataKey="value" stroke={COLORS[0]} />}
          </LineChart>
        </ResponsiveContainer>
      );

    case 'area':
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
            )) || <Area type="monotone" dataKey="value" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.6} />}
          </AreaChart>
        </ResponsiveContainer>
      );

    case 'pie':
    case 'donut':
      return (
        <ResponsiveContainer width={width} height={height}>
          <PieChart>
            <Pie
              data={data}
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
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      );

    case 'radar':
      return (
        <ResponsiveContainer width={width} height={height}>
          <RadarChart {...commonProps} cx="50%" cy="50%" outerRadius="80%">
            <PolarGrid />
            <PolarAngleAxis dataKey={config.angleKey || 'label'} />
            <PolarRadiusAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {config.radars?.map((radar, idx) => (
              <Radar
                key={idx}
                dataKey={radar.key}
                stroke={radar.color || COLORS[idx % COLORS.length]}
                fill={radar.color || COLORS[idx % COLORS.length]}
                fillOpacity={0.6}
                name={radar.name || radar.key}
              />
            )) || <Radar dataKey="value" stroke={COLORS[0]} fill={COLORS[0]} fillOpacity={0.6} />}
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

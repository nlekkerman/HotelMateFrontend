import React from 'react';
import {
  VictoryBar,
  VictoryLine,
  VictoryArea,
  VictoryPie,
  VictoryChart,
  VictoryAxis,
  VictoryTheme,
  VictoryTooltip,
  VictoryLegend,
  VictoryStack,
  VictoryGroup,
  VictoryLabel,
  VictoryVoronoiContainer
} from 'victory';

const COLORS = [
  '#4bc0c0',
  '#ff6384',
  '#36a2eb',
  '#ffcd56',
  '#9966ff',
  '#ff9f40',
  '#c7c7c7',
  '#5366ff',
  '#ff63ff',
  '#63ff84'
];

/**
 * Victory Renderer Component
 * Renders charts using Victory library (fully composable React charts)
 * Supports: bar, line, area, pie, donut
 */
const VictoryRenderer = ({ type, data, config = {}, title, height = 400, width, onDataClick }) => {
  const chartWidth = width || 600;
  const chartHeight = height;

  // Common theme with custom colors
  const customTheme = {
    ...VictoryTheme.material,
    palette: {
      colors: config.colors || COLORS
    }
  };

  // Format data for Victory charts
  const formatVictoryData = () => {
    // For pie/donut charts
    if (type === 'pie' || type === 'donut') {
      const rawData = data.datasets ? data.datasets[0].data : data.map(item => item.value);
      const labels = data.labels || data.map(item => item.name || item.label);
      
      return rawData.map((value, idx) => ({
        x: labels[idx],
        y: value,
        label: `${labels[idx]}: ${value}`
      }));
    }

    // For bar/line/area charts - return datasets array
    return (data.datasets || []).map(dataset => ({
      name: dataset.label || 'Dataset',
      data: (data.labels || []).map((label, idx) => ({
        x: label,
        y: dataset.data[idx] || 0,
        label: `${label}: ${dataset.data[idx] || 0}`
      }))
    }));
  };

  const chartData = formatVictoryData();

  // Handle click events
  const handleClick = (event, clickData) => {
    if (onDataClick && clickData) {
      onDataClick({
        label: clickData.datum.x,
        value: clickData.datum.y,
        datasetLabel: clickData.datum.name || ''
      });
    }
  };

  // Render Bar Chart
  const renderBarChart = () => {
    const datasets = chartData;
    
    return (
      <svg width={chartWidth} height={chartHeight}>
        <VictoryChart
          theme={customTheme}
          domainPadding={{ x: 30 }}
          standalone={false}
          width={chartWidth}
          height={chartHeight}
          containerComponent={<VictoryVoronoiContainer />}
        >
          {title && (
            <VictoryLabel
              text={title}
              x={chartWidth / 2}
              y={20}
              textAnchor="middle"
              style={{ fontSize: 16, fontWeight: 'bold' }}
            />
          )}
          
          <VictoryAxis
            style={{
              tickLabels: { fontSize: 10, padding: 5 }
            }}
          />
          <VictoryAxis
            dependentAxis
            style={{
              tickLabels: { fontSize: 10, padding: 5 }
            }}
          />

          {config.stacked ? (
            <VictoryStack colorScale={config.colors || COLORS}>
              {datasets.map((dataset, idx) => (
                <VictoryBar
                  key={idx}
                  data={dataset.data}
                  labels={({ datum }) => datum.label}
                  labelComponent={<VictoryTooltip />}
                  events={[{
                    target: 'data',
                    eventHandlers: {
                      onClick: handleClick
                    }
                  }]}
                  style={{
                    data: {
                      cursor: onDataClick ? 'pointer' : 'default'
                    }
                  }}
                />
              ))}
            </VictoryStack>
          ) : (
            <VictoryGroup offset={config.grouped ? 20 : 0} colorScale={config.colors || COLORS}>
              {datasets.map((dataset, idx) => (
                <VictoryBar
                  key={idx}
                  data={dataset.data}
                  labels={({ datum }) => datum.label}
                  labelComponent={<VictoryTooltip />}
                  events={[{
                    target: 'data',
                    eventHandlers: {
                      onClick: handleClick
                    }
                  }]}
                  style={{
                    data: {
                      cursor: onDataClick ? 'pointer' : 'default'
                    }
                  }}
                />
              ))}
            </VictoryGroup>
          )}

          {config.showLegend !== false && datasets.length > 1 && (
            <VictoryLegend
              x={chartWidth - 150}
              y={10}
              orientation="vertical"
              gutter={20}
              style={{ border: { stroke: 'black' }, title: { fontSize: 12 } }}
              data={datasets.map((dataset, idx) => ({
                name: dataset.name,
                symbol: { fill: (config.colors || COLORS)[idx % COLORS.length] }
              }))}
            />
          )}
        </VictoryChart>
      </svg>
    );
  };

  // Render Line Chart
  const renderLineChart = () => {
    const datasets = chartData;
    
    return (
      <svg width={chartWidth} height={chartHeight}>
        <VictoryChart
          theme={customTheme}
          standalone={false}
          width={chartWidth}
          height={chartHeight}
          containerComponent={<VictoryVoronoiContainer />}
        >
          {title && (
            <VictoryLabel
              text={title}
              x={chartWidth / 2}
              y={20}
              textAnchor="middle"
              style={{ fontSize: 16, fontWeight: 'bold' }}
            />
          )}
          
          <VictoryAxis
            style={{
              tickLabels: { fontSize: 10, padding: 5 }
            }}
          />
          <VictoryAxis
            dependentAxis
            style={{
              tickLabels: { fontSize: 10, padding: 5 }
            }}
          />

          {datasets.map((dataset, idx) => (
            <VictoryLine
              key={idx}
              data={dataset.data}
              labels={({ datum }) => datum.label}
              labelComponent={<VictoryTooltip />}
              style={{
                data: {
                  stroke: (config.colors || COLORS)[idx % COLORS.length],
                  strokeWidth: 2,
                  cursor: onDataClick ? 'pointer' : 'default'
                }
              }}
              interpolation={config.smooth ? 'natural' : 'linear'}
              events={[{
                target: 'data',
                eventHandlers: {
                  onClick: handleClick
                }
              }]}
            />
          ))}

          {config.showLegend !== false && datasets.length > 1 && (
            <VictoryLegend
              x={chartWidth - 150}
              y={10}
              orientation="vertical"
              gutter={20}
              style={{ border: { stroke: 'black' }, title: { fontSize: 12 } }}
              data={datasets.map((dataset, idx) => ({
                name: dataset.name,
                symbol: { fill: (config.colors || COLORS)[idx % COLORS.length] }
              }))}
            />
          )}
        </VictoryChart>
      </svg>
    );
  };

  // Render Area Chart
  const renderAreaChart = () => {
    const datasets = chartData;
    
    return (
      <svg width={chartWidth} height={chartHeight}>
        <VictoryChart
          theme={customTheme}
          standalone={false}
          width={chartWidth}
          height={chartHeight}
          containerComponent={<VictoryVoronoiContainer />}
        >
          {title && (
            <VictoryLabel
              text={title}
              x={chartWidth / 2}
              y={20}
              textAnchor="middle"
              style={{ fontSize: 16, fontWeight: 'bold' }}
            />
          )}
          
          <VictoryAxis
            style={{
              tickLabels: { fontSize: 10, padding: 5 }
            }}
          />
          <VictoryAxis
            dependentAxis
            style={{
              tickLabels: { fontSize: 10, padding: 5 }
            }}
          />

          {config.stacked ? (
            <VictoryStack colorScale={config.colors || COLORS}>
              {datasets.map((dataset, idx) => (
                <VictoryArea
                  key={idx}
                  data={dataset.data}
                  labels={({ datum }) => datum.label}
                  labelComponent={<VictoryTooltip />}
                  interpolation={config.smooth ? 'natural' : 'linear'}
                  events={[{
                    target: 'data',
                    eventHandlers: {
                      onClick: handleClick
                    }
                  }]}
                  style={{
                    data: {
                      cursor: onDataClick ? 'pointer' : 'default'
                    }
                  }}
                />
              ))}
            </VictoryStack>
          ) : (
            datasets.map((dataset, idx) => (
              <VictoryArea
                key={idx}
                data={dataset.data}
                labels={({ datum }) => datum.label}
                labelComponent={<VictoryTooltip />}
                style={{
                  data: {
                    fill: (config.colors || COLORS)[idx % COLORS.length],
                    fillOpacity: 0.6,
                    stroke: (config.colors || COLORS)[idx % COLORS.length],
                    strokeWidth: 2,
                    cursor: onDataClick ? 'pointer' : 'default'
                  }
                }}
                interpolation={config.smooth ? 'natural' : 'linear'}
                events={[{
                  target: 'data',
                  eventHandlers: {
                    onClick: handleClick
                  }
                }]}
              />
            ))
          )}

          {config.showLegend !== false && datasets.length > 1 && (
            <VictoryLegend
              x={chartWidth - 150}
              y={10}
              orientation="vertical"
              gutter={20}
              style={{ border: { stroke: 'black' }, title: { fontSize: 12 } }}
              data={datasets.map((dataset, idx) => ({
                name: dataset.name,
                symbol: { fill: (config.colors || COLORS)[idx % COLORS.length] }
              }))}
            />
          )}
        </VictoryChart>
      </svg>
    );
  };

  // Render Pie/Donut Chart
  const renderPieChart = () => {
    const pieData = chartData;
    const innerRadius = type === 'donut' ? 60 : 0;

    return (
      <svg width={chartWidth} height={chartHeight}>
        {title && (
          <VictoryLabel
            text={title}
            x={chartWidth / 2}
            y={20}
            textAnchor="middle"
            style={{ fontSize: 16, fontWeight: 'bold' }}
          />
        )}
        
        <VictoryPie
          standalone={false}
          width={chartWidth}
          height={chartHeight - (title ? 40 : 0)}
          data={pieData}
          colorScale={config.colors || COLORS}
          innerRadius={innerRadius}
          labels={({ datum }) => {
            const total = pieData.reduce((sum, d) => sum + d.y, 0);
            const percentage = ((datum.y / total) * 100).toFixed(1);
            return `${datum.x}: ${percentage}%`;
          }}
          labelComponent={<VictoryTooltip />}
          style={{
            data: {
              cursor: onDataClick ? 'pointer' : 'default'
            },
            labels: {
              fontSize: 11,
              fill: 'white'
            }
          }}
          events={[{
            target: 'data',
            eventHandlers: {
              onClick: handleClick
            }
          }]}
        />

        {config.showLegend !== false && (
          <VictoryLegend
            x={chartWidth - 150}
            y={chartHeight - 100}
            orientation="vertical"
            gutter={10}
            style={{ border: { stroke: 'black' }, title: { fontSize: 10 } }}
            data={pieData.map((item, idx) => ({
              name: item.x,
              symbol: { fill: (config.colors || COLORS)[idx % COLORS.length] }
            }))}
          />
        )}
      </svg>
    );
  };

  // Render appropriate chart
  const renderChart = () => {
    switch (type) {
      case 'bar':
        return renderBarChart();
      
      case 'line':
        return renderLineChart();
      
      case 'area':
        return renderAreaChart();
      
      case 'pie':
      case 'donut':
        return renderPieChart();
      
      default:
        return (
          <div style={{ 
            height: chartHeight, 
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
    <div style={{ width: '100%', height: chartHeight, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      {renderChart()}
    </div>
  );
};

export default VictoryRenderer;

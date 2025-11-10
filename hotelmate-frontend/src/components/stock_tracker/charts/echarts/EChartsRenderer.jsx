import React, { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';

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
 * ECharts Renderer Component
 * Renders charts using Apache ECharts (professional enterprise charting)
 * Supports: bar, line, area, pie, donut, radar
 */
const EChartsRenderer = ({ type, data, config = {}, title, height = 400, onDataClick }) => {
  // Generate ECharts option based on chart type
  const getChartOption = useMemo(() => {
    const baseOption = {
      title: title ? {
        text: title,
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold'
        }
      } : undefined,
      tooltip: {
        trigger: type === 'pie' || type === 'donut' ? 'item' : 'axis',
        axisPointer: {
          type: type === 'bar' ? 'shadow' : 'cross'
        }
      },
      legend: config.showLegend !== false ? {
        orient: 'horizontal',
        top: title ? 40 : 10,
        left: 'center'
      } : undefined,
      color: config.colors || COLORS,
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: title ? 80 : 60,
        containLabel: true
      }
    };

    // Bar Chart
    if (type === 'bar') {
      return {
        ...baseOption,
        xAxis: {
          type: 'category',
          data: data.labels || [],
          axisLabel: {
            rotate: config.rotateLabels || 0,
            interval: 0
          }
        },
        yAxis: {
          type: 'value'
        },
        series: (data.datasets || []).map(dataset => ({
          name: dataset.label,
          type: 'bar',
          data: dataset.data,
          stack: config.stacked ? 'total' : undefined,
          emphasis: {
            focus: 'series'
          },
          itemStyle: {
            borderRadius: [4, 4, 0, 0]
          }
        }))
      };
    }

    // Line Chart
    if (type === 'line') {
      return {
        ...baseOption,
        xAxis: {
          type: 'category',
          data: data.labels || [],
          boundaryGap: false
        },
        yAxis: {
          type: 'value'
        },
        series: (data.datasets || []).map(dataset => ({
          name: dataset.label,
          type: 'line',
          data: dataset.data,
          smooth: config.smooth || false,
          emphasis: {
            focus: 'series'
          },
          lineStyle: {
            width: 2
          },
          showSymbol: true,
          symbolSize: 6
        }))
      };
    }

    // Area Chart (filled line)
    if (type === 'area') {
      return {
        ...baseOption,
        xAxis: {
          type: 'category',
          data: data.labels || [],
          boundaryGap: false
        },
        yAxis: {
          type: 'value'
        },
        series: (data.datasets || []).map(dataset => ({
          name: dataset.label,
          type: 'line',
          data: dataset.data,
          smooth: config.smooth !== false,
          areaStyle: {
            opacity: 0.6
          },
          emphasis: {
            focus: 'series'
          },
          lineStyle: {
            width: 2
          }
        }))
      };
    }

    // Pie Chart
    if (type === 'pie') {
      const pieData = data.labels
        ? data.labels.map((label, idx) => ({
            name: label,
            value: data.datasets[0].data[idx]
          }))
        : data.map(item => ({
            name: item.name || item.label,
            value: item.value
          }));

      return {
        ...baseOption,
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        series: [
          {
            name: config.seriesName || 'Value',
            type: 'pie',
            radius: '70%',
            center: ['50%', '55%'],
            data: pieData,
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            },
            label: {
              show: true,
              formatter: '{b}: {d}%'
            }
          }
        ]
      };
    }

    // Donut Chart
    if (type === 'donut') {
      const donutData = data.labels
        ? data.labels.map((label, idx) => ({
            name: label,
            value: data.datasets[0].data[idx]
          }))
        : data.map(item => ({
            name: item.name || item.label,
            value: item.value
          }));

      return {
        ...baseOption,
        tooltip: {
          trigger: 'item',
          formatter: '{a} <br/>{b}: {c} ({d}%)'
        },
        series: [
          {
            name: config.seriesName || 'Value',
            type: 'pie',
            radius: ['40%', '70%'],
            center: ['50%', '55%'],
            data: donutData,
            emphasis: {
              itemStyle: {
                shadowBlur: 10,
                shadowOffsetX: 0,
                shadowColor: 'rgba(0, 0, 0, 0.5)'
              }
            },
            label: {
              show: true,
              formatter: '{b}: {d}%'
            }
          }
        ]
      };
    }

    // Radar Chart
    if (type === 'radar') {
      const indicators = (data.labels || []).map(label => ({ name: label }));
      
      return {
        ...baseOption,
        radar: {
          indicator: indicators,
          shape: 'polygon',
          splitNumber: 5
        },
        series: [
          {
            name: config.seriesName || 'Metrics',
            type: 'radar',
            data: (data.datasets || []).map(dataset => ({
              value: dataset.data,
              name: dataset.label,
              areaStyle: {
                opacity: 0.3
              }
            })),
            emphasis: {
              lineStyle: {
                width: 4
              }
            }
          }
        ]
      };
    }

    return baseOption;
  }, [type, data, config, title]);

  // Handle chart click events
  const onChartClick = (params) => {
    if (onDataClick) {
      const clickData = {
        name: params.name,
        value: params.value,
        seriesName: params.seriesName,
        dataIndex: params.dataIndex,
        seriesIndex: params.seriesIndex
      };
      onDataClick(clickData);
    }
  };

  const onEvents = onDataClick ? {
    'click': onChartClick
  } : {};

  return (
    <ReactECharts
      option={getChartOption}
      style={{ height: height, width: '100%' }}
      opts={{ renderer: 'canvas' }}
      onEvents={onEvents}
      notMerge={true}
      lazyUpdate={true}
    />
  );
};

export default EChartsRenderer;

import React, { createContext, useContext, useState, useEffect } from 'react';

const ChartPreferencesContext = createContext();

export const useChartPreferences = () => {
  const context = useContext(ChartPreferencesContext);
  if (!context) {
    throw new Error('useChartPreferences must be used within ChartPreferencesProvider');
  }
  return context;
};

export const ChartPreferencesProvider = ({ children }) => {
  const [chartLibrary, setChartLibrary] = useState(() => {
    // Load from localStorage or default to recharts
    return localStorage.getItem('chart_library_preference') || 'recharts';
  });

  const [chartStyle, setChartStyle] = useState(() => {
    // Load from localStorage or default to bar
    return localStorage.getItem('chart_style_preference') || 'bar';
  });

  useEffect(() => {
    // Save to localStorage whenever preferences change
    localStorage.setItem('chart_library_preference', chartLibrary);
    localStorage.setItem('chart_style_preference', chartStyle);
  }, [chartLibrary, chartStyle]);

  const updateChartLibrary = (library) => {
    const validLibraries = ['recharts', 'chartjs', 'victory', 'echarts'];
    if (validLibraries.includes(library)) {
      setChartLibrary(library);
    } else {
      console.warn(`Invalid chart library: ${library}. Using 'recharts' instead.`);
      setChartLibrary('recharts');
    }
  };

  const updateChartStyle = (style) => {
    const validStyles = ['bar', 'line', 'area', 'composed', 'pie', 'donut', 'radar', 'waterfall', 'heatmap'];
    if (validStyles.includes(style)) {
      setChartStyle(style);
    } else {
      console.warn(`Invalid chart style: ${style}. Using 'bar' instead.`);
      setChartStyle('bar');
    }
  };

  const value = {
    chartLibrary,
    chartStyle,
    updateChartLibrary,
    updateChartStyle,
  };

  return (
    <ChartPreferencesContext.Provider value={value}>
      {children}
    </ChartPreferencesContext.Provider>
  );
};

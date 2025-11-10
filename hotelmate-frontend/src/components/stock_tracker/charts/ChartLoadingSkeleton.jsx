import React from 'react';

/**
 * Chart Loading Skeleton
 * 
 * Animated loading placeholder for charts while data is being fetched
 */
const ChartLoadingSkeleton = ({ height = 400, width = '100%' }) => {
  return (
    <div 
      className="chart-loading-skeleton"
      style={{
        width,
        height,
        backgroundColor: '#f0f0f0',
        borderRadius: '8px',
        position: 'relative',
        overflow: 'hidden',
        padding: '20px'
      }}
    >
      {/* Shimmer effect */}
      <div
        className="shimmer"
        style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.6), transparent)',
          animation: 'shimmer 2s infinite'
        }}
      />
      
      {/* Skeleton chart structure */}
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Title skeleton */}
        <div style={{
          height: '30px',
          width: '40%',
          backgroundColor: '#e0e0e0',
          borderRadius: '4px',
          marginBottom: '20px'
        }} />
        
        {/* Chart area skeleton */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          alignItems: 'flex-end', 
          gap: '10px',
          paddingBottom: '20px'
        }}>
          {[70, 50, 80, 60, 90, 55, 75, 65].map((h, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: `${h}%`,
                backgroundColor: '#e0e0e0',
                borderRadius: '4px 4px 0 0'
              }}
            />
          ))}
        </div>
        
        {/* Legend skeleton */}
        <div style={{ 
          display: 'flex', 
          gap: '15px', 
          justifyContent: 'center',
          marginTop: '10px'
        }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{
                width: '12px',
                height: '12px',
                backgroundColor: '#e0e0e0',
                borderRadius: '2px'
              }} />
              <div style={{
                width: '60px',
                height: '12px',
                backgroundColor: '#e0e0e0',
                borderRadius: '2px'
              }} />
            </div>
          ))}
        </div>
      </div>

      <style>
        {`
        @keyframes shimmer {
          0% {
            left: -100%;
          }
          100% {
            left: 100%;
          }
        }
        `}
      </style>
    </div>
  );
};

export default ChartLoadingSkeleton;

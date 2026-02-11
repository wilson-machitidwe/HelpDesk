import React from 'react';

// Simple SVG icons to avoid external dependencies for this example
const ArrowUp = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19V5M5 12l7-7 7 7"/>
  </svg>
);

const ArrowDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14M5 12l7 7 7-7"/>
  </svg>
);

const StatCard = ({ title, count, trendValue, trendDirection = 'neutral' }) => {
  const safeCount = Number.isFinite(Number(count)) ? Number(count) : 0;
  const safeTrend = Number.isFinite(Number(trendValue)) ? Number(trendValue) : undefined;
  
  // Determine color based on direction. 
  // In Help Desks, "Up" (more tickets) is usually bad (Red), unlike Sales where "Up" is good (Green).
  const getTrendColor = () => {
    if (trendDirection === 'up') return '#ef4444';
    if (trendDirection === 'down') return '#22c55e';
    return '#9ca3af';
  };

  return (
    <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '1.25rem', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)', transition: 'box-shadow 0.2s' }}>
      {/* Title Section */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <h3 style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {title}
        </h3>
        <span style={{ backgroundColor: '#fef3c7', color: '#b45309', fontSize: '0.7rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '999px' }}>
          {safeCount}
        </span>
      </div>
      
      {/* Metrics Row */}
      {safeTrend !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', color: getTrendColor(), fontWeight: 500 }}>
          {trendDirection === 'up' ? <ArrowUp /> : <ArrowDown />}
          <span style={{ marginLeft: '0.25rem', fontSize: '0.875rem' }}>{safeTrend}</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;

import React from 'react';

const CategoryLegend = ({ categories = [] }) => {
  if (!categories || categories.length === 0) return null;

  return (
    <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '0.75rem', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }}>
      <div style={{ fontSize: '0.75rem', color: '#4b5563', marginBottom: '0.5rem' }}>Categories</div>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        {categories.map((c, idx) => (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ background: c.color, width: '0.75rem', height: '0.75rem', borderRadius: '0.125rem', display: 'inline-block' }} />
            <span style={{ fontSize: '0.875rem', color: '#374151' }}>{c.label} <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>({c.value}%)</span></span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryLegend;

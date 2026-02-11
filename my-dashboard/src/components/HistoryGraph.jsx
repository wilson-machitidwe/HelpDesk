import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

const HistoryGraph = ({ points = [] }) => {
  if (!points || points.length === 0) return <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>No history</div>;

  // Recharts expects an array of objects like { date, open }
  const data = points.map(p => ({ date: p.date, open: p.open || 0 }));

  return (
    <div style={{ backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '0.375rem', padding: '0.75rem', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)' }}>
      <div style={{ fontSize: '0.75rem', color: '#4b5563', marginBottom: '0.5rem' }}>Open Tickets (history)</div>
      <div style={{ width: '100%', height: 150 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Line type="monotone" dataKey="open" stroke="#E67E22" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default HistoryGraph;

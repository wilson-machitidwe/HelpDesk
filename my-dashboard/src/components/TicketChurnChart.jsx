import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const toDateKey = (date) => date.toISOString().slice(0, 10);
const formatLong = (date) => {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
};

const buildChurnData = (tickets, days) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));

  const buckets = [];
  const bucketMap = {};
  for (let i = 0; i < days; i += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const key = toDateKey(date);
    const entry = { date: formatLong(date), key, open: 0, closed: 0 };
    buckets.push(entry);
    bucketMap[key] = entry;
  }

  tickets.forEach((ticket) => {
    if (!ticket.createdAt) return;
    const created = new Date(ticket.createdAt);
    if (Number.isNaN(created.getTime())) return;
    const key = toDateKey(created);
    const bucket = bucketMap[key];
    if (!bucket) return;
    if (ticket.status === 'Closed') bucket.closed += 1;
    else bucket.open += 1;
  });

  return buckets;
};

const TicketChurnChart = ({ tickets }) => {
  const data = useMemo(() => buildChurnData(tickets || [], 8), [tickets]);
  return (
    <div className="w-full h-64 bg-white p-4">
      <h3 className="text-sm font-bold text-gray-700 mb-3">Ticket Churn</h3>
      <ResponsiveContainer width="100%" height="88%">
        <BarChart layout="vertical" data={data} margin={{ top: 5, right: 16, left: 16, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
          <YAxis dataKey="date" type="category" fontSize={10} tickMargin={8} width={52} />
          <XAxis type="number" fontSize={10} domain={[0, 'dataMax + 0.5']} allowDecimals />
          <Tooltip cursor={{ fill: '#f4f6f8' }} />
          <Legend iconType="rect" verticalAlign="bottom" />
          <Bar dataKey="open" stackId="a" fill="#E86C24" barSize={14} name="Open" />
          <Bar dataKey="closed" stackId="a" fill="#007DA3" barSize={14} name="Closed" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TicketChurnChart;

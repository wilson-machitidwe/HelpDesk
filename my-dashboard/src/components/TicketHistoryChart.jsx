import React, { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const toDateKey = (date) => date.toISOString().slice(0, 10);
const formatShort = (date) => {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}`;
};

const buildHistoryData = (tickets, days) => {
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
    const entry = { date: formatShort(date), key, open: 0, closed: 0 };
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

const TicketHistoryChart = ({ tickets }) => {
  const data = useMemo(() => buildHistoryData(tickets || [], 8), [tickets]);
  return (
    <div className="w-full h-80 bg-white p-4">
      <h3 className="text-sm font-bold text-gray-700 mb-4">Ticket History</h3>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
          <XAxis dataKey="date" fontSize={12} tickMargin={10} />
          <YAxis fontSize={12} domain={[0, 'dataMax + 1']} />
          <Tooltip />
          <Legend iconType="rect" align="center" verticalAlign="bottom" />
          
          {/* Line for Open Tickets (Orange) */}
          <Line 
            type="monotone" 
            dataKey="open" 
            stroke="#E86C24" 
            strokeWidth={2} 
            dot={{ r: 4, fill: '#E86C24' }} 
            activeDot={{ r: 6 }} 
          />
          
          {/* Line for Closed Tickets (Blue/Teal) */}
          <Line 
            type="monotone" 
            dataKey="closed" 
            stroke="#007DA3" 
            strokeWidth={2} 
            dot={{ r: 4, fill: '#007DA3' }} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TicketHistoryChart;

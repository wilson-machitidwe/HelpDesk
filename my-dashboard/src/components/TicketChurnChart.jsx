import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const toDateKey = (date) => date.toISOString().slice(0, 10);
const formatLong = (date) => {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
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
    <div className="w-full h-96 bg-white p-4">
      <h3 className="text-sm font-bold text-gray-700 mb-4">Ticket Churn</h3>
      {/* layout="vertical" is what makes the bars go sideways */}
      <ResponsiveContainer width="100%" height="90%">
        <BarChart
          layout="vertical" 
          data={data}
          margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#eee" />
          {/* YAxis is now the dates */}
          <YAxis dataKey="date" type="category" fontSize={11} tickMargin={10} width={80} />
          {/* XAxis is now the numbers */}
          <XAxis type="number" fontSize={11} domain={[0, 'dataMax + 0.5']} allowDecimals={true} />
          <Tooltip cursor={{fill: '#f4f6f8'}}/>
          <Legend iconType="rect" verticalAlign="bottom" />
          
          {/* stackId="a" links these two bars together so they stack */}
          <Bar dataKey="open" stackId="a" fill="#E86C24" barSize={20} name="Open" />
          <Bar dataKey="closed" stackId="a" fill="#007DA3" barSize={20} name="Closed" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TicketChurnChart;

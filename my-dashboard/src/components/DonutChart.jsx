import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const DonutChart = ({ title, data }) => {
  const COLORS = ['#E86C24', '#007DA3', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="w-full h-64 bg-white p-3">
      <h3 className="text-sm font-bold text-gray-700 mb-1">{title}</h3>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="44%" innerRadius={44} outerRadius={62} paddingAngle={3} dataKey="value">
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend iconType="circle" verticalAlign="bottom" height={28} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default DonutChart;

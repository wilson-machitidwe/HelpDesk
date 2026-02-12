import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

const DonutChart = ({ title, data }) => {
  const COLORS = ['#E86C24', '#007DA3', '#FFBB28', '#FF8042', '#8884d8'];

  return (
    <div className="w-full h-72 bg-white p-3 flex flex-col">
      <h3 className="text-[16px] font-bold text-gray-700 mb-1">{title}</h3>
      <div className="flex-1 min-h-0 flex items-center justify-center">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={54} outerRadius={100} paddingAngle={3} dataKey="value">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend iconType="circle" verticalAlign="bottom" height={15} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DonutChart;

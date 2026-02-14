import React, { useEffect, useState } from 'react';
import TicketHistoryChart from './TicketHistoryChart';
import DonutChart from './DonutChart';
import TicketChurnChart from './TicketChurnChart';
import { apiFetchJson } from '../config/apiBase';

const DashboardCharts = ({ refreshKey, hasTask }) => {
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    const fetchTickets = async () => {
      const token = sessionStorage.getItem('token');
      const result = await apiFetchJson('/api/tickets', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTickets(Array.isArray(result.data) ? result.data : []);
    };
    fetchTickets();
  }, [refreshKey]);

  const categoryMap = tickets.reduce((acc, ticket) => {
    const key = ticket.category || 'Unspecified';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const categoryData = Object.keys(categoryMap).length
    ? Object.entries(categoryMap).map(([name, value]) => ({ name, value }))
    : [{ name: 'Unspecified', value: 1 }];

  const creatorMap = tickets.reduce((acc, ticket) => {
    const key = ticket.creator || 'Unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const creatorData = Object.keys(creatorMap).length
    ? Object.entries(creatorMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, value]) => ({ name, value }))
    : [{ name: 'No data', value: 1 }];

  const showHistory = hasTask?.('View Ticket History Chart');
  const showChurn = hasTask?.('View Ticket Churn Chart');
  const showFirstResponse = hasTask?.('View First Response Time');
  const showCloseTime = hasTask?.('View Tickets Close Time');
  const showCategory = hasTask?.('View Category Breakdown');
  const showCreators = hasTask?.('View Top Ticket Creators');
  const noWidgets = !showHistory && !showChurn && !showFirstResponse && !showCloseTime && !showCategory && !showCreators;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 mt-2 px-4 md:px-6">
      <div className="xl:col-span-3 space-y-5">
        {showHistory && (
          <div className="bg-white rounded-md border border-gray-300 shadow-sm overflow-hidden">
            <TicketHistoryChart tickets={tickets} />
          </div>
        )}
        {showChurn && (
          <div className="bg-white rounded-md border border-gray-300 shadow-sm overflow-hidden">
            <TicketChurnChart tickets={tickets} />
          </div>
        )}
      </div>

      <div className="xl:col-span-2 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {showFirstResponse && (
            <div className="bg-white p-3 rounded-md border border-gold-200 shadow-sm">
              <h4 className="text-[17px] font-bold text-gold-500 proper">First Response Time</h4>
              <p className="text-4xl text-gray-400 font-red mt-1">----</p>
              <p className="text-[17px] font-bold text-blue-400 proper">Average</p>
            </div>
          )}
          {showCloseTime && (
            <div className="bg-white p-2 rounded-md border border-gray-200 shadow-sm">
              <h4 className="text-[17px] font-bold text-gold-500 proper">Tickets Close Time</h4>
              <p className="text-4xl text-gray-400 font-red mt-1">----</p>
              <p className="text-[17px] font-bold text-blue-400 proper">Average</p>
            </div>
          )}
        </div>

        {showCategory && (
          <div className="bg-white rounded-md border border-gray-200 shadow-sm overflow-hidden">
            <DonutChart title="Category Breakdown" data={categoryData} />
          </div>
        )}
        {showCreators && (
          <div className="bg-white rounded-md border border-gray-200 shadow-sm overflow-hidden">
            <DonutChart title="Top 5 Ticket Creators" data={creatorData} />
          </div>
        )}
        {noWidgets && (
          <div className="bg-white p-6 rounded-md border border-gray-200 shadow-sm text-sm text-gray-400">
            No dashboard widgets assigned.
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardCharts;

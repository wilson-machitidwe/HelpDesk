import React, { useEffect, useState } from 'react';
import { API_BASE } from '../config/apiBase';
import StatCard from './StatCard';

const DashboardTopRow = ({ refreshKey, hasTask, profile }) => {
  const [stats, setStats] = useState({
    newTickets: 0,
    yourTickets: 0,
    openTickets: 0,
    unassigned: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/tickets`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        const tickets = Array.isArray(data) ? data : [];
        const displayName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ');
        const username = profile?.username;
        const now = Date.now();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;

        const openTickets = tickets.filter((t) => {
          const status = String(t.status || '').toLowerCase();
          return status !== 'closed';
        }).length;
        const unassigned = tickets.filter((t) => !t.assignee || t.assignee === '').length;
        const yourTickets = tickets.filter((t) => {
          if (!t.creator) return false;
          return t.creator === displayName || t.creator === username;
        }).length;
        const newTickets = tickets.filter((t) => {
          if (!t.createdAt) return false;
          const created = Date.parse(t.createdAt);
          if (Number.isNaN(created)) return false;
          return now - created <= sevenDays;
        }).length;

        setStats({ newTickets, yourTickets, openTickets, unassigned });
      } catch (error) {
        console.error("Error loading stats:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [refreshKey, profile?.firstName, profile?.lastName, profile?.username]);

  if (loading) return <div className="p-6 text-gray-500">Loading Stats...</div>;

  return (
    <div className="p-6 bg-gray-50">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {hasTask?.('View New Tickets Stat') && (
          <StatCard title="New Tickets" count={stats.newTickets} trendValue={stats.newTickets} trendDirection="up" />
        )}
        {hasTask?.('View Your Tickets Stat') && (
          <StatCard title="Your Tickets" count={stats.yourTickets} />
        )}
        {hasTask?.('View Open Tickets Stat') && (
          <StatCard title="Open Tickets" count={stats.openTickets} trendValue={stats.openTickets} trendDirection="up" />
        )}
        {hasTask?.('View Unassigned Tickets Stat') && (
          <StatCard title="Unassigned Tickets" count={stats.unassigned} trendValue={stats.unassigned} trendDirection="up" />
        )}
        {!hasTask?.('View New Tickets Stat') &&
          !hasTask?.('View Your Tickets Stat') &&
          !hasTask?.('View Open Tickets Stat') &&
          !hasTask?.('View Unassigned Tickets Stat') && (
            <div className="text-sm text-gray-400">No dashboard stats assigned.</div>
          )}
      </div>
    </div>
  );
};

export default DashboardTopRow;

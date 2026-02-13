import React, { useMemo, useState } from 'react';
import { apiFetchJson } from '../config/apiBase';

const ReportsPage = ({ profile }) => {
  const [message, setMessage] = useState('');
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [auditSubmitting, setAuditSubmitting] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [auditData, setAuditData] = useState([]);
  const [lastReportType, setLastReportType] = useState('');
  const [reportType, setReportType] = useState('ticket_volume');
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');
  const [reportSearch, setReportSearch] = useState('');
  const [reportColumnFilters, setReportColumnFilters] = useState({});
  const [auditFrom, setAuditFrom] = useState('');
  const [auditTo, setAuditTo] = useState('');

  const canAccessAudit = profile?.role === 'Admin' || profile?.role === 'Manager';

  const handlePullReports = async () => {
    setMessage('');
    setReportSubmitting(true);
    try {
      const token = sessionStorage.getItem('token');
      const res = await apiFetchJson('/api/reports/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ type: reportType, from: reportFrom || null, to: reportTo || null })
      });
      const data = res.data || {};
      if (!res.ok) {
        setMessage(data.message || 'Failed to pull report.');
        setReportData([]);
        return;
      }
      const normalizedRows = Array.isArray(data.data)
        ? data.data
        : (data.data && typeof data.data === 'object' ? [data.data] : []);
      setReportData(normalizedRows);
      setReportColumnFilters({});
      setReportSearch('');
      setLastReportType(reportType);
      setMessage(data.message || `Report fetched: ${reportType.replace('_', ' ')}`);
    } catch (err) {
      setMessage('Failed to pull report.');
      setReportData([]);
    } finally {
      setReportSubmitting(false);
    }
  };

  const handlePullAuditTrail = async () => {
    if (!canAccessAudit) return;
    setMessage('');
    setAuditSubmitting(true);
    try {
      const token = sessionStorage.getItem('token');
      const res = await apiFetchJson('/api/audit/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ from: auditFrom || null, to: auditTo || null })
      });
      const data = res.data || {};
      if (!res.ok) {
        setMessage(data.message || 'Failed to pull audit trail.');
        setAuditData([]);
        return;
      }
      setAuditData(Array.isArray(data.data) ? data.data : []);
      const rangeLabel = auditFrom || auditTo ? ` (${auditFrom || 'Any'} to ${auditTo || 'Any'})` : '';
      setMessage(data.message || `Audit trail fetched${rangeLabel}.`);
    } catch (err) {
      setMessage('Failed to pull audit trail.');
      setAuditData([]);
    } finally {
      setAuditSubmitting(false);
    }
  };

  const downloadCsv = (rows, filename) => {
    if (!rows?.length) {
      setMessage('No data available to export.');
      return;
    }
    const headers = Object.keys(rows[0]);
    const escape = (value) => {
      const str = value == null ? '' : String(value);
      if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
      return str;
    };
    const lines = [headers.join(','), ...rows.map((row) => headers.map((h) => escape(row[h])).join(','))];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadPdf = (title, rows) => {
    if (!rows?.length) {
      setMessage('No data available to export.');
      return;
    }
    const headers = Object.keys(rows[0]);
    const html = `
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; }
            h1 { font-size: 18px; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
            th { background: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <table>
            <thead><tr>${headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
            <tbody>
              ${rows.map((row) => `<tr>${headers.map((h) => `<td>${row[h] ?? ''}</td>`).join('')}</tr>`).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (!win) {
      setMessage('Popup blocked. Please allow popups to export PDF.');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  const reportHeaders = useMemo(
    () => (reportData?.length > 0 ? Object.keys(reportData[0]) : []),
    [reportData]
  );
  const isTicketVolumeReport = lastReportType === 'ticket_volume';
  const reportColumns = useMemo(() => {
    if (isTicketVolumeReport) {
      return [
        { key: 'id', label: 'ID' },
        { key: 'date_created', label: 'Date Created' },
        { key: 'date_closed', label: 'Date Closed' },
        { key: 'creator', label: 'Creator' },
        { key: 'department', label: 'Department' },
        { key: 'category', label: 'Category' },
        { key: 'priority', label: 'Priority' },
        { key: 'summary', label: 'Summary' },
        { key: 'assignee', label: 'Assignee' }
      ];
    }
    return reportHeaders.map((key) => ({ key, label: key }));
  }, [isTicketVolumeReport, reportHeaders]);
  const reportColumnKeys = useMemo(() => reportColumns.map((column) => column.key), [reportColumns]);

  const filteredReportData = useMemo(() => {
    if (!reportData?.length) return [];
    return reportData.filter((row) => {
      if (reportSearch.trim()) {
        const q = reportSearch.trim().toLowerCase();
        const rowText = reportColumnKeys.map((header) => String(row[header] ?? '')).join(' ').toLowerCase();
        if (!rowText.includes(q)) return false;
      }

      return reportColumnKeys.every((header) => {
        const filterValue = (reportColumnFilters[header] || '').trim().toLowerCase();
        if (!filterValue) return true;
        return String(row[header] ?? '').toLowerCase().includes(filterValue);
      });
    });
  }, [reportColumnFilters, reportData, reportColumnKeys, reportSearch]);

  return (
    <div className="px-4 md:px-6 space-y-6 pb-10">
      <div className="bg-white border border-gray-200 rounded-md shadow-sm p-4 space-y-3">
        <h3 className="text-sm font-bold text-gray-700 uppercase">Reports</h3>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Report Type</label>
            <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="w-full border p-2 rounded text-sm">
              <option value="ticket_volume">Ticket Volume</option>
              <option value="sla_performance">SLA Performance</option>
              <option value="technician_workload">Technician Workload</option>
              <option value="user_activity">User Activity</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">From</label>
            <input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} className="w-full border p-2 rounded text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">To</label>
            <input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} className="w-full border p-2 rounded text-sm" />
          </div>
          <div className="md:col-span-2">
            <button type="button" onClick={handlePullReports} className="bg-gray-900 text-white font-bold py-2 px-4 rounded hover:bg-gray-800 text-sm disabled:opacity-60" disabled={reportSubmitting}>
              {reportSubmitting ? 'Requesting...' : 'Pull Report From System'}
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Search Returned Rows</label>
            <input
              type="text"
              value={reportSearch}
              onChange={(e) => setReportSearch(e.target.value)}
              className="w-full border p-2 rounded text-sm"
              placeholder="Search any value in this report"
            />
          </div>
          <div className="flex md:justify-end">
            <button
              type="button"
              onClick={() => {
                setReportSearch('');
                setReportColumnFilters({});
              }}
              className="bg-gray-100 text-gray-700 border border-gray-300 font-bold py-2 px-4 rounded text-sm"
            >
              Clear Header Filters
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => downloadCsv(reportData, `${lastReportType || 'report'}.csv`)} className="bg-gray-100 text-gray-700 border border-gray-300 font-bold py-2 px-4 rounded text-sm">Download CSV</button>
          <button type="button" onClick={() => downloadPdf(`Report: ${lastReportType || 'Report'}`, reportData)} className="bg-gray-100 text-gray-700 border border-gray-300 font-bold py-2 px-4 rounded text-sm">Download PDF</button>
        </div>
        {reportData?.length > 0 && (
          <div className="overflow-x-auto">
            <table className={`w-full text-left border-collapse text-sm ${isTicketVolumeReport ? 'border border-gray-500' : ''}`}>
              <thead>
                <tr className={isTicketVolumeReport ? 'text-gray-900 font-bold' : 'text-xs uppercase text-gray-500 font-bold border-b border-gray-200'}>
                  {reportColumns.map((column) => (
                    <th key={column.key} className={isTicketVolumeReport ? 'border border-gray-500 px-2 py-2 whitespace-nowrap' : 'py-2 pr-4'}>
                      {column.label}
                    </th>
                  ))}
                </tr>
                {!isTicketVolumeReport && (
                  <tr className="border-b border-gray-200">
                    {reportColumns.map((column) => (
                      <th key={column.key} className="py-2 pr-4">
                        <input
                          type="text"
                          value={reportColumnFilters[column.key] || ''}
                          onChange={(e) => setReportColumnFilters((prev) => ({ ...prev, [column.key]: e.target.value }))}
                          className="w-full border border-gray-200 rounded px-2 py-1 text-xs font-normal text-gray-700"
                          placeholder={`Filter ${column.label}`}
                        />
                      </th>
                    ))}
                  </tr>
                )}
              </thead>
              <tbody className="text-gray-700">
                {filteredReportData.map((row, idx) => (
                  <tr key={idx} className={isTicketVolumeReport ? '' : 'border-b border-gray-100'}>
                    {reportColumns.map((column) => (
                      <td key={column.key} className={isTicketVolumeReport ? 'border border-gray-500 px-2 py-2 align-top' : 'py-2 pr-4'}>
                        {row[column.key] ?? '-'}
                      </td>
                    ))}
                  </tr>
                ))}
                {filteredReportData.length === 0 && (
                  <tr>
                    <td colSpan={reportColumnKeys.length} className="py-5 text-xs text-gray-500">
                      No rows match your current header filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {reportData?.length === 0 && <p className="text-xs text-gray-500">No report data returned for the selected filters.</p>}
      </div>

      <div className="bg-white border border-gray-200 rounded-md shadow-sm p-4 space-y-3">
        <h3 className="text-sm font-bold text-gray-700 uppercase">Audit Trail</h3>
        <p className="text-xs text-gray-600">Available to Managers and Admins. Tracks actions and login activity.</p>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">From</label>
            <input type="date" value={auditFrom} onChange={(e) => setAuditFrom(e.target.value)} className="w-full border p-2 rounded text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">To</label>
            <input type="date" value={auditTo} onChange={(e) => setAuditTo(e.target.value)} className="w-full border p-2 rounded text-sm" />
          </div>
          <div className="md:col-span-2">
            <button
              type="button"
              onClick={handlePullAuditTrail}
              className={`font-bold py-2 px-4 rounded text-sm ${canAccessAudit ? 'bg-orange-600 text-white hover:bg-orange-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'} disabled:opacity-60`}
              disabled={!canAccessAudit || auditSubmitting}
            >
              {auditSubmitting ? 'Requesting...' : 'Pull Audit Trail'}
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => downloadCsv(auditData, 'audit-trail.csv')} className="bg-gray-100 text-gray-700 border border-gray-300 font-bold py-2 px-4 rounded text-sm">Download CSV</button>
          <button type="button" onClick={() => downloadPdf('Audit Trail', auditData)} className="bg-gray-100 text-gray-700 border border-gray-300 font-bold py-2 px-4 rounded text-sm">Download PDF</button>
        </div>
        {!canAccessAudit && <p className="text-xs text-gray-500">You need Manager or Admin access to pull audit trail data.</p>}
        {auditData?.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="text-xs uppercase text-gray-500 font-bold border-b border-gray-200">
                  {Object.keys(auditData[0]).map((key) => (
                    <th key={key} className="py-2 pr-4">{key}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {auditData.map((row, idx) => (
                  <tr key={idx} className="border-b border-gray-100">
                    {Object.keys(auditData[0]).map((key) => (
                      <td key={key} className="py-2 pr-4">{row[key] ?? '-'}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {message && <p className="text-sm text-orange-600 font-bold">{message}</p>}
    </div>
  );
};

export default ReportsPage;

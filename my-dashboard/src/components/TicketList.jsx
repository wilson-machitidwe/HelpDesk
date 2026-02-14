import React, { useEffect, useMemo, useRef, useState } from 'react';
import { API_BASE, apiFetchJson } from '../config/apiBase';

const TicketList = ({ refreshKey, onViewTicket, profile, hasTask, onTicketUpdated }) => {
  // 1. Define the state first so 'tickets' is recognized by the rest of the code
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigneeEdits, setAssigneeEdits] = useState({});
  const [actionMessage, setActionMessage] = useState('');
  const [filter, setFilter] = useState('open');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkAssignee, setBulkAssignee] = useState('');
  const [bulkPriority, setBulkPriority] = useState('');
  const [bulkCategory, setBulkCategory] = useState('');
  const [bulkDepartment, setBulkDepartment] = useState('');
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showBulkPanel, setShowBulkPanel] = useState(false);
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('any');
  const [priorityFilter, setPriorityFilter] = useState('any');
  const [categoryFilter, setCategoryFilter] = useState('any');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [columnConfig, setColumnConfig] = useState({
    id: true,
    summary: true,
    department: true,
    creator: true,
    assignee: true,
    priority: true,
    category: true,
    status: true
  });
  const columnMenuRef = useRef(null);

  const canAssign = hasTask?.('Modify Tickets') && (profile?.role === 'Admin' || profile?.role === 'Manager');
  const canAssignToMe = canAssign && profile?.username;
  const canBulkUpdate = hasTask?.('Modify Tickets') && (profile?.role === 'Admin' || profile?.role === 'Manager');

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      try {
        const token = sessionStorage.getItem('token');
        const response = await apiFetchJson('/api/tickets', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = response.data;
        setTickets(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching tickets:", error);
        setTickets([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, [refreshKey]);

  useEffect(() => {
    const fetchCategories = async () => {
      const token = sessionStorage.getItem('token');
      const res = await apiFetchJson('/api/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = res.data;
      if (Array.isArray(data)) setCategories(data);
    };
    fetchCategories();
  }, [refreshKey]);

  useEffect(() => {
    const fetchDepartments = async () => {
      const token = sessionStorage.getItem('token');
      const res = await apiFetchJson('/api/departments', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = res.data;
      if (Array.isArray(data)) setDepartments(data);
    };
    fetchDepartments();
  }, [refreshKey]);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!canBulkUpdate) return;
      try {
        const token = sessionStorage.getItem('token');
        const res = await apiFetchJson('/api/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = res.data;
        if (Array.isArray(data)) setUsers(data);
      } catch (err) {
        setUsers([]);
      }
    };
    fetchUsers();
  }, [canBulkUpdate]);

  const { openTickets, closedTickets } = useMemo(() => {
    const open = [];
    const closed = [];
    tickets.forEach((ticket) => {
      if (ticket.status === 'Closed') {
        closed.push(ticket);
      } else {
        open.push(ticket);
      }
    });
    return { openTickets: open, closedTickets: closed };
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    if (filter === 'all') return tickets;
    if (filter === 'closed') return closedTickets;
    return openTickets;
  }, [filter, tickets, openTickets, closedTickets]);

  const statusFilteredTickets = useMemo(() => {
    if (statusFilter === 'any') return filteredTickets;
    return filteredTickets.filter((t) => (t.status || '') === statusFilter);
  }, [statusFilter, filteredTickets]);

  const priorityFilteredTickets = useMemo(() => {
    if (priorityFilter === 'any') return statusFilteredTickets;
    return statusFilteredTickets.filter((t) => (t.priority || '') === priorityFilter);
  }, [priorityFilter, statusFilteredTickets]);

  const categoryFilteredTickets = useMemo(() => {
    if (categoryFilter === 'any') return priorityFilteredTickets;
    return priorityFilteredTickets.filter((t) => (t.category || '') === categoryFilter);
  }, [categoryFilter, priorityFilteredTickets]);

  const departmentFilteredTickets = useMemo(() => {
    if (departmentFilter === 'all') return categoryFilteredTickets;
    return categoryFilteredTickets.filter((t) => (t.department || 'Support') === departmentFilter);
  }, [departmentFilter, categoryFilteredTickets]);

  const dateFilteredTickets = useMemo(() => {
    if (!dateFrom && !dateTo) return departmentFilteredTickets;
    const from = dateFrom ? Date.parse(`${dateFrom}T00:00:00`) : null;
    const to = dateTo ? Date.parse(`${dateTo}T23:59:59`) : null;
    return departmentFilteredTickets.filter((t) => {
      if (!t.createdAt) return false;
      const created = Date.parse(t.createdAt);
      if (Number.isNaN(created)) return false;
      if (from && created < from) return false;
      if (to && created > to) return false;
      return true;
    });
  }, [departmentFilteredTickets, dateFrom, dateTo]);

  const searchedTickets = useMemo(() => {
    if (!searchTerm.trim()) return dateFilteredTickets;
    const q = searchTerm.trim().toLowerCase();
    return dateFilteredTickets.filter((t) => {
      const haystack = [
        t.id,
        t.summary,
        t.creator,
        t.assignee,
        t.category,
        t.department,
        t.priority,
        t.status
      ].filter(Boolean).join(' ').toLowerCase();
      return haystack.includes(q);
    });
  }, [dateFilteredTickets, searchTerm]);

  useEffect(() => {
    const saved = localStorage.getItem('ticketFilter');
    if (saved === 'open' || saved === 'closed' || saved === 'all') {
      setFilter(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('ticketFilter', filter);
  }, [filter]);

  useEffect(() => {
    const saved = localStorage.getItem('ticketDepartmentFilter');
    if (saved) setDepartmentFilter(saved);
  }, []);

  useEffect(() => {
    localStorage.setItem('ticketDepartmentFilter', departmentFilter);
  }, [departmentFilter]);

  useEffect(() => {
    const saved = localStorage.getItem('ticketColumnConfig');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setColumnConfig((prev) => ({ ...prev, ...parsed }));
      } catch (err) {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('ticketColumnConfig', JSON.stringify(columnConfig));
  }, [columnConfig]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!columnMenuRef.current) return;
      if (!columnMenuRef.current.contains(event.target)) {
        setShowColumnMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const visibleIds = new Set(searchedTickets.map((t) => t.id));
    setSelectedIds((prev) => prev.filter((id) => visibleIds.has(id)));
  }, [searchedTickets]);

  const toggleSelectAll = () => {
    if (searchedTickets.length === 0) return;
    const allIds = searchedTickets.map((t) => t.id);
    const allSelected = allIds.every((id) => selectedIds.includes(id));
    setSelectedIds(allSelected ? [] : allIds);
  };

  const toggleSelectOne = (ticketId) => {
    setSelectedIds((prev) => (
      prev.includes(ticketId) ? prev.filter((id) => id !== ticketId) : [...prev, ticketId]
    ));
  };

  useEffect(() => {
    if (selectedIds.length < 2) {
      setShowBulkPanel(false);
    }
  }, [selectedIds.length]);

  const bulkUpdate = async (payload) => {
    if (!selectedIds.length) return;
    setActionMessage('');
    try {
      const token = sessionStorage.getItem('token');
      const results = await Promise.all(selectedIds.map((id) => (
        fetch(`${API_BASE}/api/tickets/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(payload)
        })
      )));
      const failed = results.filter((r) => !r.ok).length;
      if (failed) {
        setActionMessage(`Bulk update finished with ${failed} failed update(s).`);
      } else {
        setActionMessage('Bulk update completed.');
      }
      setSelectedIds([]);
      onTicketUpdated?.();
    } catch (err) {
      setActionMessage('Bulk update failed.');
    }
  };

  const handleBulkClose = () => {
    if (!selectedIds.length) return;
    const ok = window.confirm(`Close ${selectedIds.length} selected ticket(s)?`);
    if (!ok) return;
    bulkUpdate({ status: 'Closed' });
  };

  const handleBulkReopen = () => {
    if (!selectedIds.length) return;
    const ok = window.confirm(`Reopen ${selectedIds.length} selected ticket(s)?`);
    if (!ok) return;
    bulkUpdate({ status: 'Open' });
  };

  const handleBulkAssign = () => {
    if (!bulkAssignee) return;
    const ok = window.confirm(`Assign ${selectedIds.length} selected ticket(s) to ${bulkAssignee}?`);
    if (!ok) return;
    bulkUpdate({ assignee: bulkAssignee });
    setBulkAssignee('');
  };

  const handleBulkPriority = () => {
    if (!bulkPriority) return;
    const ok = window.confirm(`Set priority to ${bulkPriority} for ${selectedIds.length} selected ticket(s)?`);
    if (!ok) return;
    bulkUpdate({ priority: bulkPriority });
    setBulkPriority('');
  };

  const handleBulkCategory = () => {
    if (!bulkCategory) return;
    const ok = window.confirm(`Change category to ${bulkCategory} for ${selectedIds.length} selected ticket(s)?`);
    if (!ok) return;
    bulkUpdate({ category: bulkCategory });
    setBulkCategory('');
  };

  const handleBulkDepartment = () => {
    if (!bulkDepartment) return;
    const ok = window.confirm(`Change department to ${bulkDepartment} for ${selectedIds.length} selected ticket(s)?`);
    if (!ok) return;
    bulkUpdate({ department: bulkDepartment });
    setBulkDepartment('');
  };

  const columns = [
    { key: 'id', label: 'ID' },
    { key: 'summary', label: 'Summary' },
    { key: 'department', label: 'Department' },
    { key: 'creator', label: 'Creator' },
    { key: 'assignee', label: 'Assignee' },
    { key: 'priority', label: 'Priority' },
    { key: 'category', label: 'Category' },
    { key: 'status', label: 'Status' }
  ];

  const visibleColumns = columns.filter((col) => columnConfig[col.key]);

  const handleAssigneeChange = (ticketId, value) => {
    setAssigneeEdits((prev) => ({ ...prev, [ticketId]: value }));
  };

  const updateAssignee = async (ticketId, assignee) => {
    setActionMessage('');
    try {
      const token = sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ assignee })
      });
      const data = await response.json();
      if (!response.ok) {
        setActionMessage(data.message || 'Failed to update assignee.');
        return;
      }
      setAssigneeEdits((prev) => ({ ...prev, [ticketId]: '' }));
      onTicketUpdated?.();
    } catch (err) {
      setActionMessage('Failed to update assignee.');
    }
  };


  if (loading) return <div className="p-10 text-center text-gray-500 italic">Loading tickets...</div>;

  return (
    <div className="px-4 md:px-6 pb-10">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative" ref={columnMenuRef}>
            <button
              type="button"
              onClick={() => setShowColumnMenu((prev) => !prev)}
              className="h-8 w-8 inline-flex items-center justify-center rounded border border-gray-200 text-gray-500 hover:text-gray-700 hover:border-gray-300"
              title="Columns"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                <path d="M19.14 12.94a7.97 7.97 0 0 0 .06-.94 7.97 7.97 0 0 0-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.46 7.46 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.58.23-1.13.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.7 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.62-.06.94 0 .32.02.63.06.94L2.82 14.52a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.4 1.05.72 1.63.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54c.58-.23 1.13-.54 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z" fill="currentColor" />
              </svg>
            </button>
            {showColumnMenu && (
              <div className="absolute left-0 mt-2 w-56 bg-white border border-gray-200 rounded shadow-lg p-3 z-10">
                <div className="text-xs font-bold text-gray-500 uppercase mb-2">Columns</div>
                <div className="space-y-2">
                  {columns.map((col) => (
                    <label key={col.key} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={!!columnConfig[col.key]}
                        onChange={() => setColumnConfig((prev) => ({ ...prev, [col.key]: !prev[col.key] }))}
                        className="accent-orange-600"
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          {['open', 'closed', 'all'].map((value) => {
            const count = value === 'open' ? openTickets.length : value === 'closed' ? closedTickets.length : tickets.length;
            return (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase border transition ${
                filter === value
                  ? 'bg-orange-600 text-white border-orange-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-orange-300 hover:text-orange-600'
              }`}
            >
              {value} {count}
            </button>
          )})}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowAdvancedFilters((prev) => !prev)}
            className="bg-white border border-gray-300 text-gray-600 px-3 py-1.5 rounded text-xs font-bold"
          >
            Filters
          </button>
          {canBulkUpdate && (
            <button
              type="button"
              onClick={() => setShowBulkPanel(true)}
              disabled={selectedIds.length < 2}
              className="bg-white border border-gray-300 text-gray-600 px-3 py-1.5 rounded text-xs font-bold disabled:opacity-50"
            >
              Bulk Update
            </button>
          )}
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search"
              className="border border-gray-200 rounded px-3 py-1.5 text-sm w-56 pr-8"
            />
            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
              <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                <path d="M15.5 14h-.79l-.28-.27a6 6 0 1 0-.71.71l.27.28v.79L20 20.5 21.5 19 15.5 14ZM10 15a5 5 0 1 1 0-10 5 5 0 0 1 0 10Z" fill="currentColor" />
              </svg>
            </span>
          </div>
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="border border-gray-200 text-xs font-semibold text-gray-600 rounded px-2 py-1"
          >
            <option value="all">All Departments</option>
            {departments.length ? (
              departments.map((dept) => (
                <option key={dept.id} value={dept.name}>{dept.name}</option>
              ))
            ) : (
              <option value="Support">Support</option>
            )}
          </select>
          <div className="text-xs text-gray-400 font-semibold">
            Showing {searchedTickets.length} {searchedTickets.length === 1 ? 'ticket' : 'tickets'}
          </div>
        </div>
      </div>

      {canBulkUpdate && showBulkPanel && (
        <div className="mb-4 flex flex-wrap items-center gap-3 bg-white border border-gray-200 rounded-md p-3 shadow-sm">
          <div className="text-xs font-bold text-gray-500 uppercase">Bulk Update</div>
          <div className="text-xs text-gray-600">Selected: {selectedIds.length}</div>
          <button
            type="button"
            onClick={handleBulkClose}
            disabled={!selectedIds.length}
            className="bg-gray-900 text-white px-3 py-1.5 rounded text-xs font-bold disabled:opacity-50"
          >
            Close Selected
          </button>
          <button
            type="button"
            onClick={handleBulkReopen}
            disabled={!selectedIds.length}
            className="bg-gray-200 text-gray-800 px-3 py-1.5 rounded text-xs font-bold disabled:opacity-50"
          >
            Reopen Selected
          </button>
          <div className="flex items-center gap-2">
            <select
              value={bulkAssignee}
              onChange={(e) => setBulkAssignee(e.target.value)}
              className="border border-gray-200 text-xs font-semibold text-gray-600 rounded px-2 py-1"
            >
              <option value="">Assign to...</option>
              {users
                .filter((u) => u?.username)
                .map((u) => (
                  <option key={u.id} value={u.username}>{u.username}</option>
                ))}
            </select>
            <button
              type="button"
              onClick={handleBulkAssign}
              disabled={!selectedIds.length || !bulkAssignee}
              className="bg-orange-600 text-white px-3 py-1.5 rounded text-xs font-bold disabled:opacity-50"
            >
              Assign Selected
            </button>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={bulkPriority}
              onChange={(e) => setBulkPriority(e.target.value)}
              className="border border-gray-200 text-xs font-semibold text-gray-600 rounded px-2 py-1"
            >
              <option value="">Set Priority...</option>
              {['High', 'Medium', 'Low'].map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleBulkPriority}
              disabled={!selectedIds.length || !bulkPriority}
              className="bg-blue-600 text-white px-3 py-1.5 rounded text-xs font-bold disabled:opacity-50"
            >
              Update Priority
            </button>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
              className="border border-gray-200 text-xs font-semibold text-gray-600 rounded px-2 py-1"
            >
              <option value="">Change Category...</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleBulkCategory}
              disabled={!selectedIds.length || !bulkCategory}
              className="bg-purple-600 text-white px-3 py-1.5 rounded text-xs font-bold disabled:opacity-50"
            >
              Update Category
            </button>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={bulkDepartment}
              onChange={(e) => setBulkDepartment(e.target.value)}
              className="border border-gray-200 text-xs font-semibold text-gray-600 rounded px-2 py-1"
            >
              <option value="">Change Department...</option>
              {departments.length ? (
                departments.map((dept) => (
                  <option key={dept.id} value={dept.name}>{dept.name}</option>
                ))
              ) : (
                <option value="Support">Support</option>
              )}
            </select>
            <button
              type="button"
              onClick={handleBulkDepartment}
              disabled={!selectedIds.length || !bulkDepartment}
              className="bg-teal-600 text-white px-3 py-1.5 rounded text-xs font-bold disabled:opacity-50"
            >
              Update Department
            </button>
          </div>
          <button
            type="button"
            onClick={() => setShowBulkPanel(false)}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Hide
          </button>
        </div>
      )}

      {showAdvancedFilters && (
        <div className="mb-4 bg-white border border-gray-200 rounded-md p-3 shadow-sm">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setFilter('all');
                }}
                className="border border-gray-200 text-xs font-semibold text-gray-600 rounded px-2 py-1"
              >
                <option value="any">Any</option>
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
                <option value="Closed (Duplicate)">Closed (Duplicate)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Priority</label>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="border border-gray-200 text-xs font-semibold text-gray-600 rounded px-2 py-1"
              >
                <option value="any">Any</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="border border-gray-200 text-xs font-semibold text-gray-600 rounded px-2 py-1"
              >
                <option value="any">Any</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">From</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="border border-gray-200 text-xs font-semibold text-gray-600 rounded px-2 py-1"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">To</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="border border-gray-200 text-xs font-semibold text-gray-600 rounded px-2 py-1"
              />
            </div>
            <button
              type="button"
              onClick={() => {
                setStatusFilter('any');
                setPriorityFilter('any');
                setCategoryFilter('any');
                setDateFrom('');
                setDateTo('');
              }}
              className="ml-auto text-xs text-gray-500 hover:text-gray-700"
            >
              Clear Filters
            </button>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-md shadow-sm overflow-x-auto">
        <table className="w-full min-w-[920px] text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-bold">
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={searchedTickets.length > 0 && searchedTickets.every((t) => selectedIds.includes(t.id))}
                  onChange={toggleSelectAll}
                />
              </th>
              {visibleColumns.map((col) => (
                <th key={col.key} className="px-4 py-3">{col.label}</th>
              ))}
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="text-sm text-gray-700">
            {/* If tickets is empty, show a friendly message */}
            {searchedTickets.length === 0 ? (
              filter === 'open' ? null : (
              <tr>
                <td colSpan={visibleColumns.length + 2} className="px-4 py-10 text-center text-gray-400">
                  No tickets found.
                </td>
              </tr>
              )
            ) : (
              searchedTickets.map((ticket) => (
                <tr key={ticket.id} className="border-b border-gray-100 hover:bg-orange-50 transition-colors group">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(ticket.id)}
                      onChange={() => toggleSelectOne(ticket.id)}
                    />
                  </td>
                  {visibleColumns.map((col) => {
                    if (col.key === 'id') {
                      return <td key={col.key} className="px-4 py-3 font-medium text-orange-600">#{ticket.id}</td>;
                    }
                    if (col.key === 'summary') {
                      return <td key={col.key} className="px-4 py-3 font-semibold">{ticket.summary}</td>;
                    }
                    if (col.key === 'department') {
                      return <td key={col.key} className="px-4 py-3">{ticket.department || '-'}</td>;
                    }
                    if (col.key === 'creator') {
                      return <td key={col.key} className="px-4 py-3">{ticket.creator}</td>;
                    }
                    if (col.key === 'assignee') {
                      return (
                        <td key={col.key} className="px-4 py-3">
                          {canAssign ? (
                            <input
                              type="text"
                              value={assigneeEdits[ticket.id] ?? ticket.assignee ?? ''}
                              onChange={(e) => handleAssigneeChange(ticket.id, e.target.value)}
                              className="w-32 border p-1 rounded text-xs"
                              placeholder="Unassigned"
                            />
                          ) : (
                            ticket.assignee || '-'
                          )}
                        </td>
                      );
                    }
                    if (col.key === 'priority') {
                      return <td key={col.key} className="px-4 py-3">{ticket.priority || '-'}</td>;
                    }
                    if (col.key === 'category') {
                      return <td key={col.key} className="px-4 py-3">{ticket.category || '-'}</td>;
                    }
                    if (col.key === 'status') {
                      return (
                        <td key={col.key} className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                            ticket.status === 'Open'
                              ? 'bg-green-100 text-green-700'
                              : ticket.status === 'Closed (Duplicate)'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-gray-100 text-gray-600'
                          }`}>
                            {ticket.status}
                          </span>
                        </td>
                      );
                    }
                    return <td key={col.key} className="px-4 py-3">-</td>;
                  })}
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canAssign && (
                        <>
                          {canAssignToMe && (
                            <button
                              onClick={() => updateAssignee(ticket.id, profile.username)}
                              className="opacity-0 group-hover:opacity-100 bg-blue-600 text-white px-3 py-1 rounded text-xs transition-opacity"
                            >
                              Assign to me
                            </button>
                          )}
                          <button
                            onClick={() => updateAssignee(ticket.id, assigneeEdits[ticket.id] ?? ticket.assignee ?? '')}
                            className="opacity-0 group-hover:opacity-100 bg-gray-900 text-white px-3 py-1 rounded text-xs transition-opacity"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => updateAssignee(ticket.id, '')}
                            className="opacity-0 group-hover:opacity-100 bg-gray-200 text-gray-700 px-3 py-1 rounded text-xs transition-opacity"
                          >
                            Unassign
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => onViewTicket && onViewTicket(ticket)}
                        className="opacity-0 group-hover:opacity-100 bg-orange-500 text-white px-3 py-1 rounded text-xs transition-opacity"
                      >
                        View
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {actionMessage && (
        <div className="mt-3 text-sm text-orange-600 font-bold">{actionMessage}</div>
      )}
    </div>
  );
};

export default TicketList;

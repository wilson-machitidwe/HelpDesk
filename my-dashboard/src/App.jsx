import React, { useState } from 'react';
import DashboardTopRow from './components/DashboardTopRow';
import DashboardCharts from './components/DashboardCharts';
import TicketList from './components/TicketList';
import TicketDetails from './components/TicketDetails';
import UserManagement from './components/UserManagement';
import Login from './components/Login';
import { API_BASE } from './config/apiBase';
import ConfigPage from './components/ConfigPage';
import ReportsPage from './components/ReportsPage';

const loadProfile = () => {
  try {
    const raw = sessionStorage.getItem('profile');
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
};

function App() {
  const [token, setToken] = useState(sessionStorage.getItem('token'));
  const [view, setView] = useState('dashboard');
  const [profile, setProfile] = useState(loadProfile);
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [ticketRefreshKey, setTicketRefreshKey] = useState(0);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketForm, setTicketForm] = useState({
    department: 'Support',
    summary: '',
    description: '',
    priority: 'Medium',
    category: '',
    assignee: ''
  });
  const [ticketAttachment, setTicketAttachment] = useState(null);
  const [ticketMessage, setTicketMessage] = useState('');
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '' });
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleLoginSuccess = (newToken, user) => {
    setToken(newToken);
    const nextProfile = user || loadProfile();
    setProfile(nextProfile);
    setView('dashboard');
    setSelectedTicket(null);
    setShowNewTicket(false);
  };

  const handleLogout = React.useCallback(() => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('profile');
    setToken(null);
    setProfile(null);
    setView('dashboard');
    setSelectedTicket(null);
    setShowNewTicket(false);
  }, []);

  const handleOpenNewTicket = () => {
    setTicketMessage('');
    setTicketForm({ department: 'Support', summary: '', description: '', priority: 'Medium', category: '', assignee: '' });
    setTicketAttachment(null);
    setShowNewTicket(true);
  };

  const handleViewTicket = (ticket) => {
    setSelectedTicket(ticket);
    setView('ticket-detail');
  };

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    setTicketMessage('');
    setTicketSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('department', ticketForm.department);
      formData.append('summary', ticketForm.summary);
      formData.append('description', ticketForm.description);
      formData.append('priority', ticketForm.priority);
      formData.append('category', ticketForm.category);
      formData.append('assignee', ticketForm.assignee);
      formData.append('creator', displayName);
      if (ticketAttachment) formData.append('attachment', ticketAttachment);

      const response = await fetch(`${API_BASE}/api/tickets`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      const data = await response.json();
      if (!response.ok) {
        setTicketMessage(data.message || 'Failed to create ticket.');
        return;
      }
      setShowNewTicket(false);
      setTicketAttachment(null);
      setTicketRefreshKey((prev) => prev + 1);
    } catch (err) {
      setTicketMessage('Failed to create ticket.');
    } finally {
      setTicketSubmitting(false);
    }
  };

  const displayName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || profile?.username || 'User';
  const userTasks = Array.isArray(profile?.tasks) ? profile.tasks : [];
  const normalizeTaskName = (value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const taskAliases = {
    'View Tickets Page': ['View Ticket Page'],
    'View Users Page': ['View User Page'],
    'Comment on Tickets': ['Comment on Ticket'],
    'Manage Categories': ['Manage Category'],
    'Manage Departments': ['Manage Department']
  };
  const normalizedTaskNames = React.useMemo(
    () =>
      new Set(
        userTasks
          .map((task) => {
            if (typeof task === 'string') return normalizeTaskName(task);
            return normalizeTaskName(task?.name || task?.taskName || task?.label);
          })
          .filter(Boolean)
      ),
    [userTasks]
  );
  const hasTask = React.useCallback(
    (taskName) => {
      if (profile?.role === 'Admin') return true;
      const normalized = normalizeTaskName(taskName);
      if (normalizedTaskNames.has(normalized)) return true;
      const aliases = taskAliases[taskName] || [];
      return aliases.some((alias) => normalizedTaskNames.has(normalizeTaskName(alias)));
    },
    [profile?.role, normalizedTaskNames]
  );
  const canViewConfig = hasTask('View Config Page');
  const canViewReports = profile?.role === 'Admin' || profile?.role === 'Manager' || hasTask('View Reports Page');

  React.useEffect(() => {
    setShowPasswordPrompt(!!profile?.mustChangePassword);
  }, [profile?.mustChangePassword]);

  React.useEffect(() => {
    if (!token) return undefined;
    let active = true;

    const syncProfileFromServer = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok || !Array.isArray(data) || !active) return;
        const cached = loadProfile();
        const keyId = profile?.id || cached?.id;
        const keyUsername = profile?.username || cached?.username;
        const me = data.find((user) => String(user?.id) === String(keyId) || user?.username === keyUsername);
        if (!me) return;

        setProfile((prev) => {
          const base = prev || cached || {};
          const next = {
            ...base,
            id: me.id,
            username: me.username,
            role: me.role,
            firstName: me.firstName,
            lastName: me.lastName,
            email: me.email,
            phone: me.phone,
            mustChangePassword: !!me.mustChangePassword,
            tasks: Array.isArray(me.tasks) ? me.tasks : []
          };
          const unchanged =
            base.id === next.id &&
            base.username === next.username &&
            base.role === next.role &&
            base.firstName === next.firstName &&
            base.lastName === next.lastName &&
            base.email === next.email &&
            base.phone === next.phone &&
            !!base.mustChangePassword === !!next.mustChangePassword &&
            JSON.stringify(base.tasks || []) === JSON.stringify(next.tasks || []);
          if (!unchanged) sessionStorage.setItem('profile', JSON.stringify(next));
          return unchanged ? base : next;
        });
      } catch (err) {
        // best-effort profile sync
      }
    };

    syncProfileFromServer();
    const timer = window.setInterval(syncProfileFromServer, 30000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [token, profile?.id, profile?.username]);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    setPasswordMessage('');
    if (!passwordForm.password) {
      setPasswordMessage('Password is required.');
      return;
    }
    if (passwordForm.password !== passwordForm.confirm) {
      setPasswordMessage('Passwords do not match.');
      return;
    }
    setPasswordSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/api/users/${profile?.id}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: passwordForm.password })
      });
      const data = await response.json();
      if (!response.ok) {
        setPasswordMessage(data.message || 'Failed to update password.');
        return;
      }
      const updatedProfile = { ...profile, mustChangePassword: false };
      sessionStorage.setItem('profile', JSON.stringify(updatedProfile));
      setProfile(updatedProfile);
      setPasswordForm({ password: '', confirm: '' });
      setShowPasswordPrompt(false);
    } catch (err) {
      setPasswordMessage('Failed to update password.');
    } finally {
      setPasswordSubmitting(false);
    }
  };

  const allowedViews = [
    hasTask('View Dashboard') && 'dashboard',
    hasTask('View Tickets Page') && 'tickets',
    hasTask('View Users Page') && 'users',
    canViewReports && 'reports',
    canViewConfig && 'config'
  ].filter(Boolean);

  React.useEffect(() => {
    if (!allowedViews.includes(view)) {
      setView(allowedViews[0] || 'dashboard');
    }
  }, [profile?.role, userTasks.length]);

  React.useEffect(() => {
    setMobileNavOpen(false);
  }, [view]);

  const idleTimerRef = React.useRef(null);

  React.useEffect(() => {
    if (!token) return undefined;
    const timeoutMs = 10 * 60 * 1000;
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'];
    const resetIdleTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        handleLogout();
      }, timeoutMs);
    };
    resetIdleTimer();
    events.forEach((event) => window.addEventListener(event, resetIdleTimer));
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      events.forEach((event) => window.removeEventListener(event, resetIdleTimer));
    };
  }, [token, handleLogout]);

  React.useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/categories`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (Array.isArray(data)) {
          setCategories(data);
          if (data.length && !ticketForm.category) {
            setTicketForm((prev) => ({ ...prev, category: data[0].name }));
          }
        }
      } catch (err) {
        setCategories([]);
      }
    };

    if (token) fetchCategories();
  }, [token, ticketRefreshKey, ticketForm.category]);

  React.useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/departments`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (Array.isArray(data)) {
          setDepartments(data);
          if (data.length && !ticketForm.department) {
            setTicketForm((prev) => ({ ...prev, department: data[0].name }));
          }
        }
      } catch (err) {
        setDepartments([]);
      }
    };

    if (token) fetchDepartments();
  }, [token, ticketRefreshKey, ticketForm.department]);

  return (
    <>
      {!token ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <div className="min-h-screen bg-gray-100 pb-10">
          <nav className="bg-white border-b border-gray-200 px-4 md:px-6 py-3 mb-3 shadow-sm">
            <div className="md:hidden flex items-center justify-between gap-3">
              <span className="text-[18px] font-bold text-orange-600 tracking-tighter">Namikango Mission Help Desk</span>
              <button
                type="button"
                className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded border border-gray-300 text-gray-600"
                onClick={() => setMobileNavOpen((prev) => !prev)}
                aria-label="Toggle navigation"
              >
                {mobileNavOpen ? 'X' : '='}
              </button>
            </div>

            <div className="hidden md:flex items-center gap-6 flex-nowrap whitespace-nowrap overflow-x-auto">
              <span className="shrink-0 text-[20px] font-bold text-orange-600 tracking-tighter">Namikango Mission Help Desk</span>
              <div className="flex items-center gap-6 shrink-0">
                {hasTask('View Dashboard') && (
                  <button onClick={() => setView('dashboard')} className={`text-[16px] font-bold proper ${view === 'dashboard' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-500 hover:text-orange-400'}`}>Dashboard</button>
                )}
                {hasTask('View Tickets Page') && (
                  <button onClick={() => setView('tickets')} className={`text-[16px] font-bold proper ${view === 'tickets' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-500 hover:text-orange-400'}`}>Tickets</button>
                )}
                {hasTask('View Users Page') && (
                  <button onClick={() => setView('users')} className={`text-[16px] font-bold proper ${view === 'users' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-500 hover:text-orange-400'}`}>Users</button>
                )}
                {canViewReports && (
                  <button onClick={() => setView('reports')} className={`text-[16px] font-bold proper ${view === 'reports' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-500 hover:text-orange-400'}`}>Reports</button>
                )}
                {canViewConfig && (
                  <button onClick={() => setView('config')} className={`text-[16px] font-bold proper inline-flex items-center gap-2 ${view === 'config' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-gray-500 hover:text-orange-400'}`}>
                    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                      <path
                        d="M19.14 12.94a7.97 7.97 0 0 0 .06-.94 7.97 7.97 0 0 0-.06-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.6-.22l-2.39.96a7.46 7.46 0 0 0-1.63-.94l-.36-2.54a.5.5 0 0 0-.5-.42h-3.84a.5.5 0 0 0-.5.42l-.36 2.54c-.58.23-1.13.54-1.63.94l-2.39-.96a.5.5 0 0 0-.6.22L2.7 8.84a.5.5 0 0 0 .12.64l2.03 1.58c-.04.31-.06.62-.06.94 0 .32.02.63.06.94L2.82 14.52a.5.5 0 0 0-.12.64l1.92 3.32a.5.5 0 0 0 .6.22l2.39-.96c.5.4 1.05.72 1.63.94l.36 2.54a.5.5 0 0 0 .5.42h3.84a.5.5 0 0 0 .5-.42l.36-2.54c.58-.23 1.13-.54 1.63-.94l2.39.96a.5.5 0 0 0 .6-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z"
                        fill="currentColor"
                      />
                    </svg>
                    Config
                  </button>
                )}
              </div>
              <div className="ml-auto flex items-center gap-2 shrink-0">
                {hasTask('Create Tickets') && (
                  <button
                    onClick={handleOpenNewTicket}
                    className="text-[16px] bg-orange-600 text-white px-3 py-1.5 rounded text-sm font-bold proper hover:bg-orange-700 transition-all"
                  >
                    + New Ticket
                  </button>
                )}
                <div className="text-[16px] font-bold text-gray-700">{displayName}</div>
                <button
                  onClick={handleLogout}
                  className="text-[16px] bg-gray-50 hover:bg-orange-600 hover:text-white text-gray-600 border border-gray-300 px-4 py-1.5 rounded text-sm font-bold proper transition-all"
                >
                  Logout
                </button>
              </div>
            </div>

            {mobileNavOpen && (
              <div className="md:hidden mt-3 border-t border-gray-200 pt-3 space-y-2">
                {hasTask('View Dashboard') && (
                  <button onClick={() => setView('dashboard')} className={`block w-full text-left px-3 py-2 rounded text-sm font-bold ${view === 'dashboard' ? 'bg-orange-50 text-orange-600' : 'text-gray-700'}`}>Dashboard</button>
                )}
                {hasTask('View Tickets Page') && (
                  <button onClick={() => setView('tickets')} className={`block w-full text-left px-3 py-2 rounded text-sm font-bold ${view === 'tickets' ? 'bg-orange-50 text-orange-600' : 'text-gray-700'}`}>Tickets</button>
                )}
                {hasTask('View Users Page') && (
                  <button onClick={() => setView('users')} className={`block w-full text-left px-3 py-2 rounded text-sm font-bold ${view === 'users' ? 'bg-orange-50 text-orange-600' : 'text-gray-700'}`}>Users</button>
                )}
                {canViewReports && (
                  <button onClick={() => setView('reports')} className={`block w-full text-left px-3 py-2 rounded text-sm font-bold ${view === 'reports' ? 'bg-orange-50 text-orange-600' : 'text-gray-700'}`}>Reports</button>
                )}
                {canViewConfig && (
                  <button onClick={() => setView('config')} className={`block w-full text-left px-3 py-2 rounded text-sm font-bold ${view === 'config' ? 'bg-orange-50 text-orange-600' : 'text-gray-700'}`}>Config</button>
                )}
                {hasTask('Create Tickets') && (
                  <button onClick={handleOpenNewTicket} className="block w-full text-left px-3 py-2 rounded text-sm font-bold bg-orange-600 text-white">+ New Ticket</button>
                )}
                <div className="px-3 py-1 text-sm font-bold text-gray-600">{displayName}</div>
                <button onClick={handleLogout} className="block w-full text-left px-3 py-2 rounded text-sm font-bold border border-gray-300 text-gray-700">Logout</button>
              </div>
            )}
          </nav>

          <main className="max-w-screen-2xl mx-auto">
            {view === 'dashboard' && hasTask('View Dashboard') && (
              <>
                <DashboardTopRow refreshKey={ticketRefreshKey} hasTask={hasTask} profile={profile} />
                <DashboardCharts refreshKey={ticketRefreshKey} hasTask={hasTask} />
              </>
            )}

            {view === 'tickets' && hasTask('View Tickets Page') && (
              <TicketList
                refreshKey={ticketRefreshKey}
                onViewTicket={handleViewTicket}
                profile={profile}
                hasTask={hasTask}
                onTicketUpdated={() => setTicketRefreshKey((prev) => prev + 1)}
              />
            )}
            {view === 'ticket-detail' && selectedTicket && hasTask('View Tickets Page') && (
              <TicketDetails
                ticketId={selectedTicket.id}
                initialTicket={selectedTicket}
                profile={profile}
                hasTask={hasTask}
                onBack={() => {
                  setSelectedTicket(null);
                  setView('tickets');
                }}
              />
            )}
        {view === 'users' && hasTask('View Users Page') && <UserManagement />}
        {view === 'reports' && canViewReports && <ReportsPage profile={profile} />}
        {view === 'config' && canViewConfig && <ConfigPage />}
      </main>

          {showNewTicket && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
              <div className="bg-white w-full max-w-lg rounded-md shadow-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-700">Create New Ticket</h3>
                  <button
                    onClick={() => setShowNewTicket(false)}
                    className="text-gray-400 hover:text-gray-600 text-sm font-bold"
                  >
                    Close
                  </button>
                </div>
                {ticketMessage && <p className="mb-3 text-sm text-orange-600 font-bold">{ticketMessage}</p>}
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Department</label>
                <select
                  value={ticketForm.department}
                  onChange={(e) => setTicketForm({ ...ticketForm, department: e.target.value })}
                  className="w-full border p-2 rounded text-sm"
                  required
                >
                  {departments.length ? (
                    departments.map((dept) => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))
                  ) : (
                    <option value="Support">Support</option>
                  )}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Summary</label>
                <input
                      type="text"
                      value={ticketForm.summary}
                      onChange={(e) => setTicketForm({ ...ticketForm, summary: e.target.value })}
                      className="w-full border p-2 rounded text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Description</label>
                    <textarea
                      value={ticketForm.description}
                      onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                      className="w-full border p-2 rounded text-sm h-24 resize-none"
                      placeholder="Describe the issue"
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Priority</label>
                      <div className="space-y-2">
                        {['High', 'Medium', 'Low'].map((level) => (
                          <label key={level} className="flex items-center gap-2 text-sm text-gray-700">
                            <input
                              type="radio"
                              name="priority"
                              value={level}
                              checked={ticketForm.priority === level}
                              onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                              className="accent-orange-600"
                            />
                            {level}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category</label>
                      <select
                        value={ticketForm.category}
                        onChange={(e) => setTicketForm({ ...ticketForm, category: e.target.value })}
                        className="w-full border p-2 rounded text-sm"
                      >
                        <option value="">Select category</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Assignee</label>
                    <input
                      type="text"
                      value={ticketForm.assignee}
                      onChange={(e) => setTicketForm({ ...ticketForm, assignee: e.target.value })}
                      className="w-full border p-2 rounded text-sm"
                      placeholder="Unassigned"
                    />
                  </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Attachment</label>
                <input
                  type="file"
                  onChange={(e) => setTicketAttachment(e.target.files?.[0] || null)}
                  className="w-full text-sm"
                />
              </div>
              <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-gray-400">Creator: <span className="font-semibold text-gray-500">{displayName}</span></div>
                    <button
                      type="submit"
                      disabled={ticketSubmitting}
                      className="bg-orange-600 text-white font-bold py-2 px-4 rounded hover:bg-orange-700 text-sm disabled:opacity-60"
                    >
                      {ticketSubmitting ? 'Creating...' : 'Create Ticket'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {showPasswordPrompt && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white w-full max-w-md rounded-md shadow-lg border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-700 mb-2">Change Your Password</h3>
                <p className="text-sm text-gray-500 mb-4">You must change your password before continuing.</p>
                {passwordMessage && <p className="mb-3 text-sm text-orange-600 font-bold">{passwordMessage}</p>}
                <form onSubmit={handlePasswordUpdate} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">New Password</label>
                    <input
                      type="password"
                      value={passwordForm.password}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, password: e.target.value }))}
                      className="w-full border p-2 rounded text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirm Password</label>
                    <input
                      type="password"
                      value={passwordForm.confirm}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm: e.target.value }))}
                      className="w-full border p-2 rounded text-sm"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={passwordSubmitting}
                    className="w-full bg-orange-600 text-white font-bold py-2 px-4 rounded hover:bg-orange-700 text-sm disabled:opacity-60"
                  >
                    {passwordSubmitting ? 'Updating...' : 'Update Password'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}

export default App;

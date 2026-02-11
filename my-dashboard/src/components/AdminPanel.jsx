import React, { useState, useEffect } from 'react';
import { API_BASE } from '../config/apiBase';

const roles = ['Admin', 'Manager', 'Technician', 'User'];

const AdminPanel = ({ token, currentUser }) => {
  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('User');
  const [isSuper, setIsSuper] = useState(false);
  const [message, setMessage] = useState(null);

  if (!currentUser) return null;

  // Only Admin role or super-admin can view this panel
  if (!(currentUser.role === 'Admin' || currentUser.isSuper)) return null;

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      if (!token) return;
      const res = await fetch(`${API_BASE}/api/users`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error('Fetch users error:', err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      if (!token) {
        setMessage({ type: 'error', text: 'Not authenticated' });
        return;
      }
      const res = await fetch(`${API_BASE}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: username.trim(), password, role, isSuper }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: json?.message || 'Create failed' });
      } else {
        setMessage({ type: 'success', text: `Created ${json.user.username}` });
        setUsername('');
        setPassword('');
        setRole('User');
        setIsSuper(false);
        await fetchUsers();
      }
    } catch (err) {
      console.error('Create user error:', err);
      setMessage({ type: 'error', text: err?.message || 'Create failed' });
    }
  };

  return (
    <div style={{ padding: '1.5rem', backgroundColor: 'white', borderRadius: '0.375rem', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', marginTop: '1.5rem', marginBottom: '2rem' }}>
      <h3 style={{ fontSize: '1.125rem', fontWeight: '600', marginBottom: '1rem' }}>Admin Panel</h3>
      {!currentUser.isSuper && (
        <div style={{ fontSize: '0.875rem', color: '#dc2626', marginBottom: '0.75rem' }}>Only super admins can create users.</div>
      )}

      <form onSubmit={handleCreate} style={{ display: 'grid', gridAutoColumns: '1fr', gap: '0.75rem' }}>
        <div>
          <label style={{ fontSize: '0.875rem', color: '#374151' }}>Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} style={{ marginTop: '0.25rem', width: '100%', border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.5rem' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.875rem', color: '#374151' }}>Password</label>
          <input value={password} onChange={(e) => setPassword(e.target.value)} style={{ marginTop: '0.25rem', width: '100%', border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.5rem' }} />
        </div>
        <div>
          <label style={{ fontSize: '0.875rem', color: '#374151' }}>Role</label>
          <select value={role} onChange={(e) => setRole(e.target.value)} style={{ marginTop: '0.25rem', width: '100%', border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.5rem' }}>
            {roles.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <input id="super" type="checkbox" checked={isSuper} onChange={(e) => setIsSuper(e.target.checked)} />
          <label htmlFor="super" style={{ fontSize: '0.875rem', color: '#374151' }}>Super Admin</label>
        </div>
        <div>
          <button style={{ backgroundColor: '#16a34a', color: 'white', padding: '0.5rem 0.75rem', borderRadius: '0.375rem', border: 'none', cursor: 'pointer' }}>Create User</button>
        </div>
      </form>

      {message && (
        <div style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: message.type === 'error' ? '#dc2626' : '#16a34a' }}>{message.text}</div>
      )}

      <div style={{ marginTop: '1.5rem' }}>
        <h4 style={{ fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Existing Users</h4>
        <div>
          {users.map((u) => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid #d1d5db', borderRadius: '0.375rem', padding: '0.5rem', marginBottom: '0.5rem' }}>
              <div>
                <div style={{ fontWeight: 500 }}>{u.username} {u.isSuper ? '(super)' : ''}</div>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{u.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;

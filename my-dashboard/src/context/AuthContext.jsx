import React, { createContext, useContext, useEffect, useState } from 'react';
import { API_BASE } from '../config/apiBase';

const AuthContext = createContext(null);

const TOKEN_KEY = 'my_dashboard_token';

// api helper that attempts refresh once on 401
async function api(path, options = {}) {
  const url = `${API_BASE}${path}`;
  const opts = { ...options };
  if (!opts.headers) opts.headers = {};
  // include credentials so refresh cookie is sent/received
  opts.credentials = 'include';
  let res = await fetch(url, opts);
  if (res.status === 401 && path !== '/api/auth/refresh') {
    // try refresh
    const r = await fetch(`${API_BASE}/api/auth/refresh`, { method: 'POST', credentials: 'include' });
    if (r.ok) {
      const json = await r.json();
      // store new token in localStorage for access usage
      localStorage.setItem(TOKEN_KEY, json.token);
      setToken(json.token);
      setCurrentUser(json.user);
      // retry original
      res = await fetch(url, opts);
    }
  }
  const text = await res.text();
  try {
    const json = text ? JSON.parse(text) : {};
    if (!res.ok) throw json;
    return json;
  } catch (err) {
    throw err;
  }
}

export const AuthProvider = ({ children }) => {
  const [users, setUsers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    try {
      const t = localStorage.getItem(TOKEN_KEY);
      if (t) {
        setToken(t);
        // fetch current user info via users endpoint or decode token
        try {
          const parts = t.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(atob(parts[1]));
            setCurrentUser({ id: payload.id, username: payload.username, role: payload.role, isSuper: payload.isSuper });
          }
        } catch (e) {
          console.error('Token decode error:', e);
          setCurrentUser(null);
        }
      }
    } catch (err) {
      console.error('AuthProvider useEffect error:', err);
    }
  }, []);

  const login = async (username, password) => {
    try {
      const url = `${API_BASE}/api/auth/login`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        return { ok: false, message: err?.message || 'Login failed' };
      }
      const json = await res.json();
      setToken(json.token);
      localStorage.setItem(TOKEN_KEY, json.token);
      setCurrentUser(json.user);
      return { ok: true, user: json.user };
    } catch (err) {
      return { ok: false, message: err?.message || 'Login failed' };
    }
  };

  const logout = () => {
    // call backend to clear refresh token
    try { fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' }); } catch (e) {}
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem(TOKEN_KEY);
  };

  const fetchUsers = async () => {
    if (!token) return [];
    const res = await fetch(`${API_BASE}/api/users`, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw await res.json();
    const data = await res.json();
    setUsers(data);
    return data;
  };

  const createUser = async ({ username, password, role, isSuper = false }) => {
    if (!token) return { ok: false, message: 'Not authenticated' };
    try {
      const res = await fetch(`${API_BASE}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username, password, role, isSuper }),
      });
      const json = await res.json();
      if (!res.ok) return { ok: false, message: json?.message || 'Create failed' };
      // refresh list
      await fetchUsers();
      return { ok: true, user: json.user };
    } catch (err) {
      return { ok: false, message: err?.message || 'Create failed' };
    }
  };

  const value = {
    users,
    currentUser,
    login,
    logout,
    createUser,
    fetchUsers,
    token,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  return useContext(AuthContext);
};

export default AuthContext;

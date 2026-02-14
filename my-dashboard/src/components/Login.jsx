import React, { useState } from 'react';
import { API_BASE } from '../config/apiBase';

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loginUrl = `${API_BASE}/api/auth/login`;
      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const contentType = (response.headers.get('content-type') || '').toLowerCase();
      const data = contentType.includes('application/json') ? await response.json() : {};

      if (response.ok) {
        sessionStorage.setItem('token', data.token);

        if (data.user) {
          sessionStorage.setItem('username', data.user.username || 'User');
          sessionStorage.setItem('profile', JSON.stringify({
            id: data.user.id,
            username: data.user.username,
            role: data.user.role,
            firstName: data.user.firstName,
            lastName: data.user.lastName,
            email: data.user.email,
            phone: data.user.phone,
            mustChangePassword: data.user.mustChangePassword,
            tasks: data.user.tasks || [],
          }));
        } else {
          sessionStorage.setItem('username', 'User');
          sessionStorage.setItem('profile', JSON.stringify({ username: 'User' }));
        }

        onLoginSuccess(data.token, data.user);
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      const apiSource = API_BASE || (typeof window !== 'undefined' ? window.location.origin : '');
      setError(`Cannot connect to server. Verify Netlify function and API route (${apiSource}/api/health).`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded shadow-md w-96">
        <h2 className="text-2xl font-bold text-orange-600 mb-6 text-center">Namikango Help Desk</h2>
        
        {error && <div className="bg-red-100 text-red-600 p-2 mb-4 text-sm rounded">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">Username</label>
            <input
              type="text"
              className="w-full p-2 border border-gray-300 rounded focus:outline-orange-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2">Password</label>
            <input
              type="password"
              className="w-full p-2 border border-gray-300 rounded focus:outline-orange-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 text-white font-bold py-2 px-4 rounded hover:bg-orange-700 transition-colors"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;

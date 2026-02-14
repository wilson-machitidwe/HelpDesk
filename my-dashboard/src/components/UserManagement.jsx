import React, { useEffect, useState } from 'react';
import { API_BASE, apiFetchJson } from '../config/apiBase';

const roleOptions = ['Admin', 'Manager', 'Technician', 'User'];

const initialForm = {
  username: '',
  password: '',
  role: 'User',
  firstName: '',
  lastName: '',
  email: '',
  phone: ''
};

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);

  const isEditing = Boolean(editingId);

  const fetchUsers = async () => {
    const token = sessionStorage.getItem('token');
    const res = await apiFetchJson('/api/users', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = res.data;
    if (Array.isArray(data)) setUsers(data);
    else setUsers([]);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setMessage('');

    if (!isEditing && !formData.password) {
      setMessage('Password is required for new users.');
      return;
    }

    const token = sessionStorage.getItem('token');
    const url = isEditing ? `${API_BASE}/api/users/${editingId}` : `${API_BASE}/api/users`;
    const res = await fetch(url, {
      method: isEditing ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        username: formData.username,
        password: formData.password,
        role: formData.role,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone
      })
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(isEditing ? 'User updated successfully!' : 'User created successfully!');
      setFormData(initialForm);
      setEditingId(null);
      setShowForm(false);
      fetchUsers();
    } else {
      setMessage(data.message || 'Error saving user');
    }
  };

  const handleEdit = (user) => {
    setEditingId(user.id);
    setFormData({
      username: user.username || '',
      password: '',
      role: user.role || 'User',
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      email: user.email || '',
      phone: user.phone || ''
    });
    setShowForm(true);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData(initialForm);
    setMessage('');
    setShowForm(false);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Delete this user?')) return;
    const token = sessionStorage.getItem('token');
    const res = await fetch(`${API_BASE}/api/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      setMessage('User deleted successfully!');
      fetchUsers();
    } else {
      setMessage(data.message || 'Error deleting user');
    }
  };

  const handleResetPassword = async (user) => {
    const nextPassword = window.prompt(`Set a new password for "${user.username}"`);
    if (!nextPassword) return;
    setMessage('');
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/users/${user.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ password: nextPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Password updated successfully!');
      } else {
        setMessage(data.message || 'Error updating password');
      }
    } catch (err) {
      setMessage('Error updating password');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-md border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-gray-700 mb-2">Manage Users</h3>
        <p className="text-sm text-gray-500 mb-4">Create, edit, reset passwords, and delete user accounts.</p>

        <div className="border border-gray-200 rounded-md shadow-sm overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold">
              <tr>
                <th className="px-4 py-3">Username</th>
                <th className="px-4 py-3">First Name</th>
                <th className="px-4 py-3">Last Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {users.map((u) => (
                <tr key={u.id} className="border-t border-gray-100">
                  <td className="px-4 py-3 font-medium">{u.username}</td>
                  <td className="px-4 py-3">{u.firstName || '-'}</td>
                  <td className="px-4 py-3">{u.lastName || '-'}</td>
                  <td className="px-4 py-3">{u.email || '-'}</td>
                  <td className="px-4 py-3">{u.phone || '-'}</td>
                  <td className="px-4 py-3">{u.role || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(u)} className="text-xs font-bold text-blue-600">Edit</button>
                      <button onClick={() => handleResetPassword(u)} className="text-xs font-bold text-orange-600">Reset Password</button>
                      <button onClick={() => handleDelete(u.id)} className="text-xs font-bold text-red-600">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-start mt-4">
          <button
            type="button"
            onClick={() => {
              setMessage('');
              setEditingId(null);
              setFormData(initialForm);
              setShowForm((prev) => !prev);
            }}
            className="bg-gray-900 text-white font-bold py-2 px-4 rounded hover:bg-gray-800 text-sm"
          >
            {showForm ? 'Hide New User Form' : 'Add New User'}
          </button>
        </div>

        {!showForm && message && <p className="mt-3 text-sm text-orange-600 font-bold">{message}</p>}

        {showForm && (
          <div className="bg-white p-6 rounded-md border border-gray-200 shadow-sm mt-4">
            <h3 className="text-lg font-bold text-gray-700 mb-4">{isEditing ? 'Edit User' : 'Create New User'}</h3>
            {message && <p className="mb-4 text-sm text-orange-600 font-bold">{message}</p>}
            <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">First Name</label>
                <input type="text" value={formData.firstName} onChange={(e) => setFormData({ ...formData, firstName: e.target.value })} className="w-full border p-2 rounded text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Last Name</label>
                <input type="text" value={formData.lastName} onChange={(e) => setFormData({ ...formData, lastName: e.target.value })} className="w-full border p-2 rounded text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
                <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full border p-2 rounded text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Phone</label>
                <input type="text" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="w-full border p-2 rounded text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Username</label>
                <input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} className="w-full border p-2 rounded text-sm" required />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
                <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="w-full border p-2 rounded text-sm" placeholder={isEditing ? 'Leave blank to keep' : ''} />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Role</label>
                <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full border p-2 rounded text-sm">
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>{role}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="bg-orange-600 text-white font-bold py-2 px-4 rounded hover:bg-orange-700 text-sm">{isEditing ? 'Save' : 'Add User'}</button>
                <button type="button" onClick={handleCancelEdit} className="bg-gray-100 text-gray-700 border border-gray-300 font-bold py-2 px-4 rounded text-sm">
                  {isEditing ? 'Cancel' : 'Close'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;

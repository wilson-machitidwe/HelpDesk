import React, { useEffect, useState } from 'react';
import { API_BASE } from '../config/apiBase';

const DepartmentManager = () => {
  const [departments, setDepartments] = useState([]);
  const [departmentName, setDepartmentName] = useState('');
  const [departmentEditingId, setDepartmentEditingId] = useState(null);
  const [departmentMessage, setDepartmentMessage] = useState('');

  const fetchDepartments = async () => {
    const token = sessionStorage.getItem('token');
    const res = await fetch(`${API_BASE}/api/departments`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (Array.isArray(data)) setDepartments(data);
  };

  useEffect(() => {
    fetchDepartments();
  }, []);

  const handleSaveDepartment = async (e) => {
    e.preventDefault();
    setDepartmentMessage('');
    if (!departmentName.trim()) return;
    const token = sessionStorage.getItem('token');
    const url = departmentEditingId
      ? `${API_BASE}/api/departments/${departmentEditingId}`
      : `${API_BASE}/api/departments`;
    const res = await fetch(url, {
      method: departmentEditingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name: departmentName.trim() })
    });
    const data = await res.json();
    if (res.ok) {
      setDepartmentMessage(departmentEditingId ? 'Department updated.' : 'Department added.');
      setDepartmentName('');
      setDepartmentEditingId(null);
      fetchDepartments();
    } else {
      setDepartmentMessage(data.message || 'Error saving department');
    }
  };

  const handleEditDepartment = (department) => {
    setDepartmentName(department.name);
    setDepartmentEditingId(department.id);
  };

  const handleDeleteDepartment = async (departmentId) => {
    if (!window.confirm('Delete this department?')) return;
    const token = sessionStorage.getItem('token');
    const res = await fetch(`${API_BASE}/api/departments/${departmentId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      setDepartmentMessage('Department deleted.');
      fetchDepartments();
    } else {
      setDepartmentMessage(data.message || 'Error deleting department');
    }
  };

  return (
    <div className="bg-white p-6 rounded-md border border-gray-200 shadow-sm">
      <h3 className="text-lg font-bold text-gray-700 mb-4">Manage Departments</h3>
      {departmentMessage && <p className="mb-4 text-sm text-orange-600 font-bold">{departmentMessage}</p>}
      <form onSubmit={handleSaveDepartment} className="flex flex-col md:flex-row gap-3 items-end mb-6">
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Department Name</label>
          <input
            type="text"
            value={departmentName}
            onChange={(e) => setDepartmentName(e.target.value)}
            className="w-full border p-2 rounded text-sm"
            placeholder="e.g. Development"
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="bg-orange-600 text-white font-bold py-2 px-4 rounded hover:bg-orange-700 text-sm">
            {departmentEditingId ? 'Update' : 'Add'}
          </button>
          {departmentEditingId && (
            <button
              type="button"
              onClick={() => {
                setDepartmentEditingId(null);
                setDepartmentName('');
              }}
              className="bg-gray-100 text-gray-700 border border-gray-300 font-bold py-2 px-4 rounded text-sm"
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="border border-gray-200 rounded-md overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold">
            <tr>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {departments.map((department) => (
              <tr key={department.id} className="border-t border-gray-100">
                <td className="px-4 py-3">{department.name}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => handleEditDepartment(department)} className="text-xs font-bold text-blue-600">Edit</button>
                    <button onClick={() => handleDeleteDepartment(department.id)} className="text-xs font-bold text-red-600">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {!departments.length && (
              <tr>
                <td colSpan="2" className="px-4 py-6 text-center text-gray-400">No departments yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DepartmentManager;

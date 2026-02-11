import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE } from '../config/apiBase';

const roleLabels = ['User', 'Technician', 'Manager', 'Admin'];

const RoleTasksManager = () => {
  const [tasks, setTasks] = useState([]);
  const [roleTasks, setRoleTasks] = useState({
    User: [],
    Technician: [],
    Manager: [],
    Admin: []
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const [taskRes, roleRes] = await Promise.all([
          fetch(`${API_BASE}/api/tasks`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`${API_BASE}/api/role-tasks`, { headers: { Authorization: `Bearer ${token}` } })
        ]);
        const taskData = await taskRes.json();
        const roleData = await roleRes.json();
        if (Array.isArray(taskData)) setTasks(taskData);
        if (Array.isArray(roleData)) {
          const next = { User: [], Technician: [], Manager: [], Admin: [] };
          roleData.forEach((rt) => {
            if (!next[rt.role]) next[rt.role] = [];
            next[rt.role].push(rt.task_id);
          });
          setRoleTasks((prev) => ({ ...prev, ...next }));
        }
      } catch (err) {
        setMessage('Failed to load role tasks.');
      }
    };
    fetchData();
  }, []);

  const toggleRoleTask = (role, taskId) => {
    setRoleTasks((prev) => {
      const current = prev[role] || [];
      const exists = current.includes(taskId);
      return {
        ...prev,
        [role]: exists ? current.filter((id) => id !== taskId) : [...current, taskId]
      };
    });
  };

  const saveRoleTasks = async () => {
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/role-tasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ roleTasks })
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.message || 'Failed to save role tasks.');
        return;
      }
      setMessage('Role permissions updated.');
    } catch (err) {
      setMessage('Failed to save role tasks.');
    }
  };

  const groupedTasks = useMemo(() => tasks, [tasks]);

  return (
    <div className="bg-white p-6 rounded-md border border-gray-200 shadow-sm">
      <h3 className="text-lg font-bold text-gray-700 mb-2">Tasks & Permissions</h3>
      <p className="text-sm text-gray-500 mb-4">
        Assign permissions to roles. All users inherit tasks from their role.
      </p>
      {message && <p className="mb-3 text-sm text-orange-600 font-bold">{message}</p>}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-xs uppercase text-gray-500 font-bold border-b border-gray-200">
              <th className="py-2">Role</th>
              {roleLabels.map((role) => (
                <th key={role} className="py-2 text-center">
                  <span>{role}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-sm text-gray-700">
            {groupedTasks.map((task) => (
              <tr key={task.id} className="border-b border-gray-100">
                <td className="py-3">{task.name}</td>
                {roleLabels.map((role) => {
                  const checked = (roleTasks[role] || []).includes(task.id);
                  return (
                    <td key={role} className="py-3 text-center">
                      <label className="inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleRoleTask(role, task.id)}
                          className="sr-only"
                        />
                        <span className={`w-6 h-6 inline-flex items-center justify-center border-2 rounded text-sm font-bold ${checked ? 'border-orange-600 bg-orange-50 text-orange-700' : 'border-gray-400 text-transparent'}`}>
                          ?
                        </span>
                      </label>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button
        type="button"
        onClick={saveRoleTasks}
        className="mt-4 bg-orange-600 text-white font-bold py-2 px-4 rounded hover:bg-orange-700 text-sm"
      >
        Save Role Permissions
      </button>
    </div>
  );
};

export default RoleTasksManager;

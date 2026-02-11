import React, { useEffect, useState } from 'react';
import { API_BASE } from '../config/apiBase';

const NotificationSettings = () => {
  const [notificationSettings, setNotificationSettings] = useState({
    matrix: {
      opened: { creator: true, assignee: false, technician: true, manager: true, admin: true },
      assigned: { creator: false, assignee: true, technician: false, manager: true, admin: true },
      commented: { creator: true, assignee: true, technician: false, manager: false, admin: false },
      closed: { creator: true, assignee: true, technician: true, manager: true, admin: true },
      closedDuplicate: { creator: true, assignee: true, technician: true, manager: true, admin: true },
      reopened: { creator: true, assignee: true, technician: true, manager: true, admin: true }
    }
  });
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationTestMessage, setNotificationTestMessage] = useState('');

  useEffect(() => {
    const fetchNotificationSettings = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/notifications/settings`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setNotificationSettings({
            matrix: data.matrix || notificationSettings.matrix
          });
        }
      } catch (err) {
        setNotificationMessage('Failed to load notification settings.');
      }
    };

    fetchNotificationSettings();
  }, []);

  const toggleMatrix = (eventKey, targetKey) => {
    setNotificationSettings((prev) => ({
      ...prev,
      matrix: {
        ...prev.matrix,
        [eventKey]: {
          ...prev.matrix[eventKey],
          [targetKey]: !prev.matrix[eventKey]?.[targetKey]
        }
      }
    }));
  };

  const saveNotificationSettings = async () => {
    setNotificationMessage('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/notifications/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(notificationSettings)
      });
      const data = await res.json();
      if (!res.ok) {
        setNotificationMessage(data.message || 'Failed to save settings.');
        return;
      }
      setNotificationMessage('Notification settings updated.');
    } catch (err) {
      setNotificationMessage('Failed to save settings.');
    }
  };

  const sendTestEmail = async () => {
    setNotificationTestMessage('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/notifications/test`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        setNotificationTestMessage(data.message || 'Failed to send test email.');
        return;
      }
      setNotificationTestMessage('Test email sent.');
    } catch (err) {
      setNotificationTestMessage('Failed to send test email.');
    }
  };

  return (
    <div className="bg-white p-6 rounded-md border border-gray-200 shadow-sm">
      <h3 className="text-lg font-bold text-gray-700 mb-2">Notification Settings</h3>
      <p className="text-sm text-gray-500 mb-4">Choose who receives email notifications for ticket activity.</p>
      {notificationMessage && <p className="mb-3 text-sm text-orange-600 font-bold">{notificationMessage}</p>}

      <div className="overflow-x-auto mb-4">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-xs uppercase text-gray-500 font-bold border-b border-gray-200">
              <th className="py-2">Condition</th>
              <th className="py-2 text-center">Creator</th>
              <th className="py-2 text-center">Assignee</th>
              <th className="py-2 text-center">Technician</th>
              <th className="py-2 text-center">Manager</th>
              <th className="py-2 text-center">Admin</th>
            </tr>
          </thead>
          <tbody className="text-sm text-gray-700">
            {[
              { key: 'opened', label: 'Ticket is opened' },
              { key: 'assigned', label: 'Ticket is assigned' },
              { key: 'commented', label: 'Comments made on ticket' },
              { key: 'closed', label: 'Ticket is closed' },
              { key: 'closedDuplicate', label: 'Ticket is closed as duplicate' },
              { key: 'reopened', label: 'Ticket is re-opened' }
            ].map((row) => (
              <tr key={row.key} className="border-b border-gray-100">
                <td className="py-3">{row.label}</td>
                {['creator', 'assignee', 'technician', 'manager', 'admin'].map((target) => (
                  <td key={target} className="py-3 text-center">
                    <label className="inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!notificationSettings.matrix?.[row.key]?.[target]}
                        onChange={() => toggleMatrix(row.key, target)}
                        className="sr-only"
                      />
                      <span className={`w-10 h-5 flex items-center rounded-full p-1 transition-colors ${notificationSettings.matrix?.[row.key]?.[target] ? 'bg-green-500' : 'bg-gray-300'}`}>
                        <span className={`bg-white w-4 h-4 rounded-full shadow transform transition-transform ${notificationSettings.matrix?.[row.key]?.[target] ? 'translate-x-5' : 'translate-x-0'}`} />
                      </span>
                    </label>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <button
        type="button"
        onClick={saveNotificationSettings}
        className="bg-orange-600 text-white font-bold py-2 px-4 rounded hover:bg-orange-700 text-sm"
      >
        Save Notification Settings
      </button>
      <button
        type="button"
        onClick={sendTestEmail}
        className="ml-2 bg-gray-900 text-white font-bold py-2 px-4 rounded hover:bg-gray-800 text-sm"
      >
        Send Test Email
      </button>
      {notificationTestMessage && (
        <p className="mt-3 text-sm text-gray-600">{notificationTestMessage}</p>
      )}
    </div>
  );
};

export default NotificationSettings;

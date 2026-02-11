import React, { useEffect, useState } from 'react';
import { API_BASE } from '../config/apiBase';

const eventRows = [
  { key: 'opened', label: 'Ticket is opened' },
  { key: 'assigned', label: 'Ticket is assigned' },
  { key: 'commented', label: 'Comments made on ticket' },
  { key: 'closed', label: 'Ticket is closed' },
  { key: 'closedDuplicate', label: 'Ticket is closed as duplicate' },
  { key: 'reopened', label: 'Ticket is re-opened' }
];

const defaultMatrix = {
  opened: { creator: true, assignee: false, technician: true, manager: true, admin: true },
  assigned: { creator: false, assignee: true, technician: false, manager: true, admin: true },
  commented: { creator: true, assignee: true, technician: false, manager: false, admin: false },
  closed: { creator: true, assignee: true, technician: true, manager: true, admin: true },
  closedDuplicate: { creator: true, assignee: true, technician: true, manager: true, admin: true },
  reopened: { creator: true, assignee: true, technician: true, manager: true, admin: true }
};

const defaultTemplates = {
  opened: { subject: 'New Ticket #{ticketId}: {summary}', body: 'Event: opened\nTicket ID: {ticketId}\nSummary: {summary}\nDepartment: {department}\nStatus: {status}\nPriority: {priority}\nCategory: {category}\nAssignee: {assignee}\nActor: {actor}' },
  assigned: { subject: 'Ticket Assigned #{ticketId}: {summary}', body: 'Event: assigned\nTicket ID: {ticketId}\nSummary: {summary}\nDepartment: {department}\nStatus: {status}\nPriority: {priority}\nCategory: {category}\nAssignee: {assignee}\nActor: {actor}' },
  commented: { subject: 'New Comment on Ticket #{ticketId}', body: 'Event: commented\nTicket ID: {ticketId}\nSummary: {summary}\nDepartment: {department}\nStatus: {status}\nPriority: {priority}\nCategory: {category}\nAssignee: {assignee}\nActor: {actor}\nComment: {comment}' },
  closed: { subject: 'Ticket Closed #{ticketId}: {summary}', body: 'Event: closed\nTicket ID: {ticketId}\nSummary: {summary}\nDepartment: {department}\nStatus: {status}\nPriority: {priority}\nCategory: {category}\nAssignee: {assignee}\nActor: {actor}' },
  closedDuplicate: { subject: 'Ticket Closed as Duplicate #{ticketId}: {summary}', body: 'Event: closedDuplicate\nTicket ID: {ticketId}\nSummary: {summary}\nDepartment: {department}\nStatus: {status}\nPriority: {priority}\nCategory: {category}\nAssignee: {assignee}\nActor: {actor}' },
  reopened: { subject: 'Ticket Reopened #{ticketId}: {summary}', body: 'Event: reopened\nTicket ID: {ticketId}\nSummary: {summary}\nDepartment: {department}\nStatus: {status}\nPriority: {priority}\nCategory: {category}\nAssignee: {assignee}\nActor: {actor}' }
};

const NotificationSettings = () => {
  const [notificationSettings, setNotificationSettings] = useState({
    matrix: defaultMatrix,
    templates: defaultTemplates
  });
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationTestMessage, setNotificationTestMessage] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('opened');

  useEffect(() => {
    const fetchNotificationSettings = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/api/notifications/settings`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (res.ok) {
          setNotificationSettings({
            matrix: data.matrix || defaultMatrix,
            templates: data.templates || defaultTemplates
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

  const updateTemplate = (eventKey, field, value) => {
    setNotificationSettings((prev) => ({
      ...prev,
      templates: {
        ...prev.templates,
        [eventKey]: {
          ...(prev.templates?.[eventKey] || defaultTemplates[eventKey]),
          [field]: value
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
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
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
        headers: { Authorization: `Bearer ${token}` }
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

  const template = notificationSettings.templates?.[selectedEvent] || defaultTemplates[selectedEvent];

  return (
    <div className="bg-white p-6 rounded-md border border-gray-200 shadow-sm">
      <h3 className="text-lg font-bold text-gray-700 mb-2">Notification Settings</h3>
      <p className="text-sm text-gray-500 mb-4">Choose recipients and customize email content per event (Admin-only configuration).</p>
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
            {eventRows.map((row) => (
              <tr key={row.key} className="border-b border-gray-100">
                <td className="py-3">{row.label}</td>
                {['creator', 'assignee', 'technician', 'manager', 'admin'].map((target) => {
                  const checked = !!notificationSettings.matrix?.[row.key]?.[target];
                  return (
                    <td key={target} className="py-3 text-center">
                      <label className="inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={checked} onChange={() => toggleMatrix(row.key, target)} className="sr-only" />
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

      <div className="bg-gray-50 border border-gray-200 rounded-md p-4 space-y-3 mb-4">
        <h4 className="text-sm font-bold text-gray-700">Email Template Editor</h4>
        <p className="text-xs text-gray-500">Available placeholders: {'{ticketId}'}, {'{summary}'}, {'{department}'}, {'{status}'}, {'{priority}'}, {'{category}'}, {'{assignee}'}, {'{actor}'}, {'{comment}'}.</p>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Event</label>
          <select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)} className="w-full md:w-72 border p-2 rounded text-sm">
            {eventRows.map((row) => (
              <option key={row.key} value={row.key}>{row.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Subject</label>
          <input type="text" value={template.subject || ''} onChange={(e) => updateTemplate(selectedEvent, 'subject', e.target.value)} className="w-full border p-2 rounded text-sm" />
        </div>
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Body</label>
          <textarea value={template.body || ''} onChange={(e) => updateTemplate(selectedEvent, 'body', e.target.value)} className="w-full border p-2 rounded text-sm h-36 resize-y" />
        </div>
      </div>

      <button type="button" onClick={saveNotificationSettings} className="bg-orange-600 text-white font-bold py-2 px-4 rounded hover:bg-orange-700 text-sm">Save Notification Settings</button>
      <button type="button" onClick={sendTestEmail} className="ml-2 bg-gray-900 text-white font-bold py-2 px-4 rounded hover:bg-gray-800 text-sm">Send Test Email</button>
      {notificationTestMessage && <p className="mt-3 text-sm text-gray-600">{notificationTestMessage}</p>}
    </div>
  );
};

export default NotificationSettings;

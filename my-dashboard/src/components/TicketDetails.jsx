import React, { useEffect, useState } from 'react';
import { API_BASE } from '../config/apiBase';

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
};

const TicketDetails = ({ ticketId, initialTicket, profile, hasTask, onBack }) => {
  const [ticket, setTicket] = useState(initialTicket || null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editForm, setEditForm] = useState({
    department: 'Support',
    summary: '',
    description: '',
    status: 'Open',
    priority: 'Medium',
    category: '',
    assignee: ''
  });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [comments, setComments] = useState([]);
  const [commentBody, setCommentBody] = useState('');
  const [commentMessage, setCommentMessage] = useState('');
  const [commentLoading, setCommentLoading] = useState(false);
  const [commentAttachment, setCommentAttachment] = useState(null);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const isAdmin = profile?.role === 'Admin';

  const canModify = profile?.role !== 'User' && hasTask && hasTask('Modify Tickets');
  const canClose = profile?.role !== 'User' && hasTask && hasTask('Close Tickets');
  const canDeleteTicket = isAdmin && hasTask && hasTask('Delete Tickets');
  const canComment = hasTask && hasTask('Comment on Tickets');
  const canAssignOthers = canModify && (profile?.role === 'Admin' || profile?.role === 'Manager');

  const fetchAttachmentBlob = async (attachmentId) => {
    const token = sessionStorage.getItem('token');
    const response = await fetch(`${API_BASE}/api/attachments/${attachmentId}/download`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) {
      let message = 'Failed to load attachment.';
      try {
        const data = await response.json();
        message = data?.message || message;
      } catch (err) {
        // ignore non-JSON error bodies
      }
      throw new Error(message);
    }
    return response.blob();
  };

  const handleViewAttachment = async (attachmentId) => {
    try {
      const blob = await fetchAttachmentBlob(attachmentId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener,noreferrer');
      setTimeout(() => URL.revokeObjectURL(url), 60 * 1000);
    } catch (err) {
      setCommentMessage(err?.message || 'Failed to open attachment.');
    }
  };

  const handleDownloadAttachment = async (attachmentId, originalName) => {
    try {
      const blob = await fetchAttachmentBlob(attachmentId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = originalName || `attachment-${attachmentId}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      setCommentMessage(err?.message || 'Failed to download attachment.');
    }
  };

  useEffect(() => {
    const fetchTicket = async () => {
      if (!ticketId) return;
      setLoading(true);
      setError('');
      try {
        const token = sessionStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/tickets/${ticketId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (!response.ok) {
          setError(data.message || 'Failed to load ticket.');
          return;
        }
        setTicket(data);
      } catch (err) {
        setError('Failed to load ticket.');
      } finally {
        setLoading(false);
      }
    };

    fetchTicket();
  }, [ticketId]);

  useEffect(() => {
    if (ticket) {
      setEditForm({
        department: ticket.department || 'Support',
        summary: ticket.summary || '',
        description: ticket.description || '',
        status: ticket.status || 'Open',
        priority: ticket.priority || 'Medium',
        category: ticket.category || '',
        assignee: ticket.assignee || ''
      });
    }
  }, [ticket?.id]);

  useEffect(() => {
    const fetchComments = async () => {
      if (!ticketId) return;
      try {
        const token = sessionStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/tickets/${ticketId}/comments`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok && Array.isArray(data)) {
          setComments(data);
        }
      } catch (err) {
        setComments([]);
      }
    };

    fetchComments();
  }, [ticketId]);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const token = sessionStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/departments`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (Array.isArray(data)) {
          setDepartments(data);
        }
      } catch (err) {
        setDepartments([]);
      }
    };

    fetchDepartments();
  }, []);

  useEffect(() => {
    const fetchAssignableUsers = async () => {
      if (!canAssignOthers) return;
      try {
        const token = sessionStorage.getItem('token');
        const response = await fetch(`${API_BASE}/api/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok && Array.isArray(data)) {
          setAssignableUsers(data);
        }
      } catch (err) {
        setAssignableUsers([]);
      }
    };

    fetchAssignableUsers();
  }, [canAssignOthers]);

  const handleSave = async () => {
    setSaveMessage('');
    setSaving(true);
    try {
      const token = sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          department: editForm.department,
          summary: editForm.summary,
          description: editForm.description,
          status: editForm.status,
          priority: editForm.priority,
          category: editForm.category,
          assignee: editForm.assignee
        })
      });
      const data = await response.json();
      if (!response.ok) {
        setSaveMessage(data.message || 'Failed to update ticket.');
        return;
      }
      setTicket((prev) => ({ ...prev, ...editForm }));
      setSaveMessage('Ticket updated.');
    } catch (err) {
      setSaveMessage('Failed to update ticket.');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = async () => {
    setEditForm((prev) => ({ ...prev, status: 'Closed' }));
    await handleSave();
  };

  const handleDeleteTicket = async () => {
    const ok = window.confirm(`Delete ticket #${ticketId}? This cannot be undone.`);
    if (!ok) return;
    setSaveMessage('');
    setSaving(true);
    try {
      const token = sessionStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/tickets/${ticketId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        setSaveMessage(data.message || 'Failed to delete ticket.');
        return;
      }
      onBack();
    } catch (err) {
      setSaveMessage('Failed to delete ticket.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddComment = async () => {
    if (!commentBody.trim()) return;
    setCommentMessage('');
    setCommentLoading(true);
    try {
      const token = sessionStorage.getItem('token');
      const formData = new FormData();
      formData.append('body', commentBody);
      if (commentAttachment) formData.append('attachment', commentAttachment);
      const response = await fetch(`${API_BASE}/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      const data = await response.json();
      if (!response.ok) {
        setCommentMessage(data.message || 'Failed to add comment.');
        return;
      }
      setCommentBody('');
      setCommentAttachment(null);
      const refreshed = await fetch(`${API_BASE}/api/tickets/${ticketId}/comments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const refreshedData = await refreshed.json();
      if (refreshed.ok && Array.isArray(refreshedData)) {
        setComments(refreshedData);
      }
    } catch (err) {
      setCommentMessage('Failed to add comment.');
    } finally {
      setCommentLoading(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!isAdmin) return;
    const ok = window.confirm('Delete this attachment?');
    if (!ok) return;
    try {
      const token = sessionStorage.getItem('token');
      const res = await fetch(`${API_BASE}/api/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const refreshed = await fetch(`${API_BASE}/api/tickets/${ticketId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const refreshedData = await refreshed.json();
      if (refreshed.ok) setTicket(refreshedData);
      const refreshedComments = await fetch(`${API_BASE}/api/tickets/${ticketId}/comments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const refreshedCommentsData = await refreshedComments.json();
      if (refreshedComments.ok && Array.isArray(refreshedCommentsData)) {
        setComments(refreshedCommentsData);
      }
    } catch (err) {
      // silent
    }
  };

  if (loading && !ticket) {
    return (
      <div className="px-6 pb-10">
        <div className="bg-white border border-gray-200 rounded-md shadow-sm p-6 text-gray-500">
          Loading ticket...
        </div>
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="px-6 pb-10">
        <div className="bg-white border border-gray-200 rounded-md shadow-sm p-6 text-gray-500">
          {error || 'Ticket not found.'}
        </div>
      </div>
    );
  }

  return (
    <div className="px-6 pb-10">
      <div className="bg-white border border-gray-200 rounded-md shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-700">Ticket #{ticket.id}</h2>
            <p className="text-sm text-gray-400">Created {formatDate(ticket.createdAt)}</p>
            <p className="text-xs text-gray-500 mt-1">Department: <span className="font-semibold text-gray-700">{ticket.department || '-'}</span></p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-semibold">Status: {ticket.status || '-'}</span>
              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-semibold">Priority: {ticket.priority || '-'}</span>
              <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-semibold">Assignee: {ticket.assignee || '-'}</span>
            </div>
          </div>
          <button
            onClick={onBack}
            className="bg-gray-100 text-gray-700 border border-gray-300 px-4 py-2 rounded text-xs font-bold uppercase hover:bg-gray-200"
          >
            Back to Tickets
          </button>
        </div>
        {error && (
          <div className="mb-4 text-sm text-orange-600 font-bold">
            {error}
          </div>
        )}
        {saveMessage && (
          <div className="mb-4 text-sm text-orange-600 font-bold">
            {saveMessage}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">Department</div>
              {canModify ? (
                <select
                  value={editForm.department}
                  onChange={(e) => setEditForm({ ...editForm, department: e.target.value })}
                  className="w-full border p-2 rounded text-sm"
                >
                  {departments.length ? (
                    departments.map((dept) => (
                      <option key={dept.id} value={dept.name}>{dept.name}</option>
                    ))
                  ) : (
                    <option value="Support">Support</option>
                  )}
                </select>
              ) : (
                <div className="text-sm font-semibold text-gray-800">{ticket.department || '-'}</div>
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">Summary</div>
              {canModify ? (
                <input
                  type="text"
                  value={editForm.summary}
                  onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })}
                  className="w-full border p-2 rounded text-sm"
                />
              ) : (
                <div className="text-lg font-semibold text-gray-800">{ticket.summary}</div>
              )}
            </div>
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">Description</div>
              {canModify ? (
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full border p-2 rounded text-sm h-28 resize-none"
                />
              ) : (
                <div className="text-sm text-gray-700 whitespace-pre-line">
                  {ticket.description || 'No description provided.'}
                </div>
              )}
            </div>
            {Array.isArray(ticket.attachments) && ticket.attachments.length > 0 && (
              <div>
                <div className="text-xs font-bold text-gray-500 uppercase mb-1">Attachments</div>
                <ul className="space-y-1 text-sm">
                  {ticket.attachments.map((att) => (
                    <li key={att.id} className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleViewAttachment(att.id)}
                        className="text-orange-600 hover:underline"
                      >
                        {att.originalName}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadAttachment(att.id, att.originalName)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        Download
                      </button>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => handleDeleteAttachment(att.id)}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          Delete
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {canModify && (
              <div className="flex gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="bg-orange-600 text-white font-bold py-2 px-4 rounded hover:bg-orange-700 text-sm disabled:opacity-60"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                {canClose && editForm.status !== 'Closed' && (
                  <button
                    onClick={handleClose}
                    disabled={saving}
                    className="bg-gray-900 text-white font-bold py-2 px-4 rounded hover:bg-gray-800 text-sm disabled:opacity-60"
                  >
                    Close Ticket
                  </button>
                )}
                {canDeleteTicket && (
                  <button
                    onClick={handleDeleteTicket}
                    disabled={saving}
                    className="bg-red-600 text-white font-bold py-2 px-4 rounded hover:bg-red-700 text-sm disabled:opacity-60"
                  >
                    Delete Ticket
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <div className="text-xs font-bold text-gray-500 uppercase mb-2">Details</div>
              <div className="space-y-3 text-sm text-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Status</span>
                  {canModify ? (
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="border p-1 rounded text-xs"
                    >
                      <option value="Open">Open</option>
                      <option value="Closed">Closed</option>
                      <option value="Closed (Duplicate)">Closed (Duplicate)</option>
                    </select>
                  ) : (
                    <span className="font-semibold">{ticket.status || '-'}</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Department</span>
                  <span className="font-semibold">{ticket.department || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Priority</span>
                  {canModify ? (
                    <select
                      value={editForm.priority}
                      onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                      className="border p-1 rounded text-xs"
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  ) : (
                    <span className="font-semibold">{ticket.priority || '-'}</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Category</span>
                  {canModify ? (
                    <input
                      type="text"
                      value={editForm.category}
                      onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                      className="border p-1 rounded text-xs w-28 text-right"
                    />
                  ) : (
                    <span className="font-semibold">{ticket.category || '-'}</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Creator</span>
                  <span className="font-semibold">{ticket.creator || '-'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Assignee</span>
                  {canAssignOthers ? (
                    <select
                      value={editForm.assignee || ''}
                      onChange={(e) => setEditForm({ ...editForm, assignee: e.target.value })}
                      className="border p-1 rounded text-xs w-32 text-right"
                    >
                      <option value="">Unassigned</option>
                      {assignableUsers
                        .filter((u) => u?.username && u.username !== profile?.username)
                        .map((u) => (
                          <option key={u.id} value={u.username}>{u.username}</option>
                        ))}
                      {assignableUsers.some((u) => u?.username === profile?.username) && (
                        <option value={profile?.username}>{profile?.username} (You)</option>
                      )}
                    </select>
                  ) : canModify ? (
                    <input
                      type="text"
                      value={editForm.assignee}
                      onChange={(e) => setEditForm({ ...editForm, assignee: e.target.value })}
                      className="border p-1 rounded text-xs w-28 text-right"
                    />
                  ) : (
                    <span className="font-semibold">{ticket.assignee || '-'}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="bg-white border border-dashed border-gray-200 rounded-md p-4">
              <div className="text-xs font-bold text-gray-500 uppercase mb-2">Activity</div>
              {comments.length === 0 && (
                <p className="text-sm text-gray-400">No comments yet.</p>
              )}
              <div className="space-y-3">
                {comments.map((comment) => (
                  <div key={comment.id} className="text-sm text-gray-700 border-b border-gray-100 pb-2">
                    <div className="text-xs text-gray-500 mb-1">
                      {comment.author} · {formatDate(comment.createdAt)}
                    </div>
                      <div className="whitespace-pre-line">{comment.body}</div>
                    {Array.isArray(comment.attachments) && comment.attachments.length > 0 && (
                      <div className="mt-2">
                        {comment.attachments.map((att) => (
                          <div key={att.id} className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleViewAttachment(att.id)}
                              className="text-xs text-orange-600 hover:underline"
                            >
                              {att.originalName}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadAttachment(att.id, att.originalName)}
                              className="text-xs text-gray-500 hover:text-gray-700"
                            >
                              Download
                            </button>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => handleDeleteAttachment(att.id)}
                                className="text-xs text-red-600 hover:text-red-700"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {canComment && (
                <div className="mt-4 space-y-2">
                  {commentMessage && <div className="text-xs text-orange-600 font-bold">{commentMessage}</div>}
                  <textarea
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    className="w-full border p-2 rounded text-sm h-20 resize-none"
                    placeholder="Add a comment..."
                  />
                  <input
                    type="file"
                    onChange={(e) => setCommentAttachment(e.target.files?.[0] || null)}
                    className="w-full text-sm"
                  />
                  <button
                    onClick={handleAddComment}
                    disabled={commentLoading}
                    className="bg-gray-900 text-white font-bold py-2 px-4 rounded hover:bg-gray-800 text-sm disabled:opacity-60"
                  >
                    {commentLoading ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetails;




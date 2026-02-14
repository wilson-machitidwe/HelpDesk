import React, { useEffect, useState } from 'react';
import { API_BASE } from '../config/apiBase';

const CategoryManager = () => {
  const [categories, setCategories] = useState([]);
  const [categoryName, setCategoryName] = useState('');
  const [categoryEditingId, setCategoryEditingId] = useState(null);
  const [categoryMessage, setCategoryMessage] = useState('');

  const fetchCategories = async () => {
    const token = sessionStorage.getItem('token');
    const res = await fetch(`${API_BASE}/api/categories`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (Array.isArray(data)) setCategories(data);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleSaveCategory = async (e) => {
    e.preventDefault();
    setCategoryMessage('');
    if (!categoryName.trim()) return;
    const token = sessionStorage.getItem('token');
    const url = categoryEditingId
      ? `${API_BASE}/api/categories/${categoryEditingId}`
      : `${API_BASE}/api/categories`;
    const res = await fetch(url, {
      method: categoryEditingId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name: categoryName.trim() })
    });
    const data = await res.json();
    if (res.ok) {
      setCategoryMessage(categoryEditingId ? 'Category updated.' : 'Category added.');
      setCategoryName('');
      setCategoryEditingId(null);
      fetchCategories();
    } else {
      setCategoryMessage(data.message || 'Error saving category');
    }
  };

  const handleEditCategory = (category) => {
    setCategoryName(category.name);
    setCategoryEditingId(category.id);
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Delete this category?')) return;
    const token = sessionStorage.getItem('token');
    const res = await fetch(`${API_BASE}/api/categories/${categoryId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await res.json();
    if (res.ok) {
      setCategoryMessage('Category deleted.');
      fetchCategories();
    } else {
      setCategoryMessage(data.message || 'Error deleting category');
    }
  };

  return (
    <div className="bg-white p-6 rounded-md border border-gray-200 shadow-sm">
      <h3 className="text-lg font-bold text-gray-700 mb-4">Manage Categories</h3>
      {categoryMessage && <p className="mb-4 text-sm text-orange-600 font-bold">{categoryMessage}</p>}
      <form onSubmit={handleSaveCategory} className="flex flex-col md:flex-row gap-3 items-end mb-6">
        <div className="flex-1 w-full">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Category Name</label>
          <input
            type="text"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            className="w-full border p-2 rounded text-sm"
            placeholder="e.g. Network Problem"
          />
        </div>
        <div className="flex gap-2">
          <button type="submit" className="bg-orange-600 text-white font-bold py-2 px-4 rounded hover:bg-orange-700 text-sm">
            {categoryEditingId ? 'Update' : 'Add'}
          </button>
          {categoryEditingId && (
            <button
              type="button"
              onClick={() => {
                setCategoryEditingId(null);
                setCategoryName('');
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
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id} className="border-t border-gray-100">
                <td className="px-4 py-3">{category.name}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => handleEditCategory(category)} className="text-xs font-bold text-blue-600">Edit</button>
                    <button onClick={() => handleDeleteCategory(category.id)} className="text-xs font-bold text-red-600">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {!categories.length && (
              <tr>
                <td colSpan="2" className="px-4 py-6 text-center text-gray-400">No categories yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CategoryManager;

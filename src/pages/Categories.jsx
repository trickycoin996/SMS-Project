import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { mockApi } from '../services/mockApi';
import { validateRequiredString, validateOptionalString } from '../utils/validation';
import './Products.css';

const Categories = () => {
    const { token } = useContext(AuthContext);
    const { showToast } = useContext(ToastContext);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({ name: '', description: '' });

    const fetchCategories = async () => {
        setLoading(true);
        try {
            const res = await mockApi.getCategories();

            if (res.ok) {
                const data = await res.json();
                setCategories(data.categories || []);
            }
        } catch (err) {
            console.error('Error fetching categories:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchCategories();
    }, [token]);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAddCategory = async (e) => {
        e.preventDefault();
        const validationError = validateRequiredString(formData.name, 'Category name')
            || validateOptionalString(formData.description, 'Description');
        if (validationError) {
            showToast(validationError, 'error');
            return;
        }
        try {
            const res = await mockApi.addCategory({
                name: formData.name.trim(),
                description: formData.description.trim()
            });

            if (res.ok) {
                setFormData({ name: '', description: '' });
                setShowAddForm(false);
                showToast('Category added successfully!', 'success');
                fetchCategories(); // Refresh list
            } else {
                const err = await res.json();
                showToast(`Error: ${err.error}`, 'error');
            }
        } catch (err) {
            console.error('Failed to add category', err);
            showToast('Failed to add category', 'error');
        }
    };

    if (loading) return <div className="loading-state">Loading categories...</div>;

    return (
        <div className="products-container">
            <div className="page-header">
                <div>
                    <h1>Categories Management</h1>
                    <p>Organize your products into logical groups</p>
                </div>
                <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
                    {showAddForm ? 'Cancel' : '+ Add New Category'}
                </button>
            </div>

            {showAddForm && (
                <div className="products-table-container add-product-form">
                    <h3>Add New Category</h3>
                    <form onSubmit={handleAddCategory} className="grid-form">
                        <div className="form-group">
                            <label>Category Name</label>
                            <input type="text" name="name" value={formData.name} onChange={handleInputChange} required />
                        </div>
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label>Description (Optional)</label>
                            <input type="text" name="description" value={formData.description} onChange={handleInputChange} />
                        </div>
                        <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
                            <button type="submit" className="btn-primary">Save Category</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="products-table-container">
                {categories.length === 0 ? (
                    <div className="empty-state">No categories found. Start by adding one!</div>
                ) : (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Name</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.map(c => (
                                    <tr key={c.id}>
                                        <td className="text-muted">#{c.id}</td>
                                        <td className="font-semibold text-primary">{c.name}</td>
                                        <td>{c.description || <span className="text-muted italic">No description</span>}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Categories;

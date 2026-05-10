// Expenses page: allows logging and listing of store expenses
import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { mockApi } from '../services/mockApi';
import './Products.css';

const Expenses = () => {
    const { token } = useContext(AuthContext); // token: JWT for authenticating API calls
    const [expenses, setExpenses] = useState([]); // expenses: list of recorded expenses
    const [loading, setLoading] = useState(true); // loading: spinner state for initial load
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');
    const [showForm, setShowForm] = useState(false); // showForm: toggles add-expense form visibility
    const [formData, setFormData] = useState({
        date: '', // date: expense date
        amount: '', // amount: expense amount
        category: '', // category: expense category (Rent, Utilities, etc.)
        vendor: '', // vendor: who the payment was made to
        description: '' // description: optional extra notes
    });

    const fetchExpenses = async () => {
        setLoading(true);
        try {
            const res = await mockApi.getExpenses();
            if (res.ok) {
                const data = await res.json();
                setExpenses(data.expenses || []);
            }
        } catch (err) {
            console.error('Error fetching expenses:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchExpenses();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value }); // update relevant field in expense form state
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await mockApi.addExpense(formData);
            const data = await res.json();
            if (!res.ok) {
                alert(data.error || 'Failed to log expense');
                return;
            }
            setFormData({
                date: '',
                amount: '',
                category: '',
                vendor: '',
                description: ''
            });
            setShowForm(false);
            fetchExpenses();
        } catch (err) {
            console.error('Error logging expense:', err);
        }
    };

    if (loading) return <div className="loading-state">Loading expenses...</div>;

    const filteredExpenses = expenses.filter(exp => {
        const vendor = exp.vendor || '';
        const desc = exp.description || '';
        const matchesSearch = vendor.toLowerCase().includes(searchTerm.toLowerCase()) || desc.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCat = categoryFilter === 'All' ? true : exp.category === categoryFilter;
        return matchesSearch && matchesCat;
    });

    return (
        <div className="products-container">
            <div className="page-header">
                <div>
                    <h1>Expenses</h1>
                    <p>Track business expenses with simple categorization</p>
                </div>
                <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Cancel' : '+ Log Expense'}
                </button>
            </div>

            {!showForm && (
                <div style={{display: 'flex', gap: '1rem', marginBottom: '1.5rem'}}>
                    <input 
                        type="text" 
                        placeholder="Search expenses by vendor or description..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)'}}
                    />
                    <select 
                        value={categoryFilter} 
                        onChange={e => setCategoryFilter(e.target.value)}
                        style={{width: '200px', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)'}}
                    >
                        <option value="All">All Categories</option>
                        <option value="Rent">Rent</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Supplies">Supplies</option>
                        <option value="Marketing">Marketing</option>
                        <option value="Travel">Travel</option>
                        <option value="Other">Other</option>
                    </select>
                </div>
            )}

            {showForm && (
                <div className="glass-panel add-product-form">
                    <h3>New Expense</h3>
                    <form onSubmit={handleSubmit} className="grid-form">
                        <div className="form-group">
                            <label>Date</label>
                            <input
                                type="date"
                                name="date"
                                value={formData.date}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Amount</label>
                            <input
                                type="number"
                                step="0.01"
                                name="amount"
                                value={formData.amount}
                                onChange={handleChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Category</label>
                            <select
                                name="category"
                                value={formData.category}
                                onChange={handleChange}
                                required
                            >
                                <option value="" disabled>
                                    Select category...
                                </option>
                                <option value="Rent">Rent</option>
                                <option value="Utilities">Utilities</option>
                                <option value="Supplies">Supplies</option>
                                <option value="Marketing">Marketing</option>
                                <option value="Travel">Travel</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Vendor</label>
                            <input
                                type="text"
                                name="vendor"
                                value={formData.vendor}
                                onChange={handleChange}
                                placeholder="Optional"
                            />
                        </div>
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label>Description</label>
                            <input
                                type="text"
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Optional"
                            />
                        </div>
                        <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
                            <button type="submit" className="btn-primary">
                                Save Expense
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="products-table-container">
                {expenses.length === 0 ? (
                    <div className="empty-state">No expenses logged yet.</div>
                ) : (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Category</th>
                                    <th>Vendor</th>
                                    <th>Description</th>
                                    <th>Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredExpenses.map((exp) => (
                                    <tr key={exp.id}>
                                        <td className="text-muted">{exp.date?.slice(0, 10)}</td>
                                        <td className="badge category-badge">{exp.category}</td>
                                        <td>{exp.vendor || '-'}</td>
                                        <td>{exp.description || '-'}</td>
                                        <td>${Number(exp.amount || 0).toFixed(2)}</td>
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

export default Expenses;


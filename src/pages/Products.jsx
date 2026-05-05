import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { mockApi } from '../services/mockApi';
import './Products.css';

const Products = () => {
    const { token } = useContext(AuthContext);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('All');

    // Form state
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({
        name: '', sku: '', category_id: '', price: '', quantity: ''
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [prodRes, catRes] = await Promise.all([
                mockApi.getProducts(),
                mockApi.getCategories()
            ]);

            if (prodRes.ok && catRes.ok) {
                const prodData = await prodRes.json();
                const catData = await catRes.json();
                setProducts(prodData.products || []);
                setCategories(catData.categories || []);
            }
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) fetchData();
    }, [token]);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleAddProduct = async (e) => {
        e.preventDefault();
        try {
            const res = await mockApi.addProduct(formData);

            if (res.ok) {
                setFormData({ name: '', sku: '', category_id: '', price: '', quantity: '' });
                setShowAddForm(false);
                fetchData(); // Refresh list
            } else {
                const err = await res.json();
                alert(`Error: ${err.error}`);
            }
        } catch (err) {
            console.error('Failed to add product', err);
        }
    };

    const handleTransaction = async (productId, type, qty) => {
        try {
            const res = await mockApi.addTransaction({ product_id: productId, type, quantity: Number(qty) });

            if (res.ok) {
                fetchData();
            } else {
                const err = await res.json();
                alert(`Transaction failed: ${err.error}`);
            }
        } catch (err) {
            console.error('Transaction error', err);
        }
    };

    const [transactionQuantities, setTransactionQuantities] = useState({});

    const handleQuantityChange = (productId, val) => {
        setTransactionQuantities(prev => ({ ...prev, [productId]: val }));
    };

    const executeTransaction = async (productId, type) => {
        const qty = Number(transactionQuantities[productId]) || 0;
        if (qty <= 0) return;

        await handleTransaction(productId, type, qty);
        // Reset the input field for that product after success
        setTransactionQuantities(prev => ({ ...prev, [productId]: '' }));
    };

    if (loading) return <div className="loading-state">Loading products...</div>;

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCat = categoryFilter === 'All' ? true : String(p.category_id) === String(categoryFilter);
        return matchesSearch && matchesCat;
    });

    return (
        <div className="products-container">
            <div className="page-header">
                <div>
                    <h1>Products Management</h1>
                    <p>View, add, and manage your inventory</p>
                </div>
                <button className="btn-primary" onClick={() => setShowAddForm(!showAddForm)}>
                    {showAddForm ? 'Cancel' : '+ Add New Product'}
                </button>
            </div>

            {!showAddForm && (
                <div style={{display: 'flex', gap: '1rem', marginBottom: '1.5rem'}}>
                    <input 
                        type="text" 
                        placeholder="Search products by name or SKU..." 
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
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
            )}

            {showAddForm && (
                <div className="glass-panel add-product-form">
                    <h3>Add New Product</h3>
                    <form onSubmit={handleAddProduct} className="grid-form">
                        <div className="form-group">
                            <label>Product Name</label>
                            <input type="text" name="name" value={formData.name} onChange={handleInputChange} required />
                        </div>
                        <div className="form-group">
                            <label>SKU</label>
                            <input type="text" name="sku" value={formData.sku} onChange={handleInputChange} required />
                        </div>
                        <div className="form-group">
                            <label>Category</label>
                            <select name="category_id" value={formData.category_id} onChange={handleInputChange} required>
                                <option value="" disabled>Select category...</option>
                                {categories.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="form-group">
                            <label>Price ($)</label>
                            <input type="number" step="0.01" name="price" value={formData.price} onChange={handleInputChange} required />
                        </div>
                        <div className="form-group">
                            <label>Initial Quantity</label>
                            <input type="number" name="quantity" value={formData.quantity} onChange={handleInputChange} />
                        </div>
                        <div className="form-actions">
                            <button type="submit" className="btn-primary">Save Product</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="products-table-container">
                {products.length === 0 ? (
                    <div className="empty-state">No products found. Start by adding one!</div>
                ) : (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>SKU</th>
                                    <th>Name</th>
                                    <th>Category</th>
                                    <th>Price</th>
                                    <th>Stock</th>
                                    <th>Actions (Stock IN/OUT)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredProducts.map(p => (
                                    <tr key={p.id} className={p.quantity < 10 ? 'low-stock-row' : ''}>
                                        <td className="text-muted">{p.sku}</td>
                                        <td className="font-medium">{p.name}</td>
                                        <td><span className="badge category-badge">{p.category_name}</span></td>
                                        <td>${p.price.toFixed(2)}</td>
                                        <td>
                                            <span className={`stock-badge ${p.quantity < 10 ? 'low-stock' : 'good-stock'}`}>
                                                {p.quantity}
                                            </span>
                                        </td>
                                        <td className="action-cells custom-transaction-cell">
                                            <input
                                                type="number"
                                                min="1"
                                                placeholder="Qty"
                                                className="transaction-input"
                                                value={transactionQuantities[p.id] || ''}
                                                onChange={(e) => handleQuantityChange(p.id, e.target.value)}
                                            />
                                            <button onClick={() => executeTransaction(p.id, 'IN')} className="btn-small success" disabled={!transactionQuantities[p.id] || transactionQuantities[p.id] <= 0}>+</button>
                                            <button onClick={() => executeTransaction(p.id, 'OUT')} className="btn-small danger" disabled={!transactionQuantities[p.id] || transactionQuantities[p.id] <= 0 || p.quantity < transactionQuantities[p.id]}>-</button>
                                        </td>
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

export default Products;

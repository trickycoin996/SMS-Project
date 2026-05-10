import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { mockApi } from '../services/mockApi';
import './Dashboard.css';

// Dashboard component: shows inventory stats, financial snapshot, low stock items, and top-selling items
const Dashboard = () => {
    const { token } = useContext(AuthContext); // token: JWT used to authenticate API requests
    const [stats, setStats] = useState({ totalProducts: 0, lowStock: 0, totalCategories: 0 }); // stats: high-level inventory KPIs
    const [lowStockItems, setLowStockItems] = useState([]); // lowStockItems: list of products below threshold
    const [analytics, setAnalytics] = useState(null); // analytics: aggregated financial + top-selling data from backend
    const [loading, setLoading] = useState(true); // loading: controls initial loading state

    useEffect(() => {
        const fetchDashboardData = async () => {
            try {
                // Fetch inventory and analytics data concurrently
                const [productsRes, categoriesRes, analyticsRes] = await Promise.all([
                    mockApi.getProducts(),
                    mockApi.getCategories(),
                    mockApi.getAnalyticsSummary()
                ]);

                if (productsRes.ok && categoriesRes.ok && analyticsRes.ok) {
                    const productsData = await productsRes.json();
                    const categoriesData = await categoriesRes.json();
                    const analyticsData = await analyticsRes.json();

                    const lowStockList = productsData.products?.filter(p => p.quantity < 10) || [];
                    setLowStockItems(lowStockList);

                    setStats({
                        totalProducts: productsData.products?.length || 0,
                        lowStock: lowStockList.length,
                        totalCategories: categoriesData.categories?.length || 0
                    });
                    setAnalytics(analyticsData);
                }
            } catch (err) {
                console.error('Error fetching dashboard data:', err);
            } finally {
                setLoading(false);
            }
        };

        if (token) {
            fetchDashboardData();
        }
    }, [token]);

    if (loading) return <div className="loading-state">Loading dashboard...</div>;

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Overview</h1>
                <p>Monitor your inventory and sales trends</p>
            </header>

            <section className="dashboard-card" style={{ marginBottom: '1rem' }}>
                <h2 className="card-title">Inventory Overview</h2>
                <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', textAlign: 'center' }}>
                    <div className="stat-info">
                        <p className="stat-value text-primary">{stats.totalProducts}</p>
                        <span className="stat-subtitle">Total Products</span>
                    </div>
                    <div className="stat-info" style={{ borderLeft: '1px solid var(--border-color)', borderRight: '1px solid var(--border-color)' }}>
                        <p className="stat-value text-warning">{stats.lowStock}</p>
                        <span className="stat-subtitle">Low Stock Alerts</span>
                    </div>
                    <div className="stat-info">
                        <p className="stat-value text-success">{stats.totalCategories}</p>
                        <span className="stat-subtitle">Total Categories</span>
                    </div>
                </div>
            </section>

            {analytics && (
                <section className="dashboard-card" style={{ marginBottom: '1rem' }}>
                    <h2 className="card-title">Financial Snapshot</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
                        <div>
                            <h3 style={{ fontSize: '0.85rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                                Monthly Revenue vs Expenses
                            </h3>
                            {analytics.months.length === 0 ? (
                                <div className="empty-state">No invoice or expense history yet.</div>
                            ) : (
                                <div className="table-responsive">
                                    <table className="trends-table">
                                        <thead>
                                            <tr>
                                                <th>Month</th>
                                                <th>Revenue</th>
                                                <th>Expenses</th>
                                                <th>Net (Revenue - Expenses)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analytics.months.map((m, idx) => (
                                                <tr key={m}>
                                                    <td>{m}</td>
                                                    <td>${Number(analytics.revenue[idx] || 0).toFixed(2)}</td>
                                                    <td>${Number(analytics.expenses[idx] || 0).toFixed(2)}</td>
                                                    <td>
                                                        ${(
                                                            Number(analytics.revenue[idx] || 0) -
                                                            Number(analytics.expenses[idx] || 0)
                                                        ).toFixed(2)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                        <div>
                            <h3 style={{ fontSize: '0.85rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                                Accounts Receivable
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div className="stat-info">
                                    <p className="stat-value text-primary">
                                        ${Number(analytics.accountsReceivable.total || 0).toFixed(2)}
                                    </p>
                                    <span className="stat-subtitle">Total Unpaid Invoices</span>
                                </div>
                                <div className="stat-info">
                                    <p className="stat-value text-warning">
                                        ${Number(analytics.accountsReceivable.overdue || 0).toFixed(2)}
                                    </p>
                                    <span className="stat-subtitle">Overdue Amount</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                <section className="trends-section">
                    <div className="section-header">
                        <h2>Low Stock Products</h2>
                        <p>Products with less than 10 units remaining</p>
                    </div>

                    {lowStockItems.length === 0 ? (
                        <div className="empty-state">No low stock items. Inventory is healthy!</div>
                    ) : (
                        <div className="table-responsive">
                            <table className="trends-table">
                                <thead>
                                    <tr>
                                        <th>Product Name</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lowStockItems.map((item) => (
                                        <tr key={item.id}>
                                            <td className="font-medium">{item.name}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>

                {analytics && (
                    <section className="trends-section">
                        <div className="section-header">
                            <h2>Top-Selling Items</h2>
                            <p>Based on invoices marked Sent or Paid</p>
                        </div>

                        {analytics.topItems.length === 0 ? (
                            <div className="empty-state">No invoice history yet.</div>
                        ) : (
                            <div className="table-responsive">
                                <table className="trends-table">
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th>Total Quantity</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {analytics.topItems.map((item) => (
                                            <tr key={item.id}>
                                                <td className="font-medium">{item.name}</td>
                                                <td>{item.total_quantity}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                )}
            </div>
        </div>
    );
};

export default Dashboard;

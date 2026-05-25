import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { mockApi } from '../services/mockApi';
import './Dashboard.css';

// Dashboard component: shows inventory stats, financial snapshot, low stock items, and top-selling items
const Dashboard = () => {
    const { token, formatCurrency } = useContext(AuthContext); // token: JWT used to authenticate API requests
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

    // Helper to calculate SVG Double-Bar Chart
    const renderSvgChart = () => {
        if (!analytics || !analytics.months || analytics.months.length === 0) return null;
        
        const months = analytics.months;
        const revenues = analytics.revenue;
        const expenses = analytics.expenses;
        
        const maxVal = Math.max(...revenues, ...expenses, 100);
        
        // Dimensions
        const width = 500;
        const height = 240;
        const paddingLeft = 50;
        const paddingRight = 20;
        const paddingTop = 30;
        const paddingBottom = 40;
        
        const chartWidth = width - paddingLeft - paddingRight;
        const chartHeight = height - paddingTop - paddingBottom;
        
        const numMonths = months.length;
        const colWidth = chartWidth / numMonths;
        const barWidth = Math.min(16, colWidth * 0.3);
        
        // Grid y lines
        const gridLines = [0, 0.25, 0.5, 0.75, 1];
        
        return (
            <div style={{ position: 'relative', width: '100%' }}>
                <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="240px" style={{ overflow: 'visible' }}>
                    {/* Grid Lines & Y Axis Labels */}
                    {gridLines.map((percent, idx) => {
                        const y = paddingTop + chartHeight * (1 - percent);
                        const val = maxVal * percent;
                        return (
                            <g key={idx}>
                                <line 
                                    x1={paddingLeft} 
                                    y1={y} 
                                    x2={width - paddingRight} 
                                    y2={y} 
                                    stroke="var(--border-color, #e5e7eb)" 
                                    strokeWidth="1" 
                                    strokeDasharray="4 4" 
                                />
                                <text 
                                    x={paddingLeft - 8} 
                                    y={y + 4} 
                                    textAnchor="end" 
                                    fontSize="9" 
                                    fill="var(--text-muted, #6b7280)"
                                >
                                    {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : val.toFixed(0)}
                                </text>
                            </g>
                        );
                    })}

                    {/* Chart Bars */}
                    {months.map((month, idx) => {
                        const rev = revenues[idx] || 0;
                        const exp = expenses[idx] || 0;
                        
                        const revHeight = (rev / maxVal) * chartHeight;
                        const expHeight = (exp / maxVal) * chartHeight;
                        
                        const colCenterX = paddingLeft + (idx * colWidth) + (colWidth / 2);
                        
                        const revX = colCenterX - barWidth - 2;
                        const revY = paddingTop + chartHeight - revHeight;
                        
                        const expX = colCenterX + 2;
                        const expY = paddingTop + chartHeight - expHeight;
                        
                        return (
                            <g key={month} className="chart-bar-group">
                                {/* Revenue Bar */}
                                <rect 
                                    x={revX} 
                                    y={revY} 
                                    width={barWidth} 
                                    height={revHeight} 
                                    fill="var(--primary-color, #3b82f6)" 
                                    rx="2"
                                    style={{ transition: 'all 0.3s ease' }}
                                >
                                    <title>Revenue: {formatCurrency(rev)}</title>
                                </rect>
                                
                                {/* Expense Bar */}
                                <rect 
                                    x={expX} 
                                    y={expY} 
                                    width={barWidth} 
                                    height={expHeight} 
                                    fill="var(--danger-color, #ef4444)" 
                                    rx="2"
                                    style={{ transition: 'all 0.3s ease' }}
                                >
                                    <title>Expenses: {formatCurrency(exp)}</title>
                                </rect>

                                {/* X-Axis Month label */}
                                <text 
                                    x={colCenterX} 
                                    y={height - paddingBottom + 18} 
                                    textAnchor="middle" 
                                    fontSize="9" 
                                    fill="var(--text-color, #374151)"
                                >
                                    {month}
                                </text>
                            </g>
                        );
                    })}

                    {/* X Axis line */}
                    <line 
                        x1={paddingLeft} 
                        y1={paddingTop + chartHeight} 
                        x2={width - paddingRight} 
                        y2={paddingTop + chartHeight} 
                        stroke="var(--border-color, #e5e7eb)" 
                        strokeWidth="1.5" 
                    />
                </svg>

                {/* Legend */}
                <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '0.75rem', fontSize: '0.85rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: 'var(--primary-color, #3b82f6)', borderRadius: '2px' }}></span>
                        <span style={{ color: 'var(--text-color)' }}>Revenue</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ display: 'inline-block', width: '12px', height: '12px', backgroundColor: 'var(--danger-color, #ef4444)', borderRadius: '2px' }}></span>
                        <span style={{ color: 'var(--text-color)' }}>Expenses</span>
                    </div>
                </div>
            </div>
        );
    };

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
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                        <div>
                            <h3 style={{ fontSize: '0.85rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                                Monthly Revenue vs Expenses
                            </h3>
                            {analytics.months.length === 0 ? (
                                <div className="empty-state">No invoice or expense history yet.</div>
                            ) : (
                                renderSvgChart()
                            )}
                        </div>
                        <div>
                            <h3 style={{ fontSize: '0.85rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                                Accounts Receivable
                            </h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                <div className="stat-info">
                                    <p className="stat-value text-primary">
                                        {formatCurrency(analytics.accountsReceivable.total || 0)}
                                    </p>
                                    <span className="stat-subtitle">Total Unpaid Invoices</span>
                                </div>
                                <div className="stat-info">
                                    <p className="stat-value text-warning">
                                        {formatCurrency(analytics.accountsReceivable.overdue || 0)}
                                    </p>
                                    <span className="stat-subtitle">Overdue Amount</span>
                                </div>
                            </div>

                            {/* Supplementary Table under KPIs */}
                            {analytics.months.length > 0 && (
                                <div className="table-responsive" style={{ marginTop: '1.5rem' }}>
                                    <table className="trends-table" style={{ fontSize: '0.85rem' }}>
                                        <thead>
                                            <tr>
                                                <th>Month</th>
                                                <th>Revenue</th>
                                                <th>Expenses</th>
                                                <th>Net</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analytics.months.map((m, idx) => (
                                                <tr key={m}>
                                                    <td style={{ fontWeight: '500' }}>{m}</td>
                                                    <td style={{ color: 'var(--primary-color)' }}>{formatCurrency(analytics.revenue[idx] || 0)}</td>
                                                    <td style={{ color: 'var(--danger-color)' }}>{formatCurrency(analytics.expenses[idx] || 0)}</td>
                                                    <td style={{ fontWeight: 'bold' }}>
                                                        {formatCurrency((analytics.revenue[idx] || 0) - (analytics.expenses[idx] || 0))}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
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

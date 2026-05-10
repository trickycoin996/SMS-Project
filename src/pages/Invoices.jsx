// Invoices page: manage customer invoices and connect them to inventory
import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../context/AuthContext';
import { idbStore } from '../utils/db';
import { mockApi } from '../services/mockApi';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import './Products.css';

const emptyItem = { product_id: '', description: '', quantity: 1, unit_price: 0 }; // emptyItem: template for a new invoice line

const Invoices = () => {
    const { token } = useContext(AuthContext); // token: JWT used for authenticated API calls
    const [products, setProducts] = useState([]); // products: list of inventory items available for invoicing
    const [invoices, setInvoices] = useState([]); // invoices: all existing invoices pulled from the backend
    const [loading, setLoading] = useState(true); // loading: controls initial loading spinner
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');

    const [showForm, setShowForm] = useState(false); // showForm: toggles invoice creation form visibility
    const [formData, setFormData] = useState({
        customer_name: '', // customer_name: name that appears on invoice
        customer_email: '', // customer_email: optional contact email
        issue_date: '', // issue_date: invoice creation date
        due_date: '', // due_date: payment deadline
        notes: '', // notes: optional remarks shown on invoice
        items: [emptyItem] // items: array of invoice line items
    });

    const fetchInvoicesAndProducts = async () => {
        setLoading(true);
        try {
            const [invRes, prodRes] = await Promise.all([
                mockApi.getInvoices(),
                mockApi.getProducts()
            ]);

            if (invRes.ok) {
                const invData = await invRes.json();
                setInvoices(invData.invoices || []);
            }
            if (prodRes.ok) {
                const prodData = await prodRes.json();
                setProducts(prodData.products || []);
            }
        } catch (err) {
            console.error('Error fetching invoices/products:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (token) {
            fetchInvoicesAndProducts();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    const handleInvoiceFieldChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value }); // update top-level invoice fields (customer, dates, notes)
    };

    const handleItemChange = (index, field, value) => {
        const updated = [...formData.items]; // updated: copy of existing line items
        updated[index] = { ...updated[index], [field]: value }; // modify targeted line with new field value
        setFormData({ ...formData, items: updated });
    };

    const addItemRow = () => {
        setFormData({ ...formData, items: [...formData.items, emptyItem] }); // append a fresh empty line item
    };

    const removeItemRow = (index) => {
        if (formData.items.length === 1) return; // prevent removing the last remaining row
        const updated = formData.items.filter((_, i) => i !== index); // updated: all items except the removed one
        setFormData({ ...formData, items: updated });
    };

    const calculateTotals = () => {
        const subtotal = formData.items.reduce((sum, item) => {
            const qty = Number(item.quantity) || 0; // qty: numeric quantity for this line
            const price = Number(item.unit_price) || 0; // price: numeric unit price for this line
            return sum + qty * price; // accumulate line totals into subtotal
        }, 0);
        return { subtotal, total: subtotal }; // currently no tax logic, so total equals subtotal
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const response = await mockApi.createInvoice(formData);

            const data = await response.json();
            if (!response.ok) {
                alert(data.error || 'Failed to create invoice');
                return;
            }

            setShowForm(false);
            setFormData({
                customer_name: '',
                customer_email: '',
                issue_date: '',
                due_date: '',
                notes: '',
                items: [emptyItem]
            });
            fetchInvoicesAndProducts();
        } catch (err) {
            console.error('Error creating invoice:', err);
        }
    };

    const updateStatus = async (id, status) => {
        try {
            const response = await mockApi.updateInvoiceStatus(id, status);
            const data = await response.json();
            if (!response.ok) {
                alert(data.error || 'Failed to update status');
                return;
            }
            fetchInvoicesAndProducts();
        } catch (err) {
            console.error('Error updating invoice status:', err);
        }
    };

    const downloadPdf = async (inv) => {
        const doc = new jsPDF();
        const settings = await idbStore.get('sms_letterhead') || {};
        const companyName = settings.companyName || 'Store Management System';
        const phone = settings.phone || '';
        const email = settings.email || '';
        const addr1 = settings.addressLine1 || '';
        const addr2 = settings.addressLine2 || '';

        // Add Header
        doc.setFontSize(22);
        doc.setTextColor(settings.primaryColor || '#f13c3c');
        doc.text(companyName, 14, 22);

        doc.setFontSize(10);
        doc.setTextColor('#333333');
        if (addr1) doc.text(addr1, 14, 30);
        if (addr2) doc.text(addr2, 14, 35);
        if (phone) doc.text(`Phone: ${phone}`, 14, 40);
        if (email) doc.text(`Email: ${email}`, 14, 45);

        // Invoice Info
        doc.setFontSize(16);
        doc.setTextColor('#000000');
        doc.text('INVOICE', 140, 22);
        doc.setFontSize(10);
        doc.text(`Invoice Number: ${inv.invoice_number}`, 140, 30);
        doc.text(`Date: ${inv.issue_date?.slice(0, 10)}`, 140, 35);
        doc.text(`Due Date: ${inv.due_date?.slice(0, 10)}`, 140, 40);
        doc.text(`Status: ${inv.status}`, 140, 45);

        // Bill to
        doc.setFontSize(12);
        doc.text('Bill To:', 14, 60);
        doc.setFontSize(10);
        doc.text(inv.customer_name || 'Valued Customer', 14, 66);
        if (inv.customer_email) doc.text(inv.customer_email, 14, 71);

        // Table
        const tableColumn = ["Description", "Qty", "Unit Price", "Line Total"];
        const tableRows = [];

        inv.items.forEach(item => {
            const description = item.description || 'Item';
            const qty = item.quantity;
            const price = Number(item.unit_price).toFixed(2);
            const lineTotal = (Number(item.quantity) * Number(item.unit_price)).toFixed(2);
            tableRows.push([description, qty, `$${price}`, `$${lineTotal}`]);
        });

        doc.autoTable({
            startY: 85,
            head: [tableColumn],
            body: tableRows,
            theme: 'striped',
            headStyles: { fillColor: settings.primaryColor || '#f13c3c' }
        });

        // Totals
        const finalY = doc.lastAutoTable.finalY || 85;
        doc.setFontSize(12);
        doc.text(`Total Amount: $${Number(inv.total || 0).toFixed(2)}`, 140, finalY + 10);

        if (inv.notes) {
            doc.setFontSize(10);
            doc.text(`Notes: ${inv.notes}`, 14, finalY + 10);
        }

        mockApi.logAction('DOWNLOAD_INVOICE_PDF', `Downloaded PDF for invoice ${inv.invoice_number}`);
        doc.save(`${inv.invoice_number}.pdf`);
    };

    if (loading) return <div className="loading-state">Loading invoices...</div>;

    const filteredInvoices = invoices.filter(inv => {
        const matchSearch = inv.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) || inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchStatus = statusFilter === 'All' ? true : inv.status === statusFilter;
        return matchSearch && matchStatus;
    });

    const totals = calculateTotals();

    return (
        <div className="products-container">
            <div className="page-header">
                <div>
                    <h1>Invoices</h1>
                    <p>Create, track, and export customer invoices</p>
                </div>
                <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
                    {showForm ? 'Cancel' : '+ New Invoice'}
                </button>
            </div>

            {!showForm && (
                <div style={{display: 'flex', gap: '1rem', marginBottom: '1.5rem'}}>
                    <input 
                        type="text" 
                        placeholder="Search invoices by number or customer..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        style={{flex: 1, padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)'}}
                    />
                    <select 
                        value={statusFilter} 
                        onChange={e => setStatusFilter(e.target.value)}
                        style={{width: '200px', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)'}}
                    >
                        <option value="All">All Statuses</option>
                        <option value="Draft">Draft</option>
                        <option value="Sent">Sent</option>
                        <option value="Paid">Paid</option>
                        <option value="Overdue">Overdue</option>
                    </select>
                </div>
            )}

            {showForm && (
                <div className="glass-panel add-product-form">
                    <h3>New Invoice</h3>
                    <form onSubmit={handleSubmit} className="grid-form">
                        <div className="form-group">
                            <label>Customer Name</label>
                            <input
                                type="text"
                                name="customer_name"
                                value={formData.customer_name}
                                onChange={handleInvoiceFieldChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Customer Email</label>
                            <input
                                type="email"
                                name="customer_email"
                                value={formData.customer_email}
                                onChange={handleInvoiceFieldChange}
                            />
                        </div>
                        <div className="form-group">
                            <label>Issue Date</label>
                            <input
                                type="date"
                                name="issue_date"
                                value={formData.issue_date}
                                onChange={handleInvoiceFieldChange}
                                required
                            />
                        </div>
                        <div className="form-group">
                            <label>Due Date</label>
                            <input
                                type="date"
                                name="due_date"
                                value={formData.due_date}
                                onChange={handleInvoiceFieldChange}
                                required
                            />
                        </div>
                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label>Notes</label>
                            <input
                                type="text"
                                name="notes"
                                value={formData.notes}
                                onChange={handleInvoiceFieldChange}
                                placeholder="Optional notes for the customer"
                            />
                        </div>

                        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                            <label>Line Items</label>
                            <div className="products-table-container">
                                <div className="table-responsive">
                                    <table className="data-table">
                                        <thead>
                                            <tr>
                                                <th>Product</th>
                                                <th>Description</th>
                                                <th>Qty</th>
                                                <th>Unit Price</th>
                                                <th>Line Total</th>
                                                <th></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {formData.items.map((item, index) => {
                                                const lineTotal =
                                                    (Number(item.quantity) || 0) *
                                                    (Number(item.unit_price) || 0);
                                                return (
                                                    <tr key={index}>
                                                        <td>
                                                            <select
                                                                value={item.product_id}
                                                                onChange={(e) =>
                                                                    handleItemChange(
                                                                        index,
                                                                        'product_id',
                                                                        e.target.value
                                                                    )
                                                                }
                                                            >
                                                                <option value="">Custom</option>
                                                                {products.map((p) => (
                                                                    <option key={p.id} value={p.id}>
                                                                        {p.name}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="text"
                                                                value={item.description}
                                                                onChange={(e) =>
                                                                    handleItemChange(
                                                                        index,
                                                                        'description',
                                                                        e.target.value
                                                                    )
                                                                }
                                                                placeholder="Item description (optional)"
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={item.quantity}
                                                                onChange={(e) =>
                                                                    handleItemChange(
                                                                        index,
                                                                        'quantity',
                                                                        e.target.value
                                                                    )
                                                                }
                                                            />
                                                        </td>
                                                        <td>
                                                            <input
                                                                type="number"
                                                                step="0.01"
                                                                value={item.unit_price}
                                                                onChange={(e) =>
                                                                    handleItemChange(
                                                                        index,
                                                                        'unit_price',
                                                                        e.target.value
                                                                    )
                                                                }
                                                            />
                                                        </td>
                                                        <td>${lineTotal.toFixed(2)}</td>
                                                        <td>
                                                            <button
                                                                type="button"
                                                                className="btn-small danger"
                                                                onClick={() => removeItemRow(index)}
                                                            >
                                                                ✕
                                                            </button>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div style={{ marginTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <button
                                        type="button"
                                        className="btn-small success"
                                        onClick={addItemRow}
                                    >
                                        + Add Line
                                    </button>
                                    <div style={{ textAlign: 'right' }}>
                                        <div>Subtotal: ${totals.subtotal.toFixed(2)}</div>
                                        <div style={{ fontWeight: 600 }}>Total: ${totals.total.toFixed(2)}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="form-actions" style={{ gridColumn: '1 / -1' }}>
                            <button type="submit" className="btn-primary">
                                Save Invoice (Draft)
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="products-table-container">
                {invoices.length === 0 ? (
                    <div className="empty-state">No invoices found. Start by creating one!</div>
                ) : (
                    <div className="table-responsive">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Customer</th>
                                    <th>Issue Date</th>
                                    <th>Due Date</th>
                                    <th>Status</th>
                                    <th>Total</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredInvoices.map((inv) => (
                                    <tr key={inv.id}>
                                        <td className="text-muted">{inv.invoice_number}</td>
                                        <td className="font-medium">{inv.customer_name}</td>
                                        <td>{inv.issue_date?.slice(0, 10)}</td>
                                        <td>{inv.due_date?.slice(0, 10)}</td>
                                        <td>
                                            <span
                                                className={`badge ${
                                                    inv.status === 'Paid'
                                                        ? 'good-stock'
                                                        : inv.status === 'Overdue'
                                                        ? 'low-stock'
                                                        : 'category-badge'
                                                }`}
                                            >
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td>${Number(inv.total || 0).toFixed(2)}</td>
                                        <td className="action-cells">
                                            {inv.status === 'Draft' && (
                                                <button
                                                    type="button"
                                                    className="btn-small success"
                                                    onClick={() => updateStatus(inv.id, 'Sent')}
                                                >
                                                    Mark Sent
                                                </button>
                                            )}
                                            {(inv.status === 'Draft' || inv.status === 'Sent') && (
                                                <button
                                                    type="button"
                                                    className="btn-small success"
                                                    onClick={() => updateStatus(inv.id, 'Paid')}
                                                >
                                                    Mark Paid
                                                </button>
                                            )}
                                            <button
                                                type="button"
                                                className="btn-small"
                                                onClick={() => downloadPdf(inv)}
                                            >
                                                PDF
                                            </button>
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

export default Invoices;


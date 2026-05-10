import React, { useState, useEffect } from 'react';
import { idbStore } from '../utils/db';
import { mockApi } from '../services/mockApi';
import jsPDF from 'jspdf';
import '../index.css';

const Transactions = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [monthFilter, setMonthFilter] = useState('All');

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [invRes, expRes] = await Promise.all([
                    mockApi.getInvoices(),
                    mockApi.getExpenses()
                ]);
                
                let allTx = [];
                if (invRes.ok) {
                    const data = await invRes.json();
                    data.invoices.forEach(inv => {
                        if (inv.status === 'Paid') {
                            allTx.push({
                                id: `inv_${inv.id}`,
                                date: inv.issue_date,
                                reference: inv.invoice_number,
                                type: 'Income',
                                amount: Number(inv.total),
                                description: `Invoice for ${inv.customer_name}`
                            });
                        }
                    });
                }
                
                if (expRes.ok) {
                    const data = await expRes.json();
                    data.expenses.forEach(exp => {
                        allTx.push({
                            id: `exp_${exp.id}`,
                            date: exp.date,
                            reference: `EXP-${exp.id.toString().slice(-4)}`,
                            type: 'Expense',
                            amount: Number(exp.amount),
                            description: exp.description
                        });
                    });
                }
                
                allTx.sort((a,b) => new Date(b.date) - new Date(a.date));
                setTransactions(allTx);
            } catch(e) { console.error('Error fetching tx:', e); }
            setLoading(false);
        };
        fetchData();
    }, []);

    const months = ['All', ...new Set(transactions.map(t => new Date(t.date).toLocaleString('default', { month: 'short', year: 'numeric' })))];

    const filteredTx = transactions.filter(t => {
        if (monthFilter === 'All') return true;
        return new Date(t.date).toLocaleString('default', { month: 'short', year: 'numeric' }) === monthFilter;
    });

    const totalIncome = filteredTx.filter(t => t.type === 'Income').reduce((s,t) => s + t.amount, 0);
    const totalExpense = filteredTx.filter(t => t.type === 'Expense').reduce((s,t) => s + t.amount, 0);
    const net = totalIncome - totalExpense;

    const downloadLedger = async () => {
        const doc = new jsPDF();
        const settings = await idbStore.get('sms_letterhead') || {};
        const companyName = settings.companyName || 'My Awesome Store';

        doc.setFontSize(22);
        doc.setTextColor(settings.primaryColor || '#f13c3c');
        doc.text(companyName, 14, 22);
        
        doc.setFontSize(16);
        doc.setTextColor('#000');
        doc.text('Monthly Transaction Ledger', 14, 32);
        doc.setFontSize(10);
        doc.text(`Period: ${monthFilter}`, 14, 38);

        // Summary
        doc.text(`Total Income: $${totalIncome.toFixed(2)}`, 14, 48);
        doc.text(`Total Expense: $${totalExpense.toFixed(2)}`, 14, 54);
        doc.text(`Net Profit: $${net.toFixed(2)}`, 14, 60);

        const tableColumn = ["Date", "Ref", "Type", "Description", "Amount"];
        const tableRows = filteredTx.map(t => [
            t.date?.slice(0, 10),
            t.reference,
            t.type,
            t.description,
            `$${t.amount.toFixed(2)}`
        ]);

        doc.autoTable({
            startY: 68,
            head: [tableColumn],
            body: tableRows,
            theme: 'striped',
            headStyles: { fillColor: settings.primaryColor || '#f13c3c' }
        });

        mockApi.logAction('DOWNLOAD_LEDGER', `Downloaded ledger for ${monthFilter}`);
        doc.save(`Ledger_${monthFilter.replace(' ','_')}.pdf`);
    };

    if (loading) return <div className="loading-state">Loading transactions...</div>;

    return (
        <div className="container" style={{paddingTop: '2rem'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'1.5rem'}}>
                <div>
                    <h2 style={{marginBottom:'0.25rem'}}>Transactions Ledger</h2>
                    <p className="text-muted">Monthly financial summary and records</p>
                </div>
                <button onClick={downloadLedger} className="btn-primary" style={{backgroundColor: 'var(--secondary-color)'}}>
                    ⬇ Download PDF
                </button>
            </div>

            <div className="glass-panel" style={{marginBottom: '2rem'}}>
                <div style={{display:'flex', gap:'2rem', alignItems:'center'}}>
                    <div>
                        <label style={{display:'block', marginBottom:'0.5rem', fontSize:'0.9rem', fontWeight:'500'}}>Filter by Month</label>
                        <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} style={{width: 'auto', minWidth:'150px'}}>
                            {months.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </div>
                    <div style={{marginLeft:'auto', display:'flex', gap:'1.5rem', textAlign:'center'}}>
                        <div>
                            <div style={{fontSize:'0.85rem', color:'var(--text-muted)'}}>Income</div>
                            <div style={{fontSize:'1.2rem', fontWeight:'600', color:'var(--secondary-color)'}}>${totalIncome.toFixed(2)}</div>
                        </div>
                        <div>
                            <div style={{fontSize:'0.85rem', color:'var(--text-muted)'}}>Expense</div>
                            <div style={{fontSize:'1.2rem', fontWeight:'600', color:'var(--danger-color)'}}>${totalExpense.toFixed(2)}</div>
                        </div>
                        <div style={{borderLeft:'1px solid var(--border-color)', paddingLeft:'1.5rem'}}>
                            <div style={{fontSize:'0.85rem', color:'var(--text-muted)'}}>Net</div>
                            <div style={{fontSize:'1.2rem', fontWeight:'600', color: net >= 0 ? 'var(--secondary-color)' : 'var(--danger-color)'}}>${net.toFixed(2)}</div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="glass-panel">
                <div className="table-responsive">
                    <table className="data-table" style={{width: '100%', borderCollapse: 'collapse'}}>
                        <thead>
                            <tr style={{borderBottom: '1px solid var(--border-color)', textAlign: 'left'}}>
                                <th style={{padding: '1rem'}}>Date</th>
                                <th>Ref No</th>
                                <th>Type</th>
                                <th>Description</th>
                                <th>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTx.length === 0 ? (
                                <tr><td colSpan="5" style={{padding:'2rem', textAlign:'center', color:'var(--text-muted)'}}>No transactions found.</td></tr>
                            ) : filteredTx.map(t => (
                                <tr key={t.id} style={{borderBottom: '1px solid var(--border-color)'}}>
                                    <td style={{padding: '1rem'}}>{t.date?.slice(0, 10)}</td>
                                    <td>{t.reference}</td>
                                    <td>
                                        <span className={`badge ${t.type === 'Income' ? 'good-stock' : 'low-stock'}`}>{t.type}</span>
                                    </td>
                                    <td>{t.description}</td>
                                    <td style={{fontWeight: '500'}}>${t.amount.toFixed(2)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Transactions;

import { getStorage, delay } from '../utils/db';

export const getDashboardMetrics = async () => {
    await delay(300);
    const products = await getStorage('sms_products', []);
    const categories = await getStorage('sms_categories', []);

    const totalProducts = products.length;
    const totalStock = products.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
    const totalCategories = categories.length;
    const lowStockProducts = products.filter(p => (Number(p.quantity) || 0) < 10).length;

    return {
        ok: true,
        json: async () => ({ totalProducts, totalStock, totalCategories, lowStockProducts })
    };
};

export const getAnalyticsSummary = async () => {
    await delay(300);
    const invoices = await getStorage('sms_invoices', []);
    const expenses = await getStorage('sms_expenses', []);

    const monthSet = new Set();
    invoices.forEach(inv => { if (inv.date) monthSet.add(inv.date.slice(0, 7)); });
    expenses.forEach(exp => { if (exp.date) monthSet.add(exp.date.slice(0, 7)); });
    const sortedMonths = Array.from(monthSet).sort();

    const monthLabels = sortedMonths.map(ym => {
        const [year, month] = ym.split('-');
        const d = new Date(Number(year), Number(month) - 1, 1);
        return d.toLocaleString('default', { month: 'short', year: 'numeric' });
    });

    const revenue = sortedMonths.map(ym =>
        invoices
            .filter(inv => inv.date && inv.date.startsWith(ym) && ['Sent', 'Paid'].includes(inv.status))
            .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0)
    );

    const expenseAmounts = sortedMonths.map(ym =>
        expenses
            .filter(exp => exp.date && exp.date.startsWith(ym))
            .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0)
    );

    const unpaidInvoices = invoices.filter(inv => inv.status !== 'Paid');
    const now = new Date();
    const totalReceivable = unpaidInvoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
    const overdueAmount = unpaidInvoices
        .filter(inv => inv.due_date && new Date(inv.due_date) < now)
        .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

    const itemMap = {};
    invoices
        .filter(inv => ['Sent', 'Paid'].includes(inv.status))
        .forEach(inv => {
            (inv.items || []).forEach(item => {
                const key = String(item.product_id);
                if (!itemMap[key]) {
                    itemMap[key] = { id: item.product_id, name: item.product_name || item.name || 'Unknown', total_quantity: 0 };
                }
                itemMap[key].total_quantity += Number(item.quantity) || 0;
            });
        });

    const topItems = Object.values(itemMap)
        .sort((a, b) => b.total_quantity - a.total_quantity)
        .slice(0, 5);

    return {
        ok: true,
        json: async () => ({
            months: monthLabels,
            revenue,
            expenses: expenseAmounts,
            accountsReceivable: { total: totalReceivable, overdue: overdueAmount },
            topItems
        })
    };
};

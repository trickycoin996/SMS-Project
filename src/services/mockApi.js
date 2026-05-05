import { idbStore } from '../utils/db';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getStorage = async (key, defaultVal) => {
    const data = await idbStore.get(key);
    return data !== undefined ? data : defaultVal;
};

const setStorage = async (key, val) => {
    await idbStore.set(key, val);
};

export const initializeDB = async () => {
    if ((await getStorage('sms_logs')) === undefined) {
        await setStorage('sms_logs', []);
    }
    if ((await getStorage('sms_users')) === undefined) {
        await setStorage('sms_users', []);
    }
    if ((await getStorage('sms_products')) === undefined) {
        await setStorage('sms_products', []);
    }
    if ((await getStorage('sms_categories')) === undefined) {
        await setStorage('sms_categories', [
            { id: 1, name: 'Electronics', description: 'Electronic devices' },
            { id: 2, name: 'Clothing', description: 'Apparel' }
        ]);
    }
    if ((await getStorage('sms_invoices')) === undefined) {
        await setStorage('sms_invoices', []);
    }
    if ((await getStorage('sms_expenses')) === undefined) {
        await setStorage('sms_expenses', []);
    }
};

export const mockApi = {
    logAction: async (action, details) => {
        const logs = await getStorage('sms_logs', []);
        const newLog = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            action,
            details
        };
        logs.push(newLog);
        await setStorage('sms_logs', logs);
    },

    getLogsText: async () => {
        const logs = await getStorage('sms_logs', []);
        if (logs.length === 0) return "No actions logged yet.";
        return logs.map(l => `[${new Date(l.timestamp).toLocaleString()}] ${l.action}: ${l.details}`).join('\n');
    },

    getAdminCount: async () => {
        await delay(300);
        const users = await getStorage('sms_users', []);
        return { ok: true, json: async () => ({ count: users.filter(u => u.role === 'admin').length }) };
    },

    login: async (email, password) => {
        await delay(500);
        const users = await getStorage('sms_users', []);
        const user = users.find(u => u.email === email && u.password === password);
        
        if (user) {
            await mockApi.logAction('LOGIN', `User ${email} logged in`);
            return { ok: true, json: async () => ({ 
                user: { 
                    id: user.id, 
                    email: user.email, 
                    firstName: user.firstName, 
                    lastName: user.lastName,
                    role: user.role,
                    allowedPages: user.allowedPages || []
                }, 
                token: 'mock-jwt-token-123' 
            })};
        } else {
            await mockApi.logAction('LOGIN_FAILED', `Failed login attempt for email ${email}`);
            return { ok: false, json: async () => ({ error: 'Invalid credentials' }) };
        }
    },
    
    register: async (userData) => {
        await delay(500);
        const users = await getStorage('sms_users', []);
        
        const adminCount = users.filter(u => u.role === 'admin').length;
        if (adminCount > 0) {
            return { ok: false, json: async () => ({ error: 'Registration closed. Further accounts must be created by an Admin.' }) };
        }

        if (users.find(u => u.email === userData.email)) {
            return { ok: false, json: async () => ({ error: 'Email already exists' }) };
        }
        
        const newUser = { id: Date.now(), ...userData, role: 'admin' };
        users.push(newUser);
        await setStorage('sms_users', users);
        
        await mockApi.logAction('REGISTER', `Initial Admin registered: ${userData.email}`);
        return { ok: true, json: async () => ({ message: 'Admin created' }) };
    },

    addEmployee: async (employeeData) => {
        await delay(500);
        const users = await getStorage('sms_users', []);
        if (users.find(u => u.email === employeeData.email)) {
            return { ok: false, json: async () => ({ error: 'Email already exists' }) };
        }
        
        const newEmployee = { id: Date.now(), ...employeeData, role: 'employee' };
        users.push(newEmployee);
        await setStorage('sms_users', users);
        
        await mockApi.logAction('ADD_EMPLOYEE', `New employee created: ${employeeData.email}`);
        return { ok: true, json: async () => ({ message: 'Employee created' }) };
    },

    sendOtp: async (email) => {
        await delay(500);
        const users = await getStorage('sms_users', []);
        const user = users.find(u => u.email === email);
        if (!user) {
            return { ok: false, json: async () => ({ error: 'Email not found.' }) };
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        const otps = await getStorage('sms_otps', {});
        otps[email] = otp;
        await setStorage('sms_otps', otps);

        console.log(`[RESEND MOCK] Sent OTP ${otp} to ${email}`);
        await mockApi.logAction('OTP_SENT', `OTP sent to ${email} via Resend mock`);
        
        return { ok: true, json: async () => ({ message: `Recovery OTP sent to ${email} successfully.` }) };
    },

    verifyOtp: async (email, inputOtp) => {
        await delay(300);
        const otps = await getStorage('sms_otps', {});
        if (otps[email] && otps[email] === inputOtp) {
            return { ok: true, json: async () => ({ message: 'OTP Verified' }) };
        }
        return { ok: false, json: async () => ({ error: 'Invalid or expired OTP.' }) };
    },

    resetPassword: async (email, otp, newPassword) => {
        await delay(500);
        const otps = await getStorage('sms_otps', {});
        if (otps[email] !== otp) {
            return { ok: false, json: async () => ({ error: 'Invalid request.' }) };
        }

        const users = await getStorage('sms_users', []);
        const idx = users.findIndex(u => u.email === email);
        if (idx > -1) {
            users[idx].password = newPassword;
            await setStorage('sms_users', users);
            
            delete otps[email];
            await setStorage('sms_otps', otps);
            
            await mockApi.logAction('PASSWORD_RESET', `Password reset for ${email}`);
            return { ok: true, json: async () => ({ message: 'Password updated' }) };
        }
        return { ok: false, json: async () => ({ error: 'User not found.' }) };
    },

    getDashboardMetrics: async () => {
        await delay(300);
        const products = await getStorage('sms_products', []);
        const categories = await getStorage('sms_categories', []);
        
        const totalProducts = products.length;
        const totalStock = products.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
        const totalCategories = categories.length;
        const lowStockProducts = products.filter(p => (Number(p.quantity) || 0) < 10).length;

        return { 
            ok: true, 
            json: async () => ({ 
                totalProducts, 
                totalStock, 
                totalCategories, 
                lowStockProducts 
            }) 
        };
    },

    getAnalyticsSummary: async () => {
        await delay(300);
        return {
            ok: true,
            json: async () => ({
                months: ['Jan', 'Feb', 'Mar'],
                revenue: [1000, 1500, 1200],
                expenses: [500, 600, 800],
                accountsReceivable: { total: 300, overdue: 100 },
                topItems: [{ id: 1, name: 'Sample Product', total_quantity: 10 }]
            })
        };
    },

    getRecentTransactions: async () => {
        await delay(300);
        const transactions = await getStorage('sms_transactions', []);
        const recent = transactions.sort((a,b) => b.id - a.id).slice(0, 5);
        return { ok: true, json: async () => (recent) };
    },

    getProducts: async () => {
        await delay(300);
        const products = await getStorage('sms_products', []);
        const categories = await getStorage('sms_categories', []);
        
        const productsWithCat = products.map(p => {
            const cat = categories.find(c => c.id === Number(p.category_id));
            return { ...p, category_name: cat ? cat.name : 'Unknown' };
        });
        
        return { ok: true, json: async () => ({ products: productsWithCat }) };
    },

    addProduct: async (productData) => {
        await delay(300);
        const products = await getStorage('sms_products', []);
        const newProduct = { 
            ...productData, 
            id: Date.now(),
            quantity: Number(productData.quantity) || 0,
            price: Number(productData.price) || 0
        };
        products.push(newProduct);
        await setStorage('sms_products', products);
        await mockApi.logAction('ADD_PRODUCT', `Added new product: ${newProduct.name}`);
        return { ok: true, json: async () => ({ message: 'Product added', id: newProduct.id }) };
    },

    getCategories: async () => {
        await delay(300);
        const categories = await getStorage('sms_categories', []);
        return { ok: true, json: async () => ({ categories }) };
    },

    addCategory: async (categoryData) => {
        await delay(300);
        const categories = await getStorage('sms_categories', []);
        const newCategory = { ...categoryData, id: Date.now() };
        categories.push(newCategory);
        await setStorage('sms_categories', categories);
        await mockApi.logAction('ADD_CATEGORY', `Added new category: ${newCategory.name}`);
        return { ok: true, json: async () => ({ message: 'Category added' }) };
    },
    
    addTransaction: async (transactionData) => {
        await delay(300);
        const products = await getStorage('sms_products', []);
        const transactions = await getStorage('sms_transactions', []);
        
        const { product_id, type, quantity } = transactionData;
        const qty = Number(quantity);
        
        const productIndex = products.findIndex(p => p.id === Number(product_id));
        if (productIndex === -1) {
            return { ok: false, json: async () => ({ error: 'Product not found' }) };
        }
        
        const product = products[productIndex];
        
        if (type === 'OUT' && product.quantity < qty) {
            return { ok: false, json: async () => ({ error: 'Insufficient stock' }) };
        }
        
        if (type === 'IN') {
            products[productIndex].quantity += qty;
        } else if (type === 'OUT') {
            products[productIndex].quantity -= qty;
        }
        
        const newTransaction = {
            id: Date.now(),
            product_id: product.id,
            product_name: product.name,
            type,
            quantity: qty,
            date: new Date().toISOString()
        };
        
        transactions.push(newTransaction);
        
        await setStorage('sms_products', products);
        await setStorage('sms_transactions', transactions);
        
        await mockApi.logAction('ADD_TRANSACTION', `Transaction ${type}: ${qty} units of ${product.name}`);
        return { ok: true, json: async () => ({ message: 'Transaction successful' }) };
    },

    getInvoices: async () => {
        await delay(300);
        const invoices = await getStorage('sms_invoices', []);
        return { ok: true, json: async () => ({ invoices }) };
    },

    createInvoice: async (invoiceData) => {
        await delay(300);
        const invoices = await getStorage('sms_invoices', []);
        const products = await getStorage('sms_products', []);

        for (const item of invoiceData.items) {
            const prodIdx = products.findIndex(p => p.id === Number(item.product_id));
            if (prodIdx > -1) {
                products[prodIdx].quantity -= Number(item.quantity);
            }
        }
        await setStorage('sms_products', products);

        const newInvoice = {
            ...invoiceData,
            id: Date.now(),
            invoice_number: `INV-${Date.now().toString().slice(-6)}`,
            date: new Date().toISOString()
        };
        invoices.push(newInvoice);
        await setStorage('sms_invoices', invoices);

        await mockApi.logAction('CREATE_INVOICE', `Created invoice ${newInvoice.invoice_number}`);
        return { ok: true, json: async () => ({ message: 'Invoice created', invoiceId: newInvoice.id }) };
    },

    updateInvoiceStatus: async (id, status) => {
        await delay(300);
        const invoices = await getStorage('sms_invoices', []);
        const idx = invoices.findIndex(i => i.id === Number(id));
        if (idx > -1) {
            invoices[idx].status = status;
            await setStorage('sms_invoices', invoices);
            await mockApi.logAction('UPDATE_INVOICE_STATUS', `Updated invoice ${invoices[idx].invoice_number} status to ${status}`);
            return { ok: true, json: async () => ({ message: 'Status updated' }) };
        }
        return { ok: false, json: async () => ({ error: 'Invoice not found' }) };
    },

    getExpenses: async () => {
        await delay(300);
        const expenses = await getStorage('sms_expenses', []);
        return { ok: true, json: async () => ({ expenses }) };
    },

    addExpense: async (expenseData) => {
        await delay(300);
        const expenses = await getStorage('sms_expenses', []);
        const newExpense = {
            ...expenseData,
            id: Date.now(),
            amount: Number(expenseData.amount)
        };
        expenses.push(newExpense);
        await setStorage('sms_expenses', expenses);
        
        await mockApi.logAction('ADD_EXPENSE', `Added expense: $${newExpense.amount} for ${newExpense.description}`);
        return { ok: true, json: async () => ({ message: 'Expense added' }) };
    }
};

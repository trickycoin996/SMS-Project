import { idbStore } from '../utils/db';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getStorage = async (key, defaultVal) => {
    const data = await idbStore.get(key);
    return data !== undefined ? data : defaultVal;
};

const setStorage = async (key, val) => {
    await idbStore.set(key, val);
};

// Cryptographic helpers using native browser Web Crypto API
export const generateSalt = () => {
    const array = new Uint32Array(8);
    crypto.getRandomValues(array);
    return Array.from(array).map(b => b.toString(16).padStart(8, '0')).join('');
};

export const hashPassword = async (password, salt) => {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

// ECDSA Key Pair Signatures for Device-Bound Trust
export const signData = async (dataStr) => {
    try {
        const privateKeyJwk = await idbStore.get('sms_device_private_key');
        if (!privateKeyJwk) return null;
        
        const privateKey = await crypto.subtle.importKey(
            "jwk",
            privateKeyJwk,
            {
                name: "ECDSA",
                namedCurve: "P-256"
            },
            true,
            ["sign"]
        );
        
        const encoder = new TextEncoder();
        const data = encoder.encode(dataStr);
        const signatureBuffer = await crypto.subtle.sign(
            {
                name: "ECDSA",
                hash: { name: "SHA-256" }
            },
            privateKey,
            data
        );
        
        const sigArray = Array.from(new Uint8Array(signatureBuffer));
        return sigArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (e) {
        console.error('Error signing data:', e);
        return null;
    }
};

export const verifyData = async (dataStr, signatureHex, publicKeyJwk) => {
    try {
        const publicKey = await crypto.subtle.importKey(
            "jwk",
            publicKeyJwk,
            {
                name: "ECDSA",
                namedCurve: "P-256"
            },
            true,
            ["verify"]
        );
        
        const encoder = new TextEncoder();
        const data = encoder.encode(dataStr);
        
        const match = signatureHex.match(/.{1,2}/g) || [];
        const sigBytes = new Uint8Array(match.map(byte => parseInt(byte, 16)));
        
        return await crypto.subtle.verify(
            {
                name: "ECDSA",
                hash: { name: "SHA-256" }
            },
            publicKey,
            sigBytes,
            data
        );
    } catch (e) {
        console.error('Error verifying signature:', e);
        return false;
    }
};

// FIFO Daily Queue storage helpers
const pushToDailyFifo = async (key, item) => {
    const queue = await getStorage(key, []);
    const dateStr = new Date().toISOString().slice(0, 10);
    
    let block = queue.find(b => b.date === dateStr);
    if (!block) {
        block = { date: dateStr, items: [] };
        queue.push(block);
    }
    block.items.push(item);
    
    // Cap at 200 days capacity
    if (queue.length > 200) {
        queue.shift();
    }
    
    await setStorage(key, queue);
};

const getFlattenedFifo = async (key) => {
    const queue = await getStorage(key, []);
    return queue.flatMap(block => block.items || []);
};

export const initializeDB = async () => {
    if ((await getStorage('sms_users')) === undefined) {
        await setStorage('sms_users', []);
    }
    if ((await getStorage('sms_products')) === undefined) {
        await setStorage('sms_products', []);
    }
    if ((await getStorage('sms_categories')) === undefined) {
        await setStorage('sms_categories', []);
    }
    if ((await getStorage('sms_logs_fifo')) === undefined) {
        await setStorage('sms_logs_fifo', []);
    }
    if ((await getStorage('sms_invoices_fifo')) === undefined) {
        await setStorage('sms_invoices_fifo', []);
    }
    if ((await getStorage('sms_expenses_fifo')) === undefined) {
        await setStorage('sms_expenses_fifo', []);
    }
    if ((await getStorage('sms_transactions_fifo')) === undefined) {
        await setStorage('sms_transactions_fifo', []);
    }

    // Migrate old flat databases to FIFO daily queues if applicable
    const migrateToFifo = async (oldKey, newKey) => {
        const oldData = await getStorage(oldKey);
        if (oldData && Array.isArray(oldData)) {
            const dailyMap = {};
            for (const item of oldData) {
                const dateStr = (item.date || item.timestamp || new Date().toISOString()).slice(0, 10);
                if (!dailyMap[dateStr]) dailyMap[dateStr] = [];
                dailyMap[dateStr].push(item);
            }
            const fifoQueue = Object.keys(dailyMap).sort().map(date => ({
                date,
                items: dailyMap[date]
            }));
            await setStorage(newKey, fifoQueue);
            await idbStore.remove(oldKey);
        }
    };
    await migrateToFifo('sms_logs', 'sms_logs_fifo');
    await migrateToFifo('sms_invoices', 'sms_invoices_fifo');
    await migrateToFifo('sms_expenses', 'sms_expenses_fifo');
    await migrateToFifo('sms_transactions', 'sms_transactions_fifo');

    // Generate Device ECDSA Key Pair for persistent local identity
    if ((await idbStore.get('sms_device_private_key')) === undefined) {
        try {
            const keyPair = await crypto.subtle.generateKey(
                {
                    name: "ECDSA",
                    namedCurve: "P-256"
                },
                true,
                ["sign", "verify"]
            );
            const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
            const publicKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
            await idbStore.set('sms_device_private_key', privateKeyJwk);
            await idbStore.set('sms_device_public_key', publicKeyJwk);
            await idbStore.set('sms_device_id', 'device_' + Math.random().toString(36).slice(2, 11));
        } catch (e) {
            console.error('Failed to generate device keypair:', e);
        }
    }

    // Consolidate first/last names to Name, and migrate plain-text passwords
    const users = await getStorage('sms_users', []);
    let migrated = false;
    for (let u of users) {
        if (!u.name) {
            u.name = `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Admin';
            delete u.firstName;
            delete u.lastName;
            migrated = true;
        }
        if (!u.salt) {
            u.salt = generateSalt();
            u.password = await hashPassword(u.password || 'password123', u.salt);
            u.status = u.status || 'active';
            migrated = true;
        }
        if (!u.status) {
            u.status = 'active';
            migrated = true;
        }
    }
    if (migrated) {
        await setStorage('sms_users', users);
    }
};

export const mockApi = {
    // Action Logger
    logAction: async (action, details) => {
        const newLog = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            action,
            details
        };
        await pushToDailyFifo('sms_logs_fifo', newLog);
    },

    getLogsText: async () => {
        const flattened = await getFlattenedFifo('sms_logs_fifo');
        if (flattened.length === 0) return "No actions logged yet.";
        return flattened.map(l => `[${new Date(l.timestamp).toLocaleString()}] ${l.action}: ${l.details}`).join('\n');
    },

    getAdminCount: async () => {
        await delay(300);
        const users = await getStorage('sms_users', []);
        return { ok: true, json: async () => ({ count: users.filter(u => u.role === 'admin').length }) };
    },

    // Auth
    login: async (name, password) => {
        await delay(500);
        const users = await getStorage('sms_users', []);
        const user = users.find(u => u.name.trim().toLowerCase() === name.trim().toLowerCase());
        
        if (!user) {
            await mockApi.logAction('LOGIN_FAILED', `Failed login attempt for name ${name} (User not found)`);
            return { ok: false, json: async () => ({ error: 'Invalid name or password' }) };
        }

        if (user.status === 'deleted') {
            await mockApi.logAction('LOGIN_FAILED_DELETED', `Attempt by deleted employee ${name}`);
            return { ok: false, json: async () => ({ error: 'Account has been deleted/disabled. Please contact administrator.' }) };
        }

        const inputHash = await hashPassword(password, user.salt || '');
        if (user.password === inputHash) {
            await mockApi.logAction('LOGIN_SUCCESS', `User ${name} logged in`);
            return { ok: true, json: async () => ({ 
                user: { 
                    id: user.id, 
                    name: user.name, 
                    role: user.role,
                    status: user.status,
                    allowedPages: user.allowedPages || []
                }, 
                token: 'mock-jwt-token-123' 
            })};
        } else {
            await mockApi.logAction('LOGIN_FAILED', `Failed password attempt for user ${name}`);
            return { ok: false, json: async () => ({ error: 'Invalid name or password' }) };
        }
    },

    loginWithPasskey: async (passkeyData) => {
        await delay(500);
        const { name, token, devicePublicKey, signature } = passkeyData;
        
        // 1. Verify signature with device key
        const isValidSignature = await verifyData(name + ":" + token, signature, devicePublicKey);
        if (!isValidSignature) {
            await mockApi.logAction('LOGIN_FAILED', `Failed passkey verification for ${name} (Invalid signature)`);
            return { ok: false, json: async () => ({ error: 'Invalid passkey cryptographic signature' }) };
        }

        let users = await getStorage('sms_users', []);
        let user = users.find(u => u.name.trim().toLowerCase() === name.trim().toLowerCase());

        // 2. Clean install recovery auto-registration
        if (!user) {
            const salt = generateSalt();
            const tempPassword = await hashPassword('password123', salt);
            user = {
                id: Date.now(),
                name,
                role: users.length === 0 ? 'admin' : 'employee',
                status: 'active',
                salt,
                password: tempPassword,
                passkeyToken: token,
                devicePublicKey,
                allowedPages: ['dashboard', 'products', 'categories', 'invoices', 'expenses', 'transactions', 'profile']
            };
            users.push(user);
            await setStorage('sms_users', users);
            await mockApi.logAction('USER_RECONSTRUCTED', `User ${name} auto-reconstructed from passkey file during reinstall`);
        }

        if (user.status === 'deleted') {
            await mockApi.logAction('LOGIN_FAILED_DELETED', `Passkey attempt by deleted employee ${name}`);
            return { ok: false, json: async () => ({ error: 'Account has been deleted/disabled.' }) };
        }

        if (user.passkeyToken && user.passkeyToken === token) {
            await mockApi.logAction('LOGIN_SUCCESS', `User ${name} logged in via Passkey`);
            return { ok: true, json: async () => ({ 
                user: { 
                    id: user.id, 
                    name: user.name, 
                    role: user.role,
                    status: user.status,
                    allowedPages: user.allowedPages || []
                }, 
                token: 'mock-jwt-token-123' 
            })};
        }

        await mockApi.logAction('LOGIN_FAILED', `Failed passkey match attempt for user ${name}`);
        return { ok: false, json: async () => ({ error: 'Invalid passkey token' }) };
    },
    
    register: async (userData) => {
        await delay(500);
        const users = await getStorage('sms_users', []);
        
        const adminCount = users.filter(u => u.role === 'admin').length;
        if (adminCount > 0) {
            return { ok: false, json: async () => ({ error: 'Registration closed. Further accounts must be created by an Admin.' }) };
        }

        const trimmedName = userData.name.trim();
        if (users.find(u => u.name.toLowerCase() === trimmedName.toLowerCase())) {
            return { ok: false, json: async () => ({ error: 'A user with this name already exists' }) };
        }
        
        const salt = generateSalt();
        const hashedPassword = await hashPassword(userData.password, salt);
        const passkeyToken = generateSalt();

        const newUser = { 
            id: Date.now(), 
            name: trimmedName,
            role: 'admin',
            status: 'active',
            salt,
            password: hashedPassword,
            passkeyToken,
            allowedPages: ['dashboard', 'products', 'categories', 'invoices', 'expenses', 'transactions', 'profile']
        };
        users.push(newUser);
        await setStorage('sms_users', users);
        
        await setStorage('sms_store_info', {
            storeName: 'My Store',
            currency: userData.currency_code || 'LKR'
        });
        
        const devicePublicKey = await idbStore.get('sms_device_public_key');
        const signature = await signData(trimmedName + ":" + passkeyToken);

        await mockApi.logAction('REGISTER', `Initial Admin registered: ${trimmedName}`);
        return { ok: true, json: async () => ({ 
            message: 'Admin created',
            passkey: {
                name: trimmedName,
                token: passkeyToken,
                devicePublicKey,
                signature
            }
        }) };
    },

    addEmployee: async (employeeData) => {
        await delay(500);
        const users = await getStorage('sms_users', []);
        const trimmedName = employeeData.name.trim();
        if (users.find(u => u.name.toLowerCase() === trimmedName.toLowerCase())) {
            return { ok: false, json: async () => ({ error: 'An employee with this name already exists' }) };
        }
        
        const salt = generateSalt();
        const hashedPassword = await hashPassword(employeeData.password, salt);
        const passkeyToken = generateSalt();

        const newEmployee = { 
            id: Date.now(), 
            name: trimmedName,
            role: 'employee',
            status: 'active',
            salt,
            password: hashedPassword,
            passkeyToken,
            allowedPages: employeeData.allowedPages || []
        };
        users.push(newEmployee);
        await setStorage('sms_users', users);
        
        await mockApi.logAction('ADD_EMPLOYEE', `New employee created: ${trimmedName}`);
        return { ok: true, json: async () => ({ message: 'Employee created' }) };
    },

    getEmployees: async () => {
        await delay(300);
        const users = await getStorage('sms_users', []);
        return { ok: true, json: async () => ({ employees: users.filter(u => u.role !== 'admin') }) };
    },

    toggleEmployeeStatus: async (id) => {
        await delay(300);
        const users = await getStorage('sms_users', []);
        const idx = users.findIndex(u => u.id === Number(id));
        if (idx > -1) {
            const newStatus = users[idx].status === 'active' ? 'deleted' : 'active';
            users[idx].status = newStatus;
            await setStorage('sms_users', users);
            await mockApi.logAction('TOGGLE_EMPLOYEE_STATUS', `Status of employee ${users[idx].name} set to ${newStatus}`);
            return { ok: true, json: async () => ({ message: `Status updated to ${newStatus}` }) };
        }
        return { ok: false, json: async () => ({ error: 'Employee not found' }) };
    },

    resetEmployeePassword: async (id, newPassword) => {
        await delay(300);
        const users = await getStorage('sms_users', []);
        const idx = users.findIndex(u => u.id === Number(id));
        if (idx > -1) {
            const salt = generateSalt();
            users[idx].salt = salt;
            users[idx].password = await hashPassword(newPassword, salt);
            await setStorage('sms_users', users);
            await mockApi.logAction('RESET_EMPLOYEE_PASSWORD', `Password reset for employee ${users[idx].name}`);
            return { ok: true, json: async () => ({ message: 'Password updated successfully' }) };
        }
        return { ok: false, json: async () => ({ error: 'Employee not found' }) };
    },

    generatePasskey: async (userId) => {
        await delay(300);
        const users = await getStorage('sms_users', []);
        const idx = users.findIndex(u => u.id === Number(userId));
        if (idx > -1) {
            const token = generateSalt();
            users[idx].passkeyToken = token;
            
            const devicePublicKey = await idbStore.get('sms_device_public_key');
            const signature = await signData(users[idx].name + ":" + token);

            await setStorage('sms_users', users);
            await mockApi.logAction('GENERATE_PASSKEY', `Generated new passkey for user ${users[idx].name}`);
            return { ok: true, json: async () => ({ 
                name: users[idx].name,
                token,
                devicePublicKey,
                signature
            }) };
        }
        return { ok: false, json: async () => ({ error: 'User not found' }) };
    },

    verifyBackupSchema: (backupData) => {
        if (!backupData || typeof backupData !== 'object') return false;
        
        const keys = Object.keys(backupData);
        if (keys.length === 0) return false;
        
        for (const key of keys) {
            if (!key.startsWith('sms_')) return false;
        }
        
        const expectedTables = ['sms_users', 'sms_products', 'sms_categories', 'sms_invoices_fifo', 'sms_expenses_fifo', 'sms_transactions_fifo', 'sms_logs_fifo'];
        for (const tbl of expectedTables) {
            if (backupData[tbl] !== undefined && !Array.isArray(backupData[tbl])) {
                return false;
            }
        }
        return true;
    },

    restoreBackup: async (backupData) => {
        await delay(800);
        if (!mockApi.verifyBackupSchema(backupData)) {
            return { ok: false, json: async () => ({ error: 'Invalid backup file structure.' }) };
        }

        const keys = Object.keys(backupData);
        for (const key of keys) {
            await setStorage(key, backupData[key]);
        }

        await mockApi.logAction('DATABASE_RESTORED', `Database successfully restored from backup upload`);
        return { ok: true, json: async () => ({ message: 'Database restored successfully' }) };
    },

    // Dashboard
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

        const invoices = await getFlattenedFifo('sms_invoices_fifo');
        const expenses = await getFlattenedFifo('sms_expenses_fifo');

        const monthSet = new Set();
        invoices.forEach(inv => {
            if (inv.date) monthSet.add(inv.date.slice(0, 7));
        });
        expenses.forEach(exp => {
            if (exp.date) monthSet.add(exp.date.slice(0, 7));
        });
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
    },

    getRecentTransactions: async () => {
        await delay(300);
        const transactions = await getFlattenedFifo('sms_transactions_fifo');
        const recent = transactions.sort((a,b) => b.id - a.id).slice(0, 5);
        return { ok: true, json: async () => (recent) };
    },

    // Products
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

    // Categories
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
    
    // Transactions / Inventory Movements
    addTransaction: async (transactionData) => {
        await delay(300);
        const products = await getStorage('sms_products', []);
        
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
        
        await setStorage('sms_products', products);
        await pushToDailyFifo('sms_transactions_fifo', newTransaction);
        
        await mockApi.logAction('ADD_TRANSACTION', `Transaction ${type}: ${qty} units of ${product.name}`);
        return { ok: true, json: async () => ({ message: 'Transaction successful' }) };
    },

    // Invoices
    getInvoices: async () => {
        await delay(300);
        const invoices = await getFlattenedFifo('sms_invoices_fifo');
        return { ok: true, json: async () => ({ invoices }) };
    },

    createInvoice: async (invoiceData) => {
        await delay(300);
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
        await pushToDailyFifo('sms_invoices_fifo', newInvoice);

        await mockApi.logAction('CREATE_INVOICE', `Created invoice ${newInvoice.invoice_number}`);
        return { ok: true, json: async () => ({ message: 'Invoice created', invoiceId: newInvoice.id }) };
    },

    updateInvoiceStatus: async (id, status) => {
        await delay(300);
        const fifoInvoices = await getStorage('sms_invoices_fifo', []);
        let found = false;
        let invoiceNum = '';
        for (let block of fifoInvoices) {
            const idx = block.items.findIndex(i => i.id === Number(id));
            if (idx > -1) {
                block.items[idx].status = status;
                invoiceNum = block.items[idx].invoice_number;
                found = true;
                break;
            }
        }
        if (found) {
            await setStorage('sms_invoices_fifo', fifoInvoices);
            await mockApi.logAction('UPDATE_INVOICE_STATUS', `Updated invoice ${invoiceNum} status to ${status}`);
            return { ok: true, json: async () => ({ message: 'Status updated' }) };
        }
        return { ok: false, json: async () => ({ error: 'Invoice not found' }) };
    },

    // Expenses
    getExpenses: async () => {
        await delay(300);
        const expenses = await getFlattenedFifo('sms_expenses_fifo');
        return { ok: true, json: async () => ({ expenses }) };
    },

    addExpense: async (expenseData) => {
        await delay(300);
        const newExpense = {
            ...expenseData,
            id: Date.now(),
            amount: Number(expenseData.amount)
        };
        await pushToDailyFifo('sms_expenses_fifo', newExpense);
        
        await mockApi.logAction('ADD_EXPENSE', `Added expense: $${newExpense.amount} for ${newExpense.description}`);
        return { ok: true, json: async () => ({ message: 'Expense added' }) };
    }
};

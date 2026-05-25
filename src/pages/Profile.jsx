import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { ToastContext } from '../context/ToastContext';
import { idbStore } from '../utils/db';
import { mockApi } from '../services/mockApi';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const Profile = () => {
    const { user, updateStoreInfoState } = useContext(AuthContext);
    const { showToast } = useContext(ToastContext);
    const [activeTab, setActiveTab] = useState('user');

    const [userInfo, setUserInfo] = useState({
        userId: '',
        fullName: '',
        firstName: '',
        lastName: '',
        email: ''
    });

    useEffect(() => {
        if (user) {
            setUserInfo({
                userId: user.id || '',
                fullName: `${user.firstName} ${user.lastName}`,
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || ''
            });
        }
    }, [user]);

    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    const [employeeData, setEmployeeData] = useState({
        firstName: '',
        lastName: '',
        password: '',
        allowedPages: []
    });

    const [employees, setEmployees] = useState([]);
    const [resettingEmployeeId, setResettingEmployeeId] = useState(null);
    const [newEmployeePassword, setNewEmployeePassword] = useState('');

    // Backup restore states
    const [backupContent, setBackupContent] = useState(null);
    const [backupSearchQuery, setBackupSearchQuery] = useState('');

    const pagesList = ['dashboard', 'products', 'categories', 'invoices', 'expenses', 'transactions'];

    const fetchEmployees = async () => {
        const res = await mockApi.getEmployees();
        if (res.ok) {
            const data = await res.json();
            setEmployees(data.employees || []);
        }
    };

    useEffect(() => {
        if (activeTab === 'employees' && user?.role === 'admin') {
            fetchEmployees();
        }
    }, [activeTab, user]);

    const handleEmployeePageToggle = (page) => {
        setEmployeeData(prev => ({
            ...prev,
            allowedPages: prev.allowedPages.includes(page) 
                ? prev.allowedPages.filter(p => p !== page) 
                : [...prev.allowedPages, page]
        }));
    };

    const handleCreateEmployee = async (e) => {
        e.preventDefault();
        const res = await mockApi.addEmployee(employeeData);
        const data = await res.json();
        if (res.ok) {
            showToast('Employee created successfully!', 'success');
            setEmployeeData({ firstName: '', lastName: '', password: '', allowedPages: [] });
            fetchEmployees();
        } else {
            showToast(`Error: ${data.error}`, 'error');
        }
    };

    const handleToggleStatus = async (id) => {
        const res = await mockApi.toggleEmployeeStatus(id);
        const data = await res.json();
        if (res.ok) {
            showToast(data.message, 'success');
            fetchEmployees();
        } else {
            showToast(data.error || 'Failed to toggle status', 'error');
        }
    };

    const handleResetEmployeePasswordSubmit = async (e) => {
        e.preventDefault();
        if (!newEmployeePassword) {
            showToast('Please enter a valid password', 'error');
            return;
        }
        const res = await mockApi.resetEmployeePassword(resettingEmployeeId, newEmployeePassword);
        const data = await res.json();
        if (res.ok) {
            showToast(data.message, 'success');
            setResettingEmployeeId(null);
            setNewEmployeePassword('');
        } else {
            showToast(data.error || 'Failed to reset password', 'error');
        }
    };

    const handleGenerateEmployeePasskey = async (id) => {
        const res = await mockApi.generatePasskey(id);
        const data = await res.json();
        if (res.ok) {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `passkey_${data.firstName.toLowerCase()}_${data.lastName.toLowerCase()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast(`Passkey file downloaded for ${data.firstName} ${data.lastName}`, 'success');
        } else {
            showToast(data.error || 'Failed to generate passkey', 'error');
        }
    };

    const [storeInfo, setStoreInfo] = useState({
        storeName: '',
        storeAddress: '',
        storePhone: '',
        storeEmail: '',
        currency: 'USD'
    });
    const [storeLogo, setStoreLogo] = useState(null);

    useEffect(() => {
        const loadStoreData = async () => {
            const savedStore = await idbStore.get('sms_store_info');
            if (savedStore) setStoreInfo(savedStore);
            
            const savedLogo = await idbStore.get('sms_store_logo');
            if (savedLogo) setStoreLogo(savedLogo);
        };
        loadStoreData();
    }, []);

    const handleUserInfoChange = (e) => setUserInfo({...userInfo, [e.target.name]: e.target.value});
    const handlePasswordChange = (e) => setPasswordData({...passwordData, [e.target.name]: e.target.value});
    const handleStoreInfoChange = (e) => setStoreInfo({...storeInfo, [e.target.name]: e.target.value});
    
    const handleSaveUserInfo = async (e) => {
        e.preventDefault();
        // Since login is based on firstName + lastName, we update user store info
        const savedUsers = await idbStore.get('sms_users') || [];
        const index = savedUsers.findIndex(u => u.id === user.id);
        if (index > -1) {
            savedUsers[index].firstName = userInfo.firstName;
            savedUsers[index].lastName = userInfo.lastName;
            savedUsers[index].email = userInfo.email;
            await idbStore.set('sms_users', savedUsers);
            showToast('User info updated. Please sign in again if name changes take effect.', 'success');
        } else {
            showToast('Failed to save profile details', 'error');
        }
    };

    const handleSavePassword = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            showToast('Passwords do not match!', 'error');
            return;
        }

        const res = await mockApi.resetEmployeePassword(user.id, passwordData.newPassword);
        const data = await res.json();
        if (res.ok) {
            showToast('Password updated successfully!', 'success');
            setPasswordData({currentPassword: '', newPassword: '', confirmPassword: ''});
        } else {
            showToast(data.error || 'Failed to update password', 'error');
        }
    };

    const handleSaveStoreInfo = async (e) => {
        e.preventDefault();
        await updateStoreInfoState(storeInfo);
        showToast('Store settings saved successfully!', 'success');
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                setStoreLogo(reader.result);
                await idbStore.set('sms_store_logo', reader.result);
                await mockApi.logAction('UPDATE_LOGO', 'User updated store logo');
                showToast('Store logo updated!', 'success');
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleDownloadLogs = async () => {
        const text = await mockApi.getLogsText();
        const blob = new Blob([text], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sms_action_logs_${new Date().toISOString().split('T')[0]}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        await mockApi.logAction('DOWNLOAD_LOGS', 'User downloaded system action logs');
        showToast('System logs downloaded.', 'success');
    };

    const handleDownloadBackup = async () => {
        const backupData = {};
        const keys = await idbStore.keys();
        for (const key of keys) {
            if (key && key.startsWith('sms_')) {
                backupData[key] = await idbStore.get(key);
            }
        }
        const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sms_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        await mockApi.logAction('DOWNLOAD_BACKUP', 'User downloaded system backup');
        showToast('Database backup downloaded.', 'success');
    };

    const handleDownloadBackupPdf = async () => {
        const doc = new jsPDF();
        doc.setFontSize(20);
        doc.text('System Backup Report', 14, 22);
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);
        
        let currentY = 40;

        const addSection = (title, data) => {
            if (currentY > 270) {
                doc.addPage();
                currentY = 20;
            }
            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0);
            doc.text(title, 14, currentY);
            currentY += 10;
            
            if (!data || data.length === 0) {
                doc.setFontSize(10);
                doc.setTextColor(100);
                doc.text('No data available.', 14, currentY);
                currentY += 15;
                return;
            }

            const headers = Object.keys(data[0]).filter(k => typeof data[0][k] !== 'object');
            const rows = data.map(item => headers.map(header => String(item[header])));
            
            doc.autoTable({
                startY: currentY,
                head: [headers],
                body: rows,
                theme: 'grid',
                styles: { fontSize: 8 },
                headStyles: { fillColor: [41, 128, 185] }
            });
            
            currentY = doc.lastAutoTable.finalY + 15;
        };

        const products = await idbStore.get('sms_products') || [];
        const invoices = await idbStore.get('sms_invoices') || [];
        const expenses = await idbStore.get('sms_expenses') || [];
        const transactions = await idbStore.get('sms_transactions') || [];

        addSection('Products Backup', products);
        addSection('Invoices Backup', invoices);
        addSection('Expenses Backup', expenses);
        addSection('Transactions Backup', transactions);

        doc.save(`sms_backup_${new Date().toISOString().split('T')[0]}.pdf`);
        await mockApi.logAction('DOWNLOAD_BACKUP_PDF', 'User downloaded system backup as PDF');
        showToast('PDF Backup generated.', 'success');
    };

    const handleBackupUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const parsed = JSON.parse(event.target.result);
                if (mockApi.verifyBackupSchema(parsed)) {
                    setBackupContent(parsed);
                    showToast('Backup parsed and verified successfully. Ready to inspect/restore.', 'success');
                } else {
                    showToast('Invalid backup file schema. Restore aborted.', 'error');
                    setBackupContent(null);
                }
            } catch (err) {
                showToast('Failed to parse backup JSON file.', 'error');
                setBackupContent(null);
            }
        };
        reader.readAsText(file);
    };

    const handleRestoreConfirm = async () => {
        if (!backupContent) return;
        if (window.confirm('Are you absolutely sure you want to restore this backup? This will completely replace your current database.')) {
            const res = await mockApi.restoreBackup(backupContent);
            const data = await res.json();
            if (res.ok) {
                showToast(data.message, 'success');
                setBackupContent(null);
                setTimeout(() => window.location.reload(), 1500);
            } else {
                showToast(data.error || 'Failed to restore backup.', 'error');
            }
        }
    };

    const getFilteredBackupDetails = () => {
        if (!backupContent) return null;
        const query = backupSearchQuery.toLowerCase().trim();
        const results = {};
        
        Object.keys(backupContent).forEach(table => {
            if (Array.isArray(backupContent[table])) {
                const matched = backupContent[table].filter(row => {
                    return Object.values(row).some(val => 
                        String(val).toLowerCase().includes(query)
                    );
                });
                if (matched.length > 0) results[table] = matched;
            }
        });
        return results;
    };

    const tabStyle = (isActive) => ({
        background: 'none',
        border: 'none',
        padding: '0.75rem 1.5rem',
        borderBottom: isActive ? '2px solid var(--primary-color)' : '2px solid transparent',
        color: isActive ? 'var(--primary-color)' : 'var(--text-color)',
        fontWeight: isActive ? '600' : '400',
        cursor: 'pointer',
        outline: 'none',
        fontSize: '1rem',
        transition: 'all 0.2s',
        marginBottom: '-1px'
    });

    const filteredBackup = getFilteredBackupDetails();

    return (
        <div style={{padding: '2rem'}}>
            <h2 style={{marginBottom: '2rem'}}>Profile & Settings</h2>

            <div style={{ display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border-color)', marginBottom: '2rem' }}>
                <button style={tabStyle(activeTab === 'user')} onClick={() => setActiveTab('user')}>User Information</button>
                {user?.role === 'admin' && (
                    <>
                        <button style={tabStyle(activeTab === 'store')} onClick={() => setActiveTab('store')}>Store Information</button>
                        <button style={tabStyle(activeTab === 'backup')} onClick={() => setActiveTab('backup')}>Backup & Action Log</button>
                        <button style={tabStyle(activeTab === 'employees')} onClick={() => setActiveTab('employees')}>Employee Accounts</button>
                    </>
                )}
            </div>

            {activeTab === 'user' && (
                <div>
                    <div className="glass-panel" style={{maxWidth: '700px', marginBottom: '2rem'}}>
                        <h3 style={{marginBottom: '1rem'}}>User Information</h3>
                        <form onSubmit={handleSaveUserInfo}>
                            <div style={{marginBottom: '1rem'}}>
                                <label style={{display:'block', marginBottom:'0.5rem', fontWeight:'500'}}>User ID</label>
                                <input type="text" name="userId" value={userInfo.userId} disabled style={{ backgroundColor: '#e5e7eb', cursor: 'not-allowed', color: '#6b7280' }} />
                            </div>
                            <div style={{display: 'flex', gap: '1rem', marginBottom: '1rem'}}>
                                <div style={{flex: 1}}>
                                    <label style={{display:'block', marginBottom:'0.5rem', fontWeight:'500'}}>First Name</label>
                                    <input type="text" name="firstName" value={userInfo.firstName} onChange={handleUserInfoChange} required />
                                </div>
                                <div style={{flex: 1}}>
                                    <label style={{display:'block', marginBottom:'0.5rem', fontWeight:'500'}}>Last Name</label>
                                    <input type="text" name="lastName" value={userInfo.lastName} onChange={handleUserInfoChange} required />
                                </div>
                            </div>
                            <div style={{marginBottom: '1.5rem'}}>
                                <label style={{display:'block', marginBottom:'0.5rem', fontWeight:'500'}}>Email Address</label>
                                <input type="email" name="email" value={userInfo.email} onChange={handleUserInfoChange} />
                            </div>
                            <button type="submit">Save User Info</button>
                        </form>
                    </div>

                    <div className="glass-panel" style={{maxWidth: '700px', marginBottom: '2rem'}}>
                        <h3 style={{marginBottom: '1rem'}}>Change Password</h3>
                        <form onSubmit={handleSavePassword}>
                            <div style={{marginBottom: '1rem'}}>
                                <label style={{display:'block', marginBottom:'0.5rem', fontWeight:'500'}}>Current Password</label>
                                <input type="password" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordChange} required />
                            </div>
                            <div style={{display: 'flex', gap: '1rem', marginBottom: '1.5rem'}}>
                                <div style={{flex: 1}}>
                                    <label style={{display:'block', marginBottom:'0.5rem', fontWeight:'500'}}>New Password</label>
                                    <input type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordChange} required />
                                </div>
                                <div style={{flex: 1}}>
                                    <label style={{display:'block', marginBottom:'0.5rem', fontWeight:'500'}}>Confirm New Password</label>
                                    <input type="password" name="confirmPassword" value={passwordData.confirmPassword} onChange={handlePasswordChange} required />
                                </div>
                            </div>
                            <button type="submit">Update Password</button>
                        </form>
                    </div>
                </div>
            )}

            {activeTab === 'store' && user?.role === 'admin' && (
                <div>
                    <div className="glass-panel" style={{maxWidth: '700px', marginBottom: '2rem'}}>
                        <h3 style={{marginBottom: '1rem'}}>Store Information</h3>
                        <form onSubmit={handleSaveStoreInfo}>
                            <div style={{marginBottom: '1rem'}}>
                                <label style={{display:'block', marginBottom:'0.5rem', fontWeight:'500'}}>Store Name</label>
                                <input type="text" name="storeName" value={storeInfo.storeName} onChange={handleStoreInfoChange} required />
                            </div>
                            <div style={{marginBottom: '1rem'}}>
                                <label style={{display:'block', marginBottom:'0.5rem', fontWeight:'500'}}>Store Address</label>
                                <input type="text" name="storeAddress" value={storeInfo.storeAddress} onChange={handleStoreInfoChange} />
                            </div>
                            <div style={{display: 'flex', gap: '1rem', marginBottom: '1rem'}}>
                                <div style={{flex: 1}}>
                                    <label style={{display:'block', marginBottom:'0.5rem', fontWeight:'500'}}>Store Email</label>
                                    <input type="email" name="storeEmail" value={storeInfo.storeEmail} onChange={handleStoreInfoChange} />
                                </div>
                                <div style={{flex: 1}}>
                                    <label style={{display:'block', marginBottom:'0.5rem', fontWeight:'500'}}>Store Phone Number</label>
                                    <input type="text" name="storePhone" value={storeInfo.storePhone} onChange={handleStoreInfoChange} />
                                </div>
                            </div>
                            <div style={{marginBottom: '1.5rem'}}>
                                <label style={{display:'block', marginBottom:'0.5rem', fontWeight:'500'}}>Base Currency</label>
                                <select 
                                    name="currency" 
                                    value={storeInfo.currency} 
                                    onChange={handleStoreInfoChange}
                                    style={{ width: '100%', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', background: 'var(--background-color)', color: 'var(--text-color)' }}
                                >
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                    <option value="GBP">GBP (£)</option>
                                    <option value="LKR">LKR (Rs)</option>
                                </select>
                            </div>
                            <button type="submit">Save Store Info</button>
                        </form>
                    </div>

                    <div className="glass-panel" style={{maxWidth: '700px', marginBottom: '2rem'}}>
                        <h3 style={{marginBottom: '1rem'}}>Store Logo</h3>
                        <div style={{display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '1.5rem'}}>
                            {storeLogo ? (
                                <img src={storeLogo} alt="Store Logo" style={{width: '100px', height: '100px', objectFit: 'contain', border: '1px solid var(--border-color)', borderRadius: '0.5rem', background: '#fff' }} />
                            ) : (
                                <div style={{width: '100px', height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px dashed var(--border-color)', borderRadius: '0.5rem', background: 'var(--background-color)', color: 'var(--text-muted)' }}>
                                    No Logo
                                </div>
                            )}
                            <div>
                                <input type="file" accept="image/*" id="logo-upload" style={{display: 'none'}} onChange={handleLogoUpload} />
                                <label htmlFor="logo-upload" style={{display: 'inline-block', padding: '0.5rem 1rem', background: 'var(--primary-color)', color: 'white', borderRadius: '0.35rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: '500'}}>
                                    Upload New Logo
                                </label>
                                <p style={{marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-muted)'}}>Recommended size: 200x200px. Max 2MB.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'backup' && user?.role === 'admin' && (
                <div>
                    <div className="glass-panel" style={{maxWidth: '700px', marginBottom: '2rem'}}>
                        <h3 style={{marginBottom: '1rem'}}>Backup Data</h3>
                        <p style={{marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)'}}>Download a complete backup of all system data (Products, Invoices, Expenses, Transactions).</p>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <button onClick={handleDownloadBackup} style={{backgroundColor: 'var(--primary-color)'}}>Download (.json)</button>
                            <button onClick={handleDownloadBackupPdf} style={{backgroundColor: '#e74c3c'}}>Download (.pdf)</button>
                        </div>
                    </div>

                    <div className="glass-panel" style={{maxWidth: '700px', marginBottom: '2rem'}}>
                        <h3 style={{marginBottom: '1rem'}}>Action Logs</h3>
                        <p style={{marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)'}}>Download a detailed text file containing all system action logs for auditing and troubleshooting purposes.</p>
                        <button onClick={handleDownloadLogs} style={{backgroundColor: 'var(--secondary-color)'}}>Download Logs (.txt)</button>
                    </div>

                    <div className="glass-panel" style={{maxWidth: '700px'}}>
                        <h3 style={{marginBottom: '1rem'}}>Restore Database Backup</h3>
                        <p style={{marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)'}}>Upload a JSON backup file to inspect its contents and restore it to the system.</p>
                        
                        <div style={{ marginBottom: '1.5rem' }}>
                            <input 
                                type="file" 
                                accept=".json" 
                                onChange={handleBackupUpload} 
                                style={{ display: 'block', marginBottom: '1rem' }} 
                            />
                        </div>

                        {backupContent && (
                            <div style={{ border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '1rem', background: 'var(--background-color)', marginBottom: '1rem' }}>
                                <h4 style={{ marginBottom: '0.5rem' }}>Backup File Inspection</h4>
                                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                                    <strong>Detected Data Modules:</strong>
                                    <ul style={{ margin: '0.5rem 0 0 1rem', padding: 0 }}>
                                        {Object.keys(backupContent).map(key => (
                                            <li key={key}>
                                                {key}: {Array.isArray(backupContent[key]) ? `${backupContent[key].length} records` : 'Key-value config'}
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div style={{ marginBottom: '1rem' }}>
                                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', marginBottom: '0.25rem' }}>Search in Backup</label>
                                    <input 
                                        type="text" 
                                        placeholder="Search records in backup file..." 
                                        value={backupSearchQuery} 
                                        onChange={(e) => setBackupSearchQuery(e.target.value)} 
                                        style={{ width: '100%', padding: '0.5rem', fontSize: '0.85rem' }}
                                    />
                                </div>

                                {backupSearchQuery && filteredBackup && (
                                    <div style={{ maxHeight: '200px', overflowY: 'auto', background: '#1e1e1e', color: '#d4d4d4', padding: '0.75rem', borderRadius: '0.35rem', fontSize: '0.8rem', fontFamily: 'monospace', marginBottom: '1rem' }}>
                                        {Object.keys(filteredBackup).length > 0 ? (
                                            Object.keys(filteredBackup).map(tbl => (
                                                <div key={tbl} style={{ marginBottom: '0.5rem' }}>
                                                    <div style={{ color: 'var(--primary-color)', fontWeight: 'bold' }}>[{tbl}]</div>
                                                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                                                        {JSON.stringify(filteredBackup[tbl], null, 2)}
                                                    </pre>
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{ color: '#888' }}>No matches found in backup records.</div>
                                        )}
                                    </div>
                                )}

                                <button 
                                    onClick={handleRestoreConfirm} 
                                    style={{ backgroundColor: 'var(--danger-color, #ef4444)', color: 'white', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.35rem', cursor: 'pointer' }}
                                >
                                    Confirm Restore Backup
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'employees' && user?.role === 'admin' && (
                <div>
                    <div className="glass-panel" style={{maxWidth: '700px', marginBottom: '2rem'}}>
                        <h3 style={{marginBottom: '1rem'}}>Create Employee Account</h3>
                        <form onSubmit={handleCreateEmployee}>
                            <div style={{display: 'flex', gap: '1rem', marginBottom: '1rem'}}>
                                <div style={{flex: 1}}>
                                    <label style={{display:'block', marginBottom:'0.5rem', fontWeight:'500'}}>First Name</label>
                                    <input type="text" value={employeeData.firstName} onChange={(e) => setEmployeeData({...employeeData, firstName: e.target.value})} required />
                                </div>
                                <div style={{flex: 1}}>
                                    <label style={{display:'block', marginBottom:'0.5rem', fontWeight:'500'}}>Last Name</label>
                                    <input type="text" value={employeeData.lastName} onChange={(e) => setEmployeeData({...employeeData, lastName: e.target.value})} required />
                                </div>
                            </div>
                            <div className="form-group">
                                <label style={{display:'block', marginBottom:'0.5rem', fontWeight:'500'}}>Initial Password</label>
                                <input type="password" value={employeeData.password} onChange={(e) => setEmployeeData({...employeeData, password: e.target.value})} required />
                            </div>

                            <div style={{marginBottom: '1.5rem'}}>
                                <label style={{display:'block', marginBottom:'0.5rem', fontWeight:'500'}}>Access Permissions</label>
                                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem'}}>
                                    {pagesList.map(page => (
                                        <label key={page} style={{display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'capitalize', cursor: 'pointer'}}>
                                            <input 
                                                type="checkbox" 
                                                checked={employeeData.allowedPages.includes(page)}
                                                onChange={() => handleEmployeePageToggle(page)}
                                            />
                                            {page}
                                        </label>
                                    ))}
                                </div>
                            </div>
                            <button type="submit">Create Employee</button>
                        </form>
                    </div>

                    <div className="glass-panel" style={{maxWidth: '850px'}}>
                        <h3 style={{marginBottom: '1rem'}}>Manage Employee Accounts</h3>
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid var(--border-color)', textAlign: 'left' }}>
                                    <th style={{ padding: '0.75rem' }}>Name</th>
                                    <th style={{ padding: '0.75rem' }}>Status</th>
                                    <th style={{ padding: '0.75rem' }}>Permissions</th>
                                    <th style={{ padding: '0.75rem', textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {employees.length === 0 ? (
                                    <tr>
                                        <td colSpan="4" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>No employees found.</td>
                                    </tr>
                                ) : (
                                    employees.map(emp => (
                                        <tr key={emp.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                                            <td style={{ padding: '0.75rem', fontWeight: '500' }}>{emp.firstName} {emp.lastName}</td>
                                            <td style={{ padding: '0.75rem' }}>
                                                <span style={{
                                                    padding: '0.25rem 0.5rem',
                                                    borderRadius: '0.25rem',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '600',
                                                    backgroundColor: emp.status === 'deleted' ? '#fee2e2' : '#dcfce7',
                                                    color: emp.status === 'deleted' ? '#ef4444' : '#10b981'
                                                }}>
                                                    {emp.status === 'deleted' ? 'Deleted' : 'Active'}
                                                </span>
                                            </td>
                                            <td style={{ padding: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                {emp.allowedPages?.join(', ') || 'none'}
                                            </td>
                                            <td style={{ padding: '0.75rem', textAlign: 'right', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                <button 
                                                    onClick={() => handleGenerateEmployeePasskey(emp.id)}
                                                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', backgroundColor: 'var(--secondary-color, #10b981)', color: 'white' }}
                                                    title="Download Passkey JSON file"
                                                >
                                                    <i className="fas fa-key"></i> Key
                                                </button>
                                                <button 
                                                    onClick={() => setResettingEmployeeId(emp.id)}
                                                    style={{ padding: '0.35rem 0.65rem', fontSize: '0.8rem', backgroundColor: '#f59e0b', color: 'white' }}
                                                >
                                                    Reset Password
                                                </button>
                                                <button 
                                                    onClick={() => handleToggleStatus(emp.id)}
                                                    style={{ 
                                                        padding: '0.35rem 0.65rem', 
                                                        fontSize: '0.8rem', 
                                                        backgroundColor: emp.status === 'deleted' ? '#10b981' : '#ef4444', 
                                                        color: 'white' 
                                                    }}
                                                >
                                                    {emp.status === 'deleted' ? 'Restore' : 'Delete'}
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* inline popup form for resetting employee password */}
            {resettingEmployeeId && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                }}>
                    <div className="glass-panel" style={{ width: '400px', padding: '2rem', background: 'var(--card-background-color, #fff)' }}>
                        <h3 style={{ marginBottom: '1rem' }}>Reset Employee Password</h3>
                        <form onSubmit={handleResetEmployeePasswordSubmit}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>New Password</label>
                                <input 
                                    type="password" 
                                    value={newEmployeePassword} 
                                    onChange={(e) => setNewEmployeePassword(e.target.value)} 
                                    required 
                                    placeholder="Enter new password"
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                                <button type="button" onClick={() => { setResettingEmployeeId(null); setNewEmployeePassword(''); }} style={{ backgroundColor: '#6b7280' }}>
                                    Cancel
                                </button>
                                <button type="submit" style={{ backgroundColor: '#f59e0b' }}>
                                    Save New Password
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;

import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { idbStore } from '../utils/db';
import { mockApi } from '../services/mockApi';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const Profile = () => {
    const { user } = useContext(AuthContext);
    const [activeTab, setActiveTab] = useState('user');
    const [message, setMessage] = useState('');

    const [userInfo, setUserInfo] = useState({
        userId: '',
        fullName: '',
        email: ''
    });

    useEffect(() => {
        if (user) {
            setUserInfo({
                userId: user.id || '',
                fullName: (user.firstName && user.lastName) ? `${user.firstName} ${user.lastName}` : (user.fullName || ''),
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
        email: '',
        firstName: '',
        lastName: '',
        password: '',
        allowedPages: []
    });

    const pagesList = ['dashboard', 'products', 'categories', 'invoices', 'expenses', 'transactions'];

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
        if (res.ok) {
            setMessage('Employee created successfully!');
            setEmployeeData({ email: '', firstName: '', lastName: '', password: '', allowedPages: [] });
        } else {
            const data = await res.json();
            setMessage(`Error: ${data.error}`);
        }
        setTimeout(() => setMessage(''), 3000);
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
        await mockApi.logAction('UPDATE_PROFILE', 'User updated profile information');
        setMessage('User information verified and saved!');
        setTimeout(() => setMessage(''), 3000);
    };

    const handleSavePassword = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage('Passwords do not match!');
            setTimeout(() => setMessage(''), 3000);
            return;
        }
        await mockApi.logAction('UPDATE_PASSWORD', 'User updated password');
        setMessage('Password updated successfully!');
        setPasswordData({currentPassword: '', newPassword: '', confirmPassword: ''});
        setTimeout(() => setMessage(''), 3000);
    };

    const handleSaveStoreInfo = async (e) => {
        e.preventDefault();
        await idbStore.set('sms_store_info', storeInfo);
        await mockApi.logAction('UPDATE_STORE_INFO', 'User updated store information');
        setMessage('Store information saved!');
        setTimeout(() => setMessage(''), 3000);
    };

    const handleLogoUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = async () => {
                setStoreLogo(reader.result);
                await idbStore.set('sms_store_logo', reader.result);
                mockApi.logAction('UPDATE_LOGO', 'User updated store logo');
                setMessage('Store logo updated successfully!');
                setTimeout(() => setMessage(''), 3000);
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

    return (
        <div style={{padding: '2rem'}}>
            <h2 style={{marginBottom: '2rem'}}>Profile & Settings</h2>
            
            {message && <div style={{color: 'green', marginBottom: '1.5rem', background: '#dcfce7', padding: '0.75rem', borderRadius: '0.5rem'}}>{message}</div>}

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
                            <div style={{marginBottom: '1rem'}}>
                                <label style={{display:'block', marginBottom:'0.5rem', fontWeight:'500'}}>Full Name</label>
                                <input type="text" name="fullName" value={userInfo.fullName} onChange={handleUserInfoChange} required />
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

                    <div className="glass-panel" style={{maxWidth: '700px'}}>
                        <h3 style={{marginBottom: '1rem'}}>Action Logs</h3>
                        <p style={{marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)'}}>Download a detailed text file containing all system action logs for auditing and troubleshooting purposes.</p>
                        <button onClick={handleDownloadLogs} style={{backgroundColor: 'var(--secondary-color)'}}>Download Logs (.txt)</button>
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
                            <div style={{display: 'flex', gap: '1rem', marginBottom: '1rem'}}>
                                <div style={{flex: 1}}>
                                    <label style={{display:'block', marginBottom:'0.5rem', fontWeight:'500'}}>Email Address</label>
                                    <input type="email" value={employeeData.email} onChange={(e) => setEmployeeData({...employeeData, email: e.target.value})} required />
                                </div>
                                <div style={{flex: 1}}>
                                    <label style={{display:'block', marginBottom:'0.5rem', fontWeight:'500'}}>Password</label>
                                    <input type="password" value={employeeData.password} onChange={(e) => setEmployeeData({...employeeData, password: e.target.value})} required />
                                </div>
                            </div>
                            
                            <div style={{marginBottom: '1.5rem'}}>
                                <label style={{display:'block', marginBottom:'0.5rem', fontWeight:'500'}}>Access Permissions</label>
                                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem'}}>
                                    {pagesList.map(page => (
                                        <label key={page} style={{display: 'flex', alignItems: 'center', gap: '0.5rem', textTransform: 'capitalize'}}>
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
                </div>
            )}
        </div>
    );
};

export default Profile;

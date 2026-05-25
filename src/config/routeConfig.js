import Dashboard from '../pages/Dashboard';
import Products from '../pages/Products';
import Categories from '../pages/Categories';
import Invoices from '../pages/Invoices';
import Expenses from '../pages/Expenses';
import Transactions from '../pages/Transactions';
import Profile from '../pages/Profile';

export const routes = [
    { path: '/',             key: 'dashboard',    label: 'Dashboard',          component: Dashboard,    isNav: true  },
    { path: '/products',     key: 'products',     label: 'Inventory',          component: Products,     isNav: true  },
    { path: '/categories',   key: 'categories',   label: 'Categories',         component: Categories,   isNav: true  },
    { path: '/invoices',     key: 'invoices',     label: 'Invoices',           component: Invoices,     isNav: true  },
    { path: '/expenses',     key: 'expenses',     label: 'Expenses',           component: Expenses,     isNav: true  },
    { path: '/transactions', key: 'transactions', label: 'Ledger',             component: Transactions, isNav: true  },
    { path: '/profile',      key: null,           label: 'Profile & Settings', component: Profile,      isNav: true  },
];

import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

export const usePermissions = () => {
    const { user } = useContext(AuthContext);

    const canAccess = (key) => {
        if (!key) return true;
        if (user?.role === 'admin') return true;
        if (user?.role === 'employee' && user?.allowedPages?.includes(key)) return true;
        return false;
    };

    return { canAccess };
};

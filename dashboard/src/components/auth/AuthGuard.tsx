import React from 'react';
import { ReactNode, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../lib/auth/auth';

interface AuthGuardProps {
    children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        async function checkAuth() {
            const isAuth = await auth.isAuthenticated();
            setIsAuthenticated(isAuth);
        }
        checkAuth();
    }, []);

    if (!isAuthenticated) {
        return null;
    }

    return <>{children}</>;
} 
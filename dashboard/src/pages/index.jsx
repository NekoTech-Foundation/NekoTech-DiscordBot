import React from 'react';
import { AuthGuard } from '../components/auth/AuthGuard';
import DashboardPage from '../components/dashboard/page';

export default function IndexPage() {
    return (
        <AuthGuard>
            <DashboardPage />
        </AuthGuard>
    );
}